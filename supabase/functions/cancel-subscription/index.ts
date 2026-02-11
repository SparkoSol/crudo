import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "npm:stripe@^14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") || "", {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
    const { method } = req;

    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripeCustomers = await stripe.customers.search({
            query: `email:'${user.email}'`,
            limit: 1,
        });

        let subscriptions: { id: string }[] = [];
        let stripeCustomerId = null;

        if (stripeCustomers.data.length > 0) {
            stripeCustomerId = stripeCustomers.data[0].id;
            console.log(`Found Stripe Customer: ${stripeCustomerId}`);

            const stripeSubscriptions = await stripe.subscriptions.list({
                customer: stripeCustomerId,
                status: 'active',
                limit: 100,
            });

            subscriptions = stripeSubscriptions.data.map(sub => ({ id: sub.id }));
            console.log(`Stripe found ${subscriptions.length} active subscriptions for customer.`);

            const { data: dbSubs, error: subError } = await supabase
                .from("subscriptions")
                .select("subscription_id, subscription_role, plan_type, status")
                .eq("user_id", user.id)
                .in("status", ["active", "trialing", "past_due", "unpaid"]);

            if (!subError && dbSubs) {

                const stripeSubIds = new Set(subscriptions.map(s => s.id));
                for (const dbSub of dbSubs) {
                    if (!stripeSubIds.has(dbSub.subscription_id)) {
                        console.log(`Adding subscription ${dbSub.subscription_id} from database (${dbSub.subscription_role}, ${dbSub.plan_type})`);
                        subscriptions.push({ id: dbSub.subscription_id });
                    }
                }
            }

            console.log(`Total subscriptions to cancel: ${subscriptions.length}`);
        } else {
            console.warn(`No Stripe customer found for email ${user.email}. Falling back to database lookup.`);
            const { data: dbSubs, error: subError } = await supabase
                .from("subscriptions")
                .select("subscription_id")
                .eq("user_id", user.id)
                .in("status", ["active", "trialing", "past_due", "unpaid"]);

            if (!subError && dbSubs) {
                subscriptions = dbSubs.map(s => ({ id: s.subscription_id }));
            }
        }

        if (subscriptions.length === 0) {
            return new Response(
                JSON.stringify({ message: "No active subscriptions found to cancel." }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }


        console.log(`Canceling ${subscriptions.length} subscriptions with immediate invoicing...`);


        const { data: wallet } = await supabase
            .from('credits_wallet')
            .select('used_credits_this_month, manager_id')
            .or(`manager_id.eq.${user.id}`)
            .maybeSingle();

        let currentUsage = 0;
        if (wallet) {
            currentUsage = wallet.used_credits_this_month || 0;
        } else {
            const { data: profile } = await supabase
                .from('profiles')
                .select('manager_id')
                .eq('id', user.id)
                .single();

            if (profile?.manager_id) {
                const { data: managerWallet } = await supabase
                    .from('credits_wallet')
                    .select('used_credits_this_month')
                    .eq('manager_id', profile.manager_id)
                    .maybeSingle();

                if (managerWallet) {
                    currentUsage = managerWallet.used_credits_this_month || 0;
                }
            }
        }

        let creditsInvoiced = false;

        const results = await Promise.all(subscriptions.map(async (sub) => {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(sub.id);
                console.log(`Processing subscription ${sub.id} (${stripeSubscription.status})...`);

                if (currentUsage > 0 && !creditsInvoiced) {
                    const meteredItems = stripeSubscription.items.data.filter(
                        item => item.price.recurring?.usage_type === 'metered'
                    );

                    if (meteredItems.length > 0) {
                        console.log(`Creating invoice for ${currentUsage} used credits...`);

                        for (const item of meteredItems) {
                            const unitAmount = item.price.unit_amount_decimal
                                ? parseInt(item.price.unit_amount_decimal)
                                : item.price.unit_amount || 0;

                            await stripe.invoiceItems.create({
                                customer: stripeSubscription.customer as string,
                                currency: item.price.currency,
                                unit_amount: unitAmount,
                                quantity: currentUsage,
                                description: `Final usage charges for ${currentUsage} credits`,
                            });
                        }

                        creditsInvoiced = true;
                    }
                }

                console.log(`Canceling subscription ${sub.id} with immediate invoice...`);
                const deletedSubscription = await stripe.subscriptions.cancel(sub.id, {
                    invoice_now: true,
                    prorate: false,
                });

                console.log(`✅ Successfully canceled subscription ${sub.id}`);

                const { error: syncError } = await supabase
                    .from("subscriptions")
                    .update({
                        status: 'canceled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('subscription_id', sub.id);

                if (syncError) {
                    console.error(`Error updating subscription ${sub.id} in Supabase:`, syncError);
                }

                return { id: sub.id, success: true, stripeResponse: deletedSubscription };
            } catch (err: any) {
                console.error(`Error canceling subscription ${sub.id}:`, err.message);

                if (err.message && (err.message.includes("No such subscription") || err.code === 'resource_missing')) {
                    console.log(`Subscription ${sub.id} not found in Stripe. Marking as canceled in DB.`);
                    await supabase
                        .from("subscriptions")
                        .update({
                            status: 'canceled',
                            updated_at: new Date().toISOString()
                        })
                        .eq('subscription_id', sub.id);
                    return { id: sub.id, success: true, note: "Already deleted in Stripe" };
                }

                return { id: sub.id, success: false, error: err.message };
            }
        }));

        const successCount = results.filter(r => r.success).length;

        if (successCount === subscriptions.length && wallet) {
            console.log(`Resetting credit wallet for user ${user.id}...`);
            const { error: walletError } = await supabase
                .from("credits_wallet")
                .update({
                    used_credits_this_month: 0,
                    updated_at: new Date().toISOString(),
                })
                .eq("manager_id", user.id);

            if (walletError) {
                console.error(`Error resetting credit wallet:`, walletError);
            } else {
                console.log(`✅ Credit wallet reset successfully`);
            }
        }

        return new Response(
            JSON.stringify({
                message: `Successfully processed ${successCount} of ${subscriptions.length} subscriptions.`,
                results
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(
            JSON.stringify({ error: "Internal Server Error", message: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

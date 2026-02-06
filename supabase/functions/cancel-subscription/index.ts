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
                status: 'all',
                limit: 10,
            });

            subscriptions = stripeSubscriptions.data
                .filter(sub => ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status))
                .map(sub => ({ id: sub.id }));

            console.log(`Stripe found ${subscriptions.length} active/pending subscriptions for customer.`);
        } else {
            console.warn(`No Stripe customer found for email ${user.email}. Falling back to database lookup.`);
            const { data: dbSubs, error: subError } = await supabase
                .from("subscriptions")
                .select("subscription_id")
                .eq("user_id", user.id)
                .in("status", ["active", "trialing", "past_due"]);

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

        const results = await Promise.all(subscriptions.map(async (sub) => {
            try {
                const stripeSubscription = await stripe.subscriptions.retrieve(sub.id);

                const meteredItems = stripeSubscription.items.data.filter(
                    item => item.price.recurring?.usage_type === 'metered'
                );

                if (meteredItems.length > 0) {
                    console.log(`Found ${meteredItems.length} metered items for subscription ${sub.id}. Checking usage...`);

                    const { data: wallet, error: walletError } = await supabase
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

                    if (currentUsage > 0) {
                        console.log(`Creating invoice items for ${currentUsage} used credits...`);

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
                    }
                }

                const deletedSubscription = await stripe.subscriptions.cancel(sub.id, {
                    invoice_now: true,
                    prorate: true,
                });

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
                return { id: sub.id, success: false, error: err.message };
            }
        }));

        const successCount = results.filter(r => r.success).length;

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

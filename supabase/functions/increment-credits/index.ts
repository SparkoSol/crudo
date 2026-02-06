import Stripe from "npm:stripe@^14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
    apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
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

        let incrementAmount = 1;
        try {
            const body = await req.json();
            if (body.amount) incrementAmount = body.amount;
        } catch (e) {
            console.error("Error parsing request body:", e);
        }

        let { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("subscription_id, credits_subscription_item_id")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing", "past_due"])
            .not("credits_subscription_item_id", "is", null)
            .limit(1)
            .maybeSingle();

        if (!subscription && !subError) {
            const { data: fallbackSub, error: fallbackError } = await supabase
                .from("subscriptions")
                .select("subscription_id, credits_subscription_item_id")
                .eq("user_id", user.id)
                .in("status", ["active", "trialing", "past_due"])
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            subscription = fallbackSub;
            subError = fallbackError;
        }

        if (subError || !subscription) {
            return new Response(
                JSON.stringify({ error: "No active subscription found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let creditsItemId = subscription.credits_subscription_item_id;

        if (!creditsItemId) {
            const stripeSub = await stripe.subscriptions.retrieve(subscription.subscription_id);

            let creditsItem = stripeSub.items.data.find((item: any) =>
                item.price.recurring?.usage_type === 'metered'
            );

            if (!creditsItem) {
                const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
                const customerSubs = await stripe.subscriptions.list({
                    customer: customerId,
                    status: 'active',
                    limit: 10,
                });

                for (const sub of customerSubs.data) {
                    const meteredItem = sub.items.data.find((item: any) =>
                        item.price.recurring?.usage_type === 'metered'
                    );
                    if (meteredItem) {
                        creditsItem = meteredItem;
                        break;
                    }
                }
            }

            creditsItemId = creditsItem?.id;
        }

        if (!creditsItemId) {
            return new Response(
                JSON.stringify({ error: "No metered subscription item found" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const subscriptionItem = await stripe.subscriptionItems.retrieve(creditsItemId);
        const recurring = subscriptionItem.price.recurring;

        let totalUsage = 0;
        let usageRecord;

        if (recurring?.meter) {
            const meterId =
                typeof recurring.meter === 'string'
                    ? recurring.meter
                    : recurring.meter.id;

            const subId =
                typeof subscriptionItem.subscription === 'string'
                    ? subscriptionItem.subscription
                    : subscriptionItem.subscription.id;

            const sub = await stripe.subscriptions.retrieve(subId);
            const customerId =
                typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

            const eventId = crypto.randomUUID();
            await stripe.billing.meterEvents.create({
                event_name: 'crudo_credit_meter',
                payload: {
                    value: String(incrementAmount),
                    stripe_customer_id: customerId,
                },
                timestamp: Math.floor(Date.now() / 1000),
                identifier: eventId,
            });

            usageRecord = { id: eventId, quantity: incrementAmount, object: 'billing.meter_event' };
            totalUsage = 0;

        }

        else if (recurring?.usage_type === 'metered') {
            usageRecord = await stripe.subscriptionItems.createUsageRecord(
                creditsItemId,
                {
                    quantity: incrementAmount,
                    timestamp: Math.floor(Date.now() / 1000),
                    action: 'increment',
                }
            );

            const usageSummaries = await stripe.subscriptionItems.listUsageRecordSummaries(
                creditsItemId,
                { limit: 1 }
            );

            if (usageSummaries.data.length > 0) {
                totalUsage = usageSummaries.data[0].total_usage;
            }
        }
        else {
            throw new Error("Subscription item is not metered");
        }

        try {
            const { data: profile } = await supabase
                .from("profiles")
                .select("id, manager_id, role")
                .eq("id", user.id)
                .single();

            if (profile) {
                const managerId = profile.role === "manager" ? profile.id : profile.manager_id;

                if (managerId) {
                    await supabase.from("credit_transactions").insert({
                        manager_id: managerId,
                        sales_rep_id: user.id,
                        amount: incrementAmount,
                        reason: "Voice transcript credit usage",
                    });

                    let currentSubId = subscription.subscription_id;
                    if (typeof subscriptionItem.subscription === 'string') {
                        currentSubId = subscriptionItem.subscription;
                    } else if (subscriptionItem.subscription && subscriptionItem.subscription.id) {
                        currentSubId = subscriptionItem.subscription.id;
                    }

                    const stripeSub = await stripe.subscriptions.retrieve(currentSubId);
                    console.log("stribe sub", stripeSub)

                    const billingCycleAnchor = stripeSub.current_period_start; 
                    const { data: currentWallet } = await supabase
                    .from("credits_wallet")
                    .select("used_credits, used_credits_this_month, billing_cycle_anchor")
                    .eq("manager_id", managerId)
                    .maybeSingle();
                    
                    console.log("currentWallet", currentWallet)
                    if (currentWallet) {
                        const isNewCycle =  currentWallet.billing_cycle_anchor !== billingCycleAnchor;
                        console.log("isNewCycle", isNewCycle)
                        const newMonthlyUsage = isNewCycle ? incrementAmount : (currentWallet.used_credits_this_month || 0) + incrementAmount;

                        await supabase
                            .from("credits_wallet")
                            .update({
                                used_credits: (currentWallet.used_credits || 0) + incrementAmount,
                                used_credits_this_month: newMonthlyUsage,
                                billing_cycle_anchor: billingCycleAnchor,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("manager_id", managerId);
                    } else {
                        await supabase.from("credits_wallet").insert({
                            manager_id: managerId,
                            total_credits: 0,
                            used_credits: incrementAmount,
                            used_credits_this_month: incrementAmount,
                            billing_cycle_anchor: billingCycleAnchor,
                            updated_at: new Date().toISOString(),
                        });
                    }
                }
            }
        } catch (dbErr) {
            console.error("Database update failed, but Stripe usage was reported:", dbErr);
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: usageRecord,
                total_usage: totalUsage,
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

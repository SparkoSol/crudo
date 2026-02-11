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

        const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("subscription_id, credits_subscription_item_id")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing", "past_due"])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subError || !subscription) {
            return new Response(
                JSON.stringify({ error: "No active subscription found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stripeSub = await stripe.subscriptions.retrieve(subscription.subscription_id);
        const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

        let usageCredits = 0;
        let creditsItemId = subscription.credits_subscription_item_id;

        if (!creditsItemId) {
            console.log("No credits_subscription_item_id in DB, searching Stripe...");
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
                    creditsItemId = meteredItem.id;
                    console.log("Found metered item in Stripe:", creditsItemId);
                    break;
                }
            }
        }

        if (creditsItemId) {
            console.log("Fetching usage for creditsItemId:", creditsItemId);
            try {
                const subscriptionItem = await stripe.subscriptionItems.retrieve(creditsItemId);
                const recurring = subscriptionItem.price.recurring;
                console.log("Subscription item recurring type:", recurring?.usage_type, "meter:", !!recurring?.meter);

                if (recurring?.meter) {
                    console.log("Using meter-based billing, fetching from credits_wallet...");
                    const { data: wallet } = await supabase
                        .from("credits_wallet")
                        .select("used_credits_this_month")
                        .eq("manager_id", user.id)
                        .maybeSingle();

                    console.log("Wallet data:", wallet);
                    usageCredits = wallet?.used_credits_this_month || 0;
                    console.log("Usage credits from wallet:", usageCredits);
                } else if (recurring?.usage_type === 'metered') {
                    console.log("Using legacy metered billing, fetching from Stripe...");
                    const usageSummaries = await stripe.subscriptionItems.listUsageRecordSummaries(
                        creditsItemId,
                        { limit: 1 }
                    );

                    if (usageSummaries.data.length > 0) {
                        usageCredits = usageSummaries.data[0].total_usage;
                        console.log("Usage credits from Stripe:", usageCredits);
                    } else {
                        console.log("No usage summaries found in Stripe");
                    }
                }
            } catch (usageError: any) {
                console.error("Error fetching usage:", usageError.message);
                console.log("Falling back to database credits_wallet...");
                const { data: wallet } = await supabase
                    .from("credits_wallet")
                    .select("used_credits_this_month")
                    .eq("manager_id", user.id)
                    .maybeSingle();

                console.log("Fallback wallet data:", wallet);
                usageCredits = wallet?.used_credits_this_month || 0;
                console.log("Fallback usage credits:", usageCredits);
            }
        } else {
            console.log("No creditsItemId found, usage_credits will be 0");
        }

        console.log("Final response - next_billing_date:", currentPeriodEnd, "usage_credits:", usageCredits);
        return new Response(
            JSON.stringify({
                next_billing_date: currentPeriodEnd,
                usage_credits: usageCredits
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

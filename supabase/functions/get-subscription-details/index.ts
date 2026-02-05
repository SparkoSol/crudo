import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") || "", {
    apiVersion: "2023-10-16",
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
            const creditsItem = stripeSub.items.data.find(item =>
                item.price.recurring?.usage_type === 'metered'
            );
            creditsItemId = creditsItem?.id;
        }

        if (creditsItemId) {
            const usageSummaries = await stripe.subscriptionItems.listUsageRecordSummaries(
                creditsItemId,
                { limit: 1 }
            );
            if (usageSummaries.data.length > 0) {
                usageCredits = usageSummaries.data[0].total_usage;
            }
        }

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

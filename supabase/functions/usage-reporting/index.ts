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

    if (method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    try {
        const { user_id, quantity } = await req.json();

        if (!user_id || typeof quantity !== "number") {
            return new Response(
                JSON.stringify({ error: "Missing user_id or quantity" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📊 Reporting usage for user: ${user_id}, quantity: ${quantity}`);

        const { data: subscription, error: fetchError } = await supabase
            .from("subscriptions")
            .select("credits_subscription_item_id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .not('credits_subscription_item_id', 'is', null)
            .limit(1)
            .maybeSingle();

        if (fetchError || !subscription) {
            console.error("Error fetching active subscription:", fetchError);
            return new Response(
                JSON.stringify({ error: "No active subscription found for user" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { credits_subscription_item_id } = subscription;

        const usageRecord = await stripe.usageRecords.create(
            credits_subscription_item_id,
            {
                quantity,
                timestamp: Math.floor(Date.now() / 1000),
                action: "increment",
            }
        );

        console.log(`✅ Usage reported successfully: ${usageRecord.id}`);

        return new Response(
            JSON.stringify({ success: true, usageRecord }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(
            JSON.stringify({ error: "Internal Server Error", message: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

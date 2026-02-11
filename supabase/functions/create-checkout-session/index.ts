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


const PRICES = {
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY")!,
    annual: Deno.env.get("STRIPE_PRICE_ANNUAL")!,
    metered_monthly_annual: Deno.env.get("STRIPE_PRICE_METERED_MONTHLY_ANNUAL")!,
};

Deno.serve(async (req) => {
    const { method } = req;

    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, email, plan_type, success_url, cancel_url } = await req.json();

        if (!user_id || !plan_type || !['monthly', 'annual'].includes(plan_type)) {
            return new Response(
                JSON.stringify({ error: "Missing or invalid required fields: user_id, plan_type (monthly|annual)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`🎟️ Creating 'Platform Access' checkout session for user: ${user_id}, plan: ${plan_type}, email: ${email}`);

        const { data: existingSubscriptions } = await supabase
            .from("subscriptions")
            .select("plan_type")
            .eq("user_id", user_id)
            .in("status", ["active", "trialing", "past_due"])
            .limit(1)
            .maybeSingle();

        if (existingSubscriptions) {
            console.log(`User has existing ${existingSubscriptions.plan_type} subscription. Will handle upgrade/downgrade in webhook after payment.`);
        }

        const basePriceId = plan_type === 'monthly' ? PRICES.monthly : PRICES.annual;
        const subscriptionRole = plan_type === 'annual' ? "platform" : "monthly_bundled";

        const line_items: any[] = [
            {
                price: basePriceId,
                quantity: 1,
            }
        ];

        if (plan_type === 'monthly') {
            line_items.push({ price: PRICES.metered_monthly_annual });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer_email: email,
            line_items: line_items,
            mode: "subscription",
            success_url: success_url || `${req.headers.get("origin")}/dashboard/status?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url || `${req.headers.get("origin")}/subscription`,
            metadata: {
                user_id,
                plan_type,
                subscription_role: subscriptionRole,
            },
            subscription_data: {
                metadata: {
                    user_id,
                    plan_type,
                    subscription_role: subscriptionRole,
                },
            },
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(
            // Retrieve the Stripe subscription
            JSON.stringify({ error: "Internal Server Error", message: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

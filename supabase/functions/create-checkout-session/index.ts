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

const VALID_TIERS = ['starter', 'professional', 'enterprise'] as const;
const VALID_BILLING_PERIODS = ['monthly', 'annual'] as const;

const MONTHLY_TIER_PRICES: Record<string, string> = {
    starter: Deno.env.get("STRIPE_PRICE_STARTER")!,
    professional: Deno.env.get("STRIPE_PRICE_PROFESSIONAL")!,
    enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE")!,
};

const ANNUAL_TIER_PRICES: Record<string, string> = {
    starter: Deno.env.get("STRIPE_PRICE_STARTER_ANNUAL")!,
    professional: Deno.env.get("STRIPE_PRICE_PROFESSIONAL_ANNUAL")!,
    enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE_ANNUAL")!,
};

const METERED_CREDITS_PRICE = Deno.env.get("STRIPE_PRICE_METERED_CREDITS") || Deno.env.get("STRIPE_PRICE_METERED_MONTHLY_ANNUAL")!;

Deno.serve(async (req) => {
    const { method } = req;

    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, email, plan_type, billing_period, success_url, cancel_url } = await req.json();

        if (!user_id || !plan_type || !VALID_TIERS.includes(plan_type)) {
            return new Response(
                JSON.stringify({ error: `Missing or invalid required fields: user_id, plan_type (${VALID_TIERS.join('|')})` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const period = VALID_BILLING_PERIODS.includes(billing_period) ? billing_period : 'monthly';

        console.log(`🎟️ Creating '${plan_type}' (${period}) checkout session for user: ${user_id}, email: ${email}`);

        const { data: existingSubscriptions } = await supabase
            .from("subscriptions")
            .select("plan_type, billing_period, subscription_id")
            .eq("user_id", user_id)
            .in("status", ["active", "trialing", "past_due"])
            .limit(1)
            .maybeSingle();

        if (existingSubscriptions) {
            console.log(`User has existing ${existingSubscriptions.plan_type} (${existingSubscriptions.billing_period}) subscription. Will handle upgrade/downgrade in webhook after payment.`);
        }

        // Always find or create a Stripe Customer to avoid "Guest" payments
        let customerId: string | undefined;

        // 1. Check existing subscription for a Stripe customer ID
        if (existingSubscriptions?.subscription_id) {
            const stripeSub = await stripe.subscriptions.retrieve(existingSubscriptions.subscription_id);
            customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
        }

        // 2. If no subscription, search Stripe for an existing customer by email
        if (!customerId && email) {
            const existingCustomers = await stripe.customers.list({ email, limit: 1 });
            if (existingCustomers.data.length > 0) {
                customerId = existingCustomers.data[0].id;
            }
        }

        // 3. If still no customer, create a new one
        if (!customerId) {
            const newCustomer = await stripe.customers.create({
                email: email || undefined,
                metadata: { user_id },
            }, {
                idempotencyKey: `customer_create_${user_id}`,
            });
            customerId = newCustomer.id;
            console.log(`👤 Created new Stripe customer ${customerId} for user ${user_id}`);
        }

        const isAnnual = period === 'annual';
        const tierPriceId = isAnnual ? ANNUAL_TIER_PRICES[plan_type] : MONTHLY_TIER_PRICES[plan_type];

        if (!tierPriceId) {
            return new Response(
                JSON.stringify({ error: `No Stripe price configured for tier: ${plan_type} (${period})` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const subscriptionRole = isAnnual ? 'platform' : 'combined';

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
            { price: tierPriceId, quantity: 1 },
        ];

        // Monthly: include metered credits in the same subscription
        // Annual: metered credits subscription created separately in webhook
        if (!isAnnual) {
            line_items.push({ price: METERED_CREDITS_PRICE });
        }

        const metadata = {
            user_id,
            plan_type,
            billing_period: period,
            subscription_role: subscriptionRole,
        };

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customerId,
            line_items,
            mode: "subscription",
            success_url: success_url || `${req.headers.get("origin")}/dashboard/status?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancel_url || `${req.headers.get("origin")}/subscription`,
            metadata,
            subscription_data: { metadata },
        });

        return new Response(
            JSON.stringify({ url: session.url }),
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

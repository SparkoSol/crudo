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

const CREDIT_PACKS: Record<string, { credits: number; unit_amount: number; name: string }> = {
    pack_50:   { credits: 50,    unit_amount: 1900,   name: 'Mini Pack \u2014 50 Credits' },
    pack_100:  { credits: 100,   unit_amount: 3600,   name: 'Basic Pack \u2014 100 Credits' },
    pack_500:  { credits: 500,   unit_amount: 17500,  name: 'Starter Pack \u2014 500 Credits' },
    pack_1000: { credits: 1000,  unit_amount: 30000,  name: 'Growth Pack \u2014 1,000 Credits' },
    pack_3000: { credits: 3000,  unit_amount: 75000,  name: 'Business Pack \u2014 3,000 Credits' },
    pack_5000: { credits: 5000,  unit_amount: 110000, name: 'Scale Pack \u2014 5,000 Credits' },
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, email, pack_id, success_url, cancel_url } = await req.json();

        if (!user_id || !email || !pack_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: user_id, email, pack_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const pack = CREDIT_PACKS[pack_id];
        if (!pack) {
            return new Response(
                JSON.stringify({ error: `Invalid pack_id: ${pack_id}. Valid options: ${Object.keys(CREDIT_PACKS).join(', ')}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`\uD83D\uDCE6 Creating credit pack checkout for user ${user_id}: ${pack.name} (${pack.credits} credits, \u20AC${(pack.unit_amount / 100).toFixed(2)})`);

        // Always find or create a Stripe Customer to avoid "Guest" payments
        let customerId: string | undefined;

        // 1. Check existing subscriptions for a Stripe customer ID
        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("subscription_id")
            .eq("user_id", user_id)
            .in("status", ["active", "trialing", "past_due"])
            .limit(1)
            .maybeSingle();

        if (existingSub?.subscription_id) {
            const stripeSub = await stripe.subscriptions.retrieve(existingSub.subscription_id);
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
                email,
                metadata: { user_id },
            }, {
                idempotencyKey: `customer_create_${user_id}`,
            });
            customerId = newCustomer.id;
            console.log(`\uD83D\uDC64 Created new Stripe customer ${customerId} for user ${user_id}`);
        }

        const metadata = {
            user_id,
            pack_id,
            credits_amount: String(pack.credits),
            purchase_type: 'credit_pack',
        };

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            customer: customerId,
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        unit_amount: pack.unit_amount,
                        product_data: {
                            name: pack.name,
                            description: `${pack.credits.toLocaleString()} prepaid credits for iNotus`,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata,
            success_url: success_url || `${req.headers.get("origin")}/settings?credits_purchased=${pack.credits}`,
            cancel_url: cancel_url || `${req.headers.get("origin")}/subscription`,
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

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

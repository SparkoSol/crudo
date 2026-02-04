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

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, stripe-signature",
};

serve(async (req) => {
    const { method } = req;

    // Handle CORS
    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("Missing stripe-signature header", { status: 400, headers: corsHeaders });
    }

    try {
        const body = await req.text();
        let event;

        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                endpointSecret!,
                undefined
            );
        } catch (err) {
            console.error(`❌ Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
        }

        console.log(`🔔 Received event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`💰 Checkout Session completed: ${session.id}`);

                const subscriptionId = session.subscription as string;
                const userId = session.metadata?.user_id;
                const planType = session.metadata?.plan_type;

                if (!subscriptionId || !userId) {
                    console.error("Missing subscription info in session metadata");
                    break;
                }

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const creditsItem = subscription.items.data.find(item => item.price.nickname?.toLowerCase().includes("credit") || item.price.product); // Adjust heuristic if needed

                // Actually, we should probably fetch the item ID more reliably. 
                // For now, let's take the first item if there is only one, or look for metadata.
                const creditsItemId = subscription.items.data[0].id;

                const { error } = await supabase
                    .from("subscriptions")
                    .upsert({
                        subscription_id: subscriptionId,
                        user_id: userId,
                        credits_subscription_item_id: creditsItemId,
                        plan_type: planType,
                        status: subscription.status,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'subscription_id' });

                if (error) console.error("Error updating subscription:", error);
                break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`🔄 Subscription ${event.type}: ${subscription.id}`);

                const userId = subscription.metadata?.user_id;
                const planType = subscription.metadata?.plan_type;
                const creditsItemId = subscription.items.data[0].id;

                if (!userId) {
                    // If userId is not in metadata, try to find it in Supabase by subscription_id first
                    const { data: existingSub } = await supabase
                        .from("subscriptions")
                        .select("user_id")
                        .eq("subscription_id", subscription.id)
                        .single();

                    if (!existingSub) {
                        console.warn(`No user_id found for subscription ${subscription.id}`);
                        break;
                    }
                }

                const { error } = await supabase
                    .from("subscriptions")
                    .upsert({
                        subscription_id: subscription.id,
                        user_id: userId || undefined, // Don't overwrite if null
                        credits_subscription_item_id: creditsItemId,
                        plan_type: planType || undefined,
                        status: subscription.status,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'subscription_id' });

                if (error) console.error("Error updating subscription:", error);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`😢 Subscription deleted: ${subscription.id}`);

                const { error } = await supabase
                    .from("subscriptions")
                    .update({
                        status: "canceled",
                        updated_at: new Date().toISOString(),
                    })
                    .eq("subscription_id", subscription.id);

                if (error) console.error("Error marking subscription as canceled:", error);
                break;
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`✅ Invoice payment succeeded: ${invoice.id}`);

                if (invoice.subscription) {
                    await supabase
                        .from("subscriptions")
                        .update({ status: "active", updated_at: new Date().toISOString() })
                        .eq("subscription_id", invoice.subscription as string);
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`❌ Invoice payment failed: ${invoice.id}`);

                if (invoice.subscription) {
                    await supabase
                        .from("subscriptions")
                        .update({ status: "past_due", updated_at: new Date().toISOString() })
                        .eq("subscription_id", invoice.subscription as string);
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(`Internal Server Error`, { status: 500, headers: corsHeaders });
    }
});


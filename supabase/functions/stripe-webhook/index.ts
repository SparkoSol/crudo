import Stripe from "npm:stripe@^14.14.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
    apiVersion: "2024-06-20",
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

const METERED_CREDITS_PRICE = Deno.env.get("STRIPE_PRICE_METERED_CREDITS") || Deno.env.get("STRIPE_PRICE_METERED_MONTHLY_ANNUAL")!;

Deno.serve(async (req) => {
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
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
        }

        console.log(`Received event: ${event.type}`);

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`Checkout Session completed: ${session.id}`);
                console.log("Metadata received:", JSON.stringify(session.metadata));

                // Handle one-time credit pack purchases
                if (session.mode === 'payment' && session.metadata?.purchase_type === 'credit_pack') {
                    const packUserId = session.metadata.user_id;
                    const creditsAmount = parseInt(session.metadata.credits_amount || '0');
                    const packId = session.metadata.pack_id;

                    if (!packUserId || !creditsAmount) {
                        console.error('Missing user_id or credits_amount in credit pack metadata');
                        break;
                    }

                    if (session.payment_status !== 'paid') {
                        console.log(`Credit pack payment not yet completed (status: ${session.payment_status}), skipping`);
                        break;
                    }

                    // Idempotency: check if credits for this session were already deposited
                    const { data: existingBatch } = await supabase
                        .from('credit_batches')
                        .select('id')
                        .eq('stripe_session_id', session.id)
                        .maybeSingle();

                    if (existingBatch) {
                        console.log(`Credits for session ${session.id} already deposited, skipping duplicate`);
                        break;
                    }

                    console.log(`\uD83D\uDCE6 Depositing ${creditsAmount} prepaid credits for user ${packUserId} (pack: ${packId})`);

                    const now = new Date();
                    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                    const rolloverResponse = await fetch(`${supabaseUrl}/functions/v1/process-credit-rollover`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                            action: 'add_credits',
                            manager_id: packUserId,
                            credits_amount: creditsAmount,
                            cycle_month: cycleMonth,
                            stripe_session_id: session.id,
                        }),
                    });
                    const result = await rolloverResponse.json();
                    console.log(`\u2705 Credit pack deposited:`, result);
                    break;
                }

                // Handle subscription checkouts
                const subscriptionId = session.subscription as string;
                const userId = session.metadata?.user_id;
                const planType = session.metadata?.plan_type;
                const role = session.metadata?.subscription_role;
                const billingPeriod = session.metadata?.billing_period || 'monthly';

                if (!subscriptionId || !userId) {
                    console.error("Missing subscription info or user_id in session metadata");
                    return new Response("Missing subscription info or user_id", { status: 400, headers: corsHeaders });
                }


                try {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    const creditsItem = subscription.items.data.find(item =>
                        item.price.recurring?.usage_type === 'metered'
                    );
                    const creditsItemId = creditsItem?.id;

                    const upsertData = {
                        subscription_id: subscriptionId,
                        user_id: userId,
                        credits_subscription_item_id: creditsItemId || null,
                        plan_type: planType,
                        billing_period: billingPeriod,
                        subscription_role: role || 'platform',
                        status: subscription.status,
                        updated_at: new Date().toISOString(),
                    };

                    console.log("Upserting subscription data:", JSON.stringify(upsertData));

                    const { error } = await supabase
                        .from("subscriptions")
                        .upsert(upsertData, { onConflict: 'subscription_id' });

                    if (error) {
                        console.error("Error updating primary subscription:", error);
                        throw new Error(`Supabase Upsert Error: ${error.message}`);
                    } else {
                        console.log("Successfully upserted primary subscription.");
                    }

                    let newUsageSubId: string | null = null;

                    // Annual plans: create separate monthly metered subscription for credits
                    // Monthly plans: metered credits already included in the same subscription
                    if (billingPeriod === 'annual') {
                        console.log(`Annual plan — creating separate usage subscription for customer ${session.customer}`);

                        try {
                            const usageSub = await stripe.subscriptions.create({
                                customer: session.customer as string,
                                items: [
                                    {
                                        price: METERED_CREDITS_PRICE,
                                    },
                                ],
                                metadata: {
                                    user_id: userId,
                                    plan_type: planType,
                                    billing_period: 'annual',
                                    subscription_role: "usage",
                                },
                            });

                            newUsageSubId = usageSub.id;

                            const { error: usageError } = await supabase.from("subscriptions").insert([
                                {
                                    user_id: userId,
                                    subscription_id: usageSub.id,
                                    credits_subscription_item_id: usageSub.items.data[0].id,
                                    subscription_role: "usage",
                                    billing_period: 'annual',
                                    plan_type: planType,
                                    status: "active",
                                    updated_at: new Date().toISOString(),
                                }
                            ]);

                            if (usageError) console.error("Error creating usage subscription record:", usageError);
                            else console.log(`Created usage subscription: ${usageSub.id}`);
                        } catch (usageApiErr: any) {
                            console.error("Failed to create usage subscription via API:", usageApiErr.message);
                        }
                    } else {
                        console.log(`Monthly combined plan — metered credits included in subscription. Metered item ID: ${creditsItemId}`);
                    }
                    console.log("Checking for existing subscriptions to cancel (upgrade/downgrade)...");
                    const newSubscriptionIds = [subscriptionId];
                    if (newUsageSubId) {
                        newSubscriptionIds.push(newUsageSubId);
                    }

                    const { data: existingSubscriptions } = await supabase
                        .from("subscriptions")
                        .select("subscription_id, plan_type, subscription_role")
                        .eq("user_id", userId)
                        .in("status", ["active", "trialing", "past_due", "unpaid"])
                        .not("subscription_id", "in", `(${newSubscriptionIds.join(",")})`)
                        .order('updated_at', { ascending: false });

                    if (existingSubscriptions && existingSubscriptions.length > 0) {
                        console.log(`Found ${existingSubscriptions.length} existing subscription(s) to cancel.`);

                        const { data: wallet } = await supabase
                            .from('credits_wallet')
                            .select('used_credits_this_month, manager_id')
                            .eq('manager_id', userId)
                            .maybeSingle();

                        let currentUsage = wallet?.used_credits_this_month || 0;

                        if (!wallet && currentUsage === 0) {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('manager_id')
                                .eq('id', userId)
                                .maybeSingle();

                            if (profile?.manager_id) {
                                const { data: managerWallet } = await supabase
                                    .from('credits_wallet')
                                    .select('used_credits_this_month')
                                    .eq('manager_id', profile.manager_id)
                                    .maybeSingle();

                                currentUsage = managerWallet?.used_credits_this_month || 0;
                            }
                        }

                        let creditsInvoiced = false;

                        for (const oldSub of existingSubscriptions) {
                            console.log(`Canceling ${oldSub.subscription_role} subscription ${oldSub.subscription_id} (${oldSub.plan_type})...`);
                            try {
                                const oldStripeSubscription = await stripe.subscriptions.retrieve(oldSub.subscription_id);

                                if (currentUsage > 0 && !creditsInvoiced) {
                                    const meteredItems = oldStripeSubscription.items.data.filter(
                                        (item: any) => item.price.recurring?.usage_type === 'metered'
                                    );

                                    if (meteredItems.length > 0) {
                                        console.log(`Creating invoice for ${currentUsage} used credits...`);

                                        const customerId = typeof oldStripeSubscription.customer === 'string'
                                            ? oldStripeSubscription.customer
                                            : oldStripeSubscription.customer.id;

                                        for (const item of meteredItems) {
                                            const unitAmount = item.price.unit_amount_decimal
                                                ? parseInt(item.price.unit_amount_decimal)
                                                : item.price.unit_amount || 0;

                                            await stripe.invoiceItems.create({
                                                customer: customerId,
                                                currency: item.price.currency,
                                                unit_amount: unitAmount,
                                                quantity: currentUsage,
                                                description: `Credits used before plan change to ${planType} (${currentUsage} credits)`,
                                            });
                                        }

                                        creditsInvoiced = true;
                                    }
                                }

                                await stripe.subscriptions.cancel(oldSub.subscription_id, {
                                    invoice_now: true,
                                    prorate: false,
                                });

                                console.log(`Old subscription ${oldSub.subscription_id} canceled and invoiced.`);

                                await supabase
                                    .from("subscriptions")
                                    .update({
                                        status: 'canceled',
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('subscription_id', oldSub.subscription_id);

                                if (wallet) {
                                    const newBillingCycleAnchor = subscription.current_period_start;

                                    // Only reset usage on new billing cycle, NOT on subscription upgrade
                                    // The usage reset for subscription_cycle is handled in invoice.payment_succeeded
                                    await supabase
                                        .from("credits_wallet")
                                        .update({
                                            billing_cycle_anchor: newBillingCycleAnchor,
                                            updated_at: new Date().toISOString(),
                                        })
                                        .eq("manager_id", userId);

                                    console.log(`🔄 Billing cycle anchor updated for upgrade (anchor: ${newBillingCycleAnchor}). Usage preserved: ${wallet.used_credits_this_month}`);
                                }

                            } catch (cancelError: any) {
                                console.error(`Error canceling subscription ${oldSub.subscription_id}:`, cancelError.message);

                                if (cancelError.message && (cancelError.message.includes("No such subscription") || cancelError.code === 'resource_missing')) {
                                    console.log(`Subscription ${oldSub.subscription_id} not found in Stripe. Marking as canceled in DB.`);
                                    await supabase
                                        .from("subscriptions")
                                        .update({
                                            status: 'canceled',
                                            updated_at: new Date().toISOString()
                                        })
                                        .eq('subscription_id', oldSub.subscription_id);
                                }
                            }
                        }
                    } else {
                        console.log("No existing subscriptions found to cancel.");
                    }

                } catch (err: any) {
                    console.error("Error in checkout.session.completed:", err.message);
                    throw err;
                }
                break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                console.log(`🔄 Subscription ${event.type}: ${subscription.id}`);

                const userId = subscription.metadata?.user_id;
                const planType = subscription.metadata?.plan_type;
                const role = subscription.metadata?.subscription_role;

                let targetUserId = userId;

                if (!targetUserId) {
                    const { data: existingSub } = await supabase
                        .from("subscriptions")
                        .select("user_id")
                        .eq("subscription_id", subscription.id)
                        .maybeSingle();

                    if (existingSub) {
                        targetUserId = existingSub.user_id;
                    } else {
                        console.warn(`No user_id found for subscription ${subscription.id}, skipping update.`);
                        break;
                    }
                }

                const creditsItem = subscription.items.data.find(item =>
                    item.price.recurring?.usage_type === 'metered'
                );
                const creditsItemId = creditsItem?.id;

                const upsertData = {
                    subscription_id: subscription.id,
                    user_id: targetUserId,
                    credits_subscription_item_id: creditsItemId || null,
                    plan_type: planType,
                    billing_period: subscription.metadata?.billing_period || null,
                    subscription_role: role || 'platform',
                    status: subscription.status,
                    updated_at: new Date().toISOString(),
                };

                const { error } = await supabase
                    .from("subscriptions")
                    .upsert(upsertData, { onConflict: 'subscription_id' });

                if (error) {
                    console.error("Error updating subscription:", error);
                    throw new Error(`Supabase Join Error: ${error.message}`);
                }
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
                console.log(`Invoice payment succeeded: ${invoice.id}`);

                if (invoice.subscription) {
                    await supabase
                        .from("subscriptions")
                        .update({ status: "active", updated_at: new Date().toISOString() })
                        .eq("subscription_id", invoice.subscription as string);

                    // Process credit rollover on subscription renewal
                    if (invoice.billing_reason === 'subscription_cycle') {
                        try {
                            const { data: subRecord } = await supabase
                                .from("subscriptions")
                                .select("user_id")
                                .eq("subscription_id", invoice.subscription as string)
                                .maybeSingle();

                            if (subRecord?.user_id) {
                                const renewalSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
                                const cycleDate = new Date(renewalSub.current_period_start * 1000);
                                const newCycleMonth = `${cycleDate.getFullYear()}-${String(cycleDate.getMonth() + 1).padStart(2, '0')}`;

                                console.log(`Processing credit rollover for manager ${subRecord.user_id}, cycle ${newCycleMonth}`);

                                const rolloverResponse = await fetch(`${supabaseUrl}/functions/v1/process-credit-rollover`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${supabaseServiceKey}`,
                                    },
                                    body: JSON.stringify({
                                        action: 'rollover',
                                        manager_id: subRecord.user_id,
                                        cycle_month: newCycleMonth,
                                    }),
                                });
                                const rolloverResult = await rolloverResponse.json();
                                console.log(`🔄 Rollover result:`, rolloverResult);

                                // Reset monthly usage counter for new cycle
                                await supabase
                                    .from('credits_wallet')
                                    .update({
                                        used_credits_this_month: 0,
                                        billing_cycle_anchor: renewalSub.current_period_start,
                                        updated_at: new Date().toISOString(),
                                    })
                                    .eq('manager_id', subRecord.user_id);
                            }
                        } catch (rolloverErr: any) {
                            console.error('Error processing credit rollover:', rolloverErr.message);
                        }
                    }
                }
                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                console.log(`Invoice payment failed: ${invoice.id}`);

                if (invoice.subscription) {
                    await supabase
                        .from("subscriptions")
                        .update({ status: "past_due", updated_at: new Date().toISOString() })
                        .eq("subscription_id", invoice.subscription as string);
                }
                break;
            }

            default:
                if (event.type.startsWith('v2.')) {
                    console.error(`⚠️  WARNING: Received Stripe v2 event '${event.type}'. This webhook expects v1 events (e.g., checkout.session.completed). Please check your Stripe Webhook settings to ensure you are sending 'checkout.session.completed' and related events.`);
                } else {
                    console.log(`Unhandled event type ${event.type}`);
                }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(`Internal Server Error: ${err.message}`, { status: 500, headers: corsHeaders });
    }
});

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function getPreviousCycleMonth(cycleMonth: string): string {
    const [year, month] = cycleMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, manager_id, cycle_month, credits_amount } = body;

        if (!manager_id) {
            return new Response(
                JSON.stringify({ error: "manager_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (action === 'add_credits') {
            if (!credits_amount || credits_amount <= 0) {
                return new Response(
                    JSON.stringify({ error: "credits_amount must be a positive number" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const targetCycleMonth = cycle_month || getCurrentCycleMonth();
            const stripeSessionId = body.stripe_session_id || null;

            const insertData: Record<string, unknown> = {
                manager_id,
                credits_purchased: credits_amount,
                credits_remaining: credits_amount,
                source: 'purchase',
                cycle_month: targetCycleMonth,
            };
            if (stripeSessionId) {
                insertData.stripe_session_id = stripeSessionId;
            }

            const { data: batch, error } = await supabase.from('credit_batches').insert(insertData).select().single();

            if (error) {
                if (error.code === '23505' && stripeSessionId) {
                    console.log(`Duplicate credit batch for session ${stripeSessionId}, skipping`);
                    return new Response(
                        JSON.stringify({ success: true, duplicate: true }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
                console.error('Error adding credit batch:', error);
                throw error;
            }

            await updateWalletFromBatches(manager_id);

            console.log(`Added ${credits_amount} credits for manager ${manager_id} (cycle ${targetCycleMonth})`);
            return new Response(
                JSON.stringify({ success: true, batch }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (action === 'rollover' || !action) {
            if (!cycle_month) {
                return new Response(
                    JSON.stringify({ error: "cycle_month is required for rollover (format: YYYY-MM)" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const result = await processRollover(manager_id, cycle_month);

            console.log(`Rollover for manager ${manager_id}: ${result.rollover_amount} rolled over, ${result.expired} expired`);
            return new Response(
                JSON.stringify({ success: true, ...result }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action. Use 'rollover' or 'add_credits'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error(`Unexpected error: ${err.message}`);
        return new Response(
            JSON.stringify({ error: "Internal Server Error", message: err.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

function getCurrentCycleMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function processRollover(managerId: string, newCycleMonth: string) {
    const prevCycleMonth = getPreviousCycleMonth(newCycleMonth);

    const { data: activeBatches } = await supabase
        .from('credit_batches')
        .select('*')
        .eq('manager_id', managerId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (!activeBatches || activeBatches.length === 0) {
        return { rollover_amount: 0, expired: 0 };
    }

    const totalRemaining = activeBatches.reduce((sum: number, b: any) => sum + b.credits_remaining, 0);

    const { data: lastCycleBatches } = await supabase
        .from('credit_batches')
        .select('credits_purchased')
        .eq('manager_id', managerId)
        .eq('source', 'purchase')
        .eq('cycle_month', prevCycleMonth);

    const lastCyclePurchased = (lastCycleBatches || []).reduce((sum: number, b: any) => sum + b.credits_purchased, 0);
    const maxRollover = lastCyclePurchased;
    const rolloverAmount = Math.min(totalRemaining, maxRollover);

    const batchIds = activeBatches.map((b: any) => b.id);
    await supabase
        .from('credit_batches')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', batchIds);

    if (rolloverAmount > 0) {
        await supabase.from('credit_batches').insert({
            manager_id: managerId,
            credits_purchased: rolloverAmount,
            credits_remaining: rolloverAmount,
            source: 'rollover',
            cycle_month: newCycleMonth,
        });
    }

    await updateWalletFromBatches(managerId);

    return {
        rollover_amount: rolloverAmount,
        expired: totalRemaining - rolloverAmount,
        prev_cycle_purchased: lastCyclePurchased,
    };
}

async function updateWalletFromBatches(managerId: string) {
    const { data: batches } = await supabase
        .from('credit_batches')
        .select('credits_remaining')
        .eq('manager_id', managerId)
        .eq('is_active', true);

    const totalAvailable = (batches || []).reduce((sum: number, b: any) => sum + b.credits_remaining, 0);

    const { data: existing } = await supabase
        .from('credits_wallet')
        .select('manager_id')
        .eq('manager_id', managerId)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('credits_wallet')
            .update({
                total_credits: totalAvailable,
                updated_at: new Date().toISOString(),
            })
            .eq('manager_id', managerId);
    } else {
        await supabase.from('credits_wallet').insert({
            manager_id: managerId,
            total_credits: totalAvailable,
            used_credits: 0,
            used_credits_this_month: 0,
            updated_at: new Date().toISOString(),
        });
    }
}

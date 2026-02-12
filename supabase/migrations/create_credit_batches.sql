-- Credit Batches: tracks purchased and rollover credit inventory
-- Each batch has a remaining count that decrements via FIFO consumption.

CREATE TABLE IF NOT EXISTS credit_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL,
    credits_purchased INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'purchase',     -- 'purchase' | 'rollover'
    cycle_month TEXT NOT NULL,                   -- 'YYYY-MM' format
    stripe_session_id TEXT DEFAULT NULL,          -- Stripe checkout session ID for idempotency
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_batches_manager_active
    ON credit_batches(manager_id, is_active, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_credit_batches_cycle
    ON credit_batches(manager_id, source, cycle_month);

-- Atomic FIFO credit consumption to prevent race conditions.
-- Deducts credits from the oldest active batches first.
-- Returns total consumed and any overage.
CREATE OR REPLACE FUNCTION consume_credits_fifo(
    p_manager_id UUID,
    p_amount INTEGER
) RETURNS TABLE(consumed INTEGER, overage INTEGER) AS $$
DECLARE
    remaining INTEGER := p_amount;
    batch RECORD;
    deduct INTEGER;
    total_consumed INTEGER := 0;
BEGIN
    FOR batch IN
        SELECT id, credits_remaining
        FROM credit_batches
        WHERE manager_id = p_manager_id
          AND is_active = true
          AND credits_remaining > 0
        ORDER BY created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN remaining <= 0;
        deduct := LEAST(remaining, batch.credits_remaining);

        UPDATE credit_batches
        SET credits_remaining = credits_remaining - deduct,
            is_active = (credits_remaining - deduct) > 0,
            updated_at = NOW()
        WHERE id = batch.id;

        remaining := remaining - deduct;
        total_consumed := total_consumed + deduct;
    END LOOP;

    consumed := total_consumed;
    overage := remaining;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

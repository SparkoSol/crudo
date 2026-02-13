-- Add stripe_session_id column for idempotent credit pack deposits
ALTER TABLE credit_batches ADD COLUMN IF NOT EXISTS stripe_session_id TEXT DEFAULT NULL;

-- Unique index to prevent duplicate deposits from the same Stripe session
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_batches_stripe_session
    ON credit_batches(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

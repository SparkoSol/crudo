-- Update plan_type CHECK constraint to include new tier-based values
-- Old constraint only allowed: 'monthly', 'annual'
-- New constraint allows: 'monthly', 'annual' (legacy), 'starter', 'professional', 'enterprise' (new tiers)

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
    CHECK (plan_type = ANY (ARRAY['monthly', 'annual', 'starter', 'professional', 'enterprise']));

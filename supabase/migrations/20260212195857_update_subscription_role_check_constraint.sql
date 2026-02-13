-- Update subscription_role CHECK constraint to include 'combined' for monthly plans
-- Old constraint only allowed: 'platform', 'usage'
-- New constraint allows: 'platform', 'usage', 'combined'

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_subscription_role_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_subscription_role_check
    CHECK (subscription_role = ANY (ARRAY['platform', 'usage', 'combined']));

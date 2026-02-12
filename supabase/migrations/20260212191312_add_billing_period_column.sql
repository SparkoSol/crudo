-- Add billing_period column to subscriptions table
-- Tracks whether a subscription is 'monthly' or 'annual'

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

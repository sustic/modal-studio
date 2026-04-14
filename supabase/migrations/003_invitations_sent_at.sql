-- Add sent_at column to invitations to track when the invite email was sent
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sent_at timestamptz;

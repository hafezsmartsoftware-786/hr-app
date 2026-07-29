-- SQL migration for employee welcome SMS tracking
-- Add kind constraint check or ensure 'welcome' is allowed in sms_audit
DO $$
BEGIN
  -- Drop existing kind check constraint if it exists to allow 'welcome'
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sms_audit_kind_check'
  ) THEN
    ALTER TABLE public.sms_audit DROP CONSTRAINT sms_audit_kind_check;
  END IF;
END $$;

-- Re-add kind check including 'welcome'
ALTER TABLE public.sms_audit ADD CONSTRAINT sms_audit_kind_check 
  CHECK (kind IN ('test', 'otp', 'notification', 'welcome', 'other'));

-- Create index on kind + mobile for fast status lookup
CREATE INDEX IF NOT EXISTS sms_audit_kind_mobile_idx ON public.sms_audit (kind, mobile);

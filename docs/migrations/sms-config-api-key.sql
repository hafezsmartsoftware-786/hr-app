-- Add ePush API key column to SMS config. Run once in the Supabase SQL editor.
ALTER TABLE public.sms_config ADD COLUMN IF NOT EXISTS api_key text;
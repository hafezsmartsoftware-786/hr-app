-- SMS Misr configuration (singleton row).
-- Stores credentials used by the "Send SMS/OTP" server functions.
-- Row-level: only admin/hr can read or write. Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.sms_config (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  environment text    NOT NULL DEFAULT '2' CHECK (environment IN ('1','2')),
  username    text    NOT NULL DEFAULT '',
  password    text    NOT NULL DEFAULT '',
  sender      text    NOT NULL DEFAULT '',
  language    text    NOT NULL DEFAULT '1' CHECK (language IN ('1','2','3')),
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

GRANT SELECT, INSERT, UPDATE ON public.sms_config TO authenticated;
GRANT ALL ON public.sms_config TO service_role;

ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_config_read ON public.sms_config;
CREATE POLICY sms_config_read ON public.sms_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS sms_config_write ON public.sms_config;
CREATE POLICY sms_config_write ON public.sms_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

INSERT INTO public.sms_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
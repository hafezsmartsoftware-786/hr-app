-- SMS Misr send audit log.
-- Every send attempt (test or real) is appended here so admins can review
-- the last test result, provider code, cost, and SMSID.
CREATE TABLE IF NOT EXISTS public.sms_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  sent_by      uuid,
  mobile       text NOT NULL,
  message      text NOT NULL,
  kind         text NOT NULL DEFAULT 'test' CHECK (kind IN ('test','otp','notification','other')),
  ok           boolean NOT NULL DEFAULT false,
  provider_code text,
  sms_id       text,
  cost         text,
  error        text
);

CREATE INDEX IF NOT EXISTS sms_audit_created_at_idx ON public.sms_audit (created_at DESC);

GRANT SELECT, INSERT ON public.sms_audit TO authenticated;
GRANT ALL ON public.sms_audit TO service_role;

ALTER TABLE public.sms_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sms_audit_read ON public.sms_audit;
CREATE POLICY sms_audit_read ON public.sms_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS sms_audit_insert ON public.sms_audit;
CREATE POLICY sms_audit_insert ON public.sms_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

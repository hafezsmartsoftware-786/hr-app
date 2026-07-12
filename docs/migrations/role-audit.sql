-- Role assignment audit log.
-- Every role add/remove (single or bulk) appends a row so admins
-- can review who changed what and when.
CREATE TABLE IF NOT EXISTS public.role_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid,
  actor_email  text,
  target_id    uuid NOT NULL,
  target_email text,
  target_name  text,
  role         text NOT NULL,
  action       text NOT NULL CHECK (action IN ('assign','remove')),
  batch_id     uuid,
  ok           boolean NOT NULL DEFAULT true,
  error        text
);

CREATE INDEX IF NOT EXISTS role_audit_created_at_idx ON public.role_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS role_audit_target_idx ON public.role_audit (target_id);

GRANT SELECT, INSERT ON public.role_audit TO authenticated;
GRANT ALL ON public.role_audit TO service_role;

ALTER TABLE public.role_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_audit_read ON public.role_audit;
CREATE POLICY role_audit_read ON public.role_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS role_audit_insert ON public.role_audit;
CREATE POLICY role_audit_insert ON public.role_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
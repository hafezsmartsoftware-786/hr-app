-- Timeline of employee status changes (Active <-> Inactive) plus the
-- inactive_reason captured at the time of the change.
CREATE TABLE IF NOT EXISTS public.employee_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  inactive_reason text,
  source text NOT NULL DEFAULT 'update',
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.employee_status_audit TO authenticated;
GRANT ALL ON public.employee_status_audit TO service_role;

ALTER TABLE public.employee_status_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/HR view status audit" ON public.employee_status_audit;
CREATE POLICY "Admins/HR view status audit" ON public.employee_status_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

DROP POLICY IF EXISTS "Admins/HR insert status audit" ON public.employee_status_audit;
CREATE POLICY "Admins/HR insert status audit" ON public.employee_status_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE INDEX IF NOT EXISTS employee_status_audit_profile_idx
  ON public.employee_status_audit(profile_id, created_at DESC);
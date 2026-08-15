-- Add employee_status_audit table
CREATE TABLE IF NOT EXISTS public.employee_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  inactive_reason text,
  source text NOT NULL DEFAULT 'system',
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_status_audit TO authenticated;
GRANT ALL ON public.employee_status_audit TO service_role;
ALTER TABLE public.employee_status_audit ENABLE ROW LEVEL SECURITY;

-- Admins and HR can view all, employees can view their own
CREATE POLICY "employee_status_audit view" ON public.employee_status_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR profile_id = auth.uid());

-- Admins and HR can insert
CREATE POLICY "employee_status_audit insert" ON public.employee_status_audit FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

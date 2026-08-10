-- Employee custody (assets handed to an employee)
CREATE TABLE IF NOT EXISTS public.employee_custody (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  custody_date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL,
  serial_number text,
  model text,
  category text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_custody_profile_idx ON public.employee_custody (profile_id, custody_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_custody TO authenticated;
GRANT ALL ON public.employee_custody TO service_role;

ALTER TABLE public.employee_custody ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custody staff manage" ON public.employee_custody;
CREATE POLICY "custody staff manage" ON public.employee_custody
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

DROP POLICY IF EXISTS "custody read own" ON public.employee_custody;
CREATE POLICY "custody read own" ON public.employee_custody
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP TRIGGER IF EXISTS employee_custody_set_updated_at ON public.employee_custody;
CREATE TRIGGER employee_custody_set_updated_at
  BEFORE UPDATE ON public.employee_custody
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

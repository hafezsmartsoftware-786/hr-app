-- Add employee_custody table
CREATE TABLE IF NOT EXISTS public.employee_custody (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  model text,
  serial_number text,
  notes text,
  custody_date date NOT NULL DEFAULT CURRENT_DATE,
  return_date date,
  return_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  returned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_custody TO authenticated;
GRANT ALL ON public.employee_custody TO service_role;
ALTER TABLE public.employee_custody ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_employee_custody_updated BEFORE UPDATE ON public.employee_custody
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Employees can view their own custody items, admins can view and manage all.
CREATE POLICY "employee_custody view self or admin" ON public.employee_custody FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "employee_custody insert admin hr" ON public.employee_custody FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "employee_custody update admin hr" ON public.employee_custody FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "employee_custody delete admin hr" ON public.employee_custody FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

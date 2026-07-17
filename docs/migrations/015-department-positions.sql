-- Migration: 015-department-positions
-- Description: Create department_positions table for staffing plans

CREATE TABLE IF NOT EXISTS public.department_positions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    job_grade_id uuid NOT NULL REFERENCES public.job_grades(id) ON DELETE RESTRICT,
    headcount integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT department_positions_pkey PRIMARY KEY (id),
    CONSTRAINT department_positions_unique_dept_pos UNIQUE (department_id, position_id)
);

-- Enable RLS
ALTER TABLE public.department_positions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.department_positions;
CREATE POLICY "Enable read access for authenticated users" ON public.department_positions
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.department_positions;
CREATE POLICY "Enable all access for admin users" ON public.department_positions
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_department_positions_updated_at ON public.department_positions;
CREATE TRIGGER set_department_positions_updated_at
    BEFORE UPDATE ON public.department_positions
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at();

-- Migration: 014-job-grades
-- Description: Create job grades table and seed default job grades

CREATE TABLE IF NOT EXISTS public.job_grades (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name_en text NOT NULL,
    name_ar text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT job_grades_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.job_grades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON public.job_grades
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable all access for admin users" ON public.job_grades
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Create trigger for updated_at
CREATE TRIGGER set_job_grades_updated_at
    BEFORE UPDATE ON public.job_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default job grades if empty
INSERT INTO public.job_grades (name_en, name_ar)
SELECT 'Manager', 'مدير'
WHERE NOT EXISTS (SELECT 1 FROM public.job_grades WHERE name_en = 'Manager');

INSERT INTO public.job_grades (name_en, name_ar)
SELECT 'Engineer', 'مهندس / إداري'
WHERE NOT EXISTS (SELECT 1 FROM public.job_grades WHERE name_en = 'Engineer');

INSERT INTO public.job_grades (name_en, name_ar)
SELECT 'Supervisor', 'مشرف / فني'
WHERE NOT EXISTS (SELECT 1 FROM public.job_grades WHERE name_en = 'Supervisor');

INSERT INTO public.job_grades (name_en, name_ar)
SELECT 'Driver', 'سائق'
WHERE NOT EXISTS (SELECT 1 FROM public.job_grades WHERE name_en = 'Driver');

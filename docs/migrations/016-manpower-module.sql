-- Migration: 016-manpower-module
-- Description: Create Sections, link to profiles/department_positions, and create manpower_plans

-- 1. Create Sections table
CREATE TABLE IF NOT EXISTS public.sections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT sections_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.sections;
CREATE POLICY "Enable read access for authenticated users" ON public.sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable all access for admin users" ON public.sections;
CREATE POLICY "Enable all access for admin users" ON public.sections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP TRIGGER IF EXISTS set_sections_updated_at ON public.sections;
CREATE TRIGGER set_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Link Sections to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL;

-- 3. Link Sections to Department Positions (Optional subdivision)
ALTER TABLE public.department_positions ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE;

-- 4. Create Manpower Plans table
CREATE TABLE IF NOT EXISTS public.manpower_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    fiscal_year integer NOT NULL,
    company text,
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
    position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
    job_grade_id uuid REFERENCES public.job_grades(id) ON DELETE SET NULL,
    
    planned_headcount integer NOT NULL DEFAULT 1,
    
    employment_type text,
    hiring_reason text,
    priority text,
    required_date date,
    
    salary_from numeric,
    salary_to numeric,
    currency text DEFAULT 'EGP',
    
    budget_available boolean DEFAULT false,
    budget_approved boolean DEFAULT false,
    cost_center text,
    estimated_annual_cost numeric,
    
    status text NOT NULL DEFAULT 'Draft',
    
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT manpower_plans_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.manpower_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.manpower_plans;
CREATE POLICY "Enable read access for authenticated users" ON public.manpower_plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable all access for admin users" ON public.manpower_plans;
CREATE POLICY "Enable all access for admin users" ON public.manpower_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));
DROP TRIGGER IF EXISTS set_manpower_plans_updated_at ON public.manpower_plans;
CREATE TRIGGER set_manpower_plans_updated_at BEFORE UPDATE ON public.manpower_plans FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. Create View for Current Headcount (To automatically calculate active employees per position/section)
CREATE OR REPLACE VIEW public.vw_current_headcount AS
SELECT 
    department_id,
    section_id,
    position_id,
    COUNT(id) as current_headcount
FROM public.profiles
WHERE status = 'ACTIVE' 
  AND department_id IS NOT NULL 
  AND position_id IS NOT NULL
GROUP BY department_id, section_id, position_id;

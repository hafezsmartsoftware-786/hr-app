-- Drop if exists (in case of re-running the migration)
DROP TABLE IF EXISTS public.trip_allowance_policies;

-- Add job grade to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_grade text;

-- Create trip allowance policies table (the matrix)
CREATE TABLE public.trip_allowance_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    job_grade text NOT NULL,
    nightly_rate numeric NOT NULL DEFAULT 0,
    transport_expense numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(city_id, job_grade)
);

-- Seed initial data based on the provided image
-- Job Grades: 
-- "Manager" -> مدير إدارة / مدير المشروع
-- "Engineer" -> مهندس / اداري بالشركة
-- "Supervisor" -> مشرف/ فنى / سائق
-- Seed initial data if cities exist
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Manager', 300 FROM public.cities WHERE name_ar = 'شرم الشيخ' OR name_en ILIKE '%sharm%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Engineer', 260 FROM public.cities WHERE name_ar = 'شرم الشيخ' OR name_en ILIKE '%sharm%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Supervisor', 175 FROM public.cities WHERE name_ar = 'شرم الشيخ' OR name_en ILIKE '%sharm%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Driver', 175 FROM public.cities WHERE name_ar = 'شرم الشيخ' OR name_en ILIKE '%sharm%';

INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Manager', 300 FROM public.cities WHERE name_ar = 'رفح' OR name_en ILIKE '%rafah%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Engineer', 260 FROM public.cities WHERE name_ar = 'رفح' OR name_en ILIKE '%rafah%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Supervisor', 200 FROM public.cities WHERE name_ar = 'رفح' OR name_en ILIKE '%rafah%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Driver', 200 FROM public.cities WHERE name_ar = 'رفح' OR name_en ILIKE '%rafah%';

INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Manager', 250 FROM public.cities WHERE name_ar = 'الغردقة' OR name_en ILIKE '%hurghada%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Engineer', 225 FROM public.cities WHERE name_ar = 'الغردقة' OR name_en ILIKE '%hurghada%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Supervisor', 175 FROM public.cities WHERE name_ar = 'الغردقة' OR name_en ILIKE '%hurghada%';
INSERT INTO public.trip_allowance_policies (city_id, job_grade, nightly_rate)
SELECT id, 'Driver', 175 FROM public.cities WHERE name_ar = 'الغردقة' OR name_en ILIKE '%hurghada%';

-- Update Trips table to capture allowance data
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS overnight_nights integer NOT NULL DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS transport_type text; -- 'company_car', 'expense_claim', etc.
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS calculated_allowance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS allowance_status text NOT NULL DEFAULT 'pending'; -- 'pending', 'paid'

-- RLS for trip_allowance_policies
ALTER TABLE public.trip_allowance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip_allowance_policies_select" ON public.trip_allowance_policies FOR SELECT USING (true);
CREATE POLICY "trip_allowance_policies_admin" ON public.trip_allowance_policies FOR ALL 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'finance'));

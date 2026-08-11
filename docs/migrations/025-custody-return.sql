-- Add return fields to employee_custody

ALTER TABLE public.employee_custody
ADD COLUMN IF NOT EXISTS return_date date,
ADD COLUMN IF NOT EXISTS return_notes text;

-- Add missing columns that were added in the backend but never backed by migrations
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS inactive_reason text,
ADD COLUMN IF NOT EXISTS job_grade text;

ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS responsible_person_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

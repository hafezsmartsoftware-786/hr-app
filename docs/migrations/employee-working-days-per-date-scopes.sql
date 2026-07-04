-- Relax the scope CHECK constraint on employee_working_days so per-date
-- overrides ('date_on' / 'date_off') can be stored alongside the existing
-- 'weekly' and 'month' scopes. Also relax the shape constraint so date_on
-- and date_off rows require (year, month) like 'month' rows do.
--
-- Run this in the Supabase SQL editor.

ALTER TABLE public.employee_working_days
  DROP CONSTRAINT IF EXISTS employee_working_days_scope_check;

ALTER TABLE public.employee_working_days
  ADD CONSTRAINT employee_working_days_scope_check
  CHECK (scope IN ('weekly', 'month', 'date_on', 'date_off'));

ALTER TABLE public.employee_working_days
  DROP CONSTRAINT IF EXISTS employee_working_days_scope_shape;

ALTER TABLE public.employee_working_days
  ADD CONSTRAINT employee_working_days_scope_shape CHECK (
    (scope = 'weekly' AND year IS NULL AND month IS NULL)
    OR (scope IN ('month', 'date_on', 'date_off')
        AND year IS NOT NULL AND month IS NOT NULL)
  );

-- Unique per-(employee, year, month) row for each per-date scope.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_employee_working_days_date_on
  ON public.employee_working_days(employee_id, year, month) WHERE scope = 'date_on';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_employee_working_days_date_off
  ON public.employee_working_days(employee_id, year, month) WHERE scope = 'date_off';
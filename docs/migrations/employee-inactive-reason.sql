-- Reason captured when an employee's status is set to Inactive.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS inactive_reason text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_inactive_reason_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_inactive_reason_chk CHECK (
    inactive_reason IS NULL OR inactive_reason IN (
      'Resigned','Terminated','End of Contract','Deceased','Long-Term Leave','Suspended'
    )
  );

-- If an account is Active, the reason must be cleared.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_inactive_reason_status_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_inactive_reason_status_chk CHECK (
    status = 'Inactive' OR inactive_reason IS NULL
  );

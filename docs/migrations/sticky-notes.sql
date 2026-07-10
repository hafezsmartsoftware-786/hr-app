-- Sticky notes: per-user notes with color labels.
-- Note: this project's public.profiles.id equals auth.users.id,
-- so profile_id = auth.uid() is the correct ownership check.
CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text,
  content     text,
  color       text NOT NULL DEFAULT 'bg-yellow-200',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sticky_notes_profile_updated_idx
  ON public.sticky_notes (profile_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;

ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sticky_notes_owner_all ON public.sticky_notes;
CREATE POLICY sticky_notes_owner_all ON public.sticky_notes
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP TRIGGER IF EXISTS sticky_notes_set_updated_at ON public.sticky_notes;
CREATE TRIGGER sticky_notes_set_updated_at
  BEFORE UPDATE ON public.sticky_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
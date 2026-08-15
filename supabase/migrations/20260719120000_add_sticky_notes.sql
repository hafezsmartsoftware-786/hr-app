-- Add sticky_notes table
CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  content text,
  color text NOT NULL DEFAULT '#ffffff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticky_notes TO authenticated;
GRANT ALL ON public.sticky_notes TO service_role;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_sticky_notes_updated BEFORE UPDATE ON public.sticky_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "sticky_notes self" ON public.sticky_notes FOR ALL TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Lock down public.webauthn_challenges (server/service-role only).
REVOKE ALL ON public.webauthn_challenges FROM anon, authenticated;
GRANT ALL ON public.webauthn_challenges TO service_role;
DROP POLICY IF EXISTS "webauthn_challenges deny client access" ON public.webauthn_challenges;
CREATE POLICY "webauthn_challenges deny client access"
  ON public.webauthn_challenges AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

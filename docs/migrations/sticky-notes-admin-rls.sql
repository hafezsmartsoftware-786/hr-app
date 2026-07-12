-- Allow HR and Admins to manage all sticky notes (e.g. for employee profiles)
CREATE POLICY "Admins/HR manage sticky_notes" ON public.sticky_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'manager'));

-- Allow Finance role to SELECT from all payroll-related tables
CREATE POLICY "Finance can view profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view attendance" ON public.attendance FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view leaves" ON public.leaves FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view payroll_settings" ON public.payroll_settings FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view tax_brackets" ON public.tax_brackets FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view employee_advances" ON public.employee_advances FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view employee_advance_installments" ON public.employee_advance_installments FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view payroll_runs" ON public.payroll_runs FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view payroll_run_items" ON public.payroll_run_items FOR SELECT USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance can view departments" ON public.departments FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

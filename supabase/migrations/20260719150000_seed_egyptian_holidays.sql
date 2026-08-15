-- Seed standard Egyptian holidays
INSERT INTO public.holidays (name, date, type, recurring, country) VALUES
('Coptic Christmas', '2026-01-07', 'public', true, 'Egypt'),
('25 January Revolution', '2026-01-25', 'public', true, 'Egypt'),
('Eid El Fitr', '2026-03-20', 'public', false, 'Egypt'),
('Eid El Fitr Holiday', '2026-03-21', 'public', false, 'Egypt'),
('Sinai Liberation Day', '2026-04-25', 'public', true, 'Egypt'),
('Labour Day', '2026-05-01', 'public', true, 'Egypt'),
('Eid El Adha', '2026-05-27', 'public', false, 'Egypt'),
('Eid El Adha Holiday', '2026-05-28', 'public', false, 'Egypt'),
('30 June Revolution', '2026-06-30', 'public', true, 'Egypt'),
('Islamic New Year', '2026-06-17', 'public', false, 'Egypt'),
('23 July Revolution', '2026-07-23', 'public', true, 'Egypt'),
('Prophet Muhammad''s Birthday', '2026-08-26', 'public', false, 'Egypt'),
('Armed Forces Day', '2026-10-06', 'public', true, 'Egypt')
ON CONFLICT DO NOTHING;

-- Custody return workflow: track who returned/received the item
ALTER TABLE public.employee_custody
  ADD COLUMN IF NOT EXISTS returned_by text;

ALTER TABLE public.trips 
ADD COLUMN city UUID REFERENCES public.cities(id),
ADD COLUMN district TEXT;

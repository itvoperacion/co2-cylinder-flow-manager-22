-- Update existing records from 'devoluciones' to 'cierre_rutas'
UPDATE public.cylinders 
SET current_location = 'cierre_rutas' 
WHERE current_location = 'devoluciones';

UPDATE public.transfers 
SET from_location = 'cierre_rutas' 
WHERE from_location = 'devoluciones';

UPDATE public.transfers 
SET to_location = 'cierre_rutas' 
WHERE to_location = 'devoluciones';
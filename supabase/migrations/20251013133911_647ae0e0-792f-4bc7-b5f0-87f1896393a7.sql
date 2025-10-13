-- Rename location 'asignaciones' to 'rutas'
-- First, drop the constraint to allow updates
ALTER TABLE public.cylinders 
DROP CONSTRAINT IF EXISTS cylinders_current_location_check;

-- Update all existing records
UPDATE public.cylinders 
SET current_location = 'rutas' 
WHERE current_location = 'asignaciones';

UPDATE public.transfers 
SET from_location = 'rutas' 
WHERE from_location = 'asignaciones';

UPDATE public.transfers 
SET to_location = 'rutas' 
WHERE to_location = 'asignaciones';

-- Now add the constraint with 'rutas' instead of 'asignaciones'
ALTER TABLE public.cylinders 
ADD CONSTRAINT cylinders_current_location_check 
CHECK (current_location IN ('despacho', 'rutas', 'clientes', 'devoluciones', 'estacion_llenado', 'en_mantenimiento'));
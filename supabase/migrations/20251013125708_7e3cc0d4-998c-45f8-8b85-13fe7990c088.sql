-- Add 'clientes' as a valid location for cylinders along with other existing locations
ALTER TABLE public.cylinders 
DROP CONSTRAINT IF EXISTS cylinders_current_location_check;

ALTER TABLE public.cylinders 
ADD CONSTRAINT cylinders_current_location_check 
CHECK (current_location IN ('despacho', 'asignaciones', 'clientes', 'devoluciones', 'estacion_llenado', 'en_mantenimiento'));
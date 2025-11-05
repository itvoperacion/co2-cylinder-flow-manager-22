-- Eliminar la restricción antigua de current_location
ALTER TABLE public.cylinders DROP CONSTRAINT IF EXISTS cylinders_current_location_check;

-- Crear la nueva restricción con todos los valores permitidos
ALTER TABLE public.cylinders 
ADD CONSTRAINT cylinders_current_location_check 
CHECK (current_location IN (
  'despacho',
  'estacion_llenado',
  'rutas',
  'clientes',
  'devolucion_clientes',
  'cierre_rutas',
  'en_mantenimiento',
  'fuera_de_servicio'
));
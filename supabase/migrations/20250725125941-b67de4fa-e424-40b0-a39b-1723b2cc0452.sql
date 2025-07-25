-- Crear tabla para el tanque principal de CO2
CREATE TABLE public.co2_tank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tank_name TEXT NOT NULL DEFAULT 'Tanque Principal CO2',
  capacity NUMERIC NOT NULL DEFAULT 3200,
  current_level NUMERIC NOT NULL DEFAULT 0,
  minimum_threshold NUMERIC NOT NULL DEFAULT 10,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para movimientos del tanque (entradas y salidas)
CREATE TABLE public.tank_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tank_id UUID NOT NULL REFERENCES public.co2_tank(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida')),
  quantity NUMERIC NOT NULL,
  operator_name TEXT NOT NULL,
  supplier TEXT NULL, -- Solo para entradas
  observations TEXT NULL,
  reference_filling_id UUID NULL REFERENCES public.fillings(id), -- Para salidas por llenado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para alertas del sistema
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.co2_tank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS permisivas para todas las operaciones
CREATE POLICY "Allow all operations on co2_tank" 
ON public.co2_tank 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on tank_movements" 
ON public.tank_movements 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on system_alerts" 
ON public.system_alerts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_co2_tank_updated_at
BEFORE UPDATE ON public.co2_tank
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tank_movements_updated_at
BEFORE UPDATE ON public.tank_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON public.system_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar datos iniciales del tanque principal
INSERT INTO public.co2_tank (tank_name, capacity, current_level, minimum_threshold) 
VALUES ('Tanque Principal CO2', 3200, 1600, 10);

-- Función para actualizar automáticamente el nivel del tanque cuando se registra un movimiento
CREATE OR REPLACE FUNCTION public.update_tank_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.co2_tank 
    SET current_level = current_level + NEW.quantity,
        last_updated = now()
    WHERE id = NEW.tank_id;
  ELSIF NEW.movement_type = 'salida' THEN
    UPDATE public.co2_tank 
    SET current_level = current_level - NEW.quantity,
        last_updated = now()
    WHERE id = NEW.tank_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar nivel automáticamente
CREATE TRIGGER update_tank_level_trigger
AFTER INSERT ON public.tank_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_tank_level();

-- Función para generar alertas de nivel bajo
CREATE OR REPLACE FUNCTION public.check_tank_level()
RETURNS TRIGGER AS $$
DECLARE
  tank_record RECORD;
  percentage NUMERIC;
BEGIN
  SELECT * INTO tank_record FROM public.co2_tank WHERE id = NEW.id;
  
  percentage := (tank_record.current_level / tank_record.capacity) * 100;
  
  IF percentage <= tank_record.minimum_threshold THEN
    INSERT INTO public.system_alerts (
      alert_type, 
      title, 
      message, 
      severity
    ) VALUES (
      'tank_level_low',
      'Nivel Bajo del Tanque',
      'El tanque ' || tank_record.tank_name || ' tiene un nivel de ' || ROUND(percentage, 1) || '% (' || tank_record.current_level || ' kg). Se requiere reabastecimiento urgente.',
      CASE 
        WHEN percentage <= 5 THEN 'critical'
        ELSE 'warning'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para verificar nivel del tanque
CREATE TRIGGER check_tank_level_trigger
AFTER UPDATE ON public.co2_tank
FOR EACH ROW
EXECUTE FUNCTION public.check_tank_level();
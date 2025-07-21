-- Create enum types for better data consistency
CREATE TYPE public.cylinder_status AS ENUM ('vacio', 'lleno', 'en_llenado', 'en_mantenimiento', 'fuera_de_servicio');
CREATE TYPE public.cylinder_location AS ENUM ('despacho', 'estacion_llenado', 'en_mantenimiento', 'fuera_de_servicio', 'asignaciones', 'devoluciones');
CREATE TYPE public.cylinder_capacity AS ENUM ('9kg', '22kg', '25kg');
CREATE TYPE public.valve_type AS ENUM ('standard', 'special', 'industrial');
CREATE TYPE public.movement_type AS ENUM ('entrada', 'salida', 'llenado', 'traslado');

-- Tanque de CO2 principal
CREATE TABLE public.co2_tank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_level DECIMAL(10,2) NOT NULL DEFAULT 0,
  capacity DECIMAL(10,2) NOT NULL DEFAULT 3200,
  minimum_threshold DECIMAL(5,2) NOT NULL DEFAULT 10,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Movimientos del tanque de CO2
CREATE TABLE public.tank_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tank_id UUID NOT NULL REFERENCES public.co2_tank(id),
  movement_type public.movement_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  operator_name TEXT NOT NULL,
  supplier TEXT,
  reference_number TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cilindros
CREATE TABLE public.cylinders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  capacity public.cylinder_capacity NOT NULL,
  valve_type public.valve_type NOT NULL DEFAULT 'standard',
  manufacturing_date DATE NOT NULL,
  last_hydrostatic_test DATE NOT NULL,
  next_test_due DATE GENERATED ALWAYS AS (last_hydrostatic_test + INTERVAL '5 years') STORED,
  current_status public.cylinder_status NOT NULL DEFAULT 'vacio',
  current_location public.cylinder_location NOT NULL DEFAULT 'despacho',
  current_weight DECIMAL(8,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Llenados de cilindros
CREATE TABLE public.cylinder_fillings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id),
  tank_id UUID NOT NULL REFERENCES public.co2_tank(id),
  operator_name TEXT NOT NULL,
  weight_filled DECIMAL(8,2) NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  batch_number TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Traslados de cilindros
CREATE TABLE public.cylinder_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id),
  from_location public.cylinder_location NOT NULL,
  to_location public.cylinder_location NOT NULL,
  operator_name TEXT NOT NULL,
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Campos específicos para asignaciones
  customer_name TEXT,
  delivery_note_number TEXT,
  driver_name TEXT,
  cylinder_quantity INTEGER DEFAULT 1,
  
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alertas del sistema
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar tanque inicial
INSERT INTO public.co2_tank (current_level, capacity) VALUES (3200, 3200);

-- Enable Row Level Security
ALTER TABLE public.co2_tank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tank_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cylinder_fillings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cylinder_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (todas las tablas accesibles para usuarios autenticados)
CREATE POLICY "Authenticated users can view tank data" ON public.co2_tank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update tank data" ON public.co2_tank FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view tank movements" ON public.tank_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tank movements" ON public.tank_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view cylinders" ON public.cylinders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cylinders" ON public.cylinders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cylinders" ON public.cylinders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fillings" ON public.cylinder_fillings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fillings" ON public.cylinder_fillings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view transfers" ON public.cylinder_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transfers" ON public.cylinder_transfers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view alerts" ON public.system_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update alerts" ON public.system_alerts FOR UPDATE TO authenticated USING (true);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cylinders
CREATE TRIGGER update_cylinders_updated_at
  BEFORE UPDATE ON public.cylinders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para actualizar nivel del tanque después de llenado
CREATE OR REPLACE FUNCTION public.update_tank_level_after_filling()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.co2_tank 
  SET current_level = current_level - NEW.weight_filled,
      last_updated = now()
  WHERE id = NEW.tank_id;
  
  -- Actualizar estado del cilindro a lleno
  UPDATE public.cylinders 
  SET current_status = 'lleno',
      current_weight = NEW.weight_filled,
      updated_at = now()
  WHERE id = NEW.cylinder_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar tanque después de llenado
CREATE TRIGGER update_tank_after_filling
  AFTER INSERT ON public.cylinder_fillings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tank_level_after_filling();

-- Función para actualizar ubicación después de traslado
CREATE OR REPLACE FUNCTION public.update_cylinder_location_after_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar la ubicación del cilindro
  UPDATE public.cylinders 
  SET current_location = NEW.to_location,
      updated_at = now()
  WHERE id = NEW.cylinder_id;
  
  -- Si el traslado es de Despacho a Estación de Llenado, cambiar estado a vacío
  IF NEW.from_location = 'despacho' AND NEW.to_location = 'estacion_llenado' THEN
    UPDATE public.cylinders 
    SET current_status = 'vacio'
    WHERE id = NEW.cylinder_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar ubicación después de traslado
CREATE TRIGGER update_cylinder_after_transfer
  AFTER INSERT ON public.cylinder_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cylinder_location_after_transfer();

-- Función para generar alertas de nivel bajo de tanque
CREATE OR REPLACE FUNCTION public.check_tank_level_alert()
RETURNS TRIGGER AS $$
DECLARE
  tank_percentage DECIMAL;
BEGIN
  -- Calcular porcentaje del tanque
  tank_percentage := (NEW.current_level / NEW.capacity) * 100;
  
  -- Si el nivel está por debajo del umbral mínimo, crear alerta
  IF tank_percentage <= NEW.minimum_threshold THEN
    INSERT INTO public.system_alerts (alert_type, title, message, severity)
    VALUES (
      'low_tank_level',
      'Nivel bajo de CO2',
      'El tanque de CO2 está en ' || ROUND(tank_percentage, 1) || '% (' || NEW.current_level || ' kg). Se requiere reabastecimiento.',
      'warning'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para alertas de nivel bajo
CREATE TRIGGER check_tank_level_alert_trigger
  AFTER UPDATE ON public.co2_tank
  FOR EACH ROW
  EXECUTE FUNCTION public.check_tank_level_alert();

-- Índices para mejorar performance
CREATE INDEX idx_cylinders_serial_number ON public.cylinders(serial_number);
CREATE INDEX idx_cylinders_status ON public.cylinders(current_status);
CREATE INDEX idx_cylinders_location ON public.cylinders(current_location);
CREATE INDEX idx_cylinders_capacity ON public.cylinders(capacity);
CREATE INDEX idx_cylinder_fillings_cylinder_id ON public.cylinder_fillings(cylinder_id);
CREATE INDEX idx_cylinder_transfers_cylinder_id ON public.cylinder_transfers(cylinder_id);
CREATE INDEX idx_tank_movements_created_at ON public.tank_movements(created_at);
CREATE INDEX idx_system_alerts_is_read ON public.system_alerts(is_read);
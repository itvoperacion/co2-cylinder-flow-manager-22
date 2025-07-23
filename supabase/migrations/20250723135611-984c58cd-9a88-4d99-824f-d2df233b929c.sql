-- Create cylinders table
CREATE TABLE public.cylinders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  capacity TEXT NOT NULL CHECK (capacity IN ('9kg', '22kg', '25kg')),
  valve_type TEXT NOT NULL CHECK (valve_type IN ('industrial', 'special')),
  manufacturing_date DATE NOT NULL,
  last_hydrostatic_test DATE NOT NULL,
  next_test_due DATE NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'vacio' CHECK (current_status IN ('vacio', 'lleno', 'en_llenado', 'en_mantenimiento', 'fuera_de_servicio')),
  current_location TEXT NOT NULL DEFAULT 'despacho' CHECK (current_location IN ('despacho', 'estacion_llenado', 'en_mantenimiento', 'fuera_de_servicio', 'asignaciones', 'devoluciones')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tanks table for CO2 tanks
CREATE TABLE public.tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tank_number TEXT NOT NULL UNIQUE,
  capacity_kg NUMERIC NOT NULL,
  current_weight_kg NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_refill_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fillings table
CREATE TABLE public.fillings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id) ON DELETE CASCADE,
  tank_id UUID NOT NULL REFERENCES public.tanks(id) ON DELETE RESTRICT,
  weight_filled NUMERIC NOT NULL,
  operator_name TEXT NOT NULL,
  batch_number TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transfers table
CREATE TABLE public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_id UUID NOT NULL REFERENCES public.cylinders(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fillings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is an internal business application)
CREATE POLICY "Allow all operations on cylinders" ON public.cylinders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tanks" ON public.tanks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on fillings" ON public.fillings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cylinders_updated_at
  BEFORE UPDATE ON public.cylinders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tanks_updated_at
  BEFORE UPDATE ON public.tanks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fillings_updated_at
  BEFORE UPDATE ON public.fillings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_cylinders_status ON public.cylinders(current_status);
CREATE INDEX idx_cylinders_location ON public.cylinders(current_location);
CREATE INDEX idx_cylinders_capacity ON public.cylinders(capacity);
CREATE INDEX idx_cylinders_active ON public.cylinders(is_active);
CREATE INDEX idx_fillings_cylinder ON public.fillings(cylinder_id);
CREATE INDEX idx_fillings_tank ON public.fillings(tank_id);
CREATE INDEX idx_fillings_created ON public.fillings(created_at);
CREATE INDEX idx_transfers_cylinder ON public.transfers(cylinder_id);
CREATE INDEX idx_transfers_created ON public.transfers(created_at);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);

-- Enable realtime for all tables
ALTER TABLE public.cylinders REPLICA IDENTITY FULL;
ALTER TABLE public.tanks REPLICA IDENTITY FULL;
ALTER TABLE public.fillings REPLICA IDENTITY FULL;
ALTER TABLE public.transfers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.cylinders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tanks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fillings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
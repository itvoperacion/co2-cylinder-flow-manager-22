-- CRITICAL SECURITY FIX: Replace all public RLS policies with authentication-required policies

-- 1. Update RLS policies for co2_tank table
DROP POLICY IF EXISTS "Allow all operations on co2_tank" ON public.co2_tank;
CREATE POLICY "Authenticated users can manage co2_tank" 
ON public.co2_tank 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Update RLS policies for cylinders table
DROP POLICY IF EXISTS "Allow all operations on cylinders" ON public.cylinders;
CREATE POLICY "Authenticated users can manage cylinders" 
ON public.cylinders 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Update RLS policies for fillings table
DROP POLICY IF EXISTS "Allow all operations on fillings" ON public.fillings;
CREATE POLICY "Authenticated users can manage fillings" 
ON public.fillings 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Update RLS policies for transfers table
DROP POLICY IF EXISTS "Allow all operations on transfers" ON public.transfers;
CREATE POLICY "Authenticated users can manage transfers" 
ON public.transfers 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Update RLS policies for tank_movements table
DROP POLICY IF EXISTS "Allow all operations on tank_movements" ON public.tank_movements;
CREATE POLICY "Authenticated users can manage tank_movements" 
ON public.tank_movements 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Update RLS policies for system_alerts table
DROP POLICY IF EXISTS "Allow all operations on system_alerts" ON public.system_alerts;
CREATE POLICY "Authenticated users can manage system_alerts" 
ON public.system_alerts 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Update RLS policies for notifications table
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;
CREATE POLICY "Authenticated users can manage notifications" 
ON public.notifications 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Update RLS policies for tanks table
DROP POLICY IF EXISTS "Allow all operations on tanks" ON public.tanks;
CREATE POLICY "Authenticated users can manage tanks" 
ON public.tanks 
FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- SECURITY FIX: Add search_path protection to all database functions to prevent schema poisoning

-- Update reverse_filling function
CREATE OR REPLACE FUNCTION public.reverse_filling(filling_id uuid, reversed_by text, reversal_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  filling_record RECORD;
BEGIN
  -- Get the filling record
  SELECT * INTO filling_record FROM public.fillings WHERE id = filling_id AND is_reversed = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filling not found or already reversed';
  END IF;
  
  -- Mark filling as reversed
  UPDATE public.fillings 
  SET is_reversed = TRUE,
      reversed_at = NOW(),
      reversed_by = reversed_by,
      reversal_reason = reversal_reason
  WHERE id = filling_id;
  
  -- Update cylinder status back to empty
  UPDATE public.cylinders 
  SET current_status = 'vacio'
  WHERE id = filling_record.cylinder_id;
  
  -- Add CO2 back to tank (reverse the tank level change)
  UPDATE public.co2_tank 
  SET current_level = current_level + (filling_record.weight_filled + COALESCE(filling_record.shrinkage_amount, 0)),
      last_updated = NOW()
  WHERE id = filling_record.tank_id;
END;
$function$;

-- Update reverse_transfer function
CREATE OR REPLACE FUNCTION public.reverse_transfer(transfer_id uuid, reversed_by text, reversal_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  transfer_record RECORD;
BEGIN
  -- Get the transfer record
  SELECT * INTO transfer_record FROM public.transfers WHERE id = transfer_id AND is_reversed = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or already reversed';
  END IF;
  
  -- Mark transfer as reversed
  UPDATE public.transfers 
  SET is_reversed = TRUE,
      reversed_at = NOW(),
      reversed_by = reversed_by,
      reversal_reason = reversal_reason
  WHERE id = transfer_id;
  
  -- Update cylinder location back to origin
  UPDATE public.cylinders 
  SET current_location = transfer_record.from_location
  WHERE id = transfer_record.cylinder_id;
END;
$function$;

-- Update reverse_tank_movement function
CREATE OR REPLACE FUNCTION public.reverse_tank_movement(movement_id uuid, reversed_by text, reversal_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  movement_record RECORD;
  reverse_quantity NUMERIC;
BEGIN
  -- Get the movement record
  SELECT * INTO movement_record FROM public.tank_movements WHERE id = movement_id AND is_reversed = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tank movement not found or already reversed';
  END IF;
  
  -- Mark movement as reversed
  UPDATE public.tank_movements 
  SET is_reversed = TRUE,
      reversed_at = NOW(),
      reversed_by = reversed_by,
      reversal_reason = reversal_reason
  WHERE id = movement_id;
  
  -- Calculate reverse quantity including shrinkage
  reverse_quantity := movement_record.quantity + COALESCE(movement_record.shrinkage_amount, 0);
  
  -- Reverse the tank level change
  IF movement_record.movement_type = 'entrada' THEN
    -- If it was an entry, subtract the amount back
    UPDATE public.co2_tank 
    SET current_level = current_level - reverse_quantity,
        last_updated = NOW()
    WHERE id = movement_record.tank_id;
  ELSIF movement_record.movement_type = 'salida' THEN
    -- If it was an exit, add the amount back
    UPDATE public.co2_tank 
    SET current_level = current_level + reverse_quantity,
        last_updated = NOW()
    WHERE id = movement_record.tank_id;
  END IF;
END;
$function$;

-- Update update_tank_level function
CREATE OR REPLACE FUNCTION public.update_tank_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;

-- Update update_tank_level_on_filling function
CREATE OR REPLACE FUNCTION public.update_tank_level_on_filling()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$DECLARE
  total_shrinkage NUMERIC;
BEGIN
  -- Calculate shrinkage (0.3% for cylinder fillings)
  total_shrinkage := NEW.weight_filled * (NEW.shrinkage_percentage / 100);
  
  -- Update shrinkage amount in the record
  UPDATE fillings 
  SET shrinkage_amount = total_shrinkage 
  WHERE id = NEW.id;
  
  -- Deduct the filled weight plus shrinkage from the CO2 tank
  UPDATE co2_tank 
  SET current_level = current_level - (NEW.weight_filled + total_shrinkage),
      last_updated = NOW()
  WHERE id = NEW.tank_id;
  
  RETURN NEW;
END;$function$;

-- Update check_tank_level function
CREATE OR REPLACE FUNCTION public.check_tank_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$DECLARE
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
      'El tanque ' || tank_record.tank_name || ' tiene un nivel de ' || ROUND(percentage, 3) || '% (' || tank_record.current_level || ' kg). Se requiere reabastecimiento urgente.',
      CASE 
        WHEN percentage <= 5 THEN 'critical'
        ELSE 'warning'
      END
    );
  END IF;
  
  RETURN NEW;
END;$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
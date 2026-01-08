-- Drop the existing function first
DROP FUNCTION IF EXISTS public.reverse_tank_movement(uuid, text, text);

-- Recreate the function with prefixed parameter names to avoid ambiguity
CREATE OR REPLACE FUNCTION public.reverse_tank_movement(
  p_movement_id uuid, 
  p_reversed_by text, 
  p_reversal_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  movement_record RECORD;
  reverse_quantity NUMERIC;
BEGIN
  -- Get the movement record
  SELECT * INTO movement_record FROM public.tank_movements WHERE id = p_movement_id AND is_reversed = FALSE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tank movement not found or already reversed';
  END IF;
  
  -- Mark movement as reversed
  UPDATE public.tank_movements 
  SET is_reversed = TRUE,
      reversed_at = NOW(),
      reversed_by = p_reversed_by,
      reversal_reason = p_reversal_reason
  WHERE id = p_movement_id;
  
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
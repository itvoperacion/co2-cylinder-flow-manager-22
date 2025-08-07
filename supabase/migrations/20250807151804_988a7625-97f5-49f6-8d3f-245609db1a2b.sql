-- Add reversal tracking columns to all relevant tables

-- Add reversal columns to fillings table
ALTER TABLE public.fillings 
ADD COLUMN is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reversed_by TEXT,
ADD COLUMN reversal_reason TEXT;

-- Add reversal columns to transfers table  
ALTER TABLE public.transfers
ADD COLUMN is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reversed_by TEXT,
ADD COLUMN reversal_reason TEXT;

-- Add reversal columns to tank_movements table
ALTER TABLE public.tank_movements
ADD COLUMN is_reversed BOOLEAN DEFAULT FALSE,
ADD COLUMN reversed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reversed_by TEXT,
ADD COLUMN reversal_reason TEXT;

-- Create function to reverse a filling
CREATE OR REPLACE FUNCTION public.reverse_filling(
  filling_id UUID,
  reversed_by TEXT,
  reversal_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to reverse a transfer
CREATE OR REPLACE FUNCTION public.reverse_transfer(
  transfer_id UUID,
  reversed_by TEXT,
  reversal_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to reverse a tank movement
CREATE OR REPLACE FUNCTION public.reverse_tank_movement(
  movement_id UUID,
  reversed_by TEXT,
  reversal_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;
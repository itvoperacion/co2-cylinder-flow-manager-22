-- Add shrinkage fields to fillings table
ALTER TABLE fillings 
ADD COLUMN IF NOT EXISTS shrinkage_percentage NUMERIC DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS shrinkage_amount NUMERIC DEFAULT 0;

-- Add shrinkage fields to tank_movements table
ALTER TABLE tank_movements 
ADD COLUMN IF NOT EXISTS shrinkage_percentage NUMERIC DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS shrinkage_amount NUMERIC DEFAULT 0;

-- Update the tank level function to include shrinkage for fillings
CREATE OR REPLACE FUNCTION update_tank_level_on_filling()
RETURNS TRIGGER AS $$
DECLARE
  total_shrinkage NUMERIC;
BEGIN
  -- Calculate shrinkage (2% for cylinder fillings)
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
END;
$$ LANGUAGE plpgsql;
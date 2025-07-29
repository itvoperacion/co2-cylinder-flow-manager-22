-- First, let's check if the foreign key constraint exists and remove it
ALTER TABLE fillings DROP CONSTRAINT IF EXISTS fillings_tank_id_fkey;

-- Add proper foreign key constraint to co2_tank
ALTER TABLE fillings 
ADD CONSTRAINT fillings_tank_id_fkey 
FOREIGN KEY (tank_id) REFERENCES co2_tank(id);

-- Add new fields for enhanced functionality
ALTER TABLE fillings 
ADD COLUMN IF NOT EXISTS filling_datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Create a trigger to automatically update tank levels when fillings are recorded
CREATE OR REPLACE FUNCTION update_tank_level_on_filling()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct the filled weight from the CO2 tank
  UPDATE co2_tank 
  SET current_level = current_level - NEW.weight_filled,
      last_updated = NOW()
  WHERE id = NEW.tank_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tank level updates
DROP TRIGGER IF EXISTS trigger_update_tank_level_on_filling ON fillings;
CREATE TRIGGER trigger_update_tank_level_on_filling
  AFTER INSERT ON fillings
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_level_on_filling();
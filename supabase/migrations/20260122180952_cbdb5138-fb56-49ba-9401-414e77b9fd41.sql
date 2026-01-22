-- Create table for inventory adjustments
CREATE TABLE public.inventory_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT NOT NULL,
  cylinder_id UUID REFERENCES public.cylinders(id),
  previous_status TEXT,
  new_status TEXT,
  previous_location TEXT,
  adjustment_type TEXT NOT NULL, -- 'status_change', 'location_change', 'add_to_inventory', 'remove_from_inventory'
  quantity_adjusted INTEGER DEFAULT 1,
  reason TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can manage inventory_adjustments"
ON public.inventory_adjustments
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_adjustments_updated_at
BEFORE UPDATE ON public.inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add approval and comments fields to tables that don't have them

-- Add approval fields to transfers table
ALTER TABLE public.transfers 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approval fields to tank_movements table
ALTER TABLE public.tank_movements 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add approval fields to cylinders table
ALTER TABLE public.cylinders 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Ensure fillings has approved_at field
ALTER TABLE public.fillings 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create approval log table for audit trail
CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'edited', 'deleted'
  performed_by TEXT NOT NULL,
  comments TEXT,
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on approval_logs
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- Policy for approval_logs
CREATE POLICY "Authenticated users can manage approval_logs"
  ON public.approval_logs
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
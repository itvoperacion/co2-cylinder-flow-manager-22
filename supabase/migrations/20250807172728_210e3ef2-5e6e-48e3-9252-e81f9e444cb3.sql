-- Add transfer_number field to transfers table
ALTER TABLE public.transfers 
ADD COLUMN transfer_number TEXT;
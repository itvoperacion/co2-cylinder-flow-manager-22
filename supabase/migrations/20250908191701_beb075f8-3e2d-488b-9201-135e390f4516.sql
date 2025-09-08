-- Add trip_closure column to transfers table
ALTER TABLE public.transfers ADD COLUMN trip_closure boolean DEFAULT false;
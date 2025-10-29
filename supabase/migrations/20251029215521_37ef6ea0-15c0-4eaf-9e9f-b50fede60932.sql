-- Add new location 'devolucion_clientes' and 'cierre_rutas' as valid location options
-- Add new fields to transfers table for enhanced tracking

-- Add new columns to transfers table
ALTER TABLE public.transfers 
ADD COLUMN IF NOT EXISTS unit_number TEXT,
ADD COLUMN IF NOT EXISTS crew_name TEXT,
ADD COLUMN IF NOT EXISTS zone TEXT,
ADD COLUMN IF NOT EXISTS delivery_order_number TEXT,
ADD COLUMN IF NOT EXISTS nota_envio_number TEXT;

-- Update transfer_number column to allow longer values if needed
ALTER TABLE public.transfers 
ALTER COLUMN transfer_number TYPE TEXT;

-- Create comment for documentation
COMMENT ON COLUMN public.transfers.unit_number IS 'Vehicle/Unit number for the transfer';
COMMENT ON COLUMN public.transfers.crew_name IS 'Crew/Team name responsible for the transfer';
COMMENT ON COLUMN public.transfers.zone IS 'Zone where the transfer is being made';
COMMENT ON COLUMN public.transfers.delivery_order_number IS 'Delivery order number for client deliveries';
COMMENT ON COLUMN public.transfers.nota_envio_number IS 'Shipping note number (replaces transfer_number for certain operations)';

-- Add index for faster lookups by nota_envio_number and delivery_order_number
CREATE INDEX IF NOT EXISTS idx_transfers_nota_envio ON public.transfers(nota_envio_number) WHERE nota_envio_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_delivery_order ON public.transfers(delivery_order_number) WHERE delivery_order_number IS NOT NULL;
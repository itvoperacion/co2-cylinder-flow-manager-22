
-- Step 1: Update cylinders back to 'rutas' location
UPDATE public.cylinders
SET current_location = 'rutas', customer_info = NULL, updated_at = now()
WHERE id IN (
  SELECT DISTINCT cylinder_id FROM public.transfers
  WHERE delivery_order_number IN ('55-0045089','55-0044646','55-0045310','55-0044790','55-0044836','55-0044938','55-0044845','55-0045206','55-0044884','55-0044647','50-006220')
  AND to_location = 'clientes'
  AND is_reversed = false
)
AND current_location = 'clientes';

-- Step 2: Delete the transfer records
DELETE FROM public.transfers
WHERE delivery_order_number IN ('55-0045089','55-0044646','55-0045310','55-0044790','55-0044836','55-0044938','55-0044845','55-0045206','55-0044884','55-0044647','50-006220')
AND to_location = 'clientes'
AND is_reversed = false;

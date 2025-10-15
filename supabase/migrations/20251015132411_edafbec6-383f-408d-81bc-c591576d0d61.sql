-- Función para reversar traslados
CREATE OR REPLACE FUNCTION reverse_transfer(
  transfer_id uuid,
  reversed_by text,
  reversal_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transfer record;
  v_cylinder record;
BEGIN
  -- Obtener el traslado
  SELECT * INTO v_transfer
  FROM transfers
  WHERE id = transfer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Traslado no encontrado';
  END IF;

  -- Verificar si ya está reversado
  IF v_transfer.is_reversed THEN
    RAISE EXCEPTION 'Este traslado ya ha sido reversado';
  END IF;

  -- Obtener información del cilindro
  SELECT * INTO v_cylinder
  FROM cylinders
  WHERE id = v_transfer.cylinder_id;

  -- Actualizar el traslado como reversado
  UPDATE transfers
  SET 
    is_reversed = true,
    reversed_at = now(),
    reversed_by = reverse_transfer.reversed_by,
    reversal_reason = reverse_transfer.reversal_reason,
    updated_at = now()
  WHERE id = transfer_id;

  -- Restaurar la ubicación anterior del cilindro
  UPDATE cylinders
  SET 
    current_location = v_transfer.from_location,
    updated_at = now()
  WHERE id = v_transfer.cylinder_id;

  -- Si el traslado fue de estacion_llenado a despacho, restaurar el estado a lleno
  IF v_transfer.from_location = 'estacion_llenado' AND v_transfer.to_location = 'despacho' THEN
    UPDATE cylinders
    SET current_status = 'lleno'
    WHERE id = v_transfer.cylinder_id;
  END IF;

  -- Si el traslado fue de despacho a estacion_llenado, restaurar el estado anterior
  IF v_transfer.from_location = 'despacho' AND v_transfer.to_location = 'estacion_llenado' THEN
    UPDATE cylinders
    SET current_status = 'lleno'
    WHERE id = v_transfer.cylinder_id;
  END IF;

END;
$$;
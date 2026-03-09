-- Step 1: Delete all transfers to 'clientes'
DELETE FROM transfers WHERE to_location = 'clientes';

-- Step 2: Delete all dependent records
DELETE FROM fillings;
DELETE FROM transfers;
DELETE FROM inventory_adjustments;

-- Step 3: Delete all cylinders
DELETE FROM cylinders;
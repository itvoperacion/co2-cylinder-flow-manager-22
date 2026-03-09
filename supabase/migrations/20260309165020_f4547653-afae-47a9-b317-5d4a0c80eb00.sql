-- 9kg: 0305-0100 (lleno/despacho, 28/07/2021, test 28/07/2025)
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT lpad(s::text, 4, '0'), '9kg', 'industrial', '2021-07-28', '2025-07-28', '2030-07-28', 'lleno', 'despacho', false
FROM generate_series(100, 305) s;

-- Fix 0159: manufacturing_date is 28/07/2025 instead of 2021
UPDATE cylinders SET manufacturing_date = '2025-07-28' WHERE serial_number = '0159';
-- Fix 0155: manufacturing_date is 08/07/2021
UPDATE cylinders SET manufacturing_date = '2021-07-08' WHERE serial_number = '0155';
-- Fix 0149: manufacturing_date is 27/07/2021
UPDATE cylinders SET manufacturing_date = '2021-07-27' WHERE serial_number = '0149';
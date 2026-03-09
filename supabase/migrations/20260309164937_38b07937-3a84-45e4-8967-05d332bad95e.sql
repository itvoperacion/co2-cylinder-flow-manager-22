-- 9kg cylinders: 0515-0409 (all vacio/estacion_llenado, 31/08/2021 dates)
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '9kg', 'industrial', '2021-08-31', '2021-08-31', '2026-08-31', 'vacio', 'estacion_llenado', false
FROM generate_series(409, 515) s
WHERE s NOT IN (408,407,406,405,404,403,402,401,400);

-- Fix 0468 different test date
UPDATE cylinders SET last_hydrostatic_test = '2021-07-31', next_test_due = '2026-07-31' WHERE serial_number = '0468';
-- Fix 0419 different test date  
UPDATE cylinders SET last_hydrostatic_test = '2021-01-31', next_test_due = '2026-01-31' WHERE serial_number = '0419';
-- Fix 0415 different test date
UPDATE cylinders SET last_hydrostatic_test = '2020-12-31', next_test_due = '2025-12-31' WHERE serial_number = '0415';
-- Fix 0412 manufacturing date
UPDATE cylinders SET manufacturing_date = '2021-09-01' WHERE serial_number = '0412';
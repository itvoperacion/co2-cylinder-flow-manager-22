-- 9kg cylinders: 0408-0398 (lleno/despacho, 31/08/2021)
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT lpad(s::text, 4, '0'), '9kg', 'industrial', '2021-08-31', '2021-08-31', '2026-08-31', 'lleno', 'despacho', false
FROM generate_series(398, 408) s;

-- 0399 and 0398 have different dates (31/07/2021)
UPDATE cylinders SET manufacturing_date = '2021-07-31', last_hydrostatic_test = '2021-07-31', next_test_due = '2026-07-31' WHERE serial_number IN ('0399','0398');

-- 9kg: 0397-0100 (lleno/despacho)
-- 0397-0396: 31/08/2021
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned) VALUES
('0397','9kg','industrial','2021-08-31','2021-08-31','2026-08-31','lleno','despacho',false),
('0396','9kg','industrial','2021-08-31','2021-08-31','2026-08-31','lleno','despacho',false);

-- 0395-0306: 31/07/2025 dates, lleno/despacho
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT lpad(s::text, 4, '0'), '9kg', 'industrial', '2025-07-31', '2025-07-31', '2030-07-31', 'lleno', 'despacho', false
FROM generate_series(306, 395) s;

-- Fix 0356 manufacturing date
UPDATE cylinders SET manufacturing_date = '2025-04-30' WHERE serial_number = '0356';

-- Fix 0159 manufacturing date
-- (will be inserted later with the 28/07 group)
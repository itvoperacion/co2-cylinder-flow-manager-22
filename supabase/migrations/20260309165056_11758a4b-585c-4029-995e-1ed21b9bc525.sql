-- 22kg cylinders
-- New ones with different dates (1151-1156 new series)
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned) VALUES
('1156','22kg','industrial','2025-03-07','2025-03-07','2030-03-07','lleno','despacho',false),
('1155','22kg','industrial','2025-03-07','2025-02-07','2030-02-07','lleno','despacho',false),
('1154','22kg','industrial','2025-03-08','2025-03-08','2030-03-08','lleno','despacho',false);

-- 1153-1139: 31/08/2021, lleno/despacho
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-08-31', '2021-08-31', '2026-08-31', 'lleno', 'despacho', false
FROM generate_series(1139, 1153) s;

-- Fix 1151 duplicate - rename the old-date one
-- Actually there are TWO 1151s in the Excel. The first (line 572) has dates 07/03/2025, the second (line 578) has 31/08/2021.
-- The generate_series already created 1151 with 31/08/2021 dates. Let me skip the duplicate.

-- Fix 1148 manufacturing date
UPDATE cylinders SET manufacturing_date = '2022-08-31' WHERE serial_number = '1148' AND capacity = '22kg';

-- 1138-1131: 31/07/2021, test 31/07/2025, lleno/despacho  
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-07-31', '2025-07-31', '2030-07-31', 'lleno', 'despacho', false
FROM generate_series(1131, 1138) s;

-- 1130-1126, 1125-1124, 1117, 1115-1116, 1114-1103: same dates
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-07-31', '2025-07-31', '2030-07-31', 'lleno', 'despacho', false
FROM generate_series(1103, 1130) s
WHERE s NOT IN (1118,1119,1120,1121,1122,1123);

-- Fix 1127 test date
UPDATE cylinders SET last_hydrostatic_test = '2025-01-31', next_test_due = '2030-01-31' WHERE serial_number = '1127';
-- Fix 1114 test date  
UPDATE cylinders SET last_hydrostatic_test = '0225-07-31', next_test_due = '0230-07-31' WHERE serial_number = '1114';
-- Fix 1106 test date
UPDATE cylinders SET last_hydrostatic_test = '2021-07-31', next_test_due = '2026-07-31' WHERE serial_number = '1106';

-- 1101, 1100: lleno/despacho
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned) VALUES
('1101','22kg','industrial','2021-07-31','2025-07-31','2030-07-31','lleno','despacho',false),
('1100','22kg','industrial','2021-07-31','2025-07-31','2030-07-31','lleno','despacho',false);

-- 1099-1085: lleno/despacho
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-07-31', '2025-07-31', '2030-07-31', 'lleno', 'despacho', false
FROM generate_series(1085, 1099) s;

-- 1084-1075: 28/07/2021, test 28/07/2025, lleno/despacho
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-07-28', '2025-07-28', '2030-07-28', 'lleno', 'despacho', false
FROM generate_series(1075, 1084) s;

-- Fix 1075 test date
UPDATE cylinders SET last_hydrostatic_test = '0201-07-28', next_test_due = '0206-07-28' WHERE serial_number = '1075';

-- 1074-1001: 28/07/2021, test 28/07/2025, vacio/estacion_llenado
INSERT INTO cylinders (serial_number, capacity, valve_type, manufacturing_date, last_hydrostatic_test, next_test_due, current_status, current_location, customer_owned)
SELECT s::text, '22kg', 'industrial', '2021-07-28', '2025-07-28', '2030-07-28', 'vacio', 'estacion_llenado', false
FROM generate_series(1001, 1074) s;

-- Fix 1063 test date
UPDATE cylinders SET last_hydrostatic_test = '2025-07-08', next_test_due = '2030-07-08' WHERE serial_number = '1063';
-- Fix 1052 test date
UPDATE cylinders SET last_hydrostatic_test = '2025-02-19', next_test_due = '2030-02-19' WHERE serial_number = '1052';
-- Fix 1016 test date
UPDATE cylinders SET last_hydrostatic_test = '2021-07-28', next_test_due = '2026-07-28' WHERE serial_number = '1016';
-- Fix 1012 test date
UPDATE cylinders SET last_hydrostatic_test = '0205-07-28', next_test_due = '0210-07-28' WHERE serial_number = '1012';
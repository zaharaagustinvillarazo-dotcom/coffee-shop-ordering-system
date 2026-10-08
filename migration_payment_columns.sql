-- ============================================================
-- MIGRATION: Save payment info (amount received + change)
-- ============================================================
-- Run this in phpMyAdmin > coffee_shop_db > SQL tab.
-- It is SAFE to run more than once: each column is only added
-- if it does not already exist. No existing data is touched.
--
-- Old orders (made before this change) will simply have NULL in
-- these two columns. The Sales page shows "—" for them.
-- ============================================================

USE coffee_shop_db;

-- amount_received ------------------------------------------------
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = 'coffee_shop_db'
                   AND TABLE_NAME = 'orders'
                   AND COLUMN_NAME = 'amount_received');
SET @sql := IF(@has_col = 0,
  'ALTER TABLE orders ADD COLUMN amount_received DECIMAL(10,2) NULL AFTER total_amount',
  'SELECT ''amount_received already exists - skipped'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- change_amount --------------------------------------------------
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = 'coffee_shop_db'
                   AND TABLE_NAME = 'orders'
                   AND COLUMN_NAME = 'change_amount');
SET @sql := IF(@has_col = 0,
  'ALTER TABLE orders ADD COLUMN change_amount DECIMAL(10,2) NULL AFTER amount_received',
  'SELECT ''change_amount already exists - skipped'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check the result (you should see both new columns listed)
SHOW COLUMNS FROM orders;

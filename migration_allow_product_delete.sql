-- ============================================================
-- MIGRATION: Allow deleting products that already have orders
-- ============================================================
-- Run this in phpMyAdmin's SQL tab on your EXISTING coffee_shop_db
-- database. Do NOT run the full coffee_shop_db.sql again - that
-- would try to recreate tables you already have.
--
-- What this does:
--   1. Adds a "product_name" column to order_items, and fills it
--      in using the current product names (a one-time "snapshot").
--   2. Makes order_items.product_id allowed to be NULL.
--   3. Replaces the old foreign key (which BLOCKED deleting a
--      product that had past orders) with one that instead sets
--      product_id to NULL when a product is deleted - the order
--      record and its product_name stay intact either way.
--
-- Your existing products, orders, and order_items data is NOT
-- deleted by this script.
-- ============================================================

USE coffee_shop_db;

-- Step 1: Add the new column (temporarily allowed to be empty)
ALTER TABLE order_items ADD COLUMN product_name VARCHAR(100) NOT NULL DEFAULT '';

-- Step 2: Fill it in for every existing order item, using today's
-- product names as the best available snapshot for past orders.
UPDATE order_items oi
JOIN products p ON oi.product_id = p.id
SET oi.product_name = p.product_name
WHERE oi.product_name = '';

-- Step 3: Allow product_id to be NULL going forward
ALTER TABLE order_items MODIFY product_id INT NULL;

-- Step 4: Find your current foreign key name before dropping it.
-- Run this SELECT first and note the CONSTRAINT_NAME it returns:
SELECT CONSTRAINT_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'coffee_shop_db'
  AND TABLE_NAME = 'order_items'
  AND COLUMN_NAME = 'product_id'
  AND REFERENCED_TABLE_NAME = 'products';

-- Step 5: Drop that old foreign key. If your database was created
-- from the original coffee_shop_db.sql without any changes, the
-- name is almost always "order_items_ibfk_2" - try this first:
ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2;

-- If the command above gives an error saying the foreign key does
-- not exist, use the CONSTRAINT_NAME you found in Step 4 instead, e.g.:
-- ALTER TABLE order_items DROP FOREIGN KEY the_name_you_found;

-- Step 6: Add the new foreign key that allows product deletion
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_product
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Done! You can now delete any product, even ones with past orders.

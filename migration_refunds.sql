-- ============================================================
-- MIGRATION: Refund system (admin-approved)
-- ============================================================
-- Run this in phpMyAdmin > coffee_shop_db > SQL tab (paste everything, click Go).
--
-- SAFE TO RUN MORE THAN ONCE: CREATE TABLE IF NOT EXISTS only creates
-- a table that is missing. Nothing is dropped, deleted, or updated.
-- Your existing users, products, orders and order_items are untouched.
-- No columns are added to any existing table.
-- ============================================================

USE coffee_shop_db;

-- ------------------------------------------------------------
-- 1) refunds: the refund request + approval record (audit trail)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,                         -- the ORIGINAL order (never deleted or changed)
    requested_by INT NOT NULL,                     -- cashier who asked for the refund
    approved_by INT NULL,                          -- admin who approved/rejected it (NULL until then)
    refund_amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,  -- wrong admin passwords tried on this request
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    KEY idx_refund_order (order_id),
    KEY idx_refund_status (status),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_refund_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_refund_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- 2) refund_items: which items / quantities each refund covers
--    (this is what makes PARTIAL refunds possible)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refund_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_id INT NOT NULL,
    order_item_id INT NOT NULL,       -- which line of the original order is being refunded
    quantity INT NOT NULL,            -- how many units of that line are being returned
    amount DECIMAL(10,2) NOT NULL,    -- price x quantity for this refund line
    KEY idx_refund_items_refund (refund_id),
    KEY idx_refund_items_order_item (order_item_id),
    CONSTRAINT fk_refund_items_refund FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE CASCADE,
    CONSTRAINT fk_refund_items_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
);

-- Check the result - you should see both tables listed
SHOW TABLES LIKE 'refund%';

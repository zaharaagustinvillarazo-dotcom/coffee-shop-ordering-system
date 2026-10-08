-- ============================================================
-- Coffee Shop Ordering System - Database Setup
-- ============================================================
-- HOW TO USE THIS FILE:
-- 1. Open phpMyAdmin (start Apache + MySQL in XAMPP first)
-- 2. Click "SQL" tab
-- 3. Paste this whole file and click "Go"
-- (This will create the database, tables, and a starter admin
--  account + a few sample products so you can test right away.)
-- ============================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS coffee_shop_db;
USE coffee_shop_db;

-- ------------------------------------------------------------
-- Table: users
-- Stores staff accounts (admin and cashier)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,      -- stored as a hashed password, never plain text
    role ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Table: products
-- Stores every item the coffee shop sells
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category ENUM('Coffee', 'Non-Coffee', 'Tea', 'Pastries', 'Snacks') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Table: orders
-- One row = one completed transaction
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,                -- which staff member created the order
    total_amount DECIMAL(10,2) NOT NULL,
    amount_received DECIMAL(10,2) NULL,  -- cash given by the customer (NULL for old orders)
    change_amount DECIMAL(10,2) NULL,    -- change returned (NULL for old orders)
    order_status ENUM('completed', 'cancelled') NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- Table: order_items
-- Line items that belong to an order (one order can have many items)
--
-- NOTE: product_name is stored here directly (a "snapshot" of the
-- name at the time of purchase). This means old orders/receipts
-- keep showing the correct product name even if that product is
-- later renamed or deleted from the products table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NULL,                 -- NULL means the original product was later deleted
    product_name VARCHAR(100) NOT NULL,  -- snapshot of the product's name at time of order
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,        -- price of the product at the time of order
    subtotal DECIMAL(10,2) NOT NULL,     -- price * quantity
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Table: refunds  (admin-approved refunds; the original order is never deleted)
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
-- Table: refund_items  (which items/quantities were refunded - supports partial refunds)
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

-- ------------------------------------------------------------
-- Starter accounts
-- ------------------------------------------------------------
-- Password for BOTH accounts below is:  password123
-- (It is stored as "salt:hash" using Node's built-in crypto.scrypt.
--  We don't use an extra library like bcrypt, so there is one less
--  thing to install. Never store plain text passwords.)
INSERT INTO users (username, password, role) VALUES
('admin', '35072a4492aa43e54b7f0253ab91243e:97614f1022305e3757b95e7c52ab2f5fa65b906cfa8a069c5c8019285443f0e3001243ec19040197e58a76e29871ced863341ea1e47b45e2d7c5614bfc393ac3', 'admin'),
('cashier', '35072a4492aa43e54b7f0253ab91243e:97614f1022305e3757b95e7c52ab2f5fa65b906cfa8a069c5c8019285443f0e3001243ec19040197e58a76e29871ced863341ea1e47b45e2d7c5614bfc393ac3', 'cashier');

-- ------------------------------------------------------------
-- Sample products so you can test the POS screen immediately
-- ------------------------------------------------------------
INSERT INTO products (product_name, category, price, status) VALUES
('Coffee Latte', 'Coffee', 120.00, 'available'),
('Cappuccino', 'Coffee', 120.00, 'available'),
('Americano', 'Coffee', 100.00, 'available'),
('Caramel Macchiato', 'Coffee', 140.00, 'available'),
('Hot Chocolate', 'Non-Coffee', 110.00, 'available'),
('Matcha Latte', 'Non-Coffee', 130.00, 'available'),
('Iced Tea', 'Tea', 80.00, 'available'),
('Green Tea', 'Tea', 90.00, 'available'),
('Chocolate Cake', 'Pastries', 100.00, 'available'),
('Blueberry Muffin', 'Pastries', 85.00, 'available'),
('Croissant', 'Pastries', 75.00, 'available'),
('Potato Chips', 'Snacks', 45.00, 'available'),
('Nachos', 'Snacks', 95.00, 'available');

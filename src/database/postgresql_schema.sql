-- ==============================================================================
-- PHARMACY MANAGEMENT SYSTEM - PRODUCTION POSTGRESQL DATABASE SCHEMA
-- Version: 2.0.0 (Production-Ready)
-- Dialect: PostgreSQL 14+
-- Features: Full UUID primary keys, Foreign Key Cascades, Index Optimization for POS,
--           Idempotency Support for Offline Sync, Multi-Branch, Full Audit Logging.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. BRANCHES, WAREHOUSES & DEVICES
-- ------------------------------------------------------------------------------
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    is_main BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    code VARCHAR(30) NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, code)
);

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_uid VARCHAR(100) UNIQUE NOT NULL, -- Hardware / Mac / UUID
    device_name VARCHAR(150) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'windows_desktop', 'android_pos', 'tablet'
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. USERS, ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'manager', 'cashier'
    display_name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'pos.sell', 'products.delete'
    name_ar VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(60) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    default_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS, CATEGORIES, COMPANIES & BATCHES
-- ------------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    country VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(50) NOT NULL, -- 'علبة', 'شريط', 'قرص', 'أمبول', 'زجاجة'
    conversion_factor NUMERIC(10, 2) DEFAULT 1.00
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    barcode VARCHAR(100) NOT NULL,
    internal_code VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    company_id UUID REFERENCES companies(id) ON DELETE RESTRICT,
    active_ingredient TEXT,
    unit VARCHAR(50) DEFAULT 'علبة',
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    minimum_stock INT NOT NULL DEFAULT 5,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    requires_prescription BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(barcode)
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number VARCHAR(80) NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, batch_number, branch_id)
);

-- ------------------------------------------------------------------------------
-- 4. INVENTORY & INVENTORY MOVEMENTS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 2) NOT NULL, -- Positive for in, negative for out
    movement_type VARCHAR(50) NOT NULL, -- 'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'DAMAGE', 'EXPIRED_DISCARD', 'TRANSFER', 'ADJUSTMENT'
    reference_id VARCHAR(100), -- Invoice number or document ref
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES branches(id),
    to_branch_id UUID NOT NULL REFERENCES branches(id),
    status VARCHAR(30) DEFAULT 'COMPLETED',
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. SUPPLIERS & PURCHASES
-- ------------------------------------------------------------------------------
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    current_balance NUMERIC(14, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(60) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subtotal NUMERIC(14, 2) NOT NULL,
    discount NUMERIC(14, 2) DEFAULT 0.00,
    tax NUMERIC(14, 2) DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL,
    paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    remaining NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) DEFAULT 'cash',
    notes TEXT,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number VARCHAR(80) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    total NUMERIC(14, 2) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. CUSTOMERS, SHIFTS & SALES (POS)
-- ------------------------------------------------------------------------------
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    current_balance NUMERIC(14, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed'
    cash_sales NUMERIC(14, 2) DEFAULT 0.00,
    card_sales NUMERIC(14, 2) DEFAULT 0.00,
    expenses NUMERIC(14, 2) DEFAULT 0.00,
    returns NUMERIC(14, 2) DEFAULT 0.00,
    expected_cash NUMERIC(14, 2) DEFAULT 0.00,
    actual_cash NUMERIC(14, 2),
    difference NUMERIC(14, 2),
    notes TEXT
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(60) UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    discount NUMERIC(14, 2) DEFAULT 0.00,
    tax NUMERIC(14, 2) DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL,
    paid NUMERIC(14, 2) NOT NULL,
    remaining NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) DEFAULT 'cash',
    status VARCHAR(30) DEFAULT 'completed',
    notes TEXT,
    sync_status VARCHAR(30) DEFAULT 'synced',
    sync_version INT DEFAULT 1,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    batch_number VARCHAR(80) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. RETURNS & EXPENSES
-- ------------------------------------------------------------------------------
CREATE TABLE sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(60) UNIQUE NOT NULL,
    original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id),
    user_id UUID REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    total_amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID REFERENCES batches(id),
    quantity NUMERIC(12, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total NUMERIC(14, 2) NOT NULL
);

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    category_name_ar VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    branch_id UUID REFERENCES branches(id),
    shift_id UUID REFERENCES shifts(id),
    payment_method VARCHAR(30) DEFAULT 'cash',
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 8. SETTINGS, SYNC QUEUE & AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id VARCHAR(100) NOT NULL,
    entity_name VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    payload JSONB NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    retry_count INT DEFAULT 0,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    device_1 VARCHAR(100) NOT NULL,
    device_2 VARCHAR(100) NOT NULL,
    conflict_details TEXT,
    old_value JSONB,
    new_value JSONB,
    status VARCHAR(30) DEFAULT 'unresolved', -- 'unresolved', 'resolved'
    resolution VARCHAR(50), -- 'device1_wins', 'device2_wins', 'manual'
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(80) NOT NULL,
    action_ar VARCHAR(150) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES (OPTIMIZED FOR ULTRA-FAST POS & EXPIRY QUERIES)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name_ar ON products(name_ar);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_internal_code ON products(internal_code);
CREATE INDEX idx_products_category ON products(category_id);

CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_expiry_date ON batches(expiry_date);
CREATE INDEX idx_batches_number ON batches(batch_number);

CREATE INDEX idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_shift ON sales(shift_id);
CREATE INDEX idx_sales_idempotency ON sales(idempotency_key);

CREATE INDEX idx_purchases_invoice_number ON purchases(invoice_number);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(date);

CREATE INDEX idx_inventory_movements_prod ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(date);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);

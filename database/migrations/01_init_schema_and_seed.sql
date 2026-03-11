-- ==============================================================================
-- 01_init_schema_and_seed.sql 
-- Initial schema setup for FlashgardPro CRM and RBAC configuration
-- ==============================================================================

-- 1. Create Enums for Types
CREATE TYPE org_type AS ENUM ('internal', 'distributor', 'dealer', 'retailer', 'supplier');
CREATE TYPE address_type AS ENUM ('billing', 'shipping', 'office', 'warehouse', 'other');

-- ==============================================================================
-- STRUCTURE: ORGANIZATIONS & ACCOUNTS
-- ==============================================================================

-- 2. Organizations Table (Master table for accounts/Distributors/Dealers/Internal)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Allows hierarchical grouping (e.g. Dealer under Distributor)
    name VARCHAR(255) NOT NULL,
    type org_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Addresses Table (Multiple Addresses per Organization)
CREATE TABLE IF NOT EXISTS addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type address_type DEFAULT 'office',
    street_line_1 VARCHAR(255) NOT NULL,
    street_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contacts Table (Multiple Contacts per Organization)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- STRUCTURE: ROLE-BASED ACCESS CONTROL (RBAC)
-- ==============================================================================

-- 5. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL indicates a global/system role common to all
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- TRUE: Created by internal admin, cannot be modified by external users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name) -- Prevent duplicate role names within the same organization
);

-- 6. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(100) UNIQUE NOT NULL, -- Format 'domain:action', e.g., 'users:create', 'orders:view'
    description TEXT
);

-- 7. Role-Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ==============================================================================
-- STRUCTURE: USERS
-- ==============================================================================

-- 8. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- User belongs to a specific org (Internal/Dealer/Distributor)
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL, -- User's explicit role inside their Org
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Optional link to physical contact tracking
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE, -- Complete unconditional system access bypasses role checks
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Laabham Pro — Full Schema (Multi-Tenant with Companies)
-- Simplified: company_id + is_primary live directly on users.
-- ============================================================

-- Drop all existing tables in correct order
DROP TABLE IF EXISTS public.bill_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.seller_info CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.company_users CASCADE;  -- legacy, removed
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COMPANIES TABLE
-- Each company is an isolated billing tenant.
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USERS TABLE
-- company_id  → which company this user belongs to (NULL for superadmin)
-- is_primary  → is this user the owner/primary contact of their company?
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE,
  password_hash TEXT,
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- ============================================================
-- SESSIONS TABLE
-- Tracks all active logins. Admin can terminate any session.
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '8 hours'),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT now(),
  terminated_at TIMESTAMPTZ,
  terminated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address    TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================================
-- SELLER INFO — One per company (billing header/footer)
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_info (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL,
  email               TEXT NOT NULL,
  contact_number      TEXT NOT NULL,
  address             TEXT,
  gst_number          TEXT,
  bank_account_number TEXT,
  account_holder_name TEXT,
  account_no          TEXT,
  branch              TEXT,
  ifsc_code           TEXT,
  state_code          TEXT,
  trade_name          TEXT,
  pan                 TEXT,
  upi_id              TEXT,
  logo_url            TEXT,
  default_cgst_pct     NUMERIC(5,2) DEFAULT 9.00,
  default_sgst_pct     NUMERIC(5,2) DEFAULT 9.00,
  default_cess_pct     NUMERIC(5,2) DEFAULT 0.00,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS — Scoped to company
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        NUMERIC(10, 2) NOT NULL,
  unit         TEXT DEFAULT 'pcs',
  hsn_sac      TEXT,
  hsn_sac_type TEXT,
  cgst_rate    NUMERIC(5, 2) DEFAULT 9.00,
  sgst_rate    NUMERIC(5, 2) DEFAULT 9.00,
  cess_rate    NUMERIC(5, 2) DEFAULT 0.00,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BILLS / QUOTATIONS — Scoped to company
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  invoice_number   TEXT,
  type             TEXT NOT NULL DEFAULT 'invoice' CHECK (type IN ('invoice', 'quotation')),
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT,
  customer_address    TEXT,
  customer_gstin      TEXT,
  total_amount        NUMERIC(10, 2) NOT NULL,
  discount         NUMERIC(10, 2) DEFAULT 0.00,
  gst_amount       NUMERIC(10, 2) DEFAULT 0.00,
  cgst_percentage  NUMERIC(5, 2) DEFAULT 0.00,
  sgst_percentage  NUMERIC(5, 2) DEFAULT 0.00,
  cess_percentage  NUMERIC(5, 2) DEFAULT 0.00,
  is_gst_bill      BOOLEAN DEFAULT false,
  comments         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  date_of_bill     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  entity_name  VARCHAR(50) NOT NULL,
  entity_id    UUID NOT NULL,
  action       VARCHAR(20) NOT NULL,
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  old_data     JSONB,
  new_data     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BILL ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  quantity        NUMERIC(10, 2) NOT NULL,
  price           NUMERIC(10, 2) NOT NULL,
  unit            TEXT DEFAULT 'pcs',
  hsn_sac         TEXT,
  hsn_sac_type    TEXT,
  cgst_rate       NUMERIC(5, 2) DEFAULT 0.00,
  sgst_rate       NUMERIC(5, 2) DEFAULT 0.00,
  cess_rate       NUMERIC(5, 2) DEFAULT 0.00,
  additional_desc TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- Timestamp trigger for seller_info
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_seller_info_timestamp ON seller_info;
CREATE TRIGGER trigger_update_seller_info_timestamp
BEFORE UPDATE ON seller_info
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- BOOTSTRAP — Superadmin (platform admin only, no company)
-- ============================================================
INSERT INTO users (email, username, password_hash, is_superadmin)
VALUES (
  'mailtosiddeshwar1@gmail.com',
  'siddeshwar',
  crypt('admin', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO UPDATE SET is_superadmin = true;
-- Superadmin has no company_id — they manage the platform only.

-- Migration: Add round_off_amount to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS round_off_amount NUMERIC(10, 2) DEFAULT 0.00;

-- Also add the fields that were added after initial schema creation
ALTER TABLE bills ADD COLUMN IF NOT EXISTS subtotal_amount  NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS taxable_amount   NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cgst_amount      NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sgst_amount      NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cess_amount      NUMERIC(10, 2) DEFAULT 0.00;

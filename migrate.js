import { neon } from '@neondatabase/serverless';

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Starting DB migration for dynamic invoice fields...");

  const queries = [
    // seller_info
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS state_code TEXT;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS trade_name TEXT;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS pan TEXT;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS upi_id TEXT;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS logo_url TEXT;`,

    // products
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_sac TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_sac_type TEXT;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.00;`,

    // bills
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_gstin TEXT;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS customer_state_code TEXT;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS place_of_supply TEXT;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN DEFAULT false;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(10, 2) DEFAULT 0.00;`,
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS cess_amount NUMERIC(10, 2) DEFAULT 0.00;`,

    // bill_items
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS hsn_sac TEXT;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS hsn_sac_type TEXT;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.00;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS cess_rate NUMERIC(5, 2) DEFAULT 0.00;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5, 2) DEFAULT 0.00;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS additional_desc TEXT;`,

    // seller_info defaults
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS default_cgst_pct NUMERIC(5,2) DEFAULT 9.00;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS default_sgst_pct NUMERIC(5,2) DEFAULT 9.00;`,
    `ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS default_cess_pct NUMERIC(5,2) DEFAULT 0.00;`,

    // products explicit rates
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 9.00;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 9.00;`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS cess_rate NUMERIC(5,2) DEFAULT 0.00;`,

    // bill_items explicit rates
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5,2) DEFAULT 0.00;`,
    `ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5,2) DEFAULT 0.00;`,

    // audit trail & user tracking
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      entity_name VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      action VARCHAR(20) NOT NULL,
      actor_id UUID REFERENCES users(id),
      old_data JSONB,
      new_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    // audit_logs performance indexes
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON audit_logs(entity_name, entity_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);`
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q}`);
      await sql.query(q);
    } catch (e) {
      console.error(`Failed: ${q}`, e);
    }
  }

  console.log("Migration finished.");
}

migrate();

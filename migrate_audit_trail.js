import { neon } from '@neondatabase/serverless';

async function migrateAuditTrail() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Starting audit trail migration...");

  const queries = [
    // Track who last updated each bill
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;`,

    // Audit log table — stores full history of every change
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
      entity_name VARCHAR(50) NOT NULL,
      entity_id   UUID NOT NULL,
      action      VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
      actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
      old_data    JSONB,
      new_data    JSONB,
      created_at  TIMESTAMPTZ DEFAULT now()
    );`,

    // Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity  ON audit_logs(entity_name, entity_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs(actor_id);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);`
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q.split('\n')[0].trim()}...`);
      await sql.query(q);
      console.log("  ✓ Done");
    } catch (e) {
      console.error(`  ✗ Failed:`, e.message);
    }
  }

  console.log("\nAudit trail migration finished.");
}

migrateAuditTrail();

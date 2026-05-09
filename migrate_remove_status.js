import { neon } from '@neondatabase/serverless';

async function migrateRemoveStatus() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Starting removal of status-related columns...");

  const queries = [
    // Drop status-related columns from bills
    `ALTER TABLE bills DROP COLUMN IF EXISTS status;`,
    `ALTER TABLE bills DROP COLUMN IF EXISTS paid_amount;`,
    `ALTER TABLE bills DROP COLUMN IF EXISTS due_date;`
  ];

  for (const q of queries) {
    try {
      console.log(`Executing: ${q}`);
      await sql.query(q);
      console.log("  ✓ Done");
    } catch (e) {
      console.error(`  ✗ Failed:`, e.message);
    }
  }

  console.log("\nStatus removal finished.");
}

migrateRemoveStatus();

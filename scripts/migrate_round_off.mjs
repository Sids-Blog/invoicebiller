import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_YPmR6NXvBM2W@ep-mute-term-ab9pg5fb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DATABASE_URL);

async function migrate() {
  await sql`ALTER TABLE bills ADD COLUMN IF NOT EXISTS round_off_amount NUMERIC(10,2) DEFAULT 0.00`;
  console.log('Migration complete: round_off_amount column added to bills table');
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envFile.match(/DATABASE_URL="([^"]+)"/)?.[1] || envFile.match(/DATABASE_URL=([^\n]+)/)?.[1];
const pool = new Pool({ connectionString: dbUrl });
async function alter() {
  await pool.query("ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;");
  await pool.query("ALTER TABLE seller_info ADD COLUMN IF NOT EXISTS payment_terms TEXT;");
  console.log("Altered seller_info");
  process.exit(0);
}
alter();

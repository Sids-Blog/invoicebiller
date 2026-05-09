import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envFile.match(/DATABASE_URL="([^"]+)"/)?.[1] || envFile.match(/DATABASE_URL=([^\n]+)/)?.[1];
const pool = new Pool({ connectionString: dbUrl });
async function check() {
  const comp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies'");
  const si = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'seller_info'");
  console.log("companies:", comp.rows.map(r=>r.column_name));
  console.log("seller_info:", si.rows.map(r=>r.column_name));
  process.exit(0);
}
check();

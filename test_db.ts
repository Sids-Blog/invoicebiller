import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envFile.match(/DATABASE_URL="([^"]+)"/)?.[1] || envFile.match(/DATABASE_URL=([^\n]+)/)?.[1];
const pool = new Pool({ connectionString: dbUrl });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'").then(res => { console.log(res.rows); process.exit(0); });

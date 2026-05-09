import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

async function run() {
  const sqlContent = fs.readFileSync('db/invoice_numbering.sql', 'utf8');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  
  try {
    console.log('Executing migration...');
    await pool.query(sqlContent);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();

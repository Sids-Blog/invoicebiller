const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
async function run() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    console.log("SQL function type:", typeof sql);
    console.log("SQL has query?", typeof sql.query);
  } catch (e) {
    console.error(e);
  }
}
run();

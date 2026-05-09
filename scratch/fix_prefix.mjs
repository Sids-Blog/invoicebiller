import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const sql = neon(env.DATABASE_URL);

const run = async () => {
  try {
    console.log('Setting default prefixes...');
    await sql`UPDATE companies SET prefix = UPPER(LEFT(name, 3)) WHERE prefix IS NULL;`;
    console.log('Successfully set default prefixes for all companies');
  } catch (err) {
    console.error('Update failed:', err);
  }
};

run();

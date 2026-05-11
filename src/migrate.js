const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.log('[schema] SUPABASE_DB_URL not set. Skipping auto migration. Run supabase/schema.sql manually or add SUPABASE_DB_URL.');
    return { ok: false, skipped: true };
  }
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  await client.connect();
  try {
    await client.query(sql);
    console.log('[schema] Migration complete.');
    return { ok: true };
  } finally {
    await client.end();
  }
}
module.exports = { runMigrations };

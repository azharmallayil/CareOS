import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/private/tmp/pg-client/package.json');
const { Client } = require('pg');

// Read .env file
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('==> Connected to Supabase PostgreSQL at vbckrirksziluvwqpamx');

  // Create schema_migrations tracking table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
    );
  `);

  // Fetch already applied migrations
  const { rows } = await client.query('SELECT version FROM public.schema_migrations;');
  const applied = new Set(rows.map(r => r.version));

  // Find all migrations in supabase/migrations
  const migrationsDir = path.resolve('supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`==> Found ${files.length} migration files.`);

  let appliedCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  [SKIP] ${file} (already applied)`);
      continue;
    }

    console.log(`  [APPLY] ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    await client.query('BEGIN;');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1);', [file]);
      await client.query('COMMIT;');
      console.log(`  ✓ Successfully applied ${file}`);
      appliedCount++;
    } catch (err) {
      await client.query('ROLLBACK;');
      console.error(`\nERROR in migration ${file}:`, err.message);
      throw err;
    }
  }

  console.log(`\n==> Done! Applied ${appliedCount} migration(s).`);

  // Run Verification Queries
  console.log('\n==> Running Database Verification Queries...');

  // 1. Table & RLS Count
  const tableCheck = await client.query(`
    SELECT count(*)::int as total_tables,
           count(*) FILTER (WHERE rowsecurity = true)::int as rls_enabled_tables
    FROM pg_tables WHERE schemaname = 'public';
  `);
  const { total_tables, rls_enabled_tables } = tableCheck.rows[0];
  console.log(`  Total public tables: ${total_tables}`);
  console.log(`  Tables with RLS enabled: ${rls_enabled_tables}`);

  // 2. Anon Privileges Check
  const anonCheck = await client.query(`
    SELECT count(*)::int as anon_grants
    FROM information_schema.role_table_grants
    WHERE grantee = 'anon' AND table_schema = 'public';
  `);
  console.log(`  Anon role table grants: ${anonCheck.rows[0].anon_grants} (expected: 0)`);

  await client.end();
}

run().catch(err => {
  console.error('\nMigration process failed:', err);
  process.exit(1);
});

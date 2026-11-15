import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/private/tmp/pg-client/package.json');
const { Client } = require('pg');

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('==> Connected to Supabase PostgreSQL for seeding...');

  const seedSql = fs.readFileSync('supabase/seed/seed.sql', 'utf-8');

  console.log('==> Executing seed.sql...');
  await client.query(seedSql);
  console.log('✓ seed.sql executed successfully!');

  // Verify created users
  const { rows: profiles } = await client.query('SELECT id, full_name, role FROM public.profiles;');
  console.log(`\n==> Verified ${profiles.length} profiles created in public.profiles:`);
  profiles.forEach(p => console.log(`  - ${p.full_name} (${p.role || 'no-role'})`));

  // Verify tenants
  const { rows: tenants } = await client.query('SELECT id, name, slug FROM public.tenants;');
  console.log(`\n==> Verified ${tenants.length} tenants created:`);
  tenants.forEach(t => console.log(`  - ${t.name} (slug: ${t.slug})`));

  await client.end();
}

run().catch(err => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});

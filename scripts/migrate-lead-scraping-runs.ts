#!/usr/bin/env tsx
/**
 * Manual migration script for lead_scraping_runs table
 * Run this if automatic migrations fail during server startup
 * 
 * Usage:
 *   npm run tsx scripts/migrate-lead-scraping-runs.ts
 *   OR
 *   tsx scripts/migrate-lead-scraping-runs.ts
 */

import { getDb } from '../src/lib/db.js';

console.log('🔧 Running manual database migration for lead_scraping_runs...\n');

const db = getDb();

const migrations = [
  {
    name: 'error_message',
    sql: 'ALTER TABLE lead_scraping_runs ADD COLUMN error_message TEXT'
  },
  {
    name: 'process_id',
    sql: 'ALTER TABLE lead_scraping_runs ADD COLUMN process_id INTEGER'
  },
  {
    name: 'last_activity_at',
    sql: 'ALTER TABLE lead_scraping_runs ADD COLUMN last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP'
  }
];

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const migration of migrations) {
  try {
    db.exec(migration.sql);
    console.log(`✅ Added column: ${migration.name}`);
    successCount++;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`⏭️  Column already exists: ${migration.name} (skipped)`);
        skipCount++;
      } else {
        console.error(`❌ Failed to add ${migration.name}:`, error.message);
        errorCount++;
      }
    }
  }
}

console.log('\n📊 Verifying table schema...');
const schema = db.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE type = 'table' AND name = 'lead_scraping_runs'
`).get() as { sql: string } | undefined;

if (schema) {
  console.log('\nCurrent schema:');
  console.log(schema.sql);
}

console.log('\n📈 Migration Summary:');
console.log(`   ✅ Added: ${successCount}`);
console.log(`   ⏭️  Skipped: ${skipCount}`);
console.log(`   ❌ Failed: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n✅ Migration completed successfully!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Migration completed with errors!\n');
  process.exit(1);
}


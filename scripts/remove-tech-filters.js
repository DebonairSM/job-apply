#!/usr/bin/env node
/**
 * Remove technology filters to allow previously blocked tech stacks
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/app.db');

console.log('🔧 Removing technology filters...\n');

const db = new Database(dbPath);

try {
  // Show current filters before removal
  const beforeFilters = db.prepare(`
    SELECT pattern_type, pattern_value, count
    FROM rejection_patterns
    WHERE pattern_type = 'tech_stack'
    ORDER BY pattern_value
  `).all();
  
  if (beforeFilters.length === 0) {
    console.log('No tech stack filters found.');
    process.exit(0);
  }
  
  console.log('Current tech stack filters:');
  beforeFilters.forEach(f => {
    console.log(`  - ${f.pattern_value} (count: ${f.count})`);
  });
  
  // Remove all tech_stack filters
  const result = db.prepare(`
    DELETE FROM rejection_patterns
    WHERE pattern_type = 'tech_stack'
  `).run();
  
  console.log(`\n✅ Removed ${result.changes} tech stack filter(s)\n`);
  
} catch (error) {
  console.error('❌ Error removing filters:', error);
  process.exit(1);
} finally {
  db.close();
}


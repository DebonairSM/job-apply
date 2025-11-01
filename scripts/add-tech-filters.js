#!/usr/bin/env node
/**
 * Add manual technology filters to block unwanted tech stacks
 * This will filter out jobs containing Go, Java, and other non-Microsoft technologies
 */

import { getDb } from '../src/lib/db.js';

console.log('🔧 Adding technology filters...\n');

const db = getDb();

// Technology filters to add
const unwantedTech = [
  { value: 'golang', reason: 'Go language not in tech stack' },
  { value: 'go lang', reason: 'Go language not in tech stack' },
  { value: ' go ', reason: 'Go language not in tech stack (with spaces to avoid false matches)' },
  { value: 'java developer', reason: 'Java not in preferred tech stack' },
  { value: 'java engineer', reason: 'Java not in preferred tech stack' },
  { value: 'java programming', reason: 'Java not in preferred tech stack' },
  { value: 'spring boot', reason: 'Java Spring framework not in tech stack' },
  { value: 'spring framework', reason: 'Java Spring framework not in tech stack' },
  { value: 'kotlin', reason: 'Kotlin not in tech stack' },
  { value: 'scala', reason: 'Scala not in tech stack' },
  { value: 'python developer', reason: 'Python-focused roles not preferred' },
  { value: 'ruby on rails', reason: 'Ruby not in tech stack' },
  { value: 'php developer', reason: 'PHP not in tech stack' }
];

// Add filters to database
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO rejection_patterns (pattern_type, pattern_value, confidence, count, last_seen)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

try {
  db.prepare('BEGIN TRANSACTION').run();
  
  for (const tech of unwantedTech) {
    insertStmt.run('tech_stack', tech.value, 1.0, 2); // count=2 ensures filter is active
    console.log(`✓ Added filter for: ${tech.value}`);
    console.log(`  Reason: ${tech.reason}`);
  }
  
  db.prepare('COMMIT').run();
  
  console.log('\n✅ Successfully added technology filters!');
  console.log('\nThese jobs will now be filtered out during search:');
  console.log('  - Go/Golang positions');
  console.log('  - Java-focused roles (Spring Boot, etc.)');
  console.log('  - Kotlin, Scala, Python-focused, Ruby, PHP roles');
  console.log('\nMicrosoft stack jobs will continue to score high.');
  console.log('Node.js, TypeScript, React, Angular, Terraform will NOT be filtered.\n');
  
  // Show current filters
  const filters = db.prepare(`
    SELECT pattern_type, pattern_value, count, last_seen
    FROM rejection_patterns
    WHERE pattern_type = 'tech_stack'
    ORDER BY count DESC, pattern_value
  `).all();
  
  console.log('\nActive tech stack filters:');
  filters.forEach(f => {
    console.log(`  - ${f.pattern_value} (count: ${f.count})`);
  });
  
} catch (error) {
  db.prepare('ROLLBACK').run();
  console.error('❌ Error adding filters:', error);
  process.exit(1);
}
// Note: Database connection managed by getDb() singleton


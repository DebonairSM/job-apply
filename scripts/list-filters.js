#!/usr/bin/env node
/**
 * List all active rejection filters
 */

import { getDb } from '../src/lib/db.js';

const db = getDb();

try {
  console.log('📋 Active Rejection Filters\n');
  
  // Get all patterns grouped by type
  const patterns = db.prepare(`
    SELECT pattern_type, pattern_value, count, last_seen, weight_adjustment
    FROM rejection_patterns
    ORDER BY pattern_type, count DESC, pattern_value
  `).all();
  
  if (patterns.length === 0) {
    console.log('No active filters found.\n');
    process.exit(0);
  }
  
  // Group by type
  const grouped = {};
  patterns.forEach(p => {
    if (!grouped[p.pattern_type]) {
      grouped[p.pattern_type] = [];
    }
    grouped[p.pattern_type].push(p);
  });
  
  // Display by type
  Object.entries(grouped).forEach(([type, items]) => {
    console.log(`\n${type.toUpperCase()} (${items.length}):`);
    items.forEach(item => {
      const active = item.count >= 2 ? '✓ ACTIVE' : '  inactive';
      console.log(`  ${active} - ${item.pattern_value} (count: ${item.count}, weight adj: ${item.weight_adjustment.toFixed(2)})`);
    });
  });
  
  console.log('\nNote: Filters are active when count >= 2\n');
  
  // Summary
  const activeCount = patterns.filter(p => p.count >= 2).length;
  console.log(`Total patterns: ${patterns.length}`);
  console.log(`Active filters: ${activeCount}`);
  console.log(`Inactive patterns: ${patterns.length - activeCount}\n`);
  
} catch (error) {
  console.error('❌ Error listing filters:', error);
  process.exit(1);
}
// Note: Database connection managed by getDb() singleton


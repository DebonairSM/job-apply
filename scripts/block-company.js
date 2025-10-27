#!/usr/bin/env node
/**
 * Block a specific company from job applications
 */

import { addManualFilter } from '../src/ai/rejection-filters.ts';

const companyName = process.argv[2];

if (!companyName) {
  console.log('Usage: node scripts/block-company.js "CompanyName"');
  console.log('Example: node scripts/block-company.js "ExecutivePlacements.com"');
  process.exit(1);
}

try {
  console.log(`🚫 Blocking company: ${companyName}`);
  
  // Add the company to blocklist with count >= 2 to make it immediately active
  addManualFilter('company', companyName, `Manually blocked company: ${companyName}`);
  
  console.log(`✅ Successfully blocked ${companyName}`);
  console.log('   This company will now be filtered out during job searches.');
  console.log('   Run "npm run filters:list" to see all active filters.');
  
} catch (error) {
  console.error('❌ Error blocking company:', error);
  process.exit(1);
}

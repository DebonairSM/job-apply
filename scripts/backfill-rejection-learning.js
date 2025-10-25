#!/usr/bin/env node

/**
 * Backfill Rejection Learning
 * 
 * Re-analyzes all existing rejections to populate the rejection learning tables.
 * This is useful if:
 * - The learning tables were cleared/reset
 * - The learning system was added after rejections were recorded
 * - You want to rebuild the learning data from scratch
 */

import { getDb, getJobById } from '../src/lib/db.js';
import { analyzeRejectionWithLLM } from '../src/ai/rejection-analyzer.js';
import { applyWeightAdjustment } from '../src/ai/weight-manager.js';
import { saveRejectionPattern } from '../src/lib/db.js';

async function backfillRejectionLearning() {
  const db = getDb();
  
  // Get all rejections with reasons
  const rejections = db.prepare(`
    SELECT id, title, company, rejection_reason, status_updated_at
    FROM jobs 
    WHERE status = 'rejected' 
      AND rejection_reason IS NOT NULL 
      AND rejection_reason != ''
    ORDER BY status_updated_at ASC
  `).all();
  
  console.log(`Found ${rejections.length} rejections with reasons to analyze`);
  console.log('');
  
  let analyzed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const rejection of rejections) {
    try {
      console.log(`Analyzing: ${rejection.title} at ${rejection.company}`);
      console.log(`  Date: ${rejection.status_updated_at || 'N/A'}`);
      console.log(`  Reason: ${rejection.rejection_reason.substring(0, 80)}...`);
      
      const job = getJobById(rejection.id);
      if (!job) {
        console.log(`  ⚠️  Job not found, skipping`);
        skipped++;
        continue;
      }
      
      // Analyze rejection
      const analysis = await analyzeRejectionWithLLM(rejection.rejection_reason, job);
      
      // Save patterns
      for (const pattern of analysis.patterns) {
        saveRejectionPattern({
          type: pattern.type,
          value: pattern.value,
          confidence: pattern.confidence,
          profileCategory: undefined,
          weightAdjustment: 0
        });
      }
      
      // Apply weight adjustments
      for (const adjustment of analysis.suggestedAdjustments) {
        applyWeightAdjustment(
          adjustment.category,
          adjustment.adjustment,
          adjustment.reason,
          rejection.id
        );
      }
      
      console.log(`  ✓ Found ${analysis.patterns.length} patterns, ${analysis.suggestedAdjustments.length} adjustments`);
      analyzed++;
      
    } catch (error) {
      console.error(`  ✗ Error analyzing rejection:`, error.message);
      errors++;
    }
    
    console.log('');
    
    // Add a small delay to avoid overwhelming the LLM
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('=== BACKFILL COMPLETE ===');
  console.log(`Analyzed: ${analyzed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('');
  
  // Show updated statistics
  const patternsCount = db.prepare('SELECT COUNT(*) as count FROM rejection_patterns').get();
  const adjustmentsCount = db.prepare('SELECT COUNT(*) as count FROM weight_adjustments').get();
  
  console.log('Updated learning data:');
  console.log(`  Rejection patterns: ${patternsCount.count}`);
  console.log(`  Weight adjustments: ${adjustmentsCount.count}`);
}

// Run backfill
backfillRejectionLearning().catch(error => {
  console.error('Fatal error during backfill:', error);
  process.exit(1);
});


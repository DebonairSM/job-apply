#!/usr/bin/env node

/**
 * Database Reset Script for Testing
 * 
 * Usage:
 *   node scripts/reset-database.js [option]
 * 
 * Options:
 *   jobs       - Delete all jobs (keep profile/skills/learning)
 *   statuses   - Reset all job statuses to 'skipped' 
 *   queue      - Clear the queue (set queued jobs to skipped)
 *   restore    - Restore queue (set skipped jobs to queued)
 *   applied    - Reset applied/rejected/interview back to queued
 *   full       - Full reset (delete all jobs, keep profile/skills)
 *   nuclear    - Nuclear reset (delete EVERYTHING including profile)
 * 
 * SAFETY: Automatic backup created before ANY changes
 */

import { openDatabase, confirmDestructiveOperation } from './lib/db-safety.js';

async function reset() {
const db = openDatabase({ backup: true }); // Auto-backup before any changes

const option = process.argv[2] || 'queue';

console.log(`\n🔄 Database Reset: ${option}\n`);

try {
  switch (option) {
    case 'jobs':
      // Delete all jobs
      const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
      await confirmDestructiveOperation('Delete all jobs', {
        jobsAffected: jobCount.count,
        deletesData: true
      });
      
      const deleteResult = db.prepare('DELETE FROM jobs').run();
      console.log(`✅ Deleted ${deleteResult.changes} jobs`);
      console.log('   Profile, skills, and learning data preserved\n');
      break;

    case 'statuses':
      // Reset all to skipped
      const statusResult = db.prepare(`
        UPDATE jobs SET status = 'skipped', status_updated_at = CURRENT_TIMESTAMP
      `).run();
      console.log(`✅ Reset ${statusResult.changes} jobs to 'skipped'\n`);
      break;

    case 'queue':
      // Clear queue (queued → skipped)
      const queueResult = db.prepare(`
        UPDATE jobs 
        SET status = 'skipped', status_updated_at = CURRENT_TIMESTAMP
        WHERE status = 'queued'
      `).run();
      console.log(`✅ Cleared queue: ${queueResult.changes} jobs moved to 'skipped'\n`);
      break;

    case 'applied':
      // Reset applied/rejected/interview back to queued
      const appliedResult = db.prepare(`
        UPDATE jobs 
        SET status = 'queued', 
            applied_method = NULL,
            rejection_reason = NULL,
            status_updated_at = CURRENT_TIMESTAMP
        WHERE status IN ('applied', 'rejected', 'interview')
      `).run();
      console.log(`✅ Reset ${appliedResult.changes} jobs back to 'queued'\n`);
      break;

    case 'restore':
      // Restore skipped jobs back to queued
      const restoreResult = db.prepare(`
        UPDATE jobs 
        SET status = 'queued', status_updated_at = CURRENT_TIMESTAMP
        WHERE status = 'skipped'
      `).run();
      console.log(`✅ Restored ${restoreResult.changes} jobs from 'skipped' to 'queued'\n`);
      break;

    case 'full':
      // Full reset - delete all jobs and caches, keep profile
      const fullJobCount2 = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
      await confirmDestructiveOperation('Full database reset', {
        jobsAffected: fullJobCount2.count,
        deletesData: true
      });
      
      db.prepare('DELETE FROM jobs').run();
      db.prepare('DELETE FROM answers_cache').run();
      db.prepare('DELETE FROM label_mappings').run();
      db.prepare('DELETE FROM learned_selectors').run();
      
      const fullJobCountAfter = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
      console.log(`✅ Full reset complete`);
      console.log(`   Jobs: ${fullJobCountAfter.count}`);
      console.log(`   Caches: cleared`);
      console.log(`   Profile & skills: preserved\n`);
      break;

    case 'nuclear':
      // Nuclear reset - delete EVERYTHING
      console.log('⚠️  NUCLEAR RESET - Deleting ALL data!\n');
      
      const nuclearJobCount2 = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
      await confirmDestructiveOperation('NUCLEAR RESET - Delete ALL data including profile', {
        jobsAffected: nuclearJobCount2.count,
        deletesData: true
      });
      
      db.prepare('DELETE FROM jobs').run();
      db.prepare('DELETE FROM answers_cache').run();
      db.prepare('DELETE FROM label_mappings').run();
      db.prepare('DELETE FROM learned_selectors').run();
      db.prepare('DELETE FROM user_profile').run();
      db.prepare('DELETE FROM user_skills').run();
      db.prepare('DELETE FROM user_experience').run();
      db.prepare('DELETE FROM user_education').run();
      db.prepare('DELETE FROM resume_files').run();
      db.prepare('DELETE FROM common_answers').run();
      db.prepare('DELETE FROM application_preferences').run();
      db.prepare('DELETE FROM profile_weight_adjustments').run();
      db.prepare('DELETE FROM rejection_learning_history').run();
      db.prepare('DELETE FROM company_blocklist').run();
      
      console.log(`✅ Nuclear reset complete - ALL data deleted`);
      console.log(`   Run: node scripts/setup-profile.js to recreate profile\n`);
      break;

    default:
      console.log(`❌ Unknown option: ${option}\n`);
      console.log('Available options:');
      console.log('  jobs       - Delete all jobs');
      console.log('  statuses   - Reset all to skipped');
      console.log('  queue      - Clear queue (queued → skipped)');
      console.log('  restore    - Restore queue (skipped → queued)');
      console.log('  applied    - Reset applied/rejected/interview → queued');
      console.log('  full       - Delete jobs & caches (keep profile)');
      console.log('  nuclear    - Delete EVERYTHING\n');
      process.exit(1);
  }

  // Show current stats
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
      SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
      SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      COUNT(*) as total
    FROM jobs
  `).get();

  console.log('📊 Current Status:');
  console.log(`   Queued:     ${stats.queued || 0}`);
  console.log(`   Reported:   ${stats.reported || 0}`);
  console.log(`   Applied:    ${stats.applied || 0}`);
  console.log(`   Interview:  ${stats.interview || 0}`);
  console.log(`   Rejected:   ${stats.rejected || 0}`);
  console.log(`   Skipped:    ${stats.skipped || 0}`);
  console.log(`   ───────────────────`);
  console.log(`   Total:      ${stats.total || 0}\n`);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  throw error;
} finally {
  db.close();
}
}

reset().catch(error => {
  console.error('Reset failed:', error);
  process.exit(1);
});


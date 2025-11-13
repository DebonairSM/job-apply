/**
 * Rescore Skipped Jobs Script
 * 
 * Rescores all skipped jobs from the last 7 days using the current scoring system.
 * Jobs that now score 75 or above are moved to "queued" status.
 * 
 * Usage: npm run rescore-skipped
 */

import { getDb } from '../src/lib/db.js';
import { rankJob } from '../src/ai/ranker.js';

interface SkippedJob {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  rank: number;
  profile: string | null;
  created_at: string;
}

interface RescoreResult {
  jobId: string;
  title: string;
  company: string;
  oldScore: number;
  newScore: number;
  profile: string;
  action: 'requeued' | 'still_skipped';
}

async function rescoreSkippedJobs() {
  const db = getDb();
  const MIN_SCORE = 75;
  const DAYS_BACK = 7;

  console.log(`\n🔄 Rescoring skipped jobs from the last ${DAYS_BACK} days...\n`);

  // Get skipped jobs from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_BACK);
  const cutoffDate = sevenDaysAgo.toISOString();

  const query = `
    SELECT id, title, company, url, description, rank, profile, created_at
    FROM jobs
    WHERE status = 'skipped'
    AND created_at >= ?
    ORDER BY created_at DESC
  `;

  const stmt = db.prepare(query);
  const jobs = stmt.all(cutoffDate) as SkippedJob[];

  if (jobs.length === 0) {
    console.log(`✅ No skipped jobs found in the last ${DAYS_BACK} days.\n`);
    return;
  }

  console.log(`📊 Found ${jobs.length} skipped jobs to rescore\n`);

  const results: RescoreResult[] = [];
  let requeuedCount = 0;
  let processedCount = 0;

  // Update statement
  const updateStmt = db.prepare(`
    UPDATE jobs
    SET rank = ?,
        status = ?,
        category_scores = ?,
        fit_reasons = ?,
        must_haves = ?,
        blockers = ?,
        missing_keywords = ?,
        status_updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  for (const job of jobs) {
    processedCount++;
    
    // Use original profile or default to 'core'
    const profile = job.profile || 'core';
    
    try {
      console.log(`[${processedCount}/${jobs.length}] Rescoring: ${job.title} at ${job.company}`);
      console.log(`   Profile: ${profile}, Old score: ${job.rank?.toFixed(1) || 'N/A'}`);

      // Rescore the job
      const rankResult = await rankJob({
        title: job.title,
        company: job.company,
        description: job.description || ''
      }, profile);

      const newScore = rankResult.fitScore;
      const newStatus = newScore >= MIN_SCORE ? 'queued' : 'skipped';
      const action = newScore >= MIN_SCORE ? 'requeued' : 'still_skipped';

      console.log(`   New score: ${newScore.toFixed(1)} → ${action === 'requeued' ? '✅ REQUEUED' : '⏭️  Still skipped'}\n`);

      // Update the job in database
      updateStmt.run(
        newScore,
        newStatus,
        JSON.stringify(rankResult.categoryScores),
        JSON.stringify(rankResult.reasons),
        JSON.stringify(rankResult.mustHaves),
        JSON.stringify(rankResult.blockers),
        JSON.stringify(rankResult.missingKeywords),
        job.id
      );

      results.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        oldScore: job.rank || 0,
        newScore,
        profile,
        action
      });

      if (action === 'requeued') {
        requeuedCount++;
      }

    } catch (error) {
      console.error(`   ❌ Error rescoring job: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESCORING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total jobs rescored: ${processedCount}`);
  console.log(`Jobs requeued (score ≥ ${MIN_SCORE}): ${requeuedCount}`);
  console.log(`Jobs still skipped: ${processedCount - requeuedCount}`);
  console.log('='.repeat(80) + '\n');

  // Show requeued jobs
  if (requeuedCount > 0) {
    console.log('✅ REQUEUED JOBS (now ready for application):');
    console.log('-'.repeat(80));
    
    const requeued = results.filter(r => r.action === 'requeued');
    requeued.forEach((result, index) => {
      const improvement = result.newScore - result.oldScore;
      console.log(`${index + 1}. ${result.title} at ${result.company}`);
      console.log(`   Old: ${result.oldScore.toFixed(1)} → New: ${result.newScore.toFixed(1)} (+${improvement.toFixed(1)})`);
      console.log(`   Profile: ${result.profile}`);
    });
    console.log();
  }

  // Show biggest improvements that are still skipped
  const stillSkipped = results
    .filter(r => r.action === 'still_skipped')
    .map(r => ({ ...r, improvement: r.newScore - r.oldScore }))
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, 5);

  if (stillSkipped.length > 0 && stillSkipped[0].improvement > 0) {
    console.log('📊 TOP SCORE IMPROVEMENTS (still below threshold):');
    console.log('-'.repeat(80));
    
    stillSkipped.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title} at ${result.company}`);
      console.log(`   Old: ${result.oldScore.toFixed(1)} → New: ${result.newScore.toFixed(1)} (+${result.improvement.toFixed(1)})`);
      console.log(`   Profile: ${result.profile}`);
    });
    console.log();
  }
}

// Run the script
rescoreSkippedJobs()
  .then(() => {
    console.log('✅ Rescoring complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });







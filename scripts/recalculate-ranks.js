import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../data/app.db');

// Profile definitions (must match src/ai/profiles.ts)
const PROFILES = {
  coreAzure: { weight: 20 },
  security: { weight: 15 },
  eventDriven: { weight: 10 },
  performance: { weight: 10 },
  devops: { weight: 0 },
  seniority: { weight: 10 },
  coreNet: { weight: 20 },
  frontendFrameworks: { weight: 10 },
  legacyModernization: { weight: 5 }
};

async function recalculateRanks() {
  const db = new Database(DB_PATH);
  console.log('🔄 Recalculating job ranks with proper weighted formula...\n');

  try {
    // Get current weight adjustments from learning system
    const adjustments = {};
    const adjustmentRows = db.prepare(`
      SELECT profile_category, SUM(new_weight - old_weight) as total_adjustment
      FROM weight_adjustments
      GROUP BY profile_category
    `).all();
    
    for (const row of adjustmentRows) {
      adjustments[row.profile_category] = row.total_adjustment;
    }
    
    if (Object.keys(adjustments).length > 0) {
      console.log('📊 Active weight adjustments from learning system:');
      for (const [category, adjustment] of Object.entries(adjustments)) {
        console.log(`   ${category}: ${adjustment > 0 ? '+' : ''}${adjustment}%`);
      }
      console.log('');
    }

    // Get all jobs with category scores
    const jobs = db.prepare('SELECT id, title, company, category_scores FROM jobs WHERE category_scores IS NOT NULL').all();

    if (jobs.length === 0) {
      console.log('⚠️  No jobs with category scores found.');
      db.close();
      return;
    }

    console.log(`📋 Found ${jobs.length} jobs to recalculate\n`);

    let updated = 0;
    let skipped = 0;
    const updateStmt = db.prepare('UPDATE jobs SET rank = ? WHERE id = ?');
    
    // Track rank distribution
    const rankDistribution = { '0-50': 0, '50-70': 0, '70-85': 0, '85-95': 0, '95-100': 0 };

    for (const job of jobs) {
      try {
        const scores = JSON.parse(job.category_scores);
        
        // Calculate weighted score using current weights + adjustments
        let fitScore = 0;
        Object.entries(PROFILES).forEach(([key, prof]) => {
          const weight = (prof.weight + (adjustments[key] || 0)) / 100;
          const score = scores[key] || 0;
          fitScore += score * weight;
        });
        
        // Update database with precise decimal value
        updateStmt.run(fitScore, job.id);
        updated++;
        
        // Track distribution
        if (fitScore < 50) rankDistribution['0-50']++;
        else if (fitScore < 70) rankDistribution['50-70']++;
        else if (fitScore < 85) rankDistribution['70-85']++;
        else if (fitScore < 95) rankDistribution['85-95']++;
        else rankDistribution['95-100']++;
        
        if (updated % 100 === 0) {
          console.log(`  ✓ Updated ${updated}/${jobs.length}...`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing job "${job.title}" at ${job.company}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n✅ Recalculation complete!`);
    console.log(`   Updated: ${updated} jobs`);
    if (skipped > 0) {
      console.log(`   Skipped: ${skipped} jobs (errors)`);
    }
    
    console.log('\n📊 New rank distribution:');
    console.log(`   0-50:   ${rankDistribution['0-50']} jobs`);
    console.log(`   50-70:  ${rankDistribution['50-70']} jobs`);
    console.log(`   70-85:  ${rankDistribution['70-85']} jobs`);
    console.log(`   85-95:  ${rankDistribution['85-95']} jobs`);
    console.log(`   95-100: ${rankDistribution['95-100']} jobs`);
    
    // Show sample of new ranks
    console.log('\n📋 Sample of recalculated ranks:');
    const sampleJobs = db.prepare('SELECT title, company, rank FROM jobs WHERE rank IS NOT NULL ORDER BY rank DESC LIMIT 10').all();
    for (const job of sampleJobs) {
      console.log(`   ${job.rank.toFixed(2)} - ${job.title} at ${job.company}`);
    }

  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    throw error;
  } finally {
    db.close();
  }
}

recalculateRanks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


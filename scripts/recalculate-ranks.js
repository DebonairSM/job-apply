import { openDatabase } from './lib/db-safety.js';

// Profile-specific weight distributions (must match src/ai/profiles.ts)
const PROFILE_WEIGHT_DISTRIBUTIONS = {
  core: {
    coreAzure: 35, seniority: 15, coreNet: 30, frontendFrameworks: 10, legacyModernization: 10
  },
  backend: {
    coreAzure: 40, seniority: 15, coreNet: 35, frontendFrameworks: 0, legacyModernization: 10
  },
  'core-net': {
    coreAzure: 10, seniority: 15, coreNet: 60, frontendFrameworks: 10, legacyModernization: 5
  },
  'legacy-modernization': {
    coreAzure: 25, seniority: 20, coreNet: 30, frontendFrameworks: 5, legacyModernization: 20
  },
  contract: {
    coreAzure: 10, seniority: 15, coreNet: 60, frontendFrameworks: 10, legacyModernization: 5
  },
  'aspnet-simple': {
    coreAzure: 10, seniority: 20, coreNet: 60, frontendFrameworks: 5, legacyModernization: 5
  },
  'csharp-azure-no-frontend': {
    coreAzure: 50, seniority: 20, coreNet: 30, frontendFrameworks: 0, legacyModernization: 0
  },
  'az204-csharp': {
    coreAzure: 60, seniority: 15, coreNet: 20, frontendFrameworks: 0, legacyModernization: 5
  },
  'ai-enhanced-net': {
    coreAzure: 35, seniority: 15, coreNet: 40, frontendFrameworks: 10, legacyModernization: 0
  }
};

// Default profile weights (used when job has no profile specified)
const DEFAULT_PROFILES = {
  coreAzure: { weight: 30 },
  seniority: { weight: 15 },
  coreNet: { weight: 35 },
  frontendFrameworks: { weight: 10 },
  legacyModernization: { weight: 10 }
};

async function recalculateRanks() {
  const db = openDatabase({ backup: true }); // Auto-backup before changes
  console.log('🔄 Recalculating job ranks with profile-specific weights...\n');

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

    // Get all jobs with category scores and their profile
    const jobs = db.prepare('SELECT id, title, company, profile, category_scores FROM jobs WHERE category_scores IS NOT NULL').all();

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

    // Track profile usage for reporting
    const profileStats = {};
    
    for (const job of jobs) {
      try {
        const scores = JSON.parse(job.category_scores);
        
        // Get profile-specific base weights, or use default
        let baseWeights;
        if (job.profile && PROFILE_WEIGHT_DISTRIBUTIONS[job.profile]) {
          baseWeights = PROFILE_WEIGHT_DISTRIBUTIONS[job.profile];
          profileStats[job.profile] = (profileStats[job.profile] || 0) + 1;
        } else {
          // Fallback to default weights for jobs without profile
          baseWeights = {};
          Object.entries(DEFAULT_PROFILES).forEach(([key, prof]) => {
            baseWeights[key] = prof.weight;
          });
          profileStats['default'] = (profileStats['default'] || 0) + 1;
        }
        
        // Calculate weighted score using profile-specific weights + adjustments
        let fitScore = 0;
        Object.entries(baseWeights).forEach(([key, baseWeight]) => {
          const weight = (baseWeight + (adjustments[key] || 0)) / 100;
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
    
    console.log('\n📋 Profile usage:');
    Object.entries(profileStats).sort((a, b) => b[1] - a[1]).forEach(([profile, count]) => {
      console.log(`   ${profile}: ${count} jobs`);
    });
    
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


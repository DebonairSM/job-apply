import crypto from 'crypto';
import { getDb } from '../src/lib/db.js';

const url = 'https://www.linkedin.com/jobs/view/4319600209';
const jobId = crypto.createHash('md5').update(url).digest('hex');

console.log('='.repeat(80));
console.log('DIAGNOSTIC: Missing Job Investigation');
console.log('='.repeat(80));
console.log(`\nTarget URL: ${url}`);
console.log(`Expected Job ID (MD5 hash): ${jobId}\n`);

try {
  const db = getDb();
  
  // Check 1: Look for job by ID
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 1: Search by Job ID');
  console.log('-'.repeat(80));
  const jobById = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (jobById) {
    console.log('✅ Job found by ID:');
    console.log(`   Title: ${jobById.title}`);
    console.log(`   Company: ${jobById.company}`);
    console.log(`   Status: ${jobById.status}`);
    console.log(`   Rank: ${jobById.rank}`);
    console.log(`   Easy Apply: ${jobById.easy_apply === 1 ? 'Yes' : 'No'}`);
    console.log(`   URL: ${jobById.url}`);
    console.log(`   Created: ${jobById.created_at}`);
    console.log(`   Profile: ${jobById.profile || 'null'}`);
  } else {
    console.log('❌ Job NOT found by ID');
  }
  
  // Check 2: Look for job by URL
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 2: Search by URL');
  console.log('-'.repeat(80));
  const jobByUrl = db.prepare('SELECT * FROM jobs WHERE url = ?').get(url);
  if (jobByUrl) {
    console.log('✅ Job found by URL:');
    console.log(`   ID: ${jobByUrl.id}`);
    console.log(`   Title: ${jobByUrl.title}`);
    console.log(`   Company: ${jobByUrl.company}`);
    console.log(`   Status: ${jobByUrl.status}`);
    console.log(`   Rank: ${jobByUrl.rank}`);
    
    if (jobByUrl.id !== jobId) {
      console.log(`\n⚠️  MISMATCH: URL matches but ID is different!`);
      console.log(`   Expected ID: ${jobId}`);
      console.log(`   Actual ID:   ${jobByUrl.id}`);
    }
  } else {
    console.log('❌ Job NOT found by URL');
  }
  
  // Check 3: Search for similar titles/companies
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 3: Search for similar jobs (title/company match)');
  console.log('-'.repeat(80));
  const similar = db.prepare(`
    SELECT id, title, company, status, rank, url, created_at 
    FROM jobs 
    WHERE title LIKE '%Sr API%' OR title LIKE '%Sr. API%' OR title LIKE '%Senior API%'
    OR company LIKE '%FPT%'
  `).all();
  
  if (similar.length > 0) {
    console.log(`Found ${similar.length} similar job(s):`);
    similar.forEach((j, idx) => {
      console.log(`\n   ${idx + 1}. ${j.title} at ${j.company}`);
      console.log(`      ID: ${j.id}`);
      console.log(`      Status: ${j.status}`);
      console.log(`      Rank: ${j.rank}`);
      console.log(`      URL: ${j.url}`);
      console.log(`      Created: ${j.created_at}`);
      if (j.url === url) {
        console.log(`      ✅ This matches the target URL!`);
        if (j.id !== jobId) {
          console.log(`      ⚠️  BUT ID mismatch - expected ${jobId}`);
        }
      }
    });
  } else {
    console.log('❌ No similar jobs found');
  }
  
  // Check 4: Look for recent jobs from today with similar score
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 4: Recent jobs with score ~77 (created today)');
  console.log('-'.repeat(80));
  const today = new Date().toISOString().split('T')[0];
  const recent = db.prepare(`
    SELECT id, title, company, status, rank, url, created_at, profile
    FROM jobs 
    WHERE DATE(created_at) = DATE('now')
    AND rank BETWEEN 75 AND 80
    ORDER BY created_at DESC
    LIMIT 20
  `).all();
  
  if (recent.length > 0) {
    console.log(`Found ${recent.length} recent job(s) with score ~77:`);
    recent.forEach((j, idx) => {
      console.log(`\n   ${idx + 1}. ${j.title} at ${j.company}`);
      console.log(`      ID: ${j.id}`);
      console.log(`      Status: ${j.status}`);
      console.log(`      Rank: ${j.rank}`);
      console.log(`      Profile: ${j.profile || 'null'}`);
      console.log(`      URL: ${j.url}`);
      if (j.url === url || j.id === jobId) {
        console.log(`      ✅ This is the target job!`);
      }
    });
  } else {
    console.log('❌ No recent jobs found with score ~77');
  }
  
  // Check 5: Check for duplicate URL entries
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 5: Check for duplicate URLs in database');
  console.log('-'.repeat(80));
  const duplicates = db.prepare(`
    SELECT url, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(status) as statuses
    FROM jobs
    WHERE url = ?
    GROUP BY url
    HAVING COUNT(*) > 1
  `).get(url);
  
  if (duplicates) {
    console.log('⚠️  Found duplicate URL entries!');
    console.log(`   URL: ${duplicates.url}`);
    console.log(`   Count: ${duplicates.count}`);
    console.log(`   IDs: ${duplicates.ids}`);
    console.log(`   Statuses: ${duplicates.statuses}`);
  } else {
    console.log('✅ No duplicate URL entries found');
  }
  
  // Check 6: Verify database schema
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 6: Database schema verification');
  console.log('-'.repeat(80));
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'").get() as { sql: string } | undefined;
  if (schema) {
    const hasUrlUnique = schema.sql.includes('url TEXT UNIQUE');
    const hasIdPrimary = schema.sql.includes('id TEXT PRIMARY KEY');
    console.log(`   URL UNIQUE constraint: ${hasUrlUnique ? '✅' : '❌'}`);
    console.log(`   ID PRIMARY KEY: ${hasIdPrimary ? '✅' : '❌'}`);
  }
  
  // Check 7: Count jobs by status
  console.log('\n' + '-'.repeat(80));
  console.log('CHECK 7: Jobs by status (created today)');
  console.log('-'.repeat(80));
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM jobs
    WHERE DATE(created_at) = DATE('now')
    GROUP BY status
    ORDER BY count DESC
  `).all();
  console.log('Status distribution:');
  statusCounts.forEach((row: any) => {
    console.log(`   ${row.status}: ${row.count}`);
  });
  
  // Note: Database connection managed by getDb() singleton
  
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
  
} catch (error) {
  console.error('\n❌ Error:', error);
  if (error instanceof Error) {
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
  process.exit(1);
}


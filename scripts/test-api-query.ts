import { getDb } from '../src/lib/db.js';

const db = getDb();

// Simulate the exact query from getJobsByStatus
function getJobsByStatus(status?: string, easyApply?: boolean) {
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (easyApply !== undefined) {
    query += ' AND easy_apply = ?';
    params.push(easyApply ? 1 : 0);
  }

  query += ' ORDER BY rank DESC, created_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    easy_apply: row.easy_apply === 1
  }));
}

console.log('='.repeat(80));
console.log('TEST: Simulating Dashboard API Query');
console.log('='.repeat(80));

const targetJobId = '4a99a850e760303de380d947ad895269';

// Test 1: Query with no filters (default dashboard query)
console.log('\n' + '-'.repeat(80));
console.log('TEST 1: All jobs (no filters) - ORDER BY rank DESC, created_at DESC');
console.log('-'.repeat(80));
const allJobs = getJobsByStatus(undefined, undefined);
console.log(`Total jobs returned: ${allJobs.length}`);
const targetIndex = allJobs.findIndex(j => j.id === targetJobId);
if (targetIndex >= 0) {
  console.log(`✅ Target job found at position ${targetIndex + 1} of ${allJobs.length}`);
  console.log(`   Title: ${allJobs[targetIndex].title}`);
  console.log(`   Status: ${allJobs[targetIndex].status}`);
  console.log(`   Rank: ${allJobs[targetIndex].rank}`);
  
  // Check if it would be in first 100 results
  if (targetIndex < 100) {
    console.log(`   ✅ Would be returned with limit=100`);
  } else {
    console.log(`   ❌ Would NOT be returned with limit=100 (position ${targetIndex + 1})`);
  }
  
  // Show jobs around it for context
  console.log('\n   Context (jobs around position ' + (targetIndex + 1) + '):');
  const start = Math.max(0, targetIndex - 2);
  const end = Math.min(allJobs.length, targetIndex + 3);
  for (let i = start; i < end; i++) {
    const marker = i === targetIndex ? '👉' : '  ';
    console.log(`   ${marker} ${i + 1}. [${allJobs[i].status}] ${allJobs[i].title} at ${allJobs[i].company} (rank: ${allJobs[i].rank})`);
  }
} else {
  console.log('❌ Target job NOT found in results');
}

// Test 2: Query with status='queued' filter
console.log('\n' + '-'.repeat(80));
console.log('TEST 2: Queued jobs only (status=\'queued\')');
console.log('-'.repeat(80));
const queuedJobs = getJobsByStatus('queued', undefined);
console.log(`Total queued jobs: ${queuedJobs.length}`);
const targetIndexQueued = queuedJobs.findIndex(j => j.id === targetJobId);
if (targetIndexQueued >= 0) {
  console.log(`✅ Target job found at position ${targetIndexQueued + 1} of ${queuedJobs.length}`);
  console.log(`   Rank: ${queuedJobs[targetIndexQueued].rank}`);
  
  if (targetIndexQueued < 100) {
    console.log(`   ✅ Would be returned with limit=100`);
  } else {
    console.log(`   ❌ Would NOT be returned with limit=100 (position ${targetIndexQueued + 1})`);
  }
} else {
  console.log('❌ Target job NOT found in queued jobs');
}

// Test 3: Check for NULL rank values
console.log('\n' + '-'.repeat(80));
console.log('TEST 3: Jobs with NULL rank values');
console.log('-'.repeat(80));
const nullRankJobs = allJobs.filter(j => j.rank === null || j.rank === undefined);
console.log(`Jobs with NULL rank: ${nullRankJobs.length}`);
if (nullRankJobs.length > 0) {
  console.log('⚠️  NULL rank jobs are ordered at the end in SQLite');
  const nullRankPositions = nullRankJobs.map(j => {
    const idx = allJobs.findIndex(x => x.id === j.id);
    return { position: idx + 1, title: j.title, status: j.status };
  });
  console.log('   NULL rank jobs positions:', nullRankPositions.slice(0, 5));
}

// Note: Database connection managed by getDb() singleton

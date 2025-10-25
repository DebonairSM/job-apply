import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../data/app.db');

const db = new Database(DB_PATH);

console.log('\n📊 Rank Verification Report\n');

// Get all jobs with ranks
const jobs = db.prepare('SELECT rank FROM jobs WHERE rank IS NOT NULL').all();
const ranks = jobs.map(j => j.rank);

console.log(`Total jobs with ranks: ${ranks.length}`);
console.log(`Unique rank values: ${new Set(ranks).size}`);
console.log(`Min rank: ${Math.min(...ranks).toFixed(2)}`);
console.log(`Max rank: ${Math.max(...ranks).toFixed(2)}`);
console.log(`Average rank: ${(ranks.reduce((a,b)=>a+b,0)/ranks.length).toFixed(2)}`);

// Check how many are integers vs decimals
const integerRanks = ranks.filter(r => Number.isInteger(r));
const decimalRanks = ranks.filter(r => !Number.isInteger(r));
console.log(`\n📈 Granularity:`);
console.log(`  Integer ranks: ${integerRanks.length} (${((integerRanks.length/ranks.length)*100).toFixed(1)}%)`);
console.log(`  Decimal ranks: ${decimalRanks.length} (${((decimalRanks.length/ranks.length)*100).toFixed(1)}%)`);

// Show top 15 jobs
console.log('\n🏆 Top 15 jobs by rank:');
const topJobs = db.prepare('SELECT title, company, rank FROM jobs WHERE rank IS NOT NULL ORDER BY rank DESC LIMIT 15').all();
topJobs.forEach((job, i) => {
  const title = job.title.length > 45 ? job.title.substring(0, 45) + '...' : job.title;
  const company = job.company.length > 25 ? job.company.substring(0, 25) + '...' : job.company;
  console.log(`  ${String(i+1).padStart(2)}. ${job.rank.toFixed(2)} - ${title} at ${company}`);
});

// Show distribution of ranks
console.log('\n📊 Rank Distribution:');
const distribution = {
  '0-50': ranks.filter(r => r < 50).length,
  '50-60': ranks.filter(r => r >= 50 && r < 60).length,
  '60-70': ranks.filter(r => r >= 60 && r < 70).length,
  '70-75': ranks.filter(r => r >= 70 && r < 75).length,
  '75-80': ranks.filter(r => r >= 75 && r < 80).length,
  '80-85': ranks.filter(r => r >= 80 && r < 85).length,
  '85-90': ranks.filter(r => r >= 85 && r < 90).length,
  '90-95': ranks.filter(r => r >= 90 && r < 95).length,
  '95-100': ranks.filter(r => r >= 95).length
};

Object.entries(distribution).forEach(([range, count]) => {
  const percentage = ((count / ranks.length) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / 5));
  console.log(`  ${range.padEnd(8)} ${String(count).padStart(3)} jobs (${String(percentage).padStart(5)}%) ${bar}`);
});

db.close();
console.log('\n✅ Verification complete!\n');


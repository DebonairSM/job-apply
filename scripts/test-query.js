import Database from 'better-sqlite3';

const db = new Database('data/app.db');

console.log('Testing getJobsByStatus logic...\n');

// Test query 1: All queued jobs
const allQueued = db.prepare('SELECT * FROM jobs WHERE 1=1 AND status = ? ORDER BY rank DESC, created_at DESC').all('queued');
console.log(`All queued jobs: ${allQueued.length}`);

// Test query 2: Queued Easy Apply jobs
const easyQueued = db.prepare('SELECT * FROM jobs WHERE 1=1 AND status = ? AND easy_apply = ? ORDER BY rank DESC, created_at DESC').all('queued', 1);
console.log(`Queued Easy Apply jobs: ${easyQueued.length}`);

// Test query 3: Queued External jobs
const externalQueued = db.prepare('SELECT * FROM jobs WHERE 1=1 AND status = ? AND easy_apply = ? ORDER BY rank DESC, created_at DESC').all('queued', 0);
console.log(`Queued External jobs: ${externalQueued.length}`);

if (easyQueued.length > 0) {
  console.log('\nFirst 3 Easy Apply queued jobs:');
  easyQueued.slice(0, 3).forEach(j => {
    console.log(`   ${j.title} at ${j.company}`);
    console.log(`      easy_apply: ${j.easy_apply} (type: ${typeof j.easy_apply})`);
    console.log(`      status: ${j.status}`);
  });
}

db.close();


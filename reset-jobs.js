import Database from 'better-sqlite3';

const db = new Database('data/app.db');

const result = db.prepare(`
  UPDATE jobs 
  SET status = 'queued' 
  WHERE status = 'skipped'
`).run();

console.log(`✅ Reset ${result.changes} jobs from 'skipped' to 'queued'`);

db.close();


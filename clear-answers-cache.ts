import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

console.log('Clearing cached answers...');
const result = db.prepare('DELETE FROM answers').run();
console.log(`Cleared ${result.changes} cached answer entries`);

db.close();
console.log('Done!');


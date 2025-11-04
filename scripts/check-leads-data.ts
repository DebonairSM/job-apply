import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'app.db');

console.log('Opening database:', dbPath);
const db = new Database(dbPath);

// Check if leads table exists
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leads'").get();
console.log('Leads table exists:', tableCheck);

// Count total leads
const totalCount = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
console.log('Total leads count:', totalCount.count);

// Get sample leads
const sampleLeads = db.prepare('SELECT * FROM leads LIMIT 5').all();
console.log('\nSample leads:');
console.log(JSON.stringify(sampleLeads, null, 2));

// Count leads with email
const withEmailCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE email IS NOT NULL AND email != ''").get() as { count: number };
console.log('\nLeads with email:', withEmailCount.count);

// Count leads without email
const withoutEmailCount = db.prepare("SELECT COUNT(*) as count FROM leads WHERE email IS NULL OR email = ''").get() as { count: number };
console.log('Leads without email:', withoutEmailCount.count);

db.close();


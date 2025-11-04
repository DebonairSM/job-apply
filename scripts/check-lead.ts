import { getDb, initDb } from '../src/lib/db.js';

const profileUrl = process.argv[2];
const nameSearch = process.argv[3];

initDb();
const db = getDb();

if (profileUrl) {
  console.log(`\n🔍 Checking for profile URL: ${profileUrl}\n`);
  const lead = db.prepare('SELECT * FROM leads WHERE profile_url = ?').get(profileUrl);
  
  if (lead) {
    console.log('✅ Lead found in database:');
    console.log(JSON.stringify(lead, null, 2));
  } else {
    console.log('❌ Lead not found in database');
  }
}

if (nameSearch) {
  console.log(`\n🔍 Searching for leads with name containing: ${nameSearch}\n`);
  const leads = db.prepare('SELECT * FROM leads WHERE name LIKE ?').all(`%${nameSearch}%`);
  
  if (leads.length > 0) {
    console.log(`✅ Found ${leads.length} matching lead(s):`);
    leads.forEach((lead: any) => {
      console.log(`\n  Name: ${lead.name}`);
      console.log(`  Title: ${lead.title || 'N/A'}`);
      console.log(`  Company: ${lead.company || 'N/A'}`);
      console.log(`  URL: ${lead.profile_url}`);
      console.log(`  Created: ${lead.created_at}`);
    });
  } else {
    console.log('❌ No matching leads found');
  }
}

console.log('');


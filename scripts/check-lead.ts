import { getDb, getLeadByUrl } from '../src/lib/db.js';

const profileUrl = process.argv[2];

if (!profileUrl) {
  console.log('Usage: npm run check-lead <profile-url-or-name>');
  console.log('Example: npm run check-lead https://www.linkedin.com/in/lisabrownebanicprexpert/');
  console.log('Example: npm run check-lead "LISA BROWNE-BANIC"');
  process.exit(1);
}

const db = getDb();

// Try to find by URL first (this will normalize the URL automatically)
let lead = profileUrl.startsWith('http') ? getLeadByUrl(profileUrl) : null;

// If not found by URL, try partial name match
if (!lead && !profileUrl.startsWith('http')) {
  const searchPattern = `%${profileUrl}%`;
  lead = db.prepare('SELECT * FROM leads WHERE name LIKE ?').get(searchPattern);
}

if (lead) {
  console.log('\n✅ Lead found in database:\n');
  console.log(`   ID: ${lead.id}`);
  console.log(`   Name: ${lead.name}`);
  console.log(`   Title: ${lead.title || '-'}`);
  console.log(`   Company: ${lead.company || '-'}`);
  console.log(`   Location: ${lead.location || '-'}`);
  console.log(`   Email: ${lead.email || '-'}`);
  console.log(`   Profile URL: ${lead.profile_url}`);
  console.log(`   LinkedIn ID: ${lead.linkedin_id || '-'}`);
  console.log(`   Scraped At: ${lead.scraped_at || '-'}`);
  console.log(`   Created At: ${lead.created_at || '-'}`);
  console.log(`   Status: ${lead.status || 'active'}`);
  
  if (lead.about) {
    console.log(`\n   About:\n   ${lead.about.substring(0, 200)}${lead.about.length > 200 ? '...' : ''}`);
  }
} else {
  console.log('\n❌ Lead not found in database');
  console.log('\nSearched for:');
  console.log(`   URL: ${profileUrl.startsWith('http') ? profileUrl : 'N/A'}`);
  console.log(`   Name pattern: ${!profileUrl.startsWith('http') ? profileUrl : 'N/A'}`);
}

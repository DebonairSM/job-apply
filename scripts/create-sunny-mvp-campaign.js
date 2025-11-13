import https from 'https';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database setup
const dbPath = join(__dirname, '..', 'data', 'app.db');
const db = new Database(dbPath);

// Campaign data
const campaignData = {
  id: randomUUID(),
  name: 'Sunny MVP Builder',
  description: 'Campaign focused on Sunny\'s AI-powered MVP building capabilities and natural conversation-based development',
  subject_template: '{{firstName}}, replace any CRM/ERP with Sunny',
  body_template: `Hi {{firstName}},

I built Sunny to help replace any CRM or ERP feature — or any management system, as a matter of fact — and customize it deeply to the way you work.

The system learns your process instead of forcing you to learn it. It's automation that actually adapts.

This quick journey starts by having a conversation with Sunny, our friendly AI Systems Analyst. No commitment, no pressure — just natural speech-to-text, instantly transformed into user stories and then into a working MVP. Go ahead, give it a try — even just for fun. Its capabilities tend to surprise people.

👉 https://vsol.ngrok.app/

If it looks useful, reply to this email and I'll show how we turn those workflows into deployable systems in days.

Or skip the email and book a quick chat: https://calendly.com/vsol/meeting-with-bandeira

P.S. If you're not the right person for this conversation, I'd appreciate a referral!

You can share this link — referrals mean a lot to me, and I offer a commission for every introduction that turns into a project:

👉 https://vsol.software/referral?ref={{referralCode}}`,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

try {
  // Insert campaign into database
  const stmt = db.prepare(`
    INSERT INTO campaigns (
      id, name, description, subject_template, body_template, 
      static_placeholders, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    campaignData.id,
    campaignData.name,
    campaignData.description,
    campaignData.subject_template,
    campaignData.body_template,
    null, // static_placeholders (handled by renderer)
    campaignData.status,
    campaignData.created_at,
    campaignData.updated_at
  );

  console.log('✅ Campaign created successfully!');
  console.log('📝 Campaign ID:', campaignData.id);
  console.log('📋 Name:', campaignData.name);
  console.log('📧 Subject Template:', campaignData.subject_template);
  console.log('🎯 Status:', campaignData.status);
} catch (error) {
  console.error('❌ Error creating campaign:', error);
  process.exit(1);
} finally {
  db.close();
}






/**
 * Seed Sunny Campaign Templates (v1)
 * 
 * Inserts two active campaign templates into the database:
 * 1. Sunny Outreach (Long) - Full multi-paragraph template
 * 2. Sunny Outreach (Short) - Concise single-screen template
 * 
 * Both campaigns include computed placeholders for personalized referral links.
 * 
 * Usage:
 *   npm run seed:campaigns
 */

import { randomUUID } from 'crypto';
import { initDb, createCampaign, getAllCampaigns } from '../src/lib/db.js';

function seedSunnyCampaigns() {
  // Initialize database
  initDb();
  
  // Check if campaigns already exist (avoid duplicates)
  const existingCampaigns = getAllCampaigns();
  const sunnyLongExists = existingCampaigns.some(c => c.name === 'Sunny Outreach (Long)');
  const sunnyShortExists = existingCampaigns.some(c => c.name === 'Sunny Outreach (Short)');
  
  if (sunnyLongExists && sunnyShortExists) {
    console.log('✅ Sunny campaigns already exist. Skipping seed.');
    return;
  }
  
  // Static placeholders shared by both campaigns
  const staticPlaceholders = JSON.stringify({
    demo_name: 'Sunny',
    demo_link: 'https://vsol.ngrok.app/',
    call_to_action: "reply to this email and I'll show how we turn those workflows into deployable systems in days.",
    calendly_link: 'https://calendly.com/vsol/meeting-with-bandeira',
    referral_base_url: 'https://vsol.software/referral?ref='
  });
  
  // Campaign 1: Sunny Outreach (Long Version)
  if (!sunnyLongExists) {
    const longCampaign = {
      id: randomUUID(),
      name: 'Sunny Outreach (Long)',
      description: 'Full multi-paragraph template with detailed explanation of Sunny capabilities and referral program',
      subject_template: '{{first_name}}, meet Sunny — turning speech into software',
      body_template: `Hello {{first_name}},

I came across your email as we're connected on LinkedIn and wanted to share that I'm genuinely excited again about the latest innovations in software development — and as a result, I built Sunny, our friendly AI Systems Analyst.

Sunny replaces any CRM, ERP, or management system — and adapts completely to the way you work. The system learns your process instead of forcing you to learn it. It's automation that actually adapts.

This quick journey starts by having a conversation with Sunny. No commitment, no pressure — just natural speech-to-text, instantly transformed into user stories, and then into a working MVP. Go ahead, give it a try — even just for fun. Its capabilities tend to surprise people.

👉 {{demo_link}}

If it looks useful, {{call_to_action}}
Or skip the email and book a quick chat: {{calendly_link}}

P.S. If you're not the right person for this conversation, I'd appreciate a referral!
You can share this link — referrals mean a lot to me, and I offer a commission for every introduction that turns into a project:
👉 {{referral_link}}

Best regards,
Rommel Bandeira
Service Manager | Agent Master
VSol Software
📞 (352) 397-8650 | ✉️ info@vsol.software

🌐 vsol.software

LinkedIn`,
      static_placeholders: staticPlaceholders,
      status: 'active' as const
    };
    
    createCampaign(longCampaign);
    console.log('✅ Created campaign: Sunny Outreach (Long)');
  }
  
  // Campaign 2: Sunny Outreach (Short Version)
  if (!sunnyShortExists) {
    const shortCampaign = {
      id: randomUUID(),
      name: 'Sunny Outreach (Short)',
      description: 'Concise single-screen template for quick engagement',
      subject_template: '{{first_name}}, meet Sunny — turning speech into software',
      body_template: `Hi {{first_name}},

I came across your email as we're connected on LinkedIn and wanted to share that I'm genuinely excited again about the latest innovations in software development — and as a result, I built Sunny, our friendly AI Systems Analyst.

Sunny replaces any CRM, ERP, or management system — and adapts completely to the way you work. It learns your process instead of forcing you to learn it.

Go ahead, try it — even just for fun. Its capabilities tend to surprise people:
👉 {{demo_link}}

Or book a quick chat: {{calendly_link}}

P.S. If you're not the right person for this, I'd appreciate a referral!
👉 {{referral_link}}

— Rommel
VSol Software
 | LinkedIn`,
      static_placeholders: staticPlaceholders,
      status: 'active' as const
    };
    
    createCampaign(shortCampaign);
    console.log('✅ Created campaign: Sunny Outreach (Short)');
  }
  
  console.log('\n🎉 Sunny campaigns seeded successfully!');
  console.log('\nThese campaigns use computed placeholders:');
  console.log('  - {{referral_link}} → Generates full personalized referral URL');
  console.log('  - {{encoded_referral_code}} → Just the base64-encoded code');
  console.log('\nView campaigns at: http://192.168.1.65:3000/campaigns');
}

// Run the seed function
try {
  seedSunnyCampaigns();
} catch (error) {
  console.error('❌ Error seeding campaigns:', error);
  process.exit(1);
}


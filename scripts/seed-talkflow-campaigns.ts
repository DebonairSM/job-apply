/**
 * Seed TalkFlow Campaign Examples
 * 
 * Inserts two active campaign templates into the database:
 * 1. TalkFlow Outreach (Long) - Full multi-paragraph template
 * 2. TalkFlow Outreach (Short) - Concise single-screen template
 * 
 * Both campaigns include computed placeholders for personalized referral links.
 * 
 * Usage:
 *   npm run seed:campaigns
 */

import { randomUUID } from 'crypto';
import { initDb, createCampaign, getAllCampaigns } from '../src/lib/db.js';

function seedTalkFlowCampaigns() {
  // Initialize database
  initDb();
  
  // Check if campaigns already exist (avoid duplicates)
  const existingCampaigns = getAllCampaigns();
  const talkFlowLongExists = existingCampaigns.some(c => c.name === 'TalkFlow Outreach (Long)');
  const talkFlowShortExists = existingCampaigns.some(c => c.name === 'TalkFlow Outreach (Short)');
  
  if (talkFlowLongExists && talkFlowShortExists) {
    console.log('✅ TalkFlow campaigns already exist. Skipping seed.');
    return;
  }
  
  // Static placeholders shared by both campaigns
  const staticPlaceholders = JSON.stringify({
    product_name: 'TalkFlow',
    demo_name: 'Sunny',
    demo_link: 'https://vsol.ngrok.app/',
    call_to_action: "reply to this email and I'll show how we turn those workflows into deployable systems in days.",
    calendly_link: 'https://calendly.com/vsol/meeting-with-bandeira',
    referral_base_url: 'https://vsol.software/referral?ref='
  });
  
  // Campaign 1: TalkFlow Outreach (Long Version)
  if (!talkFlowLongExists) {
    const longCampaign = {
      id: randomUUID(),
      name: 'TalkFlow Outreach (Long)',
      description: 'Full multi-paragraph template with detailed explanation of TalkFlow capabilities and referral program',
      subject_template: '{{first_name}}, meet {{demo_name}} — turning speech into software',
      body_template: `Hi {{first_name}},

I built {{product_name}} to replace any CRM or ERP feature — or any management system, as a matter of fact — and customize it deeply to the way you work.

The system learns your process instead of forcing you to learn it. It's automation that actually adapts.

This quick journey starts by having a conversation with {{demo_name}}, our friendly AI Systems Analyst. No commitment, no pressure — just natural speech-to-text, instantly transformed into user stories and then into a working MVP. Go ahead, give it a try — even just for fun. Its capabilities tend to surprise people.

👉 {{demo_link}}

If it looks useful, {{call_to_action}}

Or skip the email and book a quick chat: {{calendly_link}}

P.S. If you're not the right person for this conversation, I'd appreciate a referral!

You can share this link — referrals mean a lot to me, and I offer a commission for every introduction that turns into a project:

👉 {{referral_link}}

Best regards,

Rommel Bandeira

Service Manager | Agent Master

VSol Software — creators of {{product_name}}

📞 (352) 397-8650 | ✉️ info@vsol.software

🌐 vsol.software

LinkedIn`,
      static_placeholders: staticPlaceholders,
      status: 'active' as const
    };
    
    createCampaign(longCampaign);
    console.log('✅ Created campaign: TalkFlow Outreach (Long)');
  }
  
  // Campaign 2: TalkFlow Outreach (Short Version)
  if (!talkFlowShortExists) {
    const shortCampaign = {
      id: randomUUID(),
      name: 'TalkFlow Outreach (Short)',
      description: 'Concise single-screen template for quick engagement',
      subject_template: '{{first_name}}, meet {{demo_name}} — turning speech into software',
      body_template: `Hi {{first_name}},

I built {{product_name}} to automate any system — CRM, ERP, or otherwise — and tailor it exactly to the way your team works.

It learns your process instead of forcing you to learn it.

Start by talking with {{demo_name}}, our AI Systems Analyst. No pressure — just speech-to-text that becomes real user stories and a working MVP. It's worth a quick look:

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
    console.log('✅ Created campaign: TalkFlow Outreach (Short)');
  }
  
  console.log('\n🎉 TalkFlow campaigns seeded successfully!');
  console.log('\nThese campaigns use computed placeholders:');
  console.log('  - {{referral_link}} → Generates full personalized referral URL');
  console.log('  - {{encoded_referral_code}} → Just the base64-encoded code');
  console.log('\nView campaigns at: http://192.168.1.65:3000/campaigns');
}

// Run the seed function
try {
  seedTalkFlowCampaigns();
} catch (error) {
  console.error('❌ Error seeding campaigns:', error);
  process.exit(1);
}


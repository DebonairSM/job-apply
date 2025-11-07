/**
 * Test phone number in actual email generation
 */

import { generateHtmlEmail, type Lead } from '../src/ai/email-templates.js';

const testLead: Lead = {
  id: 'test-1',
  name: 'Michael Johnson',
  title: 'Software Developer',
  company: 'Tech Inc',
  email: 'mike@test.com',
  profile_url: 'https://linkedin.com/in/test'
};

const htmlEmail = generateHtmlEmail(testLead);

// Extract just the signature portion
const phoneSection = htmlEmail.match(/<p[^>]*>.*?📞.*?<\/p>/s);

if (phoneSection) {
  console.log('Phone section HTML:');
  console.log(phoneSection[0]);
  console.log('\n');
  
  // Check for proper tel: link format
  if (phoneSection[0].includes('tel:+13523978650')) {
    console.log('✅ Phone link has correct format: tel:+13523978650');
  } else if (phoneSection[0].includes('tel:')) {
    console.log('⚠️ Phone link exists but wrong format');
    const telMatch = phoneSection[0].match(/href="(tel:[^"]+)"/);
    if (telMatch) {
      console.log('   Found: ' + telMatch[1]);
    }
  } else {
    console.log('❌ No phone link found');
  }
} else {
  console.log('Could not find phone section in HTML');
}


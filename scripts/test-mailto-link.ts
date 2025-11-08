/**
 * Test mailto link markdown stripping
 */

import { createMailtoLink, type EmailContent } from '../src/ai/email-templates.js';

const testEmail: EmailContent = {
  to: 'test@example.com',
  subject: 'Test Subject',
  body: `Hello,

That's what our **Work Automation Platform** delivers.

Some more text with **bold words** and regular text.

Best regards,
Test`
};

console.log('Original body with markdown:');
console.log(testEmail.body);
console.log('\n' + '='.repeat(80) + '\n');

const mailtoLink = createMailtoLink(testEmail);

// Decode the body portion to see what was sent
const bodyMatch = mailtoLink.match(/&body=([^&]+)/);
if (bodyMatch) {
  const decodedBody = decodeURIComponent(bodyMatch[1]);
  console.log('Cleaned body (markdown stripped):');
  console.log(decodedBody);
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Check that asterisks were removed
  if (decodedBody.includes('**')) {
    console.log('❌ FAILED: Asterisks still present in body');
  } else if (decodedBody.includes('Work Automation Platform')) {
    console.log('✅ SUCCESS: Markdown stripped, text preserved');
  } else {
    console.log('⚠️  WARNING: Text might have been removed');
  }
} else {
  console.log('Could not parse mailto link');
}

console.log('\nFull mailto link (first 200 chars):');
console.log(mailtoLink.substring(0, 200) + '...');



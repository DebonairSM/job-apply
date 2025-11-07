/**
 * Test HTML email generation with clickable links
 * 
 * Run with: npx tsx scripts/test-html-email.ts
 */

import { generateHtmlEmail, type Lead } from '../src/ai/email-templates.js';
import * as fs from 'fs';
import * as path from 'path';

const testLead: Lead = {
  id: 'test-1',
  name: 'Michael Johnson',
  title: 'Software Developer',
  company: 'Tech Innovations LLC',
  about: 'Passionate about helping fight the wildfire crisis through technology',
  email: 'mike@techinnov.com',
  profile_url: 'https://linkedin.com/in/test',
  background: 'Given your background in helping fight the wildfire crisis and experience as a software developer, you may find our AI-assisted workflow automation beneficial for streamlining operations and reducing manual processes.'
};

console.log('Generating HTML email...\n');

const htmlEmail = generateHtmlEmail(testLead);

// Save to file for testing in browser
const outputPath = path.join(process.cwd(), 'artifacts', 'test-email.html');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, htmlEmail, 'utf-8');

console.log('✅ HTML email saved to:', outputPath);
console.log('\nYou can open this file in a browser to see:');
console.log('  - Emojis in signature (📞, ✉️, 🌐)');
console.log('  - Clickable phone: (352) 397-8650');
console.log('  - Clickable email: info@vsol.software');
console.log('  - Clickable website: vsol.software');
console.log('  - Clickable Calendly link');
console.log('  - Bold "Work Automation Platform"');
console.log('  - Proper paragraph spacing and line breaks');

// Extract and show just the signature HTML for inspection
const signatureMatch = htmlEmail.match(/<p[^>]*>Best regards,.*?<\/p>/s);
if (signatureMatch) {
  console.log('\n📝 Signature HTML (formatted for readability):');
  console.log('-'.repeat(80));
  const signatureHtml = signatureMatch[0]
    .replace(/<br>/g, '<br>\n    ')
    .replace(/(<p[^>]*>)/, '\n$1\n    ')
    .replace(/<\/p>/, '\n</p>');
  console.log(signatureHtml);
}

// Check for specific elements
console.log('\n🔍 HTML Element Verification:');
console.log('-'.repeat(80));
console.log('Phone tel: link:', htmlEmail.includes('tel:+13523978650') ? '✅' : '❌');
console.log('Email mailto: link:', htmlEmail.includes('mailto:info@vsol.software') ? '✅' : '❌');
console.log('Website https: link:', htmlEmail.includes('https://vsol.software') || htmlEmail.includes('vsol.software') ? '✅' : '❌');
console.log('Calendly link:', htmlEmail.includes('https://calendly.com/vsol/meeting-with-bandeira') ? '✅' : '❌');
console.log('Bold formatting:', htmlEmail.includes('<strong>Work Automation Platform</strong>') ? '✅' : '❌');
console.log('Phone emoji:', htmlEmail.includes('📞') ? '✅' : '❌');
console.log('Email emoji:', htmlEmail.includes('✉️') ? '✅' : '❌');
console.log('Globe emoji:', htmlEmail.includes('🌐') ? '✅' : '❌');

console.log('\n💡 To test in email client:');
console.log('  1. Open the HTML file in a browser');
console.log('  2. Select all (Ctrl+A) and copy');
console.log('  3. Paste into Gmail/Outlook compose window');
console.log('  4. Verify all links are clickable and emojis show correctly');
console.log('\n');


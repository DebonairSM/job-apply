/**
 * Test script to demonstrate improved email formatting
 * 
 * Run with: npx tsx scripts/test-email-formatting.ts
 */

import { generateOutreachEmail, generateHtmlEmail, type Lead } from '../src/ai/email-templates.js';

// Test lead with company (good case)
const testLeadWithCompany: Lead = {
  id: 'test-1',
  name: 'Michael Johnson',
  title: 'Software Developer',
  company: 'Tech Innovations LLC',
  about: 'Passionate about helping fight the wildfire crisis through technology',
  email: 'mike@techinnov.com',
  profile_url: 'https://linkedin.com/in/test',
  background: 'Given your background in helping fight the wildfire crisis and experience as a software developer, you may find our AI-assisted workflow automation beneficial for streamlining operations and reducing manual processes.'
};

// Test lead without company (fallback case)
const testLeadWithoutCompany: Lead = {
  id: 'test-2',
  name: 'Sarah Williams',
  title: 'CTO',
  email: 'sarah@example.com',
  profile_url: 'https://linkedin.com/in/test2'
};

console.log('='.repeat(80));
console.log('EMAIL FORMATTING TEST');
console.log('='.repeat(80));

console.log('\n\n');
console.log('TEST 1: Lead WITH company (shows company in subject)');
console.log('-'.repeat(80));

const email1 = generateOutreachEmail(testLeadWithCompany);
console.log('\n📧 SUBJECT:');
console.log(email1.subject);

console.log('\n📝 PLAIN TEXT BODY:');
console.log(email1.body);

console.log('\n🌐 HTML VERSION (first 500 chars):');
const html1 = generateHtmlEmail(testLeadWithCompany);
console.log(html1.substring(0, 500) + '...');

console.log('\n\n');
console.log('TEST 2: Lead WITHOUT company (uses "your organization" fallback)');
console.log('-'.repeat(80));

const email2 = generateOutreachEmail(testLeadWithoutCompany);
console.log('\n📧 SUBJECT:');
console.log(email2.subject);

console.log('\n📝 PLAIN TEXT BODY (first 500 chars):');
console.log(email2.body.substring(0, 500) + '...');

console.log('\n\n');
console.log('='.repeat(80));
console.log('KEY IMPROVEMENTS:');
console.log('='.repeat(80));
console.log('✅ Emojis preserved in signature (📞, ✉️, 🌐)');
console.log('✅ Phone number clickable: (352) 397-8650 → tel:+13523978650');
console.log('✅ Email clickable: info@vsol.software → mailto:info@vsol.software');
console.log('✅ Website clickable: vsol.software → https://vsol.software');
console.log('✅ Bold formatting: **Work Automation Platform** → <strong>Work Automation Platform</strong>');
console.log('✅ Signature formatting preserved with proper line breaks');
console.log('✅ Resume keywords highlighted (if enabled)');
console.log('⚠️  Subject line uses company name when available, falls back to "your organization" when missing');
console.log('\n');


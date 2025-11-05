/**
 * Manual testing script for email template system
 * Run: npx tsx scripts/test-email-templates.ts
 */

import {
  buildOutreachEmail,
  generateOutreachEmail,
  LeadProfile,
  EmailContext,
  Lead
} from '../src/ai/email-templates';

console.log('='.repeat(80));
console.log('EMAIL TEMPLATE SYSTEM - MANUAL TEST');
console.log('='.repeat(80));
console.log();

// Test 1: New API with full profile (Chiefs template)
console.log('TEST 1: New API - Full Profile (Chiefs Template)');
console.log('-'.repeat(80));

const fullProfile: LeadProfile = {
  firstName: 'Sarah',
  lastName: 'Johnson',
  roleTitle: 'Chief Technology Officer',
  companyName: 'TechCorp Industries',
  industry: 'Financial Services',
  primaryPainPoint: 'Our team spends 15 hours per week reconciling spreadsheets manually. This delays critical financial reports and creates accuracy issues.',
  city: 'New York',
  stateOrRegion: 'NY'
};

const chiefsContext: EmailContext = {
  lead: fullProfile,
  productName: 'Spreadsheet Automation Platform',
  productUrl: 'https://vsol.software/agentic#featured-product',
  calendlyUrl: 'https://calendly.com/vsol-software/discovery'
};

const chiefsEmail = buildOutreachEmail(chiefsContext, 'chiefs');

console.log('SUBJECT:', chiefsEmail.subject);
console.log();
console.log('BODY:');
console.log(chiefsEmail.bodyText);
console.log();
console.log();

// Test 2: New API with minimal profile (Generic template)
console.log('TEST 2: New API - Minimal Profile (Generic Template)');
console.log('-'.repeat(80));

const minimalProfile: LeadProfile = {
  firstName: 'John',
  roleTitle: 'Manager',
  companyName: 'Small Business Inc'
};

const genericContext: EmailContext = {
  lead: minimalProfile,
  productName: 'Workflow Automation Platform',
  productUrl: 'https://vsol.software/agentic#featured-product',
  calendlyUrl: 'https://calendly.com/vsol-software/discovery'
};

const genericEmail = buildOutreachEmail(genericContext, 'generic');

console.log('SUBJECT:', genericEmail.subject);
console.log();
console.log('BODY:');
console.log(genericEmail.bodyText);
console.log();
console.log();

// Test 3: Legacy API with AI-generated background
console.log('TEST 3: Legacy API - With AI-Generated Background');
console.log('-'.repeat(80));

const legacyLeadWithBackground: Lead = {
  id: '123',
  name: 'Jennifer Martinez',
  title: 'VP of Operations',
  company: 'Acme Corporation',
  email: 'jennifer.martinez@acme.com',
  background: 'Operations teams often struggle to maintain data consistency across multiple spreadsheets. Manual updates create bottlenecks that slow decision-making.',
  profile: 'chiefs'
};

const legacyEmailWithBg = generateOutreachEmail(legacyLeadWithBackground);

console.log('TO:', legacyEmailWithBg.to);
console.log('SUBJECT:', legacyEmailWithBg.subject);
console.log();
console.log('BODY:');
console.log(legacyEmailWithBg.body);
console.log();
console.log();

// Test 4: Legacy API with minimal data (fallback personalization)
console.log('TEST 4: Legacy API - Minimal Data (Fallback Personalization)');
console.log('-'.repeat(80));

const legacyLeadMinimal: Lead = {
  id: '456',
  name: 'Bob Smith',
  email: 'bob.smith@example.com',
  title: 'Director',
  company: 'Example Inc'
};

const legacyEmailMinimal = generateOutreachEmail(legacyLeadMinimal);

console.log('TO:', legacyEmailMinimal.to);
console.log('SUBJECT:', legacyEmailMinimal.subject);
console.log();
console.log('BODY:');
console.log(legacyEmailMinimal.body);
console.log();
console.log();

// Test 5: Legacy API with referral section
console.log('TEST 5: Legacy API - With Referral Section');
console.log('-'.repeat(80));

const legacyLeadWithReferral: Lead = {
  id: '789',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  title: 'Director',
  company: 'Example Inc',
  profile: 'directors'
};

const legacyEmailWithReferral = generateOutreachEmail(legacyLeadWithReferral, true);

console.log('TO:', legacyEmailWithReferral.to);
console.log('SUBJECT:', legacyEmailWithReferral.subject);
console.log('REFERRAL LINK:', legacyEmailWithReferral.referralLink);
console.log();
console.log('BODY (showing last 300 chars to see P.S. section):');
console.log('...' + legacyEmailWithReferral.body.slice(-300));
console.log();
console.log();

console.log('='.repeat(80));
console.log('MANUAL TESTING CHECKLIST');
console.log('='.repeat(80));
console.log();
console.log('✓ Check that subjects are personalized and mention company names');
console.log('✓ Verify no template markers like {{variable}} appear');
console.log('✓ Confirm no "undefined" values in any email');
console.log('✓ Ensure transitions between personalization and pitch are smooth');
console.log('✓ Verify no em-dashes (—) are used');
console.log('✓ Check that CTAs use softened language ("Is a brief conversation...")');
console.log('✓ Confirm chiefs template mentions spreadsheets');
console.log('✓ Verify generic template focuses on general workflow automation');
console.log('✓ Check that referral section (P.S.) is only added when requested');
console.log('✓ Ensure all emails end with signature');
console.log();
console.log('Next: Test in dashboard with real leads to verify UI integration');
console.log();


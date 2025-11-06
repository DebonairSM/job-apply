/**
 * Test script to verify HTML email generation with rich formatting
 * 
 * This script generates sample HTML emails and saves them to files
 * so you can open them in a browser or copy/paste into an email client
 * to verify formatting works correctly.
 */

import { generateHtmlEmail, Lead } from '../src/ai/email-templates';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample lead data that includes markdown formatting in background
const testLeads: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    title: 'CTO',
    company: 'TechCorp',
    email: 'john.smith@techcorp.com',
    about: 'Experienced technology leader focused on digital transformation',
    profile: 'chiefs',
    background: 'As CTO at TechCorp, John leads digital transformation initiatives. His team struggles with manual spreadsheet workflows that slow down critical business decisions.',
    worked_together: undefined
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    title: 'Director of Engineering',
    company: 'DataFlow Inc',
    email: 'sarah.j@dataflow.com',
    about: 'Engineering leader with expertise in automation',
    profile: 'generic',
    background: 'Sarah oversees engineering operations at DataFlow Inc. Her team spends significant time on manual workflow tasks that could benefit from automation.',
    worked_together: undefined
  }
];

async function testEmailGeneration() {
  console.log('Testing HTML email generation...\n');
  
  const outputDir = path.join(__dirname, '../artifacts/email-tests');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const lead of testLeads) {
    console.log(`Generating email for ${lead.name}...`);
    
    // Test without referral
    const htmlWithoutReferral = generateHtmlEmail(lead, false);
    const filenameWithout = path.join(outputDir, `${lead.name.replace(/\s+/g, '_')}_no_referral.html`);
    fs.writeFileSync(filenameWithout, htmlWithoutReferral);
    console.log(`  ✓ Saved without referral: ${filenameWithout}`);
    
    // Test with referral
    const htmlWithReferral = generateHtmlEmail(lead, true);
    const filenameWith = path.join(outputDir, `${lead.name.replace(/\s+/g, '_')}_with_referral.html`);
    fs.writeFileSync(filenameWith, htmlWithReferral);
    console.log(`  ✓ Saved with referral: ${filenameWith}`);
    
    // Print sample to console
    console.log('\n--- Sample HTML (first 500 chars) ---');
    console.log(htmlWithoutReferral.substring(0, 500) + '...\n');
  }
  
  console.log('\n✓ Email generation test complete!');
  console.log(`\nOpen the HTML files in ${outputDir} to verify formatting:`);
  console.log('  - Bold text should appear bold');
  console.log('  - URLs should be clickable links');
  console.log('  - Email addresses should be mailto links');
  console.log('  - Paragraphs should have proper spacing');
  console.log('\nYou can also copy the HTML content and paste it into an email client like Outlook.');
}

testEmailGeneration().catch(console.error);


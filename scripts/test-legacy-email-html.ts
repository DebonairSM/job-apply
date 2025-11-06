/**
 * Test script to verify HTML email generation with legacy templates
 * that use **bold** markdown syntax
 */

import { generateHtmlEmail, Lead } from '../src/ai/email-templates';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lead WITHOUT background - will use legacy template with **bold** markdown
const legacyLead: Lead = {
  id: '1',
  name: 'Steve Vento',
  title: 'CTO',
  company: 'Novir',
  email: 'steven.vento@live.com',
  about: 'Technology executive',
  profile: 'chiefs',
  // NO background field - will trigger legacy template
  worked_together: undefined
};

async function testLegacyTemplate() {
  console.log('Testing legacy email template with **bold** markdown...\n');
  
  const outputDir = path.join(__dirname, '../artifacts/email-tests');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Generating email for ${legacyLead.name} (legacy template)...`);
  
  const html = generateHtmlEmail(legacyLead, false);
  const filename = path.join(outputDir, 'legacy_template_with_bold.html');
  fs.writeFileSync(filename, html);
  
  console.log(`✓ Saved to: ${filename}\n`);
  console.log('--- Full HTML ---');
  console.log(html);
  console.log('\n--- What to check: ---');
  console.log('✓ "Spreadsheet Automation Platform" should be in <strong> tags');
  console.log('✓ "AI-generated interactive mockups" should be in <strong> tags');
  console.log('✓ "working demonstrations same-day" should be in <strong> tags');
  console.log('✓ URLs should be in <a> tags with href');
  console.log('✓ Email should be in <a> tag with mailto:');
  console.log('\nOpen the HTML file in a browser or paste into Outlook to verify formatting.');
}

testLegacyTemplate().catch(console.error);


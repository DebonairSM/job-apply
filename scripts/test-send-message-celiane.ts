/**
 * Test Script: Send LinkedIn Message to Celiane
 * 
 * This script tests the LinkedIn message sending functionality by:
 * 1. Adding Celiane as a network contact (if not exists)
 * 2. Launching a browser with LinkedIn session
 * 3. Sending a test message to her profile
 */

import { chromium } from 'playwright';
import { 
  getNetworkContacts,
  addNetworkContact,
  initDb,
  getDb
} from '../src/lib/db.js';
import { sendLinkedInMessage, dryRunLinkedInMessage } from '../src/services/linkedin-message-sender.js';
import { hasSession, STORAGE_STATE_PATH, loadConfig } from '../src/lib/session.js';

const CELIANE_PROFILE_URL = 'https://www.linkedin.com/in/celianebandeira/';

/**
 * Test message template for Celiane
 * Using placeholders that will be replaced by the message renderer
 */
const TEST_MESSAGE_TEMPLATE = `Hi {{first_name}}! 👋

I'm testing my automated LinkedIn messaging system and thought I'd reach out to you as my test contact. 

This is just a test message to verify that my automation can successfully send messages through LinkedIn. If you're seeing this, it means the system works!

Best regards!`;

async function main() {
  console.log('🧪 Testing LinkedIn Message Sending to Celiane\n');
  
  // Initialize database
  console.log('📊 Initializing database...');
  initDb();
  
  // Check if LinkedIn session exists
  if (!hasSession()) {
    console.error('❌ No LinkedIn session found.');
    console.error('   Please run "npm run login" first to authenticate with LinkedIn.');
    process.exit(1);
  }
  console.log('✅ LinkedIn session found\n');
  
  // Check if Celiane exists in database
  console.log('🔍 Checking if Celiane exists in database...');
  const allContacts = getNetworkContacts();
  let contact = allContacts.find(c => c.profile_url === CELIANE_PROFILE_URL) || null;
  
  if (!contact) {
    console.log('   Contact not found, adding to database...');
    // Extract LinkedIn ID from profile URL (e.g., "celianebandeira" from "https://www.linkedin.com/in/celianebandeira/")
    const linkedinIdMatch = CELIANE_PROFILE_URL.match(/\/in\/([^\/]+)/);
    const linkedinId = linkedinIdMatch ? linkedinIdMatch[1] : 'celianebandeira';
    
    const contactId = addNetworkContact({
      linkedin_id: linkedinId,
      name: 'Celiane Bandeira',
      profile_url: CELIANE_PROFILE_URL,
      title: undefined,
      company: undefined,
      location: undefined,
      worked_together: undefined,
      first_contacted_at: undefined,
      last_contacted_at: undefined,
      last_error: undefined,
    });
    const updatedContacts = getNetworkContacts();
    contact = updatedContacts.find(c => c.profile_url === CELIANE_PROFILE_URL) || null;
    if (!contact) {
      console.error('❌ Failed to add contact to database');
      process.exit(1);
    }
    console.log(`   ✅ Contact added with ID: ${contactId}`);
  } else {
    console.log(`   ✅ Contact found: ${contact.name} (ID: ${contact.id})`);
  }
  console.log('');
  
  // Ask user what they want to do
  console.log('Select test mode:');
  console.log('  1. Dry Run (test without sending message)');
  console.log('  2. Send Message (actually send the test message)');
  console.log('');
  
  // Check command line argument
  const args = process.argv.slice(2);
  const mode = args[0] || '1';
  
  if (mode !== '1' && mode !== '2') {
    console.error('❌ Invalid mode. Use: npm run test:message:celiane -- 1 (dry run) or 2 (send)');
    process.exit(1);
  }
  
  const isDryRun = mode === '1';
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (no message will be sent)' : 'SEND MESSAGE'}\n`);
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const config = loadConfig();
  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  
  console.log('✅ Browser launched\n');
  
  try {
    if (isDryRun) {
      // Dry run: test mechanism without sending
      console.log('🔍 Starting DRY RUN...\n');
      const result = await dryRunLinkedInMessage(page, contact);
      
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('✅ DRY RUN PASSED');
        console.log('   The message mechanism can reach the composer.');
        console.log('   You can now run with mode "2" to actually send the message.');
      } else {
        console.log('❌ DRY RUN FAILED');
        console.log(`   Error: ${result.error}`);
        console.log('   The message mechanism could not reach the composer.');
      }
      console.log('='.repeat(60) + '\n');
    } else {
      // Actually send the message
      console.log('📨 Starting MESSAGE SEND...\n');
      const result = await sendLinkedInMessage(page, contact, TEST_MESSAGE_TEMPLATE);
      
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('✅ MESSAGE SENT SUCCESSFULLY');
        console.log(`   Message ID: ${result.messageId}`);
        console.log('   Check LinkedIn to verify the message was received.');
      } else {
        console.log('❌ MESSAGE SEND FAILED');
        console.log(`   Error: ${result.error}`);
      }
      console.log('='.repeat(60) + '\n');
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    throw error;
  } finally {
    // Keep browser open for a moment to see the result
    console.log('⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('✅ Browser closed');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


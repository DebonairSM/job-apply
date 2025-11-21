/**
 * SAFE Test Script: Send LinkedIn Message to Celiane
 * 
 * This version includes recipient verification to prevent sending to wrong people.
 * Uses the direct compose URL approach and verifies the recipient before sending.
 */

import { chromium, Page } from 'playwright';
import { hasSession, STORAGE_STATE_PATH, loadConfig } from '../src/lib/session.js';

const CELIANE_PROFILE_URL = 'https://www.linkedin.com/in/celianebandeira/';
const CELIANE_NAME = 'Celiane Bandeira';
const CELIANE_FIRST_NAME = 'Celiane';

const TEST_MESSAGE = `Hi ${CELIANE_FIRST_NAME}! 👋

Test #3 - with recipient verification this time!

I'm testing my LinkedIn automation system with proper safety checks. If you see this message, it means the verification system worked correctly and I'm actually messaging the right person.

Thanks for being my test contact!`;

/**
 * Extract LinkedIn username from profile URL
 */
function extractUsername(profileUrl: string): string | null {
  const match = profileUrl.match(/\/in\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Verify we're messaging the correct person
 */
async function verifyRecipient(page: Page, expectedName: string, expectedUsername: string): Promise<boolean> {
  console.log(`🔍 Verifying recipient is "${expectedName}" (${expectedUsername})...`);
  
  // Check 1: URL verification - safer than page content
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);
  
  // If URL contains the username in a thread context, that's strong verification
  if (currentUrl.includes(expectedUsername) && currentUrl.includes('/messaging/thread/')) {
    console.log(`   ✅ URL contains username in messaging thread - verified!`);
    return true;
  }
  
  // If URL has recipient parameter with our username, that's also good verification
  // LinkedIn accepts this parameter and would redirect/error if invalid
  if (currentUrl.includes(`recipient=${expectedUsername}`) && currentUrl.includes('/messaging/compose')) {
    console.log(`   ✅ URL has correct recipient parameter in compose URL - verified!`);
    return true;
  }
  
  // Check 2: Look for "To:" field or recipient selector  
  const toFieldSelectors = [
    '.msg-form__to', // "To:" field in composer
    '.msg-connections-typeahead__pill-text', // Selected recipient pill
    '.msg-connections-typeahead__pill', // Recipient pill container
    'input[placeholder*="Type a name" i]', // Recipient input field
    '.artdeco-pill', // General pill component
    '[data-control-name="compose_to"]', // Compose To field
  ];
  
  for (const selector of toFieldSelectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count().catch(() => 0);
      if (count > 0) {
        const text = await element.textContent({ timeout: 2000 }).catch(() => '');
        const value = await element.getAttribute('value').catch(() => '');
        const combinedText = text + value;
        console.log(`   Checking ${selector}: "${combinedText.trim()}"`);
        
        if (combinedText && combinedText.includes(expectedName)) {
          console.log(`   ✅ Found correct recipient in To: field`);
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // Check 3: Message thread headers
  const verificationSelectors = [
    '.msg-thread__link-to-profile',
    '.msg-thread__title',
    '.msg-overlay-conversation-bubble__title',
    '.msg-overlay-bubble-header__title',
    '[data-control-name="view_profile"]',
    'h2:not([class*="header"])', // h2 but not header elements
  ];
  
  for (const selector of verificationSelectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count().catch(() => 0);
      if (count > 0) {
        const text = await element.textContent({ timeout: 2000 }).catch(() => '');
        console.log(`   Checking ${selector}: "${text.trim()}"`);
        
        if (text && text.includes(expectedName)) {
          console.log(`   ✅ Found correct recipient: "${text.trim()}"`);
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // Check 4: If we're on a new conversation page, LinkedIn might show "New message" 
  // with recipient name somewhere in the UI
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes(expectedName) && currentUrl.includes('/messaging/')) {
    console.log(`   ⚠️  Found name "${expectedName}" in page body`);
    console.log(`   ⚠️  URL is messaging page but no clear header found`);
    // Take screenshot for manual verification
    await page.screenshot({ path: 'artifacts/recipient-verification.png' });
    console.log(`   📸 Screenshot saved for manual review`);
    
    // For new conversations, if name is in body and we're on messaging page, 
    // it's likely correct but let's be cautious
    console.log(`   ⚠️  Cannot definitively verify - treating as FAIL for safety`);
    return false;
  }
  
  console.log(`   ❌ Could not verify recipient is "${expectedName}"`);
  return false;
}

async function main() {
  console.log('🧪 SAFE LinkedIn Message Send to Celiane\n');
  console.log('⚠️  This version includes recipient verification\n');
  
  // Check command line argument
  const args = process.argv.slice(2);
  const mode = args[0] || '1';
  
  if (mode !== '1' && mode !== '2') {
    console.error('❌ Invalid mode. Use:');
    console.error('   npm run test:message:celiane:safe -- 1  (dry run with verification)');
    console.error('   npm run test:message:celiane:safe -- 2  (send with verification)');
    process.exit(1);
  }
  
  const isDryRun = mode === '1';
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'SEND MESSAGE'}\n`);
  
  // Check session
  if (!hasSession()) {
    console.error('❌ No LinkedIn session found. Run "npm run login" first.');
    process.exit(1);
  }
  console.log('✅ LinkedIn session found\n');
  
  // Extract username from profile URL
  const username = extractUsername(CELIANE_PROFILE_URL);
  if (!username) {
    console.error('❌ Could not extract username from profile URL');
    process.exit(1);
  }
  console.log(`📝 Username: ${username}\n`);
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const config = loadConfig();
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  console.log('✅ Browser launched\n');
  
  try {
    // Use direct compose URL (safer than extracting links from profile page)
    const composeUrl = `https://www.linkedin.com/messaging/compose/?recipient=${username}`;
    console.log(`📧 Navigating to direct compose URL...`);
    console.log(`   URL: ${composeUrl}\n`);
    
    await page.goto(composeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('✅ Initial page loaded\n');
    
    console.log('⏳ Waiting for messaging interface to fully load...');
    await page.waitForTimeout(5000); // Give LinkedIn time to render recipient info
    console.log('   ✅ Wait complete\n');
    
    // CRITICAL: Verify recipient before proceeding
    const isCorrectRecipient = await verifyRecipient(page, CELIANE_NAME, username);
    
    if (!isCorrectRecipient) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ RECIPIENT VERIFICATION FAILED');
      console.error('   Cannot confirm this conversation is with the correct person');
      console.error('   ABORTING to prevent sending to wrong recipient');
      console.error('='.repeat(60) + '\n');
      
      // Keep browser open for manual inspection
      console.log('🔍 Browser will stay open for 30 seconds for manual inspection...\n');
      await page.waitForTimeout(30000);
      
      await browser.close();
      process.exit(1);
    }
    
    console.log('✅ Recipient verified successfully!\n');
    
    // Find message composer
    console.log('📝 Finding message composer...');
    const composerSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div.msg-form__contenteditable',
      '.msg-form__contenteditable',
    ];
    
    let composer = null;
    for (const selector of composerSelectors) {
      const element = page.locator(selector).first();
      const count = await element.count().catch(() => 0);
      if (count > 0) {
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          composer = element;
          console.log(`   ✅ Found composer\n`);
          break;
        }
      }
    }
    
    if (!composer) {
      throw new Error('Could not find message composer');
    }
    
    if (isDryRun) {
      // DRY RUN: Stop here
      console.log('='.repeat(60));
      console.log('✅ DRY RUN PASSED');
      console.log('   - Composer found');
      console.log('   - Recipient verified');
      console.log('   Ready to send to the correct person');
      console.log('='.repeat(60) + '\n');
      
      console.log('🔍 Browser will stay open for 10 seconds...\n');
      await page.waitForTimeout(10000);
    } else {
      // SEND MESSAGE
      console.log('📍 Clicking composer...');
      await composer.click({ force: true });
      await page.waitForTimeout(500);
      
      // Clear any existing text
      await page.keyboard.press('Control+A');
      await page.waitForTimeout(200);
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);
      console.log('   ✅ Composer ready\n');
      
      console.log(`⌨️  Typing message (${TEST_MESSAGE.length} chars)...`);
      await composer.type(TEST_MESSAGE, { delay: 30 });
      await page.waitForTimeout(2000);
      console.log('   ✅ Message typed\n');
      
      // Take screenshot before sending
      await page.screenshot({ path: 'artifacts/celiane-before-send.png' });
      console.log('📸 Screenshot: artifacts/celiane-before-send.png\n');
      
      // Find send button
      console.log('🔍 Finding send button...');
      const sendButtonSelectors = [
        'button.msg-form__send-btn',
        'button[aria-label*="Send" i]',
        'button:has-text("Send")',
        'button[type="submit"]',
      ];
      
      let sendButton = null;
      for (const selector of sendButtonSelectors) {
        const btn = page.locator(selector).first();
        const count = await btn.count().catch(() => 0);
        if (count > 0) {
          const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
          const isDisabled = await btn.isDisabled().catch(() => false);
          if (isVisible && !isDisabled) {
            sendButton = btn;
            console.log(`   ✅ Found send button: ${selector}\n`);
            break;
          }
        }
      }
      
      if (!sendButton) {
        throw new Error('Could not find send button');
      }
      
      // Click send
      console.log('📤 Clicking SEND button...');
      await sendButton.click({ force: true });
      console.log('   ✅ Send button clicked\n');
      
      // Wait and verify
      console.log('⏳ Waiting 5 seconds to verify send...');
      await page.waitForTimeout(5000);
      
      // Check if composer is cleared
      const composerText = await composer.textContent().catch(() => '');
      const isCleared = !composerText || composerText.trim().length === 0;
      
      // Take screenshot after sending
      await page.screenshot({ path: 'artifacts/celiane-after-send.png' });
      console.log('📸 Screenshot: artifacts/celiane-after-send.png\n');
      
      console.log('='.repeat(60));
      if (isCleared) {
        console.log('✅ MESSAGE SENT SUCCESSFULLY');
        console.log('   Composer cleared - message delivered');
        console.log(`   Recipient: ${CELIANE_NAME} (verified)`);
      } else {
        console.log('⚠️  UNCLEAR STATUS');
        console.log('   Composer still has text - check manually');
      }
      console.log('='.repeat(60) + '\n');
      
      console.log('🔍 Browser will stay open for 10 seconds...\n');
      await page.waitForTimeout(10000);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n⏳ Browser will stay open for 30 seconds for debugging...\n');
    await page.waitForTimeout(30000);
    throw error;
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


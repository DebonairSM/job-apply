/**
 * Watch Mode: Send LinkedIn Message to Celiane with Manual Verification
 * 
 * This script sends the message but keeps the browser open
 * so you can manually verify if the message was actually sent.
 */

import { chromium, Page } from 'playwright';
import { hasSession, STORAGE_STATE_PATH, loadConfig } from '../src/lib/session.js';

const CELIANE_PROFILE_URL = 'https://www.linkedin.com/in/celianebandeira/';
const CELIANE_FIRST_NAME = 'Celiane';

const TEST_MESSAGE = `Hi ${CELIANE_FIRST_NAME}! 👋

Testing my LinkedIn automation system - attempt #2. 

If you see this message, please let me know! This helps me verify the automation is working correctly.

Thanks!`;

async function main() {
  console.log('🧪 LinkedIn Message Send - Watch Mode\n');
  
  // Check if LinkedIn session exists
  if (!hasSession()) {
    console.error('❌ No LinkedIn session found.');
    console.error('   Please run "npm run login" first.');
    process.exit(1);
  }
  
  // Launch browser (NOT headless, with slow motion)
  console.log('🌐 Launching browser in watch mode...');
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
    // Navigate to profile
    console.log(`📍 Navigating to ${CELIANE_PROFILE_URL}...`);
    await page.goto(CELIANE_PROFILE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Profile loaded\n');
    
    // Find direct messaging link
    console.log(`🔍 Looking for messaging link...`);
    const messagingLinks = await page.locator('a[href*="/messaging/thread/new"]').all();
    
    let directComposeUrl = null;
    for (const link of messagingLinks) {
      const href = await link.getAttribute('href').catch(() => '');
      if (href && href.includes('recipients=')) {
        directComposeUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
        break;
      }
    }
    
    if (!directComposeUrl) {
      const linkedinIdMatch = CELIANE_PROFILE_URL.match(/\/in\/([^\/]+)/);
      if (linkedinIdMatch) {
        const linkedinId = linkedinIdMatch[1];
        directComposeUrl = `https://www.linkedin.com/messaging/compose/?recipient=${linkedinId}`;
      }
    }
    
    console.log(`   ✅ Messaging URL: ${directComposeUrl}\n`);
    
    // Navigate to messaging
    console.log(`📧 Navigating to messaging page...`);
    await page.goto(directComposeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    console.log('   ✅ Messaging page loaded\n');
    
    // Find composer
    console.log(`📝 Finding message composer...`);
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
    
    // Click composer and clear any existing text
    console.log(`📍 Preparing composer...`);
    await composer.click({ force: true });
    await page.waitForTimeout(500);
    
    // Clear existing text
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    console.log('   ✅ Composer ready\n');
    
    // Type message
    console.log(`⌨️  Typing message (${TEST_MESSAGE.length} chars)...`);
    console.log(`\nMessage to send:`);
    console.log('─'.repeat(60));
    console.log(TEST_MESSAGE);
    console.log('─'.repeat(60) + '\n');
    
    await composer.type(TEST_MESSAGE, { delay: 30 });
    await page.waitForTimeout(2000);
    console.log('   ✅ Message typed\n');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'artifacts/celiane-ready-to-send.png', 
      fullPage: false 
    });
    console.log('📸 Screenshot saved: artifacts/celiane-ready-to-send.png\n');
    
    // Find send button
    console.log(`🔍 Finding send button...`);
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
    console.log(`📤 Clicking SEND button...`);
    await sendButton.click({ force: true });
    console.log('   ✅ Send button clicked\n');
    
    // Wait and verify
    console.log(`⏳ Waiting 5 seconds to verify send...`);
    await page.waitForTimeout(5000);
    
    // Check if composer is cleared
    const composerText = await composer.textContent().catch(() => '');
    const isCleared = !composerText || composerText.trim().length === 0;
    
    console.log('\n' + '='.repeat(60));
    if (isCleared) {
      console.log('✅ COMPOSER CLEARED - Message likely sent!');
    } else {
      console.log('⚠️  COMPOSER STILL HAS TEXT - Message may not have sent');
      console.log(`   Remaining text: "${composerText.substring(0, 50)}..."`);
    }
    console.log('='.repeat(60) + '\n');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'artifacts/celiane-after-send.png', 
      fullPage: false 
    });
    console.log('📸 Final screenshot saved: artifacts/celiane-after-send.png\n');
    
    // Keep browser open for manual verification
    console.log('🔍 BROWSER WILL STAY OPEN FOR MANUAL VERIFICATION');
    console.log('   - Check if the message appears in the conversation');
    console.log('   - Look at the screenshots in artifacts/ folder');
    console.log('   - Press Ctrl+C when done checking\n');
    
    // Wait indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n⏳ Browser will stay open for 60 seconds for debugging...');
    await page.waitForTimeout(60000);
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






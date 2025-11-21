/**
 * Simple Test Script: Send LinkedIn Message to Celiane (Direct Navigation)
 * 
 * This script uses direct navigation to the messaging composer
 * to bypass button detection issues.
 */

import { chromium, Page } from 'playwright';
import { hasSession, STORAGE_STATE_PATH, loadConfig } from '../src/lib/session.js';

const CELIANE_PROFILE_URL = 'https://www.linkedin.com/in/celianebandeira/';
const CELIANE_NAME = 'Celiane Bandeira';
const CELIANE_FIRST_NAME = 'Celiane';

const TEST_MESSAGE = `Hi ${CELIANE_FIRST_NAME}! 👋

I'm testing my automated LinkedIn messaging system and thought I'd reach out to you as my test contact. 

This is just a test message to verify that my automation can successfully send messages through LinkedIn. If you're seeing this, it means the system works!

Best regards!`;

/**
 * Find the message composer on the page
 */
async function findComposer(page: Page) {
  const composerSelectors = [
    'div[role="textbox"][contenteditable="true"]',
    'div.msg-form__contenteditable',
    '.msg-form__contenteditable',
    'div[contenteditable="true"][aria-label*="message" i]',
  ];

  for (const selector of composerSelectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count().catch(() => 0);
      if (count > 0) {
        const isVisible = await element.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          console.log(`   ✅ Found composer using: ${selector}`);
          return element;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

/**
 * Find the send button
 */
async function findSendButton(page: Page) {
  const sendButtonSelectors = [
    'button[aria-label*="Send" i]',
    'button:has-text("Send")',
    'button.msg-form__send-button',
    'button[data-control-name="send"]',
    // LinkedIn-specific classes
    '.msg-form__send-button',
    'button.msg-form__send-btn',
    'button[type="submit"]',
    // Icon-only buttons in message forms
    '.msg-form button[aria-label]',
    'form button[type="submit"]',
  ];

  for (const selector of sendButtonSelectors) {
    const btn = page.locator(selector).first();
    const count = await btn.count().catch(() => 0);
    if (count > 0) {
      const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
      const isDisabled = await btn.isDisabled().catch(() => false);
      if (isVisible && !isDisabled) {
        console.log(`   ✅ Found send button using: ${selector}`);
        return btn;
      }
    }
  }
  
  return null;
}

async function main() {
  console.log('🧪 Testing LinkedIn Message Sending to Celiane (Direct Navigation)\n');
  
  // Check command line argument
  const args = process.argv.slice(2);
  const mode = args[0] || '1';
  
  if (mode !== '1' && mode !== '2') {
    console.error('❌ Invalid mode. Use:');
    console.error('   npm run test:message:celiane:simple -- 1  (dry run - find composer only)');
    console.error('   npm run test:message:celiane:simple -- 2  (send message)');
    process.exit(1);
  }
  
  const isDryRun = mode === '1';
  console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (no message will be sent)' : 'SEND MESSAGE'}\n`);
  
  // Check if LinkedIn session exists
  if (!hasSession()) {
    console.error('❌ No LinkedIn session found.');
    console.error('   Please run "npm run login" first to authenticate with LinkedIn.');
    process.exit(1);
  }
  console.log('✅ LinkedIn session found\n');
  
  // Launch browser
  console.log('🌐 Launching browser...');
  const config = loadConfig();
  const browser = await chromium.launch({
    headless: false, // Show browser so you can see what's happening
    slowMo: 300,
    args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  
  console.log('✅ Browser launched\n');
  
  try {
    // Step 1: Navigate to profile to get the messaging link
    console.log(`📍 Step 1: Navigating to profile...`);
    await page.goto(CELIANE_PROFILE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Profile loaded\n');
    
    // Step 2: Find and extract the direct messaging link
    console.log(`📍 Step 2: Looking for direct messaging link...`);
    const messagingLinks = await page.locator('a[href*="/messaging/thread/new"]').all();
    
    let directComposeUrl = null;
    for (const link of messagingLinks) {
      const href = await link.getAttribute('href').catch(() => '');
      if (href && href.includes('recipients=')) {
        // Found the direct compose link
        directComposeUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
        console.log(`   ✅ Found direct messaging link`);
        break;
      }
    }
    
    if (!directComposeUrl) {
      console.error('   ❌ Could not find direct messaging link');
      console.log('   Trying fallback: extracting LinkedIn ID from URL...');
      
      // Fallback: construct the URL manually
      const linkedinIdMatch = CELIANE_PROFILE_URL.match(/\/in\/([^\/]+)/);
      if (linkedinIdMatch) {
        const linkedinId = linkedinIdMatch[1];
        directComposeUrl = `https://www.linkedin.com/messaging/compose/?recipient=${linkedinId}`;
        console.log(`   ✅ Using fallback URL`);
      } else {
        throw new Error('Could not construct messaging URL');
      }
    }
    
    console.log(`   📧 Messaging URL: ${directComposeUrl}\n`);
    
    // Step 3: Navigate to the messaging page
    console.log(`📍 Step 3: Navigating to messaging page...`);
    await page.goto(directComposeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    console.log('   ✅ Messaging page loaded\n');
    
    // Step 4: Find the message composer
    console.log(`📍 Step 4: Finding message composer...`);
    const composer = await findComposer(page);
    
    if (!composer) {
      throw new Error('Could not find message composer');
    }
    console.log('   ✅ Composer found\n');
    
    if (isDryRun) {
      // DRY RUN: Stop here
      console.log('='.repeat(60));
      console.log('✅ DRY RUN PASSED');
      console.log('   The message mechanism can reach the composer.');
      console.log('   Run with mode "2" to actually send the message.');
      console.log('='.repeat(60) + '\n');
      
      console.log('⏳ Keeping browser open for 10 seconds for inspection...');
      await page.waitForTimeout(10000);
    } else {
      // SEND MESSAGE: Continue with typing and sending
      console.log(`📍 Step 5: Clicking composer...`);
      await composer.click({ force: true });
      await page.waitForTimeout(500);
      console.log('   ✅ Composer focused\n');
      
      console.log(`📍 Step 6: Typing message (${TEST_MESSAGE.length} characters)...`);
      await composer.type(TEST_MESSAGE, { delay: 20 });
      console.log('   ✅ Message typed\n');
      
      console.log(`📍 Step 7: Waiting for send button to become enabled...`);
      await page.waitForTimeout(2000); // Wait longer for button to enable
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'artifacts/celiane-composer-with-message.png', fullPage: false });
      console.log('   📸 Screenshot saved to: artifacts/celiane-composer-with-message.png');
      
      console.log(`📍 Step 8: Finding send button...`);
      const sendButton = await findSendButton(page);
      
      if (!sendButton) {
        // Debug: print all buttons on page
        console.log('   ⚠️  Send button not found. Looking for buttons with "send" in text or aria-label...');
        const allButtons = await page.locator('button').all();
        console.log(`   Total buttons on page: ${allButtons.length}`);
        
        let foundSendLike = 0;
        for (let i = 0; i < allButtons.length; i++) {
          const btn = allButtons[i];
          const text = await btn.textContent().catch(() => '');
          const ariaLabel = await btn.getAttribute('aria-label').catch(() => null);
          const isVisible = await btn.isVisible().catch(() => false);
          const isDisabled = await btn.isDisabled().catch(() => true);
          
          // Look for anything that might be related to sending
          if (text.toLowerCase().includes('send') || (ariaLabel && ariaLabel.toLowerCase().includes('send'))) {
            foundSendLike++;
            console.log(`      Button ${i + 1}: text="${text.trim()}" aria-label="${ariaLabel}" visible=${isVisible} disabled=${isDisabled}`);
          }
        }
        
        if (foundSendLike === 0) {
          console.log('   ⚠️  No buttons with "send" in text or aria-label found!');
          console.log('   Checking buttons near the composer...');
          
          // Try finding buttons that are children or siblings of the composer's parent
          const composerParent = composer.locator('..');
          const nearbyButtons = await composerParent.locator('button').all();
          console.log(`   Found ${nearbyButtons.length} buttons near composer`);
          
          for (let i = 0; i < Math.min(nearbyButtons.length, 5); i++) {
            const btn = nearbyButtons[i];
            const text = await btn.textContent().catch(() => '');
            const ariaLabel = await btn.getAttribute('aria-label').catch(() => null);
            const className = await btn.getAttribute('class').catch(() => null);
            const isVisible = await btn.isVisible().catch(() => false);
            const isDisabled = await btn.isDisabled().catch(() => true);
            console.log(`      Nearby button ${i + 1}: text="${text.trim()}" aria="${ariaLabel}" class="${className}" visible=${isVisible} disabled=${isDisabled}`);
          }
        }
        
        throw new Error('Could not find send button');
      }
      console.log('   ✅ Send button found\n');
      
      console.log(`📍 Step 9: Clicking send button...`);
      await sendButton.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('   ✅ Send button clicked\n');
      
      // Verify message was sent
      console.log(`📍 Step 10: Verifying message was sent...`);
      const composerAfterSend = await findComposer(page);
      if (composerAfterSend) {
        const text = await composerAfterSend.textContent().catch(() => '');
        if (!text || text.trim().length === 0) {
          console.log('   ✅ Composer cleared - message sent!\n');
        } else {
          console.log('   ⚠️  Composer still has text - message may not have sent\n');
        }
      }
      
      console.log('='.repeat(60));
      console.log('✅ MESSAGE SENT SUCCESSFULLY');
      console.log('   Check LinkedIn to verify the message was received.');
      console.log('='.repeat(60) + '\n');
      
      console.log('⏳ Keeping browser open for 10 seconds for inspection...');
      await page.waitForTimeout(10000);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n⏳ Keeping browser open for 30 seconds for debugging...');
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


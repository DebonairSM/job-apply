/**
 * Debug Script: Check Celiane's LinkedIn Profile
 * 
 * This script opens Celiane's profile and takes a screenshot
 * to help debug what buttons are actually available.
 */

import { chromium } from 'playwright';
import { hasSession, STORAGE_STATE_PATH, loadConfig } from '../src/lib/session.js';

const CELIANE_PROFILE_URL = 'https://www.linkedin.com/in/celianebandeira/';

async function main() {
  console.log('🔍 Debugging Celiane\'s LinkedIn Profile\n');
  
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
    headless: false, // Always show browser for debugging
    slowMo: 500,
    args: ['--disable-extensions', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  
  console.log('✅ Browser launched\n');
  
  try {
    console.log(`📍 Navigating to: ${CELIANE_PROFILE_URL}`);
    await page.goto(CELIANE_PROFILE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    
    console.log('✅ Page loaded\n');
    
    // Take screenshot
    const screenshot = 'artifacts/celiane-profile-debug.png';
    await page.screenshot({ path: screenshot, fullPage: false });
    console.log(`📸 Screenshot saved to: ${screenshot}\n`);
    
    // Check connection status
    console.log('🔍 Checking connection status...');
    
    // Look for connection badge/indicator
    const connectionIndicators = [
      'span:has-text("1st")',
      'span:has-text("2nd")',
      'span:has-text("3rd")',
      'button:has-text("Connect")',
      'button:has-text("Follow")',
      'button:has-text("Pending")',
    ];
    
    for (const indicator of connectionIndicators) {
      const element = page.locator(indicator).first();
      const count = await element.count().catch(() => 0);
      if (count > 0) {
        const text = await element.textContent().catch(() => '');
        console.log(`   Found: ${indicator} - "${text}"`);
      }
    }
    
    console.log('');
    
    // Check for message buttons
    console.log('🔍 Checking for message buttons...');
    const allButtons = await page.locator('button').all();
    console.log(`   Found ${allButtons.length} total buttons on page`);
    
    let messageButtonCount = 0;
    for (const button of allButtons) {
      const text = await button.textContent().catch(() => '');
      if (text && text.toLowerCase().includes('message')) {
        messageButtonCount++;
        const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
        const className = await button.getAttribute('class').catch(() => null);
        const href = await button.getAttribute('href').catch(() => null);
        
        console.log(`\n   Message Button #${messageButtonCount}:`);
        console.log(`      Text: "${text}"`);
        console.log(`      Aria-label: ${ariaLabel || 'none'}`);
        console.log(`      Class: ${className || 'none'}`);
        console.log(`      Href: ${href || 'none'}`);
        
        // Check for SVG icon
        const svgIcon = await button.locator('svg').first();
        const svgCount = await svgIcon.count().catch(() => 0);
        if (svgCount > 0) {
          const svgDataIcon = await svgIcon.getAttribute('data-test-icon').catch(() => null);
          console.log(`      SVG Icon: ${svgDataIcon || 'unknown'}`);
        }
      }
    }
    
    if (messageButtonCount === 0) {
      console.log('   ⚠️  No message buttons found!');
    }
    
    console.log('\n');
    console.log('🔍 Checking for direct messaging link...');
    const messagingLinks = await page.locator('a[href*="/messaging/"]').all();
    console.log(`   Found ${messagingLinks.length} messaging links`);
    
    for (let i = 0; i < messagingLinks.length && i < 3; i++) {
      const link = messagingLinks[i];
      const href = await link.getAttribute('href').catch(() => '');
      const text = await link.textContent().catch(() => '');
      console.log(`   Link #${i + 1}: href="${href}", text="${text}"`);
    }
    
    console.log('\n📌 Keep the browser open to manually inspect the page.');
    console.log('   Look for the Message button and try clicking it manually.');
    console.log('   Press Ctrl+C when done.\n');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    // This will only run if the script is interrupted
    await browser.close();
    console.log('✅ Browser closed');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});






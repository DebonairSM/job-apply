/**
 * Test script to compare different message entry methods for LinkedIn
 * 
 * Tests two approaches:
 * 1. Type character-by-character with Shift+Enter for line breaks (current)
 * 2. Paste entire message and hit Enter (faster if it works)
 */

import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_STATE_PATH = path.join(__dirname, '../storage/storageState.json');

// Test message with multiple paragraphs
const TEST_MESSAGE = `Hi! This is a test message.

This is the second paragraph with some details.

And here's a third paragraph to make sure multi-line works correctly.

Best regards!`;

async function findMessageComposer(page: Page) {
  const composerSelectors = [
    'div[role="textbox"][contenteditable="true"]',
    'div.msg-form__contenteditable',
    '.msg-form__contenteditable',
  ];

  for (const selector of composerSelectors) {
    try {
      const element = page.locator(selector).first();
      const count = await element.count();
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

async function testTypingMethod(page: Page, composer: any, message: string) {
  console.log('\n📝 Testing METHOD 1: Character-by-character typing with Shift+Enter');
  console.log('─'.repeat(60));
  
  // Click and clear composer
  await composer.click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);
  
  // Type message parts with Shift+Enter for line breaks
  const messageParts = message.split('\n');
  const startTime = Date.now();
  
  for (let i = 0; i < messageParts.length; i++) {
    const part = messageParts[i];
    
    if (part.length > 0) {
      await composer.type(part, { delay: 20 });
    }
    
    if (i < messageParts.length - 1) {
      await page.keyboard.press('Shift+Enter');
      await page.waitForTimeout(100);
    }
  }
  
  const typingTime = Date.now() - startTime;
  await page.waitForTimeout(1000);
  
  // Get the entered text
  const enteredText = await composer.textContent();
  console.log(`   ⏱️  Time taken: ${typingTime}ms`);
  console.log(`   📏 Message length: ${message.length} chars`);
  console.log(`   ✅ Message entered successfully`);
  console.log(`   📝 First 100 chars: "${enteredText?.substring(0, 100)}..."`);
  
  return {
    method: 'typing',
    time: typingTime,
    success: true,
    enteredText,
  };
}

async function testPasteMethod(page: Page, composer: any, message: string) {
  console.log('\n📋 Testing METHOD 2: Paste entire message');
  console.log('─'.repeat(60));
  
  // Click and clear composer
  await composer.click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);
  
  const startTime = Date.now();
  
  try {
    // Method 2a: Use fill() - fastest if it works
    console.log('   Trying fill() method...');
    await composer.fill(message);
    await page.waitForTimeout(1000);
    
    const pasteTime = Date.now() - startTime;
    const enteredText = await composer.textContent();
    
    console.log(`   ⏱️  Time taken: ${pasteTime}ms`);
    console.log(`   📏 Message length: ${message.length} chars`);
    console.log(`   ✅ Message pasted successfully`);
    console.log(`   📝 First 100 chars: "${enteredText?.substring(0, 100)}..."`);
    
    return {
      method: 'paste-fill',
      time: pasteTime,
      success: true,
      enteredText,
    };
  } catch (fillError) {
    console.log(`   ⚠️  fill() failed: ${fillError instanceof Error ? fillError.message : String(fillError)}`);
    
    // Method 2b: Fallback to clipboard paste
    console.log('   Trying clipboard paste method...');
    try {
      // Set clipboard and paste
      await page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, message);
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+V');
      await page.waitForTimeout(1000);
      
      const pasteTime = Date.now() - startTime;
      const enteredText = await composer.textContent();
      
      console.log(`   ⏱️  Time taken: ${pasteTime}ms`);
      console.log(`   📏 Message length: ${message.length} chars`);
      console.log(`   ✅ Message pasted successfully`);
      console.log(`   📝 First 100 chars: "${enteredText?.substring(0, 100)}..."`);
      
      return {
        method: 'paste-clipboard',
        time: pasteTime,
        success: true,
        enteredText,
      };
    } catch (clipboardError) {
      console.log(`   ❌ Clipboard paste failed: ${clipboardError instanceof Error ? clipboardError.message : String(clipboardError)}`);
      return {
        method: 'paste-clipboard',
        time: 0,
        success: false,
        error: clipboardError instanceof Error ? clipboardError.message : String(clipboardError),
      };
    }
  }
}

async function main() {
  console.log('🚀 LinkedIn Message Entry Method Test');
  console.log('═'.repeat(60));
  console.log('\nThis script tests two ways to enter messages into LinkedIn composer:');
  console.log('1. Type character-by-character (current method)');
  console.log('2. Paste entire message (faster alternative)');
  console.log('\n⚠️  NOTE: Messages will NOT be sent - we stop before pressing Enter');
  console.log('═'.repeat(60));
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser with storage state (logged in session)
    console.log('\n🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Show browser so we can see what's happening
    });
    
    const context = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      viewport: { width: 1280, height: 720 },
    });
    
    const page = await context.newPage();
    
    // Navigate to LinkedIn messaging (use a compose URL)
    console.log('📧 Navigating to LinkedIn messaging...');
    // Note: You'll need to provide a valid LinkedIn username here
    console.log('⚠️  Please provide a LinkedIn username to test with');
    console.log('   Example: https://www.linkedin.com/messaging/compose/?recipient=USERNAME');
    console.log('\n   For now, navigating to messaging home...');
    
    await page.goto('https://www.linkedin.com/messaging/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    
    // Find message composer
    console.log('\n🔍 Looking for message composer...');
    const composer = await findMessageComposer(page);
    
    if (!composer) {
      console.log('❌ Could not find message composer');
      console.log('   Please manually open a conversation and run this script again');
      console.log('   OR provide a compose URL with a recipient');
      await page.waitForTimeout(10000); // Give time to manually open a conversation
      return;
    }
    
    console.log('✅ Message composer found!');
    
    // Test Method 1: Typing
    const result1 = await testTypingMethod(page, composer, TEST_MESSAGE);
    await page.waitForTimeout(2000);
    
    // Test Method 2: Pasting
    const result2 = await testPasteMethod(page, composer, TEST_MESSAGE);
    await page.waitForTimeout(2000);
    
    // Compare results
    console.log('\n📊 COMPARISON');
    console.log('═'.repeat(60));
    console.log(`Method 1 (Typing):  ${result1.time}ms`);
    console.log(`Method 2 (${result2.method}): ${result2.time}ms`);
    
    if (result1.success && result2.success) {
      const speedup = ((result1.time - result2.time) / result1.time * 100).toFixed(1);
      console.log(`\n⚡ Method 2 is ${speedup}% faster!`);
      
      // Check if content matches
      const text1 = result1.enteredText?.replace(/\s+/g, ' ').trim();
      const text2 = result2.enteredText?.replace(/\s+/g, ' ').trim();
      const messageNormalized = TEST_MESSAGE.replace(/\s+/g, ' ').trim();
      
      if (text1 === messageNormalized && text2 === messageNormalized) {
        console.log('✅ Both methods entered the complete message correctly');
        console.log('\n🎯 RECOMMENDATION: Use paste method for production');
      } else {
        console.log('⚠️  Content differences detected');
        console.log(`   Method 1 match: ${text1 === messageNormalized}`);
        console.log(`   Method 2 match: ${text2 === messageNormalized}`);
      }
    }
    
    console.log('\n✅ Test complete! Browser will stay open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { STORAGE_STATE_PATH } from '../lib/session.js';
import { loadConfig } from '../lib/session.js';
import * as readline from 'readline';

export async function loginCommand(): Promise<void> {
  const config = loadConfig();

  // Ensure storage directory exists
  const storageDir = dirname(STORAGE_STATE_PATH);
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
  }

  console.log('🔐 Starting LinkedIn login...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: config.slowMo
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('📱 Opening LinkedIn login page...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  console.log('\n✋ Please log in manually in the browser window.');
  console.log('   - Enter your credentials');
  console.log('   - Complete 2FA if prompted');
  console.log('   - Wait until you see your LinkedIn homepage');
  console.log('\n⌨️  Press ENTER in this terminal when you are fully logged in...\n');

  // Wait for user to press ENTER
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('line', () => {
      rl.close();
      resolve();
    });
  });

  // Verify login by checking for profile elements
  try {
    await page.waitForSelector('.global-nav__me-photo, .global-nav__me, img[alt*="profile"]', {
      timeout: 5000
    });
    console.log('✅ Login verified!');
  } catch (error) {
    console.warn('⚠️  Could not verify login, but proceeding anyway...');
  }

  // Save session state
  console.log('💾 Saving session...');
  await context.storageState({ path: STORAGE_STATE_PATH });

  await browser.close();

  console.log(`\n✨ Session saved to: ${STORAGE_STATE_PATH}`);
  console.log('   You can now run search and apply commands without logging in again.\n');
}

// Run if called directly
const scriptPath = process.argv[1].replace(/\\/g, '/');
const isMainModule = import.meta.url.endsWith(scriptPath) || import.meta.url.includes('/commands/login.ts');

if (isMainModule) {
  loginCommand().catch(error => {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  });
}



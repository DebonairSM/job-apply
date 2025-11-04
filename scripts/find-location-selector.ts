/**
 * Find the correct selector for location field
 */

import { chromium } from 'playwright';
import { hasSession, STORAGE_STATE_PATH } from '../src/lib/session.js';

async function findLocationSelector() {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  try {
    const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';
    
    console.log('📄 Navigating...');
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.waitForSelector('div.search-results-container', { timeout: 10000 });

    const card = page.locator('div.search-results-container ul > li').first();
    
    console.log('\n🔍 Analyzing card structure for title and location...\n');

    // Get all div elements with t-14 or t-black classes and their siblings
    const structure = await card.evaluate(cardEl => {
      const results: Array<{ classes: string; text: string; parent: string }> = [];
      
      const allDivs = cardEl.querySelectorAll('div');
      allDivs.forEach(div => {
        const text = div.textContent?.trim() || '';
        const classes = div.className;
        
        // Only show divs with meaningful text (not too long, not empty)
        if (text.length > 0 && text.length < 100 && !text.includes('\n')) {
          const parent = div.parentElement?.className || 'unknown';
          results.push({
            classes,
            text: text.substring(0, 80),
            parent: parent.substring(0, 50)
          });
        }
      });
      
      return results;
    });

    console.log('📋 Potential field containers:');
    structure.forEach((item, idx) => {
      if (item.text && !item.text.includes('View') && !item.text.includes('degree')) {
        console.log(`\n[${idx + 1}]`);
        console.log(`   Classes: ${item.classes}`);
        console.log(`   Parent: ${item.parent}`);
        console.log(`   Text: "${item.text}"`);
      }
    });

    // Test specific patterns
    console.log('\n\n🎯 Testing specific selectors:\n');
    
    const tests = [
      { name: 'Title (t-14.t-black)', selector: 'div.t-14.t-black' },
      { name: 'Title (t-14 only)', selector: 'div.t-14' },
      { name: 'Location (t-12.t-black--light)', selector: 'div.t-12.t-black--light' },
      { name: 'Location (t-12.t-normal)', selector: 'div.t-12.t-normal' },
      { name: 'All t-12', selector: 'div.t-12' }
    ];

    for (const test of tests) {
      const elements = card.locator(test.selector);
      const count = await elements.count();
      
      console.log(`${test.name}:`);
      console.log(`   Count: ${count}`);
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const text = await elements.nth(i).innerText({ timeout: 1000 }).catch(() => 'error');
          const shortText = text.split('\n')[0].substring(0, 60);
          console.log(`   [${i}] "${shortText}"`);
        }
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

findLocationSelector().catch(console.error);


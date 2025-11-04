/**
 * LinkedIn Card Field Diagnostic Tool
 * 
 * Purpose: Identify current selectors for extracting name, title, company, 
 *          and location from LinkedIn People Search result cards
 * 
 * Usage: npx tsx scripts/diagnose-card-fields.ts
 */

import { chromium } from 'playwright';
import { hasSession, STORAGE_STATE_PATH } from '../src/lib/session.js';

async function diagnoseCardFields() {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  console.log('🔍 Diagnosing LinkedIn card field selectors...\n');

  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH
  });

  const page = await context.newPage();

  try {
    const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';
    
    console.log('📄 Navigating to People Search...');
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    await page.waitForSelector('ul.reusables-search-results__list, div.search-results-container', {
      timeout: 10000
    });

    console.log('✅ Page loaded\n');

    // Find a profile card using the current working selector
    const bestSelector = 'div.search-results-container ul > li';
    const card = page.locator(bestSelector).first();
    
    console.log('🔍 Analyzing first profile card...\n');

    // Get the card's HTML structure
    const cardHTML = await card.evaluate(el => {
      return {
        innerHTML: el.innerHTML.substring(0, 500),
        outerHTML: el.outerHTML.substring(0, 500)
      };
    });

    console.log('📊 Card HTML preview:');
    console.log(cardHTML.outerHTML);
    console.log('\n---\n');

    // Test various selectors for name
    console.log('👤 Testing NAME selectors:');
    const nameSelectors = [
      'span[dir="ltr"] span[aria-hidden="true"]',
      'div[class*="entity-result"] span[aria-hidden="true"]',
      'a[href*="/in/"] span[aria-hidden="true"]',
      'span[aria-hidden="true"]',
      '.entity-result__title-text span[aria-hidden="true"]'
    ];

    for (const selector of nameSelectors) {
      const elem = card.locator(selector).first();
      const count = await elem.count();
      if (count > 0) {
        const text = await elem.innerText({ timeout: 1000 }).catch(() => null);
        console.log(`   ✅ ${selector}`);
        console.log(`      Text: "${text}"`);
      } else {
        console.log(`   ❌ ${selector} - not found`);
      }
    }

    // Test selectors for title/occupation
    console.log('\n💼 Testing TITLE/OCCUPATION selectors:');
    const titleSelectors = [
      'div[class*="entity-result__primary-subtitle"]',
      'div[class*="result__primary-subtitle"]',
      'div.entity-result__primary-subtitle',
      '[class*="primary-subtitle"]',
      'div.t-14',
      'div.t-black'
    ];

    for (const selector of titleSelectors) {
      const elem = card.locator(selector).first();
      const count = await elem.count();
      if (count > 0) {
        const text = await elem.innerText({ timeout: 1000 }).catch(() => null);
        console.log(`   ✅ ${selector}`);
        console.log(`      Text: "${text}"`);
      } else {
        console.log(`   ❌ ${selector} - not found`);
      }
    }

    // Test selectors for location
    console.log('\n📍 Testing LOCATION selectors:');
    const locationSelectors = [
      'div[class*="entity-result__secondary-subtitle"]',
      'div[class*="secondary-subtitle"]',
      'div.entity-result__secondary-subtitle',
      '[class*="secondary-subtitle"]',
      'div.t-12',
      'div.t-black--light'
    ];

    for (const selector of locationSelectors) {
      const elem = card.locator(selector).first();
      const count = await elem.count();
      if (count > 0) {
        const text = await elem.innerText({ timeout: 1000 }).catch(() => null);
        console.log(`   ✅ ${selector}`);
        console.log(`      Text: "${text}"`);
      } else {
        console.log(`   ❌ ${selector} - not found`);
      }
    }

    // Analyze all text-bearing elements within the card
    console.log('\n📋 All text elements in card:');
    const allTexts = await card.evaluate(cardEl => {
      const results: Array<{ selector: string; text: string }> = [];
      
      function getSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        if (el.className) {
          const classes = Array.from(el.classList).slice(0, 2).join('.');
          if (classes) return `.${classes}`;
        }
        return el.tagName.toLowerCase();
      }
      
      function traverse(el: Element) {
        if (el.children.length === 0 && el.textContent && el.textContent.trim()) {
          results.push({
            selector: getSelector(el),
            text: el.textContent.trim()
          });
        }
        for (const child of Array.from(el.children)) {
          traverse(child);
        }
      }
      
      traverse(cardEl);
      return results;
    });

    allTexts.forEach((item, idx) => {
      if (idx < 10) { // Show first 10 only
        console.log(`   [${idx + 1}] ${item.selector}: "${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''}"`);
      }
    });

    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'artifacts/linkedin-card-analysis.png', fullPage: true });
    console.log('   Saved to: artifacts/linkedin-card-analysis.png');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

diagnoseCardFields().catch(console.error);


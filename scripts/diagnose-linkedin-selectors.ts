/**
 * LinkedIn Selector Diagnostic Tool
 * 
 * Purpose: Identify current LinkedIn People Search selectors when the scraper
 *          stops finding profiles (usually after LinkedIn UI changes)
 * 
 * Usage: npx tsx scripts/diagnose-linkedin-selectors.ts
 * 
 * Output: 
 * - Tests multiple potential selectors
 * - Reports element counts and characteristics
 * - Takes screenshot to artifacts/linkedin-people-search.png
 * - Shows page structure details
 * 
 * Requirements: Must have valid LinkedIn session (run npm run login first)
 */

import { chromium } from 'playwright';
import { hasSession, STORAGE_STATE_PATH } from '../src/lib/session.js';

async function diagnoseSelectors() {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  console.log('🔍 Diagnosing LinkedIn People Search selectors...\n');

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

    // Wait for search results container
    await page.waitForSelector('ul.reusables-search-results__list, div.search-results-container', {
      timeout: 10000
    });

    console.log('✅ Search results page loaded\n');
    console.log('🔍 Testing different selectors...\n');

    // Test various possible selectors
    const selectorsToTest = [
      'li.reusable-search__result-container',
      'div.entity-result',
      'div.entity-result__item',
      'li.reusable-search__result-container > div',
      'div.reusable-search__result-container',
      'li[class*="result-container"]',
      'div[class*="entity-result"]',
      'ul.reusable-search__entity-result-list li',
      '.search-results-container li',
      '.reusable-search__entity-result-list > li'
    ];

    for (const selector of selectorsToTest) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`✅ ${selector}`);
        console.log(`   Found: ${count} elements`);
        
        // Check first 5 elements to see their characteristics
        const checkCount = Math.min(5, count);
        let validProfileCards = 0;
        
        for (let i = 0; i < checkCount; i++) {
          const element = elements.nth(i);
          
          // Get class name
          const className = await element.getAttribute('class').catch(() => '') || '';
          
          // Check if it has profile link
          const profileLink = await element.locator('a[href*="/in/"]').first().getAttribute('href').catch(() => null);
          const hasProfileLink = !!profileLink;
          
          // Check visibility
          const isVisible = await element.isVisible().catch(() => false);
          
          if (hasProfileLink) {
            validProfileCards++;
          }
          
          console.log(`   [${i + 1}] class="${className.substring(0, 50)}${className.length > 50 ? '...' : ''}"`);
          console.log(`       Profile link: ${hasProfileLink ? '✓' : '✗'} | Visible: ${isVisible ? '✓' : '✗'}`);
        }
        
        console.log(`   Valid profile cards in sample: ${validProfileCards}/${checkCount}`);
        console.log();
      } else {
        console.log(`❌ ${selector} - Found: 0 elements`);
      }
    }

    console.log('\n📸 Taking screenshot for manual inspection...');
    await page.screenshot({ path: 'artifacts/linkedin-people-search.png', fullPage: true });
    console.log('   Saved to: artifacts/linkedin-people-search.png');

    console.log('\n🔍 Inspecting page structure...');
    const pageContent = await page.evaluate(() => {
      const resultsContainer = document.querySelector('ul.reusable-search__entity-result-list, ul.reusables-search-results__list');
      if (resultsContainer) {
        const firstChild = resultsContainer.firstElementChild;
        if (firstChild) {
          return {
            containerTag: resultsContainer.tagName,
            containerClasses: resultsContainer.className,
            childTag: firstChild.tagName,
            childClasses: firstChild.className,
            childCount: resultsContainer.children.length
          };
        }
      }
      return null;
    });

    if (pageContent) {
      console.log('\n📊 Page Structure:');
      console.log(`   Container: <${pageContent.containerTag.toLowerCase()} class="${pageContent.containerClasses}">`);
      console.log(`   Child: <${pageContent.childTag.toLowerCase()} class="${pageContent.childClasses}">`);
      console.log(`   Child Count: ${pageContent.childCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

diagnoseSelectors().catch(console.error);


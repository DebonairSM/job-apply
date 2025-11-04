/**
 * LinkedIn Structure Analysis Tool
 * 
 * Purpose: Analyze the DOM structure of LinkedIn People Search to identify
 *          the correct container and child element patterns
 * 
 * Usage: npx tsx scripts/quick-selector-test.ts
 * 
 * Output:
 * - Container details (tag, class, selector)
 * - Child element characteristics
 * - Profile link presence validation
 * - Recommended selector patterns
 * 
 * Requirements: Must have valid LinkedIn session (run npm run login first)
 */

import { chromium } from 'playwright';
import { hasSession, STORAGE_STATE_PATH } from '../src/lib/session.js';

async function testSelectors() {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  try {
    const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';
    
    console.log('📄 Loading page...');
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.waitForSelector('ul.reusables-search-results__list, div.search-results-container', { timeout: 10000 });
    
    console.log('✅ Page loaded\n');

    // Get info about the results container and its children
    const containerInfo = await page.evaluate(() => {
      // Find the main results container
      const containers = [
        'ul.reusable-search__entity-result-list',
        'ul.reusables-search-results__list',
        'div.search-results-container ul'
      ];

      for (const containerSel of containers) {
        const container = document.querySelector(containerSel);
        if (container && container.children.length > 0) {
          const children = Array.from(container.children);
          
          return {
            containerSelector: containerSel,
            containerTag: container.tagName,
            containerClass: container.className,
            childrenCount: children.length,
            childrenInfo: children.slice(0, 5).map((child, idx) => {
              const hasProfileLink = child.querySelector('a[href*="/in/"]') !== null;
              const profileLink = child.querySelector('a[href*="/in/"]')?.getAttribute('href') || '';
              
              return {
                index: idx + 1,
                tag: child.tagName,
                className: child.className,
                hasProfileLink,
                profileLinkHref: profileLink.substring(0, 50),
                isVisible: (child as HTMLElement).offsetParent !== null
              };
            })
          };
        }
      }
      
      return null;
    });

    if (containerInfo) {
      console.log('📊 Container Info:');
      console.log(`   Selector: ${containerInfo.containerSelector}`);
      console.log(`   Tag: <${containerInfo.containerTag.toLowerCase()}>`);
      console.log(`   Class: "${containerInfo.containerClass}"`);
      console.log(`   Children Count: ${containerInfo.childrenCount}\n`);
      
      console.log('👶 First 5 Children:');
      for (const child of containerInfo.childrenInfo) {
        console.log(`   [${child.index}] <${child.tag.toLowerCase()}>`);
        console.log(`       class="${child.className.substring(0, 60)}${child.className.length > 60 ? '...' : ''}"`);
        console.log(`       Has profile link: ${child.hasProfileLink ? '✓' : '✗'}`);
        if (child.hasProfileLink) {
          console.log(`       Link: ${child.profileLinkHref}...`);
        }
        console.log(`       Visible: ${child.isVisible ? '✓' : '✗'}`);
        console.log();
      }

      // Build recommended selector
      const firstValidChild = containerInfo.childrenInfo.find(c => c.hasProfileLink);
      if (firstValidChild) {
        console.log('💡 Recommended selector:');
        console.log(`   ${containerInfo.containerSelector} > li`);
        console.log(`   or with class filter:`);
        const mainClass = firstValidChild.className.split(' ')[0];
        console.log(`   ${containerInfo.containerSelector} > li.${mainClass}`);
      }
    } else {
      console.log('❌ Could not find results container');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testSelectors().catch(console.error);


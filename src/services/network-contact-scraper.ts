/**
 * Network Contact Scraper Service
 * 
 * Scrapes LinkedIn network contacts (connections) who have worked with the user
 * and are located in the USA. Stores contacts in network_contacts table (separate from leads).
 */

import { Page } from 'playwright';
import crypto from 'crypto';
import {
  addNetworkContact,
  getNetworkContactByLinkedInId,
  NetworkContact,
} from '../lib/db.js';
import { randomDelay } from '../lib/resilience.js';

export interface NetworkContactScraperOptions {
  maxContacts?: number;
}

export interface ScrapingProgress {
  contactsScraped: number;
  contactsAdded: number;
  lastProfileUrl?: string;
}

/**
 * Extract LinkedIn ID from profile URL
 */
function extractLinkedInId(profileUrl: string): string | undefined {
  const match = profileUrl.match(/\/in\/([^\/\?]+)/);
  return match ? match[1] : undefined;
}

/**
 * Check if location indicates USA
 */
function isUSALocation(location: string | null | undefined): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return lower.includes('united states') || lower.includes('usa') || lower.includes(', us') || lower.endsWith(' us');
}

/**
 * Scrape network contacts from LinkedIn People Search
 * Filters: 1st degree connections, USA location, worked together
 */
export async function scrapeNetworkContacts(
  page: Page,
  options: NetworkContactScraperOptions = {}
): Promise<ScrapingProgress> {
  const maxContacts = options.maxContacts || 1000;
  
  console.log('🔍 Starting LinkedIn network contact scraper...');
  console.log('   Connection Degree: 1st (direct connections)');
  console.log('   Location: USA');
  console.log('   Filter: Worked together');
  console.log(`   Max Contacts: ${maxContacts}`);
  console.log();

  const progress: ScrapingProgress = {
    contactsScraped: 0,
    contactsAdded: 0,
  };

  try {
    // Build search URL: 1st degree connections, USA location
    // network=["F"] = 1st degree connections
    // geoUrn=["103644278"] = United States
    const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';

    console.log('📄 Navigating to People Search...');
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    // Wait for search results to load
    await page.waitForSelector(
      'ul.reusables-search-results__list, div.search-results-container',
      {
        timeout: 10000,
      }
    );

    console.log('✅ Search results loaded\n');

    let currentPage = 1;
    let hasMorePages = true;

    // Process pages
    while (hasMorePages && progress.contactsScraped < maxContacts) {
      console.log(`\n📄 Processing page ${currentPage}...`);

      // Get all result cards on current page
      const selectorsToTry = [
        'div.search-results-container ul > li',
        '.search-results-container li',
        'li.reusable-search__result-container',
      ];

      let bestSelector = null;
      let cardCount = 0;

      for (const selector of selectorsToTry) {
        const locator = page.locator(selector);
        const count = await locator.count();

        if (count > 0) {
          // Verify first few have profile links
          let validCards = 0;
          const checkCount = Math.min(3, count);

          for (let i = 0; i < checkCount; i++) {
            const hasLink = (await locator.nth(i).locator('a[href*="/in/"]').count()) > 0;
            if (hasLink) validCards++;
          }

          if (validCards > 0) {
            bestSelector = selector;
            cardCount = count;
            console.log(
              `📊 Found ${cardCount} profile cards on page ${currentPage} (using selector: ${selector})\n`
            );
            break;
          }
        }
      }

      if (!bestSelector || cardCount === 0) {
        console.log(`⚠️  No profiles found on page ${currentPage} with any known selector`);
        hasMorePages = false;
        break;
      }

      // Process each profile card on this page
      for (let i = 0; i < cardCount && progress.contactsScraped < maxContacts; i++) {
        const card = page.locator(bestSelector).nth(i);

        try {
          // Extract profile URL
          const profileLink = card.locator('a[href*="/in/"]').first();
          const profileUrl = await profileLink.getAttribute('href');

          if (!profileUrl) {
            console.log(`   ⏭️  Skipped card ${i + 1}: No profile URL`);
            continue;
          }

          // Normalize profile URL
          const normalizedUrl = profileUrl.startsWith('http')
            ? profileUrl.split('?')[0]
            : `https://www.linkedin.com${profileUrl.split('?')[0]}`;

          // Extract name
          const nameSelectors = [
            'span.entity-result__title-text a span[aria-hidden="true"]',
            '.entity-result__title-text a',
            'a[href*="/in/"] span',
          ];

          let name = '';
          for (const selector of nameSelectors) {
            const nameElement = card.locator(selector).first();
            const nameText = await nameElement.textContent({ timeout: 2000 }).catch(() => null);
            if (nameText && nameText.trim()) {
              name = nameText.trim();
              break;
            }
          }

          if (!name) {
            console.log(`   ⏭️  Skipped: Could not extract name`);
            progress.contactsScraped++;
            continue;
          }

          // Extract title
          const titleSelectors = [
            '.entity-result__primary-subtitle',
            '.entity-result__subtitle',
          ];

          let title = '';
          for (const selector of titleSelectors) {
            const titleElement = card.locator(selector).first();
            const titleText = await titleElement.textContent({ timeout: 2000 }).catch(() => null);
            if (titleText && titleText.trim()) {
              title = titleText.trim();
              break;
            }
          }

          // Extract company
          const companySelectors = [
            '.entity-result__secondary-subtitle',
          ];

          let company = '';
          for (const selector of companySelectors) {
            const companyElement = card.locator(selector).first();
            const companyText = await companyElement.textContent({ timeout: 2000 }).catch(() => null);
            if (companyText && companyText.trim()) {
              company = companyText.trim();
              break;
            }
          }

          // Extract location
          const locationSelectors = [
            '.entity-result__tertiary-subtitle',
          ];

          let location = '';
          for (const selector of locationSelectors) {
            const locationElement = card.locator(selector).first();
            const locationText = await locationElement.textContent({ timeout: 2000 }).catch(() => null);
            if (locationText && locationText.trim()) {
              location = locationText.trim();
              break;
            }
          }

          // Check if location is USA
          if (!isUSALocation(location)) {
            console.log(`   ⏭️  Skipped ${name}: Not in USA (${location || 'unknown location'})`);
            progress.contactsScraped++;
            continue;
          }

          // Check for "worked together" indicator
          // LinkedIn shows this as text like "You worked together at [Company]"
          const cardText = await card.textContent().catch(() => '');
          let workedTogether = '';
          
          if (cardText) {
            const workedTogetherMatch = cardText.match(/worked together at ([^\.\n]+)/i);
            if (workedTogetherMatch) {
              workedTogether = workedTogetherMatch[1].trim();
            }
          }

          // Only process if they worked together
          if (!workedTogether) {
            console.log(`   ⏭️  Skipped ${name}: No worked together indicator`);
            progress.contactsScraped++;
            continue;
          }

          // Extract LinkedIn ID
          const linkedinId = extractLinkedInId(normalizedUrl);

          if (!linkedinId) {
            console.log(`   ⏭️  Skipped ${name}: Could not extract LinkedIn ID`);
            progress.contactsScraped++;
            continue;
          }

          // Check if contact already exists
          const existing = getNetworkContactByLinkedInId(linkedinId);
          if (existing) {
            console.log(`   ⏭️  Skipped ${name}: Already in database`);
            progress.contactsScraped++;
            continue;
          }

          // Create contact ID
          const contactId = crypto.createHash('md5').update(normalizedUrl).digest('hex');

          // Save to database
          const contact: Omit<NetworkContact, 'id' | 'created_at' | 'updated_at' | 'message_count' | 'last_message_status'> = {
            linkedin_id: linkedinId,
            profile_url: normalizedUrl,
            name,
            title: title || undefined,
            company: company || undefined,
            location: location || undefined,
            worked_together: workedTogether || undefined,
          };

          addNetworkContact(contact);
          progress.contactsAdded++;
          progress.contactsScraped++;
          progress.lastProfileUrl = normalizedUrl;

          console.log(`   ✅ Added: ${name}`);
          if (title) console.log(`      Title: ${title}`);
          if (company) console.log(`      Company: ${company}`);
          if (location) console.log(`      Location: ${location}`);
          if (workedTogether) console.log(`      🤝 ${workedTogether}`);

          // Random delay to avoid detection
          await randomDelay();

        } catch (error) {
          const err = error as Error;
          console.log(`   ❌ Error processing card ${i + 1}: ${err.message}`);
          progress.contactsScraped++;
        }
      }

      // Check if there are more pages
      if (progress.contactsScraped >= maxContacts) {
        console.log(`\n✅ Reached max contacts limit (${maxContacts})`);
        break;
      }

      // Try to navigate to next page
      try {
        const nextButtonSelectors = [
          'button.artdeco-pagination__button--next:not([disabled])',
          'button[aria-label="Next"]:not([disabled])',
        ];

        let nextButton = null;
        for (const selector of nextButtonSelectors) {
          const btn = page.locator(selector);
          const count = await btn.count();
          if (count > 0) {
            const isDisabled = await btn.getAttribute('disabled');
            if (isDisabled === null) {
              nextButton = btn;
              break;
            }
          }
        }

        if (nextButton) {
          console.log(`\n➡️  Navigating to page ${currentPage + 1}...`);
          await nextButton.click({ timeout: 5000 });
          await page.waitForTimeout(3000);

          await page.waitForSelector(
            'ul.reusables-search-results__list, div.search-results-container',
            {
              state: 'visible',
              timeout: 10000,
            }
          );

          currentPage++;
        } else {
          console.log('\n✅ No more pages available');
          hasMorePages = false;
        }
      } catch (error) {
        const err = error as Error;
        console.log(`\n⚠️  Error navigating to next page: ${err.message}`);
        hasMorePages = false;
      }
    }

    console.log('\n📊 Final Summary:');
    console.log(`   Total Contacts Processed: ${progress.contactsScraped}`);
    console.log(`   New Contacts Added: ${progress.contactsAdded}`);
    console.log('\n✅ Scraping complete!\n');

  } catch (error) {
    const err = error as Error;
    console.error(`\n❌ Error during scraping: ${err.message}`);
    console.error(err.stack);
  }

  return progress;
}


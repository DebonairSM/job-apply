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
  updateNetworkContact,
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
 * Clean up extracted company name from worked_together text
 * Removes duplicate text patterns like "OmnigoYou both worked at Omnigo" -> "Omnigo"
 * Also removes date suffixes and other cleanup
 */
function cleanWorkedTogetherText(text: string): string {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Remove date suffixes (e.g., "Omnigo from July 2019 to September 2023")
  cleaned = cleaned.replace(/\s+from\s+.*$/, '').trim();
  
  // Fix duplicate patterns like "OmnigoYou both worked at Omnigo"
  // Pattern: company name followed by "You both worked at" followed by same company name
  const duplicatePattern = /^(.+?)(?:You both worked at|worked together at|worked at)\s*\1$/i;
  const duplicateMatch = cleaned.match(duplicatePattern);
  if (duplicateMatch && duplicateMatch[1]) {
    cleaned = duplicateMatch[1].trim();
  }
  
  // Fix patterns where company name is duplicated directly (e.g., "OmnigoOmnigo")
  const directDuplicatePattern = /^(.+?)\1$/;
  const directMatch = cleaned.match(directDuplicatePattern);
  if (directMatch && directMatch[1]) {
    cleaned = directMatch[1].trim();
  }
  
  // Remove any remaining "You both worked at" or similar phrases if they somehow remain
  cleaned = cleaned.replace(/^(?:You both worked at|worked together at|worked at)\s*/i, '').trim();
  
  return cleaned;
}

/**
 * Check if location indicates USA
 * Since search URL uses geoUrn filter for USA, this is mainly for validation
 */
function isUSALocation(location: string | null | undefined): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  // Check for explicit USA mentions
  if (lower.includes('united states') || lower.includes('usa') || lower.includes(', us') || lower.endsWith(' us')) {
    return true;
  }
  // Check for US state abbreviations (common two-letter state codes)
  // Format: "City, ST" where ST is a US state
  const usStateCodes = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc'];
  const stateMatch = location.match(/,\s*([A-Z]{2})$/);
  if (stateMatch && usStateCodes.includes(stateMatch[1].toLowerCase())) {
    return true;
  }
  return false;
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

  // Build search URL: 1st degree connections, USA location
  // network=["F"] = 1st degree connections
  // geoUrn=["103644278"] = United States
  const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';

  try {

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
          // Extract profile URL - try multiple approaches
          let profileUrl: string | null = null;
          
          // First, check if profile link exists
          const profileLink = card.locator('a[href*="/in/"]').first();
          const linkCount = await profileLink.count().catch(() => 0);
          
          if (linkCount > 0) {
            profileUrl = await profileLink.getAttribute('href', { timeout: 5000 }).catch(() => null);
          }
          
          // Try alternative selectors if first attempt failed
          if (!profileUrl) {
            const altSelectors = [
              'a.entity-result__title-text[href*="/in/"]',
              'a.reusable-search__result-container[href*="/in/"]',
            ];
            
            for (const selector of altSelectors) {
              const altLink = card.locator(selector).first();
              const altCount = await altLink.count().catch(() => 0);
              if (altCount > 0) {
                profileUrl = await altLink.getAttribute('href', { timeout: 5000 }).catch(() => null);
                if (profileUrl) break;
              }
            }
          }

          if (!profileUrl) {
            console.log(`   ⏭️  Skipped card ${i + 1}: No profile URL found`);
            progress.contactsScraped++;
            continue;
          }

          // Normalize profile URL
          const normalizedUrl = profileUrl.startsWith('http')
            ? profileUrl.split('?')[0]
            : `https://www.linkedin.com${profileUrl.split('?')[0]}`;

          // Extract name
          // Based on actual HTML: name is in span[dir="ltr"] span[aria-hidden="true"] inside the profile link
          // Must exclude "Status is offline/reachable" which is in span.visually-hidden
          const nameSelectors = [
            'a[href*="/in/"] span[dir="ltr"] span[aria-hidden="true"]', // Current LinkedIn format
            'a[href*="/in/"] span[aria-hidden="true"]:not(.visually-hidden)', // Exclude visually-hidden (status indicators)
            'span.entity-result__title-text a span[aria-hidden="true"]:not(.visually-hidden)',
            '.entity-result__title-text a span[aria-hidden="true"]:not(.visually-hidden)',
            '.entity-result__title-text a',
          ];

          let name = '';
          for (const selector of nameSelectors) {
            const nameElement = card.locator(selector).first();
            const nameText = await nameElement.textContent({ timeout: 2000 }).catch(() => null);
            if (nameText && nameText.trim()) {
              const trimmed = nameText.trim();
              // Filter out status indicators and other non-name text
              const lower = trimmed.toLowerCase();
              if (!lower.includes('status is') && 
                  !lower.includes('offline') && 
                  !lower.includes('reachable') &&
                  !lower.includes('online') &&
                  trimmed.length > 1 && 
                  trimmed.length < 100) { // Reasonable name length
                name = trimmed;
                break;
              }
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

          // Extract location - try multiple selectors
          // Based on actual LinkedIn HTML: location is in div.t-14.t-normal (after title)
          // NOT in .entity-result__insights (that contains mutual connections)
          // IMPORTANT: Must be strict to avoid capturing titles/headlines instead of locations
          const locationSelectors = [
            'div.t-14.t-normal', // Current LinkedIn format: location appears as "City, State"
            'div[class*="t-14"][class*="t-normal"]:not(.entity-result__insights)', // Flexible match excluding insights
            'div.t-12.t-black--light:not(.entity-result__insights)', // Older format, but exclude insights
            '.entity-result__tertiary-subtitle', // Legacy selector
          ];

          let location = '';
          // Try to find location element that's NOT in insights (insights has mutual connections)
          for (const selector of locationSelectors) {
            try {
              // Get all matching elements, but skip ones inside .entity-result__insights
              const allMatches = card.locator(selector);
              const count = await allMatches.count().catch(() => 0);
              
              for (let idx = 0; idx < count; idx++) {
                const locationElement = allMatches.nth(idx);
                
                // Check if this element is inside .entity-result__insights (skip if so)
                const isInInsights = await locationElement.locator('xpath=ancestor::div[contains(@class, "entity-result__insights")]').count().catch(() => 0);
                if (isInInsights > 0) {
                  continue; // Skip elements inside insights section
                }
                
                // Check if this element is the title or company (skip those)
                const isTitle = await locationElement.locator('xpath=ancestor::div[contains(@class, "entity-result__primary-subtitle")]').count().catch(() => 0);
                const isCompany = await locationElement.locator('xpath=ancestor::div[contains(@class, "entity-result__secondary-subtitle")]').count().catch(() => 0);
                if (isTitle > 0 || isCompany > 0) {
                  continue; // Skip if it's actually the title or company
                }
                
                const locationText = await locationElement.textContent({ timeout: 2000 }).catch(() => null);
                if (locationText && locationText.trim()) {
                  const trimmed = locationText.trim();
                  const lower = trimmed.toLowerCase();
                  
                  // Filter out non-location text patterns (job titles, descriptions, etc.)
                  const isNonLocation = 
                    lower.includes('status is') ||
                    lower.includes('offline') ||
                    lower.includes('reachable') ||
                    lower.includes('online') ||
                    lower.includes('mutual connection') ||
                    lower.includes('other mutual') ||
                    lower.includes('provides services') ||
                    lower.includes('services -') ||
                    lower.includes('engineer') ||
                    lower.includes('developer') ||
                    lower.includes('manager') ||
                    lower.includes('director') ||
                    lower.includes('owner') ||
                    lower.includes('lead') ||
                    lower.includes('specialist') ||
                    lower.includes('analyst') ||
                    lower.includes('consultant') ||
                    lower.includes('architect') ||
                    lower.includes('designer') ||
                    lower.includes('product owner') ||
                    lower.includes('scrum') ||
                    lower.includes('certified') ||
                    lower.includes('at ') || // "at Company" pattern
                    lower.includes('@') || // Email addresses
                    lower.includes('|') || // Pipe separators (common in titles)
                    lower.match(/^[a-z]+\s+[a-z]+,\s*[a-z]+\s+[a-z]+,\s*and\s+\d+/i) || // "Name, Name, and N other mutual connections"
                    (trimmed.length > 80); // Too long to be a location
                  
                  if (isNonLocation) {
                    continue; // Try next element
                  }
                  
                  // STRICT validation: Must look like a real location
                  // Accept only:
                  // 1. "City, State" format with 2-letter state code (e.g., "Eau Claire, WI")
                  // 2. "City, State, Country" format (e.g., "New York, NY, United States")
                  // 3. "Metropolitan Area" patterns (e.g., "Atlanta Metropolitan Area")
                  // 4. Simple city names that are short and don't contain job-related words
                  const looksLikeLocation = 
                    // Pattern 1: "City, ST" (2-letter state code)
                    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}$/.test(trimmed) ||
                    // Pattern 2: "City, ST, Country"
                    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2},\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(trimmed) ||
                    // Pattern 3: "Metropolitan Area" or "Area"
                    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Metropolitan\s+)?Area$/i.test(trimmed) ||
                    // Pattern 4: Simple city name (short, no job words, no special chars except spaces)
                    (trimmed.length < 40 && 
                     !lower.includes('at ') && 
                     !lower.includes('@') && 
                     !lower.includes('|') &&
                     !lower.includes('engineer') &&
                     !lower.includes('developer') &&
                     !lower.includes('manager') &&
                     !lower.includes('owner') &&
                     !lower.includes('lead') &&
                     !lower.includes('specialist') &&
                     /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(trimmed)); // Only letters and spaces, starts with capital
                  
                  if (looksLikeLocation) {
                    location = trimmed;
                    break; // Found valid location
                  }
                }
              }
              
              if (location) break; // Found location with this selector
            } catch (error) {
              // Continue to next selector if this one fails
              continue;
            }
          }
          
          // If we still don't have location, try extracting from all text content
          // and looking for patterns like "City, State" with strict validation
          if (!location) {
            const cardText = await card.textContent().catch(() => '');
            if (cardText) {
              // Look for common location patterns - STRICT matching only
              // Match "City, State" format with 2-letter state code (e.g., "Eau Claire, WI", "New York, NY")
              const locationPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/;
              const match = cardText.match(locationPattern);
              if (match) {
                const potentialLocation = match[0];
                // Double-check it's not part of a job title
                const beforeMatch = cardText.substring(Math.max(0, match.index! - 50), match.index!);
                const afterMatch = cardText.substring(match.index! + match[0].length, match.index! + match[0].length + 50);
                const context = (beforeMatch + ' ' + afterMatch).toLowerCase();
                
                // Reject if it's clearly part of a job title
                if (!context.includes('engineer') && 
                    !context.includes('developer') && 
                    !context.includes('manager') &&
                    !context.includes('owner') &&
                    !context.includes('at ')) {
                  location = potentialLocation;
                }
              }
            }
          }
          
          // If location extraction failed or returned invalid data, set to null
          // This allows the USA filter to accept it (since NULL locations are accepted for USA filter)
          // Better to have NULL than incorrect title data
          if (location) {
            const locationLower = location.toLowerCase();
            // Final validation: reject if it still looks like a job title
            if (locationLower.includes('engineer') || 
                locationLower.includes('developer') || 
                locationLower.includes('manager') ||
                locationLower.includes('owner') ||
                locationLower.includes('lead') ||
                locationLower.includes('specialist') ||
                locationLower.includes('analyst') ||
                locationLower.includes('consultant') ||
                locationLower.includes('architect') ||
                locationLower.includes('designer') ||
                locationLower.includes('product owner') ||
                locationLower.includes('scrum') ||
                locationLower.includes('certified') ||
                locationLower.includes('at ') ||
                locationLower.includes('@') ||
                locationLower.includes('|')) {
              location = ''; // Clear invalid location
            }
          }

          // Note: Since we're using geoUrn=["103644278"] (United States) in the search URL,
          // LinkedIn already filters results to USA only. We trust this filter and don't
          // skip contacts based on location extraction. If location extraction fails, we proceed.
          // We still extract location for display/storage purposes, but don't use it for filtering.
          
          // Optional: Log if location is found and seems unusual (debugging only)
          // Since we're using geoUrn filter, we trust LinkedIn's geo filter
          // Note: We don't skip based on location since search URL already filters for USA

          // Check for "worked together" indicator
          // LinkedIn shows this in various formats:
          // - "You worked together at [Company]"
          // - "Worked together at [Company]"
          // - "You both worked at [Company]"
          // - "Worked at [Company] together"
          // - Sometimes shown as a separate element or badge
          const cardText = await card.textContent().catch(() => '');
          let workedTogether = '';
          
          if (cardText) {
            // Try multiple patterns for "worked together" text
            const workedTogetherPatterns = [
              /(?:you\s+)?worked\s+together\s+at\s+([^\.\n,]+)/i,
              /you\s+both\s+worked\s+at\s+([^\.\n,]+)/i,
              /worked\s+at\s+([^\.\n,]+)\s+together/i,
              /worked\s+at\s+the\s+same\s+company[:\s]+([^\.\n,]+)/i,
            ];
            
            for (const pattern of workedTogetherPatterns) {
              const match = cardText.match(pattern);
              if (match && match[1]) {
                workedTogether = cleanWorkedTogetherText(match[1]);
                if (workedTogether) break;
              }
            }
          }
          
          // Also check for visual indicators (badges, icons) that might indicate worked together
          // Look for elements with aria-label or title attributes
          if (!workedTogether) {
            const workedTogetherIndicators = [
              '[aria-label*="worked together" i]',
              '[title*="worked together" i]',
              '[aria-label*="worked at" i]',
              '.entity-result__insights [class*="worked"]',
            ];
            
            for (const selector of workedTogetherIndicators) {
              const indicator = card.locator(selector).first();
              const count = await indicator.count().catch(() => 0);
              if (count > 0) {
                const text = await indicator.getAttribute('aria-label').catch(() => 
                  indicator.getAttribute('title').catch(() => null)
                );
                if (text) {
                  const match = text.match(/worked\s+(?:together\s+)?at\s+([^\.\n,]+)/i);
                  if (match && match[1]) {
                    workedTogether = cleanWorkedTogetherText(match[1]);
                    if (workedTogether) break;
                  }
                }
              }
            }
          }

          // If "worked together" not found on search card, visit profile page to check
          // Based on actual HTML structure: "You both worked at [Company]" appears in Highlights section
          // Structure: li.artdeco-list__item.pvs-list__item--two-column with spans containing the text
          if (!workedTogether) {
            try {
              console.log(`   🔍 Checking profile page for ${name}...`);
              
              // Navigate to profile page
              await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForTimeout(2000);
              
              // Wait for profile content to load
              await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
              
              // Look for "worked together" indicator in Highlights section
              // Based on HTML: li.artdeco-list__item with text "You both worked at [Company]"
              const highlightsSelectors = [
                'li.artdeco-list__item.pvs-list__item--two-column',
                'li[class*="pvs-list__item"]',
                '.pvs-list li',
              ];
              
              for (const containerSelector of highlightsSelectors) {
                const highlights = page.locator(containerSelector);
                const count = await highlights.count().catch(() => 0);
                
                for (let idx = 0; idx < count; idx++) {
                  const highlight = highlights.nth(idx);
                  const highlightText = await highlight.textContent({ timeout: 1000 }).catch(() => '');
                  
                  if (highlightText) {
                    // Look for "You both worked at [Company]" pattern
                    const workedTogetherPatterns = [
                      /you\s+both\s+worked\s+at\s+([^\.\n,]+)/i,
                      /(?:you\s+)?worked\s+together\s+at\s+([^\.\n,]+)/i,
                      /both\s+worked\s+at\s+([^\.\n,]+)/i,
                    ];
                    
                    for (const pattern of workedTogetherPatterns) {
                      const match = highlightText.match(pattern);
                      if (match && match[1]) {
                        workedTogether = cleanWorkedTogetherText(match[1]);
                        if (workedTogether) {
                          console.log(`   ✅ Found on profile: You both worked at ${workedTogether}`);
                          break;
                        }
                      }
                    }
                    
                    if (workedTogether) break;
                  }
                }
                
                if (workedTogether) break;
              }
              
              // Fallback: check entire page text if not found in highlights
              if (!workedTogether) {
                const profileText = await page.textContent('body').catch(() => '');
                if (profileText) {
                  const fallbackPattern = /you\s+both\s+worked\s+at\s+([^\.\n,]+)/i;
                  const match = profileText.match(fallbackPattern);
                  if (match && match[1]) {
                    workedTogether = cleanWorkedTogetherText(match[1]);
                    if (workedTogether) {
                      console.log(`   ✅ Found on profile page: You both worked at ${workedTogether}`);
                    }
                  }
                }
              }
              
              // Navigate back to search results (restore to original page)
              await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForTimeout(2000);
              
              // Wait for search results and re-establish card context
              await page.waitForSelector(
                'ul.reusables-search-results__list, div.search-results-container',
                { timeout: 10000 }
              );
              
              // Small delay to let page stabilize
              await page.waitForTimeout(1000);
            } catch (error) {
              const err = error as Error;
              console.log(`   ⚠️  Error checking profile page: ${err.message}`);
              // Try to navigate back to search even if profile check failed
              try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
                await page.waitForTimeout(2000);
                await page.waitForSelector(
                  'ul.reusables-search-results__list, div.search-results-container',
                  { timeout: 10000 }
                );
              } catch (navError) {
                console.log(`   ⚠️  Error navigating back to search: ${(navError as Error).message}`);
              }
            }
          }
          
          // Skip if still no "worked together" indicator found
          if (!workedTogether) {
            console.log(`   ⏭️  Skipped ${name}: No worked together indicator found`);
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
            // Helper function to check if location data looks invalid (job title instead of location)
            const isInvalidLocation = (loc: string | null | undefined): boolean => {
              if (!loc) return false; // NULL/empty is valid (accepted by USA filter)
              const locLower = loc.toLowerCase();
              return locLower.includes('engineer') || 
                     locLower.includes('developer') || 
                     locLower.includes('manager') ||
                     locLower.includes('owner') ||
                     locLower.includes('lead') ||
                     locLower.includes('specialist') ||
                     locLower.includes('analyst') ||
                     locLower.includes('consultant') ||
                     locLower.includes('architect') ||
                     locLower.includes('designer') ||
                     locLower.includes('product owner') ||
                     locLower.includes('scrum') ||
                     locLower.includes('certified') ||
                     locLower.includes('at ') ||
                     locLower.includes('@') ||
                     locLower.includes('|') ||
                     locLower.includes('technology') ||
                     locLower.includes('innovator') ||
                     locLower.includes('advancing') ||
                     locLower.includes('strategies');
            };
            
            // Update existing contact if we found new worked_together data, other updates, or need to clear invalid location
            const needsUpdate = 
              (workedTogether && (!existing.worked_together || existing.worked_together !== workedTogether)) ||
              (title && existing.title !== title) ||
              (company && existing.company !== company) ||
              (location && existing.location !== location) ||
              // Also update if existing location is invalid (needs to be cleared)
              isInvalidLocation(existing.location);
            
            if (needsUpdate) {
              const updateFields: {
                worked_together?: string;
                title?: string;
                company?: string;
                location?: string;
              } = {};
              
              if (workedTogether && (!existing.worked_together || existing.worked_together !== workedTogether)) {
                updateFields.worked_together = workedTogether;
              }
              if (title && existing.title !== title) {
                updateFields.title = title;
              }
              if (company && existing.company !== company) {
                updateFields.company = company;
              }
              // Handle location updates:
              // Priority: Use valid new location > Clear invalid existing > Leave valid existing unchanged
              if (location && existing.location !== location) {
                // We have a new location that's different - validate it
                if (!isInvalidLocation(location)) {
                  // New location is valid - use it
                  updateFields.location = location;
                } else {
                  // New location is invalid - clear it (set to null) so USA filter accepts it
                  updateFields.location = null as any;
                }
              } else if (isInvalidLocation(existing.location)) {
                // Existing location is invalid and we don't have a valid new one - clear it
                updateFields.location = null as any;
              }
              // Note: If !location && existing.location is valid, we don't update (leave existing as-is)
              
              const updated = updateNetworkContact(existing.id, updateFields);
              if (updated) {
                const updateDetails = Object.keys(updateFields).join(', ');
                console.log(`   ✅ Updated ${name}: ${updateDetails}`);
                if (workedTogether && updateFields.worked_together) {
                  console.log(`      🤝 Worked together: ${workedTogether}`);
                }
              } else {
                console.log(`   ⚠️  Failed to update ${name}`);
              }
            } else {
              console.log(`   ⏭️  Skipped ${name}: Already in database (no updates needed)`);
            }
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
          // Only log full error details for unexpected errors (not timeouts on missing elements)
          if (err.message.includes('Timeout') || err.message.includes('not found')) {
            console.log(`   ⏭️  Skipped card ${i + 1}: Element not found or timeout`);
          } else {
            console.log(`   ❌ Error processing card ${i + 1}: ${err.message}`);
            if (err.stack) {
              console.log(`      ${err.stack.split('\n')[1]?.trim() || ''}`);
            }
          }
          progress.contactsScraped++;
        }
      }

      // Check if we've added enough contacts (stop if we've added maxContacts)
      if (progress.contactsAdded >= maxContacts) {
        console.log(`\n✅ Reached max contacts added limit (${maxContacts})`);
        break;
      }

      // Try to navigate to next page - retry multiple times if needed
      let pageNavigationAttempts = 0;
      const maxNavigationAttempts = 3;
      let navigatedToNextPage = false;

      while (pageNavigationAttempts < maxNavigationAttempts && !navigatedToNextPage) {
        try {
          pageNavigationAttempts++;
          
          // Wait a bit before trying to find next button
          await page.waitForTimeout(2000);
          
          // Try multiple selectors for next button
          const nextButtonSelectors = [
            'button[aria-label="Next"]:not([disabled])',
            'button.artdeco-pagination__button--next:not([disabled])',
            'button[aria-label*="Next"]:not([disabled])',
            '.artdeco-pagination button[aria-label="Next"]:not([disabled])',
            'button.pagination__button--next:not([disabled])',
          ];

          let nextButton = null;
          for (const selector of nextButtonSelectors) {
            try {
              const btn = page.locator(selector);
              const count = await btn.count();
              if (count > 0) {
                // Check if button is actually enabled
                const isDisabled = await btn.getAttribute('disabled');
                const isVisible = await btn.isVisible().catch(() => false);
                const ariaDisabled = await btn.getAttribute('aria-disabled').catch(() => null);
                // Button is enabled if disabled attribute is null and aria-disabled is not "true"
                const isEnabled = isDisabled === null && ariaDisabled !== 'true' && isVisible;
                if (isEnabled) {
                  nextButton = btn;
                  break;
                }
              }
            } catch (selectorError) {
              // Try next selector
              continue;
            }
          }

          if (nextButton) {
            console.log(`\n➡️  Navigating to page ${currentPage + 1}... (attempt ${pageNavigationAttempts})`);
            
            // Scroll next button into view
            await nextButton.scrollIntoViewIfNeeded().catch(() => {});
            await page.waitForTimeout(1000);
            
            // Click next button
            await nextButton.click({ timeout: 5000 });
            await page.waitForTimeout(3000);

            // Wait for new page to load
            await page.waitForSelector(
              'ul.reusables-search-results__list, div.search-results-container',
              {
                state: 'visible',
                timeout: 15000,
              }
            );

            // Verify we're actually on a new page by checking if results changed
            await page.waitForTimeout(2000);
            
            const newCardCount = await page.locator(bestSelector || 'div.search-results-container ul > li').count();
            if (newCardCount > 0) {
              currentPage++;
              navigatedToNextPage = true;
              console.log(`   ✅ Successfully navigated to page ${currentPage}`);
            } else {
              console.log(`   ⚠️  Page ${currentPage + 1} appears empty, trying again...`);
              // Wait a bit longer and try again
              await page.waitForTimeout(3000);
            }
          } else {
            if (pageNavigationAttempts >= maxNavigationAttempts) {
              console.log('\n✅ No more pages available (next button not found)');
              hasMorePages = false;
            } else {
              console.log(`   ⚠️  Next button not found, retrying... (attempt ${pageNavigationAttempts}/${maxNavigationAttempts})`);
              await page.waitForTimeout(2000);
            }
          }
        } catch (error) {
          const err = error as Error;
          if (pageNavigationAttempts >= maxNavigationAttempts) {
            console.log(`\n⚠️  Error navigating to next page after ${maxNavigationAttempts} attempts: ${err.message}`);
            hasMorePages = false;
          } else {
            console.log(`   ⚠️  Navigation error (attempt ${pageNavigationAttempts}/${maxNavigationAttempts}): ${err.message}, retrying...`);
            await page.waitForTimeout(3000);
            
            // Try to refresh the page if navigation failed
            try {
              await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForTimeout(2000);
              await page.waitForSelector(
                'ul.reusables-search-results__list, div.search-results-container',
                { timeout: 10000 }
              );
            } catch (refreshError) {
              // If refresh fails, give up on this page
              console.log(`   ❌ Failed to refresh page, stopping pagination`);
              hasMorePages = false;
              break;
            }
          }
        }
      }
      
      // If we couldn't navigate after all attempts, stop
      if (!navigatedToNextPage && pageNavigationAttempts >= maxNavigationAttempts) {
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


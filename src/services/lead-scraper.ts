import { Page } from 'playwright';
import crypto from 'crypto';
import { addLead, leadExistsByUrl, updateScrapingRun, Lead } from '../lib/db.js';
import { randomDelay } from '../lib/resilience.js';

export interface LeadScraperOptions {
  filterTitles?: string[];
  maxProfiles?: number;
  resumeRunId?: number;
}

interface ScrapingProgress {
  profilesScraped: number;
  profilesAdded: number;
  lastProfileUrl?: string;
}

export async function scrapeConnections(
  page: Page,
  runId: number,
  options: LeadScraperOptions,
  shouldStopNow: () => boolean
): Promise<ScrapingProgress> {
  console.log('🔍 Starting LinkedIn lead scraper (People Search)...');
  console.log(`   Max Profiles: ${options.maxProfiles || 'unlimited'}`);
  console.log(`   Location: United States (default)`);
  if (options.filterTitles && options.filterTitles.length > 0) {
    console.log(`   Title Filters: ${options.filterTitles.join(', ')}`);
  }
  console.log();

  const progress: ScrapingProgress = {
    profilesScraped: 0,
    profilesAdded: 0
  };

  try {
    // Build People Search URL with filters
    // network=["F"] = 1st degree connections
    // geoUrn=["103644278"] = United States
    const searchUrl = 'https://www.linkedin.com/search/results/people/?network=%5B%22F%22%5D&geoUrn=%5B%22103644278%22%5D';
    
    console.log('📄 Navigating to People Search (filtered: 1st connections, US)...');
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(3000);

    // Wait for search results to load
    await page.waitForSelector('ul.reusables-search-results__list, div.search-results-container', {
      timeout: 10000
    });

    console.log('✅ Search results loaded\n');

    let currentPage = 1;
    let hasMorePages = true;

    // Process pages
    while (hasMorePages && !shouldStopNow()) {
      console.log(`\n📄 Processing page ${currentPage}...`);

      // Get all result cards on current page
      const resultCards = page.locator('li.reusable-search__result-container');
      const cardCount = await resultCards.count();

      console.log(`📊 Found ${cardCount} profiles on page ${currentPage}\n`);

      // Process each profile card on this page
      for (let i = 0; i < cardCount; i++) {
        // Check stop signal
        if (shouldStopNow()) {
          console.log('\n⚠️  Stop signal received. Stopping scrape...');
          hasMorePages = false;
          break;
        }

        // Check max profiles limit
        if (options.maxProfiles && progress.profilesScraped >= options.maxProfiles) {
          console.log(`\n✅ Reached max profiles limit (${options.maxProfiles})`);
          hasMorePages = false;
          break;
        }

        try {
          console.log(`   Processing profile ${i + 1}/${cardCount}...`);

          // Re-locate card each iteration
          const card = resultCards.nth(i);

          // Ensure card is visible
          const isVisible = await card.isVisible({ timeout: 2000 }).catch(() => false);
          if (!isVisible) {
            console.log(`   ⚠️  Skipping profile ${i + 1}: card not visible`);
            continue;
          }

          // Scroll into view
          await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);

          // Extract profile URL
          const profileLink = card.locator('a[href*="/in/"]').first();
          const href = await profileLink.getAttribute('href', { timeout: 2000 }).catch(() => null);

          if (!href) {
            console.log(`   ⚠️  Skipping profile ${i + 1}: profile URL not found`);
            continue;
          }

          // Clean up profile URL (remove query parameters)
          let profileUrl = href.includes('?') ? href.split('?')[0] : href;
          if (!profileUrl.startsWith('http')) {
            profileUrl = `https://www.linkedin.com${profileUrl}`;
          }

          // Check if already in database
          if (leadExistsByUrl(profileUrl)) {
            console.log(`   ⏭️  Skipping profile ${i + 1}: already in database`);
            progress.profilesScraped++;
            progress.lastProfileUrl = profileUrl;
            continue;
          }

          // Extract name from card
          const nameSelectors = [
            '.entity-result__title-text a span[aria-hidden="true"]',
            '.artdeco-entity-lockup__title',
            'span[aria-hidden="true"]',
            '.mn-connection-card__name'
          ];

          let name = '';
          for (const selector of nameSelectors) {
            const nameElem = card.locator(selector).first();
            const nameCount = await nameElem.count();
            if (nameCount > 0) {
              const text = await nameElem.innerText({ timeout: 2000 }).catch(() => null);
              if (text && text.trim()) {
                name = text.trim();
                break;
              }
            }
          }

          if (!name) {
            console.log(`   ⚠️  Skipping profile ${i + 1}: name not found`);
            continue;
          }

          // Extract title and company from card
          const occupationSelectors = [
            '.entity-result__primary-subtitle',
            '.artdeco-entity-lockup__subtitle',
            '.mn-connection-card__occupation'
          ];

          let title = '';
          let company = '';

          for (const selector of occupationSelectors) {
            const occElem = card.locator(selector).first();
            const occCount = await occElem.count();
            if (occCount > 0) {
              const text = await occElem.innerText({ timeout: 2000 }).catch(() => null);
              if (text && text.trim()) {
                // LinkedIn typically shows "Title at Company"
                const occupation = text.trim();
                if (occupation.includes(' at ')) {
                  const parts = occupation.split(' at ');
                  title = parts[0].trim();
                  company = parts.slice(1).join(' at ').trim();
                } else {
                  title = occupation;
                }
                break;
              }
            }
          }

          // Extract location from card
          let location = '';
          const locationSelectors = [
            '.entity-result__secondary-subtitle',
            '.artdeco-entity-lockup__caption',
            '.mn-connection-card__location'
          ];

          for (const selector of locationSelectors) {
            const locElem = card.locator(selector).first();
            const locCount = await locElem.count();
            if (locCount > 0) {
              const text = await locElem.innerText({ timeout: 2000 }).catch(() => null);
              if (text && text.trim()) {
                location = text.trim();
                break;
              }
            }
          }

          // Apply title filter if specified
          if (options.filterTitles && options.filterTitles.length > 0 && title) {
            const titleLower = title.toLowerCase();
            const matchesFilter = options.filterTitles.some(filter =>
              titleLower.includes(filter.toLowerCase())
            );

            if (!matchesFilter) {
              console.log(`   ⏭️  Skipping ${name}: title "${title}" doesn't match filter`);
              progress.profilesScraped++;
              progress.lastProfileUrl = profileUrl;
              continue;
            }
          }

          // Click to view full profile
          await profileLink.click({ timeout: 3000 }).catch(async () => {
            await profileLink.click({ force: true, timeout: 2000 });
          });
          await page.waitForTimeout(2000);

          // Extract about section from profile page
          let about = '';
          const aboutSelectors = [
            '.pv-about-section div.pv-about__summary-text',
            'section[data-section="summary"] .pv-about__summary-text',
            'div.pv-shared-text-with-see-more span[aria-hidden="true"]',
            'section.artdeco-card div.display-flex span[aria-hidden="true"]'
          ];

          for (const selector of aboutSelectors) {
            try {
              const aboutElem = page.locator(selector).first();
              const aboutCount = await aboutElem.count();
              if (aboutCount > 0) {
                const text = await aboutElem.innerText({ timeout: 2000 }).catch(() => null);
                if (text && text.trim()) {
                  about = text.trim();
                  break;
                }
              }
            } catch (error) {
              continue;
            }
          }

          // Try to extract email
          let email: string | undefined;
          try {
            // Look for contact info button
            const contactButton = page.locator('a[href*="/overlay/contact-info/"]').first();
            const contactCount = await contactButton.count();

            if (contactCount > 0) {
              await contactButton.click({ timeout: 2000 });
              await page.waitForTimeout(1500);

              // Try to find email in the modal
              const emailSelectors = [
                'a[href^="mailto:"]',
                'section.pv-contact-info__contact-type.ci-email a'
              ];

              for (const selector of emailSelectors) {
                const emailElem = page.locator(selector).first();
                const emailCount = await emailElem.count();
                if (emailCount > 0) {
                  const emailHref = await emailElem.getAttribute('href', { timeout: 1000 });
                  if (emailHref && emailHref.startsWith('mailto:')) {
                    email = emailHref.replace('mailto:', '').trim();
                    break;
                  }
                }
              }

              // Close the modal
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          } catch (error) {
            // Email extraction is optional, continue without it
          }

          // Extract LinkedIn ID from profile URL
          const linkedinId = profileUrl.split('/in/')[1]?.split('/')[0]?.split('?')[0] || undefined;

          // Create lead ID
          const leadId = crypto.createHash('md5').update(profileUrl).digest('hex');

          // Save to database
          const lead: Omit<Lead, 'created_at' | 'scraped_at'> = {
            id: leadId,
            name,
            title: title || undefined,
            company: company || undefined,
            about: about || undefined,
            email,
            location: location || undefined,
            profile_url: profileUrl,
            linkedin_id: linkedinId
          };

          const added = addLead(lead);

          if (added) {
            progress.profilesAdded++;
            console.log(`   ✅ Added: ${name}`);
            if (title) console.log(`      Title: ${title}`);
            if (company) console.log(`      Company: ${company}`);
            if (location) console.log(`      Location: ${location}`);
            if (email) console.log(`      Email: ${email}`);
          } else {
            console.log(`   ⏭️  Skipped: ${name} (already exists)`);
          }

          progress.profilesScraped++;
          progress.lastProfileUrl = profileUrl;

          // Update scraping run progress
          updateScrapingRun(runId, {
            profiles_scraped: progress.profilesScraped,
            profiles_added: progress.profilesAdded,
            last_profile_url: profileUrl
          });

          // Random delay to avoid detection
          await randomDelay();

          // Navigate back to search results
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1500);

        } catch (error) {
          const err = error as Error;
          console.log(`   ⚠️  Error processing profile ${i + 1}: ${err.message}`);
          continue;
        }
      }

      // Check if there's a next page
      if (!shouldStopNow() && (!options.maxProfiles || progress.profilesScraped < options.maxProfiles)) {
        const nextButton = page.locator('button.artdeco-pagination__button--next:not([disabled])');
        const hasNext = await nextButton.count() > 0;

        if (hasNext) {
          console.log(`\n➡️  Navigating to page ${currentPage + 1}...`);
          await nextButton.click({ timeout: 5000 });
          await page.waitForTimeout(3000);
          currentPage++;
        } else {
          console.log(`\n🏁 No more pages available`);
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }

    console.log('\n📈 Scraping Summary:');
    console.log(`   Pages Processed: ${currentPage}`);
    console.log(`   Profiles Processed: ${progress.profilesScraped}`);
    console.log(`   New Leads Added: ${progress.profilesAdded}`);
    console.log(`   Success Rate: ${progress.profilesScraped > 0 ? Math.round((progress.profilesAdded / progress.profilesScraped) * 100) : 0}%`);

  } catch (error) {
    const err = error as Error;
    console.error(`\n❌ Error during scraping: ${err.message}`);
    throw error;
  }

  return progress;
}


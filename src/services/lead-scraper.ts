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
      // Try multiple selectors (LinkedIn changes their DOM frequently)
      const selectorsToTry = [
        'div.search-results-container ul > li',
        '.search-results-container li',
        'li.reusable-search__result-container'
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
            const hasLink = await locator.nth(i).locator('a[href*="/in/"]').count() > 0;
            if (hasLink) validCards++;
          }
          
          if (validCards > 0) {
            bestSelector = selector;
            cardCount = count;
            console.log(`📊 Found ${cardCount} profile cards on page ${currentPage} (using selector: ${selector})\n`);
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

          // Re-query card fresh each time to avoid stale elements
          const card = page.locator(bestSelector).nth(i);

          // Scroll into view to make card visible
          await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);

          // Wait for profile link to be present (LinkedIn lazy-loads content)
          const profileLink = card.locator('a[href*="/in/"]').first();
          await profileLink.waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
          
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

          // Click to view full profile
          await profileLink.click({ timeout: 3000 }).catch(async () => {
            await profileLink.click({ force: true, timeout: 2000 });
          });
          await page.waitForTimeout(2000);

          // Extract title and company from profile page
          let title = '';
          let company = '';
          
          const titleSelectors = [
            'div.text-body-medium.break-words',  // Current LinkedIn structure (top of profile)
            '.pv-top-card--list-bullet li:first-child',
            'h2.mt1.t-18.t-black.t-normal',
            '.pv-top-card-section__headline'
          ];

          for (const selector of titleSelectors) {
            const titleElem = page.locator(selector).first();
            const titleCount = await titleElem.count();
            if (titleCount > 0) {
              const text = await titleElem.innerText({ timeout: 2000 }).catch(() => null);
              if (text && text.trim()) {
                // LinkedIn typically shows "Title at Company"
                const occupation = text.trim();
                if (occupation.includes(' at ')) {
                  const parts = occupation.split(' at ');
                  title = parts[0].trim();
                  company = parts.slice(1).join(' at ').trim();
                } else if (occupation.includes(' · ')) {
                  // Some profiles use · separator
                  title = occupation.split(' · ')[0].trim();
                } else {
                  title = occupation;
                }
                break;
              }
            }
          }

          // If we didn't get company from title, try experience section
          if (!company) {
            const companySelectors = [
              'section[data-section="currentPositionsDetails"] li a',
              '.pv-entity__secondary-title',
              'ul.pv-top-card--list-bullet li span.text-body-small'
            ];

            for (const selector of companySelectors) {
              const companyElem = page.locator(selector).first();
              const companyCount = await companyElem.count();
              if (companyCount > 0) {
                const text = await companyElem.innerText({ timeout: 2000 }).catch(() => null);
                if (text && text.trim()) {
                  company = text.trim();
                  break;
                }
              }
            }
          }

          // Extract location from profile page
          let location = '';
          const locationSelectors = [
            'span.text-body-small.inline.t-black--light.break-words',  // Current LinkedIn structure
            '.pv-top-card--list-bullet li:last-child span',
            'span.t-16.t-black.t-normal',
            '.pv-top-card-section__location'
          ];

          for (const selector of locationSelectors) {
            const locElem = page.locator(selector).first();
            const locCount = await locElem.count();
            if (locCount > 0) {
              const text = await locElem.innerText({ timeout: 2000 }).catch(() => null);
              if (text && text.trim() && !text.includes('@') && text.length < 100) {
                // Make sure it looks like a location (not email or long text)
                location = text.trim();
                break;
              }
            }
          }

          // Extract "worked together" information
          let workedTogether: string | undefined;
          try {
            // Look for the "You both worked at" text in spans
            // Try detailed version first (includes dates), then fall back to basic version
            const workedTogetherSelectors = [
              'span.t-14.t-normal span[aria-hidden="true"]',  // Detailed version with dates
              'div.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]',  // Basic version
              'span[aria-hidden="true"]:has-text("You both worked at")',  // Generic fallback
              'span[aria-hidden="true"]:has-text("worked at")'
            ];

            for (const selector of workedTogetherSelectors) {
              const elem = page.locator(selector);
              const count = await elem.count();
              
              if (count > 0) {
                // Check each matching element
                for (let i = 0; i < count; i++) {
                  const text = await elem.nth(i).innerText({ timeout: 2000 }).catch(() => null);
                  if (text && text.trim() && text.toLowerCase().includes('you both worked')) {
                    workedTogether = text.trim();
                    break;
                  }
                }
                
                if (workedTogether) break;
              }
            }
          } catch (error) {
            // Worked together extraction is optional, continue without it
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
              // Navigate back before continuing
              await page.goBack({ waitUntil: 'domcontentloaded' });
              await page.waitForTimeout(1500);
              
              // Verify we're back on search results page
              const currentUrl = page.url();
              if (!currentUrl.includes('/search/results/people/')) {
                await page.goBack({ waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(1500);
              }
              continue;
            }
          }

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

              // Close the modal - try multiple methods
              try {
                // Method 1: Click the X button
                const closeButtonSelectors = [
                  'button[aria-label*="Dismiss"], button[aria-label*="Close"]',
                  'button.artdeco-modal__dismiss',
                  'button[data-test-modal-close-btn]'
                ];
                
                let modalClosed = false;
                for (const selector of closeButtonSelectors) {
                  const closeBtn = page.locator(selector).first();
                  if (await closeBtn.count() > 0) {
                    await closeBtn.click({ timeout: 1000 });
                    await page.waitForTimeout(500);
                    modalClosed = true;
                    break;
                  }
                }
                
                // Method 2: Press Escape if close button didn't work
                if (!modalClosed) {
                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(500);
                }
                
                // Method 3: If still on overlay URL, navigate back to profile
                const currentUrl = page.url();
                if (currentUrl.includes('/overlay/contact-info/')) {
                  await page.goBack({ waitUntil: 'domcontentloaded' });
                  await page.waitForTimeout(1000);
                }
              } catch (closeError) {
                // If modal close fails, force navigate back to profile
                const currentUrl = page.url();
                if (currentUrl.includes('/overlay/')) {
                  await page.goBack({ waitUntil: 'domcontentloaded' });
                  await page.waitForTimeout(1000);
                }
              }
            }
          } catch (error) {
            // Email extraction is optional, but ensure we're not stuck on overlay
            try {
              const currentUrl = page.url();
              if (currentUrl.includes('/overlay/')) {
                await page.goBack({ waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(1000);
              }
            } catch (navError) {
              // Continue without email if navigation fails
            }
          }

          // Try to extract article links
          let articles: string | undefined;
          try {
            // Look for the Articles pill button in the activity section
            const articlesPillButton = page.locator('button.profile-creator-shared-pills__pill').filter({ hasText: 'Articles' });
            const articlesButtonCount = await articlesPillButton.count();

            if (articlesButtonCount > 0) {
              // Check if Articles button is not already selected
              const isSelected = await articlesPillButton.getAttribute('aria-pressed');
              
              if (isSelected !== 'true') {
                await articlesPillButton.click({ timeout: 2000 });
                await page.waitForTimeout(1500);
              }

              // Wait for article content to load
              await page.waitForTimeout(1000);

              // Extract article links
              // Articles are typically displayed with specific selectors in the activity feed
              const articleLinkSelectors = [
                'a[href*="/pulse/"]',  // LinkedIn article URLs contain /pulse/
                'article a[data-test-app-aware-link]',
                '.profile-creator-shared-feed-update__container a[href*="/pulse/"]'
              ];

              const articleUrls: string[] = [];
              
              for (const selector of articleLinkSelectors) {
                const links = page.locator(selector);
                const linkCount = await links.count();
                
                if (linkCount > 0) {
                  // Extract up to 20 article links
                  const maxArticles = Math.min(linkCount, 20);
                  for (let i = 0; i < maxArticles; i++) {
                    const href = await links.nth(i).getAttribute('href', { timeout: 1000 }).catch(() => null);
                    if (href) {
                      // Clean up URL
                      let articleUrl = href.includes('?') ? href.split('?')[0] : href;
                      if (!articleUrl.startsWith('http')) {
                        articleUrl = `https://www.linkedin.com${articleUrl}`;
                      }
                      
                      // Only add unique article URLs
                      if (!articleUrls.includes(articleUrl)) {
                        articleUrls.push(articleUrl);
                      }
                    }
                  }
                  
                  if (articleUrls.length > 0) {
                    break;
                  }
                }
              }

              if (articleUrls.length > 0) {
                articles = JSON.stringify(articleUrls);
              }
            }
          } catch (error) {
            // Article extraction is optional, continue without it
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
            linkedin_id: linkedinId,
            worked_together: workedTogether,
            articles
          };

          const added = addLead(lead);

          if (added) {
            progress.profilesAdded++;
            console.log(`   ✅ Added: ${name}`);
            if (title) console.log(`      Title: ${title}`);
            if (company) console.log(`      Company: ${company}`);
            if (location) console.log(`      Location: ${location}`);
            if (workedTogether) console.log(`      🤝 ${workedTogether}`);
            if (email) console.log(`      Email: ${email}`);
            if (articles) {
              const articleCount = JSON.parse(articles).length;
              console.log(`      📰 Articles: ${articleCount}`);
            }
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
          
          // Verify we're back on search results page (not stuck on profile or overlay)
          const currentUrl = page.url();
          if (!currentUrl.includes('/search/results/people/')) {
            // If not on search page, try going back one more time
            await page.goBack({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);
          }

        } catch (error) {
          const err = error as Error;
          console.log(`   ⚠️  Error processing profile ${i + 1}: ${err.message}`);
          continue;
        }
      }

      // Check if there's a next page
      if (!shouldStopNow() && (!options.maxProfiles || progress.profilesScraped < options.maxProfiles)) {
        try {
          // Wait for pagination to be stable after navigating back
          await page.waitForSelector('.artdeco-pagination', { state: 'visible', timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1000);
          
          // Check pagination state text (e.g., "Page 3 of 84")
          const paginationStateText = await page.locator('.artdeco-pagination__page-state, .artdeco-pagination__state--a11y').first().innerText({ timeout: 2000 }).catch(() => null);
          
          if (paginationStateText) {
            console.log(`   📄 Pagination: ${paginationStateText.trim()}`);
          }
          
          // Try multiple selectors for the Next button
          const nextButtonSelectors = [
            'button.artdeco-pagination__button--next:not([disabled])',
            'button[aria-label="Next"]:not([disabled])',
            'button.artdeco-pagination__button--next'
          ];
          
          let nextButton = null;
          for (const selector of nextButtonSelectors) {
            const btn = page.locator(selector);
            const count = await btn.count();
            if (count > 0) {
              // Check if button is actually enabled
              const isDisabled = await btn.getAttribute('disabled');
              if (!isDisabled) {
                nextButton = btn;
                break;
              }
            }
          }

          if (nextButton) {
            console.log(`\n➡️  Navigating to page ${currentPage + 1}...`);
            await nextButton.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
            
            // Wait for page number to change (indicates navigation completed)
            await page.waitForTimeout(1500);
            currentPage++;
          } else {
            console.log(`\n🏁 No more pages available`);
            hasMorePages = false;
          }
        } catch (error) {
          const err = error as Error;
          console.log(`\n⚠️  Error checking pagination: ${err.message}`);
          console.log('   Assuming no more pages');
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


import { chromium, Page } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession } from '../lib/session.js';
import { addJobs, Job, AddJobsResult, jobExistsByUrl, getJobByUrl, getJobsByStatus, getDb } from '../lib/db.js';
import { rankJob } from '../ai/ranker.js';
import { randomDelay } from '../lib/resilience.js';
import { BOOLEAN_SEARCHES } from '../ai/profiles.js';
import { shouldStop as checkStopSignal, clearStopSignal } from '../lib/stop-signal.js';
import crypto from 'crypto';

export interface SearchOptions {
  keywords?: string;
  profile?: 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend' | 'core-net' | 'legacy-modernization' | 'contract';
  location?: string;
  remote?: boolean;
  datePosted?: 'day' | 'week' | 'month';
  minScore?: number;
  maxPages?: number;
  startPage?: number;
  updateDescriptions?: boolean;
}

async function dismissModals(page: Page, silent = false): Promise<void> {
  try {
    // Since we're hiding the messaging modal with CSS, we only need minimal dismissal
    // Just press Escape once to close any other modals
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);
    
  } catch (error) {
    // Silently ignore errors in modal dismissal
  }
}

// Function to update existing jobs with missing descriptions
async function updateMissingDescriptions(page: Page, limit: number = 10): Promise<number> {
  console.log('🔍 Checking for jobs with missing descriptions...');
  
  const jobsWithoutDesc = getJobsByStatus().filter((job: Job) => !job.description || job.description.trim().length < 30);
  
  if (jobsWithoutDesc.length === 0) {
    console.log('✅ All jobs have descriptions');
    return 0;
  }
  
  console.log(`📋 Found ${jobsWithoutDesc.length} jobs without descriptions. Updating first ${limit}...`);
  
  let updated = 0;
  for (let i = 0; i < Math.min(limit, jobsWithoutDesc.length); i++) {
    const job = jobsWithoutDesc[i];
    console.log(`\n🔄 Updating description for: ${job.title} at ${job.company}`);
    
    try {
      await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Use the same improved description extraction logic
      const descSelectors = [
        '.jobs-description__content',
        '.jobs-description',
        '.jobs-box__html-content',
        'div[id*="job-details"]',
        'article.jobs-description__container',
        '.jobs-details__main-content',
        '[data-test-id="job-description"]',
        '.job-description',
        '.description',
        'div[class*="description"]',
        'div[class*="content"]',
        'section[class*="description"]',
        'main .jobs-description',
        '.jobs-details',
        '.job-details',
        'div[role="main"]',
        'main',
        'article'
      ];
      
      let description = '';
      let descriptionFound = false;
      
      for (const selector of descSelectors) {
        try {
          const descPane = page.locator(selector).first();
          const count = await descPane.count();
          if (count === 0) continue;
          
          await descPane.waitFor({ state: 'visible', timeout: 2000 });
          const text = await descPane.innerText({ timeout: 3000 });
          
          if (text && text.trim().length > 30) {
            description = text.trim();
            descriptionFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (descriptionFound) {
        // Update the job in database
        const database = getDb();
        const updateStmt = database.prepare('UPDATE jobs SET description = ? WHERE id = ?');
        updateStmt.run(description, job.id);
        updated++;
        console.log(`   ✅ Updated description`);
      } else {
        console.log(`   ⚠️  Could not extract description`);
      }
      
      await randomDelay();
      
    } catch (error) {
      console.log(`   ❌ Error updating job: ${(error as Error).message}`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} job descriptions`);
  return updated;
}

async function processPage(page: Page, minScore: number, config: any, opts: SearchOptions, shouldStopNow: () => boolean = () => false): Promise<{ analyzed: number, queued: number }> {
  // Wait for initial results to load
  await page.waitForTimeout(2000);
  
  // Hide LinkedIn messaging components with CSS to prevent them from appearing
  try {
    await page.addStyleTag({
      content: `
        div[class*="msg-overlay"],
        div[class*="messaging"],
        .msg-overlay-bubble-header,
        aside[class*="msg-overlay"],
        [data-test-id*="msg-overlay"] {
          display: none !important;
          visibility: hidden !important;
        }
      `
    });
  } catch (error) {
    // CSP may block style injection - this is non-critical, continue anyway
    console.log('Note: Could not inject styles to hide messaging overlay (CSP restriction)');
  }

  // Wait a bit to ensure all cards on current page are rendered
  await page.waitForTimeout(1000);
  
  // Dismiss any modals before processing jobs
  await dismissModals(page);

  console.log('   Looking for job cards...');
  // Take a debug screenshot to see what's on the page
  await page.screenshot({ path: 'artifacts/debug-search-page.png', fullPage: true }).catch(() => {});
  
  // Extract job cards - LinkedIn uses scaffold-layout__list-item for job cards
  // Try multiple selectors for job cards (LinkedIn changes these frequently)
  let jobCards = page.locator('li.semantic-search-results-list__list-item');
  let count = await jobCards.count();
  console.log(`   Trying selector 1: found ${count} cards`);
  
  // If no results, try alternative selectors one at a time
  if (count === 0) {
    console.log('   Trying selector 2...');
    jobCards = page.locator('li.scaffold-layout__list-item');
    count = await jobCards.count();
    console.log(`   Trying selector 2: found ${count} cards`);
  }
  
  if (count === 0) {
    console.log('   ⚠️  Primary selectors found 0 cards, trying older alternatives...');
    jobCards = page.locator('ul.jobs-search__results-list > li');
    count = await jobCards.count();
    console.log(`   Trying selector 3: found ${count} cards`);
  }
  
  if (count === 0) {
    console.log('   Trying selector 4...');
    jobCards = page.locator('div.jobs-search-results__list-item');
    count = await jobCards.count();
    console.log(`   Trying selector 4: found ${count} cards`);
  }
  
  console.log(`📊 Found ${count} job cards to analyze\n`);

  let analyzed = 0;
  let queued = 0;

  // Determine which selector to use consistently throughout the loop
  let cardSelector = 'li.semantic-search-results-list__list-item';
  if (await page.locator(cardSelector).count() === 0) {
    cardSelector = 'li.scaffold-layout__list-item';
  }
  if (await page.locator(cardSelector).count() === 0) {
    cardSelector = 'ul.jobs-search__results-list > li';
  }
  if (await page.locator(cardSelector).count() === 0) {
    cardSelector = 'div.jobs-search-results__list-item';
  }

  for (let i = 0; i < count; i++) {
    // Check if we should stop before starting to process each card
    const stopRequested = shouldStopNow();
    if (stopRequested) {
      console.log(`\n⚠️  Stop signal received. Stopping search...`);
      console.log(`   Processed ${i}/${count} jobs, gracefully exiting.\n`);
      break;
    }

    try {
      console.log(`   Processing card ${i + 1}/${count}...`);
      // Re-locate job cards each iteration (DOM may have changed) - use same selector
      const card = page.locator(cardSelector).nth(i);
      
      console.log(`   Checking visibility...`);
      // Ensure card is visible
      const isVisible = await card.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        console.log(`   ⚠️  Skipping job ${i + 1}: card not visible`);
        continue;
      }
      
      // Check stop signal after visibility check
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping during job ${i + 1}...\n`);
        break;
      }
      
      console.log(`   Scrolling into view...`);
      // Scroll card into view FIRST to trigger lazy loading of content
      await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500); // Give time for content to load
      
      // Check stop signal after scrolling
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping after scrolling card ${i + 1}...\n`);
        break;
      }
      
      console.log(`   Extracting title...`);
      // Extract job title - LinkedIn's new structure uses artdeco-entity-lockup__title
      // Note: LinkedIn duplicates text for accessibility (aria-hidden + visually-hidden)
      let title = '';
      const titleSelectors = [
        '.job-card-job-posting-card-wrapper__title strong',  // Get from <strong> tag to avoid duplicates
        '.job-card-job-posting-card-wrapper__title span[aria-hidden="true"]',  // Visible span
        '.artdeco-entity-lockup__title strong',
        '.base-search-card__title',
        'a[data-control-name="job_card_title"]',
        '.job-card-list__title'
      ];
      
      for (const selector of titleSelectors) {
        const elem = card.locator(selector).first();
        const count = await elem.count();
        if (count > 0) {
          const text = await elem.innerText({ timeout: 2000 }).catch(() => null);
          if (text && text.trim()) {
            title = text.trim();
            // Clean up title: remove "with verification" and other badges/noise
            title = title
              .replace(/\s+with verification\s*$/i, '')
              .replace(/\s+verified\s*$/i, '')
              .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
              .trim();
            break;
          }
        }
      }
      
      if (!title) {
        console.log(`   ⚠️  Skipping job ${i + 1}: title not found`);
        continue;
      }
      
      // Extract company name - LinkedIn's new structure uses artdeco-entity-lockup__subtitle
      let company = '';
      const companySelectors = [
        '.artdeco-entity-lockup__subtitle',
        '.base-search-card__subtitle',
        '.job-card-container__primary-description',
        'span[class*="job-card-container__company-name"]',
        'a[data-control-name="job_card_company_link"]'
      ];
      
      for (const selector of companySelectors) {
        const elem = card.locator(selector).first();
        const count = await elem.count();
        if (count > 0) {
          const text = await elem.innerText({ timeout: 2000 }).catch(() => null);
          if (text && text.trim()) {
            company = text.trim();
            break;
          }
        }
      }
      
      if (!company) {
        company = 'Unknown Company';
      }
      
      // Extract job ID - LinkedIn's new structure uses data-job-id attribute
      let jobId = '';
      
      // First try to get data-job-id from the wrapper div
      const wrapperDiv = card.locator('.job-card-job-posting-card-wrapper[data-job-id]').first();
      jobId = await wrapperDiv.getAttribute('data-job-id', { timeout: 2000 }).catch(() => null) || '';
      
      // If not found, try to extract from href with currentJobId parameter
      if (!jobId) {
        const linkElem = card.locator('a[href*="currentJobId="]').first();
        const href = await linkElem.getAttribute('href', { timeout: 2000 }).catch(() => null);
        if (href) {
          const match = href.match(/currentJobId=(\d+)/);
          if (match) {
            jobId = match[1];
          }
        }
      }
      
      // Fallback: try old format
      if (!jobId) {
        const linkElem = card.locator('a[href*="/jobs/view/"]').first();
        const href = await linkElem.getAttribute('href', { timeout: 2000 }).catch(() => null);
        if (href) {
          const match = href.match(/\/jobs\/view\/(\d+)/);
          if (match) {
            jobId = match[1];
          }
        }
      }
      
      if (!jobId) {
        console.log(`   ⚠️  Skipping job ${i + 1}: job ID not found`);
        continue;
      }
      
      // Construct the job view URL
      const link = `https://www.linkedin.com/jobs/view/${jobId}`;

      // Check if already applied - skip early to save time
      const appliedIndicator = card.locator('span:has-text("Applied"), li-icon[type="success-pebble-icon"], .job-card-container__footer-item:has-text("Applied")');
      const alreadyApplied = await appliedIndicator.count() > 0;
      
      if (alreadyApplied) {
        console.log(`   ⏭️  Skipping job ${i + 1}: Already applied - ${title} at ${company}`);
        continue;
      }

      // Check for Easy Apply badge
      const easyApplyBadge = card.locator('span:has-text("Easy Apply"), .job-card-container__apply-method:has-text("Easy Apply")');
      const easyApply = await easyApplyBadge.count() > 0;

      // Extract posted date - LinkedIn shows relative time like "1 day ago", "2 weeks ago"
      let postedDate = '';
      
      // Function to clean up posted date text
      const cleanPostedDate = (text: string): string => {
        if (!text) return '';
        
        // Remove "Reposted" prefix if present
        let cleaned = text.replace(/^Reposted\s*/i, '').trim();
        
        // Extract just the time portion if it contains multiple parts
        const timeMatch = cleaned.match(/(\d+\s+(?:hour|day|week|month|minute|second)s?\s+ago)/i);
        if (timeMatch) {
          cleaned = timeMatch[1];
        }
        
        return cleaned;
      };
      const dateSelectors = [
        // Job detail page selectors (from the HTML we just examined)
        '.tvm__text.tvm__text--positive span',
        '.tvm__text--positive span',
        '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive',
        '.job-details-jobs-unified-top-card__tertiary-description-container span',
        // More specific selectors for the exact pattern we found
        '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive strong span',
        '.job-details-jobs-unified-top-card__tertiary-description-container strong span',
        // Selectors for "Reposted" format
        '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive strong',
        '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text--positive',
        // Job card selectors (for search results)
        'time',
        '.job-card-container__listed-time',
        '.job-card-container__metadata-item time',
        '[data-test-job-search-card-listing-date]',
        '.job-card-container__metadata-item',
        '.jobs-search-results__list-item time',
        '.job-card-container time',
        '[data-test-id="job-search-card-listing-date"]',
        '.job-card-container__metadata-item--bullet',
        // Additional selectors for different layouts
        '.tvm__text--positive',
        '.job-details-jobs-unified-top-card__tertiary-description-container',
        '.job-details-jobs-unified-top-card__primary-description-container'
      ];
      
      for (const selector of dateSelectors) {
        // Try both card-specific and page-wide selectors
        const dateElem = card.locator(selector).first();
        const count = await dateElem.count();
        if (count > 0) {
          const text = await dateElem.textContent({ timeout: 2000 }).catch(() => null);
          if (text && text.trim()) {
            const cleaned = cleanPostedDate(text.trim());
            if (cleaned) {
              postedDate = cleaned;
              break;
            }
          }
        }
        
        // Also try page-wide selectors for job detail pages
        const pageDateElem = page.locator(selector).first();
        const pageCount = await pageDateElem.count();
        if (pageCount > 0) {
          const text = await pageDateElem.textContent({ timeout: 2000 }).catch(() => null);
          if (text && text.trim()) {
            const cleaned = cleanPostedDate(text.trim());
            if (cleaned) {
              postedDate = cleaned;
              break;
            }
          }
        }
      }
      
      // Fallback: look for any text containing time-related words
      if (!postedDate) {
        const timePatterns = [
          'ago', 'day', 'hour', 'week', 'month', 'yesterday', 'today', 'minute', 'second'
        ];
        
        for (const pattern of timePatterns) {
          const timeElem = page.locator(`text=${pattern}`).first();
          const count = await timeElem.count();
          if (count > 0) {
            const text = await timeElem.textContent({ timeout: 1000 }).catch(() => null);
            if (text && text.trim() && text.includes(pattern)) {
              const cleaned = cleanPostedDate(text.trim());
              if (cleaned) {
                postedDate = cleaned;
                break;
              }
            }
          }
        }
      }
      

      // Try normal click first, then force click if blocked
      try {
        await card.click({ timeout: 3000 });
      } catch (error) {
        // If click is blocked by overlay, force the click
        try {
          await card.click({ force: true, timeout: 2000 });
        } catch (forceError) {
          continue;
        }
      }
      
      await page.waitForTimeout(1500);

      // Extract full description from detail pane - try multiple selectors
      const descSelectors = [
        // Current LinkedIn selectors (2024)
        '.jobs-description__content',
        '.jobs-description',
        '.jobs-box__html-content',
        'div[id*="job-details"]',
        'article.jobs-description__container',
        '.jobs-details__main-content',
        // Additional selectors for different layouts
        '[data-test-id="job-description"]',
        '.job-description',
        '.description',
        'div[class*="description"]',
        'div[class*="content"]',
        'section[class*="description"]',
        'main .jobs-description',
        '.jobs-details',
        '.job-details',
        // Fallback selectors
        'div[role="main"]',
        'main',
        'article'
      ];
      
      let description = '';
      let descriptionFound = false;
      
      // Wait a bit longer for content to load
      await page.waitForTimeout(2000);
      
      for (const selector of descSelectors) {
        try {
          const descPane = page.locator(selector).first();
          const count = await descPane.count();
          if (count === 0) continue;
          
          await descPane.waitFor({ state: 'visible', timeout: 2000 });
          const text = await descPane.innerText({ timeout: 3000 });
          
          if (text && text.trim().length > 30) {
            description = text.trim();
            descriptionFound = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      // If no description found, try to get any text content from the main area
      if (!descriptionFound) {
        try {
          const mainContent = page.locator('main, [role="main"], .jobs-details, .job-details').first();
          const count = await mainContent.count();
          if (count > 0) {
            await mainContent.waitFor({ state: 'visible', timeout: 2000 });
            const text = await mainContent.innerText({ timeout: 3000 });
            if (text && text.trim().length > 30) {
              description = text.trim();
              descriptionFound = true;
            }
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      if (!descriptionFound) {
        description = title; // Fallback to title
      }
      
      // Check stop signal after description extraction
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping after extracting description for card ${i + 1}...\n`);
        break;
      }

      analyzed++;

      // Check for duplicates before expensive LLM analysis
      if (jobExistsByUrl(link)) {
        const existingJob = getJobByUrl(link);
        console.log(`   ${analyzed}/${count} ${title} at ${company}`);
        console.log(`        ⏭️  Skipped (already in database - ${existingJob?.status || 'unknown'} status)`);
        continue;
      }

      // Check rejection filters before ranking
      const { applyFilters } = await import('../ai/rejection-filters.js');
      const filterResult = applyFilters({ title, company, description }, opts.profile);
      if (filterResult.blocked) {
        console.log(`   ${analyzed}/${count} ${title} at ${company}`);
        console.log(`        ⚠️  Filtered: ${filterResult.reason}`);
        continue;
      }

      // Check if we've already applied to this company+title combination
      const { hasAppliedToCompanyTitle } = await import('../lib/db.js');
      if (hasAppliedToCompanyTitle(company, title)) {
        console.log(`   ${analyzed}/${count} ${title} at ${company}`);
        console.log(`        ⏭️  Skipping: Already applied to this company+title`);
        continue;
      }

      // Check if we should stop before expensive LLM operation
      const stopBeforeRank = shouldStopNow();
      if (stopBeforeRank) {
        console.log(`\n⚠️  Stop detected before ranking job ${i + 1}. Exiting loop.\n`);
        break;
      }

      // Generate job ID for context
      const jobHashId = crypto.createHash('md5').update(link).digest('hex');
      
      // Set job context for error logging
      process.env.JOB_ID = jobHashId;
      
      console.log(`   🤖 Ranking job ${i + 1}...`);
      
      // Rank the job (expensive LLM operation - only for new jobs)
      const ranking = await rankJob(
        { title, company, description },
        opts.profile || 'coreAzure' // Use the actual profile from CLI, fallback to coreAzure
      );
      
      console.log(`   ✓ Ranking complete for job ${i + 1}`);
      
      // Check if stop was requested during LLM operation
      const stopAfterRank = shouldStopNow();
      if (stopAfterRank) {
        console.log(`\n⚠️  Stop detected after ranking job ${i + 1}. Exiting loop.\n`);
        delete process.env.JOB_ID;
        break;
      }
      
      // Clear job context
      delete process.env.JOB_ID;

      console.log(`   ${analyzed}/${count} ${title} at ${company}`);
      console.log(`        Score: ${ranking.fitScore}/100`);
      console.log(`        Azure: ${ranking.categoryScores.coreAzure} | Security: ${ranking.categoryScores.security} | Events: ${ranking.categoryScores.eventDriven}`);
      console.log(`        Perf: ${ranking.categoryScores.performance} | DevOps: ${ranking.categoryScores.devops} | Senior: ${ranking.categoryScores.seniority}`);
      console.log(`        .NET: ${ranking.categoryScores.coreNet} | Frontend: ${ranking.categoryScores.frontendFrameworks} | Legacy: ${ranking.categoryScores.legacyModernization}`);
      
      if (ranking.blockers.length > 0) {
        console.log(`        ⚠️  Blockers: ${ranking.blockers.join(', ')}`);
      }
      
      if (ranking.missingKeywords.length > 0 && ranking.missingKeywords.length <= 3) {
        console.log(`        ⚠️  Missing: ${ranking.missingKeywords.join(', ')}`);
      }

      if (ranking.fitScore >= minScore) {
        
        const job = {
          id: jobHashId,
          title,
          company,
          url: link,
          easy_apply: easyApply,
          rank: ranking.fitScore,
          status: 'queued' as const,
          fit_reasons: JSON.stringify(ranking.reasons),
          must_haves: JSON.stringify(ranking.mustHaves),
          blockers: JSON.stringify(ranking.blockers),
          category_scores: JSON.stringify(ranking.categoryScores),
          missing_keywords: JSON.stringify(ranking.missingKeywords),
          posted_date: postedDate || undefined,
          description: description || undefined,
          profile: opts.profile || 'core' // Store the search profile used to find this job
        };

        // Save immediately to database instead of adding to array
        try {
          const result = addJobs([job]);
          if (result.inserted > 0) {
            queued++;
            console.log(`        ✅ Queued (${easyApply ? 'Easy Apply' : 'External'})`);
          } else if (result.requeued > 0) {
            queued++;
            console.log(`        🔄 Requeued`);
          } else {
            console.log(`        ⏭️  Skipped`);
          }
        } catch (error) {
          console.log(`        ❌ Failed to save: ${(error as Error).message}`);
        }
      } else {
        console.log(`        ⏭️  Skipped (below threshold)`);
      }

      await randomDelay();

    } catch (error) {
      const err = error as Error;
      let errorMsg = err.message;
      
      // Improve error messages for common issues
      if (errorMsg.includes('Expected object, received array')) {
        errorMsg = 'LLM returned array instead of object - retrying with better prompt';
      } else if (errorMsg.includes('invalid_type') || errorMsg.startsWith('[')) {
        errorMsg = 'LLM returned invalid data format - validation failed';
      } else if (errorMsg.includes('Failed to get valid JSON')) {
        errorMsg = 'LLM failed to return valid JSON after retries';
      }
      
      console.log(`   ⚠️  Error processing job ${i + 1}: ${errorMsg}`);
      
      // Log error to database if we have job context
      if (process.env.JOB_ID) {
        try {
          const { logRun } = await import('../lib/db.js');
          logRun({
            job_id: process.env.JOB_ID,
            step: 'job_processing',
            ok: false,
            log: errorMsg
          });
        } catch (dbError) {
          console.error('Failed to log job processing error to database:', dbError);
        }
        // Clear job context
        delete process.env.JOB_ID;
      }
    }
  }

  return { analyzed, queued };
}

function buildSearchUrl(opts: SearchOptions, page: number = 1): string {
  const params = new URLSearchParams();
  
  // Use profile-based Boolean search if specified, otherwise use keywords
  if (opts.profile && BOOLEAN_SEARCHES[opts.profile]) {
    params.set('keywords', BOOLEAN_SEARCHES[opts.profile]);
  } else if (opts.keywords) {
    params.set('keywords', opts.keywords);
  } else {
    throw new Error('Either keywords or profile must be specified');
  }
  
  if (opts.location) {
    params.set('location', opts.location);
  }
  
  // Don't add remote filter if using profile (already included in Boolean search)
  if (opts.remote && !opts.profile) {
    params.set('f_WT', '2'); // Remote filter
  }
  
  // Add contract job type filter for contract profile
  if (opts.profile === 'contract') {
    params.set('f_JT', 'C'); // Contract job type
  }
  
  if (opts.datePosted) {
    const dateMap = {
      day: 'r86400',
      week: 'r604800',
      month: 'r2592000'
    };
    params.set('f_TPR', dateMap[opts.datePosted]);
  }

  // Add page parameter for pagination
  if (page > 1) {
    params.set('start', ((page - 1) * 25).toString()); // LinkedIn shows 25 jobs per page
  }

  // Add origin parameter to match LinkedIn's search behavior
  params.set('origin', 'JOBS_HOME_SEARCH_BUTTON');

  return `https://www.linkedin.com/jobs/search-results/?${params.toString()}`;
}

export async function searchCommand(opts: SearchOptions): Promise<void> {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const config = loadConfig();
  const minScore = opts.minScore ?? config.minFitScore;
  const maxPages = opts.maxPages ?? 999;
  const startPage = opts.startPage ?? 1;

  // Handle update descriptions mode
  if (opts.updateDescriptions) {
    console.log('🔄 Starting description update mode...');
    console.log('   This will update job descriptions for existing jobs with missing descriptions');
    console.log();
    
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-extensions',  // Prevent browser extensions from interfering
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    try {
      const context = await browser.newContext({
        storageState: './storage/storageState.json'
      });
      
      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 720 });
      
      const updated = await updateMissingDescriptions(page, 20); // Update up to 20 jobs
      
      console.log(`\n✅ Description update complete. Updated ${updated} jobs.`);
      
    } finally {
      await browser.close();
    }
    
    return;
  }

  console.log('🔍 Starting job search...');
  const startTime = Date.now();
  if (opts.profile) {
    console.log(`   Profile: ${opts.profile} (using Boolean search)`);
  } else {
    console.log(`   Keywords: ${opts.keywords}`);
  }
  if (opts.location) console.log(`   Location: ${opts.location}`);
  if (opts.remote && !opts.profile) console.log(`   Remote: Yes`);
  if (opts.datePosted) console.log(`   Date Posted: < ${opts.datePosted}`);
  console.log(`   Min Fit Score: ${minScore}`);
  console.log(`   Start Page: ${startPage}`);
  if (maxPages < 999) {
    console.log(`   Max Pages: ${maxPages}`);
  } else {
    console.log(`   Max Pages: All available`);
  }
  console.log();

  // Clear any existing stop signal from previous runs
  clearStopSignal();
  
  // Flag to signal graceful shutdown
  let shouldStop = false;

  // Check function that combines flag and file-based signal (for Windows compatibility)
  const shouldStopNow = () => {
    if (!shouldStop && checkStopSignal()) {
      console.log('\n⚠️  Stop signal detected (file-based), finishing current job...');
      shouldStop = true;
      console.log('   Stop flag set to true');
    }
    return shouldStop;
  };

  // Setup graceful shutdown handler - set flag instead of immediate exit
  const shutdownHandler = () => {
    if (!shouldStop) {
      console.log('\n⚠️  Stop requested, finishing current job...');
      shouldStop = true;
      console.log('   Stop flag set to true');
    }
  };

  // Prevent default exit behavior and use our flag-based shutdown
  process.on('SIGTERM', (signal) => {
    shutdownHandler();
    // Don't exit immediately - let the graceful shutdown complete
  });
  
  process.on('SIGINT', (signal) => {
    shutdownHandler();
    // Don't exit immediately - let the graceful shutdown complete
  });

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: [
      '--disable-extensions',  // Prevent browser extensions from interfering
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  console.log('📄 Loading search results...');
  
  const searchUrl = buildSearchUrl(opts, startPage);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

  let totalAnalyzed = 0;
  let totalQueued = 0;
  let currentPage = startPage;

  // Process pages in a loop
  while (currentPage <= maxPages && !shouldStop) {
    const pageDisplay = maxPages >= 999 ? 'all' : maxPages.toString();
    console.log(`\n📄 Processing page ${currentPage}/${pageDisplay}...`);
    
    const pageResult = await processPage(page, minScore, config, opts, shouldStopNow);
    totalAnalyzed += pageResult.analyzed;
    totalQueued += pageResult.queued;

    console.log(`\n📊 Page ${currentPage} Summary:`);
    console.log(`   Analyzed: ${pageResult.analyzed}`);
    console.log(`   Queued: ${pageResult.queued}`);
    console.log(`   Success Rate: ${pageResult.analyzed > 0 ? Math.round((pageResult.queued / pageResult.analyzed) * 100) : 0}%`);

    // Check if we should stop
    if (shouldStop) {
      console.log('\n⚠️  Stopping gracefully...');
      break;
    }

    // Check if there's a next page
    if (currentPage < maxPages) {
      const nextButton = page.locator('.jobs-search-pagination__button--next');
      const nextButtonExists = await nextButton.count() > 0;
      
      if (nextButtonExists) {
        console.log(`\n➡️  Navigating to page ${currentPage + 1}...`);
        try {
          await nextButton.click({ timeout: 5000 });
          await page.waitForTimeout(3000); // Wait for page to load
          currentPage++;
        } catch (error) {
          console.log(`   ⚠️  Could not navigate to next page: ${(error as Error).message}`);
          break;
        }
      } else {
        console.log(`\n🏁 No more pages available (reached end of results)`);
        break;
      }
    } else {
      break;
    }
  }

  await browser.close();

  const endTime = Date.now();
  const totalTime = Math.round((endTime - startTime) / 1000);
  const jobsPerMinute = totalTime > 0 ? Math.round((totalAnalyzed / totalTime) * 60) : 0;

  console.log(`\n📈 Final Summary:`);
  console.log(`   Pages Processed: ${currentPage}`);
  console.log(`   Total Analyzed: ${totalAnalyzed}`);
  console.log(`   Total Queued: ${totalQueued}`);
  console.log(`   Overall Success Rate: ${totalAnalyzed > 0 ? Math.round((totalQueued / totalAnalyzed) * 100) : 0}%`);
  console.log(`   Min Score Threshold: ${minScore}`);
  console.log(`   Average Jobs per Page: ${currentPage > 0 ? Math.round(totalAnalyzed / currentPage) : 0}`);
  console.log(`   Processing Time: ${totalTime}s (${jobsPerMinute} jobs/min)`);
  
  if (shouldStop) {
    console.log('\n✅ Search stopped gracefully.\n');
  } else {
    console.log('\n✅ Search complete!\n');
  }
  
  // Clean up signal handlers
  process.removeListener('SIGTERM', shutdownHandler);
  process.removeListener('SIGINT', shutdownHandler);
  
  // Exit cleanly
  process.exit(0);
}



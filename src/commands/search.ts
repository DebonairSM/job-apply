import { chromium, Page } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession } from '../lib/session.js';
import { addJobs, Job } from '../lib/db.js';
import { rankJob } from '../ai/ranker.js';
import { randomDelay } from '../lib/resilience.js';
import { BOOLEAN_SEARCHES } from '../ai/profiles.js';
import crypto from 'crypto';

export interface SearchOptions {
  keywords?: string;
  profile?: 'core' | 'security' | 'event-driven' | 'performance' | 'devops' | 'backend';
  location?: string;
  remote?: boolean;
  datePosted?: 'day' | 'week' | 'month';
  minScore?: number;
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

function buildSearchUrl(opts: SearchOptions): string {
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
  
  if (opts.datePosted) {
    const dateMap = {
      day: 'r86400',
      week: 'r604800',
      month: 'r2592000'
    };
    params.set('f_TPR', dateMap[opts.datePosted]);
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

  console.log('🔍 Starting job search...');
  if (opts.profile) {
    console.log(`   Profile: ${opts.profile} (using Boolean search)`);
  } else {
    console.log(`   Keywords: ${opts.keywords}`);
  }
  if (opts.location) console.log(`   Location: ${opts.location}`);
  if (opts.remote && !opts.profile) console.log(`   Remote: Yes`);
  if (opts.datePosted) console.log(`   Date Posted: < ${opts.datePosted}`);
  console.log(`   Min Fit Score: ${minScore}\n`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo
  });

  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  const searchUrl = buildSearchUrl(opts);
  console.log('📄 Loading search results...');
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

  // Wait for initial results to load
  await page.waitForTimeout(2000);
  
  // Hide LinkedIn messaging components with CSS to prevent them from appearing
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

  // Quick escape press to dismiss any non-messaging modals
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);

  // Note: LinkedIn uses pagination, not infinite scroll
  // Wait a bit more to ensure all cards on current page are rendered
  await page.waitForTimeout(1000);
  
  // Dismiss any modals before processing jobs
  await dismissModals(page);

  // Extract job cards - LinkedIn uses scaffold-layout__list-item for job cards
  let jobCards = page.locator('li.scaffold-layout__list-item');
  let count = await jobCards.count();
  
  // If no results, try alternative selectors one at a time
  if (count === 0) {
    console.log('   ⚠️  Primary selector found 0 cards, trying alternatives...');
    jobCards = page.locator('ul.jobs-search__results-list > li');
    count = await jobCards.count();
  }
  
  if (count === 0) {
    jobCards = page.locator('div.jobs-search-results__list-item');
    count = await jobCards.count();
  }
  
  console.log(`\n📊 Found ${count} job cards to analyze\n`);

  const jobs: Omit<Job, 'created_at'>[] = [];
  let analyzed = 0;
  let queued = 0;

  // Determine which selector to use consistently throughout the loop
  let cardSelector = 'li.scaffold-layout__list-item';
  if (await page.locator(cardSelector).count() === 0) {
    cardSelector = 'ul.jobs-search__results-list > li';
  }
  if (await page.locator(cardSelector).count() === 0) {
    cardSelector = 'div.jobs-search-results__list-item';
  }

  for (let i = 0; i < count; i++) {
    try {
      // Re-locate job cards each iteration (DOM may have changed) - use same selector
      const card = page.locator(cardSelector).nth(i);
      
      // Ensure card is visible
      const isVisible = await card.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        console.log(`   ⚠️  Skipping job ${i + 1}: card not visible`);
        continue;
      }
      
      // Extract job title - LinkedIn's new structure uses artdeco-entity-lockup__title
      let title = '';
      const titleSelectors = [
        '.job-card-job-posting-card-wrapper__title',
        '.artdeco-entity-lockup__title',
        '.base-search-card__title',
        'a[data-control-name="job_card_title"]',
        '.job-card-list__title'
      ];
      
      for (const selector of titleSelectors) {
        const elem = card.locator(selector).first();
        const count = await elem.count();
        if (count > 0) {
          const text = await elem.textContent({ timeout: 2000 }).catch(() => null);
          if (text && text.trim()) {
            title = text.trim();
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
          const text = await elem.textContent({ timeout: 2000 }).catch(() => null);
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

      // Check for Easy Apply badge
      const easyApplyBadge = card.locator('span:has-text("Easy Apply"), .job-card-container__apply-method:has-text("Easy Apply")');
      const easyApply = await easyApplyBadge.count() > 0;

      // Scroll card into view and wait for it to be stable
      await card.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300); // Let DOM settle
      
      // Try normal click first, then force click if blocked
      try {
        await card.click({ timeout: 3000 });
      } catch (error) {
        // If click is blocked by overlay, force the click
        try {
          await card.click({ force: true, timeout: 2000 });
        } catch (forceError) {
          console.log(`   ⚠️  Could not click job ${i + 1}, skipping`);
          continue;
        }
      }
      
      await page.waitForTimeout(1500);

      // Extract full description from detail pane - try multiple selectors
      const descSelectors = [
        '.jobs-description__content',
        '.jobs-description',
        '.jobs-box__html-content',
        'div[id*="job-details"]',
        'article.jobs-description__container',
        '.jobs-details__main-content'
      ];
      
      let description = '';
      for (const selector of descSelectors) {
        try {
          const descPane = page.locator(selector).first();
          await descPane.waitFor({ state: 'visible', timeout: 3000 });
          description = await descPane.innerText({ timeout: 2000 });
          if (description && description.length > 50) {
            break; // Found valid description
          }
        } catch {
          continue; // Try next selector
        }
      }
      
      if (!description || description.length < 50) {
        console.log(`   ⚠️  Could not extract description for: ${title}`);
        description = title; // Fallback to title
      }

      analyzed++;

      // Rank the job
      const ranking = await rankJob(
        { title, company, description },
        config.profileSummary
      );

      console.log(`   ${analyzed}/${count} ${title} at ${company}`);
      console.log(`        Score: ${ranking.fitScore}/100`);
      console.log(`        Azure: ${ranking.categoryScores.coreAzure} | Security: ${ranking.categoryScores.security} | Events: ${ranking.categoryScores.eventDriven}`);
      console.log(`        Perf: ${ranking.categoryScores.performance} | DevOps: ${ranking.categoryScores.devops} | Senior: ${ranking.categoryScores.seniority}`);
      
      if (ranking.blockers.length > 0) {
        console.log(`        ⚠️  Blockers: ${ranking.blockers.join(', ')}`);
      }
      
      if (ranking.missingKeywords.length > 0 && ranking.missingKeywords.length <= 3) {
        console.log(`        ⚠️  Missing: ${ranking.missingKeywords.join(', ')}`);
      }

      if (ranking.fitScore >= minScore) {
        const jobId = crypto.createHash('md5').update(link).digest('hex');
        
        jobs.push({
          id: jobId,
          title,
          company,
          url: link,
          easy_apply: easyApply,
          rank: ranking.fitScore,
          status: 'queued',
          fit_reasons: JSON.stringify(ranking.reasons),
          must_haves: JSON.stringify(ranking.mustHaves),
          blockers: JSON.stringify(ranking.blockers),
          category_scores: JSON.stringify(ranking.categoryScores),
          missing_keywords: JSON.stringify(ranking.missingKeywords)
        });

        queued++;
        console.log(`        ✅ Queued (${easyApply ? 'Easy Apply' : 'External'})`);
      } else {
        console.log(`        ⏭️  Skipped (below threshold)`);
      }

      await randomDelay();

    } catch (error) {
      console.log(`   ⚠️  Error processing job ${i + 1}: ${(error as Error).message}`);
    }
  }

  // Save to database
  if (jobs.length > 0) {
    const inserted = addJobs(jobs);
    console.log(`\n✨ Added ${inserted} new jobs to queue`);
  } else {
    console.log('\n⚠️  No jobs met the criteria');
  }

  await browser.close();

  console.log(`\n📈 Summary:`);
  console.log(`   Analyzed: ${analyzed}`);
  console.log(`   Queued: ${queued}`);
  console.log(`   Min Score: ${minScore}`);
  console.log('\n✅ Search complete!\n');
}



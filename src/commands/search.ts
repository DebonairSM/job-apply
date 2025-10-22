import { chromium } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession } from '../lib/session.js';
import { addJobs, Job } from '../lib/db.js';
import { rankJob } from '../ai/ranker.js';
import { randomDelay } from '../lib/resilience.js';
import crypto from 'crypto';

export interface SearchOptions {
  keywords: string;
  location?: string;
  remote?: boolean;
  datePosted?: 'day' | 'week' | 'month';
  minScore?: number;
}

function buildSearchUrl(opts: SearchOptions): string {
  const params = new URLSearchParams();
  params.set('keywords', opts.keywords);
  
  if (opts.location) {
    params.set('location', opts.location);
  }
  
  if (opts.remote) {
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

  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

export async function searchCommand(opts: SearchOptions): Promise<void> {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const config = loadConfig();
  const minScore = opts.minScore ?? config.minFitScore;

  console.log('🔍 Starting job search...');
  console.log(`   Keywords: ${opts.keywords}`);
  if (opts.location) console.log(`   Location: ${opts.location}`);
  if (opts.remote) console.log(`   Remote: Yes`);
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

  // Wait for results to load
  await page.waitForTimeout(2000);

  // Scroll to load more results (3-5 pages worth)
  console.log('📜 Scrolling to load more results...');
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 3000);
    await randomDelay();
  }

  await page.waitForTimeout(1000);

  // Extract job cards
  const jobCards = page.locator('ul.jobs-search__results-list > li, div.jobs-search-results__list-item');
  const count = await jobCards.count();
  console.log(`\n📊 Found ${count} job cards, analyzing...\n`);

  const jobs: Omit<Job, 'created_at'>[] = [];
  let analyzed = 0;
  let queued = 0;

  for (let i = 0; i < count; i++) {
    try {
      const card = jobCards.nth(i);
      
      // Extract basic info from card
      const titleElem = card.locator('.base-search-card__title, .job-card-list__title');
      const companyElem = card.locator('.base-search-card__subtitle, .job-card-container__company-name');
      const linkElem = card.locator('a.base-card__full-link, a.job-card-list__title');
      
      const title = (await titleElem.innerText()).trim();
      const company = (await companyElem.innerText()).trim();
      const link = await linkElem.getAttribute('href') ?? '';
      
      if (!link || !title) continue;

      // Check for Easy Apply badge
      const easyApplyBadge = card.locator('span:has-text("Easy Apply"), .job-card-container__apply-method:has-text("Easy Apply")');
      const easyApply = await easyApplyBadge.count() > 0;

      // Click to open job detail pane
      await card.click();
      await page.waitForTimeout(1500);

      // Extract full description from detail pane
      const descPane = page.locator('.jobs-description, .jobs-box__html-content, #job-details');
      await descPane.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      
      let description = '';
      try {
        description = await descPane.innerText();
      } catch (error) {
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
          blockers: JSON.stringify(ranking.blockers)
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



import { chromium, Page } from 'playwright';
import { STORAGE_STATE_PATH, loadConfig, hasSession, getResumePath } from '../lib/session.js';
import { getJobsByStatus, updateJobStatus, getJobById, logRun } from '../lib/db.js';
import { synthesizeAnswers } from '../ai/answers.js';
import { mapLabelsSmart, CanonicalKey } from '../ai/mapper.js';
import { startTracing, stopTracing, takeScreenshot, randomDelay } from '../lib/resilience.js';
import { GreenhouseAdapter } from '../adapters/greenhouse.js';
import { LeverAdapter } from '../adapters/lever.js';
import { WorkdayAdapter } from '../adapters/workday.js';
import { ATSAdapter } from '../adapters/base.js';

export interface ApplyOptions {
  easy?: boolean;
  external?: boolean;
  jobId?: string;
  dryRun?: boolean;
}

const ADAPTERS: ATSAdapter[] = [
  LeverAdapter,
  GreenhouseAdapter,
  WorkdayAdapter
];

async function fillEasyApply(
  page: Page,
  jobId: string,
  answers: Record<string, string>,
  resumePath: string,
  dryRun: boolean
): Promise<boolean> {
  // Find the Easy Apply button using JavaScript to avoid overlay issues
  const easyApplyButton = await page.evaluate(() => {
    // Find all buttons on the page
    const buttons = Array.from(document.querySelectorAll('button'));
    
    // Look for the Easy Apply button - must have the right class and text/aria-label
    for (const btn of buttons) {
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const text = btn.textContent || '';
      const classes = btn.className || '';
      
      // Must be a jobs-apply-button and have Easy Apply text
      if (classes.includes('jobs-apply-button') && 
          ariaLabel.includes('Easy Apply to') &&
          text.includes('Easy Apply')) {
        return {
          found: true,
          ariaLabel,
          text: text.trim(),
          id: btn.id,
          dataJobId: btn.getAttribute('data-job-id')
        };
      }
    }
    
    return { found: false };
  });
  
  if (!easyApplyButton.found) {
    console.log('   ❌ Easy Apply button not found');
    await takeScreenshot(page, jobId, 'button_not_found');
    return false;
  }
  
  console.log(`      Found Easy Apply button: "${easyApplyButton.text}"`);
  
  // Scroll page to top first to ensure button area is visible
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  
  // Take screenshot before clicking
  await takeScreenshot(page, jobId, 'before_click');
  
  // Store current URL to verify we don't navigate away
  const beforeUrl = page.url();
  
  // Use JavaScript click to bypass any overlay issues
  const clickResult = await page.evaluate((buttonInfo) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    
    // Find the exact button we identified
    for (const btn of buttons) {
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const text = btn.textContent?.trim() || '';
      const classes = btn.className || '';
      
      if (classes.includes('jobs-apply-button') && 
          ariaLabel.includes('Easy Apply to') &&
          text.includes('Easy Apply')) {
        
        // Scroll into view
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Click using JavaScript
        btn.click();
        
        return { success: true, clicked: true };
      }
    }
    
    return { success: false, clicked: false };
  }, easyApplyButton);
  
  if (!clickResult.success) {
    console.log('   ❌ Could not click Easy Apply button');
    await takeScreenshot(page, jobId, 'button_click_failed');
    return false;
  }
  
  // Wait a moment for any navigation or modal
  await page.waitForTimeout(1500);
  
  // Check if we navigated away (shouldn't happen with Easy Apply)
  const afterUrl = page.url();
  if (afterUrl !== beforeUrl && !afterUrl.includes('/jobs/view/')) {
    console.log(`   ❌ Unexpected navigation to: ${afterUrl}`);
    console.log('      Going back to job page...');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    return false;
  }
  
  // Wait for modal
  const modal = page.locator('[data-test-modal], .jobs-easy-apply-modal, [role="dialog"]');
  await modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

  let stepNum = 0;
  const maxSteps = 8;

  for (stepNum = 0; stepNum < maxSteps; stepNum++) {
    await page.waitForTimeout(800);

    // Take screenshot
    const screenshotPath = await takeScreenshot(page, jobId, stepNum);

    // Extract labels from current step
    const labels = await extractLabels(page);
    console.log(`      Step ${stepNum + 1}: Found ${labels.length} fields`);

    if (labels.length > 0) {
      // Map labels to canonical keys
      const mappings = await mapLabelsSmart(labels);
      
      if (dryRun) {
        console.log('      [DRY RUN] Would fill:');
        for (const mapping of mappings) {
          if (mapping.key !== 'unknown' && answers[mapping.key]) {
            console.log(`        - ${mapping.label} → ${mapping.key} = "${answers[mapping.key]}"`);
          }
        }
      } else {
        // Fill fields
        for (const mapping of mappings) {
          if (mapping.key === 'unknown') continue;
          
          const value = answers[mapping.key];
          if (!value) continue;

          await fillFieldByLabel(page, mapping.label, value);
        }

        // Try to upload resume
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.count() > 0) {
          try {
            await fileInput.first().setInputFiles(resumePath);
            console.log('      📎 Resume uploaded');
          } catch (error) {
            console.log('      ⚠️  Resume upload failed');
          }
        }
      }
    }

    // Log step
    logRun({
      job_id: jobId,
      step: `easy_apply_step_${stepNum}`,
      ok: true,
      log: `Processed ${labels.length} fields`,
      screenshot_path: screenshotPath
    });

    // Try to proceed
    const action = await nextOrSubmit(page, dryRun);
    console.log(`      Action: ${action}`);

    if (action === 'submit') {
      console.log('   ✅ Application submitted!');
      return true;
    }

    if (action === 'done') {
      console.log('   ℹ️  Application completed (or already applied)');
      return true;
    }

    if (action === 'stuck') {
      console.log('   ⚠️  Stuck - manual intervention needed');
      return false;
    }

    await randomDelay();
  }

  console.log('   ⚠️  Max steps reached without submitting');
  return false;
}

async function fillExternalApply(
  page: Page,
  jobId: string,
  answers: Record<string, string>,
  resumePath: string,
  dryRun: boolean
): Promise<boolean> {
  // Find external apply link
  const applyLinks = page.locator('a:has-text("Apply"), a:has-text("Apply on company site"), button:has-text("Apply")');
  if (await applyLinks.count() === 0) {
    console.log('   ❌ No external apply link found');
    return false;
  }

  // Click and wait for new page
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page', { timeout: 15000 }),
    applyLinks.first().click()
  ]).catch(() => [null]);

  if (!newPage) {
    console.log('   ❌ Failed to open external application page');
    return false;
  }

  await newPage.waitForLoadState('domcontentloaded');
  await newPage.waitForTimeout(2000);

  const url = newPage.url();
  console.log(`   🔗 External URL: ${url}`);

  // Detect ATS
  let adapter: ATSAdapter | null = null;
  for (const a of ADAPTERS) {
    if (await a.detect(newPage)) {
      adapter = a;
      break;
    }
  }

  if (adapter) {
    console.log(`   🏢 Detected: ${adapter.name}`);
    
    // Smoke test
    const smokeOk = await adapter.smoke(newPage);
    if (!smokeOk) {
      console.log(`   ⚠️  ${adapter.name} smoke test failed`);
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would fill ${adapter.name} form`);
    } else {
      await adapter.fill(newPage, answers, resumePath);
      console.log(`   ✅ ${adapter.name} form filled`);
    }
  } else {
    console.log('   ℹ️  Unknown ATS, attempting generic fill');
    
    if (!dryRun) {
      await genericFill(newPage, answers, resumePath);
    }
  }

  // Pause for human review
  if (!dryRun) {
    console.log('   ⏸️  Pausing for human review (4 seconds)...');
    await newPage.waitForTimeout(4000);
  }

  await takeScreenshot(newPage, jobId, 'external_final');
  await newPage.close();

  return true;
}

async function genericFill(page: Page, answers: Record<string, string>, resumePath: string): Promise<void> {
  for (const [key, value] of Object.entries(answers)) {
    // Try label
    try {
      const byLabel = page.getByLabel(new RegExp(key.replace(/_/g, '\\s*'), 'i'));
      if (await byLabel.count() > 0) {
        await byLabel.first().fill(value);
        continue;
      }
    } catch (error) {
      // Continue
    }

    // Try role textbox
    try {
      const byRole = page.getByRole('textbox', { name: new RegExp(key.replace(/_/g, '\\s*'), 'i') });
      if (await byRole.count() > 0) {
        await byRole.first().fill(value);
      }
    } catch (error) {
      // Continue
    }
  }

  // Upload resume
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count() > 0) {
    try {
      await fileInput.first().setInputFiles(resumePath);
    } catch (error) {
      // Ignore
    }
  }
}

async function extractLabels(page: Page): Promise<string[]> {
  const labels: string[] = [];

  // Extract from <label> elements
  const labelElements = page.locator('label');
  const labelCount = await labelElements.count();
  for (let i = 0; i < labelCount; i++) {
    try {
      const text = await labelElements.nth(i).innerText();
      if (text.trim()) labels.push(text.trim());
    } catch (error) {
      // Ignore
    }
  }

  // Extract from aria-label
  const ariaElements = page.locator('[aria-label]');
  const ariaCount = await ariaElements.count();
  for (let i = 0; i < Math.min(ariaCount, 20); i++) {
    try {
      const ariaLabel = await ariaElements.nth(i).getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim() && !labels.includes(ariaLabel.trim())) {
        labels.push(ariaLabel.trim());
      }
    } catch (error) {
      // Ignore
    }
  }

  return [...new Set(labels)]; // Remove duplicates
}

async function fillFieldByLabel(page: Page, label: string, value: string): Promise<void> {
  try {
    // Try getByLabel
    const byLabel = page.getByLabel(label);
    if (await byLabel.count() > 0) {
      await byLabel.first().fill(value);
      return;
    }
  } catch (error) {
    // Try other methods
  }

  try {
    // Try finding label and then associated input
    const labelElem = page.locator(`label:has-text("${label}")`);
    if (await labelElem.count() > 0) {
      const forAttr = await labelElem.first().getAttribute('for');
      if (forAttr) {
        const input = page.locator(`#${forAttr}`);
        if (await input.count() > 0) {
          await input.first().fill(value);
          return;
        }
      }
    }
  } catch (error) {
    // Ignore
  }
}

async function nextOrSubmit(page: Page, dryRun: boolean): Promise<'next' | 'submit' | 'done' | 'stuck'> {
  // Check for submit button
  const submitBtn = page.locator('button:has-text("Submit application"), button:has-text("Submit")');
  if (await submitBtn.count() > 0) {
    if (!dryRun) {
      await submitBtn.first().click();
      await page.waitForTimeout(1000);
    }
    return 'submit';
  }

  // Check for review button
  const reviewBtn = page.locator('button:has-text("Review")');
  if (await reviewBtn.count() > 0) {
    if (!dryRun) {
      await reviewBtn.first().click();
      await page.waitForTimeout(1000);
    }
    return 'next';
  }

  // Check for next button
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")');
  if (await nextBtn.count() > 0) {
    if (!dryRun) {
      await nextBtn.first().click();
      await page.waitForTimeout(1000);
    }
    return 'next';
  }

  // Check for done
  const doneBtn = page.locator('button:has-text("Done"), h2:has-text("Application sent")');
  if (await doneBtn.count() > 0) {
    return 'done';
  }

  return 'stuck';
}

export async function applyCommand(opts: ApplyOptions): Promise<void> {
  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const config = loadConfig();

  // Determine which jobs to process
  let jobs;
  if (opts.jobId) {
    const job = getJobById(opts.jobId);
    jobs = job ? [job] : [];
  } else if (opts.easy) {
    jobs = getJobsByStatus('queued', true);
  } else if (opts.external) {
    jobs = getJobsByStatus('queued', false);
  } else {
    jobs = getJobsByStatus('queued');
  }

  if (jobs.length === 0) {
    console.log('✅ No jobs in queue to apply to');
    return;
  }

  console.log(`\n🚀 Starting application process...`);
  console.log(`   Jobs to process: ${jobs.length}`);
  console.log(`   Dry run: ${opts.dryRun ? 'Yes' : 'No'}\n`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo
  });

  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();

  let applied = 0;
  let skipped = 0;

  for (const job of jobs) {
    console.log(`\n📝 ${job.title} at ${job.company}`);
    console.log(`   Type: ${job.easy_apply ? 'Easy Apply' : 'External'}`);
    console.log(`   Rank: ${job.rank}/100`);

    try {
      await startTracing(context, job.id);

      // Generate answers
      const answersData = await synthesizeAnswers(
        job.id,
        job.title,
        '', // Description not stored, but cached answers will be used
        config.profileSummary
      );

      console.log(`   📄 Using resume: ${answersData.resumeVariant}`);
      const resumePath = getResumePath(answersData.resumeVariant);

      // Navigate to job
      await page.goto(job.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Take screenshot before attempting interaction for debugging
      await takeScreenshot(page, job.id, 'initial_page');
      
      // Dismiss any modals that might block interaction
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
      
      // Try to close any cookie banners or sign-in prompts
      const closeButtons = page.locator('button[aria-label*="Dismiss"], button[aria-label*="Close"], button:has-text("Close")');
      if (await closeButtons.count() > 0) {
        await closeButtons.first().click().catch(() => {});
        await page.waitForTimeout(300);
      }

      let success = false;

      if (job.easy_apply) {
        success = await fillEasyApply(page, job.id, answersData.answers, resumePath, opts.dryRun || false);
      } else {
        success = await fillExternalApply(page, job.id, answersData.answers, resumePath, opts.dryRun || false);
      }

      if (success && !opts.dryRun) {
        updateJobStatus(job.id, 'applied');
        applied++;
        logRun({
          job_id: job.id,
          step: 'complete',
          ok: true,
          log: 'Application completed successfully'
        });
      } else if (!success) {
        updateJobStatus(job.id, 'skipped');
        skipped++;
        logRun({
          job_id: job.id,
          step: 'complete',
          ok: false,
          log: 'Application failed or incomplete'
        });
      }

      await stopTracing(context, job.id);
      await randomDelay();

    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}`);
      if (!opts.dryRun) {
        updateJobStatus(job.id, 'skipped');
      }
      skipped++;
      
      logRun({
        job_id: job.id,
        step: 'error',
        ok: false,
        log: (error as Error).message
      });
    }
  }

  await browser.close();

  console.log(`\n✨ Application process complete!`);
  console.log(`   Applied: ${applied}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${jobs.length}\n`);
}



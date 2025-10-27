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
import { shouldStop as checkStopSignal, clearStopSignal } from '../lib/stop-signal.js';

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
  // Log learning progress at start
  if (process.env.DEBUG) {
    const { getAllMappings } = await import('../lib/db.js');
    const allMappings = getAllMappings();
    const mappingsWithSelectors = allMappings.filter(m => m.locator);
    console.log(`🧠 Starting application with ${mappingsWithSelectors.length} learned selectors`);
  }

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
  
  // Check if page is still valid
  if (page.isClosed()) {
    console.log('   ❌ Page closed unexpectedly after clicking Easy Apply');
    return false;
  }
  
  // Check if we navigated away (shouldn't happen with Easy Apply)
  const afterUrl = page.url();
  if (afterUrl && afterUrl !== beforeUrl && !afterUrl.includes('/jobs/view/')) {
    console.log(`   ❌ Unexpected navigation to: ${afterUrl}`);
    console.log('      Going back to job page...');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    return false;
  }
  
  // Wait for modal - try multiple approaches
  let modalVisible = false;
  
  // Give the page a moment to render the modal
  await page.waitForTimeout(500);
  
  // Try to find the modal with various selectors
  const modalSelectors = [
    '[role="dialog"]',
    '.jobs-easy-apply-modal',
    '[data-test-modal]',
    'div[aria-labelledby*="apply"]',
    'text=Contact info' // LinkedIn Easy Apply always starts with contact info
  ];
  
  for (const selector of modalSelectors) {
    try {
      const modal = page.locator(selector).first();
      const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        console.log(`      Modal detected with selector: ${selector}`);
        modalVisible = true;
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  // Alternative: Check via JavaScript evaluation
  if (!modalVisible) {
    const hasModal = await page.evaluate(() => {
      // Check for common Easy Apply modal indicators
      const hasContactInfo = document.body.textContent?.includes('Contact info');
      const hasFirstName = document.body.textContent?.includes('First name');
      const hasDialog = document.querySelector('[role="dialog"]') !== null;
      return hasContactInfo || hasFirstName || hasDialog;
    });
    
    if (hasModal) {
      console.log('      Modal detected via content evaluation');
      modalVisible = true;
    }
  }
  
  if (!modalVisible) {
    console.log('   ⚠️  Easy Apply modal did not appear');
    await takeScreenshot(page, jobId, 'modal_not_visible');
    return false;
  }

  let stepNum = 0;
  const maxSteps = 10;
  let previousLabelsHash = '';
  let previousNextBtnState = '';
  let stuckCount = 0;

  for (stepNum = 0; stepNum < maxSteps; stepNum++) {
    await page.waitForTimeout(800);
    
    // Check if page is still valid
    if (page.isClosed()) {
      console.log('   ❌ Page closed during application process');
      return false;
    }

    // Take screenshot
    const screenshotPath = await takeScreenshot(page, jobId, stepNum);

    // Extract labels from current step
    const labels = await extractLabels(page);
    
    // Create a hash of labels to detect if we're on the same step
    const labelsHash = labels.sort().join('|');
    
    // Also track if Next button state changed
    const nextBtnState = await checkNextButtonState(page);
    const isSameStep = labelsHash === previousLabelsHash && 
                       labelsHash !== '' && 
                       nextBtnState === previousNextBtnState;
    
    if (isSameStep) {
      stuckCount++;
      console.log(`      Step ${stepNum + 1}: Same as previous (stuck: ${stuckCount})`);
      
      // Try clicking Next anyway - may be slow form validation
      if (stuckCount === 2) {
        console.log('      Attempting to progress despite same fields...');
        const action = await nextOrSubmit(page, dryRun);
        if (action === 'next') {
          stuckCount = 0; // Reset if we progressed
          previousLabelsHash = '';
          previousNextBtnState = '';
          continue;
        }
      }
      
      if (stuckCount >= 3) {
        console.log('   ⚠️  Form stuck - cannot progress');
        return false;
      }
    } else {
      stuckCount = 0;
      console.log(`      Step ${stepNum + 1}: Found ${labels.length} fields`);
      previousLabelsHash = labelsHash;
      previousNextBtnState = nextBtnState;
    }

    if (labels.length > 0 && !isSameStep) {
      // Map labels to canonical keys
      const mappings = await mapLabelsSmart(labels);
      
      // Show what we're filling
      let fieldsToFill = 0;
      for (const mapping of mappings) {
        if (mapping.key !== 'unknown' && answers[mapping.key]) {
          fieldsToFill++;
          if (dryRun) {
            console.log(`        - ${mapping.label} → ${mapping.key} = "${answers[mapping.key]}"`);
          }
        }
      }
      
      if (fieldsToFill > 0) {
        console.log(`      Filling ${fieldsToFill} fields${dryRun ? ' [DRY RUN]' : ''}...`);
      }
      
      // Fill fields (even in dry run to allow progression through form)
      for (const mapping of mappings) {
        if (mapping.key === 'unknown') continue;
        
        const value = answers[mapping.key];
        if (!value) continue;

        try {
          const result = await fillFieldByLabel(page, mapping.label, value);
          
          if (result.success && result.locator) {
            // Import database functions for learning
            const { saveLabelMapping, updateMappingSuccess, updateMappingFailure } = await import('../lib/db.js');
            
            // Update mapping with learned selector and metadata
            saveLabelMapping({
              label: mapping.label,
              key: mapping.key,
              locator: result.locator,
              confidence: mapping.confidence,
              field_type: result.fieldType,
              input_strategy: result.inputStrategy
            });
            
            // Update success metrics
            updateMappingSuccess(mapping.label, result.locator);
            
            if (process.env.DEBUG) {
              console.log(`      📚 Learned selector for "${mapping.label}": ${result.locator}`);
            }
          } else if (!result.success) {
            // Update failure metrics if we had a cached selector
            const { getLabelMapping, updateMappingFailure } = await import('../lib/db.js');
            const cached = getLabelMapping(mapping.label);
            if (cached?.locator) {
              updateMappingFailure(mapping.label);
              if (process.env.DEBUG) {
                console.log(`      📉 Updated failure count for "${mapping.label}"`);
              }
            }
          }
        } catch (error) {
          // Log but continue if a field fails to fill
          if (process.env.DEBUG) {
            console.log(`      Warning: Failed to fill "${mapping.label}": ${(error as Error).message}`);
          }
        }
      }

      // Log learning statistics for this step
      if (process.env.DEBUG) {
        const { getAllMappings } = await import('../lib/db.js');
        const allMappings = getAllMappings();
        const mappingsWithSelectors = allMappings.filter(m => m.locator);
        const totalSuccesses = allMappings.reduce((sum, m) => sum + (m.success_count || 0), 0);
        const totalFailures = allMappings.reduce((sum, m) => sum + (m.failure_count || 0), 0);
        
        console.log(`      📊 Learning Stats: ${mappingsWithSelectors.length} cached selectors, ${totalSuccesses} successes, ${totalFailures} failures`);
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

    if (action === 'submit') {
      console.log('   ✅ Application submitted!');
      
      // Log final learning summary
      if (process.env.DEBUG) {
        const { getAllMappings } = await import('../lib/db.js');
        const allMappings = getAllMappings();
        const mappingsWithSelectors = allMappings.filter(m => m.locator);
        const totalSuccesses = allMappings.reduce((sum, m) => sum + (m.success_count || 0), 0);
        const totalFailures = allMappings.reduce((sum, m) => sum + (m.failure_count || 0), 0);
        
        console.log(`🎓 Learning Summary: ${mappingsWithSelectors.length} selectors cached, ${totalSuccesses} total successes, ${totalFailures} total failures`);
      }
      
      return true;
    }

    if (action === 'done') {
      console.log('   ✅ Application completed!');
      
      // Log final learning summary
      if (process.env.DEBUG) {
        const { getAllMappings } = await import('../lib/db.js');
        const allMappings = getAllMappings();
        const mappingsWithSelectors = allMappings.filter(m => m.locator);
        const totalSuccesses = allMappings.reduce((sum, m) => sum + (m.success_count || 0), 0);
        const totalFailures = allMappings.reduce((sum, m) => sum + (m.failure_count || 0), 0);
        
        console.log(`🎓 Learning Summary: ${mappingsWithSelectors.length} selectors cached, ${totalSuccesses} total successes, ${totalFailures} total failures`);
      }
      
      return true;
    }

    if (action === 'stuck') {
      console.log('   ⚠️  Cannot proceed - Next button not found or disabled');
      return false;
    }

    if (action === 'next') {
      console.log('      → Progressing to next step');
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

async function checkNextButtonState(page: Page): Promise<string> {
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[aria-label*="Continue"], button[aria-label*="Next"]');
  if (await nextBtn.count() > 0) {
    const isEnabled = await nextBtn.first().isEnabled().catch(() => false);
    return isEnabled ? 'enabled' : 'disabled';
  }
  return 'none';
}

function extractNumericValue(text: string): string {
  // Extract the first number from text (handles "5 years", "5+", "5-10", etc.)
  const match = text.match(/(\d+)/);
  return match ? match[1] : text;
}

function isNumericField(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return (
    lowerLabel.includes('how many years') ||
    lowerLabel.includes('years of experience') ||
    lowerLabel.includes('years of work experience') ||
    (lowerLabel.includes('experience') && lowerLabel.includes('years'))
  );
}

// Helper function to extract stable CSS selector from an element
async function extractStableSelector(element: any): Promise<string | null> {
  try {
    // Get element attributes
    const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
    const id = await element.getAttribute('id');
    const name = await element.getAttribute('name');
    const type = await element.getAttribute('type');
    const ariaLabel = await element.getAttribute('aria-label');
    
    // Priority order for stable selectors
    if (id && id.trim()) {
      return `#${id.trim()}`;
    }
    
    if (name && name.trim()) {
      return `${tagName}[name="${name.trim()}"]`;
    }
    
    if (type && ariaLabel) {
      return `${tagName}[type="${type}"][aria-label="${ariaLabel}"]`;
    }
    
    if (type) {
      return `${tagName}[type="${type}"]`;
    }
    
    // Fallback to tag name only (least stable)
    return tagName;
  } catch (error) {
    return null;
  }
}

// Helper function to detect field type and input strategy
async function detectFieldTypeAndStrategy(element: any): Promise<{fieldType: string, inputStrategy: string}> {
  try {
    const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
    const type = await element.getAttribute('type');
    
    let fieldType = tagName;
    let inputStrategy = 'fill';
    
    if (tagName === 'input') {
      fieldType = type || 'text';
      
      switch (type) {
        case 'checkbox':
        case 'radio':
          inputStrategy = 'check';
          break;
        case 'file':
          inputStrategy = 'setInputFiles';
          break;
        default:
          inputStrategy = 'fill';
      }
    } else if (tagName === 'select') {
      inputStrategy = 'selectOption';
    } else if (tagName === 'textarea') {
      inputStrategy = 'fill';
    }
    
    return { fieldType, inputStrategy };
  } catch (error) {
    return { fieldType: 'unknown', inputStrategy: 'fill' };
  }
}

async function fillFieldByLabel(page: Page, label: string, value: string): Promise<{
  success: boolean;
  method: string;
  locator?: string;
  fieldType?: string;
  inputStrategy?: string;
}> {
  // Determine the actual value to fill
  let fillValue = value;
  
  // If the field is asking for numeric input (years), extract just the number
  if (isNumericField(label)) {
    fillValue = extractNumericValue(value);
  }
  
  // Import database functions
  const { getLabelMapping } = await import('../lib/db.js');
  
  // 1. Try cached selector first
  const cached = getLabelMapping(label);
  if (cached?.locator) {
    try {
      const element = page.locator(cached.locator);
      if (await element.count() > 0) {
        const input = element.first();
        await input.clear();
        await input.fill(fillValue);
        
        // Extract metadata for successful fill
        const { fieldType, inputStrategy } = await detectFieldTypeAndStrategy(input);
        
        if (process.env.DEBUG) {
          console.log(`      ✓ Used cached selector for "${label}": ${cached.locator}`);
        }
        
        return {
          success: true,
          method: 'cached_selector',
          locator: cached.locator,
          fieldType,
          inputStrategy
        };
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(`      ⚠️ Cached selector failed for "${label}": ${cached.locator}`);
      }
    }
  }
  
  // 2. Try getByLabel
  try {
    const byLabel = page.getByLabel(label);
    if (await byLabel.count() > 0) {
      const input = byLabel.first();
      await input.clear();
      await input.fill(fillValue);
      
      // Extract selector and metadata
      const locator = await extractStableSelector(input);
      const { fieldType, inputStrategy } = await detectFieldTypeAndStrategy(input);
      
      if (process.env.DEBUG) {
        console.log(`      ✓ Filled "${label}" via getByLabel${locator ? ` (selector: ${locator})` : ''}`);
      }
      
      return {
        success: true,
        method: 'getByLabel',
        locator: locator || undefined,
        fieldType,
        inputStrategy
      };
    }
  } catch (error) {
    // Try other methods
  }

  // 3. Try finding label and then associated input
  try {
    const labelElem = page.locator(`label:has-text("${label}")`);
    if (await labelElem.count() > 0) {
      const forAttr = await labelElem.first().getAttribute('for');
      if (forAttr) {
        const input = page.locator(`#${forAttr}`);
        if (await input.count() > 0) {
          const field = input.first();
          await field.clear();
          await field.fill(fillValue);
          
          // Extract metadata
          const locator = `#${forAttr}`;
          const { fieldType, inputStrategy } = await detectFieldTypeAndStrategy(field);
          
          if (process.env.DEBUG) {
            console.log(`      ✓ Filled "${label}" via label+for (selector: ${locator})`);
          }
          
          return {
            success: true,
            method: 'label_for',
            locator,
            fieldType,
            inputStrategy
          };
        }
      }
    }
  } catch (error) {
    // Ignore
  }
  
  // 4. All methods failed
  if (process.env.DEBUG) {
    console.log(`      ✗ Failed to fill "${label}"`);
  }
  
  return {
    success: false,
    method: 'none'
  };
}

async function nextOrSubmit(page: Page, dryRun: boolean): Promise<'next' | 'submit' | 'done' | 'stuck'> {
  // Check for done/success messages first
  const doneIndicators = page.locator('button:has-text("Done"), h2:has-text("Application sent"), h3:has-text("Application sent")');
  if (await doneIndicators.count() > 0) {
    return 'done';
  }

  // Check for submit button
  const submitBtn = page.locator('button:has-text("Submit application"), button:has-text("Submit"), button[aria-label*="Submit application"]');
  if (await submitBtn.count() > 0) {
    if (!dryRun) {
      await submitBtn.first().click();
      await page.waitForTimeout(1000);
    } else {
      console.log('      [DRY RUN] Would click Submit button');
    }
    return 'submit';
  }

  // Check for review button - click it even in dry run to see the review page
  const reviewBtn = page.locator('button:has-text("Review"), button[aria-label*="Review"]');
  if (await reviewBtn.count() > 0) {
    await reviewBtn.first().click();
    await page.waitForTimeout(1000);
    return 'next';
  }

  // Check for next/continue button - click it even in dry run to progress through form
  const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button[aria-label*="Continue"], button[aria-label*="Next"]');
  if (await nextBtn.count() > 0) {
    // Check if button is enabled
    const isEnabled = await nextBtn.first().isEnabled().catch(() => false);
    if (isEnabled) {
      await nextBtn.first().click();
      await page.waitForTimeout(1000);
      return 'next';
    } else {
      console.log('      Next button is disabled - may need to fill required fields');
      return 'stuck';
    }
  }

  return 'stuck';
}

export async function applyCommand(opts: ApplyOptions): Promise<void> {
  // Require explicit filter selection
  if (!opts.jobId && !opts.easy && !opts.external) {
    console.error('❌ No filter specified.');
    console.error('   Please specify one of:');
    console.error('   --easy     (Easy Apply jobs only)');
    console.error('   --ext      (External ATS jobs only)');
    console.error('   --job ID   (Specific job)');
    process.exit(1);
  }

  if (!hasSession()) {
    console.error('❌ No saved session found. Please run "npm run login" first.');
    process.exit(1);
  }

  const config = loadConfig();

  // Log options for debugging
  console.log('[Apply Command] Options received:', JSON.stringify(opts));

  // Determine which jobs to process
  let jobs;
  if (opts.jobId) {
    const job = getJobById(opts.jobId);
    jobs = job ? [job] : [];
    console.log('[Apply Command] Mode: Specific job ID');
  } else if (opts.easy) {
    jobs = getJobsByStatus('queued', true);
    console.log('[Apply Command] Mode: Easy Apply only');
  } else if (opts.external) {
    jobs = getJobsByStatus('queued', false);
    console.log('[Apply Command] Mode: External only');
  } else {
    jobs = getJobsByStatus('queued');
    console.log('[Apply Command] Mode: All queued jobs (no filter specified)');
  }

  if (jobs.length === 0) {
    console.log('✅ No jobs in queue to apply to');
    return;
  }

  console.log(`\n🚀 Starting application process...`);
  console.log(`   Jobs to process: ${jobs.length}`);
  console.log(`   Dry run: ${opts.dryRun ? 'Yes' : 'No'}\n`);

  // Clear any existing stop signal from previous runs
  clearStopSignal();
  
  // Flag to signal graceful shutdown
  let shouldStop = false;

  // Check function that combines flag and file-based signal (for Windows compatibility)
  const shouldStopNow = () => {
    if (!shouldStop && checkStopSignal()) {
      console.log('\n⚠️  Stop signal detected (file-based), finishing current application...');
      shouldStop = true;
      console.log('   Stop flag set to true');
    }
    return shouldStop;
  };

  // Setup graceful shutdown handler - set flag instead of immediate exit
  const shutdownHandler = () => {
    if (!shouldStop) {
      console.log('\n⚠️  Stop requested, finishing current application...');
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

  let applied = 0;
  let skipped = 0;

  for (const job of jobs) {
    // Check if we should stop before starting to process each job
    if (shouldStopNow()) {
      console.log(`\n⚠️  Stopping before processing ${job.title} at ${job.company}.\n`);
      break;
    }

    console.log(`\n📝 ${job.title} at ${job.company}`);
    console.log(`   Type: ${job.easy_apply ? 'Easy Apply' : 'External'}`);
    console.log(`   Rank: ${job.rank}/100`);

    try {
      await startTracing(context, job.id);

      // Check if we should stop before expensive LLM operation
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping before generating answers for ${job.title}.\n`);
        break;
      }

      // Set job context for error logging
      process.env.JOB_ID = job.id;
      
      // Generate answers
      const answersData = await synthesizeAnswers(
        job.id,
        job.title,
        job.description || '', // Use stored description or fallback to empty string
        config.profileSummary
      );
      
      // Check if we should stop after LLM operation (it can take a while)
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping after generating answers for ${job.title}.\n`);
        break;
      }

      console.log(`   📄 Using resume: ${answersData.resumeVariant}`);
      const resumePath = getResumePath(answersData.resumeVariant);
      
      // Clear job context
      delete process.env.JOB_ID;

      // Navigate to job
      await page.goto(job.url, { waitUntil: 'domcontentloaded' });
      
      // Check stop signal after navigation
      if (shouldStopNow()) {
        console.log(`\n⚠️  Stopping after navigating to ${job.title}.\n`);
        break;
      }
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
        updateJobStatus(job.id, 'applied', 'automatic');
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
  console.log(`   Total: ${jobs.length}`);
  
  if (shouldStop) {
    console.log('\n✅ Application stopped gracefully.\n');
  } else {
    console.log();
  }
  
  // Clean up signal handlers
  process.removeListener('SIGTERM', shutdownHandler);
  process.removeListener('SIGINT', shutdownHandler);
  
  // Exit cleanly
  process.exit(0);
}



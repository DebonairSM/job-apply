import { Page } from 'playwright';
import { ATSAdapter, fillIfExists, uploadIfExists } from './base.js';

export const WorkdayAdapter: ATSAdapter = {
  name: 'Workday',

  async detect(page: Page): Promise<boolean> {
    const url = page.url();
    if (!/myworkdayjobs\.com|workday\.com/i.test(url)) {
      return false;
    }

    // Workday has specific data-automation-id attributes
    const hasWorkdayElements = await page.locator('[data-automation-id]').count() > 0;
    return hasWorkdayElements;
  },

  async smoke(page: Page): Promise<boolean> {
    await page.waitForLoadState('domcontentloaded');
    
    // Workday loads content dynamically
    await page.waitForTimeout(2000);
    
    const hasInputs = await page.locator('input, textarea').count() > 0;
    return hasInputs;
  },

  async fill(page: Page, answers: Record<string, string>, resumePath: string): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    
    // Workday is heavily dynamic, wait a bit
    await page.waitForTimeout(1500);

    for (const [key, value] of Object.entries(answers)) {
      // Try by role textbox (Workday uses ARIA extensively)
      try {
        const byRole = page.getByRole('textbox', { name: new RegExp(key.replace(/_/g, '\\s*'), 'i') });
        if (await byRole.count() > 0) {
          await byRole.first().fill(value);
          continue;
        }
      } catch (error) {
        // Continue
      }

      // Try by data-automation-id
      const normalizedKey = key.replace(/[^a-z0-9]+/gi, '');
      const autoIdSelectors = [
        `[data-automation-id*="${normalizedKey}" i] input`,
        `[data-automation-id*="${normalizedKey}" i] textarea`
      ];

      for (const selector of autoIdSelectors) {
        if (await fillIfExists(page, selector, value)) {
          break;
        }
      }

      // Try by label
      try {
        const byLabel = page.getByLabel(new RegExp(key.replace(/_/g, '\\s*'), 'i'));
        if (await byLabel.count() > 0) {
          await byLabel.first().fill(value);
        }
      } catch (error) {
        // Continue
      }
    }

    // Upload resume (Workday has specific upload patterns)
    await uploadIfExists(page, 'input[type="file"]', resumePath);
    await uploadIfExists(page, '[data-automation-id*="resume"] input[type="file"]', resumePath);
    await uploadIfExists(page, '[data-automation-id*="cv"] input[type="file"]', resumePath);

    console.log('Workday form filled');
  }
};



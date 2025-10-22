import { Page } from 'playwright';
import { ATSAdapter, fillIfExists, uploadIfExists } from './base.js';

export const GreenhouseAdapter: ATSAdapter = {
  name: 'Greenhouse',

  async detect(page: Page): Promise<boolean> {
    const url = page.url();
    if (!/greenhouse\.io|boards\.greenhouse\.io/i.test(url)) {
      return false;
    }

    // Check for Greenhouse-specific elements
    const formCount = await page.locator('form[action*="greenhouse"], #application_form').count();
    return formCount > 0;
  },

  async smoke(page: Page): Promise<boolean> {
    // Check that key elements exist
    const hasForm = await page.locator('form').count() > 0;
    const hasSubmit = await page.locator('button[type="submit"], input[type="submit"]').count() > 0;
    
    return hasForm && hasSubmit;
  },

  async fill(page: Page, answers: Record<string, string>, resumePath: string): Promise<void> {
    // Wait for form to be ready
    await page.waitForLoadState('domcontentloaded');

    // Try to fill fields by label
    for (const [key, value] of Object.entries(answers)) {
      // Try getByLabel first
      try {
        const byLabel = page.getByLabel(new RegExp(key.replace(/_/g, '\\s*'), 'i'));
        if (await byLabel.count() > 0) {
          await byLabel.first().fill(value);
          continue;
        }
      } catch (error) {
        // Continue to next method
      }

      // Try by name/id containing the key
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await fillIfExists(page, `[name*="${normalizedKey}"]`, value);
      await fillIfExists(page, `[id*="${normalizedKey}"]`, value);
    }

    // Upload resume
    await uploadIfExists(page, 'input[type="file"]', resumePath);
    await uploadIfExists(page, 'input[name*="resume"]', resumePath);
    await uploadIfExists(page, 'input[id*="resume"]', resumePath);

    console.log('Greenhouse form filled');
  }
};



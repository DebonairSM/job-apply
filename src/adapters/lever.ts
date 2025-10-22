import { Page } from 'playwright';
import { ATSAdapter, fillIfExists, uploadIfExists } from './base.js';

export const LeverAdapter: ATSAdapter = {
  name: 'Lever',

  async detect(page: Page): Promise<boolean> {
    const url = page.url();
    if (!/jobs\.lever\.co/i.test(url)) {
      return false;
    }

    // Check for Lever-specific elements
    const formCount = await page.locator('form[action*="/apply"]').count();
    return formCount > 0;
  },

  async smoke(page: Page): Promise<boolean> {
    const hasForm = await page.locator('form').count() > 0;
    const hasSubmit = await page.locator('button[type="submit"]').count() > 0;
    
    return hasForm && hasSubmit;
  },

  async fill(page: Page, answers: Record<string, string>, resumePath: string): Promise<void> {
    await page.waitForLoadState('domcontentloaded');

    for (const [key, value] of Object.entries(answers)) {
      // Try by placeholder (Lever uses placeholders heavily)
      try {
        const byPlaceholder = page.getByPlaceholder(new RegExp(key.replace(/_/g, '\\s*'), 'i'));
        if (await byPlaceholder.count() > 0) {
          await byPlaceholder.first().fill(value);
          continue;
        }
      } catch (error) {
        // Continue
      }

      // Try by label
      try {
        const byLabel = page.getByLabel(new RegExp(key.replace(/_/g, '\\s*'), 'i'));
        if (await byLabel.count() > 0) {
          await byLabel.first().fill(value);
          continue;
        }
      } catch (error) {
        // Continue
      }

      // Try by name
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '');
      await fillIfExists(page, `[name*="${normalizedKey}"]`, value);
    }

    // Upload resume
    await uploadIfExists(page, 'input[type="file"]', resumePath);
    await uploadIfExists(page, 'input[name*="resume"]', resumePath);
    await uploadIfExists(page, 'input[name*="cv"]', resumePath);

    console.log('Lever form filled');
  }
};



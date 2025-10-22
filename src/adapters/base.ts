import { Page } from 'playwright';

// Base interface for ATS adapters
export interface ATSAdapter {
  name: string;
  detect(page: Page): Promise<boolean>;
  smoke(page: Page): Promise<boolean>;
  fill(page: Page, answers: Record<string, string>, resumePath: string): Promise<void>;
}

// Helper function to fill a field if it exists
export async function fillIfExists(page: Page, selector: string, value: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    const count = await element.count();
    
    if (count > 0) {
      await element.fill(value);
      return true;
    }
  } catch (error) {
    // Ignore errors, field doesn't exist or can't be filled
  }
  return false;
}

// Helper to upload file if input exists
export async function uploadIfExists(page: Page, selector: string, filePath: string): Promise<boolean> {
  try {
    const input = page.locator(selector).first();
    const count = await input.count();
    
    if (count > 0) {
      await input.setInputFiles(filePath);
      return true;
    }
  } catch (error) {
    // Ignore errors
  }
  return false;
}



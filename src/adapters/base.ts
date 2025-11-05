import { Page } from 'playwright';

/**
 * Base interface for Application Tracking System (ATS) adapters.
 * 
 * Each ATS platform (Greenhouse, Lever, Workday, LinkedIn) has unique form structures,
 * multi-step workflows, and submission flows. Adapters normalize these differences
 * into a consistent interface for automated job applications.
 * 
 * Implementation requirements:
 * - detect() must reliably identify the ATS platform (check for platform-specific elements)
 * - smoke() should validate critical elements are present before proceeding
 * - fill() must handle multi-step forms, file uploads, and submit the application
 * - Errors should be descriptive and include the step that failed
 * 
 * @example
 * // Greenhouse adapter usage
 * const adapter = new GreenhouseAdapter();
 * const isGreenhouse = await adapter.detect(page);
 * if (isGreenhouse) {
 *   const working = await adapter.smoke(page);
 *   if (working) {
 *     await adapter.fill(page, answers, '/path/to/resume.pdf');
 *   }
 * }
 */
export interface ATSAdapter {
  /** Human-readable adapter name (e.g., 'Greenhouse', 'Lever', 'Workday') */
  name: string;
  
  /**
   * Detects if the current page is using this ATS platform.
   * 
   * Should check for platform-specific elements, data attributes, or URL patterns.
   * Return true only if confident this adapter should handle the page.
   * 
   * @param page - Playwright page object
   * @returns true if this adapter should handle the page, false otherwise
   */
  detect(page: Page): Promise<boolean>;
  
  /**
   * Quick validation that the ATS page is working (smoke test).
   * 
   * Checks that critical form elements are present before attempting to fill.
   * Helps detect broken pages or captchas early in the process.
   * 
   * @param page - Playwright page object
   * @returns true if key elements are present and page appears functional, false otherwise
   */
  smoke(page: Page): Promise<boolean>;
  
  /**
   * Fills and submits the application form.
   * 
   * Handles complete application flow:
   * - Maps form fields to canonical keys using intelligent field mapper
   * - Fills all fields with provided answers
   * - Handles multi-step forms (click "Next", "Continue", etc.)
   * - Uploads resume to file input
   * - Submits the final form
   * 
   * Should throw descriptive errors if critical steps fail (e.g., "Failed to upload resume",
   * "Submit button not found"). Non-critical errors can be logged and skipped.
   * 
   * @param page - Playwright page object
   * @param answers - Canonical field answers (email, phone, work_authorization, etc.)
   * @param resumePath - Absolute path to resume PDF/DOCX file
   * @throws Error if application cannot be submitted
   */
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



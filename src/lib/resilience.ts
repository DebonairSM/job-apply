import { BrowserContext, Page } from 'playwright';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ARTIFACTS_DIR } from './session.js';
import { loadConfig } from './session.js';

// Start Playwright tracing
export async function startTracing(context: BrowserContext, jobId: string): Promise<void> {
  const config = loadConfig();
  if (!config.enableTracing) return;

  try {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false
    });
  } catch (error) {
    console.warn('Failed to start tracing:', (error as Error).message);
  }
}

// Stop Playwright tracing and save
export async function stopTracing(context: BrowserContext, jobId: string): Promise<void> {
  const config = loadConfig();
  if (!config.enableTracing) return;

  const jobDir = join(ARTIFACTS_DIR, jobId);
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }

  const tracePath = join(jobDir, 'trace.zip');

  try {
    await context.tracing.stop({ path: tracePath });
  } catch (error) {
    console.warn('Failed to stop tracing:', (error as Error).message);
  }
}

// Take screenshot
export async function takeScreenshot(page: Page, jobId: string, step: number | string): Promise<string> {
  const jobDir = join(ARTIFACTS_DIR, jobId);
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }

  const screenshotPath = join(jobDir, `step-${step}.png`);

  try {
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return screenshotPath;
  } catch (error) {
    console.warn(`Failed to take screenshot: ${(error as Error).message}`);
    return '';
  }
}

// Random delay for human-like behavior
export async function randomDelay(): Promise<void> {
  const config = loadConfig();
  const min = config.randomDelayMin;
  const max = config.randomDelayMax;
  const delay = min + Math.random() * (max - min);
  
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Retry function with exponential backoff
export async function retryOnError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

// Create job artifact directory
export function ensureJobArtifactDir(jobId: string): string {
  const jobDir = join(ARTIFACTS_DIR, jobId);
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
}



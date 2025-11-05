import { Browser, Page, BrowserContext } from 'playwright';
import { SearchOptions } from '../cli/search.js';
import { ApplyOptions } from '../cli/apply.js';

// Search service types
export interface SearchResult {
  analyzed: number;
  queued: number;
  pagesProcessed: number;
  errors: string[];
}

export interface SearchDependencies {
  browser: Browser;
  page: Page;
  context: BrowserContext;
  processPage: (pageNum: number, opts: SearchOptions) => Promise<{ analyzed: number; queued: number }>;
  shouldStop: () => boolean;
  buildSearchUrl: (opts: SearchOptions, page: number) => string;
}

// Apply service types
export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  description?: string;
  easy_apply: boolean;
  rank?: number;
}

export interface ApplyResult {
  applied: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface ApplyDependencies {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  processJob: (job: Job) => Promise<'applied' | 'skipped' | 'failed'>;
  shouldStop: () => boolean;
  jobs: Job[];
}


import { SearchOptions } from '../commands/search.js';
import { ApplyOptions } from '../commands/apply.js';

// Search service types
export interface SearchResult {
  analyzed: number;
  queued: number;
  pagesProcessed: number;
  errors: string[];
}

export interface SearchDependencies {
  browser: any; // Playwright Browser
  page: any; // Playwright Page
  context: any; // Playwright BrowserContext
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
  browser: any; // Playwright Browser
  context: any; // Playwright BrowserContext
  page: any; // Playwright Page
  processJob: (job: Job) => Promise<'applied' | 'skipped' | 'failed'>;
  shouldStop: () => boolean;
  jobs: Job[];
}


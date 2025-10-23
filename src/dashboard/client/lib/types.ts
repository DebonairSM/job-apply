export interface JobStats {
  queued: number;
  applied: number;
  interview: number;
  rejected: number;
  skipped: number;
  reported: number;
  total: number;
  successRate: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  easy_apply: boolean;
  rank?: number;
  status: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped' | 'reported';
  applied_method?: 'automatic' | 'manual';
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  category_scores?: string;
  missing_keywords?: string;
  posted_date?: string;
  created_at?: string;
}

export interface RunLog {
  id?: number;
  job_id: string;
  step: string;
  ok: boolean;
  log?: string;
  screenshot_path?: string;
  started_at?: string;
  ended_at?: string;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface RunsResponse {
  runs: RunLog[];
  total: number;
}


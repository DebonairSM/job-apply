export interface JobStats {
  queued: number;
  applied: number;
  interview: number;
  rejected: number;
  skipped: number;
  reported: number;
  total: number;
  successRate: number;
  totalManual: number;
  totalAutomatic: number;
  appliedToday: number;
  appliedThisWeek: number;
  appliedThisMonth: number;
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
  rejection_reason?: string;
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  category_scores?: string;
  missing_keywords?: string;
  posted_date?: string;
  description?: string;
  profile?: string; // Search profile used to find this job (core, security, event-driven, etc.)
  created_at?: string;
  status_updated_at?: string;
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

export interface JobActivity {
  id: string;
  title: string;
  company: string;
  status: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped' | 'reported';
  applied_method?: 'automatic' | 'manual';
  rejection_reason?: string;
  created_at: string;
  status_updated_at?: string;
}

export interface ActivityEntry {
  id: string;
  type: 'job_created' | 'job_updated' | 'run_step' | 'run_error' | 'run_success';
  timestamp: string;
  job_id?: string;
  job_title?: string;
  job_company?: string;
  job_status?: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped' | 'reported';
  job_rank?: number;
  applied_method?: 'automatic' | 'manual';
  step?: string;
  success?: boolean;
  message?: string;
  screenshot_path?: string;
  rejection_reason?: string;
  fit_reasons?: string;
  duration_ms?: number;
}


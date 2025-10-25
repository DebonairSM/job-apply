import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../data/app.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  // Jobs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      easy_apply INTEGER NOT NULL,
      rank REAL,
      status TEXT DEFAULT 'queued',
      applied_method TEXT,
      rejection_reason TEXT,
      fit_reasons TEXT,
      must_haves TEXT,
      blockers TEXT,
      category_scores TEXT,
      missing_keywords TEXT,
      posted_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status_updated_at TEXT
    )
  `);

  // Migration: Add new columns if they don't exist
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN applied_method TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN rejection_reason TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN category_scores TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN missing_keywords TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN posted_date TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN status_updated_at TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN description TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Rejection patterns table
  database.exec(`
    CREATE TABLE IF NOT EXISTS rejection_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      pattern_value TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      weight_adjustment REAL DEFAULT 0,
      profile_category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Weight adjustments history table
  database.exec(`
    CREATE TABLE IF NOT EXISTS weight_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_category TEXT NOT NULL,
      old_weight REAL NOT NULL,
      new_weight REAL NOT NULL,
      reason TEXT NOT NULL,
      rejection_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Answers cache table
  database.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      json TEXT NOT NULL,
      resume_variant TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Label mapping cache table
  database.exec(`
    CREATE TABLE IF NOT EXISTS label_map (
      label TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      locator TEXT,
      confidence REAL NOT NULL,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      field_type TEXT,
      input_strategy TEXT,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing label_map table to add learning columns
  try {
    database.exec(`
      ALTER TABLE label_map ADD COLUMN success_count INTEGER DEFAULT 0;
    `);
  } catch (error) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`
      ALTER TABLE label_map ADD COLUMN failure_count INTEGER DEFAULT 0;
    `);
  } catch (error) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`
      ALTER TABLE label_map ADD COLUMN field_type TEXT;
    `);
  } catch (error) {
    // Column already exists, ignore
  }
  
  try {
    database.exec(`
      ALTER TABLE label_map ADD COLUMN input_strategy TEXT;
    `);
  } catch (error) {
    // Column already exists, ignore
  }

  // Runs/execution log table
  database.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      step TEXT,
      ok INTEGER,
      log TEXT,
      screenshot_path TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    )
  `);
}

// Job operations
export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  easy_apply: boolean;
  rank?: number; // Decimal value with full precision (e.g., 87.35)
  status: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped' | 'reported';
  applied_method?: 'automatic' | 'manual';
  rejection_reason?: string;
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  category_scores?: string; // JSON string
  missing_keywords?: string; // JSON string
  posted_date?: string; // When the job was posted on LinkedIn
  description?: string; // Full job description text
  created_at?: string; // When we added it to our database
  status_updated_at?: string; // When the status was last changed
}

export interface AddJobsResult {
  inserted: number;
  requeued: number;
  skipped: number;
  skippedDetails: Array<{ title: string; company: string; reason: string; currentStatus: string }>;
}

export function addJobs(jobs: Omit<Job, 'created_at'>[]): AddJobsResult {
  const database = getDb();
  
  const checkExistingStmt = database.prepare('SELECT id, status FROM jobs WHERE id = ?');
  
  const insertStmt = database.prepare(`
    INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = database.prepare(`
    UPDATE jobs 
    SET status = ?, rank = ?, fit_reasons = ?, must_haves = ?, blockers = ?, category_scores = ?, missing_keywords = ?, posted_date = ?, description = ?, status_updated_at = ?
    WHERE id = ?
  `);

  const result: AddJobsResult = {
    inserted: 0,
    requeued: 0,
    skipped: 0,
    skippedDetails: []
  };

  const insertMany = database.transaction((jobList: typeof jobs) => {
    for (const job of jobList) {
      // Check if job already exists
      const existing = checkExistingStmt.get(job.id) as { id: string; status: string } | undefined;
      
      if (existing) {
        // Job exists - decide whether to requeue or skip
        if (existing.status === 'reported') {
          // Requeue previously reported jobs
          const now = new Date().toISOString();
          updateStmt.run(
            'queued', // Change status back to queued
            job.rank ?? null,
            job.fit_reasons ?? null,
            job.must_haves ?? null,
            job.blockers ?? null,
            job.category_scores ?? null,
            job.missing_keywords ?? null,
            job.posted_date ?? null,
            job.description ?? null,
            now,
            job.id
          );
          result.requeued++;
        } else if (existing.status === 'queued') {
          // Already queued - skip
          result.skipped++;
          result.skippedDetails.push({
            title: job.title,
            company: job.company,
            reason: 'Already in queue',
            currentStatus: existing.status
          });
        } else {
          // Applied, interview, rejected, or skipped - don't touch
          result.skipped++;
          result.skippedDetails.push({
            title: job.title,
            company: job.company,
            reason: `Already processed`,
            currentStatus: existing.status
          });
        }
      } else {
        // New job - insert it
        try {
          const now = new Date().toISOString();
          insertStmt.run(
            job.id,
            job.title,
            job.company,
            job.url,
            job.easy_apply ? 1 : 0,
            job.rank ?? null,
            job.status,
            job.fit_reasons ?? null,
            job.must_haves ?? null,
            job.blockers ?? null,
            job.category_scores ?? null,
            job.missing_keywords ?? null,
            job.posted_date ?? null,
            job.description ?? null,
            now,
            null  // Don't set status_updated_at for new jobs
          );
          result.inserted++;
        } catch (error) {
          // Handle unique constraint violation on URL
          const err = error as Error;
          if (err.message.includes('UNIQUE constraint failed')) {
            result.skipped++;
            result.skippedDetails.push({
              title: job.title,
              company: job.company,
              reason: 'Duplicate URL',
              currentStatus: 'unknown'
            });
          } else {
            throw error;
          }
        }
      }
    }
  });

  insertMany(jobs);
  return result;
}

export function getJobsByStatus(status?: string, easyApply?: boolean): Job[] {
  const database = getDb();
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (easyApply !== undefined) {
    query += ' AND easy_apply = ?';
    params.push(easyApply ? 1 : 0);
  }

  query += ' ORDER BY rank DESC, created_at DESC';

  const stmt = database.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    easy_apply: row.easy_apply === 1
  }));
}

export function jobExistsByUrl(url: string): boolean {
  const database = getDb();
  const stmt = database.prepare('SELECT 1 FROM jobs WHERE url = ? LIMIT 1');
  const result = stmt.get(url);
  return !!result;
}

export function getJobByUrl(url: string): Job | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM jobs WHERE url = ?');
  const row = stmt.get(url) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    easy_apply: row.easy_apply === 1
  };
}

export function getJobById(id: string): Job | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM jobs WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    easy_apply: row.easy_apply === 1
  };
}

export function hasAppliedToCompanyTitle(company: string, title: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT 1 FROM jobs 
    WHERE LOWER(company) = LOWER(?) 
    AND LOWER(title) = LOWER(?) 
    AND status IN ('applied', 'interview', 'rejected')
    LIMIT 1
  `);
  const result = stmt.get(company, title);
  return !!result;
}

export function updateJobStatus(jobId: string, status: Job['status'], appliedMethod?: 'automatic' | 'manual', rejectionReason?: string): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE jobs SET status = ?, applied_method = ?, rejection_reason = ?, status_updated_at = ? WHERE id = ?');
  stmt.run(status, appliedMethod ?? null, rejectionReason ?? null, new Date().toISOString(), jobId);
  
  // Trigger learning on rejection
  if (status === 'rejected' && rejectionReason) {
    // Use dynamic import to avoid circular dependencies
    analyzeAndLearnFromRejection(jobId, rejectionReason).catch(error => {
      console.error('Error learning from rejection:', error);
    });
  }
}

// Analyze rejection and apply learning
async function analyzeAndLearnFromRejection(jobId: string, rejectionReason: string): Promise<void> {
  try {
    const job = getJobById(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found for rejection analysis`);
      return;
    }
    
    // Dynamic import to avoid circular dependencies
    const { analyzeRejectionWithLLM } = await import('../ai/rejection-analyzer.js');
    const { applyWeightAdjustment } = await import('../ai/weight-manager.js');
    const { saveRejectionPattern } = await import('../lib/db.js');
    
    // Analyze rejection
    const analysis = await analyzeRejectionWithLLM(rejectionReason, job);
    
    // Save patterns
    for (const pattern of analysis.patterns) {
      saveRejectionPattern({
        type: pattern.type,
        value: pattern.value,
        confidence: pattern.confidence,
        profileCategory: undefined,
        weightAdjustment: 0
      });
    }
    
    // Apply weight adjustments immediately
    for (const adjustment of analysis.suggestedAdjustments) {
      applyWeightAdjustment(
        adjustment.category,
        adjustment.adjustment,
        adjustment.reason,
        jobId
      );
    }
    
    // Log learning summary
    if (analysis.patterns.length > 0 || analysis.suggestedAdjustments.length > 0) {
      console.log(`📚 Learning from rejection: ${job.title} at ${job.company}`);
      console.log(`   Patterns found: ${analysis.patterns.length}`);
      console.log(`   Weight adjustments: ${analysis.suggestedAdjustments.length}`);
      
      for (const adjustment of analysis.suggestedAdjustments) {
        console.log(`   📊 Adjusted ${adjustment.category} by ${adjustment.adjustment > 0 ? '+' : ''}${adjustment.adjustment}% - ${adjustment.reason}`);
      }
    }
    
  } catch (error) {
    console.error('Error in rejection learning analysis:', error);
  }
}

export interface JobStats {
  queued: number;
  applied: number;
  interview: number;
  rejected: number;
  skipped: number;
  reported: number;
  total: number;
}

export function getJobStats(): JobStats {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT status, COUNT(*) as count
    FROM jobs
    GROUP BY status
  `);

  const rows = stmt.all() as Array<{ status: string; count: number }>;
  const stats: JobStats = {
    queued: 0,
    applied: 0,
    interview: 0,
    rejected: 0,
    skipped: 0,
    reported: 0,
    total: 0
  };

  for (const row of rows) {
    stats[row.status as keyof JobStats] = row.count;
    stats.total += row.count;
  }

  return stats;
}

export interface EnhancedStats {
  totalManual: number;
  totalAutomatic: number;
  appliedToday: number;
  appliedThisWeek: number;
  appliedThisMonth: number;
}

export function getEnhancedStats(): EnhancedStats {
  const database = getDb();
  
  // Get manual vs automatic breakdown
  const methodStmt = database.prepare(`
    SELECT applied_method, COUNT(*) as count
    FROM jobs
    WHERE status = 'applied' AND applied_method IS NOT NULL
    GROUP BY applied_method
  `);
  const methodRows = methodStmt.all() as Array<{ applied_method: string; count: number }>;
  
  let totalManual = 0;
  let totalAutomatic = 0;
  for (const row of methodRows) {
    if (row.applied_method === 'manual') totalManual = row.count;
    if (row.applied_method === 'automatic') totalAutomatic = row.count;
  }
  
  // Get applications by time period
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const todayStmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE status = 'applied' AND created_at >= ?
  `);
  const appliedToday = (todayStmt.get(todayStart) as { count: number }).count;
  
  const weekStmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE status = 'applied' AND created_at >= ?
  `);
  const appliedThisWeek = (weekStmt.get(weekStart) as { count: number }).count;
  
  const monthStmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE status = 'applied' AND created_at >= ?
  `);
  const appliedThisMonth = (monthStmt.get(monthStart) as { count: number }).count;
  
  return {
    totalManual,
    totalAutomatic,
    appliedToday,
    appliedThisWeek,
    appliedThisMonth
  };
}

// Answer operations
export interface CachedAnswers {
  job_id: string;
  json: string;
  resume_variant: string;
  created_at?: string;
}

export function cacheAnswers(jobId: string, answers: any, resumeVariant: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO answers (job_id, json, resume_variant)
    VALUES (?, ?, ?)
  `);
  stmt.run(jobId, JSON.stringify(answers), resumeVariant);
}

export function getAnswers(jobId: string): CachedAnswers | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM answers WHERE job_id = ?');
  return stmt.get(jobId) as CachedAnswers | null;
}

// Label mapping operations
export interface LabelMapping {
  label: string;
  key: string;
  locator?: string;
  confidence: number;
  success_count?: number;
  failure_count?: number;
  field_type?: string;
  input_strategy?: string;
  last_seen_at?: string;
}

export function getLabelMapping(label: string): LabelMapping | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM label_map WHERE label = ?');
  return stmt.get(label) as LabelMapping | null;
}

export function saveLabelMapping(mapping: LabelMapping): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO label_map (label, key, locator, confidence, success_count, failure_count, field_type, input_strategy, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(
    mapping.label, 
    mapping.key, 
    mapping.locator ?? null, 
    mapping.confidence,
    mapping.success_count ?? 0,
    mapping.failure_count ?? 0,
    mapping.field_type ?? null,
    mapping.input_strategy ?? null
  );
}

export function getAllMappings(): LabelMapping[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM label_map ORDER BY last_seen_at DESC');
  return stmt.all() as LabelMapping[];
}

// Learning system functions
export function updateMappingSuccess(label: string, locator: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE label_map 
    SET success_count = success_count + 1, 
        locator = ?,
        last_seen_at = CURRENT_TIMESTAMP
    WHERE label = ?
  `);
  stmt.run(locator, label);
}

export function updateMappingFailure(label: string): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE label_map 
    SET failure_count = failure_count + 1,
        last_seen_at = CURRENT_TIMESTAMP
    WHERE label = ?
  `);
  stmt.run(label);
}

export function getLabelMappingByKey(key: string): LabelMapping[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM label_map WHERE key = ? ORDER BY confidence DESC');
  return stmt.all(key) as LabelMapping[];
}

export function calculateDynamicConfidence(baseConfidence: number, successCount: number, failureCount: number): number {
  let confidence = baseConfidence * (1 + (successCount * 0.05)) * (1 - (failureCount * 0.1));
  return Math.max(0.5, Math.min(1.0, confidence));
}

export function clearLabelMappings(): void {
  const database = getDb();
  database.prepare('DELETE FROM label_map').run();
}

// Run log operations
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

export function logRun(run: Omit<RunLog, 'id' | 'started_at'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO runs (job_id, step, ok, log, screenshot_path, ended_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    run.job_id,
    run.step,
    run.ok ? 1 : 0,
    run.log ?? null,
    run.screenshot_path ?? null,
    run.ended_at ?? new Date().toISOString()
  );
  return result.lastInsertRowid as number;
}

export function getRunHistory(jobId?: string, limit: number = 50): RunLog[] {
  const database = getDb();
  let query = 'SELECT * FROM runs';
  const params: any[] = [];

  if (jobId) {
    query += ' WHERE job_id = ?';
    params.push(jobId);
  }

  query += ' ORDER BY started_at DESC LIMIT ?';
  params.push(limit);

  const stmt = database.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    ok: row.ok === 1
  }));
}

// Recent job activity for dashboard
export interface JobActivity {
  id: string;
  title: string;
  company: string;
  status: Job['status'];
  applied_method?: 'automatic' | 'manual';
  rejection_reason?: string;
  created_at: string;
  status_updated_at?: string;
}

// Comprehensive activity log entry
export interface ActivityEntry {
  id: string;
  type: 'job_created' | 'job_updated' | 'run_step' | 'run_error' | 'run_success';
  timestamp: string;
  job_id?: string;
  job_title?: string;
  job_company?: string;
  job_status?: Job['status'];
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

export function getRecentJobActivity(limit: number = 10): JobActivity[] {
  const database = getDb();
  
  // Get jobs that have been updated recently (not just created)
  // We'll look for jobs with applied_method or rejection_reason as indicators of activity
  const query = `
    SELECT id, title, company, status, applied_method, rejection_reason, created_at, status_updated_at
    FROM jobs 
    WHERE applied_method IS NOT NULL 
       OR rejection_reason IS NOT NULL 
       OR status IN ('applied', 'rejected', 'interview')
    ORDER BY COALESCE(status_updated_at, created_at) DESC 
    LIMIT ?
  `;
  
  const stmt = database.prepare(query);
  const rows = stmt.all(limit) as any[];
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    company: row.company,
    status: row.status,
    applied_method: row.applied_method,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    status_updated_at: row.status_updated_at
  }));
}

export function getComprehensiveActivity(limit: number = 100): ActivityEntry[] {
  const database = getDb();
  const activities: ActivityEntry[] = [];
  
  // Convert SQLite timestamp to ISO format
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return timestamp;
    // If it's already ISO format, return as is
    if (timestamp.includes('T') && timestamp.includes('Z')) {
      return timestamp;
    }
    // If it's SQLite format (YYYY-MM-DD HH:MM:SS), convert to ISO
    if (timestamp.includes(' ') && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      // Replace space with T and add Z to make it proper ISO format
      return timestamp.replace(' ', 'T') + 'Z';
    }
    return timestamp;
  };
  
  // Get recent job activities (created and updated)
  const jobQuery = `
    SELECT 
      id, title, company, status, rank, applied_method, rejection_reason, 
      fit_reasons, created_at, status_updated_at
    FROM jobs 
    ORDER BY COALESCE(status_updated_at, created_at) DESC 
    LIMIT ?
  `;
  
  const jobStmt = database.prepare(jobQuery);
  const jobs = jobStmt.all(limit) as any[];
  
  // Convert jobs to activity entries
  for (const job of jobs) {
    const createdTimestamp = formatTimestamp(job.created_at);
    const updatedTimestamp = job.status_updated_at ? formatTimestamp(job.status_updated_at) : null;
    
    // Only create job_created activity if this is a new job (no status updates yet)
    if (!updatedTimestamp || updatedTimestamp === createdTimestamp) {
      activities.push({
        id: `job-created-${job.id}`,
        type: 'job_created',
        timestamp: createdTimestamp,
        job_id: job.id,
        job_title: job.title,
        job_company: job.company,
        job_status: job.status,
        job_rank: job.rank,
        message: `New job found: ${job.title} at ${job.company}`
      });
    } else {
      // Job has been updated - show the update activity instead
      activities.push({
        id: `job-updated-${job.id}`,
        type: 'job_updated',
        timestamp: updatedTimestamp,
        job_id: job.id,
        job_title: job.title,
        job_company: job.company,
        job_status: job.status,
        job_rank: job.rank,
        applied_method: job.applied_method,
        rejection_reason: job.rejection_reason,
        message: `Job status updated to ${job.status}${job.applied_method ? ` (${job.applied_method})` : ''}`
      });
    }
  }
  
  // Get recent run activities
  const runQuery = `
    SELECT r.*, j.title, j.company, j.status as job_status, j.rank
    FROM runs r
    LEFT JOIN jobs j ON r.job_id = j.id
    ORDER BY r.started_at DESC 
    LIMIT ?
  `;
  
  const runStmt = database.prepare(runQuery);
  const runs = runStmt.all(limit) as any[];
  
  // Convert runs to activity entries
  for (const run of runs) {
    const duration = run.ended_at && run.started_at 
      ? new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()
      : undefined;
    
    activities.push({
      id: `run-${run.id}`,
      type: run.ok ? 'run_success' : 'run_error',
      timestamp: formatTimestamp(run.started_at),
      job_id: run.job_id,
      job_title: run.title,
      job_company: run.company,
      job_status: run.job_status,
      step: run.step,
      success: run.ok === 1,
      message: run.log || `${run.step} ${run.ok ? 'completed successfully' : 'failed'}`,
      screenshot_path: run.screenshot_path,
      duration_ms: duration
    });
  }
  
  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Return limited results
  return activities.slice(0, limit);
}

// Cache clearing operations
export function clearAnswersCache(): void {
  const database = getDb();
  database.prepare('DELETE FROM answers').run();
}

export function clearAllCaches(): void {
  const database = getDb();
  database.prepare('DELETE FROM answers').run();
  database.prepare('DELETE FROM label_map').run();
}

// Rejection learning database functions

export interface RejectionPattern {
  id?: number;
  pattern_type: string;
  pattern_value: string;
  count: number;
  last_seen: string;
  weight_adjustment: number;
  profile_category?: string;
  created_at: string;
}

export interface WeightAdjustment {
  id?: number;
  profile_category: string;
  old_weight: number;
  new_weight: number;
  reason: string;
  rejection_id?: string;
  created_at: string;
}

export function saveRejectionPattern(pattern: {
  type: string;
  value: string;
  confidence: number;
  profileCategory?: string;
  weightAdjustment?: number;
}): void {
  const database = getDb();
  
  // Check if pattern already exists
  const existing = database.prepare(`
    SELECT id, count FROM rejection_patterns 
    WHERE pattern_type = ? AND pattern_value = ?
  `).get(pattern.type, pattern.value);
  
  if (existing) {
    // Update existing pattern
    database.prepare(`
      UPDATE rejection_patterns 
      SET count = count + 1, last_seen = CURRENT_TIMESTAMP,
          weight_adjustment = ?, profile_category = ?
      WHERE id = ?
    `).run(pattern.weightAdjustment || 0, pattern.profileCategory, existing.id);
  } else {
    // Insert new pattern
    database.prepare(`
      INSERT INTO rejection_patterns 
      (pattern_type, pattern_value, count, weight_adjustment, profile_category)
      VALUES (?, ?, 1, ?, ?)
    `).run(pattern.type, pattern.value, pattern.weightAdjustment || 0, pattern.profileCategory);
  }
}

export function getRejectionPatternsByType(type: string): RejectionPattern[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM rejection_patterns 
    WHERE pattern_type = ? 
    ORDER BY count DESC, last_seen DESC
  `).all(type) as RejectionPattern[];
}

export function getAllRejectionPatterns(): RejectionPattern[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM rejection_patterns 
    ORDER BY count DESC, last_seen DESC
  `).all() as RejectionPattern[];
}

export function getWeightAdjustments(): WeightAdjustment[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM weight_adjustments 
    ORDER BY created_at DESC
  `).all() as WeightAdjustment[];
}

export function saveWeightAdjustment(adjustment: {
  profile_category: string;
  old_weight: number;
  new_weight: number;
  reason: string;
  rejection_id?: string;
}): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO weight_adjustments 
    (profile_category, old_weight, new_weight, reason, rejection_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    adjustment.profile_category,
    adjustment.old_weight,
    adjustment.new_weight,
    adjustment.reason,
    adjustment.rejection_id
  );
}

export function getCurrentWeightAdjustments(): Record<string, number> {
  const database = getDb();
  const adjustments = database.prepare(`
    SELECT profile_category, SUM(new_weight - old_weight) as total_adjustment
    FROM weight_adjustments
    GROUP BY profile_category
  `).all() as Array<{ profile_category: string; total_adjustment: number }>;
  
  const result: Record<string, number> = {};
  for (const adj of adjustments) {
    result[adj.profile_category] = adj.total_adjustment;
  }
  return result;
}

export function getRejectionStats(): {
  totalRejections: number;
  topPatterns: Array<{ type: string; value: string; count: number }>;
  recentAdjustments: WeightAdjustment[];
} {
  const database = getDb();
  
  const totalRejections = database.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE status = 'rejected'
  `).get() as { count: number };
  
  const topPatterns = database.prepare(`
    SELECT pattern_type as type, pattern_value as value, count
    FROM rejection_patterns
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ type: string; value: string; count: number }>;
  
  const recentAdjustments = database.prepare(`
    SELECT * FROM weight_adjustments
    ORDER BY created_at DESC
    LIMIT 10
  `).all() as WeightAdjustment[];
  
  return {
    totalRejections: totalRejections.count,
    topPatterns,
    recentAdjustments
  };
}

export function resetWeightAdjustments(): void {
  const database = getDb();
  database.prepare(`DELETE FROM weight_adjustments`).run();
}

export function clearAllFilters(): void {
  const database = getDb();
  database.prepare(`DELETE FROM rejection_patterns`).run();
}

// Initialize on import
initDb();



import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../data/app.db');
const TEST_DB_PATH = ':memory:'; // In-memory database for tests

let db: Database.Database | null = null;
let isTestMode = false;

export function setTestMode(testMode: boolean = true): void {
  isTestMode = testMode;
  // Close existing database if switching modes
  if (db) {
    db.close();
    db = null;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    // Check environment variable for test mode
    const envTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';
    const dbPath = (isTestMode || envTestMode) ? TEST_DB_PATH : DB_PATH;
    
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Log which database we're using (only in test mode for clarity)
    if (envTestMode && dbPath === TEST_DB_PATH) {
      console.log('🧪 Using in-memory test database (production data is safe)');
    }
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
  
  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN profile TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN rejection_processed INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    database.exec(`ALTER TABLE jobs ADD COLUMN curated INTEGER DEFAULT 0`);
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

  // Prohibited keywords table (manual blockers - always active)
  database.exec(`
    CREATE TABLE IF NOT EXISTS prohibited_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      match_mode TEXT DEFAULT 'sentence',
      reason TEXT,
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

  // User profile table (single row)
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      city TEXT,
      linkedin_profile TEXT,
      work_authorization TEXT,
      requires_sponsorship TEXT,
      profile_summary TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User skills table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_name TEXT NOT NULL,
      category TEXT,
      proficiency_level TEXT,
      years_experience REAL,
      source TEXT DEFAULT 'manual',
      resume_file_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(skill_name, category)
    )
  `);

  // User experience table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      duration TEXT,
      description TEXT,
      technologies TEXT,
      achievements TEXT,
      resume_file_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User education table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution TEXT NOT NULL,
      degree TEXT,
      field TEXT,
      graduation_year TEXT,
      description TEXT,
      resume_file_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Resume files metadata table
  database.exec(`
    CREATE TABLE IF NOT EXISTS resume_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL UNIQUE,
      variant_type TEXT,
      parsed_at TEXT,
      sections_extracted INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      full_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Common answers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS common_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_key TEXT NOT NULL UNIQUE,
      answer_text TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Application preferences table (key-value store)
  database.exec(`
    CREATE TABLE IF NOT EXISTS application_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Resume cache table for parsed resume sections
  database.exec(`
    CREATE TABLE IF NOT EXISTS resume_cache (
      filename TEXT PRIMARY KEY,
      sections TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Search profiles table for storing per-profile location preferences
  database.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      profile_key TEXT PRIMARY KEY,
      location TEXT,
      remote INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // LinkedIn leads table for storing 1st degree connections
  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      company TEXT,
      about TEXT,
      email TEXT,
      location TEXT,
      profile_url TEXT UNIQUE NOT NULL,
      linkedin_id TEXT,
      scraped_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add location column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN location TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add worked_together column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN worked_together TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add articles column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN articles TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add deleted_at column for soft delete functionality (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN deleted_at TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add birthday column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN birthday TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add connected_date column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN connected_date TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add address column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN address TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add phone column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN phone TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add website column if it doesn't exist (migration)
  try {
    database.exec(`ALTER TABLE leads ADD COLUMN website TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Lead scraping runs table for batch processing and resume capability
  database.exec(`
    CREATE TABLE IF NOT EXISTS lead_scraping_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      status TEXT DEFAULT 'in_progress',
      profiles_scraped INTEGER DEFAULT 0,
      profiles_added INTEGER DEFAULT 0,
      last_profile_url TEXT,
      filter_titles TEXT,
      max_profiles INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  rejection_processed?: number; // 0 = unprocessed, 1 = processed (acts as boolean)
  curated?: boolean; // User-curated flag for favorite jobs
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  category_scores?: string; // JSON string
  missing_keywords?: string; // JSON string
  posted_date?: string; // When the job was posted on LinkedIn
  description?: string; // Full job description text
  profile?: string; // Search profile used to find this job (core, security, event-driven, etc.)
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
    INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, profile, created_at, status_updated_at, rejection_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = database.prepare(`
    UPDATE jobs 
    SET status = ?, rank = ?, fit_reasons = ?, must_haves = ?, blockers = ?, category_scores = ?, missing_keywords = ?, posted_date = ?, description = ?, profile = ?, status_updated_at = ?
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
            job.profile ?? null,
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
            job.profile ?? null,
            now,
            null,  // Don't set status_updated_at for new jobs
            job.rejection_reason ?? null
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

export function getJobsByStatus(status?: string, easyApply?: boolean, search?: string, curated?: boolean): Job[] {
  const database = getDb();
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  } else {
    // When no status filter is provided, exclude skipped jobs by default
    // This matches the frontend behavior and reduces unnecessary data transfer
    query += ' AND status != ?';
    params.push('skipped');
  }

  if (easyApply !== undefined) {
    query += ' AND easy_apply = ?';
    params.push(easyApply ? 1 : 0);
  }

  // Add search filter (searches both title and company)
  if (search) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(company) LIKE ?)';
    const searchPattern = `%${search.toLowerCase()}%`;
    params.push(searchPattern, searchPattern);
  }

  // Add curated filter
  if (curated !== undefined) {
    query += ' AND curated = ?';
    params.push(curated ? 1 : 0);
  }

  query += ' ORDER BY rank DESC, created_at DESC';

  const stmt = database.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    easy_apply: row.easy_apply === 1,
    curated: row.curated === 1
  }));
}

export function getUnprocessedRejections(): Job[] {
  const database = getDb();
  const query = `
    SELECT * FROM jobs 
    WHERE status = 'rejected' 
    AND rejection_reason IS NOT NULL 
    AND rejection_reason != ''
    AND (rejection_processed = 0 OR rejection_processed IS NULL)
    ORDER BY status_updated_at DESC
  `;
  
  const stmt = database.prepare(query);
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    ...row,
    easy_apply: row.easy_apply === 1,
    curated: row.curated === 1
  }));
}

export function markRejectionsAsProcessed(jobIds: string[]): void {
  const database = getDb();
  if (jobIds.length === 0) return;
  
  const placeholders = jobIds.map(() => '?').join(',');
  const query = `UPDATE jobs SET rejection_processed = 1 WHERE id IN (${placeholders})`;
  const stmt = database.prepare(query);
  stmt.run(...jobIds);
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
    easy_apply: row.easy_apply === 1,
    curated: row.curated === 1
  };
}

export function getJobById(id: string): Job | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM jobs WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    easy_apply: row.easy_apply === 1,
    curated: row.curated === 1
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
  
  // Automatic learning disabled - rejection reasons are now processed manually via prompt generator
  // Learning trigger removed - users generate prompts and refine profiles/logic manually
}

export function toggleJobCurated(jobId: string): void {
  const database = getDb();
  // Get current curated status
  const job = getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  // Toggle curated status
  const newCuratedValue = job.curated ? 0 : 1;
  const stmt = database.prepare('UPDATE jobs SET curated = ? WHERE id = ?');
  stmt.run(newCuratedValue, jobId);
}

export interface JobStats {
  queued: number;
  applied: number;
  interview: number;
  rejected: number;
  skipped: number;
  reported: number;
  curated: number;
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
    curated: 0,
    total: 0
  };

  for (const row of rows) {
    stats[row.status as keyof JobStats] = row.count;
    stats.total += row.count;
  }

  // Get curated count separately
  const curatedStmt = database.prepare(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE curated = 1
  `);
  const curatedResult = curatedStmt.get() as { count: number };
  stats.curated = curatedResult.count;

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
  `).get(pattern.type, pattern.value) as { id: number; count: number } | undefined;
  
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

export interface ProhibitedKeyword {
  id: number;
  keyword: string;
  match_mode: string;
  reason: string | null;
  created_at: string;
}

export function getProhibitedKeywords(): ProhibitedKeyword[] {
  const database = getDb();
  return database.prepare(`
    SELECT * FROM prohibited_keywords 
    ORDER BY keyword
  `).all() as ProhibitedKeyword[];
}

export function addProhibitedKeyword(
  keyword: string, 
  matchMode: string = 'sentence',
  reason?: string
): void {
  const database = getDb();
  try {
    database.prepare(`
      INSERT INTO prohibited_keywords (keyword, match_mode, reason)
      VALUES (?, ?, ?)
    `).run(keyword.toLowerCase().trim(), matchMode, reason || null);
  } catch (error) {
    if ((error as Error).message.includes('UNIQUE constraint')) {
      throw new Error(`Keyword "${keyword}" already exists`);
    }
    throw error;
  }
}

export function removeProhibitedKeyword(keyword: string): void {
  const database = getDb();
  database.prepare(`
    DELETE FROM prohibited_keywords WHERE LOWER(keyword) = LOWER(?)
  `).run(keyword);
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

// User Profile operations
export interface UserProfile {
  id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  city?: string;
  linkedin_profile?: string;
  work_authorization?: string;
  requires_sponsorship?: string;
  profile_summary?: string;
  created_at?: string;
  updated_at?: string;
}

export function getUserProfile(): UserProfile | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM user_profile WHERE id = 1');
  return stmt.get() as UserProfile | null;
}

export function saveUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): void {
  const database = getDb();
  const existing = getUserProfile();
  
  if (existing) {
    // Update existing profile
    database.prepare(`
      UPDATE user_profile 
      SET full_name = ?, first_name = ?, last_name = ?, email = ?, phone = ?, 
          city = ?, linkedin_profile = ?, work_authorization = ?, 
          requires_sponsorship = ?, profile_summary = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      profile.full_name,
      profile.first_name || null,
      profile.last_name || null,
      profile.email,
      profile.phone || null,
      profile.city || null,
      profile.linkedin_profile || null,
      profile.work_authorization || null,
      profile.requires_sponsorship || null,
      profile.profile_summary || null
    );
  } else {
    // Insert new profile
    database.prepare(`
      INSERT INTO user_profile (id, full_name, first_name, last_name, email, phone, 
                                city, linkedin_profile, work_authorization, 
                                requires_sponsorship, profile_summary)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.full_name,
      profile.first_name || null,
      profile.last_name || null,
      profile.email,
      profile.phone || null,
      profile.city || null,
      profile.linkedin_profile || null,
      profile.work_authorization || null,
      profile.requires_sponsorship || null,
      profile.profile_summary || null
    );
  }
}

// User Skills operations
export interface UserSkill {
  id?: number;
  skill_name: string;
  category?: string;
  proficiency_level?: string;
  years_experience?: number;
  source?: 'manual' | 'resume';
  resume_file_id?: number;
  created_at?: string;
  updated_at?: string;
}

export function getUserSkills(category?: string): UserSkill[] {
  const database = getDb();
  let query = 'SELECT * FROM user_skills';
  const params: any[] = [];
  
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY years_experience DESC, skill_name ASC';
  
  const stmt = database.prepare(query);
  return stmt.all(...params) as UserSkill[];
}

export function findSkillByName(skillName: string): UserSkill | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM user_skills WHERE LOWER(skill_name) = LOWER(?)');
  return stmt.get(skillName) as UserSkill | null;
}

export function saveUserSkill(skill: Omit<UserSkill, 'id' | 'created_at' | 'updated_at'>): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO user_skills (skill_name, category, proficiency_level, years_experience, source, resume_file_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(skill_name, category) DO UPDATE SET
      proficiency_level = excluded.proficiency_level,
      years_experience = excluded.years_experience,
      source = excluded.source,
      resume_file_id = excluded.resume_file_id,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    skill.skill_name,
    skill.category || null,
    skill.proficiency_level || null,
    skill.years_experience || null,
    skill.source || 'manual',
    skill.resume_file_id || null
  );
}

export function deleteUserSkill(id: number): void {
  const database = getDb();
  database.prepare('DELETE FROM user_skills WHERE id = ?').run(id);
}

export function clearUserSkills(): void {
  const database = getDb();
  database.prepare('DELETE FROM user_skills').run();
}

// User Experience operations
export interface UserExperience {
  id?: number;
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  description?: string;
  technologies?: string;
  achievements?: string;
  resume_file_id?: number;
  created_at?: string;
  updated_at?: string;
}

export function getUserExperience(): UserExperience[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM user_experience ORDER BY start_date DESC');
  return stmt.all() as UserExperience[];
}

export function saveUserExperience(exp: Omit<UserExperience, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO user_experience (company, title, start_date, end_date, duration, 
                                  description, technologies, achievements, resume_file_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    exp.company,
    exp.title,
    exp.start_date || null,
    exp.end_date || null,
    exp.duration || null,
    exp.description || null,
    exp.technologies || null,
    exp.achievements || null,
    exp.resume_file_id || null
  );
  return result.lastInsertRowid as number;
}

export function deleteUserExperience(id: number): void {
  const database = getDb();
  database.prepare('DELETE FROM user_experience WHERE id = ?').run(id);
}

export function clearUserExperience(): void {
  const database = getDb();
  database.prepare('DELETE FROM user_experience').run();
}

// User Education operations
export interface UserEducation {
  id?: number;
  institution: string;
  degree?: string;
  field?: string;
  graduation_year?: string;
  description?: string;
  resume_file_id?: number;
  created_at?: string;
  updated_at?: string;
}

export function getUserEducation(): UserEducation[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM user_education ORDER BY graduation_year DESC');
  return stmt.all() as UserEducation[];
}

export function saveUserEducation(edu: Omit<UserEducation, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDb();
  const result = database.prepare(`
    INSERT INTO user_education (institution, degree, field, graduation_year, description, resume_file_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    edu.institution,
    edu.degree || null,
    edu.field || null,
    edu.graduation_year || null,
    edu.description || null,
    edu.resume_file_id || null
  );
  return result.lastInsertRowid as number;
}

export function deleteUserEducation(id: number): void {
  const database = getDb();
  database.prepare('DELETE FROM user_education WHERE id = ?').run(id);
}

export function clearUserEducation(): void {
  const database = getDb();
  database.prepare('DELETE FROM user_education').run();
}

// Resume Files operations
export interface ResumeFile {
  id?: number;
  file_name: string;
  variant_type?: string;
  parsed_at?: string;
  sections_extracted?: number;
  is_active?: boolean;
  full_text?: string;
  created_at?: string;
  updated_at?: string;
}

export function getResumeFiles(activeOnly: boolean = false): ResumeFile[] {
  const database = getDb();
  let query = 'SELECT * FROM resume_files';
  if (activeOnly) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY created_at DESC';
  
  const stmt = database.prepare(query);
  const rows = stmt.all() as any[];
  return rows.map(row => ({
    ...row,
    is_active: row.is_active === 1
  }));
}

export function getResumeFileByName(fileName: string): ResumeFile | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM resume_files WHERE file_name = ?');
  const row = stmt.get(fileName) as any;
  if (!row) return null;
  return {
    ...row,
    is_active: row.is_active === 1
  };
}

export function saveResumeFile(resume: Omit<ResumeFile, 'id' | 'created_at' | 'updated_at'>): number {
  const database = getDb();
  const existing = getResumeFileByName(resume.file_name);
  
  if (existing) {
    // Update existing
    database.prepare(`
      UPDATE resume_files 
      SET variant_type = ?, parsed_at = ?, sections_extracted = ?, 
          is_active = ?, full_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE file_name = ?
    `).run(
      resume.variant_type || null,
      resume.parsed_at || null,
      resume.sections_extracted || 0,
      resume.is_active ? 1 : 0,
      resume.full_text || null,
      resume.file_name
    );
    return existing.id!;
  } else {
    // Insert new
    const result = database.prepare(`
      INSERT INTO resume_files (file_name, variant_type, parsed_at, sections_extracted, is_active, full_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      resume.file_name,
      resume.variant_type || null,
      resume.parsed_at || null,
      resume.sections_extracted || 0,
      resume.is_active ? 1 : 0,
      resume.full_text || null
    );
    return result.lastInsertRowid as number;
  }
}

export function deleteResumeFile(id: number): void {
  const database = getDb();
  database.prepare('DELETE FROM resume_files WHERE id = ?').run(id);
}

// Common Answers operations
export interface CommonAnswer {
  id?: number;
  question_key: string;
  answer_text: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export function getCommonAnswer(questionKey: string): CommonAnswer | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM common_answers WHERE question_key = ?');
  return stmt.get(questionKey) as CommonAnswer | null;
}

export function getAllCommonAnswers(): CommonAnswer[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM common_answers ORDER BY question_key ASC');
  return stmt.all() as CommonAnswer[];
}

export function saveCommonAnswer(answer: Omit<CommonAnswer, 'id' | 'created_at' | 'updated_at'>): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO common_answers (question_key, answer_text, description)
    VALUES (?, ?, ?)
    ON CONFLICT(question_key) DO UPDATE SET
      answer_text = excluded.answer_text,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    answer.question_key,
    answer.answer_text,
    answer.description || null
  );
}

export function deleteCommonAnswer(questionKey: string): void {
  const database = getDb();
  database.prepare('DELETE FROM common_answers WHERE question_key = ?').run(questionKey);
}

// Application Preferences operations
export interface ApplicationPreference {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export function getApplicationPreference(key: string, defaultValue?: string): string | null {
  const database = getDb();
  const stmt = database.prepare('SELECT value FROM application_preferences WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value || defaultValue || null;
}

export function getAllApplicationPreferences(): ApplicationPreference[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM application_preferences ORDER BY key ASC');
  return stmt.all() as ApplicationPreference[];
}

export function saveApplicationPreference(pref: Omit<ApplicationPreference, 'updated_at'>): void {
  const database = getDb();
  database.prepare(`
    INSERT INTO application_preferences (key, value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    pref.key,
    pref.value,
    pref.description || null
  );
}

export function deleteApplicationPreference(key: string): void {
  const database = getDb();
  database.prepare('DELETE FROM application_preferences WHERE key = ?').run(key);
}

// Resume Data Query Helpers

/**
 * Get skills by category, returns all if no category specified
 */
export function getUserSkillsByCategory(category?: string): UserSkill[] {
  return getUserSkills(category);
}

/**
 * Find experience entries that mention a specific technology
 */
export function getUserExperienceByTechnology(tech: string): UserExperience[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM user_experience 
    WHERE LOWER(technologies) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
    ORDER BY start_date DESC
  `);
  const searchPattern = `%${tech}%`;
  return stmt.all(searchPattern, searchPattern) as UserExperience[];
}

/**
 * Get overview of resume data in database
 */
export interface ResumeDataSummary {
  resumeCount: number;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  lastParsed?: string;
}

export function getResumeDataSummary(): ResumeDataSummary {
  const database = getDb();
  
  const resumes = getResumeFiles(true);
  const skills = getUserSkills();
  const experience = getUserExperience();
  const education = getUserEducation();
  
  // Get last parsed timestamp
  let lastParsed: string | undefined;
  if (resumes.length > 0) {
    const stmt = database.prepare('SELECT MAX(parsed_at) as last_parsed FROM resume_files WHERE is_active = 1');
    const result = stmt.get() as { last_parsed?: string };
    lastParsed = result.last_parsed || undefined;
  }
  
  return {
    resumeCount: resumes.length,
    skillCount: skills.length,
    experienceCount: experience.length,
    educationCount: education.length,
    lastParsed
  };
}

// Resume cache operations
export function getResumeCache(filename: string): { sections: any[] } | null {
  const database = getDb();
  const stmt = database.prepare('SELECT sections FROM resume_cache WHERE filename = ?');
  const row = stmt.get(filename) as { sections: string } | undefined;
  return row ? { sections: JSON.parse(row.sections) } : null;
}

export function saveResumeCache(filename: string, sections: any[]): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO resume_cache (filename, sections, updated_at)
    VALUES (?, ?, datetime('now'))
  `);
  stmt.run(filename, JSON.stringify(sections));
}

// Profile operations
export interface Profile {
  profile_key: string;
  location?: string;
  remote?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function getProfile(profileKey: string): Profile | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM profiles WHERE profile_key = ?');
  const result = stmt.get(profileKey) as any;
  
  if (!result) return null;
  
  return {
    profile_key: result.profile_key,
    location: result.location,
    remote: result.remote === 1,
    created_at: result.created_at,
    updated_at: result.updated_at
  };
}

export function saveProfile(profile: Profile): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO profiles (profile_key, location, remote, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  stmt.run(profile.profile_key, profile.location || null, profile.remote ? 1 : 0);
}

export function getAllProfiles(): Profile[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM profiles');
  const results = stmt.all() as any[];
  
  return results.map(r => ({
    profile_key: r.profile_key,
    location: r.location,
    remote: r.remote === 1,
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
}

// LinkedIn Leads operations
export interface Lead {
  id: string;
  name: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  phone?: string; // e.g., "414-276-1122 (Work)"
  website?: string; // e.g., "x.com/wmwillwilliam"
  location?: string;
  profile_url: string;
  linkedin_id?: string;
  worked_together?: string;
  articles?: string; // JSON array of article URLs
  birthday?: string; // e.g., "January 1"
  connected_date?: string; // e.g., "Oct 18, 2017"
  address?: string; // Social media handles or custom addresses
  scraped_at?: string;
  created_at?: string;
  deleted_at?: string;
}

export interface LeadScrapingRun {
  id?: number;
  started_at?: string;
  completed_at?: string;
  status: 'in_progress' | 'completed' | 'stopped';
  profiles_scraped: number;
  profiles_added: number;
  last_profile_url?: string;
  filter_titles?: string; // JSON array
  max_profiles?: number;
  created_at?: string;
}

export function addLead(lead: Omit<Lead, 'created_at' | 'scraped_at' | 'deleted_at'>): boolean {
  const database = getDb();
  
  // Check if lead already exists (including soft-deleted)
  if (leadExistsIncludingDeleted(lead.profile_url, lead.linkedin_id, lead.name, lead.email)) {
    return false;
  }
  
  const stmt = database.prepare(`
    INSERT INTO leads (id, name, title, company, about, email, phone, website, location, profile_url, linkedin_id, worked_together, articles, birthday, connected_date, address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    stmt.run(
      lead.id,
      lead.name,
      lead.title || null,
      lead.company || null,
      lead.about || null,
      lead.email || null,
      lead.phone || null,
      lead.website || null,
      lead.location || null,
      lead.profile_url,
      lead.linkedin_id || null,
      lead.worked_together || null,
      lead.articles || null,
      lead.birthday || null,
      lead.connected_date || null,
      lead.address || null
    );
    return true;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

export function leadExistsByUrl(profileUrl: string): boolean {
  const database = getDb();
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  const stmt = database.prepare('SELECT 1 FROM leads WHERE profile_url = ? AND deleted_at IS NULL LIMIT 1');
  const result = stmt.get(normalizedUrl);
  return !!result;
}

export function leadExistsIncludingDeleted(profileUrl: string, linkedinId?: string, name?: string, email?: string): boolean {
  const database = getDb();
  
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  
  // Check by profile URL first (most reliable)
  let stmt = database.prepare('SELECT 1 FROM leads WHERE profile_url = ? LIMIT 1');
  let result = stmt.get(normalizedUrl);
  if (result) return true;
  
  // Check by LinkedIn ID if available
  if (linkedinId) {
    stmt = database.prepare('SELECT 1 FROM leads WHERE linkedin_id = ? LIMIT 1');
    result = stmt.get(linkedinId);
    if (result) return true;
  }
  
  // Check by name + email combination if both available
  if (name && email) {
    stmt = database.prepare('SELECT 1 FROM leads WHERE LOWER(name) = ? AND LOWER(email) = ? LIMIT 1');
    result = stmt.get(name.toLowerCase(), email.toLowerCase());
    if (result) return true;
  }
  
  return false;
}

export function getLeadByUrl(profileUrl: string): Lead | null {
  const database = getDb();
  // Normalize URL by removing trailing slash
  const normalizedUrl = profileUrl.replace(/\/$/, '');
  const stmt = database.prepare('SELECT * FROM leads WHERE profile_url = ?');
  return stmt.get(normalizedUrl) as Lead | null;
}

export function getLeadById(id: string): Lead | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM leads WHERE id = ?');
  return stmt.get(id) as Lead | null;
}

export function softDeleteLead(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE leads 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND deleted_at IS NULL
  `);
  
  const result = stmt.run(id);
  return result.changes > 0;
}

export function deleteIncompleteLeads(): { deleted: number; leads: Array<{ id: string; name: string }> } {
  const database = getDb();
  
  // Find leads with name but missing ALL of: title, company, location, AND email
  const incompleteLeads = database.prepare(`
    SELECT id, name 
    FROM leads 
    WHERE deleted_at IS NULL
      AND (title IS NULL OR title = '')
      AND (company IS NULL OR company = '')
      AND (location IS NULL OR location = '')
      AND (email IS NULL OR email = '')
  `).all() as Array<{ id: string; name: string }>;
  
  if (incompleteLeads.length === 0) {
    return { deleted: 0, leads: [] };
  }
  
  // Soft delete all incomplete leads
  const placeholders = incompleteLeads.map(() => '?').join(',');
  const ids = incompleteLeads.map(l => l.id);
  
  const stmt = database.prepare(`
    UPDATE leads 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id IN (${placeholders}) AND deleted_at IS NULL
  `);
  
  const result = stmt.run(...ids);
  
  return { deleted: result.changes, leads: incompleteLeads };
}

export function getLeads(filters?: {
  search?: string;
  title?: string;
  company?: string;
  location?: string;
  hasEmail?: boolean;
  workedTogether?: boolean;
  limit?: number;
  offset?: number;
}): Lead[] {
  const database = getDb();
  let query = 'SELECT * FROM leads WHERE deleted_at IS NULL';
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(title) LIKE ? OR LOWER(company) LIKE ? OR LOWER(location) LIKE ?)';
    const searchPattern = `%${filters.search.toLowerCase()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (filters?.title) {
    query += ' AND LOWER(title) LIKE ?';
    params.push(`%${filters.title.toLowerCase()}%`);
  }

  if (filters?.company) {
    query += ' AND LOWER(company) LIKE ?';
    params.push(`%${filters.company.toLowerCase()}%`);
  }

  if (filters?.location) {
    query += ' AND LOWER(location) LIKE ?';
    params.push(`%${filters.location.toLowerCase()}%`);
  }

  if (filters?.hasEmail !== undefined) {
    if (filters.hasEmail) {
      query += " AND email IS NOT NULL AND email != ''";
    } else {
      query += " AND (email IS NULL OR email = '')";
    }
  }

  if (filters?.workedTogether !== undefined) {
    if (filters.workedTogether) {
      query += " AND worked_together IS NOT NULL AND worked_together != ''";
    } else {
      query += " AND (worked_together IS NULL OR worked_together = '')";
    }
  }

  query += ' ORDER BY scraped_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  if (filters?.offset) {
    query += ' OFFSET ?';
    params.push(filters.offset);
  }

  const stmt = database.prepare(query);
  return stmt.all(...params) as Lead[];
}

export function getLeadsCount(filters?: {
  search?: string;
  title?: string;
  company?: string;
  location?: string;
  hasEmail?: boolean;
  workedTogether?: boolean;
}): number {
  const database = getDb();
  let query = 'SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL';
  const params: any[] = [];

  if (filters?.search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(title) LIKE ? OR LOWER(company) LIKE ? OR LOWER(location) LIKE ?)';
    const searchPattern = `%${filters.search.toLowerCase()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (filters?.title) {
    query += ' AND LOWER(title) LIKE ?';
    params.push(`%${filters.title.toLowerCase()}%`);
  }

  if (filters?.company) {
    query += ' AND LOWER(company) LIKE ?';
    params.push(`%${filters.company.toLowerCase()}%`);
  }

  if (filters?.location) {
    query += ' AND LOWER(location) LIKE ?';
    params.push(`%${filters.location.toLowerCase()}%`);
  }

  if (filters?.hasEmail !== undefined) {
    if (filters.hasEmail) {
      query += " AND email IS NOT NULL AND email != ''";
    } else {
      query += " AND (email IS NULL OR email = '')";
    }
  }

  if (filters?.workedTogether !== undefined) {
    if (filters.workedTogether) {
      query += " AND worked_together IS NOT NULL AND worked_together != ''";
    } else {
      query += " AND (worked_together IS NULL OR worked_together = '')";
    }
  }

  const stmt = database.prepare(query);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

export interface LeadStats {
  total: number;
  withEmail: number;
  withoutEmail: number;
  workedTogether: number;
  withArticles: number;
  topCompanies: Array<{ company: string; count: number }>;
  topTitles: Array<{ title: string; count: number }>;
}

export function getLeadStats(): LeadStats {
  const database = getDb();
  
  const total = database.prepare('SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL').get() as { count: number };
  
  const withEmail = database.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL AND email IS NOT NULL AND email != ''"
  ).get() as { count: number };
  
  const workedTogether = database.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL AND worked_together IS NOT NULL AND worked_together != ''"
  ).get() as { count: number };
  
  const withArticles = database.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL AND articles IS NOT NULL AND articles != ''"
  ).get() as { count: number };
  
  const topCompanies = database.prepare(`
    SELECT company, COUNT(*) as count
    FROM leads
    WHERE deleted_at IS NULL AND company IS NOT NULL AND company != ''
    GROUP BY company
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ company: string; count: number }>;
  
  const topTitles = database.prepare(`
    SELECT title, COUNT(*) as count
    FROM leads
    WHERE deleted_at IS NULL AND title IS NOT NULL AND title != ''
    GROUP BY title
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ title: string; count: number }>;
  
  return {
    total: total.count,
    withEmail: withEmail.count,
    withoutEmail: total.count - withEmail.count,
    workedTogether: workedTogether.count,
    withArticles: withArticles.count,
    topCompanies,
    topTitles
  };
}

export interface LeadWithBirthday extends Lead {
  birthday: string;
  daysUntilBirthday: number;
  age?: number;
}

export function getLeadsWithUpcomingBirthdays(daysAhead: number = 30): LeadWithBirthday[] {
  const database = getDb();
  
  // Query leads with birthdays in the format "January 1" or "Jan 1" or "01-01"
  // SQLite doesn't have great date parsing, so we'll parse the birthday in application code
  const allLeads = database.prepare(`
    SELECT *
    FROM leads
    WHERE deleted_at IS NULL
      AND birthday IS NOT NULL
      AND birthday != ''
  `).all() as Lead[];
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentDayOfYear = Math.floor((today.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000);
  
  const leadsWithDays: LeadWithBirthday[] = [];
  
  for (const lead of allLeads) {
    if (!lead.birthday) continue;
    
    try {
      // Try to parse various birthday formats
      let birthdayDate: Date | null = null;
      
      // Format: "January 1", "Jan 1", "January 1st"
      const monthDayMatch = lead.birthday.match(/^(\w+)\s+(\d{1,2})/);
      if (monthDayMatch) {
        const [, monthStr, dayStr] = monthDayMatch;
        const day = parseInt(dayStr);
        
        // Map month names to numbers
        const monthMap: Record<string, number> = {
          'january': 0, 'jan': 0,
          'february': 1, 'feb': 1,
          'march': 2, 'mar': 2,
          'april': 3, 'apr': 3,
          'may': 4,
          'june': 5, 'jun': 5,
          'july': 6, 'jul': 6,
          'august': 7, 'aug': 7,
          'september': 8, 'sep': 8, 'sept': 8,
          'october': 9, 'oct': 9,
          'november': 10, 'nov': 10,
          'december': 11, 'dec': 11
        };
        
        const month = monthMap[monthStr.toLowerCase()];
        if (month !== undefined) {
          birthdayDate = new Date(currentYear, month, day);
        }
      }
      
      // Format: "01-01", "1-1"
      if (!birthdayDate) {
        const mmddMatch = lead.birthday.match(/^(\d{1,2})-(\d{1,2})$/);
        if (mmddMatch) {
          const [, monthStr, dayStr] = mmddMatch;
          const month = parseInt(monthStr) - 1; // Month is 0-indexed
          const day = parseInt(dayStr);
          birthdayDate = new Date(currentYear, month, day);
        }
      }
      
      if (!birthdayDate || isNaN(birthdayDate.getTime())) continue;
      
      // Calculate days until birthday
      const birthdayDayOfYear = Math.floor((birthdayDate.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000);
      
      let daysUntil: number;
      if (birthdayDayOfYear >= currentDayOfYear) {
        // Birthday hasn't happened yet this year
        daysUntil = birthdayDayOfYear - currentDayOfYear;
      } else {
        // Birthday already passed this year, calculate for next year
        const nextYearBirthday = new Date(currentYear + 1, birthdayDate.getMonth(), birthdayDate.getDate());
        const nextYearDayOfYear = Math.floor((nextYearBirthday.getTime() - new Date(currentYear, 0, 0).getTime()) / 86400000);
        daysUntil = nextYearDayOfYear - currentDayOfYear;
      }
      
      if (daysUntil <= daysAhead) {
        leadsWithDays.push({
          ...lead,
          birthday: lead.birthday,
          daysUntilBirthday: daysUntil
        });
      }
    } catch (error) {
      // Skip leads with invalid birthday formats
      console.error(`Error parsing birthday for lead ${lead.id}: ${lead.birthday}`, error);
      continue;
    }
  }
  
  // Sort by days until birthday
  leadsWithDays.sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  
  // Return top 10
  return leadsWithDays.slice(0, 10);
}

// Lead scraping runs operations
export function createScrapingRun(run: Omit<LeadScrapingRun, 'id' | 'created_at' | 'started_at'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO lead_scraping_runs (status, profiles_scraped, profiles_added, last_profile_url, filter_titles, max_profiles)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    run.status,
    run.profiles_scraped,
    run.profiles_added,
    run.last_profile_url || null,
    run.filter_titles || null,
    run.max_profiles || null
  );
  
  return result.lastInsertRowid as number;
}

export function updateScrapingRun(id: number, updates: Partial<LeadScrapingRun>): void {
  const database = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  
  if (updates.profiles_scraped !== undefined) {
    fields.push('profiles_scraped = ?');
    values.push(updates.profiles_scraped);
  }
  
  if (updates.profiles_added !== undefined) {
    fields.push('profiles_added = ?');
    values.push(updates.profiles_added);
  }
  
  if (updates.last_profile_url !== undefined) {
    fields.push('last_profile_url = ?');
    values.push(updates.last_profile_url);
  }
  
  if (updates.completed_at !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completed_at);
  }
  
  if (fields.length === 0) return;
  
  values.push(id);
  const query = `UPDATE lead_scraping_runs SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = database.prepare(query);
  stmt.run(...values);
}

export function getScrapingRun(id: number): LeadScrapingRun | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM lead_scraping_runs WHERE id = ?');
  return stmt.get(id) as LeadScrapingRun | null;
}

export function getScrapingRuns(limit: number = 50): LeadScrapingRun[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM lead_scraping_runs ORDER BY started_at DESC LIMIT ?');
  return stmt.all(limit) as LeadScrapingRun[];
}

export function getLastIncompleteScrapingRun(): LeadScrapingRun | null {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM lead_scraping_runs WHERE status IN ('in_progress', 'stopped') ORDER BY started_at DESC LIMIT 1"
  );
  return stmt.get() as LeadScrapingRun | null;
}

// Initialize on import
initDb();



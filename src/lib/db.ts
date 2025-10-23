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
      rank INTEGER,
      status TEXT DEFAULT 'queued',
      fit_reasons TEXT,
      must_haves TEXT,
      blockers TEXT,
      category_scores TEXT,
      missing_keywords TEXT,
      posted_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add new columns if they don't exist
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
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
  rank?: number;
  status: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped' | 'reported';
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  category_scores?: string; // JSON string
  missing_keywords?: string; // JSON string
  posted_date?: string; // When the job was posted on LinkedIn
  created_at?: string; // When we added it to our database
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
    INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const updateStmt = database.prepare(`
    UPDATE jobs 
    SET status = ?, rank = ?, fit_reasons = ?, must_haves = ?, blockers = ?, category_scores = ?, missing_keywords = ?, posted_date = ?
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
          updateStmt.run(
            'queued', // Change status back to queued
            job.rank ?? null,
            job.fit_reasons ?? null,
            job.must_haves ?? null,
            job.blockers ?? null,
            job.category_scores ?? null,
            job.missing_keywords ?? null,
            job.posted_date ?? null,
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
            job.posted_date ?? null
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

export function updateJobStatus(jobId: string, status: Job['status']): void {
  const database = getDb();
  const stmt = database.prepare('UPDATE jobs SET status = ? WHERE id = ?');
  stmt.run(status, jobId);
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
    INSERT OR REPLACE INTO label_map (label, key, locator, confidence, last_seen_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(mapping.label, mapping.key, mapping.locator ?? null, mapping.confidence);
}

export function getAllMappings(): LabelMapping[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM label_map ORDER BY last_seen_at DESC');
  return stmt.all() as LabelMapping[];
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

// Initialize on import
initDb();



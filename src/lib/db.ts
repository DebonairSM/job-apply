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
  status: 'queued' | 'applied' | 'interview' | 'rejected' | 'skipped';
  fit_reasons?: string;
  must_haves?: string;
  blockers?: string;
  created_at?: string;
}

export function addJobs(jobs: Omit<Job, 'created_at'>[]): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO jobs (id, title, company, url, easy_apply, rank, status, fit_reasons, must_haves, blockers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const insertMany = database.transaction((jobList: typeof jobs) => {
    for (const job of jobList) {
      const result = stmt.run(
        job.id,
        job.title,
        job.company,
        job.url,
        job.easy_apply ? 1 : 0,
        job.rank ?? null,
        job.status,
        job.fit_reasons ?? null,
        job.must_haves ?? null,
        job.blockers ?? null
      );
      if (result.changes > 0) inserted++;
    }
  });

  insertMany(jobs);
  return inserted;
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



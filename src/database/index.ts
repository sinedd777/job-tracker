import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { SCHEMA } from './schema';

const dbPath = join(app.getPath('userData'), 'job-tracker.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
Object.values(SCHEMA).forEach((sql) => {
  db.exec(sql);
});

// Run migrations to add any missing columns
try {
  // Check if url column exists in jobs table
  const columns = db.prepare("PRAGMA table_info(jobs)").all();
  const hasUrlColumn = columns.some((col: any) => col.name === 'url');
  
  // Add url column if it doesn't exist
  if (!hasUrlColumn) {
    console.log('Adding url column to jobs table');
    db.exec('ALTER TABLE jobs ADD COLUMN url TEXT;');
  }
} catch (error) {
  console.error('Error running migrations:', error);
}

// Ensure new columns exist for older database versions
try {
  const columns = db.prepare(`PRAGMA table_info(jobs)`).all() as any[];
  const hasSummary = columns.some((c) => c.name === 'summary');
  if (!hasSummary) {
    db.exec(`ALTER TABLE jobs ADD COLUMN summary TEXT`);
  }
} catch (err) {
  console.error('Failed to migrate jobs table schema', err);
}

export default db; 
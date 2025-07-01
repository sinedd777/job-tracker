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

export default db; 
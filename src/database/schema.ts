export const SCHEMA = {
  jobs: `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      status TEXT NOT NULL,
      applied_date TEXT NOT NULL,
      deadline TEXT,
      location TEXT,
      salary TEXT,
      last_sync TEXT NOT NULL
    )
  `,
  notes: `
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    )
  `,
  reminders: `
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    )
  `,
  communications: `
    CREATE TABLE IF NOT EXISTS communications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      contact TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
    )
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `
}; 
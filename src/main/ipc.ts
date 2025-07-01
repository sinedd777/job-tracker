import { ipcMain } from 'electron';
import { jobsDataService } from './services/jobsData';
import db from '../database';

// Job operations
ipcMain.handle('get-jobs', () => {
  return jobsDataService.getJobs();
});

ipcMain.handle('update-job', (_, jobId: string, data: any) => {
  return jobsDataService.updateJobStatus(jobId, data.status);
});

// Note operations
ipcMain.handle('add-note', (_, jobId: string, note: any) => {
  const stmt = db.prepare(`
    INSERT INTO notes (id, job_id, content, created_at)
    VALUES (@id, @jobId, @content, @createdAt)
  `);
  
  stmt.run({
    id: Math.random().toString(36).substr(2, 9),
    jobId,
    content: note.content,
    createdAt: new Date().toISOString(),
  });
});

ipcMain.handle('get-notes', (_, jobId: string) => {
  return db.prepare('SELECT * FROM notes WHERE job_id = ? ORDER BY created_at DESC').all(jobId);
});

// Reminder operations
ipcMain.handle('add-reminder', (_, jobId: string, reminder: any) => {
  const stmt = db.prepare(`
    INSERT INTO reminders (id, job_id, title, due_date, completed)
    VALUES (@id, @jobId, @title, @dueDate, @completed)
  `);
  
  stmt.run({
    id: Math.random().toString(36).substr(2, 9),
    jobId,
    title: reminder.title,
    dueDate: reminder.dueDate,
    completed: 0,
  });
});

ipcMain.handle('get-reminders', (_, jobId: string) => {
  return db.prepare('SELECT * FROM reminders WHERE job_id = ? ORDER BY due_date ASC').all(jobId);
});

// Communication operations
ipcMain.handle('add-communication', (_, jobId: string, communication: any) => {
  const stmt = db.prepare(`
    INSERT INTO communications (id, job_id, type, content, date, contact)
    VALUES (@id, @jobId, @type, @content, @date, @contact)
  `);
  
  stmt.run({
    id: Math.random().toString(36).substr(2, 9),
    jobId,
    type: communication.type,
    content: communication.content,
    date: communication.date || new Date().toISOString(),
    contact: communication.contact,
  });
});

ipcMain.handle('get-communications', (_, jobId: string) => {
  return db.prepare('SELECT * FROM communications WHERE job_id = ? ORDER BY date DESC').all(jobId);
});

// Sync operations
ipcMain.handle('sync-jobs', () => {
  return jobsDataService.syncJobs();
});

// App operations
let isDarkMode = false;

ipcMain.handle('get-dark-mode', () => {
  return isDarkMode;
});

ipcMain.handle('toggle-dark-mode', () => {
  isDarkMode = !isDarkMode;
  return isDarkMode;
}); 
import { ipcMain } from 'electron';
import { jobsDataService } from './services/jobsData';
import db from '../database';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { shell } from 'electron';
import { createServer, Server } from 'http';

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

// Resume operations
let resumeServer: Server | null = null;
const ensureResumeServer = () => {
  if (resumeServer) return;
  resumeServer = createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      return res.end('Bad Request');
    }
    const decodedUrl = decodeURI(req.url);
    if (!decodedUrl.startsWith('/resumes/')) {
      res.statusCode = 404;
      return res.end('Not Found');
    }
    try {
      const filePath = join(process.cwd(), decodedUrl);
      const data = readFileSync(filePath);
      res.setHeader('Content-Type', 'application/x-tex');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('File Not Found');
    }
  });

  resumeServer.listen(4567, '127.0.0.1', () => {
    console.log('Resume server running at http://localhost:4567');
  });
};

ipcMain.handle('read-resume-template', () => {
  try {
    return readFileSync(join(process.cwd(), 'resumes', 'base-resume.tex'), 'utf-8');
  } catch (error) {
    console.error('Failed to read resume template:', error);
    return '';
  }
});

ipcMain.handle('save-and-open-resume', (_event, jobId: string, content: string) => {
  try {
    const fileName = `job-${jobId}.tex`;
    const filePath = join(process.cwd(), 'resumes', fileName);
    // Persist to disk so user has a copy
    writeFileSync(filePath, content, 'utf-8');

    // Build Base64 data URI so Overleaf can fetch without public URL
    const base64 = Buffer.from(content, 'utf-8').toString('base64');
    const dataUri = `data:application/x-tex;base64,${base64}`;
    const overleafUrl = `https://www.overleaf.com/docs?snip_uri=${encodeURIComponent(dataUri)}`;

    shell.openExternal(overleafUrl);
  } catch (error) {
    console.error('Failed to save or open resume:', error);
  }
}); 
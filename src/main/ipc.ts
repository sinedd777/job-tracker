import { ipcMain } from 'electron';
import { jobsDataService } from './services/jobsData';
import db from '../database';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { shell } from 'electron';
import { createServer, Server } from 'http';
import { githubService } from './services/github';
import { ragService } from './services/rag';

// Job operations
ipcMain.handle('get-jobs', () => {
  return jobsDataService.getJobs();
});

ipcMain.handle('get-recent-jobs', () => {
  return jobsDataService.getRecentJobs();
});

ipcMain.handle('get-new-jobs', () => {
  return jobsDataService.getNewJobs();
});

ipcMain.handle('get-recent-new-jobs', () => {
  return jobsDataService.getRecentNewJobs();
});

ipcMain.handle('get-historical-jobs', () => {
  return jobsDataService.getHistoricalJobs();
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

ipcMain.handle('sync-recent-jobs-from-supabase', async () => {
  return jobsDataService.syncRecentJobsFromSupabase();
});

// App operations
let isDarkMode = false;

ipcMain.handle('get-dark-mode', (): boolean => {
  return isDarkMode;
});

ipcMain.handle('toggle-dark-mode', (): boolean => {
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
  // Ensure local resume server is running (used when Overleaf pulls \includegraphics or other resources)
  ensureResumeServer();
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

// Generate cold email using OpenAI
ipcMain.handle('generate-cold-email', async (_event, args: { jobId: string; model?: string }) => {
  const { jobId, model = 'gpt-4o' } = args;

  try {
    // 1. Fetch job info
    const job = jobsDataService.getJob(jobId);
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    // 2. Load user profile from static JSON
    const userProfilePath = join(process.cwd(), 'data', 'user-profile.json');
    const userProfileRaw = readFileSync(userProfilePath, 'utf-8');
    const userProfile = JSON.parse(userProfileRaw);

    // 3. Build strict prompt for GPT-4o
    const recruiterName = (job as any).recruiter || '';

    const educationSummary = (userProfile.education || [])
      .map((e: any) => `${e.degree} - ${e.institution}`)
      .join('; ');

    const projectSummary = (userProfile.projects || [])
      .slice(0, 3)
      .map((p: any) => p.title)
      .join(', ');

    const experienceSummary = (userProfile.experience || [])
      .slice(0, 2)
      .map((exp: any) => `${exp.position} at ${exp.company}`)
      .join('; ');

    const skillsSummary = (userProfile.skills || userProfile.keySkills || [])
      .slice(0, 10)
      .join(', ');

    const jobDescriptionSummary = (job as any).description || (job as any).summary || '';

    const prompt = `You are a cold email writing assistant trained to write concise, human-sounding, and highly personalized outreach emails for job seekers. Your tone should be warm, curious, and professionally confident — not salesy or robotic.

✦ GOAL:
Write a cold email for a job opportunity that highlights the user's background and demonstrates how they can add value to this specific role.

✦ STRUCTURE:
\t1. Friendly greeting and short personal context (1-2 lines)
\t2. Why I'm reaching out / what excites me about the company or team (1-2 lines)
\t3. Why I think I'd be a strong fit (based on my education, projects, past experience)
\t4. Soft close (inviting connection or reply) + signature

✦ RULES:
\t• Do NOT repeat the job description.
\t• Do NOT list my resume — you may hint at it.
\t• Avoid phrases like "I am writing to..." or "I would like to express interest..."
\t• Keep it under 100 words.
\t• Use real, project-based or skill-based evidence from my background.
\t• Make it feel like it was written by a thoughtful human, not AI.

✦ CONTEXT:
Job Title: ${job.title}
Company: ${job.company}
Job Description Summary: ${jobDescriptionSummary}
Recruiter Name (if any): ${recruiterName}
My Education: ${educationSummary}
My Projects: ${projectSummary}
My Experience: ${experienceSummary}
My Skills: ${skillsSummary}

✦ OUTPUT:
Return only the final cold email in plain text. No explanations, no bullet points, no notes. Personal, professional, and specific.`;

    // 4. Call OpenAI Chat Completion
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not set – returning prompt for debugging');
      return prompt; // Fallback so UI still gets content
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert career coach and professional copywriter.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as any;
    const emailContent: string | undefined = data.choices?.[0]?.message?.content?.trim();

    if (!emailContent) {
      throw new Error('No email content returned from OpenAI');
    }

    return emailContent;
  } catch (err) {
    console.error('Failed to generate cold email:', err);
    throw err;
  }
});

// GitHub operations (only get status, no UI controls)
ipcMain.handle('get-github-last-sync', () => {
  return githubService.getLastSyncTime();
});

// RAG operations
ipcMain.handle('update-rag-vector-store', async () => {
  return ragService.updateVectorStore();
});

ipcMain.handle('generate-resume-suggestions', async (_event, args: { jobId: string }) => {
  const { jobId } = args;
  
  try {
    console.log(`Generating resume suggestions for job ${jobId}...`);
    
    // 1. Fetch job info
    const job = jobsDataService.getJob(jobId);
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }
    console.log('Job data:', {
      title: job.title,
      company: job.company,
      hasSummary: !!job.summary,
      summaryLength: job.summary?.length || 0
    });
    
    // 2. Load resume template
    const baseResume = readFileSync(join(process.cwd(), 'resumes', 'base-resume.tex'), 'utf-8');
    console.log('Resume template loaded, length:', baseResume.length);
    
    // 3. Generate suggestions using RAG
    console.log('Calling RAG service for suggestions...');
    const suggestions = await ragService.generateResumeSuggestions({
      jobTitle: job.title,
      jobCompany: job.company,
      jobDescription: job.summary || '',
      baseResume,
    });
    
    
    return suggestions;
  } catch (error) {
    console.error('Failed to generate resume suggestions:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
});
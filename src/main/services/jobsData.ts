import { readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import db from '../../database';
import { fetchRecentJobListings, mapSupabaseJobsToAppFormat } from './supabase';

interface JobData {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
  summary?: string;
  url?: string;
  lastSync?: string;
}

export class JobsDataService {
  constructor() {
    // Perform an initial synchronization so that the database is always
    // up-to-date with the latest scraped data (including new columns like summary).
    // This runs in the background and will finish before any IPC calls that need
    // the data because Electron will import this file during startup.
    this.syncJobs().catch((err) => {
      console.error('Initial job sync failed', err);
    });
  }

  /**
   * Reads the raw JSON file produced by the scraper (LinkedIn schema) and maps
   * each record to the internal {@link JobData} shape expected by the local
   * database.  Any fields that are missing in the source will be defaulted so
   * that the "INSERT OR REPLACE" statement always receives all named
   * parameters.
   */
  private async readJobsData(): Promise<JobData[]> {
    try {
      const data = await readFile(join(process.cwd(), 'jobs-data.json'), 'utf-8');
      const rawJobs = JSON.parse(data) as any[];

      const mapped = rawJobs.map((j) => {
        const salaryRange = j.base_salary?.min_amount && j.base_salary?.max_amount
          ? `${j.base_salary.min_amount}-${j.base_salary.max_amount} ${j.base_salary.currency || ''}`.trim()
          : undefined;

        const job: JobData = {
          id: j.job_posting_id || j.id || randomUUID(),
          title: j.job_title || j.title || 'Untitled',
          company: j.company_name || j.company || 'Unknown',
          status: 'APPLIED',
          appliedDate: j.job_posted_date || new Date().toISOString(),
          location: j.job_location || j.location || '',
          salary: salaryRange,
          summary: j.job_summary || j.summary || '',
          url: j.url || '',
        };
        return job;
      });

      return mapped;
    } catch (error) {
      console.error('Error reading jobs data:', error);
      return [];
    }
  }

  async syncJobs(): Promise<void> {
    const jobs = await this.readJobsData();
    const now = new Date().toISOString();

    const insertJob = db.prepare(`
      INSERT OR REPLACE INTO jobs (
        id, title, company, status, applied_date, location, salary, summary, url, last_sync
      ) VALUES (
        @id, @title, @company, @status, @appliedDate, @location, @salary, @summary, @url, @lastSync
      )
    `);

    const transaction = db.transaction((jobs: JobData[]) => {
      for (const job of jobs) {
        insertJob.run({
          ...job,
          lastSync: now,
        });
      }
    });

    transaction(jobs);
  }

  async syncRecentJobsFromSupabase(): Promise<void> {
    try {
      console.log('Starting sync of recent jobs from Supabase...');
      
      // Fetch recent jobs from Supabase
      const recentJobs = await fetchRecentJobListings();
      console.log(`Fetched ${recentJobs.length} recent job listings from Supabase`);
      
      // Map to our application's job format
      const mappedJobs = mapSupabaseJobsToAppFormat(recentJobs);
      console.log(`Mapped ${mappedJobs.length} jobs to application format`);
      
      // Insert or update jobs in local database
      const now = new Date().toISOString();
      
      const insertJob = db.prepare(`
        INSERT OR REPLACE INTO jobs (
          id, title, company, status, applied_date, location, salary, summary, url, last_sync
        ) VALUES (
          @id, @title, @company, @status, @appliedDate, @location, @salary, @summary, @url, @lastSync
        )
      `);

      const transaction = db.transaction((jobs: JobData[]) => {
        for (const job of jobs) {
          insertJob.run({
            ...job,
            lastSync: now,
          });
        }
      });

      transaction(mappedJobs);
      
      console.log(`Successfully synced ${mappedJobs.length} recent jobs from Supabase to local database`);
    } catch (error) {
      console.error('Error syncing recent jobs from Supabase:', error);
    }
  }

  getJobs(): JobData[] {
    const jobs = db.prepare('SELECT * FROM jobs ORDER BY applied_date DESC').all();
    return jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      appliedDate: job.applied_date,
      location: job.location,
      salary: job.salary,
      summary: job.summary,
      url: job.url,
      lastSync: job.last_sync,
    }));
  }

  getRecentJobs(): JobData[] {
    // Get jobs from the last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const formattedDate = twentyFourHoursAgo.toISOString();
    
    const jobs = db.prepare('SELECT * FROM jobs WHERE applied_date >= ? ORDER BY applied_date DESC').all(formattedDate);
    
    return jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      appliedDate: job.applied_date,
      location: job.location,
      salary: job.salary,
      summary: job.summary,
      url: job.url,
      lastSync: job.last_sync,
    }));
  }

  getJob(id: string): JobData | undefined {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    if (!job) return undefined;

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      appliedDate: job.applied_date,
      location: job.location,
      salary: job.salary,
      summary: job.summary,
      url: job.url,
      lastSync: job.last_sync,
    };
  }

  updateJobStatus(id: string, status: string): void {
    db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
  }
}

export const jobsDataService = new JobsDataService(); 
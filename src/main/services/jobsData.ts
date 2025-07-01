import { readFile } from 'fs/promises';
import { join } from 'path';
import db from '../../database';

interface JobData {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
  lastSync?: string;
}

export class JobsDataService {
  private async readJobsData(): Promise<JobData[]> {
    try {
      const data = await readFile(join(process.cwd(), 'jobs-data.json'), 'utf-8');
      return JSON.parse(data) as JobData[];
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
        id, title, company, status, applied_date, location, salary, last_sync
      ) VALUES (
        @id, @title, @company, @status, @appliedDate, @location, @salary, @lastSync
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
      lastSync: job.last_sync,
    };
  }

  updateJobStatus(id: string, status: string): void {
    db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
  }
}

export const jobsDataService = new JobsDataService(); 
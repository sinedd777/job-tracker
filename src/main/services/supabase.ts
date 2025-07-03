import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env and .env.local if they exist
dotenv.config();
if (existsSync(join(process.cwd(), '.env.local'))) {
  dotenv.config({ path: join(process.cwd(), '.env.local') });
}

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Check if credentials are available
const hasCredentials = !!supabaseUrl && !!supabaseKey;
if (!hasCredentials) {
  console.warn('Supabase credentials are missing. Using mock data for development.');
  console.warn('Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env or .env.local file.');
} else {
  console.log('Supabase credentials found. Using real Supabase database.');
}

// Create Supabase client if credentials are available
export const supabase = hasCredentials 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Type definition for job listings from Supabase
export interface SupabaseJobListing {
  id: string;
  job_posting_id: string;
  job_title: string;
  company_name: string;
  job_location: string;
  url: string;
  apply_link: string;
  job_employment_type: string;
  job_seniority_level: string;
  job_posted_date: string;
  job_posted_time: string;
  job_summary: string;
  job_base_pay_range: string;
  company_url: string;
  country_code: string;
  title_id: string;
  num_applicants: number;
  industries: string;
  job_function: string;
  salary_currency: string;
  salary_min: number;
  salary_max: number;
  salary_period: string;
  created_at: string;
  updated_at: string;
}

// Mock data for development when Supabase credentials are not available
const mockRecentJobs: SupabaseJobListing[] = [
  {
    id: '1',
    job_posting_id: 'mock-job-1',
    job_title: 'Senior Software Engineer',
    company_name: 'Tech Company Inc.',
    job_location: 'San Francisco, CA',
    url: 'https://example.com/job/1',
    apply_link: 'https://example.com/job/1/apply',
    job_employment_type: 'Full-time',
    job_seniority_level: 'Senior',
    job_posted_date: new Date().toISOString(),
    job_posted_time: '9:00 AM',
    job_summary: 'We are looking for a senior software engineer to join our team.',
    job_base_pay_range: '$120,000 - $150,000',
    company_url: 'https://example.com',
    country_code: 'US',
    title_id: 'senior-software-engineer',
    num_applicants: 25,
    industries: 'Technology',
    job_function: 'Engineering',
    salary_currency: 'USD',
    salary_min: 120000,
    salary_max: 150000,
    salary_period: 'yearly',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    job_posting_id: 'mock-job-2',
    job_title: 'Product Manager',
    company_name: 'Product Co.',
    job_location: 'Remote',
    url: 'https://example.com/job/2',
    apply_link: 'https://example.com/job/2/apply',
    job_employment_type: 'Full-time',
    job_seniority_level: 'Mid-Senior',
    job_posted_date: new Date().toISOString(),
    job_posted_time: '10:30 AM',
    job_summary: 'Seeking an experienced product manager to lead our product development.',
    job_base_pay_range: '$100,000 - $130,000',
    company_url: 'https://productco.com',
    country_code: 'US',
    title_id: 'product-manager',
    num_applicants: 42,
    industries: 'Technology, Product Management',
    job_function: 'Product',
    salary_currency: 'USD',
    salary_min: 100000,
    salary_max: 130000,
    salary_period: 'yearly',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Function to fetch recent job listings (last 24 hours)
export async function fetchRecentJobListings(): Promise<SupabaseJobListing[]> {
  try {
    // If no Supabase credentials, return mock data
    if (!hasCredentials || !supabase) {
      console.log('Using mock data for recent job listings');
      return mockRecentJobs;
    }
    
    console.log('Fetching recent job listings from Supabase...');
    
    // Calculate date 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    // Format date for Supabase query
    const formattedDate = twentyFourHoursAgo.toISOString();
    console.log(`Filtering jobs posted after: ${formattedDate}`);
    
    // Query Supabase for job listings posted in the last 24 hours
    const { data, error } = await supabase
      .from('job_listings')
      .select('*')
      .gte('job_posted_date', formattedDate);
    
    if (error) {
      console.error('Error fetching recent job listings:', error);
      return mockRecentJobs; // Fall back to mock data on error
    }
    
    console.log(`Successfully fetched ${data?.length || 0} job listings from Supabase`);
    return data || mockRecentJobs;
  } catch (error) {
    console.error('Exception when fetching recent job listings:', error);
    return mockRecentJobs; // Fall back to mock data on error
  }
}

// Function to map Supabase job listings to the application's job data format
export function mapSupabaseJobsToAppFormat(supabaseJobs: SupabaseJobListing[]) {
  return supabaseJobs.map(job => ({
    id: job.job_posting_id,
    title: job.job_title || 'Untitled',
    company: job.company_name || 'Unknown',
    status: 'NEW', // Default status for newly imported jobs
    appliedDate: job.job_posted_date || new Date().toISOString(),
    location: job.job_location || '',
    salary: job.salary_min && job.salary_max ? 
      `${job.salary_min}-${job.salary_max} ${job.salary_currency || ''}`.trim() : 
      job.job_base_pay_range || '',
    summary: job.job_summary || '',
    url: job.url || job.apply_link || '',
    lastSync: new Date().toISOString(),
  }));
} 
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileUser, Mail } from 'lucide-react';
import StatusTracker from '../components/StatusTracker';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
  description?: string;
  summary?: string;
  jobType?: string;
  source?: string;
  url?: string;
  requirements?: string[];
  benefits?: string[];
}



// Helper function to format job summary text for better readability
const formatJobSummary = (text: string): string[] => {
  if (!text) return [];
  
  // Clean up scraped text artifacts
  const cleanedText = text
    .replace(/\s*Show more Show less\s*$/i, '') // Remove trailing "Show more Show less"
    .replace(/\s*JR\d+\s*Show more Show less\s*$/i, '') // Remove job reference + "Show more Show less"
    .trim();
  
  // Split on common sentence endings followed by capital letters (new sentences)
  // Also split on patterns that indicate new sections like "What You'll Be Doing"
  const sentences = cleanedText
    .replace(/\.\s+([A-Z])/g, '.|$1') // Mark sentence boundaries
    .replace(/(What You'll Be Doing|What We Need To See|Ways To Stand Out)/g, '|$1') // Mark section headers
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const paragraphs: string[] = [];
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    // If it's a section header, start a new paragraph
    if (sentence.match(/^(What You'll Be Doing|What We Need To See|Ways To Stand Out)/)) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      paragraphs.push(sentence);
    } else {
      // Add to current paragraph, but break if it gets too long
      if (currentParagraph.length > 300 && sentence.endsWith('.')) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + sentence;
      }
    }
  }
  
  // Add the last paragraph
  if (currentParagraph) {
    paragraphs.push(currentParagraph.trim());
  }
  
  return paragraphs.filter(p => p.length > 0);
};

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);
  const isLoading = !jobs;



  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Loading job details...</div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">{job.company}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex gap-2">
              <Link 
                to={`/resume/${job.id}`} 
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 gap-1.5"
              >
                <FileUser className="w-3.5 h-3.5" />
                Resume
              </Link>
              <Link 
                to={`/email/${job.id}`} 
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </Link>
            </div>
            <StatusTracker 
              jobId={job.id} 
              currentStatus={job.status} 
              showLabel={false}
              className="flex-shrink-0"
            />
          </div>
        </div>

        {job.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
              {formatJobSummary(job.summary).map((paragraph, index) => {
                // Check if this paragraph is a section header
                const isHeader = paragraph.match(/^(What You'll Be Doing|What We Need To See|Ways To Stand Out)/);
                
                if (isHeader) {
                  return (
                    <h3 
                      key={index} 
                      className="text-md font-semibold text-gray-900 dark:text-white mt-6 mb-2"
                    >
                      {paragraph}
                    </h3>
                  );
                } else {
                  return (
                    <p 
                      key={index} 
                      className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  );
                }
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</p>
            <p className="text-gray-900 dark:text-white">{job.location}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Applied Date</p>
            <p className="text-gray-900 dark:text-white">
              {new Date(job.appliedDate).toLocaleDateString()}
            </p>
          </div>
          {job.salary && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Salary Range</p>
              <p className="text-gray-900 dark:text-white">{job.salary}</p>
            </div>
          )}
          {job.jobType && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Job Type</p>
              <p className="text-gray-900 dark:text-white">{job.jobType}</p>
            </div>
          )}
          {job.source && (
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Source</p>
              <p className="text-gray-900 dark:text-white">{job.source}</p>
            </div>
          )}
        </div>

        {job.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Requirements</h2>
            <ul className="list-disc list-inside space-y-1">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Benefits</h2>
            <ul className="list-disc list-inside space-y-1">
              {job.benefits.map((benefit, index) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        {job.url && (
          <div className="mt-4">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Original Job Posting →
            </a>
          </div>
        )}
      </div>      
    </div>
  );
};

export default JobDetailPage; 
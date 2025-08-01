import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clipboard, RefreshCcw, Send, ArrowLeft } from 'lucide-react';
import StatusTracker from '../components/StatusTracker';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
  summary?: string;
}

const EmailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch all jobs once regardless so hook order stays consistent
  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);

  // Generate cold email when job/id available (hook must be unconditional)
  const {
    data: emailText,
    isFetching: isGenerating,
    refetch: regenerateEmail,
  } = useQuery(
    ['cold-email', id],
    () => window.api.generateColdEmail(id!),
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
    }
  );

  // Show drafts view when /email has no specific id (after hooks)
  if (!id) {
    const drafts = [
      { id: 'e1', title: 'Cold Email Template v1' },
      { id: 'e2', title: 'Follow-up Email Template' },
    ];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Email Drafts</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((d) => (
            <div key={d.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <p className="text-gray-900 dark:text-white font-medium">{d.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!emailText) return;
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 dark:text-gray-400">Loading job data...</p>
      </div>
    );
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    `Application for ${job.title} – ${job.company}`
  )}&body=${encodeURIComponent(emailText || '')}`;

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link 
          to={`/job/${job.id}`}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Job
        </Link>
      </div>

      {/* Job Card */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded shadow flex flex-col gap-1 max-w-xl">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h2>
            <p className="text-gray-700 dark:text-gray-300">{job.company}</p>
          </div>
          <StatusTracker 
            jobId={job.id} 
            currentStatus={job.status} 
            showLabel={false}
            className="flex-shrink-0"
          />
        </div>
        {job.location && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">{job.location}</p>
        )}
        {job.salary && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Salary: {job.salary}</p>
        )}
        {job.summary && (
          <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line">
            {job.summary}
          </p>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Applied on: {new Date(job.appliedDate).toLocaleDateString()}
        </p>
      </div>

      {/* Email Preview */}
      <div className="flex flex-col gap-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cold Email Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => regenerateEmail()}
              className="btn btn-secondary flex items-center gap-1 disabled:opacity-50"
              disabled={isGenerating}
            >
              <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
            <button
              onClick={handleCopy}
              className="btn btn-secondary flex items-center gap-1"
            >
              <Clipboard className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
              <button className="btn btn-primary flex items-center gap-1">
                <Send className="w-4 h-4" /> Send via Email
              </button>
            </a>
          </div>
        </div>
        <textarea
          readOnly
          value={isGenerating && !emailText ? 'Generating email…' : emailText || ''}
          className="w-full min-h-[300px] p-4 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-mono"
        />
      </div>
    </div>
  );
};

export default EmailPage; 
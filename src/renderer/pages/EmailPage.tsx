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
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Email Drafts</h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((d) => (
            <div key={d.id} className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <p className="text-gray-900 font-medium">{d.title}</p>
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
        <p className="text-gray-600">Loading job data...</p>
      </div>
    );
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(
    `Application for ${job.title} – ${job.company}`
  )}&body=${encodeURIComponent(emailText || '')}`;

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Link
          to={`/job/${job.id}`}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150 gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Job
        </Link>
      </div>

      {/* Header with job info */}
      <header className="bg-white rounded-lg p-4 shadow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{job.title}</h2>
            <p className="text-lg text-gray-600">{job.company}</p>
          </div>
          <StatusTracker
            jobId={job.id}
            currentStatus={job.status}
            showLabel={false}
            className="flex-shrink-0"
          />
        </div>

      </header>

      {/* Main content area */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Email Preview Panel */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Cold Email Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => regenerateEmail()}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150 gap-1.5 disabled:opacity-50"
                disabled={isGenerating}
              >
                <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150 gap-1.5"
              >
                <Clipboard className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
                <button className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-150 gap-1.5">
                  <Send className="w-4 h-4" /> Send via Email
                </button>
              </a>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <textarea
              readOnly
              value={isGenerating && !emailText ? 'Generating email…' : emailText || ''}
              className="w-full h-full p-4 border border-gray-300 rounded bg-gray-50 text-gray-800 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPage;

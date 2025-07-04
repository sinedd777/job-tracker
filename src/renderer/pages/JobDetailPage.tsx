import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

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

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);
  const isLoading = !jobs;

  const { data: notes = [] } = useQuery<Note[]>(['notes', id], () =>
    window.api.getNotes(id!)
  );

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
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              job.status === 'APPLIED'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : job.status === 'INTERVIEWING'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : job.status === 'OFFERED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {job.status}
          </span>
        </div>

        {job.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300">{job.summary}</p>
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
        <div className="space-y-4">
          {notes.map((note: Note) => (
            <div key={note.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <p className="text-gray-900 dark:text-white">{note.content}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage; 
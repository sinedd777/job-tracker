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
}

const ResumePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);

  if (!id) {
    // Show drafts grid placeholder
    const drafts = [
      { id: 'd1', title: 'General Software Engineer Resume' },
      { id: 'd2', title: 'Frontend Specialist Resume' },
    ];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Resume Drafts</h1>
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

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 dark:text-gray-400">Loading job...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>Resume for:</span> {job.title}
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400">Company: {job.company}</p>
      <p className="text-gray-700 dark:text-gray-300">Location: {job.location}</p>
      <p className="text-gray-700 dark:text-gray-300">Applied: {new Date(job.appliedDate).toLocaleDateString()}</p>
      {/* Placeholder for resume-specific content */}
      <div className="p-6 rounded bg-white dark:bg-gray-800 shadow">
        <p className="text-gray-500 dark:text-gray-400">Resume building tools coming soon...</p>
      </div>
    </div>
  );
};

export default ResumePage; 
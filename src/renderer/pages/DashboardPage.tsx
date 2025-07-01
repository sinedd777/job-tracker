import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
}

const DashboardPage: React.FC = () => {
  const { data: jobs, isLoading, error } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600 dark:text-red-400">Error loading jobs</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.map((job: Job) => (
          <Link
            key={job.id}
            to={`/job/${job.id}`}
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h2>
                <p className="text-gray-600 dark:text-gray-400">{job.company}</p>
              </div>
              <span
                className={`px-2 py-1 text-sm rounded ${
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
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">{job.location}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Applied: {new Date(job.appliedDate).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage; 
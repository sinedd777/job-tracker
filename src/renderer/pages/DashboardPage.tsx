import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCcw, FileUser, Mail } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
}

const STATUSES = ['APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED'] as const;

const TRACKER_STEPS = ['APPLIED', 'INTERVIEWING', 'OFFERED'] as const;

interface ProcessTrackerProps {
  status: string;
}

const ProcessTracker: React.FC<ProcessTrackerProps> = ({ status }) => {
  const currentIdx = TRACKER_STEPS.indexOf(status as any);
  const isRejected = status === 'REJECTED';
  const highlightUntil = isRejected ? TRACKER_STEPS.length - 1 : currentIdx;

  return (
    <div className="flex items-center gap-0.5">
      {TRACKER_STEPS.map((step, idx) => (
        <React.Fragment key={step}>
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              idx <= highlightUntil
                ? isRejected
                  ? 'bg-red-500 dark:bg-red-400'
                  : 'bg-blue-500 dark:bg-blue-400'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
          {idx < TRACKER_STEPS.length - 1 && (
            <div
              className={`w-4 h-0.5 transition-colors duration-200 ${
                idx < highlightUntil
                  ? isRejected
                    ? 'bg-red-500 dark:bg-red-400'
                    : 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: jobs, isLoading, error, refetch, isFetching } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());

  const updateStatusMutation = useMutation(
    ({ jobId, status }: { jobId: string; status: string }) =>
      window.api.updateJob(jobId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['jobs']);
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <RefreshCcw className="w-5 h-5 animate-spin" />
          <span>Loading jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          Error loading jobs
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Job Applications
        </h1>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 gap-1.5 disabled:opacity-50"
          disabled={isFetching}
          title="Sync jobs"
        >
          <RefreshCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Process</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Status</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobs?.map((job) => (
                <tr key={job.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <Link 
                      to={`/job/${job.id}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-150"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                    {job.company}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {job.location}
                  </td>
                  <td className="px-2 py-1.5">
                    <ProcessTracker status={job.status} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow duration-150"
                      value={job.status}
                      onChange={(e) =>
                        updateStatusMutation.mutate({ jobId: job.id, status: e.target.value })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="text-xs">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Link 
                        to={`/resume/${job.id}`} 
                        title="Resume Details" 
                        className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150"
                      >
                        <FileUser className="w-3.5 h-3.5" />
                      </Link>
                      <Link 
                        to={`/email/${job.id}`} 
                        title="Email Details" 
                        className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 
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
    <div className="flex items-center gap-1">
      {TRACKER_STEPS.map((step, idx) => (
        <React.Fragment key={step}>
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              idx <= highlightUntil
                ? isRejected
                  ? 'bg-red-600 dark:bg-red-400'
                  : 'bg-blue-600 dark:bg-blue-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
          {idx < TRACKER_STEPS.length - 1 && (
            <div
              className={`w-6 h-0.5 ${
                idx < highlightUntil
                  ? isRejected
                    ? 'bg-red-600 dark:bg-red-400'
                    : 'bg-blue-600 dark:bg-blue-400'
                  : 'bg-gray-300 dark:bg-gray-600'
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
        <button
          onClick={() => refetch()}
          className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
          disabled={isFetching}
          title="Sync jobs"
        >
          <RefreshCcw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Process</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {jobs?.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                  <Link to={`/job/${job.id}`}>{job.title}</Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {job.company}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {job.location}
                </td>
                <td className="px-4 py-3">
                  <ProcessTracker status={job.status} />
                </td>
                <td className="px-4 py-3">
                  <select
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
                    value={job.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ jobId: job.id, status: e.target.value })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <Link to={`/resume/${job.id}`} title="Resume Details" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                    <FileUser className="w-5 h-5" />
                  </Link>
                  <Link to={`/mail/${job.id}`} title="Email Details" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
                    <Mail className="w-5 h-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage; 
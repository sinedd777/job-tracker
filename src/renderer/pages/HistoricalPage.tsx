import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCcw, FileUser, Mail } from 'lucide-react';
import { DataTable, type ColumnDef } from '../components/DataTable';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  url?: string;
}

const STATUSES = ['APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'NEW'] as const;

const TRACKER_STEPS = ['APPLIED', 'INTERVIEWING', 'OFFERED'] as const;

interface ProcessTrackerProps {
  status: string;
}

const ProcessTracker: React.FC<ProcessTrackerProps> = ({ status }) => {
  const currentIdx = TRACKER_STEPS.indexOf(status as any);
  const isRejected = status === 'REJECTED';
  const isNew = status === 'NEW';
  const highlightUntil = isRejected ? TRACKER_STEPS.length - 1 : currentIdx;

  if (isNew) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-green-500 dark:text-green-400 font-medium">New</span>
      </div>
    );
  }

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

const HistoricalPage: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Query for historical jobs (all non-NEW status jobs)
  const { 
    data: historicalJobs, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery<Job[]>(
    ['historicalJobs'], 
    () => window.api.getHistoricalJobs(),
  );

  const updateStatusMutation = useMutation(
    ({ jobId, status }: { jobId: string; status: string }) =>
      window.api.updateJob(jobId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['jobs']);
        queryClient.invalidateQueries(['recentJobs']);
        queryClient.invalidateQueries(['historicalJobs']);
      },
    }
  );

  const handleRefresh = () => {
    refetch();
  };

  const columns = useMemo<ColumnDef<Job>[]>(() => [
    {
      id: 'title',
      header: 'Title',
      accessorKey: 'title',
      cell: ({ row }) => (
        <div className="flex items-center max-w-[400px]">
          <Link 
            to={`/job/${row.original.id}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-150 truncate"
            title={row.original.title}
          >
            {row.original.title}
          </Link>
          {row.original.url && (
            <a 
              href={row.original.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              title="Open job posting"
            >
              (link)
            </a>
          )}
        </div>
      ),
    },
    {
      id: 'company',
      header: 'Company',
      accessorKey: 'company',
      filterFn: 'array',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 dark:text-white max-w-[100px] truncate">
          {getValue() as string}
        </div>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      accessorKey: 'location',
      filterFn: 'array',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate">
          {getValue() as string}
        </div>
      ),
    },
    {
      id: 'process',
      header: 'Process',
      accessorKey: 'status',
      enableGlobalFilter: false,
      cell: ({ getValue }) => <ProcessTracker status={getValue() as string} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      filterFn: 'array',
      cell: ({ row }) => (
        <select
          className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow duration-150"
          value={row.original.status}
          onChange={(e) =>
            updateStatusMutation.mutate({ jobId: row.original.id, status: e.target.value })
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="text-xs">
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link 
            to={`/resume/${row.original.id}`} 
            title="Resume Details" 
            className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150"
          >
            <FileUser className="w-3.5 h-3.5" />
          </Link>
          <Link 
            to={`/email/${row.original.id}`} 
            title="Email Details" 
            className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-150"
          >
            <Mail className="w-3.5 h-3.5" />
          </Link>
        </div>
      ),
    },
  ], [updateStatusMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          <RefreshCcw className="w-5 h-5 animate-spin" />
          <span>Loading historical jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          Error loading historical jobs
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Historical Applications
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 gap-1.5 disabled:opacity-50"
            disabled={isFetching}
            title="Refresh historical jobs"
          >
            <RefreshCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <DataTable
        data={historicalJobs || []}
        columns={columns}
        itemsPerPage={10}
      />
    </div>
  );
};

export default HistoricalPage; 
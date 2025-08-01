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
        <span className="text-xs text-green-500 font-medium">New</span>
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
                  ? 'bg-red-500'
                  : 'bg-blue-500'
                : 'bg-gray-200'
            }`}
          />
          {idx < TRACKER_STEPS.length - 1 && (
            <div
              className={`w-4 h-0.5 transition-colors duration-200 ${
                idx < highlightUntil
                  ? isRejected
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                  : 'bg-gray-200'
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
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150 truncate"
            title={row.original.title}
          >
            {row.original.title}
          </Link>
          {row.original.url && (
            <a 
              href={row.original.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
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
        <div className="whitespace-nowrap text-xs text-gray-900 max-w-[100px] truncate">
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
        <div className="whitespace-nowrap text-xs text-gray-500 max-w-[100px] truncate">
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
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white/80 text-gray-900 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-150 hover:bg-white/90"
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
            className="text-gray-400 hover:text-blue-500 transition-colors duration-150"
          >
            <FileUser className="w-3.5 h-3.5" />
          </Link>
          <Link 
            to={`/email/${row.original.id}`} 
            title="Email Details" 
            className="text-gray-400 hover:text-blue-500 transition-colors duration-150"
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
        <div className="flex items-center space-x-2 text-gray-600">
          <RefreshCcw className="w-5 h-5 animate-spin" />
          <span>Loading historical jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg">
          Error loading historical jobs
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Historical Applications
          </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn-glass text-xs px-3 py-1.5 disabled:opacity-50"
            disabled={isFetching}
            title="Refresh historical jobs"
          >
            <RefreshCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        </div>
      </header>

      <div className="space-y-4">
        <DataTable
        data={historicalJobs || []}
        columns={columns}
        itemsPerPage={10}
        />
      </div>
    </div>
  );
};

export default HistoricalPage; 
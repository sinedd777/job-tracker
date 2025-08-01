import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { RefreshCcw, FileUser, Mail, Clock } from 'lucide-react';
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

const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  
  // Query for new jobs (only NEW status)
  const { 
    data: allNewJobs, 
    isLoading: isLoadingAll, 
    error: errorAll, 
    refetch: refetchAll,
    isFetching: isFetchingAll 
  } = useQuery<Job[]>(
    ['newJobs'], 
    () => window.api.getNewJobs(),
    { enabled: !showRecentOnly }
  );
  
  // Query for recent new jobs (last 24 hours with NEW status)
  const { 
    data: recentNewJobs, 
    isLoading: isLoadingRecent, 
    error: errorRecent, 
    refetch: refetchRecent,
    isFetching: isFetchingRecent 
  } = useQuery<Job[]>(
    ['recentNewJobs'], 
    () => window.api.getRecentNewJobs(),
    { enabled: showRecentOnly }
  );
  
  // Determine which data set to use based on toggle
  const jobs = showRecentOnly ? recentNewJobs : allNewJobs;
  const isLoading = showRecentOnly ? isLoadingRecent : isLoadingAll;
  const error = showRecentOnly ? errorRecent : errorAll;
  const isFetching = showRecentOnly ? isFetchingRecent : isFetchingAll;

  // Sync jobs from Supabase
  const syncSupabaseMutation = useMutation(
    () => window.api.syncRecentJobsFromSupabase(),
    {
      onSuccess: () => {
        // Invalidate both queries to refresh the data
        queryClient.invalidateQueries(['newJobs']);
        queryClient.invalidateQueries(['recentNewJobs']);
        queryClient.invalidateQueries(['historicalJobs']);
      },
    }
  );

  const updateStatusMutation = useMutation(
    ({ jobId, status }: { jobId: string; status: string }) =>
      window.api.updateJob(jobId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['newJobs']);
        queryClient.invalidateQueries(['recentNewJobs']);
        queryClient.invalidateQueries(['historicalJobs']);
      },
    }
  );

  const handleRefresh = () => {
    if (showRecentOnly) {
      syncSupabaseMutation.mutate();
      refetchRecent();
    } else {
      refetchAll();
    }
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
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-shadow duration-150"
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
          <span>Loading jobs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">
          Error loading jobs
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            New Job Postings
          </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRecentOnly(!showRecentOnly)}
            className={`inline-flex items-center px-2 py-1 text-xs rounded border shadow-sm hover:bg-gray-50 transition-colors duration-150 gap-1.5 ${
              showRecentOnly 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-white border-gray-200 text-gray-600'
            }`}
            title={showRecentOnly ? "Showing recent jobs only" : "Show all jobs"}
          >
            <Clock className="w-3 h-3" />
            <span>Recent (24h)</span>
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-2 py-1 text-xs rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-150 gap-1.5 disabled:opacity-50"
            disabled={isFetching || syncSupabaseMutation.isLoading}
            title={showRecentOnly ? "Sync recent jobs from Supabase" : "Sync jobs"}
          >
            <RefreshCcw className={`w-3 h-3 ${isFetching || syncSupabaseMutation.isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
        </div>
      </header>

      <div className="space-y-4">
        <DataTable
        data={jobs || []}
        columns={columns}
        itemsPerPage={10}
        enabledFilters={['company', 'location']}
        />
      </div>
    </div>
  );
};

export default DashboardPage; 
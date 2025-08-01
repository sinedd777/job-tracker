import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';

const STATUSES = ['NEW', 'APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED'] as const;

interface StatusTrackerProps {
  jobId: string;
  currentStatus: string;
  className?: string;
  showLabel?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NEW':
      return 'bg-gray-100 text-gray-800';
    case 'APPLIED':
      return 'bg-blue-100 text-blue-800';
    case 'INTERVIEWING':
      return 'bg-yellow-100 text-yellow-800';
    case 'OFFERED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const StatusTracker: React.FC<StatusTrackerProps> = ({ 
  jobId, 
  currentStatus, 
  className = '',
  showLabel = true 
}) => {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation(
    ({ jobId, status }: { jobId: string; status: string }) =>
      window.api.updateJob(jobId, { status }),
    {
      onSuccess: () => {
        // Invalidate all job-related queries to ensure UI updates
        queryClient.invalidateQueries(['jobs']);
        queryClient.invalidateQueries(['newJobs']);
        queryClient.invalidateQueries(['recentNewJobs']);
        queryClient.invalidateQueries(['historicalJobs']);
      },
    }
  );

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== currentStatus) {
      updateStatusMutation.mutate({ jobId, status: newStatus });
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">
          Status:
        </span>
      )}
      
      <div className="relative">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updateStatusMutation.isLoading}
          className={`
            appearance-none cursor-pointer px-3 py-1.5 pr-7 text-xs font-medium rounded-full
            border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200 hover:shadow-sm
            ${getStatusColor(currentStatus)}
            ${updateStatusMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-500" />
      </div>

      {updateStatusMutation.isLoading && (
        <div className="flex items-center text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-gray-600 mr-1"></div>
          Updating...
        </div>
      )}
    </div>
  );
};

export default StatusTracker;
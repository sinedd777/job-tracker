import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SimpleTable, type Column } from '../components/SimpleTable';

interface ResumeFile {
  jobId: string;
  fileName: string;
  modifiedTime: string | Date;
}

interface ResumeRow extends ResumeFile {
  title: string;
  company: string;
  modified: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
  url?: string;
}

const ResumesListPage: React.FC = () => {
  // Fetch list of resume files that have been generated
  const {
    data: resumeFiles,
    isLoading: isLoadingResumes,
    error: resumesError,
  } = useQuery<ResumeFile[], Error>(['resume-files'], () => window.api.listResumes());

  // Fetch jobs to map jobId → job details for nicer display
  const {
    data: jobs,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<Job[], Error>(['jobs'], () => window.api.getJobs());

  const rows = React.useMemo((): ResumeRow[] => {
    if (!resumeFiles) return [];
    return resumeFiles.map((file) => {
      const job = jobs?.find((j) => j.id === file.jobId);
      return {
        ...file,
        title: job?.title || 'Unknown role',
        company: job?.company || 'Unknown company',
        modified: new Date(file.modifiedTime).toLocaleString(),
      };
    });
  }, [resumeFiles, jobs]);

  const columns: Column<ResumeRow>[] = [
    {
      key: 'title',
      header: 'Role',
      render: (row) => (
        <Link
          to={`/resume/${row.jobId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      className: 'text-gray-700',
    },
    {
      key: 'modified',
      header: 'Last Modified',
      className: 'text-gray-600',
    },
  ];

  if (isLoadingResumes || isLoadingJobs) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-600">
          <p>Loading resumes…</p>
        </div>
      </div>
    );
  }

  if (resumesError || jobsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg">
          Error: {(resumesError || jobsError)?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Generated Resumes</h1>
        <p className="text-sm text-gray-600">
          A list of all resumes you have generated. Click on a resume to open and edit it.
        </p>
      </header>

      <div className="space-y-4">
        <SimpleTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.jobId}
        emptyMessage="You haven't generated any resumes yet."
        />
      </div>
    </div>
  );
};

export default ResumesListPage;

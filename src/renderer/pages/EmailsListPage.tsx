import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SimpleTable, type Column } from '../components/SimpleTable';

interface EmailFile {
  jobId: string;
  fileName: string;
  modifiedTime: string | Date;
}

interface EmailRow extends EmailFile {
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

const EmailsListPage: React.FC = () => {
  // Fetch list of email drafts that have been generated
  const {
    data: emailFiles,
    isLoading: isLoadingEmails,
    error: emailsError,
  } = useQuery<EmailFile[], Error>(['email-files'], () => window.api.listEmails());

  // Fetch jobs to map jobId → job details
  const {
    data: jobs,
    isLoading: isLoadingJobs,
    error: jobsError,
  } = useQuery<Job[], Error>(['jobs'], () => window.api.getJobs());

  const rows = React.useMemo((): EmailRow[] => {
    if (!emailFiles) return [];
    return emailFiles.map((file) => {
      const job = jobs?.find((j) => j.id === file.jobId);
      return {
        ...file,
        title: job?.title || 'Unknown role',
        company: job?.company || 'Unknown company',
        modified: new Date(file.modifiedTime).toLocaleString(),
      };
    });
  }, [emailFiles, jobs]);

  const columns: Column<EmailRow>[] = [
    {
      key: 'title',
      header: 'Role',
      render: (row) => (
        <Link
          to={`/email/${row.jobId}`}
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

  if (isLoadingEmails || isLoadingJobs) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-600">
          <p>Loading cold emails…</p>
        </div>
      </div>
    );
  }

  if (emailsError || jobsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 text-red-500 px-4 py-2 rounded-lg">
          Error: {(emailsError || jobsError)?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Generated Cold Emails</h1>
        <p className="text-sm text-gray-600">
          All cold email drafts generated for your job applications.
        </p>
      </header>

      <div className="space-y-4">
        <SimpleTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.jobId}
        emptyMessage="You haven't generated any cold emails yet."
        />
      </div>
    </div>
  );
};

export default EmailsListPage;

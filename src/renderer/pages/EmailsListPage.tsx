import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface EmailFile {
  jobId: string;
  fileName: string;
  modifiedTime: string | Date;
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

  const rows = React.useMemo(() => {
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

  if (isLoadingEmails || isLoadingJobs) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-600 dark:text-gray-400">Loading cold emails…</p>
      </div>
    );
  }

  if (emailsError || jobsError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          Error: {(emailsError || jobsError)?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generated Cold Emails</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          All cold email drafts generated for your job applications.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">You haven&apos;t generated any cold emails yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Company</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row) => (
                <tr
                  key={row.jobId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      to={`/email/${row.jobId}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.company}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.modified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmailsListPage;

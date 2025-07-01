import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface Communication {
  id: string;
  type: string;
  content: string;
  date: string;
  contact?: string;
}

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);
  const isLoading = !jobs;

  const { data: notes = [] } = useQuery<Note[]>(['notes', id], () =>
    window.api.getNotes(id!)
  );

  const { data: reminders = [] } = useQuery<Reminder[]>(['reminders', id], () =>
    window.api.getReminders(id!)
  );

  const { data: communications = [] } = useQuery<Communication[]>(['communications', id], () =>
    window.api.getCommunications(id!)
  );

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Loading job details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">{job.company}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm rounded-full ${
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
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
            <p className="text-gray-900 dark:text-white">{job.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Applied Date</p>
            <p className="text-gray-900 dark:text-white">
              {new Date(job.appliedDate).toLocaleDateString()}
            </p>
          </div>
          {job.salary && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Salary</p>
              <p className="text-gray-900 dark:text-white">{job.salary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
        <div className="space-y-4">
          {notes.map((note: Note) => (
            <div key={note.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <p className="text-gray-900 dark:text-white">{note.content}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reminders Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Reminders</h2>
        <div className="space-y-4">
          {reminders.map((reminder: Reminder) => (
            <div
              key={reminder.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                reminder.completed
                  ? 'bg-gray-50 dark:bg-gray-700'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div>
                <p className="text-gray-900 dark:text-white">{reminder.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Due: {new Date(reminder.dueDate).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-sm rounded ${
                  reminder.completed
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}
              >
                {reminder.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Communications Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Communications</h2>
        <div className="space-y-4">
          {communications.map((comm: Communication) => (
            <div key={comm.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-900 dark:text-white">{comm.content}</p>
                  {comm.contact && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Contact: {comm.contact}
                    </p>
                  )}
                </div>
                <span
                  className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                >
                  {comm.type}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {new Date(comm.date).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage; 
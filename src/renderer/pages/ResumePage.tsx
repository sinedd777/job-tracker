import React, { useEffect, useState, useMemo } from 'react';
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

const generateSuggestions = (job?: Job): string[] => {
  if (!job) return [];
  const suggestions: string[] = [];
  if (job.title) {
    suggestions.push(`Emphasize experience relevant to "${job.title}" roles.`);
  }
  if (job.company) {
    suggestions.push(`Mention why you're excited about ${job.company} and how your background aligns with its mission.`);
  }
  suggestions.push('Use quantifiable achievements (e.g., "improved performance by 25%").');
  suggestions.push('Incorporate ATS-friendly keywords pulled from the job description.');
  return suggestions;
};

const injectJobContent = (template: string, job: Job): string => {
  const injection = `\\section*{Target Role}\n\\textbf{${job.title}}, ${job.company}\\\\\n\\vspace{10pt}\n`;
  return template.replace('\\begin{document}', `\\begin{document}\n\n% Job specific content\n${injection}`);
};

const ResumePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch all jobs and find one by id (reuse existing API)
  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);

  // Load resume template
  const { data: baseTemplate } = useQuery(['resume-template'], () => window.api.readResumeTemplate());

  const [latexContent, setLatexContent] = useState<string>('');

  // Build personalized template once data is available
  useEffect(() => {
    if (baseTemplate && job) {
      setLatexContent(injectJobContent(baseTemplate, job));
    }
  }, [baseTemplate, job]);

  const suggestions = useMemo(() => generateSuggestions(job), [job]);

  const handleOpenOverleaf = () => {
    if (!id) return;
    window.api.saveAndOpenResume(id, latexContent);
  };

  // Drafts view when /resume has no id
  if (!id) {
    const drafts = [
      { id: 'd1', title: 'General Software Engineer Resume' },
      { id: 'd2', title: 'Frontend Specialist Resume' },
    ];

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Resume Drafts</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((d) => (
            <div key={d.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <p className="text-gray-900 dark:text-white font-medium">{d.title}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!job || !baseTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resume for: {job.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">Company: {job.company}</p>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Code editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <textarea
            className="flex-1 w-full border dark:border-gray-700 rounded p-2 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
            value={latexContent}
            onChange={(e) => setLatexContent(e.target.value)}
          />
          <button
            onClick={handleOpenOverleaf}
            className="mt-3 self-start px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
          >
            Open on Overleaf
          </button>
        </div>

        {/* Suggestions */}
        <aside className="w-1/3 bg-gray-50 dark:bg-gray-800 rounded p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">AI Suggestions</h2>
          {suggestions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No suggestions available.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {suggestions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ResumePage; 
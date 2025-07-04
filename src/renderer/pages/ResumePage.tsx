import React, { useEffect, useState } from 'react';
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
  url?: string;
}

interface ResumeImprovementResponse {
  suggestions: string[];
  relevantProjects: string[];
  skillsToHighlight: string[];
  experienceToHighlight: string[];
}

interface SuggestionItem {
  suggestion: string;
  context: string;
}

const injectJobContent = (template: string, job: Job): string => {
  const injection = `\\section*{Target Role}\n\\textbf{${job.title}}, ${job.company}\\\\\n\\vspace{10pt}\n`;
  return template.replace('\\begin{document}', `\\begin{document}\n\n% Job specific content\n${injection}`);
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h2 className="text-red-700 dark:text-red-300 font-medium">Something went wrong</h2>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Suggestions Component
const SuggestionsPanel: React.FC<{
  isLoading: boolean;
  error: Error | null;
  data: ResumeImprovementResponse | undefined;
}> = ({ isLoading, error, data }) => {
  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400">Generating suggestions...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
        Error: {error.message}
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500 dark:text-gray-400">No suggestions available.</p>;
  }

  // Parse suggestions and ensure they're in the correct format
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map(suggestion => {
        if (typeof suggestion === 'object' && suggestion !== null) {
          try {
            // Handle case where suggestion is already an object
            if ('suggestion' in suggestion && 'context' in suggestion) {
              return suggestion as SuggestionItem;
            }
            // Handle case where suggestion is a stringified object
            const parsed = typeof suggestion === 'string' 
              ? JSON.parse(suggestion) 
              : suggestion;
            return parsed as SuggestionItem;
          } catch (e) {
            return { suggestion: String(suggestion), context: '' };
          }
        }
        return { suggestion: String(suggestion), context: '' };
      })
    : [];

  // Handle other arrays normally
  const relevantProjects = Array.isArray(data.relevantProjects)
    ? data.relevantProjects.map(project => String(project))
    : [];
  const skillsToHighlight = Array.isArray(data.skillsToHighlight)
    ? data.skillsToHighlight.map(skill => String(skill))
    : [];
  const experienceToHighlight = Array.isArray(data.experienceToHighlight)
    ? data.experienceToHighlight.map(exp => String(exp))
    : [];

  return (
    <div className="space-y-6">
      {suggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Improvements</h3>
          <ul className="list-none space-y-4">
            {suggestions.map((item, idx) => (
              <li key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <p className="text-gray-800 dark:text-gray-200 mb-2">
                  {item.suggestion}
                </p>
                {item.context && (
                  <div className="mt-2 text-xs">
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Based on: {item.context}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {relevantProjects.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Relevant Projects</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {relevantProjects.map((project, idx) => (
              <li key={idx} className="whitespace-pre-wrap">{project}</li>
            ))}
          </ul>
        </div>
      )}

      {skillsToHighlight.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills to Highlight</h3>
          <div className="flex flex-wrap gap-2">
            {skillsToHighlight.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs whitespace-pre-wrap"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {experienceToHighlight.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Experience to Highlight</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {experienceToHighlight.map((exp, idx) => (
              <li key={idx} className="whitespace-pre-wrap">{exp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ResumePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [latexContent, setLatexContent] = useState<string>('');

  // Fetch job data with error handling
  const { 
    data: jobs,
    error: jobsError 
  } = useQuery<Job[], Error>(['jobs'], async () => {
    console.log('Fetching jobs...');
    try {
      const result = await window.api.getJobs();
      console.log('Jobs fetched:', result);
      return result;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }
  });
  
  const job = jobs?.find((j) => j.id === id);
  console.log('Current job:', job);

  // Load resume template with error handling
  const { 
    data: baseTemplate,
    error: templateError 
  } = useQuery<string, Error>(['resume-template'], async () => {
    try {
      const template = await window.api.readResumeTemplate();
      console.log('Template loaded, length:', template?.length);
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    }
  });

  // Build personalized template once data is available
  useEffect(() => {
    if (baseTemplate && job) {
      try {
        const content = injectJobContent(baseTemplate, job);
        console.log('Template injected with job content, length:', content.length);
        setLatexContent(content);
      } catch (error) {
        console.error('Error injecting job content:', error);
      }
    }
  }, [baseTemplate, job]);

  // RAG-powered suggestions with detailed logging
  const {
    data: improvementData,
    isLoading: isLoadingSuggestions,
    error: suggestionsError
  } = useQuery<ResumeImprovementResponse, Error>(
    ['resume-suggestions', id],
    async () => {
      console.log('Starting RAG suggestions query for job ID:', id);
      try {
        const result = await window.api.generateResumeSuggestions(id!);
        console.log('RAG suggestions result:', result);
        return result;
      } catch (error) {
        console.error('Error in RAG suggestions query:', error);
        throw error;
      }
    },
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const handleOpenOverleaf = () => {
    if (!id) return;
    try {
      window.api.saveAndOpenResume(id, latexContent);
    } catch (error) {
      console.error('Error opening in Overleaf:', error);
    }
  };

  if (jobsError || templateError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          Error: {(jobsError || templateError)?.message}
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
    <div className="flex flex-col h-full p-4 space-y-4">
      <ErrorBoundary>
        {/* Header with job info */}
        <header className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {job.title}
            {job.url && (
              <a 
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                (View Posting)
              </a>
            )}
          </h1>
          <div className="text-gray-600 dark:text-gray-300 space-y-1">
            <p className="font-medium">{job.company}</p>
            <p>{job.location}</p>
            {job.salary && <p>Salary: {job.salary}</p>}
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left side - LaTeX Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resume Editor</h2>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <textarea
                className="w-full h-full font-mono text-sm p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
                value={latexContent}
                onChange={(e) => setLatexContent(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleOpenOverleaf}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
              >
                Open in Overleaf
              </button>
            </div>
          </div>

          {/* Right side - Suggestions */}
          <div className="w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Suggestions</h2>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <ErrorBoundary>
                <SuggestionsPanel
                  isLoading={isLoadingSuggestions}
                  error={suggestionsError}
                  data={improvementData}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default ResumePage; 
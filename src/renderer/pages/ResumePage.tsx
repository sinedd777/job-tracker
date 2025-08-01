import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StatusTracker from '../components/StatusTracker';

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

interface ReplacementSuggestion {
  sectionName: string;          // e.g., "Experience", "Skills", "Projects"
  currentContent: string;       // What's currently in the resume that should be replaced
  suggestedContent: string;     // What to replace it with
  reason: string;              // Why this replacement is recommended
  lineNumbers?: string;        // Optional line numbers in the LaTeX file
}

interface ResumeImprovementResponse {
  replacements: ReplacementSuggestion[];
  suggestions: string[];       // Keep for backward compatibility
  relevantProjects: string[];
  skillsToHighlight: string[];
  experienceToHighlight: string[];
}

interface ExperienceItemRewriteResponse {
  experienceReplacements: ReplacementSuggestion[];
}

interface ProjectHighlightResponse {
  projectRecommendations: Array<{
    projectTitle: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedPlacement: string;
  }>;
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
        <div className="p-4 bg-red-50 rounded-lg">
          <h2 className="text-red-700 font-medium">Something went wrong</h2>
          <p className="text-red-600 text-sm mt-1">
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
  experienceRewriteData: ExperienceItemRewriteResponse | undefined;
  isLoadingExperienceRewrite: boolean;
  experienceRewriteError: Error | null;
  projectHighlightData: ProjectHighlightResponse | undefined;
  isLoadingProjectHighlight: boolean;
  projectHighlightError: Error | null;
  onApplyReplacement: (rep: ReplacementSuggestion) => void;
  hiddenReplacementKeys: Set<string>;
}> = ({ 
  isLoading, 
  error, 
  data,
  experienceRewriteData,
  isLoadingExperienceRewrite,
  experienceRewriteError,
  projectHighlightData,
  isLoadingProjectHighlight,
    projectHighlightError,
  onApplyReplacement,
  hiddenReplacementKeys
  }) => {
  if (isLoading) {
    return <p className="text-gray-500">Generating suggestions...</p>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 rounded-lg bg-red-50">
        Error: {error.message}
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">No suggestions available.</p>;
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

  // Extract and display replacement suggestions
  const replacements = Array.isArray(data.replacements) ? data.replacements : [];

  return (
    <div className="space-y-6">
      {/* O3-Powered Experience Rewriting */}
      {isLoadingExperienceRewrite && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🚀 O3 Experience Rewriting</h3>
          <p className="text-gray-500">Analyzing and rewriting experience bullets...</p>
        </div>
      )}
      
      {experienceRewriteError && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🚀 O3 Experience Rewriting</h3>
          <div className="text-red-500 p-4 rounded-lg bg-red-50">
            Error: {experienceRewriteError.message}
          </div>
        </div>
      )}

      {experienceRewriteData?.experienceReplacements && experienceRewriteData.experienceReplacements.filter(r=>!hiddenReplacementKeys.has(r.currentContent)).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🚀 O3 Experience Rewriting</h3>
          <div className="space-y-4">
            {experienceRewriteData.experienceReplacements.filter(r=>!hiddenReplacementKeys.has(r.currentContent)).map((replacement, idx) => (
              <div key={idx} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 shadow-sm border border-purple-200">
                <div className="mb-2">
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                    O3 Enhanced • {replacement.sectionName}
                  </span>
                  {replacement.lineNumbers && (
                    <span className="ml-2 text-xs text-gray-500">
                      {replacement.lineNumbers}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-400">
                    <p className="text-xs font-medium text-red-700 mb-1">REPLACE THIS:</p>
                    <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">
                      {replacement.currentContent}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                    <p className="text-xs font-medium text-green-700 mb-1">WITH THIS:</p>
                    <p className="text-sm text-green-800 font-mono whitespace-pre-wrap">
                      {replacement.suggestedContent}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50/20 p-3 rounded">
                    <p className="text-xs font-medium text-purple-700 mb-1">O3 REASONING:</p>
                    <p className="text-sm text-purple-800">
                      {replacement.reason}
                    </p>
                  </div>

                  {/* Apply button */}
                  <button
                    onClick={() => onApplyReplacement(replacement)}
                    className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow"
                  >
                    Apply Replacement
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* O3-Powered Project Highlighting */}
      {isLoadingProjectHighlight && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🎯 O3 Project Highlighting</h3>
          <p className="text-gray-500">Analyzing project portfolio relevance...</p>
        </div>
      )}
      
      {projectHighlightError && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🎯 O3 Project Highlighting</h3>
          <div className="text-red-500 p-4 rounded-lg bg-red-50">
            Error: {projectHighlightError.message}
          </div>
        </div>
      )}

      {projectHighlightData?.projectRecommendations && projectHighlightData.projectRecommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">🎯 O3 Project Highlighting</h3>
          <div className="space-y-4">
            {projectHighlightData.projectRecommendations.map((project, idx) => (
              <div key={idx} className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 shadow-sm border border-emerald-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                    O3 Recommended • {project.priority.toUpperCase()} Priority
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {project.projectTitle}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-emerald-50 p-3 rounded">
                    <p className="text-xs font-medium text-emerald-700 mb-1">WHY THIS PROJECT:</p>
                    <p className="text-sm text-emerald-800">
                      {project.reason}
                    </p>
                  </div>
                  
                  <div className="bg-teal-50 p-3 rounded">
                    <p className="text-xs font-medium text-teal-700 mb-1">SUGGESTED PLACEMENT:</p>
                    <p className="text-sm text-teal-800 font-medium">
                      {project.suggestedPlacement}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {false && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">💡 General Improvements</h3>
          <ul className="list-none space-y-4">
            {suggestions.map((item, idx) => (
              <li key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <p className="text-gray-800 mb-2">
                  {item.suggestion}
                </p>
                {item.context && (
                  <div className="mt-2 text-xs">
                    <p className="text-gray-500 italic">
                      Based on: {item.context}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}


      {skillsToHighlight.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Skills to Highlight</h3>
          <div className="flex flex-wrap gap-2">
            {skillsToHighlight.map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs whitespace-pre-wrap"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ResumePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [latexContent, setLatexContent] = useState<string>('');
  const [appliedReplacementKeys, setAppliedReplacementKeys] = useState<Set<string>>(new Set());

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

  // Quick job summary for header
  const {
    data: jobSummary,
    isLoading: isLoadingSummary,
    error: summaryError
  } = useQuery<string[], Error>(
    ['job-summary', id],
    async () => {
      console.log('Generating quick job summary for job ID:', id);
      try {
        const result = await window.api.generateJobSummary({ jobId: id! });
        console.log('Job summary result:', result);
        return result;
      } catch (error) {
        console.error('Error in job summary query:', error);
        throw error;
      }
    },
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

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
        return result as ResumeImprovementResponse;
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

  // O3-powered experience rewriting
  const {
    data: experienceRewriteData,
    isLoading: isLoadingExperienceRewrite,
    error: experienceRewriteError
  } = useQuery<ExperienceItemRewriteResponse, Error>(
    ['experience-rewrite', id],
    async () => {
      console.log('Starting O3 experience rewrite for job ID:', id);
      try {
        const result = await window.api.rewriteExperienceItems(id!);
        console.log('O3 experience rewrite result:', result);
        return result as ExperienceItemRewriteResponse;
      } catch (error) {
        console.error('Error in O3 experience rewrite query:', error);
        throw error;
      }
    },
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // O3-powered project highlighting
  const {
    data: projectHighlightData,
    isLoading: isLoadingProjectHighlight,
    error: projectHighlightError
  } = useQuery<ProjectHighlightResponse, Error>(
    ['project-highlight', id],
    async () => {
      console.log('Starting O3 project highlighting for job ID:', id);
      try {
        const result = await window.api.highlightRelevantProjects(id!);
        console.log('O3 project highlighting result:', result);
        return result as ProjectHighlightResponse;
      } catch (error) {
        console.error('Error in O3 project highlighting query:', error);
        throw error;
      }
    },
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Apply replacement from O3 suggestions
  const handleApplyReplacement = (rep: ReplacementSuggestion) => {
    setLatexContent(prev => prev.replace(rep.currentContent, rep.suggestedContent));
    setAppliedReplacementKeys(prev => new Set(prev).add(rep.currentContent));
  };

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
        <div className="text-red-500 p-4 rounded-lg bg-red-50">
          Error: {(jobsError || templateError)?.message}
        </div>
      </div>
    );
  }

  if (!job || !baseTemplate) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <ErrorBoundary>
        {/* Navigation */}
        <div className="flex items-center gap-3 mb-3">
          <Link 
            to={`/job/${job.id}`}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150 gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job
          </Link>
        </div>
        {/* Header with job info */}
        <header className="bg-white rounded-lg p-4 shadow">
          <div className="flex justify-between items-start mb-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {job.title}
            </h1>
            <StatusTracker 
              jobId={job.id} 
              currentStatus={job.status} 
              showLabel={false}
              className="flex-shrink-0"
            />
          </div>
          <div className="text-gray-600">
            {isLoadingSummary ? (
              <p className="text-sm text-gray-500">Analyzing job highlights...</p>
            ) : summaryError ? (
              <p className="text-sm text-red-500">Failed to generate summary</p>
            ) : (
              <ul className="text-sm space-y-1">
                {(jobSummary || []).filter(point => point.trim().length > 0).map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left side - LaTeX Editor */}
          <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Resume Editor</h2>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <textarea
                className="w-full h-full font-mono text-sm p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={latexContent}
                onChange={(e) => setLatexContent(e.target.value)}
              />
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleOpenOverleaf}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
              >
                Open in Overleaf
              </button>
            </div>
          </div>

          {/* Right side - Suggestions */}
          <div className="w-1/3 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">AI Suggestions</h2>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <ErrorBoundary>
                <SuggestionsPanel
                  isLoading={isLoadingSuggestions}
                  error={suggestionsError}
                  data={improvementData}
                  experienceRewriteData={experienceRewriteData}
                  isLoadingExperienceRewrite={isLoadingExperienceRewrite}
                  experienceRewriteError={experienceRewriteError}
                  projectHighlightData={projectHighlightData}
                  isLoadingProjectHighlight={isLoadingProjectHighlight}
                  projectHighlightError={projectHighlightError}
                  onApplyReplacement={handleApplyReplacement}
                  hiddenReplacementKeys={appliedReplacementKeys}
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
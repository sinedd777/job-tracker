import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Github, RefreshCcw } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
  salary?: string;
}

interface ResumeImprovementResponse {
  suggestions: string[];
  relevantProjects: string[];
  skillsToHighlight: string[];
  experienceToHighlight: string[];
}

// Legacy function for basic suggestions
const generateBasicSuggestions = (job?: Job): string[] => {
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
  const queryClient = useQueryClient();

  // Fetch all jobs and find one by id (reuse existing API)
  const { data: jobs } = useQuery<Job[]>(['jobs'], () => window.api.getJobs());
  const job = jobs?.find((j) => j.id === id);

  // Load resume template
  const { data: baseTemplate } = useQuery(['resume-template'], () => window.api.readResumeTemplate());

  // GitHub integration - just get last sync time
  const { data: githubLastSync } = useQuery(['github-last-sync'], () => window.api.getGithubLastSync());

  // RAG-powered suggestions
  const {
    data: improvementData,
    isLoading: isLoadingSuggestions,
    refetch: refetchSuggestions,
  } = useQuery<ResumeImprovementResponse>(
    ['resume-suggestions', id],
    () => window.api.generateResumeSuggestions(id!),
    {
      enabled: !!id && !!job,
      refetchOnWindowFocus: false,
    }
  );

  const [latexContent, setLatexContent] = useState<string>('');

  // Build personalized template once data is available
  useEffect(() => {
    if (baseTemplate && job) {
      setLatexContent(injectJobContent(baseTemplate, job));
    }
  }, [baseTemplate, job]);

  // Fallback to basic suggestions if RAG suggestions fail
  const suggestions = useMemo(() => {
    if (improvementData?.suggestions && improvementData.suggestions.length > 0) {
      return improvementData.suggestions;
    }
    return generateBasicSuggestions(job);
  }, [improvementData, job]);

  const handleOpenOverleaf = () => {
    if (!id) return;
    window.api.saveAndOpenResume(id, latexContent);
  };

  // RAG vector store update mutation
  const updateRagMutation = useMutation(() => window.api.updateRagVectorStore(), {
    onSuccess: () => {
      // After updating the vector store, refresh suggestions
      if (id) {
        queryClient.invalidateQueries(['resume-suggestions', id]);
      }
    }
  });

  // Sidebar GitHub status section
  const renderGithubStatus = () => (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          GitHub data {githubLastSync ? `synced ${new Date(githubLastSync).toLocaleString()}` : 'not synced yet'}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => updateRagMutation.mutate()}
          disabled={updateRagMutation.isLoading}
          className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          title="Update RAG vector store with latest GitHub data"
        >
          <RefreshCcw className={`w-3 h-3 ${updateRagMutation.isLoading ? 'animate-spin' : ''}`} />
          Update RAG
        </button>
        <button
          onClick={() => refetchSuggestions()}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
  );

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
        <aside className="w-1/3 bg-gray-50 dark:bg-gray-800 rounded overflow-y-auto flex flex-col">
          {/* GitHub Status */}
          {renderGithubStatus()}
          
          {/* AI Suggestions */}
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">AI Suggestions</h2>
            
            {isLoadingSuggestions ? (
              <p className="text-gray-500 dark:text-gray-400">Generating suggestions...</p>
            ) : suggestions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No suggestions available.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Improvements</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                
                {improvementData?.relevantProjects && improvementData.relevantProjects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relevant Projects</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {improvementData.relevantProjects.map((project, idx) => (
                        <li key={idx}>{project}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {improvementData?.skillsToHighlight && improvementData.skillsToHighlight.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills to Highlight</h3>
                    <div className="flex flex-wrap gap-1">
                      {improvementData.skillsToHighlight.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {improvementData?.experienceToHighlight && improvementData.experienceToHighlight.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience to Highlight</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {improvementData.experienceToHighlight.map((exp, idx) => (
                        <li key={idx}>{exp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ResumePage; 
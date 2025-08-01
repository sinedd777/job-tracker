export interface IElectronAPI {
  // Job operations
  getJobs: () => Promise<any[]>;
  getRecentJobs: () => Promise<any[]>;
  getNewJobs: () => Promise<any[]>;
  getRecentNewJobs: () => Promise<any[]>;
  getHistoricalJobs: () => Promise<any[]>;
  updateJob: (jobId: string, data: any) => Promise<void>;
  
  // Note operations
  addNote: (jobId: string, note: any) => Promise<void>;
  getNotes: (jobId: string) => Promise<any[]>;
  
  // Reminder operations
  addReminder: (jobId: string, reminder: any) => Promise<void>;
  getReminders: (jobId: string) => Promise<any[]>;
  
  // Communication operations
  addCommunication: (jobId: string, communication: any) => Promise<void>;
  getCommunications: (jobId: string) => Promise<any[]>;
  
  // Sync operations
  syncJobs: () => Promise<void>;
  syncRecentJobsFromSupabase: () => Promise<void>;
  
  // App operations
  getDarkMode: () => Promise<boolean>;
  toggleDarkMode: () => Promise<boolean>;

  // Resume operations
  readResumeTemplate: () => Promise<string>;
  saveAndOpenResume: (jobId: string, content: string) => Promise<void>;
  generateResumeSuggestions: (jobId: string) => Promise<{
    replacements: Array<{
      sectionName: string;
      currentContent: string;
      suggestedContent: string;
      reason: string;
      lineNumbers?: string;
    }>;
    suggestions: string[];
    relevantProjects: string[];
    skillsToHighlight: string[];
    experienceToHighlight: string[];
  }>;
  rewriteExperienceItems: (jobId: string) => Promise<{
    experienceReplacements: Array<{
      sectionName: string;
      currentContent: string;
      suggestedContent: string;
      reason: string;
      lineNumbers?: string;
    }>;
  }>;
  highlightRelevantProjects: (jobId: string) => Promise<{
    projectRecommendations: Array<{
      projectTitle: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
      suggestedPlacement: string;
    }>;
  }>;
  listResumes: () => Promise<Array<{ jobId: string; fileName: string; modifiedTime: string }>>;
  listEmails: () => Promise<Array<{ jobId: string; fileName: string; modifiedTime: string }>>;
  generateJobSummary: (args: { jobId: string }) => Promise<string[]>;
  updateRagVectorStore: () => Promise<void>;

  // GitHub operations (read-only)
  getGithubLastSync: () => Promise<string | null>;

  // Email operations
  generateColdEmail: (jobId: string, model?: string) => Promise<string>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
} 
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
    suggestions: string[];
    relevantProjects: string[];
    skillsToHighlight: string[];
    experienceToHighlight: string[];
  }>;

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
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Job operations
    getJobs: () => ipcRenderer.invoke('get-jobs'),
    getRecentJobs: () => ipcRenderer.invoke('get-recent-jobs'),
    getNewJobs: () => ipcRenderer.invoke('get-new-jobs'),
    getRecentNewJobs: () => ipcRenderer.invoke('get-recent-new-jobs'),
    getHistoricalJobs: () => ipcRenderer.invoke('get-historical-jobs'),
    updateJob: (jobId: string, data: any) => ipcRenderer.invoke('update-job', jobId, data),
    
    // Note operations
    addNote: (jobId: string, note: any) => ipcRenderer.invoke('add-note', jobId, note),
    getNotes: (jobId: string) => ipcRenderer.invoke('get-notes', jobId),
    
    // Reminder operations
    addReminder: (jobId: string, reminder: any) => ipcRenderer.invoke('add-reminder', jobId, reminder),
    getReminders: (jobId: string) => ipcRenderer.invoke('get-reminders', jobId),
    
    // Communication operations
    addCommunication: (jobId: string, communication: any) => 
      ipcRenderer.invoke('add-communication', jobId, communication),
    getCommunications: (jobId: string) => ipcRenderer.invoke('get-communications', jobId),
    
    // Sync operations
    syncJobs: () => ipcRenderer.invoke('sync-jobs'),
    syncRecentJobsFromSupabase: () => ipcRenderer.invoke('sync-recent-jobs-from-supabase'),
    
    // App operations
    getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
    toggleDarkMode: () => ipcRenderer.invoke('toggle-dark-mode'),

    // Resume operations
    readResumeTemplate: () => ipcRenderer.invoke('read-resume-template'),
    saveAndOpenResume: (jobId: string, content: string) => ipcRenderer.invoke('save-and-open-resume', jobId, content),
    generateResumeSuggestions: (jobId: string) => ipcRenderer.invoke('generate-resume-suggestions', jobId),
  rewriteExperienceItems: (jobId: string) => ipcRenderer.invoke('rewrite-experience-items', jobId),
  highlightRelevantProjects: (jobId: string) => ipcRenderer.invoke('highlight-relevant-projects', jobId),
    generateJobSummary: (args: { jobId: string }) => ipcRenderer.invoke('generate-job-summary', args),
    updateRagVectorStore: () => ipcRenderer.invoke('update-rag-vector-store'),

    // GitHub operations (read-only)
    getGithubLastSync: () => ipcRenderer.invoke('get-github-last-sync'),

    // Email operations
    generateColdEmail: (jobId: string, model?: string) => 
      ipcRenderer.invoke('generate-cold-email', { jobId, model }),
  }
); 
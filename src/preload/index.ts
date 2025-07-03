import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Job operations
    getJobs: () => ipcRenderer.invoke('get-jobs'),
    getRecentJobs: () => ipcRenderer.invoke('get-recent-jobs'),
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

    // Email operations
    generateColdEmail: (jobId: string, model?: string) => 
      ipcRenderer.invoke('generate-cold-email', { jobId, model }),
  }
); 
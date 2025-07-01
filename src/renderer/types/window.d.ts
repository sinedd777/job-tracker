export interface IJobAPI {
  // Job operations
  getJobs: () => Promise<any[]>;
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
  
  // App operations
  getDarkMode: () => Promise<boolean>;
  toggleDarkMode: () => Promise<void>;
}

declare global {
  interface Window {
    api: IJobAPI;
  }
} 
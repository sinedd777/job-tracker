// @ts-ignore -- types not exposed correctly by dotenv exports in bundler
import * as dotenv from 'dotenv';
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import './ipc';
import { githubService } from './services/github';
import { ragService } from './services/rag';

// Load environment variables for main process. Prioritise .env.local if present.
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Module not found (e.g., on macOS/Linux or during development). Ignore.
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

  // Load the index.html file.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

// Setup GitHub background sync (every 12 hours if GITHUB_USERNAME is set)
const setupGithubSync = () => {
  // Initial sync on startup
  githubService.fetchAndStoreUserRepos()
    .then(async () => {
      // After GitHub sync, update the RAG vector store
      console.log('GitHub sync complete, updating RAG vector store...');
      await ragService.updateVectorStore();
      console.log('RAG vector store updated');
    })
    .catch(err => {
      console.error('Failed to sync GitHub repositories:', err);
    });

  // Set up periodic sync
  setInterval(() => {
    githubService.fetchAndStoreUserRepos()
      .then(async () => {
        // After GitHub sync, update the RAG vector store
        console.log('GitHub sync complete, updating RAG vector store...');
        await ragService.updateVectorStore();
        console.log('RAG vector store updated');
      })
      .catch(err => {
        console.error('Failed to sync GitHub repositories:', err);
      });
  }, 12 * 60 * 60 * 1000); // 12 hours
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();
  setupGithubSync();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 
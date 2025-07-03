import { Octokit } from '@octokit/rest';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define types for GitHub data
interface RepoData {
  name: string;
  description: string;
  languages: Record<string, number>;
  readme: string;
  lastUpdated: string;
}

class GitHubService {
  private octokit: Octokit;
  private dataDir: string;
  private reposDir: string;
  private username: string;

  constructor() {
    // Get GitHub token and username from environment variables
    const token = process.env.GITHUB_TOKEN;
    this.username = process.env.GITHUB_USERNAME || '';
    
    // Initialize Octokit with token if available
    this.octokit = new Octokit({
      auth: token,
    });

    // Set up data directories
    this.dataDir = join(app.getPath('userData'), 'github-data');
    this.reposDir = join(this.dataDir, 'repos');
    
    // Create directories if they don't exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.reposDir)) {
      mkdirSync(this.reposDir, { recursive: true });
    }
    
    console.log(`GitHub service initialized with username: ${this.username || 'not set'}`);
  }

  public getUsername(): string {
    return this.username || process.env.GITHUB_USERNAME || '';
  }

  public async fetchAndStoreUserRepos(): Promise<string[]> {
    const username = this.getUsername();
    
    if (!username) {
      console.warn('GitHub username not set in environment variables (GITHUB_USERNAME)');
      return [];
    }

    try {
      console.log(`Fetching GitHub repositories for ${username}...`);
      
      // Fetch user repositories
      const { data: repos } = await this.octokit.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
      });

      const repoNames: string[] = [];
      
      // Process each repository
      for (const repo of repos) {
        // Skip forks and empty repos
        if (repo.fork || !repo.description) continue;

        repoNames.push(repo.name);
        
        // Get languages
        const { data: languages } = await this.octokit.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });

        // Get README if available
        let readme = '';
        try {
          const { data } = await this.octokit.repos.getReadme({
            owner: username,
            repo: repo.name,
          });
          
          // Decode base64 content
          readme = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (error) {
          // README might not exist
          console.log(`No README found for ${repo.name}`);
        }

        // Store repo data
        const repoData: RepoData = {
          name: repo.name,
          description: repo.description || '',
          languages,
          readme,
          lastUpdated: new Date().toISOString(),
        };

        const repoPath = join(this.reposDir, `${repo.name}.json`);
        writeFileSync(repoPath, JSON.stringify(repoData, null, 2), 'utf-8');
      }

      // Update last sync time
      writeFileSync(
        join(this.dataDir, 'last-sync.json'),
        JSON.stringify({ lastSync: new Date().toISOString() }),
        'utf-8'
      );

      console.log(`Successfully synced ${repoNames.length} repositories`);
      return repoNames;
    } catch (error) {
      console.error('Failed to fetch GitHub repositories:', error);
      return [];
    }
  }

  public getRepoData(repoName: string): RepoData | null {
    try {
      const repoPath = join(this.reposDir, `${repoName}.json`);
      if (!existsSync(repoPath)) {
        return null;
      }
      return JSON.parse(readFileSync(repoPath, 'utf-8'));
    } catch (error) {
      console.error(`Failed to get data for repo ${repoName}:`, error);
      return null;
    }
  }

  public getAllRepos(): RepoData[] {
    try {
      const repos: RepoData[] = [];
      const repoFiles = existsSync(this.reposDir) 
        ? require('fs').readdirSync(this.reposDir)
        : [];
      
      for (const file of repoFiles) {
        if (file.endsWith('.json')) {
          const repoPath = join(this.reposDir, file);
          const repoData = JSON.parse(readFileSync(repoPath, 'utf-8'));
          repos.push(repoData);
        }
      }
      return repos;
    } catch (error) {
      console.error('Failed to get all repos:', error);
      return [];
    }
  }

  public getLastSyncTime(): string | null {
    try {
      const syncPath = join(this.dataDir, 'last-sync.json');
      if (!existsSync(syncPath)) {
        return null;
      }
      const data = JSON.parse(readFileSync(syncPath, 'utf-8'));
      return data.lastSync;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const githubService = new GitHubService(); 
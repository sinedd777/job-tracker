import { Octokit } from '@octokit/rest';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import dotenv from 'dotenv';

// Load environment variables, prioritizing .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });
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
      console.log('Making API call to fetch repositories...');
      const { data: repos } = await this.octokit.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
      });
      
      console.log(`Found ${repos.length} total repositories`);
      
      const repoNames: string[] = [];
      
      // Process each repository
      for (const repo of repos) {
        // Log repo info before filtering
        console.log(`Processing repo: ${repo.name} (fork: ${repo.fork})`);
        
        // Skip forks
        if (repo.fork) {
          console.log(`Skipping ${repo.name} - fork: ${repo.fork}`);
          continue;
        }

        // Get README content first
        let readme = '';
        try {
          console.log(`Fetching README for ${repo.name}...`);
          const { data } = await this.octokit.repos.getReadme({
            owner: username,
            repo: repo.name,
          });
          
          // Decode base64 content
          readme = Buffer.from(data.content, 'base64').toString('utf-8');
          console.log(`Successfully fetched README for ${repo.name}`);
        } catch (error: any) {
          // Skip repositories without README
          console.log(`Skipping ${repo.name} - no README found: ${error.message}`);
          continue;
        }

        // Only process repositories that have a README
        repoNames.push(repo.name);
        
        // Get languages
        console.log(`Fetching languages for ${repo.name}...`);
        const { data: languages } = await this.octokit.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });

        // Extract a description from README if possible
        const readmeDescription = this.extractDescriptionFromReadme(readme);

        // Store repo data
        const repoData: RepoData = {
          name: repo.name,
          description: readmeDescription || repo.name,
          languages,
          readme,
          lastUpdated: new Date().toISOString(),
        };

        const repoPath = join(this.reposDir, `${repo.name}.json`);
        writeFileSync(repoPath, JSON.stringify(repoData, null, 2), 'utf-8');
        console.log(`Stored data for ${repo.name}`);
      }

      // Update last sync time
      writeFileSync(
        join(this.dataDir, 'last-sync.json'),
        JSON.stringify({ lastSync: new Date().toISOString() }),
        'utf-8'
      );

      console.log(`Successfully synced ${repoNames.length} repositories with README files`);
      return repoNames;
    } catch (error: any) {
      console.error('Failed to fetch GitHub repositories:', error);
      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', error.response.data);
      }
      return [];
    }
  }

  private extractDescriptionFromReadme(readme: string): string {
    // Try to find the first paragraph after any headers
    const lines = readme.split('\n');
    let description = '';
    let foundFirstHeader = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Look for a header (# style or === style)
      if (trimmedLine.startsWith('#') || /^[=\-]{3,}$/.test(trimmedLine)) {
        foundFirstHeader = true;
        continue;
      }
      
      // After finding a header, get the first non-empty paragraph
      if (foundFirstHeader && trimmedLine) {
        description = trimmedLine;
        break;
      }
    }
    
    // If no description found after headers, just take the first non-empty line
    if (!description) {
      description = lines.find(line => line.trim()) || '';
    }
    
    return description;
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
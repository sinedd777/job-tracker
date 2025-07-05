import { Octokit } from '@octokit/rest';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
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
  }

  public getUsername(): string {
    return this.username || process.env.GITHUB_USERNAME || '';
  }

  public async fetchAndStoreUserRepos(): Promise<string[]> {
    const username = this.getUsername();
    
    if (!username) {
      return [];
    }

    try {
      // Fetch user repositories
      const { data: repos } = await this.octokit.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
      });
      
      const repoNames: string[] = [];
      
      // Process each repository
      for (const repo of repos) {
        // Skip forks
        if (repo.fork) {
          continue;
        }

        // Get README content first
        let readme = '';
        try {
          const { data } = await this.octokit.repos.getReadme({
            owner: username,
            repo: repo.name,
          });
          
          // Decode base64 content
          readme = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (error: any) {
          // Skip repositories without README
          continue;
        }

        // Only process repositories that have a README
        repoNames.push(repo.name);
        
        // Get languages
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
      }

      // Update last sync time
      writeFileSync(
        join(this.dataDir, 'last-sync.json'),
        JSON.stringify({ lastSync: new Date().toISOString() }),
        'utf-8'
      );

      return repoNames;
    } catch (error: any) {
      if (error.response) {
        // Handle error silently
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
      if (trimmedLine.startsWith('#') || /^[=-]{3,}$/.test(trimmedLine)) {
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
      return null;
    }
  }

  public getAllRepos(): RepoData[] {
    try {
      const repos: RepoData[] = [];
      const repoFiles = existsSync(this.reposDir) 
        ? readdirSync(this.reposDir)
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
      return null;
    }
  }
}

// Create and export a singleton instance
export const githubService = new GitHubService(); 
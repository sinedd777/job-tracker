import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { app } from 'electron';
import dotenv from 'dotenv';
import { encryptString, decryptString } from '../utils/encryption';
import type { Octokit } from '@octokit/rest' assert { "resolution-mode": "import" };

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
  private octokit: Octokit | null = null;
  private dataDir: string;
  private reposDir: string;
  private username: string;
  private token: string | undefined;

  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.username = process.env.GITHUB_USERNAME || '';
    
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

  /**
   * Lazily import and instantiate Octokit to avoid CommonJS/ESM interop issues at load time.
   */
  private async getOctokit(): Promise<Octokit> {
    if (this.octokit) return this.octokit;
    const { Octokit } = await import('@octokit/rest');
    this.octokit = new Octokit({ auth: this.token });
    return this.octokit;
  }

  public async fetchAndStoreUserRepos(): Promise<string[]> {
    const username = this.getUsername();
    
    if (!username) {
      return [];
    }

    try {
      const octokit = await this.getOctokit();
      
      // Fetch user repositories
      const { data: repos } = await octokit.repos.listForUser({
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
          const { data } = await octokit.repos.getReadme({
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
        const { data: languages } = await octokit.repos.listLanguages({
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
        const secret = process.env.DATA_ENCRYPTION_KEY;
        const dataStr = JSON.stringify(repoData, null, 2);
        const toWrite = secret ? encryptString(dataStr, secret) : dataStr;
        writeFileSync(repoPath, toWrite, 'utf-8');
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
      const raw = readFileSync(repoPath, 'utf-8');
      const secret = process.env.DATA_ENCRYPTION_KEY;
      const jsonStr = secret ? decryptString(raw, secret) : raw;
      return JSON.parse(jsonStr);
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
          const raw = readFileSync(repoPath, 'utf-8');
          const secret = process.env.DATA_ENCRYPTION_KEY;
          const jsonStr = secret ? decryptString(raw, secret) : raw;
          const repoData = JSON.parse(jsonStr);
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
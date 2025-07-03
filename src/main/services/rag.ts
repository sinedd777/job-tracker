import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { githubService } from './github';
// Remove static import and use dynamic import later
// import { pipeline } from '@xenova/transformers';
// Using dynamic import for langchain as well
// const { FaissStore } = require('langchain/vectorstores/faiss');
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type declarations for dynamic imports
declare module '@xenova/transformers' {
  export function pipeline(task: string, model: string): Promise<any>;
}

interface ResumeImprovementRequest {
  jobTitle: string;
  jobCompany: string;
  jobDescription?: string;
  baseResume: string;
}

interface ResumeImprovementResponse {
  suggestions: string[];
  relevantProjects: string[];
  skillsToHighlight: string[];
  experienceToHighlight: string[];
}

interface Document {
  pageContent: string;
  metadata: {
    source: string;
    type: string;
    title?: string;
  };
}

class RAGService {
  private userProfile: any;
  private dataDir: string;
  private vectorsDir: string;
  private embedder: any;
  private vectorStore: any = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Set up data directories
    this.dataDir = join(app.getPath('userData'), 'rag-data');
    this.vectorsDir = join(this.dataDir, 'vectors');
    
    // Create directories if they don't exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.vectorsDir)) {
      mkdirSync(this.vectorsDir, { recursive: true });
    }

    // Load user profile
    try {
      const userProfilePath = join(process.cwd(), 'data', 'user-profile.json');
      const userProfileRaw = readFileSync(userProfilePath, 'utf-8');
      this.userProfile = JSON.parse(userProfileRaw);
    } catch (error) {
      this.userProfile = {};
    }

    // Initialize the embedding model and vector store
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const { pipeline } = await import('@xenova/transformers');
      
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          progress_callback: (progress: any) => {
            // Keep download progress logs as they're useful for UX
            if (progress.status === 'downloading') {
              // Removed console.log for download progress
            }
          }
        }
      );
      
      // Check if we have existing vectors
      const vectorIndexPath = join(this.vectorsDir, 'faiss.index');
      const vectorDocumentsPath = join(this.vectorsDir, 'documents.json');
      
      if (existsSync(vectorIndexPath) && existsSync(vectorDocumentsPath)) {
        await this.loadVectorStore();
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    } else {
      this.initializationPromise = this.initialize();
      await this.initializationPromise;
    }
    if (!this.isInitialized) {
      throw new Error('RAG service failed to initialize');
    }
  }

  private async createVectorStore(): Promise<void> {
    try {
      const documents = await this.prepareDocuments();
      const embeddings = await this.embedDocuments(documents);
      
      const embeddingsObject = {
        embedQuery: async (text: string) => {
          try {
            const { data } = await this.embedder(text, { pooling: 'mean', normalize: true });
            return Array.from(data) as number[];
          } catch (error) {
            throw error;
          }
        },
        embedDocuments: async (texts: string[]) => {
          return this.embedDocuments(texts);
        }
      };
      
      const { FaissStore } = await import('@langchain/community/vectorstores/faiss');
      
      this.vectorStore = await FaissStore.fromTexts(
        documents.map(doc => doc.pageContent),
        documents.map(doc => doc.metadata),
        embeddingsObject
      );
      
      await this.saveVectorStore(documents);
      this.isInitialized = true;
    } catch (error) {
      throw error;
    }
  }

  private async loadVectorStore(): Promise<void> {
    try {
      const documentsPath = join(this.vectorsDir, 'documents.json');
      const documentsRaw = readFileSync(documentsPath, 'utf-8');
      const documents = JSON.parse(documentsRaw);
      
      const embeddingsObject = {
        embedQuery: async (text: string) => {
          const { data } = await this.embedder(text, { pooling: 'mean', normalize: true });
          return Array.from(data) as number[];
        },
        embedDocuments: async (texts: string[]) => {
          return this.embedDocuments(texts);
        }
      };
      
      const { FaissStore } = await import('@langchain/community/vectorstores/faiss');
      
      this.vectorStore = await FaissStore.load(
        this.vectorsDir,
        embeddingsObject
      );
      
      this.isInitialized = true;
    } catch (error) {
      // If loading fails, create a new vector store
      await this.createVectorStore();
    }
  }

  private async saveVectorStore(documents: Document[]): Promise<void> {
    try {
      // Save documents
      const documentsPath = join(this.vectorsDir, 'documents.json');
      writeFileSync(documentsPath, JSON.stringify(documents), 'utf-8');
      
      // Save vector store
      if (this.vectorStore) {
        await this.vectorStore.save(this.vectorsDir);
      }
    } catch (error) {
      throw error;
    }
  }

  private async prepareDocuments(): Promise<Document[]> {
    const documents: Document[] = [];

    // Add user profile as a document
    if (this.userProfile) {
      documents.push({
        pageContent: JSON.stringify(this.userProfile, null, 2),
        metadata: {
          source: 'user-profile',
          type: 'profile'
        }
      });
    }

    // Get GitHub repositories
    const repos = await githubService.fetchAndStoreUserRepos();

    // Process each repository
    for (const repoName of repos) {
      try {
        const repoData = await githubService.getRepoData(repoName);
        
        if (!repoData) {
          continue;
        }

        // Add README content
        if (repoData.readme) {
          documents.push({
            pageContent: repoData.readme,
            metadata: {
              source: `github-readme-${repoName}`,
              type: 'readme',
              title: repoName
            }
          });
        }

        // Add repository info
        documents.push({
          pageContent: `Repository: ${repoName}\nLanguages: ${Object.keys(repoData.languages || {}).join(', ')}\nDescription: ${repoData.description || repoName}`,
          metadata: {
            source: `github-repo-${repoName}`,
            type: 'repository',
            title: repoName
          }
        });
      } catch (error) {
        // Skip failed repositories
      }
    }

    return documents;
  }

  private async embedDocuments(documents: Document[] | string[]): Promise<number[][]> {
    try {
      await this.ensureInitialized();
      
      let texts: string[];
      if (documents.length > 0 && typeof documents[0] === 'object' && 'pageContent' in documents[0]) {
        texts = (documents as Document[]).map(doc => doc.pageContent);
      } else {
        texts = documents as string[];
      }
      
      const batchSize = 5;
      const embeddings: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        try {
          const batchPromises = batch.map(async (text) => {
            try {
              const { data } = await this.embedder(text, { pooling: 'mean', normalize: true });
              return Array.from(data) as number[];
            } catch (error) {
              return new Array(384).fill(0);
            }
          });
          
          const batchEmbeddings = await Promise.all(batchPromises);
          embeddings.push(...batchEmbeddings);
        } catch (error) {
          continue;
        }
      }
      
      if (embeddings.length === 0) {
        throw new Error('Failed to create any embeddings');
      }
      
      return embeddings;
    } catch (error) {
      throw error;
    }
  }

  private async searchVectorStore(query: string, k: number = 5): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        throw new Error('Vector store not initialized');
      }
      
      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      return [];
    }
  }

  public async updateVectorStore(): Promise<void> {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Vector store update timed out after 5 minutes')), 300000);
      });

      const updatePromise = (async () => {
        await this.ensureInitialized();
        await this.createVectorStore();
      })();

      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error) {
      throw error;
    }
  }

  public async generateResumeSuggestions(
    request: ResumeImprovementRequest
  ): Promise<ResumeImprovementResponse> {
    try {
      await this.ensureInitialized();
      
      if (!this.vectorStore) {
        throw new Error('Vector store not initialized');
      }
      
      // Extract job details
      const { jobTitle, jobCompany, jobDescription = '' } = request;
      
      // Create search query
      const searchQuery = `${jobTitle} ${jobCompany} ${jobDescription.substring(0, 200)}`;
      
      // Retrieve relevant documents
      const relevantDocs = await this.searchVectorStore(searchQuery);
      
      // Build context for generation
      const context = this.buildContext(jobTitle, jobCompany, jobDescription, relevantDocs);
      
      // If OpenAI API key is available, use it to generate suggestions
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        return await this.callOpenAI(context, jobTitle, jobCompany, jobDescription, relevantDocs);
      } else {
        return this.generateRuleBasedSuggestions(jobTitle, jobCompany, jobDescription, relevantDocs);
      }
    } catch (error) {
      return {
        suggestions: [
          'Failed to generate suggestions. Please try again later.',
          'Make sure your resume highlights relevant skills and experience.',
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        relevantProjects: [],
        skillsToHighlight: [],
        experienceToHighlight: [],
      };
    }
  }

  private buildContext(
    jobTitle: string,
    jobCompany: string,
    jobDescription: string,
    relevantDocs: Document[]
  ): string {
    // Group documents by type
    const githubRepos = relevantDocs.filter(doc => doc.metadata.source === 'github' && doc.metadata.type === 'repository');
    const readmeChunks = relevantDocs.filter(doc => doc.metadata.source === 'github' && doc.metadata.type === 'readme');
    const experiences = relevantDocs.filter(doc => doc.metadata.source === 'user_profile' && doc.metadata.type === 'experience');
    const projects = relevantDocs.filter(doc => doc.metadata.source === 'user_profile' && doc.metadata.type === 'project');
    
    // Format documents by type
    const repoSummaries = githubRepos.map(doc => doc.pageContent).join('\n\n');
    const readmeSummaries = readmeChunks.map(doc => doc.pageContent).join('\n\n');
    const experienceSummaries = experiences.map(doc => doc.pageContent).join('\n\n');
    const projectSummaries = projects.map(doc => doc.pageContent).join('\n\n');
    
    // Build the complete context
    return `
Job Title: ${jobTitle}
Company: ${jobCompany}
Job Description: ${jobDescription}

Relevant User Experience:
${experienceSummaries || 'No relevant experience found.'}

Relevant User Projects:
${projectSummaries || 'No relevant projects found.'}

Relevant GitHub Repositories:
${repoSummaries || 'No relevant GitHub repositories found.'}

Relevant README Content:
${readmeSummaries || 'No relevant README content found.'}
`;
  }

  private async callOpenAI(
    context: string,
    jobTitle: string,
    jobCompany: string,
    jobDescription: string,
    relevantDocs: Document[]
  ): Promise<ResumeImprovementResponse> {
    try {
      const prompt = `You are an expert resume consultant with deep knowledge of ATS systems and hiring processes. Your task is to provide detailed, actionable suggestions to improve a resume for a specific job application.

Context:
${context}

Please analyze the job details and the candidate's background to provide:
1. A list of specific resume improvements (be detailed and actionable)
2. Relevant projects from their GitHub that should be highlighted
3. Key skills that should be emphasized based on the job requirements
4. Experience points that should be highlighted or modified

Format your response as a JSON object with these keys:
- suggestions: array of strings with specific improvement points
- relevantProjects: array of strings with project names
- skillsToHighlight: array of strings with skills
- experienceToHighlight: array of strings with experience points

Make your suggestions extremely specific, actionable, and tailored to the job.`;

      const apiKey = process.env.OPENAI_API_KEY;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert resume consultant.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content returned from OpenAI');
      }

      const parsedResponse = JSON.parse(content);
      return {
        suggestions: parsedResponse.suggestions || [],
        relevantProjects: parsedResponse.relevantProjects || [],
        skillsToHighlight: parsedResponse.skillsToHighlight || [],
        experienceToHighlight: parsedResponse.experienceToHighlight || [],
      };
    } catch (error) {
      // Fallback to rule-based suggestions
      return this.generateRuleBasedSuggestions(
        jobTitle,
        jobCompany,
        jobDescription,
        relevantDocs
      );
    }
  }

  private generateRuleBasedSuggestions(
    jobTitle: string,
    jobCompany: string,
    jobDescription: string,
    relevantDocs: Document[]
  ): ResumeImprovementResponse {
    // Basic keyword matching for rule-based suggestions
    const jobTitleLower = jobTitle.toLowerCase();
    const jobDescriptionLower = jobDescription.toLowerCase();
    
    const suggestions: string[] = [
      `Tailor your resume specifically for the "${jobTitle}" role at ${jobCompany}.`,
      `Include a brief professional summary that aligns with ${jobCompany}'s mission and values.`,
      'Use quantifiable achievements to demonstrate impact (e.g., "improved performance by X%").', 
      'Ensure your resume passes ATS systems by incorporating keywords from the job description.',
      'Prioritize relevant experience and projects at the top of each section.',
    ];

    // Find relevant projects from the retrieved documents
    const relevantProjects = relevantDocs
      .filter(doc => doc.metadata.source === 'github' && doc.metadata.type === 'repository')
      .map(doc => doc.metadata.title || '');

    // Extract potential skills from job title/description
    const skillKeywords = [
      'react', 'angular', 'vue', 'javascript', 'typescript', 'node', 'express', 
      'python', 'java', 'spring', 'sql', 'nosql', 'mongodb', 'aws', 'azure', 
      'docker', 'kubernetes', 'ci/cd', 'agile', 'scrum', 'testing', 'frontend', 
      'backend', 'fullstack', 'mobile', 'ios', 'android', 'react native', 'flutter'
    ];
    
    const skillsToHighlight = skillKeywords.filter(skill => 
      jobTitleLower.includes(skill) || jobDescriptionLower.includes(skill)
    );

    // Find relevant experience from the retrieved documents
    const experienceToHighlight = relevantDocs
      .filter(doc => doc.metadata.source === 'user_profile' && doc.metadata.type === 'experience')
      .map(doc => {
        const lines = doc.pageContent.split('\n');
        const position = lines.find(line => line.startsWith('Position:'))?.replace('Position:', '').trim() || '';
        const company = lines.find(line => line.startsWith('Company:'))?.replace('Company:', '').trim() || '';
        return `${position} at ${company}`;
      });

    return {
      suggestions,
      relevantProjects,
      skillsToHighlight,
      experienceToHighlight,
    };
  }
}

// Create and export a singleton instance
export const ragService = new RAGService(); 
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
      console.error('Failed to load user profile:', error);
      this.userProfile = {};
    }

    // Initialize the embedding model and vector store
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('Initializing RAG service...');
      
      // Initialize the embedding model using dynamic import
      const { pipeline } = await import('@xenova/transformers');
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      
      console.log('Embedding model loaded');
      
      // Check if we have existing vectors
      const vectorIndexPath = join(this.vectorsDir, 'faiss.index');
      const vectorDocumentsPath = join(this.vectorsDir, 'documents.json');
      
      if (existsSync(vectorIndexPath) && existsSync(vectorDocumentsPath)) {
        // Load existing vector store
        console.log('Loading existing vector store');
        await this.loadVectorStore();
      } else {
        // Create new vector store
        console.log('Creating new vector store');
        await this.createVectorStore();
      }
      
      this.isInitialized = true;
      console.log('RAG service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        await this.initialize();
      }
    }
  }

  private async createVectorStore(): Promise<void> {
    try {
      // Prepare documents for embedding
      const documents = await this.prepareDocuments();
      
      // Create embeddings for all documents
      const embeddings = await this.embedDocuments(documents);
      
      // Dynamically import FaissStore with type assertion to silence TypeScript errors
      // @ts-ignore
      const module = await import('langchain/vectorstores/faiss');
      const FaissStore = module.FaissStore;
      
      // Create vector store
      this.vectorStore = await FaissStore.fromTexts(
        documents.map(doc => doc.pageContent),
        documents.map(doc => doc.metadata),
        { embeddings }
      );
      
      // Save vector store
      await this.saveVectorStore(documents);
      
      console.log(`Vector store created with ${documents.length} documents`);
    } catch (error) {
      console.error('Failed to create vector store:', error);
      throw error;
    }
  }

  private async loadVectorStore(): Promise<void> {
    try {
      // Load documents
      const documentsPath = join(this.vectorsDir, 'documents.json');
      const documentsRaw = readFileSync(documentsPath, 'utf-8');
      const documents = JSON.parse(documentsRaw);
      
      // Dynamically import FaissStore with type assertion to silence TypeScript errors
      // @ts-ignore
      const module = await import('langchain/vectorstores/faiss');
      const FaissStore = module.FaissStore;
      
      // Load vector store
      this.vectorStore = await FaissStore.load(
        this.vectorsDir,
        { embeddings: this.embedDocuments.bind(this) }
      );
      
      console.log(`Vector store loaded with ${documents.length} documents`);
    } catch (error) {
      console.error('Failed to load vector store:', error);
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
      
      console.log('Vector store saved');
    } catch (error) {
      console.error('Failed to save vector store:', error);
      throw error;
    }
  }

  private async prepareDocuments(): Promise<Document[]> {
    const documents: Document[] = [];
    
    // Add GitHub repositories
    const githubRepos = githubService.getAllRepos();
    for (const repo of githubRepos) {
      // Add repository description
      documents.push({
        pageContent: `Project: ${repo.name}\nDescription: ${repo.description}\nLanguages: ${Object.keys(repo.languages).join(', ')}`,
        metadata: {
          source: 'github',
          type: 'repository',
          title: repo.name
        }
      });
      
      // Add README content if available (chunked)
      if (repo.readme) {
        const chunks = this.chunkText(repo.readme, 1000, 200);
        chunks.forEach((chunk, index) => {
          documents.push({
            pageContent: chunk,
            metadata: {
              source: 'github',
              type: 'readme',
              title: `${repo.name}-readme-${index}`
            }
          });
        });
      }
    }
    
    // Add user profile experience
    if (this.userProfile.experience) {
      this.userProfile.experience.forEach((exp: any, index: number) => {
        const content = `Position: ${exp.position}\nCompany: ${exp.company}\nPeriod: ${exp.startDate} - ${exp.endDate}\nResponsibilities: ${exp.responsibilities?.join('\n- ') || ''}`;
        documents.push({
          pageContent: content,
          metadata: {
            source: 'user_profile',
            type: 'experience',
            title: `experience-${index}`
          }
        });
      });
    }
    
    // Add user profile projects
    if (this.userProfile.projects) {
      this.userProfile.projects.forEach((proj: any, index: number) => {
        const content = `Project: ${proj.title}\nDescription: ${proj.description}\nTechnologies: ${proj.technologies?.join(', ') || ''}`;
        documents.push({
          pageContent: content,
          metadata: {
            source: 'user_profile',
            type: 'project',
            title: `project-${index}`
          }
        });
      });
    }
    
    return documents;
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    
    while (i < text.length) {
      let chunk = text.slice(i, i + chunkSize);
      
      // If not at the end and we can find a good break point
      if (i + chunkSize < text.length) {
        // Try to find a good break point (newline or period)
        const lastNewline = chunk.lastIndexOf('\n');
        const lastPeriod = chunk.lastIndexOf('.');
        
        let breakPoint = -1;
        if (lastNewline > chunkSize * 0.7) {
          breakPoint = lastNewline;
        } else if (lastPeriod > chunkSize * 0.7) {
          breakPoint = lastPeriod + 1; // Include the period
        }
        
        if (breakPoint !== -1) {
          chunk = chunk.slice(0, breakPoint);
          i += breakPoint;
        } else {
          i += chunkSize;
        }
      } else {
        i += chunkSize;
      }
      
      chunks.push(chunk.trim());
      
      // Move back by overlap amount
      i -= overlap;
      if (i < 0) i = 0;
    }
    
    return chunks;
  }

  private async embedDocuments(documents: Document[] | string[]): Promise<any[][]> {
    try {
      // Ensure embedder is initialized
      await this.ensureInitialized();
      
      // Get text content from documents
      let texts: string[];
      if (documents.length > 0 && typeof documents[0] === 'object' && 'pageContent' in documents[0]) {
        texts = (documents as Document[]).map(doc => doc.pageContent);
      } else {
        texts = documents as string[];
      }
      
      // Create embeddings
      const embeddings = [];
      for (const text of texts) {
        const { data } = await this.embedder(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(data));
      }
      
      return embeddings;
    } catch (error) {
      console.error('Failed to create embeddings:', error);
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
      console.error('Failed to search vector store:', error);
      return [];
    }
  }

  public async updateVectorStore(): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.createVectorStore();
    } catch (error) {
      console.error('Failed to update vector store:', error);
    }
  }

  public async generateResumeSuggestions(
    request: ResumeImprovementRequest
  ): Promise<ResumeImprovementResponse> {
    try {
      await this.ensureInitialized();
      
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
        // Fallback to rule-based suggestions if no API key
        return this.generateRuleBasedSuggestions(jobTitle, jobCompany, jobDescription, relevantDocs);
      }
    } catch (error) {
      console.error('Failed to generate resume suggestions:', error);
      return {
        suggestions: [
          'Failed to generate suggestions. Please try again later.',
          'Make sure your resume highlights relevant skills and experience.',
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
      console.error('Failed to call OpenAI:', error);
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
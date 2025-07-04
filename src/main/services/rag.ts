import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { githubService } from './github';
// Remove static import and use dynamic import later
// import { pipeline } from '@xenova/transformers';
// Using dynamic import for langchain as well
// const { FaissStore } = require('langchain/vectorstores/faiss');
import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

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

interface CustomDocument extends LangChainDocument {
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
  private vectorStore: FaissStore | null = null;
  private llm: ChatOpenAI | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    console.log('Initializing RAG Service...');
    // Set up data directories
    this.dataDir = join(app.getPath('userData'), 'rag-data');
    this.vectorsDir = join(this.dataDir, 'vectors');

    // Create directories if they don't exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
      console.log('Created data directory:', this.dataDir);
    }
    if (!existsSync(this.vectorsDir)) {
      mkdirSync(this.vectorsDir, { recursive: true });
      console.log('Created vectors directory:', this.vectorsDir);
    }

    // Load user profile
    try {
      const userProfilePath = join(process.cwd(), 'data', 'user-profile.json');
      console.log('Loading user profile from:', userProfilePath);
      const userProfileRaw = readFileSync(userProfilePath, 'utf-8');
      this.userProfile = JSON.parse(userProfileRaw);
      console.log('User profile loaded successfully');
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      this.userProfile = {};
    }

    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      console.log('Initializing ChatOpenAI...');
      this.llm = new ChatOpenAI({ 
        openAIApiKey: apiKey,
        modelName: 'gpt-4',
        temperature: 0.7,
      });
      console.log('ChatOpenAI initialized successfully');
    } else {
      console.warn('No OpenAI API key found');
    }

    // Initialize the embedding model and vector store
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const { pipeline } = await import('@xenova/transformers');

      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (progress: any) => {
          // Keep download progress logs as they're useful for UX
          if (progress.status === 'downloading') {
            // Removed console.log for download progress
          }
        },
      });

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
        },
      };

      const { FaissStore } = await import('@langchain/community/vectorstores/faiss');

      this.vectorStore = await FaissStore.fromTexts(
        documents.map((doc) => doc.pageContent),
        documents.map((doc) => doc.metadata),
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
        },
      };

      const { FaissStore } = await import('@langchain/community/vectorstores/faiss');

      this.vectorStore = await FaissStore.load(this.vectorsDir, embeddingsObject);

      this.isInitialized = true;
    } catch (error) {
      // If loading fails, create a new vector store
      await this.createVectorStore();
    }
  }

  private async saveVectorStore(documents: CustomDocument[]): Promise<void> {
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

  private async prepareDocuments(): Promise<CustomDocument[]> {
    const documents: CustomDocument[] = [];

    // Add user profile as a document
    if (this.userProfile) {
      documents.push({
        pageContent: JSON.stringify(this.userProfile, null, 2),
        metadata: {
          source: 'user-profile',
          type: 'profile',
        },
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
              title: repoName,
            },
          });
        }

        // Add repository info
        documents.push({
          pageContent: `Repository: ${repoName}\nLanguages: ${Object.keys(repoData.languages || {}).join(', ')}\nDescription: ${repoData.description || repoName}`,
          metadata: {
            source: `github-repo-${repoName}`,
            type: 'repository',
            title: repoName,
          },
        });
      } catch (error) {
        // Skip failed repositories
      }
    }

    return documents;
  }

  private async embedDocuments(documents: CustomDocument[] | string[]): Promise<number[][]> {
    try {
      await this.ensureInitialized();

      let texts: string[];
      if (
        documents.length > 0 &&
        typeof documents[0] === 'object' &&
        'pageContent' in documents[0]
      ) {
        texts = (documents as CustomDocument[]).map((doc) => doc.pageContent);
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

  private async searchVectorStore(query: string, k: number = 5): Promise<CustomDocument[]> {
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
        setTimeout(
          () => reject(new Error('Vector store update timed out after 5 minutes')),
          300000
        );
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

  private createRAGPromptTemplate(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
You are an expert resume consultant. Use the following retrieved information about the candidate to generate resume suggestions.

Context from retrieved documents:
{context}

Job Details:
Title: {jobTitle}
Company: {jobCompany}
Description: {jobDescription}

Based ONLY on the retrieved context above, provide specific suggestions for improving the resume.
Each suggestion must be explicitly supported by information from the context.
If you need information that's not in the context, acknowledge the gap.

Format your response as a JSON object with these keys:
- suggestions: Array of specific improvements, each citing the supporting context
- relevantProjects: Array of project names from the context that match job requirements
- skillsToHighlight: Array of skills found in both context and job requirements
- experienceToHighlight: Array of relevant experience entries from the context

Remember:
1. Only use information from the provided context
2. Be specific about which parts of the context support each suggestion
3. Focus on matching the candidate's experience with job requirements
`);
  }

  private async createRAGChain(retriever: BaseRetriever) {
    console.log('Creating RAG chain...');
    const prompt = this.createRAGPromptTemplate();
    
    // Create the RAG chain using the modern LangChain Expression Language (LCEL)
    const chain = RunnableSequence.from([
      {
        context: async (input: any) => {
          console.log('Retrieving relevant documents for:', input.jobDescription?.substring(0, 100) + '...');
          const relevantDocs = await retriever.getRelevantDocuments(input.jobDescription);
          console.log(`Retrieved ${relevantDocs.length} relevant documents`);
          
          const context = (relevantDocs as unknown as CustomDocument[])
            .map((doc) => doc.pageContent)
            .join('\n\n');
          console.log('Combined context length:', context.length);
          return context;
        },
        jobTitle: (input: any) => input.jobTitle,
        jobCompany: (input: any) => input.jobCompany,
        jobDescription: (input: any) => input.jobDescription,
      },
      prompt,
      this.llm!,
      new StringOutputParser(),
    ]);

    console.log('RAG chain created successfully');
    return chain;
  }

  public async generateResumeSuggestions(
    request: ResumeImprovementRequest
  ): Promise<ResumeImprovementResponse> {
    console.log('Generating resume suggestions for:', request.jobTitle, 'at', request.jobCompany);
    try {
      console.log('Ensuring RAG service is initialized...');
      await this.ensureInitialized();

      if (!this.vectorStore || !this.llm) {
        throw new Error('RAG service not properly initialized');
      }

      // Create retriever with custom configuration
      console.log('Creating retriever...');
      const retriever = this.vectorStore.asRetriever({
        searchType: 'similarity',
        k: 5, // Number of documents to retrieve
      });
      console.log('Retriever created successfully');

      // Create and run the RAG chain
      console.log('Creating and running RAG chain...');
      const chain = await this.createRAGChain(retriever);
      console.log('Invoking chain with job details...');
      const result = await chain.invoke({
        jobTitle: request.jobTitle,
        jobCompany: request.jobCompany,
        jobDescription: request.jobDescription || '',
      });
      console.log('Chain execution completed. Result length:', result.length);

      // Parse and validate the response
      console.log('Parsing response...');
      const response = JSON.parse(result);
      console.log('Response parsed successfully');
      
      return {
        suggestions: response.suggestions || [],
        relevantProjects: response.relevantProjects || [],
        skillsToHighlight: response.skillsToHighlight || [],
        experienceToHighlight: response.experienceToHighlight || [],
      };
    } catch (error) {
      console.error('Error in generateResumeSuggestions:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
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
}

// Create and export a singleton instance
export const ragService = new RAGService();

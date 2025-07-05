/* eslint-disable no-useless-catch */
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
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { encryptString, decryptString } from '../utils/encryption';

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
  errorMessage?: string;
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
  private openAIEmbeddings: OpenAIEmbeddings | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private responseCache: Map<string, ResumeImprovementResponse> = new Map();

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

      // Prefer OpenAI embeddings when API key present
      try {
        this.openAIEmbeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
        console.log('OpenAIEmbeddings initialized successfully');
      } catch (embErr) {
        console.warn('Failed to initialize OpenAIEmbeddings, falling back to local model:', embErr);
      }
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

      // Fetch embeddings implementation (OpenAI or local) on demand
      const embeddingsObject = await this.getEmbeddingsObject();

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
      // Ensure documents file exists; actual contents not required for FaissStore.load
      if (!existsSync(documentsPath)) {
        throw new Error('Documents metadata missing');
      }

      const rawEnc = readFileSync(documentsPath, 'utf-8');
      const secret = process.env.DATA_ENCRYPTION_KEY;
      // Decrypt once to validate format; result not needed further
      void (secret ? decryptString(rawEnc, secret) : rawEnc);

      const embeddingsObject = await this.getEmbeddingsObject();

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
      const secret = process.env.DATA_ENCRYPTION_KEY;
      const dataStr = JSON.stringify(documents);
      const toWrite = secret ? encryptString(dataStr, secret) : dataStr;
      writeFileSync(documentsPath, toWrite, 'utf-8');

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
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });

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

    // Split large docs into smaller chunks for better retrieval
    const chunkedDocs: CustomDocument[] = [];
    for (const doc of documents) {
      if (doc.pageContent.length > 900) {
        const chunks = await splitter.splitText(doc.pageContent);
        chunks.forEach((chunk, idx) => {
          chunkedDocs.push({
            pageContent: chunk,
            metadata: { ...doc.metadata, chunk: idx },
          } as CustomDocument);
        });
      } else {
        chunkedDocs.push(doc);
      }
    }

    return chunkedDocs;
  }

  private async embedDocuments(documents: CustomDocument[] | string[]): Promise<number[][]> {
    try {
      if (this.openAIEmbeddings) {
        // Delegate embedding to OpenAIEmbeddings implementation
        const texts = Array.isArray(documents)
          ? (typeof documents[0] === 'string' ? (documents as string[]) : (documents as CustomDocument[]).map((d) => d.pageContent))
          : [];
        return this.openAIEmbeddings.embedDocuments(texts);
      }

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

  /**
   * Returns an embeddings implementation compatible with LangChain vector stores.
   * Prefers OpenAIEmbeddings when available, otherwise falls back to local MiniLM embedder.
   */
  private async getEmbeddingsObject(): Promise<any> {
    if (this.openAIEmbeddings) {
      return this.openAIEmbeddings;
    }

    // Ensure local embedder is ready
    await this.ensureInitialized();

    return {
      embedQuery: async (text: string) => {
        const { data } = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(data) as number[];
      },
      embedDocuments: async (texts: string[]) => {
        return this.embedDocuments(texts);
      },
    };
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

        // Fast path: skip rebuild if document set appears unchanged
        const existingDocsPath = join(this.vectorsDir, 'documents.json');
        let existingDocCount = 0;
        if (existsSync(existingDocsPath)) {
          try {
            const rawEnc = readFileSync(existingDocsPath, 'utf-8');
            const secret = process.env.DATA_ENCRYPTION_KEY;
            const jsonStrCount = secret ? decryptString(rawEnc, secret) : rawEnc;
            existingDocCount = JSON.parse(jsonStrCount).length;
          } catch {
            existingDocCount = 0;
          }
        }

        const newDocuments = await this.prepareDocuments();

        if (existingDocCount === newDocuments.length) {
          console.log('Vector store already up to date – skipping rebuild');
          return;
        }

        console.log(`Vector store out of date (old=${existingDocCount}, new=${newDocuments.length}). Rebuilding…`);

        // Replace documents.json with new set via createVectorStore
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
    const cacheKey = `${request.jobTitle}|${request.jobCompany}|${request.jobDescription}`;
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }
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
        searchType: 'mmr',
        k: 8, // Increased documents for MMR diversity
      });
      console.log('Retriever created successfully');

      // Create and run the RAG chain
      console.log('Creating and running RAG chain...');
      const chain = await this.createRAGChain(retriever);
      console.log('Invoking chain with job details...');
      const inputPayload = {
        jobTitle: request.jobTitle,
        jobCompany: request.jobCompany,
        jobDescription: request.jobDescription || '',
      };
      const result = await chain.invoke(inputPayload);
      console.log('Chain execution completed. Result length:', result.length);

      // Parse and validate the response
      console.log('Parsing response...');
      const response = JSON.parse(result);
      console.log('Response parsed successfully');
      
      // Basic evaluation logging (retrieved context length + response)
      try {
        const evalLogPath = join(this.dataDir, 'rag-eval-logs.jsonl');
        const logEntry = {
          timestamp: new Date().toISOString(),
          input: inputPayload,
          response,
        };
        writeFileSync(evalLogPath, JSON.stringify(logEntry) + '\n', { flag: 'a' });
      } catch (logErr) {
        console.warn('Failed to write evaluation log:', logErr);
      }

      const finalResponse: ResumeImprovementResponse = {
        suggestions: response.suggestions || [],
        relevantProjects: response.relevantProjects || [],
        skillsToHighlight: response.skillsToHighlight || [],
        experienceToHighlight: response.experienceToHighlight || [],
      };

      // Cache for future identical requests
      this.responseCache.set(cacheKey, finalResponse);

      return finalResponse;
    } catch (error) {
      console.error('Error in generateResumeSuggestions:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      return {
        suggestions: [],
        relevantProjects: [],
        skillsToHighlight: [],
        experienceToHighlight: [],
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create and export a singleton instance
export const ragService = new RAGService();

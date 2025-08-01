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

interface ReplacementSuggestion {
  sectionName: string;          // e.g., "Experience", "Skills", "Projects"
  currentContent: string;       // What's currently in the resume that should be replaced
  suggestedContent: string;     // What to replace it with
  reason: string;              // Why this replacement is recommended
  lineNumbers?: string;        // Optional line numbers in the LaTeX file
}

interface ResumeImprovementResponse {
  replacements: ReplacementSuggestion[];
  suggestions: string[];       // Keep for backward compatibility
  relevantProjects: string[];
  skillsToHighlight: string[];
  experienceToHighlight: string[];
}

interface ExperienceItemRewriteResponse {
  experienceReplacements: ReplacementSuggestion[];
}

interface ProjectHighlightResponse {
  projectRecommendations: Array<{
    projectTitle: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    suggestedPlacement: string; // Where in resume to place it
  }>;
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
  private llmO3: ChatOpenAI | null = null;
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

      // Initialize O3 model for specialized suggestions
      console.log('Initializing ChatOpenAI O3...');
      this.llmO3 = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'o3',
      });
      console.log('ChatOpenAI O3 initialized successfully');
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
You are an expert resume consultant. Analyze the candidate's resume content and provide specific replacement suggestions.

Context from retrieved documents:
{context}

Current Resume Content:
{baseResume}

Job Details:
Title: {jobTitle}
Company: {jobCompany}
Description: {jobDescription}

TASK: Analyze the current resume and provide specific replacement suggestions. For each suggestion, identify:
1. EXACTLY what current content should be replaced (quote the exact text)
2. EXACTLY what it should be replaced with
3. WHY this replacement makes the candidate more competitive for this specific job

Use ONLY information from the retrieved context. If the context doesn't contain relevant information for a replacement, don't suggest it.

Format your response as a JSON object with these keys:

- replacements: Array of objects with:
  * sectionName: The resume section (e.g., "Experience", "Skills", "Education", "Projects")
  * currentContent: The exact text from the resume that should be replaced
  * suggestedContent: The improved replacement text
  * reason: Why this replacement is better for this specific job role
  * lineNumbers: If identifiable, the approximate line numbers or LaTeX section

- suggestions: Array of general improvement suggestions
- relevantProjects: Array of project names from context that should be emphasized
- skillsToHighlight: Array of skills to emphasize based on job requirements
- experienceToHighlight: Array of experience entries to emphasize

EXAMPLE REPLACEMENT:
{{
  "sectionName": "Experience",
  "currentContent": "Developed web applications using React",
  "suggestedContent": "Built scalable React applications handling 10k+ daily users, implementing GraphQL APIs and real-time data synchronization",
  "reason": "Adds quantifiable impact and mentions specific technologies (GraphQL) mentioned in the job requirements",
  "lineNumbers": "Lines 45-47"
}}

Remember:
1. Only suggest replacements where you have specific evidence from the context
2. Make replacements job-specific and impactful
3. Include metrics and quantifiable achievements when available in context
4. Focus on content that directly addresses job requirements
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
        baseResume: (input: any) => input.baseResume,
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
        baseResume: request.baseResume,
      });
      console.log('Chain execution completed. Result length:', result.length);

      // Parse and validate the response
      console.log('Parsing response...');
      const response = JSON.parse(result);
      console.log('Response parsed successfully');
      
      return {
        replacements: response.replacements || [],
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
        replacements: [],
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

  public async rewriteExperienceItems(
    request: ResumeImprovementRequest
  ): Promise<ExperienceItemRewriteResponse> {
    console.log('Rewriting experience items using O3 for:', request.jobTitle, 'at', request.jobCompany);
    try {
      await this.ensureInitialized();

      if (!this.vectorStore || !this.llmO3) {
        throw new Error('RAG service or O3 model not properly initialized');
      }

      // Create retriever for relevant context
      const retriever = this.vectorStore.asRetriever({
        searchType: 'similarity',
        k: 8, // Get more context for better experience rewriting
      });

      // Get relevant documents
      const relevantDocs = await retriever.getRelevantDocuments(request.jobDescription || '');
      const context = (relevantDocs as unknown as CustomDocument[])
        .map((doc) => doc.pageContent)
        .join('\n\n');

      const prompt = `You are an expert resume writer specializing in rewriting experience bullet points to maximize impact for specific job applications.

CONTEXT from candidate's background:
${context}

CURRENT RESUME EXPERIENCE SECTION:
${request.baseResume}

TARGET JOB:
Title: ${request.jobTitle}
Company: ${request.jobCompany}
Description: ${request.jobDescription}

TASK: Analyze each \\item in the Experience section and provide improved replacements that:
1. Use stronger action verbs and quantifiable metrics
2. Align with the target job requirements
3. Incorporate relevant technologies/skills mentioned in the job description
4. Follow the STAR method (Situation, Task, Action, Result) when possible

RULES:
- ONLY rewrite \\item entries from the Experience section
- Preserve the LaTeX formatting (keep \\item prefix)
- Make each bullet point more impactful and job-specific
- Include quantifiable achievements when possible
- Use keywords from the job description naturally
- Keep the same general structure but enhance content

Return a JSON object with this structure:
{
  "experienceReplacements": [
    {
      "sectionName": "Experience",
      "currentContent": "\\item Exact current bullet point text",
      "suggestedContent": "\\item Enhanced bullet point with metrics and impact",
      "reason": "Detailed explanation of why this change makes the candidate more competitive",
      "lineNumbers": "Approximate line numbers in LaTeX"
    }
  ]
}

Focus on transforming weak bullet points into powerful, quantified achievements that demonstrate value and relevance to the target role.`;

      console.log('Invoking O3 for experience rewriting...');
      const result = await this.llmO3.invoke([
        { role: 'system', content: 'You are an expert resume optimization specialist with deep knowledge of ATS systems and hiring manager preferences.' },
        { role: 'user', content: prompt }
      ]);

      console.log('O3 experience rewriting completed');
      const response = JSON.parse(result.content as string);
      
      return {
        experienceReplacements: response.experienceReplacements || [],
      };
    } catch (error) {
      console.error('Error in rewriteExperienceItems:', error);
      return {
        experienceReplacements: [],
      };
    }
  }

  public async highlightRelevantProjects(
    request: ResumeImprovementRequest
  ): Promise<ProjectHighlightResponse> {
    console.log('Highlighting relevant projects using O3 for:', request.jobTitle, 'at', request.jobCompany);
    try {
      await this.ensureInitialized();

      if (!this.vectorStore || !this.llmO3) {
        throw new Error('RAG service or O3 model not properly initialized');
      }

      // Create retriever for project context
      const retriever = this.vectorStore.asRetriever({
        searchType: 'similarity',
        k: 10, // Get comprehensive project information
      });

      // Get relevant documents
      const relevantDocs = await retriever.getRelevantDocuments(
        `${request.jobDescription} projects portfolio work experience`
      );
      const context = (relevantDocs as unknown as CustomDocument[])
        .map((doc) => doc.pageContent)
        .join('\n\n');

      const prompt = `You are a career strategist specializing in project portfolio optimization for job applications.

CANDIDATE'S PROJECT PORTFOLIO:
${context}

USER PROFILE:
${JSON.stringify(this.userProfile, null, 2)}

TARGET JOB:
Title: ${request.jobTitle}
Company: ${request.jobCompany}
Description: ${request.jobDescription}

TASK: Analyze the candidate's projects and recommend which ones to highlight for this specific job application.

Consider:
1. Technical stack alignment with job requirements
2. Project complexity and scale that demonstrates relevant skills
3. Business impact and outcomes that match the role's responsibilities
4. Innovation and problem-solving aspects valued by the company
5. Team collaboration vs individual contribution based on role expectations

Return a JSON object with this structure:
{
  "projectRecommendations": [
    {
      "projectTitle": "Exact project name",
      "reason": "Detailed explanation of why this project is highly relevant to the target role",
      "priority": "high|medium|low",
      "suggestedPlacement": "Where to position this project (e.g., 'First project in Projects section', 'Include in cover letter', 'Mention in experience section')"
    }
  ]
}

Prioritize projects that:
- Use technologies/frameworks mentioned in the job description
- Solve similar problems to what the role will entail
- Demonstrate scale, impact, or complexity appropriate for the seniority level
- Show leadership, collaboration, or specific skills the job requires

Recommend 3-5 projects maximum, ordered by relevance.`;

      console.log('Invoking O3 for project highlighting...');
      const result = await this.llmO3.invoke([
        { role: 'system', content: 'You are an expert career counselor who helps candidates strategically position their projects for maximum impact.' },
        { role: 'user', content: prompt }
      ]);

      console.log('O3 project highlighting completed');
      const response = JSON.parse(result.content as string);
      
      return {
        projectRecommendations: response.projectRecommendations || [],
      };
    } catch (error) {
      console.error('Error in highlightRelevantProjects:', error);
      return {
        projectRecommendations: [],
      };
    }
  }
}

// Create and export a singleton instance
export const ragService = new RAGService();

import { readFileSync } from 'fs';
import { join } from 'path';
import { githubService } from './github';

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

class RAGService {
  private userProfile: any;

  constructor() {
    // Load user profile
    try {
      const userProfilePath = join(process.cwd(), 'data', 'user-profile.json');
      const userProfileRaw = readFileSync(userProfilePath, 'utf-8');
      this.userProfile = JSON.parse(userProfileRaw);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.userProfile = {};
    }
  }

  public async generateResumeSuggestions(
    request: ResumeImprovementRequest
  ): Promise<ResumeImprovementResponse> {
    try {
      // Get GitHub projects data
      const githubRepos = githubService.getAllRepos();
      
      // Extract job details
      const { jobTitle, jobCompany, jobDescription = '' } = request;
      
      // Build context for RAG
      const context = this.buildContext(jobTitle, jobCompany, jobDescription, githubRepos);
      
      // If OpenAI API key is available, use it to generate suggestions
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        return await this.callOpenAI(context, jobTitle, jobCompany, jobDescription);
      } else {
        // Fallback to rule-based suggestions if no API key
        return this.generateRuleBasedSuggestions(jobTitle, jobCompany, jobDescription, githubRepos);
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
    githubRepos: any[]
  ): string {
    // Extract relevant information from GitHub repos
    const repoSummaries = githubRepos.map(repo => {
      return `Project: ${repo.name}
Description: ${repo.description}
Languages: ${Object.keys(repo.languages).join(', ')}
${repo.readme ? `README Excerpt: ${repo.readme.substring(0, 300)}...` : ''}`;
    }).join('\n\n');

    // Extract relevant information from user profile
    const experienceSummary = (this.userProfile.experience || [])
      .map((exp: any) => `${exp.position} at ${exp.company} (${exp.startDate} - ${exp.endDate})
Responsibilities: ${exp.responsibilities?.join('; ')}`)
      .join('\n\n');

    const projectsSummary = (this.userProfile.projects || [])
      .map((proj: any) => `${proj.title}: ${proj.description}
Technologies: ${proj.technologies?.join(', ')}`)
      .join('\n\n');

    // Build the complete context
    return `
Job Title: ${jobTitle}
Company: ${jobCompany}
Job Description: ${jobDescription}

User Experience:
${experienceSummary}

User Projects:
${projectsSummary}

GitHub Projects:
${repoSummaries}
`;
  }

  private async callOpenAI(
    context: string,
    jobTitle: string,
    jobCompany: string,
    jobDescription: string
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
        githubService.getAllRepos()
      );
    }
  }

  private generateRuleBasedSuggestions(
    jobTitle: string,
    jobCompany: string,
    jobDescription: string,
    githubRepos: any[]
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

    // Find relevant projects based on simple keyword matching
    const relevantProjects = githubRepos
      .filter(repo => {
        const repoDescription = repo.description.toLowerCase();
        const repoLanguages = Object.keys(repo.languages).map(l => l.toLowerCase());
        
        // Check if repo matches job keywords
        return jobTitleLower.split(' ').some(word => 
          word.length > 3 && (repoDescription.includes(word) || repoLanguages.includes(word))
        ) || jobDescriptionLower.split(' ').some(word => 
          word.length > 3 && (repoDescription.includes(word) || repoLanguages.includes(word))
        );
      })
      .map(repo => repo.name);

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

    // Find relevant experience based on job title
    const experienceToHighlight = (this.userProfile.experience || [])
      .filter((exp: any) => {
        const position = exp.position.toLowerCase();
        const responsibilities = exp.responsibilities?.join(' ').toLowerCase() || '';
        
        return jobTitleLower.split(' ').some(word => 
          word.length > 3 && (position.includes(word) || responsibilities.includes(word))
        ) || jobDescriptionLower.split(' ').some(word => 
          word.length > 3 && (position.includes(word) || responsibilities.includes(word))
        );
      })
      .map((exp: any) => `${exp.position} at ${exp.company}`);

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
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import OpenAI from 'openai';
import type { Outline, Draft, Expanded, Final } from '../schemas';
import { b } from '../../baml_client';
import { getConfig } from '../config';
import { countWords } from '../markdown';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Lazy initialization of OpenAI client to ensure env vars are loaded
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for web search functionality');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export class BAMLClient {
  private static instance: BAMLClient;

  static getInstance(): BAMLClient {
    if (!BAMLClient.instance) {
      BAMLClient.instance = new BAMLClient();
    }
    return BAMLClient.instance;
  }

  /**
   * Perform deep research on a topic using OpenAI o3-deep-research model in background mode
   */
  private async deepResearchTopic(topic: string): Promise<string> {
    try {
      console.log(`DEBUG: BAML - Starting deep research for topic: ${topic}`);

      // Initiate background deep research job
      const job = await getOpenAIClient().responses.create({
        model: "o3-deep-research",
        background: true,
        tools: [
          {
            type: "web_search_preview"
          }
        ],
        input: `Conduct comprehensive deep research on "${topic}" related to RVs, recreational vehicles, camping, and outdoor lifestyle.

Research Focus Areas:
1. Technical specifications and equipment details
2. Historical development and industry trends
3. Best practices from industry experts and experienced RVers
4. Common issues, solutions, and troubleshooting guides
5. Safety regulations and compliance requirements
6. Cost analysis and budgeting considerations
7. Regional variations and geographic considerations
8. Latest innovations and emerging technologies
9. User reviews and real-world performance data
10. Professional recommendations and expert opinions

Provide authoritative, well-sourced information that would be suitable for creating a comprehensive, expert-level guide. Focus on factual accuracy, practical applicability, and actionable insights for RV enthusiasts.`
      });

      console.log(`DEBUG: BAML - Deep research job initiated with ID: ${job.id}`);

      // Poll for job completion with proper intervals
      const result = await this.pollDeepResearchJob(job.id);

      console.log(`DEBUG: BAML - Deep research completed, content length: ${result.length}`);
      return result;

    } catch (error) {
      console.warn(`WARNING: BAML - Deep research failed for topic "${topic}":`, error instanceof Error ? error.message : error);
      // Fallback to regular web search
      console.log(`DEBUG: BAML - Falling back to web search for topic: ${topic}`);
      return await this.researchTopic(topic);
    }
  }

  /**
   * Poll deep research job until completion
   */
  private async pollDeepResearchJob(jobId: string, maxWaitTime: number = 1500000, pollInterval: number = 15000): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        console.log(`DEBUG: BAML - Polling deep research job ${jobId}...`);

        const result = await getOpenAIClient().responses.retrieve(jobId);

        if (result.status === 'completed') {
          console.log(`DEBUG: BAML - Deep research job ${jobId} completed successfully`);
          return result.output_text || '';
        } else if (result.status === 'failed') {
          const errorMsg = result.error ? JSON.stringify(result.error, null, 2) : 'Unknown error';
          throw new Error(`Deep research job failed: ${errorMsg}`);
        } else if (result.status === 'cancelled') {
          throw new Error('Deep research job was cancelled');
        }

        // Job still running, wait before next poll
        console.log(`DEBUG: BAML - Job ${jobId} status: ${result.status}, waiting ${pollInterval}ms...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.warn(`WARNING: BAML - Error polling deep research job ${jobId}:`, error);
        throw error;
      }
    }

    throw new Error(`Deep research job ${jobId} timed out after ${maxWaitTime}ms`);
  }

  /**
   * Perform web research on a topic using OpenAI web search (fallback method)
   */
  private async researchTopic(topic: string): Promise<string> {
    try {
      console.log(`DEBUG: BAML - Starting web research for topic: ${topic}`);

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o-search-preview",
        web_search_options: {},
        messages: [
          {
            role: "user",
            content: `Research comprehensive information about "${topic}" related to RVs, recreational vehicles, camping, and outdoor lifestyle. Focus on factual, educational content that would be useful for creating an authoritative guide. Include technical details, history, best practices, common issues, and expert recommendations.`
          }
        ]
      });

      const researchContent = response.choices[0]?.message?.content || '';
      console.log(`DEBUG: BAML - Knowledge research completed, content length: ${researchContent.length}`);
      return researchContent;

    } catch (error) {
      console.warn(`WARNING: BAML - Web research failed for topic "${topic}":`, error);
      return `Research unavailable for topic: ${topic}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  async generateOutline(topic: string, cluster: string = '', saveResearch?: (data: string) => Promise<void>): Promise<Outline> {
    // Check if we already have research data in cluster
    const hasResearchData = cluster && cluster.length > 1000; // Assume cluster with substantial data is research

    let researchData: string;

    if (hasResearchData) {
      console.log(`DEBUG: BAML - Using existing research data (${cluster.length} chars)`);
      researchData = cluster;
    } else {
      // Perform research before generating outline (deep research or web search based on config)
      const config = getConfig();

      if (config.features.deepResearch) {
        console.log(`DEBUG: BAML - Performing deep research for topic: ${topic}`);
        researchData = await this.deepResearchTopic(topic);
      } else {
        console.log(`DEBUG: BAML - Performing web search for topic: ${topic}`);
        researchData = await this.researchTopic(topic);
      }

      // Save research data immediately to prevent loss
      if (saveResearch && researchData.length > 50) {
        console.log(`DEBUG: BAML - Saving research data (${researchData.length} chars)`);
        await saveResearch(researchData);
      }
    }

    // Use research data as cluster context, fallback to provided cluster if research fails
    const clusterContext = researchData.length > 50 ? researchData : cluster || 'No additional context available';

    console.log(`DEBUG: BAML - Generating outline with research context (${clusterContext.length} chars)`);

    // Call BAML function with research-enhanced cluster data
    return await b.GenerateOutline(topic, clusterContext);
  }

  async generateDraft(outline: Outline): Promise<Draft> {
    // Pre-compute dynamic values from outline - handle the nested structure correctly
    const targetWordCount = outline.metadata?.wordcountTarget
      ? Math.floor(outline.metadata.wordcountTarget * 0.6)
      : 1200;

    const funnelStage = outline.funnel || 'TOF';
    const searchIntent = outline.intent || 'informational';

    // Get funnel description
    const getFunnelDescription = (funnel: string): string => {
      switch (funnel) {
        case 'TOF': return 'Educational, awareness content';
        case 'MOF': return 'Comparative, evaluation content';
        case 'BOF': return 'Decision, action content';
        default: return 'General audience content';
      }
    };

    const funnelDescription = getFunnelDescription(funnelStage);

    // Debug log to verify values
    console.log('DEBUG: Draft generation parameters:', {
      targetWordCount,
      funnelStage,
      searchIntent,
      funnelDescription,
      outlineStructure: {
        hasMetadata: !!outline.metadata,
        wordcountTarget: outline.metadata?.wordcountTarget,
        funnel: outline.funnel,
        intent: outline.intent
      }
    });

    // Call BAML function with computed parameters
    return await b.GenerateDraft(outline, targetWordCount, funnelStage, searchIntent, funnelDescription);
  }

  async expandDraft(draft: Draft): Promise<Expanded> {
    // Pre-compute dynamic values from draft content
    const currentLength = (draft.markdownContent || draft.content || '').length;
    const currentWordCount = countWords(draft.markdownContent || draft.content || '');

    // Use outline target or calculate based on current content
    const outlineTarget = draft.frontmatter?.wordcountTarget || 1500;
    const targetWordCount = Math.floor(Math.max(outlineTarget, currentWordCount * 2)); // At least 2x growth
    const targetLength = Math.floor(targetWordCount * 5); // ~5 chars per word

    console.log('DEBUG: Expansion parameters:', {
      currentWordCount,
      outlineTarget,
      targetWordCount,
      currentLength,
      targetLength
    });

    // Call BAML function with computed parameters
    const result = await b.ExpandDraft(draft, currentLength, targetLength, currentWordCount, targetWordCount);

    // Validate word count requirement was met
    const resultWordCount = countWords(result.markdownContent || result.content || '');
    console.log(`DEBUG: Expansion result - Target: ${targetWordCount}, Actual: ${resultWordCount}`);

    if (resultWordCount < targetWordCount * 0.8) {
      console.warn(`WARNING: Expansion result (${resultWordCount} words) is below 80% of target (${targetWordCount} words)`);

      // Multiple retry attempts with increasing targets
      let bestResult = result;
      let bestWordCount = resultWordCount;

      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`DEBUG: Attempting expansion retry ${attempt}/3 with stricter requirements...`);
        const multiplier = 1.2 + (attempt * 0.2); // 1.4, 1.6, 1.8
        const retryTargetWordCount = Math.floor(targetWordCount * multiplier);
        const retryTargetLength = Math.floor(targetLength * multiplier);

        try {
          const retryResult = await b.ExpandDraft(draft, currentLength, retryTargetLength, currentWordCount, retryTargetWordCount);
          const retryWordCount = countWords(retryResult.markdownContent || retryResult.content || '');

          console.log(`DEBUG: Retry ${attempt} result - Target: ${retryTargetWordCount}, Actual: ${retryWordCount}`);

          if (retryWordCount > bestWordCount) {
            bestResult = retryResult;
            bestWordCount = retryWordCount;
            console.log(`DEBUG: Retry ${attempt} improved word count to ${retryWordCount}`);

            // If we hit 90% of original target, that's good enough
            if (retryWordCount >= targetWordCount * 0.9) {
              console.log(`DEBUG: Retry ${attempt} achieved 90% of target, using this result`);
              break;
            }
          }
        } catch (error) {
          console.warn(`WARNING: Retry ${attempt} failed:`, error instanceof Error ? error.message : error);
        }
      }

      if (bestWordCount > resultWordCount) {
        console.log(`DEBUG: Best retry result: ${bestWordCount} words (improvement from ${resultWordCount})`);
        return bestResult;
      } else {
        console.warn(`WARNING: All retries failed to improve word count. Using original result with ${resultWordCount} words.`);
      }
    }

    return result;
  }

  async polishContent(expanded: Expanded): Promise<Expanded> {
    // Pre-compute dynamic values from expanded content
    const currentWordCount = countWords(expanded.markdownContent || expanded.content || '');

    // Determine readability target based on content complexity
    const readabilityTarget = expanded.frontmatter?.difficulty === 'Advanced'
      ? '10th-12th grade'
      : '8th-10th grade';

    // Call BAML function with computed parameters
    return await b.PolishContent(expanded, currentWordCount, readabilityTarget);
  }

  async finalizeContent(expanded: Expanded): Promise<Final> {
    // Pre-compute dynamic values for SEO optimization
    const currentWordCount = countWords(expanded.markdownContent || expanded.content || '');
    const titleLength = expanded.frontmatter?.title?.length || 0;
    const descriptionLength = expanded.frontmatter?.description?.length || 0;

    // Call BAML function with computed parameters
    return await b.FinalizeContent(expanded, currentWordCount, titleLength, descriptionLength);
  }
}
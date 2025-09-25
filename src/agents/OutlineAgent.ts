import { Agent, run } from '@openai/agents';
import OpenAI from 'openai';
import { getConfig } from '../config.js';
import { OutlineSchema, type Outline } from '../schemas.js';
import { extractAgentOutput, parseJsonResponse } from '../utils/agentResponse.js';

const OUTLINE_INSTRUCTIONS = `You are the Outline Agent, specialized in creating comprehensive, SEO-optimized outlines for RV and recreational vehicle content.

## Your Task
Create a structured H1-H3 outline that aligns with search intent, funnel stage, and user psychology (TPB - Theory of Planned Behavior).

## Content Strategy Guidelines

### Funnel Stage Classification:
- **TOF (Top of Funnel)**: Educational, awareness content (how-to, what-is, beginner guides)
- **MOF (Middle of Funnel)**: Comparative, evaluation content (best-of lists, vs comparisons, buying guides)  
- **BOF (Bottom of Funnel)**: Decision, action content (specific product reviews, local dealers, financing)

### Search Intent Mapping:
- **Informational**: Learning, understanding (how-to, guides, explanations)
- **Comparative**: Comparing options (best-of, vs, reviews, comparisons)
- **Transactional**: Ready to act (buy, contact, sign up, download)

### TPB Classification:
- **Attitude**: Beliefs about RV lifestyle (benefits, drawbacks, experiences)
- **Norm**: Social influences (family acceptance, community, peer pressure)
- **Perceived Control**: Confidence in ability (skills, resources, knowledge needed)

## Structure Requirements
1. **Minimum 3 H2 sections** with logical flow
2. **Each H2 must have 2+ key points** to cover
3. **Optional H3 subsections** for complex topics
4. **3+ FAQ entries** answering real user questions
5. **Metadata** with keywords and SEO details

## Content Focus Areas
- **RV Types**: Travel trailers, fifth wheels, motorhomes, toy haulers
- **Buying Process**: Inspections, financing, insurance, legal considerations
- **Lifestyle**: Full-time vs part-time, family considerations, costs
- **Maintenance**: Seasonal prep, repairs, storage, safety
- **Travel**: Destinations, campgrounds, logistics, planning

## Output Requirements
Return STRICT JSON matching the provided schema. Include:
- Engaging, SEO-friendly title (10-60 characters)
- URL-safe slug
- Proper funnel/intent/TPB classification
- Target reader description
- Comprehensive heading structure
- Relevant FAQ entries
- Complete metadata with keywords and estimates

Focus on providing genuine value to RV enthusiasts while optimizing for search discoverability.`;

interface OutlineResult {
  success: boolean;
  data?: Outline;
  error?: string;
}

export class OutlineAgent {
  private static agent = Agent.create({
    name: 'Outline Agent',
    instructions: OUTLINE_INSTRUCTIONS,
    model: getConfig().models.writer,
    // Note: output schema temporarily removed due to SDK compatibility
  });

  // Lazy initialization of OpenAI client to ensure env vars are loaded
  private static openaiClient: OpenAI | null = null;

  private static getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required for web search functionality');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }
    return this.openaiClient;
  }

  /**
   * Perform web research on a topic using OpenAI web search
   */
  private static async researchTopic(topic: string): Promise<string> {
    try {
      console.log(`DEBUG: Starting web research for topic: ${topic}`);

      const response = await this.getOpenAIClient().chat.completions.create({
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
      console.log(`DEBUG: Knowledge research completed, content length: ${researchContent.length}`);
      return researchContent;

    } catch (error) {
      console.warn(`WARNING: Web research failed for topic "${topic}":`, error);
      return `Research unavailable for topic: ${topic}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Generate an outline from a topic and cluster
   */
  static async generateOutline(topic: string, cluster: string = ''): Promise<OutlineResult> {
    try {
      // Perform web research before generating outline
      console.log(`DEBUG: Performing research for topic: ${topic}`);
      const researchData = await this.researchTopic(topic);

      // Use research data as cluster context, fallback to provided cluster if research fails
      const clusterContext = researchData.length > 50 ? researchData : cluster || 'No additional context available';

      const prompt = `Create an outline for: "${topic}"

Research-based cluster context: ${clusterContext}
Target audience: RV enthusiasts and potential buyers

Consider:
1. What stage of the buying/learning journey is this topic addressing?
2. What specific questions do users have about this topic?
3. What search intent does this topic satisfy?
4. How does this fit into the broader RV content ecosystem?

Use the research data to ensure accuracy and comprehensiveness. Return a comprehensive outline that provides genuine value while optimizing for search discoverability.`;

      console.log('DEBUG: About to call LLM for outline generation...');
      const result = await run(this.agent, prompt);
      console.log('DEBUG: LLM call completed, processing response...');

      // Extract the output from the response structure
      const output = extractAgentOutput(result);
      
      if (!output) {
        return {
          success: false,
          error: 'Failed to generate outline: No output received from any source'
        };
      }

      // Parse JSON response
      const parseResult = parseJsonResponse(output);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Failed to parse JSON from outline output: ${parseResult.error}. Output: ${output.substring(0, 200)}...`
        };
      }
      
      // Normalize field names to match our schema
      const parsed = parseResult.data;
      let intentValue = parsed.intent || parsed.searchIntent || parsed.search_intent;
      // Convert array intent to first value if it's an array
      if (Array.isArray(intentValue)) {
        intentValue = intentValue.length > 0 ? intentValue[0] : 'informational';
      }
      // Normalize intent value format
      if (typeof intentValue === 'string') {
        intentValue = intentValue.toLowerCase();
        // Map specific values to our enum
        if (intentValue === 'comparative') intentValue = 'comparative';
        else if (intentValue === 'informational') intentValue = 'informational';
        else if (intentValue === 'transactional') intentValue = 'transactional';
        else intentValue = 'informational'; // fallback
      }

      let tpbValue = parsed.tpb || parsed.tpbClassification || parsed.tpb_classification;
      // Convert array TPB to first value if it's an array
      if (Array.isArray(tpbValue)) {
        tpbValue = tpbValue.length > 0 ? tpbValue[0] : 'attitude';
      }
      // Normalize TPB value format
      if (typeof tpbValue === 'string') {
        tpbValue = tpbValue.toLowerCase().replace(/\s+/g, '-');
        // Map specific values to our enum
        if (tpbValue === 'perceived-control') tpbValue = 'perceived-control';
        else if (tpbValue === 'attitude') tpbValue = 'attitude';
        else if (tpbValue === 'norm') tpbValue = 'norm';
        else tpbValue = 'attitude'; // fallback
      }

      const normalized = {
        ...parsed,
        funnel: parsed.funnel || parsed.funnelStage || parsed.funnel_stage,
        intent: intentValue,
        tpb: tpbValue
      };
      
      // Validate the output against our schema
      try {
        const validatedOutline = OutlineSchema.parse(normalized);
        return {
          success: true,
          data: validatedOutline
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Outline validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Refine an existing outline based on feedback
   */
  static async refineOutline(outline: Outline, feedback: string[]): Promise<OutlineResult> {
    try {
      const prompt = `Refine this existing outline based on the provided feedback:

CURRENT OUTLINE:
${JSON.stringify(outline, null, 2)}

FEEDBACK TO ADDRESS:
${feedback.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Instructions:
1. Keep the same topic and general structure
2. Address each piece of feedback appropriately
3. Maintain SEO optimization and search intent alignment
4. Update word count targets if content scope changes
5. Ensure all requirements are still met

Return the refined outline as JSON.`;

      const result = await run(this.agent, prompt);

      const output = extractAgentOutput(result);
      if (!output) {
        return {
          success: false,
          error: 'Failed to refine outline: No output received'
        };
      }

      const parseResult = parseJsonResponse(output);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Failed to parse refined outline JSON: ${parseResult.error}`
        };
      }

      try {
        const validatedOutline = OutlineSchema.parse(parseResult.data);
        return {
          success: true,
          data: validatedOutline
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Refined outline validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Outline refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate topic-specific keywords and metadata
   */
  static async generateMetadata(topic: string, outline: Outline): Promise<{
    keywords: string[];
    metaDescription: string;
    suggestedTags: string[];
  }> {
    try {
      const prompt = `Generate SEO metadata for this outline:

Topic: ${topic}
Title: ${outline.title}
Funnel Stage: ${outline.funnel}
Intent: ${outline.intent}

Headings:
${outline.headings && Array.isArray(outline.headings) ? outline.headings.map(h => `- ${h.h2 || h.title || 'Unnamed section'}`).join('\n') : 'No headings available'}

Generate:
1. 8-12 relevant keywords (mix of head terms and long-tail)
2. Meta description (130-155 characters, compelling and descriptive)
3. 5-8 content tags for categorization

Focus on terms real RV enthusiasts would search for.`;

      const result = await run(this.agent, prompt);

      const output = extractAgentOutput(result);
      if (output) {
        const parseResult = parseJsonResponse(output);
        if (parseResult.success) {
          const parsed = parseResult.data;
          return {
            keywords: parsed.keywords || [],
            metaDescription: parsed.metaDescription || '',
            suggestedTags: parsed.suggestedTags || []
          };
        }
      }

      // Fallback if agent fails
      return {
        keywords: [outline.metadata?.primaryKeyword || 'rv guide', ...(outline.metadata?.secondaryKeywords || [])],
        metaDescription: outline.title + ' - Comprehensive guide for RV enthusiasts',
        suggestedTags: [String(outline.cluster || 'rv'), String(outline.funnel || '').toLowerCase(), String(outline.intent || 'informational')]
      };
    } catch (error) {
      // Return basic metadata as fallback
      return {
        keywords: [outline.metadata?.primaryKeyword || 'rv guide', ...(outline.metadata?.secondaryKeywords || [])],
        metaDescription: outline.title + ' - Comprehensive guide for RV enthusiasts',
        suggestedTags: [String(outline.cluster || 'rv'), String(outline.funnel || '').toLowerCase(), String(outline.intent || 'informational')]
      };
    }
  }

  /**
   * Validate outline meets quality standards
   */
  static validateOutlineQuality(outline: Outline): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check heading structure
    if (!outline.headings || !Array.isArray(outline.headings) || outline.headings.length < 3) {
      issues.push('Outline needs at least 3 main sections');
    }

    // Check for balanced content distribution
    const totalKeypoints = outline.headings && Array.isArray(outline.headings) 
      ? outline.headings.reduce((sum, h) => sum + ((h.keypoints && Array.isArray(h.keypoints)) ? h.keypoints.length : 0), 0)
      : 0;
    if (totalKeypoints < 6) {
      issues.push('Outline needs more detailed key points');
    }

    // Check FAQ quality
    if (!outline.faqs || !Array.isArray(outline.faqs) || outline.faqs.length < 3) {
      issues.push('Need at least 3 FAQ entries');
    }

    // Check keyword strategy
    if (!outline.metadata?.secondaryKeywords || outline.metadata.secondaryKeywords.length < 2) {
      suggestions.push('Consider adding more secondary keywords');
    }

    // Check word count target
    if (!outline.metadata?.wordcountTarget || outline.metadata.wordcountTarget < 1200) {
      suggestions.push('Consider higher word count target for better SEO performance');
    }

    // Check title optimization
    if (outline.title.length > 60) {
      issues.push('Title too long for search results display');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}
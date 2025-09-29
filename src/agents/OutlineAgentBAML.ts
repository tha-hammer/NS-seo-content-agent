import { BAMLClient } from '../baml/client';
import { OutlineSchema, type Outline } from '../schemas';

interface OutlineResult {
  success: boolean;
  data?: Outline;
  error?: string;
}

export class OutlineAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Generate an outline using BAML structured output
   */
  static async generateOutline(topic: string, cluster: string, saveResearch?: (data: string) => Promise<void>, runId?: string): Promise<OutlineResult> {
    try {
      console.log('DEBUG: About to call BAML for outline generation...');
      console.log(`DEBUG: OutlineAgentBAML received saveResearch callback: ${!!saveResearch}, runId: ${runId}`);
      const result = await this.bamlClient.generateOutline(topic, cluster, saveResearch, runId);
      console.log('DEBUG: BAML call completed, validating response...');

      // Validate the output against our schema
      try {
        const validatedOutline = OutlineSchema.parse(result);
        return {
          success: true,
          data: validatedOutline
        };
      } catch (validationError) {
        return {
          success: false,
          error: `BAML outline validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `BAML outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
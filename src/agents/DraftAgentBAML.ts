import { BAMLClient } from '../baml/client';
import { DraftSchema, type Draft, type Outline } from '../schemas';

interface DraftResult {
  success: boolean;
  data?: Draft;
  error?: string;
}

export class DraftAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Generate a draft using BAML structured output
   */
  static async generateDraft(outline: Outline): Promise<DraftResult> {
    try {
      console.log('DEBUG: About to call BAML for draft generation...');
      const result = await this.bamlClient.generateDraft(outline);
      console.log('DEBUG: BAML call completed, validating response...');

      // Validate the output against our schema
      try {
        const validatedDraft = DraftSchema.parse(result);
        return {
          success: true,
          data: validatedDraft
        };
      } catch (validationError) {
        return {
          success: false,
          error: `BAML draft validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `BAML draft generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate draft meets quality standards
   */
  static validateDraftQuality(draft: Draft): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check frontmatter
    if (!draft.frontmatter.title || draft.frontmatter.title.length < 10) {
      issues.push('Title too short');
    }

    if (!draft.frontmatter.description || draft.frontmatter.description.length < 50) {
      issues.push('Description too short');
    }

    // Check content length - use markdownContent or content
    const content = draft.markdownContent || draft.content;
    if (!content || content.length < 800) {
      issues.push('Content too short for initial draft');
    }

    // Check for H1
    if (!content?.includes('# ')) {
      issues.push('Content missing H1 heading');
    }

    // Check for H2 sections
    const h2Count = (content?.match(/## /g) || []).length;
    if (h2Count < 3) {
      issues.push('Draft needs at least 3 main sections');
    }

    // Check for citation markers
    const citationMarkers = (content?.match(/\[\d+\]/g) || []).length;
    if (citationMarkers === 0) {
      suggestions.push('Consider adding citation markers for key claims');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}
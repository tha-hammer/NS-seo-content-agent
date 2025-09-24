import { BAMLClient } from '../baml/client';
import { ExpandedSchema, type Expanded, type Draft } from '../schemas';

interface ExpandResult {
  success: boolean;
  data?: Expanded;
  error?: string;
}

export class ExpandAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Expand a draft using BAML structured output
   */
  static async expandDraft(draft: Draft): Promise<ExpandResult> {
    try {
      console.log('DEBUG: About to call BAML for expanded generation...');
      const result = await this.bamlClient.expandDraft(draft);
      console.log('DEBUG: BAML call completed, validating response...');

      // Validate the output against our schema
      try {
        const validatedExpanded = ExpandedSchema.parse(result);
        return {
          success: true,
          data: validatedExpanded
        };
      } catch (validationError) {
        return {
          success: false,
          error: `BAML expanded validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `BAML expand generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate expanded content meets quality standards
   */
  static validateExpandedQuality(expanded: Expanded): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check content length (should be substantially longer than draft) - use markdownContent or content
    const content = expanded.markdownContent || expanded.content;
    if (!content || content.length < 1200) {
      issues.push('Content too short for expanded draft');
    }

    // Check for tables
    const tableCount = (content?.match(/\|.*\|/g) || []).length;
    if (tableCount < 6) { // At least 2 tables with 3+ rows each
      issues.push('No tables or structured data found');
    }

    // Check for checklists
    const checklistItems = (content?.match(/- \[ \]/g) || []).length;
    if (checklistItems < 3) {
      suggestions.push('Consider adding more actionable checklists');
    }

    // Check for image placeholders
    if (!expanded.imagePlaceholders || expanded.imagePlaceholders.length === 0) {
      issues.push('No image placeholders provided');
    } else if (expanded.imagePlaceholders.length < 2) {
      suggestions.push('Consider adding more strategic image placements');
    }

    // Validate image placeholders
    if (expanded.imagePlaceholders) {
      expanded.imagePlaceholders.forEach((img, index) => {
        if (!img.altText || img.altText.length < 10) {
          issues.push(`Image ${index + 1} alt text too short`);
        }
        if (!img.position || img.position.length < 5) {
          issues.push(`Image ${index + 1} missing proper position indicator`);
        }
      });
    }

    // Check E-E-A-T signals
    if (!expanded.eatSignals?.authorBio) {
      issues.push('Missing author bio for E-E-A-T');
    }

    if (!expanded.eatSignals?.factChecked) {
      suggestions.push('Consider adding fact-checking verification');
    }

    // Check evidence quality
    if (!expanded.evidence?.claims || expanded.evidence.claims.length === 0) {
      issues.push('No factual claims mapped to sources');
    }

    if (!expanded.evidence?.expertQuotes || expanded.evidence.expertQuotes.length === 0) {
      suggestions.push('Consider adding expert quotes for authority');
    }

    // Check for examples and case studies
    const exampleIndicators = [
      'example:', 'case study:', 'meet the', 'consider the', 'scenario:',
      'for instance', 'let\'s say', 'imagine'
    ];
    const hasExamples = exampleIndicators.some(indicator =>
      content?.toLowerCase().includes(indicator)
    );

    if (!hasExamples) {
      issues.push('No practical examples or case studies found');
    }

    // Check content depth (should have substantial sections)
    const h2Count = (content?.match(/## /g) || []).length;
    const h3Count = (content?.match(/### /g) || []).length;

    if (h2Count < 3) {
      issues.push('Insufficient main sections for comprehensive coverage');
    }

    if (h3Count < 2) {
      suggestions.push('Consider adding subsections for better organization');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}
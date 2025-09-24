import { BAMLClient } from '../baml/client';
import { ExpandedSchema, type Expanded } from '../schemas';

interface PolishResult {
  success: boolean;
  data?: Expanded;
  error?: string;
}

export class PolishAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Polish expanded content using BAML structured output
   */
  static async polishContent(expanded: Expanded): Promise<PolishResult> {
    try {
      console.log('DEBUG: About to call BAML for polished generation...');
      const result = await this.bamlClient.polishContent(expanded);
      console.log('DEBUG: BAML call completed, validating response...');

      // Validate the output against our schema
      try {
        const validatedPolished = ExpandedSchema.parse(result);
        return {
          success: true,
          data: validatedPolished
        };
      } catch (validationError) {
        return {
          success: false,
          error: `BAML polished validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `BAML polish generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate polished content meets quality standards
   */
  static validatePolishQuality(polished: Expanded): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for repetitive language
    const content = polished.markdownContent || polished.content || '';
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const repetitivePatterns = this.detectRepetition(sentences);
    if (repetitivePatterns.length > 0) {
      issues.push('Content has repetitive language');
    }

    // Check for PAA questions
    const paaQuestionCount = (content.match(/\*\*[^*]+\?\*\*/g) || []).length;
    if (paaQuestionCount < 3) {
      issues.push('No PAA questions answered');
    }

    // Check heading quality
    const headings = content.match(/^#{1,3}\s+.+$/gm) || [];
    const poorHeadings = headings.filter(h => {
      const text = h.replace(/^#{1,3}\s+/, '');
      return text.length < 5 || text.toLowerCase().includes('stuff') || text.toLowerCase().includes('things');
    });

    if (poorHeadings.length > 0) {
      issues.push('Headings need improvement');
    }

    // Check for inclusive language issues
    const inclusiveCheck = this.checkInclusiveLanguage(content);
    if (inclusiveCheck.hasIssues) {
      issues.push('Content contains non-inclusive language');
    }

    // Check scannability
    const bulletPoints = (content.match(/^[\s]*[-*+]/gm) || []).length;
    const boldText = (content.match(/\*\*[^*]+\*\*/g) || []).length;

    if (bulletPoints < 3) {
      suggestions.push('Add more bullet points for better scannability');
    }

    if (boldText < 5) {
      suggestions.push('Add more bold emphasis for key terms');
    }

    // Check content length (should maintain expanded length)
    if (polished.content.length < 1200) {
      issues.push('Content too short after polishing');
    }

    // Check for clear structure
    const h2Count = (polished.content.match(/## /g) || []).length;
    const tablesCount = (polished.content.match(/\|.*\|/g) || []).length;

    if (h2Count < 3) {
      issues.push('Insufficient main sections');
    }

    if (tablesCount < 6) { // At least 2 tables with 3+ rows
      suggestions.push('Maintain structured data tables from expansion');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Check content for inclusive language issues
   */
  static checkInclusiveLanguage(content: string): {
    hasIssues: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const lowercaseContent = content.toLowerCase();

    // Check for gendered language
    const genderedTerms = [
      { term: 'guys', suggestion: 'everyone, folks, or people' },
      { term: 'ladies and gentlemen', suggestion: 'everyone or folks' },
      { term: 'man-made', suggestion: 'manufactured or artificial' },
      { term: 'mankind', suggestion: 'humanity or people' }
    ];

    genderedTerms.forEach(({ term, suggestion }) => {
      if (lowercaseContent.includes(term)) {
        issues.push(`Use gender-neutral language instead of "${term}"`);
        suggestions.push(`Consider: ${suggestion}`);
      }
    });

    // Check for gendered pronouns in generic contexts
    const genericHe = content.match(/\b(when a man|if he|his RV|a guy who)\b/gi);
    if (genericHe && genericHe.length > 0) {
      issues.push('Use gender-neutral pronouns in generic examples');
      suggestions.push('Consider: "When someone buys their first RV"');
    }

    // Check for assumptions about family structure
    if (lowercaseContent.includes('husband and wife') && !lowercaseContent.includes('partner')) {
      suggestions.push('Consider including diverse family structures');
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      suggestions
    };
  }

  /**
   * Detect repetitive language patterns
   */
  private static detectRepetition(sentences: string[]): string[] {
    const repetitivePatterns: string[] = [];

    // Check for repeated sentence starters
    const starters = sentences.map(s => {
      const words = s.trim().split(/\s+/);
      return words.slice(0, 3).join(' ').toLowerCase();
    });

    const starterCounts = starters.reduce((acc, starter) => {
      acc[starter] = (acc[starter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(starterCounts).forEach(([starter, count]) => {
      if (count > 2 && starter.length > 5) {
        repetitivePatterns.push(`Repeated sentence starter: "${starter}"`);
      }
    });

    // Check for repeated phrases
    const commonWords = ['rv', 'rvs', 'family', 'families', 'travel', 'trailer'];
    commonWords.forEach(word => {
      const wordCount = (sentences.join(' ').toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      const sentenceCount = sentences.length;
      if (sentenceCount > 0 && wordCount / sentenceCount > 0.3) {
        repetitivePatterns.push(`Overuse of word: "${word}"`);
      }
    });

    return repetitivePatterns;
  }
}
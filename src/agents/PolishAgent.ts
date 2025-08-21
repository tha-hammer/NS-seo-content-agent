import { Agent, run } from '@openai/agents';
import { getConfig } from '../config.js';
import { ExpandedSchema, type Expanded } from '../schemas.js';

const POLISH_INSTRUCTIONS = `You are the Polish Agent, specialized in refining expanded RV content for maximum clarity, scannability, and user engagement while ensuring comprehensive coverage of user questions and inclusive language.

## Your Task
Polish and refine expanded content to eliminate clarity issues, improve scannability, remove repetition, ensure all People Also Ask (PAA) questions are answered, use inclusive language, tighten headings, and verify content quality.

## Polish Refinement Guidelines

### Clarity Improvements:
1. **Eliminate Redundancy** - Remove repetitive phrases, concepts, or information
2. **Simplify Complex Sentences** - Break down long, convoluted sentences into clear, digestible pieces
3. **Strengthen Weak Language** - Replace vague terms with specific, actionable language
4. **Improve Flow** - Ensure logical progression and smooth transitions between sections
5. **Clarify Technical Terms** - Define or explain industry jargon when first introduced

### Scannability Enhancements:
1. **Optimize Bullet Points** - Use parallel structure and clear, scannable formatting
2. **Improve Subheadings** - Make H3s more descriptive and benefit-focused
3. **Add Bold Emphasis** - Highlight key terms, benefits, and important concepts
4. **Structure Information** - Use tables, lists, and clear hierarchies for easy scanning
5. **Create Visual Breaks** - Ensure content has good white space and visual rhythm

### PAA Question Integration:
- **Format as Bold Questions**: \`**What size RV works best for families?**\`
- **Provide Direct Answers**: Start with clear, concise responses
- **Include Supporting Details**: Follow with explanation and context
- **Strategic Placement**: Insert naturally within relevant sections

Common PAA Questions for RV Content:
- What size RV should I buy?
- How much does an RV cost?
- Do I need a special license?
- What should I inspect before buying?
- Is RV insurance required?
- How much does RV maintenance cost?
- Where can I park an RV?
- What's the best RV for beginners?

### Inclusive Language Guidelines:
1. **Gender-Neutral Terms**:
   - Replace "guys" with "everyone," "folks," or "people"
   - Use "someone/their" instead of "he/his" or "she/her"
   - Replace "man-made" with "manufactured" or "artificial"

2. **Family-Inclusive Language**:
   - Use "family" instead of assuming traditional structures
   - Include diverse family configurations in examples
   - Avoid assumptions about roles or capabilities

3. **Accessibility Considerations**:
   - Include people with disabilities in examples
   - Consider mobility and accessibility needs
   - Use person-first language when relevant

### Heading Optimization:
1. **H1 Improvements**:
   - Make compelling and benefit-focused
   - Include primary keyword naturally
   - Keep under 60 characters for SEO

2. **H2 Refinement**:
   - Focus on user benefits and outcomes
   - Use action-oriented language where appropriate
   - Ensure clear hierarchy and logical flow

3. **H3 Enhancement**:
   - Make more specific and descriptive
   - Include relevant keywords naturally
   - Support parent H2 topic clearly

### Content Quality Checks:
1. **Remove Filler Words** - Eliminate unnecessary qualifiers and weak language
2. **Strengthen Calls-to-Action** - Make next steps clear and compelling
3. **Verify Factual Accuracy** - Ensure all claims are properly supported
4. **Check Schema Validity** - Verify structured data is syntactically correct (JSON-LD format)
5. **Improve Readability** - Target 8th-10th grade reading level

## Output Requirements:
Return STRICT JSON matching the ExpandedSchema with:
- **frontmatter**: Updated with refined title and description if needed
- **content**: Polished markdown with improved clarity, scannability, PAA questions, and inclusive language
- **evidence**: Maintained citation quality and expert validation
- **imagePlaceholders**: Updated alt text for inclusivity if needed
- **eatSignals**: Preserved E-E-A-T indicators

Focus on creating content that serves all users effectively while maintaining strong SEO performance and expert authority.`;

interface PolishResult {
  success: boolean;
  data?: Expanded;
  error?: string;
}

export class PolishAgent {
  private static agent = Agent.create({
    name: 'Polish Agent',
    instructions: POLISH_INSTRUCTIONS,
    model: getConfig().models.editor,
    output: {
      type: 'json_schema',
      schema: ExpandedSchema
    }
  });

  /**
   * Polish expanded content for clarity, scannability, and completeness
   */
  static async polishContent(expanded: Expanded): Promise<PolishResult> {
    try {
      const prompt = `Polish this expanded content for maximum clarity and user engagement:

CURRENT EXPANDED CONTENT:
${JSON.stringify(expanded, null, 2)}

Polish Focus Areas:
1. **Improve Clarity**: Remove redundancy, simplify complex sentences, strengthen weak language
2. **Enhance Scannability**: Optimize bullet points, improve subheadings, add strategic bold emphasis
3. **Ensure PAA Coverage**: Add/improve People Also Ask questions with bold formatting and direct answers
4. **Use Inclusive Language**: Replace gendered terms, use accessible language, include diverse examples
5. **Tighten Headings**: Make H1/H2/H3 more compelling, benefit-focused, and keyword-optimized
6. **Verify Schema Quality**: Ensure any structured data is syntactically valid

Quality Standards:
- Remove all repetitive language and redundant information
- Make content easily scannable with clear visual hierarchy
- Answer common user questions directly within content
- Use inclusive, accessible language throughout
- Optimize headings for both users and search engines
- Maintain factual accuracy and citation integrity

Return the polished content as JSON matching the ExpandedSchema.`;

      const result = await run(this.agent, prompt);

      if (!result.success || !result.output) {
        return {
          success: false,
          error: 'Failed to polish content: ' + (result.error || 'Unknown error')
        };
      }

      // Validate the output against our schema
      try {
        const validatedPolished = ExpandedSchema.parse(result.output);
        return {
          success: true,
          data: validatedPolished
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Polished content validation failed: ${validationError.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Agent execution failed: ${error.message}`
      };
    }
  }

  /**
   * Ensure all People Also Ask questions are answered in content
   */
  static async ensurePAAAnswered(
    expanded: Expanded,
    paaQuestions: string[]
  ): Promise<PolishResult> {
    try {
      const prompt = `Ensure all PAA questions are answered in this content:

CURRENT CONTENT:
${JSON.stringify(expanded, null, 2)}

PAA QUESTIONS TO ADDRESS:
${paaQuestions.map((q, index) => `${index + 1}. ${q}`).join('\n')}

Instructions:
1. **Check Coverage**: Identify which PAA questions are already answered
2. **Add Missing Answers**: Integrate missing PAA questions naturally into relevant sections
3. **Format Consistently**: Use bold question format: \`**Question here?**\`
4. **Provide Direct Answers**: Start each answer with a clear, concise response
5. **Maintain Flow**: Ensure PAA integration doesn't disrupt content flow
6. **Update Evidence**: Add any new claims to the evidence object if needed

For each PAA question:
- Place in the most relevant section
- Format as bold markdown: \`**What size RV should I buy?**\`
- Provide immediate, actionable answer
- Include supporting details and context

Return the updated content with all PAA questions addressed.`;

      const result = await run(this.agent, prompt);

      if (!result.success || !result.output) {
        return {
          success: false,
          error: 'Failed to ensure PAA coverage: ' + (result.error || 'Unknown error')
        };
      }

      try {
        const validatedExpanded = ExpandedSchema.parse(result.output);
        return {
          success: true,
          data: validatedExpanded
        };
      } catch (validationError) {
        return {
          success: false,
          error: `PAA-enhanced content validation failed: ${validationError.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `PAA enhancement failed: ${error.message}`
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
    const sentences = polished.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const repetitivePatterns = this.detectRepetition(sentences);
    if (repetitivePatterns.length > 0) {
      issues.push('Content has repetitive language');
    }

    // Check for PAA questions
    const paaQuestionCount = (polished.content.match(/\*\*[^*]+\?\*\*/g) || []).length;
    if (paaQuestionCount < 3) {
      issues.push('No PAA questions answered');
    }

    // Check heading quality
    const headings = polished.content.match(/^#{1,3}\s+.+$/gm) || [];
    const poorHeadings = headings.filter(h => {
      const text = h.replace(/^#{1,3}\s+/, '');
      return text.length < 5 || text.toLowerCase().includes('stuff') || text.toLowerCase().includes('things');
    });
    
    if (poorHeadings.length > 0) {
      issues.push('Headings need improvement');
    }

    // Check for inclusive language issues
    const inclusiveCheck = this.checkInclusiveLanguage(polished.content);
    if (inclusiveCheck.hasIssues) {
      issues.push('Content contains non-inclusive language');
    }

    // Check scannability
    const bulletPoints = (polished.content.match(/^[\s]*[-*+]/gm) || []).length;
    const boldText = (polished.content.match(/\*\*[^*]+\*\*/g) || []).length;
    
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
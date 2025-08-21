import { Agent, run } from '@openai/agents';
import { getConfig } from '../config.js';
import { DraftSchema, type Draft, type Outline } from '../schemas.js';

const DRAFT_INSTRUCTIONS = `You are the Draft Agent, specialized in creating concise, well-cited initial draft content from structured outlines for RV and recreational vehicle topics.

## Your Task
Write concise, source-cited paragraphs per section based on the provided outline. Lead each section with a 40-60 word direct answer for featured snippets. Add footnote-style citation markers for key claims.

## Content Creation Guidelines

### Writing Style:
- **Concise and focused** - Write clear, direct paragraphs without fluff
- **Reading Level**: Maintain 8th-10th grade reading level
- **Direct answers first** - Start each section with a 40-60 word direct answer to the main question
- **Citation-heavy** - Include footnote markers [1], [2], etc. for all factual claims
- **Actionable content** - Provide specific, practical guidance readers can use

### Structure Requirements:
1. **H1 Title** from outline
2. **Introduction paragraph** with overview and scope
3. **Section content** for each H2 from outline:
   - Lead with 40-60 word direct answer
   - Follow with supporting paragraphs
   - Include citation markers for claims
4. **FAQ blocks** if specified in outline
5. **How-to blocks** when relevant step-by-step content exists

### Citation Format:
- Use footnote-style markers: [1], [2], [3], etc.
- Place after factual claims, statistics, or expert opinions
- Citations will be resolved to actual links later in the pipeline

### Content Guidelines:
- **Word Count**: Target around 60% of outline's specified word count (this is initial draft)
- **Paragraph Length**: 3-5 sentences per paragraph maximum
- **Expertise Signals**: Include RV industry terminology appropriately
- **User Intent**: Match content depth to search intent and funnel stage

## Output Requirements
Return STRICT JSON matching the provided schema:
- frontmatter: Complete frontmatter object from outline
- content: Markdown-formatted content string with H1, H2s, paragraphs, and citation markers
- faqBlocks: Array of FAQ objects if outline includes FAQs
- howtoBlocks: Array of how-to objects if step-by-step content is appropriate

Focus on creating a solid foundation that will be expanded by later agents in the pipeline.`;

interface DraftResult {
  success: boolean;
  data?: Draft;
  error?: string;
}

export class DraftAgent {
  private static agent = Agent.create({
    name: 'Draft Agent',
    instructions: DRAFT_INSTRUCTIONS,
    model: getConfig().models.writer,
    output: {
      type: 'json_schema',
      schema: DraftSchema
    }
  });

  /**
   * Generate a draft from an outline
   */
  static async generateDraft(outline: Outline): Promise<DraftResult> {
    try {
      const prompt = `Create a concise initial draft for this outline:

OUTLINE:
${JSON.stringify(outline, null, 2)}

Requirements:
- Target word count: ${Math.floor(outline.metadata.wordcountTarget * 0.6)} words (60% of final target)
- Funnel stage: ${outline.funnel} (${getFunnelDescription(outline.funnel)})
- Search intent: ${outline.intent}
- Target reader: ${outline.targetReader}
- Reading level: 8th-10th grade

Structure:
1. Create frontmatter object using outline metadata
2. Write markdown content with:
   - H1: ${outline.title}
   - Introduction paragraph (overview and scope)
   - H2 sections from outline, each starting with 40-60 word direct answer
   - Citation markers [1], [2], etc. for factual claims
3. Include faqBlocks array if outline has FAQs
4. Include howtoBlocks if step-by-step content is appropriate

Focus on clear, concise paragraphs that will be expanded later in the pipeline.`;

      const result = await run(this.agent, prompt);

      const output = result.state._currentStep?.output;
      if (!output) {
        return {
          success: false,
          error: 'Failed to generate draft: No output received'
        };
      }

      // Validate the output against our schema
      try {
        const validatedDraft = DraftSchema.parse(JSON.parse(output));
        return {
          success: true,
          data: validatedDraft
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Draft validation failed: ${validationError.message}`
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
   * Enhance an existing draft with additional content or improvements
   */
  static async enhanceDraft(draft: Draft, enhancements: string[]): Promise<DraftResult> {
    try {
      const prompt = `Enhance this existing draft based on the provided requirements:

CURRENT DRAFT:
${JSON.stringify(draft, null, 2)}

ENHANCEMENT REQUESTS:
${enhancements.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Instructions:
1. Keep the existing frontmatter and overall structure
2. Enhance the content markdown with requested improvements
3. Add more citation markers where needed
4. Maintain 8th-10th grade reading level
5. Keep sections concise but more detailed
6. Update FAQ or how-to blocks if relevant

Return the enhanced draft as JSON matching the schema.`;

      const result = await run(this.agent, prompt);

      const output = result.state._currentStep?.output;
      if (!output) {
        return {
          success: false,
          error: 'Failed to enhance draft: No output received'
        };
      }

      try {
        const validatedDraft = DraftSchema.parse(JSON.parse(output));
        return {
          success: true,
          data: validatedDraft
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Enhanced draft validation failed: ${validationError.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Draft enhancement failed: ${error.message}`
      };
    }
  }

  /**
   * Add citation markers to draft content
   */
  static async addExpertQuote(
    draft: Draft,
    expertInfo: {
      name: string;
      credentials: string;
      topic: string;
    }
  ): Promise<DraftResult> {
    try {
      const prompt = `Add an expert quote to this draft content:

CURRENT DRAFT:
${JSON.stringify(draft, null, 2)}

EXPERT INFORMATION:
- Name: ${expertInfo.name}
- Credentials: ${expertInfo.credentials}
- Topic expertise: ${expertInfo.topic}

Instructions:
1. Integrate a relevant expert quote into the content markdown
2. Use this format: "Expert quote here." - Expert Name, Credentials
3. Place the quote where it adds most value to the content
4. Add a citation marker [X] after the quote
5. Keep the existing frontmatter and structure

Return the updated draft as JSON.`;

      const result = await run(this.agent, prompt);

      const output = result.state._currentStep?.output;
      if (!output) {
        return {
          success: false,
          error: 'Failed to add expert quote: No output received'
        };
      }

      try {
        const validatedDraft = DraftSchema.parse(JSON.parse(output));
        return {
          success: true,
          data: validatedDraft
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Draft with expert quote validation failed: ${validationError.message}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Adding expert quote failed: ${error.message}`
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

    // Check content length
    if (!draft.content || draft.content.length < 800) {
      issues.push('Content too short for initial draft');
    }

    // Check for H1
    if (!draft.content.includes('# ')) {
      issues.push('Content missing H1 heading');
    }

    // Check for H2 sections
    const h2Count = (draft.content.match(/## /g) || []).length;
    if (h2Count < 3) {
      issues.push('Draft needs at least 3 main sections');
    }

    // Check for citation markers
    const citationMarkers = (draft.content.match(/\[\d+\]/g) || []).length;
    if (citationMarkers === 0) {
      suggestions.push('Consider adding citation markers for key claims');
    }

    // Check FAQ blocks
    if (draft.faqBlocks && draft.faqBlocks.length > 0) {
      draft.faqBlocks.forEach((faq, index) => {
        if (faq.answer.length < 40 || faq.answer.length > 60) {
          issues.push(`FAQ ${index + 1} answer should be 40-60 words for featured snippets`);
        }
      });
    }

    // Check for direct answers (should start sections)
    const sections = draft.content.split('## ').slice(1); // Skip before first H2
    sections.forEach((section, index) => {
      const firstParagraph = section.split('\n\n')[1] || '';
      if (firstParagraph.split(' ').length < 40) {
        suggestions.push(`Section ${index + 1} could start with a longer direct answer (40-60 words)`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}

/**
 * Get funnel stage description for prompting
 */
function getFunnelDescription(funnel: string): string {
  switch (funnel) {
    case 'TOF':
      return 'Top of Funnel - Educational, awareness content for beginners';
    case 'MOF':
      return 'Middle of Funnel - Comparative, evaluation content for decision-making';
    case 'BOF':
      return 'Bottom of Funnel - Action-oriented content for purchase-ready users';
    default:
      return 'Unknown funnel stage';
  }
}
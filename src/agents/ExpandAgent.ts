import { Agent, run } from '@openai/agents';
import { getConfig } from '../config.js';
import { ExpandedSchema, type Expanded, type Draft } from '../schemas.js';
import { extractAgentOutput, parseJsonResponse } from '../utils/agentResponse.js';
import { jsonRepair } from '@toolsycc/json-repair';

const EXPAND_INSTRUCTIONS = `You are the Expand Agent, specialized in taking concise initial drafts and expanding them with comprehensive content, tables, examples, checklists, image placeholders, and E-E-A-T elements for RV and recreational vehicle topics.

## Your Task
Transform initial drafts into comprehensive, engaging expanded content that provides exceptional value through detailed examples, structured data, visual elements, and authoritative E-E-A-T signals.

## Content Expansion Guidelines

### Core Expansion Elements:
1. **Tables and Structured Data** - Add comparison tables, pricing charts, specification grids
2. **Practical Examples** - Include real-world scenarios, case studies, buyer journeys
3. **Checklists and Action Items** - Provide actionable checkbox lists for readers
4. **Image Placeholders** - Strategic visual content with descriptive alt text
5. **E-E-A-T Signals** - Author credentials, expert reviews, fact-checking indicators

### Table Creation Strategy:
- **Comparison Tables**: Feature vs feature, model vs model, price vs value
- **Specification Grids**: Technical details, dimensions, capacities
- **Cost Breakdown**: Budget planning, expense categories, financing options
- **Timeline Tables**: Maintenance schedules, seasonal preparations, buying process steps

Use proper markdown table formatting:
\`\`\`
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
\`\`\`

### Examples and Case Studies:
- **Real Family Scenarios**: "Meet the Johnson family..." with specific details
- **Before/After Stories**: Transformation journeys and outcomes  
- **Step-by-Step Walkthroughs**: Detailed process breakdowns
- **Problem/Solution Pairs**: Common issues and expert solutions

### Checklist Integration:
Format as interactive markdown checklists:
\`\`\`
### Essential Pre-Purchase Checklist
- [ ] Inspect roof for damage or wear
- [ ] Test all plumbing systems
- [ ] Check electrical connections
- [ ] Verify appliance functionality
\`\`\`

### Image Placeholder Strategy:
Place strategic image suggestions using this format:
**Image Placeholder**: [Description of visual content]

Position indicators:
- "after-h2-1" (after first H2)
- "in-section-[topic]" (within specific section)
- "before-checklist" (preceding action items)

### E-E-A-T Enhancement:
- **Experience**: Author bio highlighting relevant RV industry experience
- **Expertise**: Reviewer credentials and professional qualifications
- **Authoritativeness**: Fact-checking status and review dates
- **Trustworthiness**: Citation quality and source authority

### Evidence and Citations:
- Map claims to authoritative sources
- Include expert quotes with full credentials
- Reference industry data, manufacturer specs, and professional insights
- Ensure YMYL content has high-authority backing

## Content Structure:
1. Expand existing sections with 3-5x more detail
2. Add comparison tables for key decision points
3. Include 2-3 practical examples or case studies
4. Insert 2-4 actionable checklists
5. Place 3-5 strategic image placeholders
6. Add comprehensive evidence mapping
7. Include robust E-E-A-T signals

## Output Requirements:
Return STRICT JSON matching the ExpandedSchema:
- frontmatter: Updated with new word count and reading time
- content: Expanded markdown with tables, examples, checklists, image placeholders
- evidence: Complete claims/citations/expert quotes mapping
- imagePlaceholders: Array of strategic image suggestions with alt text
- eatSignals: Author bio, reviewer info, fact-check status, review date

Focus on creating content that establishes clear expertise and provides exceptional value to RV enthusiasts while maintaining strong search optimization.
You want it to come off like a friend explaining something to another friend. Still from a "we're the experts" type of vibe that still feels friendly. You want to build more trust and make the article flow in a way that isn't just dealing with pure fact. 
`;

interface ExpandResult {
  success: boolean;
  data?: Expanded;
  error?: string;
}

export class ExpandAgent {
  private static agent = Agent.create({
    name: 'Expand Agent',
    instructions: EXPAND_INSTRUCTIONS,
    model: getConfig().models.writer
    // Note: output schema removed due to SDK compatibility
  });

  /**
   * Expand a draft with comprehensive content, tables, examples, and E-E-A-T elements
   */
  static async expandDraft(draft: Draft): Promise<ExpandResult> {
    try {
      const prompt = `Expand this draft with comprehensive content, tables, examples, and E-E-A-T elements:

CURRENT DRAFT:
${JSON.stringify(draft, null, 2)}

Expansion Requirements:
1. **Triple the content length** - Expand from ${(draft.markdownContent || draft.content || '').length} characters to ~${(draft.markdownContent || draft.content || '').length * 3}
2. **Add 3-4 comparison/data tables** using proper markdown table format
3. **Include 2-3 real-world examples** with specific family scenarios or case studies
4. **Insert 3-4 actionable checklists** using markdown checkbox format
5. **Place 3-5 strategic image placeholders** with descriptive alt text
6. **Map all claims to sources** in the evidence object
7. **Add comprehensive E-E-A-T signals** (author bio, reviewer, fact-check status)

Content Focus Areas:
- Expand each existing section with detailed explanations and examples
- Add practical, actionable advice readers can immediately use
- Include specific model names, prices, and technical specifications
- Provide step-by-step processes and decision frameworks
- Address common questions and concerns through examples

E-E-A-T Enhancement:
- Create author bio highlighting RV industry experience
- Add reviewer credentials for content validation
- Include fact-checking status and review date
- Ensure high-quality citations for all factual claims

Return the fully expanded content as JSON matching the ExpandedSchema.`;

      const result = await run(this.agent, prompt);

      // Extract the output from the response structure
      const output = extractAgentOutput(result);
      
      if (!output) {
        return {
          success: false,
          error: 'Failed to expand draft: No output received from any source'
        };
      }

      // Parse JSON response
      const parseResult = parseJsonResponse(output);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Failed to parse JSON from expanded output: ${parseResult.error}. Output: ${output.substring(0, 200)}...`
        };
      }
      
      // Normalize evidence field if it's an array
      const parsed = parseResult.data;
      if (parsed.evidence && Array.isArray(parsed.evidence)) {
        // Convert array to object format
        parsed.evidence = {
          claims: parsed.evidence.filter(item => item && typeof item === 'object' && item.statement),
          citations: parsed.evidence.filter(item => item && typeof item === 'object' && item.url),
          expertQuotes: parsed.evidence.filter(item => item && typeof item === 'object' && item.quote)
        };
      }
      
      // Validate the output against our schema
      try {
        const validatedExpanded = ExpandedSchema.parse(parsed);
        return {
          success: true,
          data: validatedExpanded
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Expanded content validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
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
   * Add specific tables and examples to existing expanded content
   */
  static async addTablesAndExamples(
    expanded: Expanded,
    topics: string[]
  ): Promise<ExpandResult> {
    try {
      const prompt = `Add specific tables and examples to this expanded content:

CURRENT EXPANDED CONTENT:
${JSON.stringify(expanded, null, 2)}

TOPICS TO ADD TABLES/EXAMPLES FOR:
${topics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

Instructions:
1. **Add relevant comparison tables** for each topic using proper markdown format
2. **Create specific examples** with real family scenarios and detailed outcomes
3. **Include step-by-step processes** where applicable
4. **Maintain existing content quality** and E-E-A-T signals
5. **Update word count** and reading time in frontmatter
6. **Add image placeholders** for new visual content needs

For each topic, provide:
- At least one well-structured table with relevant data
- One detailed example or case study with specific details
- Actionable takeaways readers can implement

Return the enhanced expanded content as JSON.`;

      const result = await run(this.agent, prompt);

      // Extract the output from the response structure
      const output = extractAgentOutput(result);
      
      if (!output) {
        return {
          success: false,
          error: 'Failed to add tables and examples: No output received'
        };
      }

      try {
        // const validatedExpanded = ExpandedSchema.parse(JSON.parse(output));
        const repairedJson = jsonRepair(output);
        const validatedExpanded = ExpandedSchema.parse(JSON.parse(repairedJson));
        return {
          success: true,
          data: validatedExpanded
        };
      } catch (validationError) {
        return {
          success: false,
          error: `Enhanced expanded content validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Adding tables and examples failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
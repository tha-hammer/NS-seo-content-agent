import { describe, it, expect } from 'vitest';
import { run, Agent } from '@openai/agents';
import { getConfig } from '@/config';

// Real LLM call test to understand actual output structures
describe('Schema Flexibility - Real LLM Output Analysis', () => {
  
  describe('DraftAgent Output Structure', () => {
    it('should analyze real DraftAgent LLM output structure', async () => {
      const agent = Agent.create({
        name: 'Draft Agent Test',
        instructions: `Create a JSON draft for RV content with:
        - frontmatter object (title, description, date, author, etc.)
        - markdownContent string
        - faqBlocks array (if any)
        - howtoBlocks array (if any)
        
        Be natural - don't worry about exact field names or constraints.`,
        model: getConfig().models.writer,
        output: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              frontmatter: { type: 'object' },
              markdownContent: { type: 'string' },
              faqBlocks: { type: 'array' },
              howtoBlocks: { type: 'array' }
            },
            additionalProperties: true
          }
        }
      });

      const mockOutline = {
        title: 'Best Budget RVs Under $30k',
        slug: 'best-budget-rvs-under-30k',
        funnel: 'MOF',
        intent: 'comparative',
        tpb: 'attitude',
        targetReader: 'Budget-conscious RV buyers',
        headings: [
          { h2: 'Introduction', keypoints: ['Overview', 'Scope'] },
          { h2: 'Top Picks', keypoints: ['Travel trailers', 'Class C RVs'] },
          { h2: 'Buying Tips', keypoints: ['Inspection', 'Financing'] }
        ],
        faqs: [
          { q: 'Can I buy a reliable RV for under $30k?', a_outline: 'Yes, with careful selection' }
        ],
        metadata: {
          primaryKeyword: 'budget RVs under 30k',
          secondaryKeywords: ['cheap RVs', 'affordable travel trailers'],
          suggestedUrl: '/best-budget-rvs-under-30k',
          wordcountTarget: 2000,
          estimatedReadTime: 10
        }
      };

      const prompt = `Create a draft from this outline: ${JSON.stringify(mockOutline)}`;
      
      const result = await run(agent, prompt);
      const output = result.state._currentStep?.output || 
                    result.state._generatedItems?.[result.state._generatedItems.length - 1]?.rawItem?.content?.[0]?.text ||
                    result.state._modelResponses?.[0]?.output?.[0]?.content?.[0]?.text;

      expect(output).toBeDefined();
      
      const parsed = JSON.parse(output);
      console.log('DraftAgent actual structure:', Object.keys(parsed));
      console.log('Frontmatter keys:', Object.keys(parsed.frontmatter || {}));
      console.log('FAQ structure:', parsed.faqBlocks?.[0] ? Object.keys(parsed.faqBlocks[0]) : 'No FAQs');
      console.log('HowTo structure:', parsed.howtoBlocks?.[0] ? Object.keys(parsed.howtoBlocks[0]) : 'No HowTos');

      // Test that basic structure exists
      expect(parsed).toHaveProperty('frontmatter');
      expect(parsed).toHaveProperty('markdownContent');
      expect(typeof parsed.markdownContent).toBe('string');
      
    }, 30000);
  });

  describe('ExpandAgent Output Structure', () => {
    it('should analyze real ExpandAgent LLM output structure', async () => {
      const agent = Agent.create({
        name: 'Expand Agent Test',
        instructions: `Expand a draft with additional content, tables, examples. Return JSON with:
        - All the original draft fields
        - Enhanced markdownContent 
        - imageBlocks array (if any)
        - tableBlocks array (if any)
        
        Be natural with field names and structures.`,
        model: getConfig().models.writer,
        output: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      });

      const mockDraft = {
        frontmatter: {
          title: 'Best Budget RVs Under $30k',
          description: 'Find reliable RVs under $30,000',
          date: '2025-01-01',
          author: 'RV Expert'
        },
        markdownContent: '# Best Budget RVs Under $30k\n\nBrief content here...',
        faqBlocks: [
          { question: 'Are cheap RVs reliable?', answer: 'Yes, with proper inspection.' }
        ]
      };

      const prompt = `Expand this draft with more content: ${JSON.stringify(mockDraft)}`;
      
      const result = await run(agent, prompt);
      const output = result.state._currentStep?.output || 
                    result.state._generatedItems?.[result.state._generatedItems.length - 1]?.rawItem?.content?.[0]?.text ||
                    result.state._modelResponses?.[0]?.output?.[0]?.content?.[0]?.text;

      expect(output).toBeDefined();
      
      const parsed = JSON.parse(output);
      console.log('ExpandAgent actual structure:', Object.keys(parsed));
      
      // Test basic expansion happened
      expect(parsed.markdownContent.length).toBeGreaterThan(100);
      
    }, 30000);
  });

  describe('FinalizeAgent Output Structure', () => {
    it('should analyze real FinalizeAgent LLM output structure', async () => {
      const agent = Agent.create({
        name: 'Finalize Agent Test',
        instructions: `Finalize content for publication. Return JSON with final optimized content.`,
        model: getConfig().models.editor,
        output: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      });

      const mockExpanded = {
        frontmatter: {
          title: 'Best Budget RVs Under $30k',
          description: 'Find reliable RVs under $30,000'
        },
        markdownContent: '# Best Budget RVs Under $30k\n\nExpanded content with details...'
      };

      const prompt = `Finalize this content: ${JSON.stringify(mockExpanded)}`;
      
      const result = await run(agent, prompt);
      const output = result.state._currentStep?.output || 
                    result.state._generatedItems?.[result.state._generatedItems.length - 1]?.rawItem?.content?.[0]?.text ||
                    result.state._modelResponses?.[0]?.output?.[0]?.content?.[0]?.text;

      expect(output).toBeDefined();
      
      const parsed = JSON.parse(output);
      console.log('FinalizeAgent actual structure:', Object.keys(parsed));
      
      // Test that content exists
      expect(parsed).toHaveProperty('markdownContent');
      
    }, 30000);
  });

  describe('PublisherAgent Output Structure', () => {
    it('should analyze real PublisherAgent LLM output structure', async () => {
      const agent = Agent.create({
        name: 'Publisher Agent Test',
        instructions: `Prepare content for publication. Return JSON with publication details.`,
        model: getConfig().models.editor,
        output: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: true
          }
        }
      });

      const mockFinal = {
        frontmatter: {
          title: 'Best Budget RVs Under $30k',
          description: 'Find reliable RVs under $30,000'
        },
        markdownContent: '# Best Budget RVs Under $30k\n\nFinal optimized content...'
      };

      const prompt = `Prepare for publication: ${JSON.stringify(mockFinal)}`;
      
      const result = await run(agent, prompt);
      const output = result.state._currentStep?.output || 
                    result.state._generatedItems?.[result.state._generatedItems.length - 1]?.rawItem?.content?.[0]?.text ||
                    result.state._modelResponses?.[0]?.output?.[0]?.content?.[0]?.text;

      expect(output).toBeDefined();
      
      const parsed = JSON.parse(output);
      console.log('PublisherAgent actual structure:', Object.keys(parsed));
      
      // Test that publication data exists
      expect(parsed).toBeDefined();
      
    }, 30000);
  });
});
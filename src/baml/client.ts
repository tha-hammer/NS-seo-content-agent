import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import type { Outline, Draft, Expanded, Final } from '../schemas';
import { b } from '../../baml_client';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class BAMLClient {
  private static instance: BAMLClient;

  static getInstance(): BAMLClient {
    if (!BAMLClient.instance) {
      BAMLClient.instance = new BAMLClient();
    }
    return BAMLClient.instance;
  }

  async generateOutline(topic: string, cluster: string): Promise<Outline> {
    // Call BAML function directly for outline generation (no dynamic parameters needed)
    return await b.GenerateOutline(topic, cluster);
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
    const currentWordCount = currentLength ? Math.floor(currentLength / 5) : 0; // ~5 chars per word

    // Use outline target or calculate based on current content
    const outlineTarget = draft.frontmatter?.wordcountTarget || 1500;
    const targetWordCount = Math.max(outlineTarget, currentWordCount * 2); // At least 2x growth
    const targetLength = targetWordCount * 5; // ~5 chars per word

    console.log('DEBUG: Expansion parameters:', {
      currentWordCount,
      outlineTarget,
      targetWordCount,
      currentLength,
      targetLength
    });

    // Call BAML function with computed parameters
    return await b.ExpandDraft(draft, currentLength, targetLength, currentWordCount, targetWordCount);
  }

  async polishContent(expanded: Expanded): Promise<Expanded> {
    // Pre-compute dynamic values from expanded content
    const currentWordCount = (expanded.markdownContent || expanded.content || '').split(/\s+/).length;

    // Determine readability target based on content complexity
    const readabilityTarget = expanded.frontmatter?.difficulty === 'Advanced'
      ? '10th-12th grade'
      : '8th-10th grade';

    // Call BAML function with computed parameters
    return await b.PolishContent(expanded, currentWordCount, readabilityTarget);
  }

  async finalizeContent(expanded: Expanded): Promise<Final> {
    // Pre-compute dynamic values for SEO optimization
    const currentWordCount = (expanded.markdownContent || expanded.content || '').split(/\s+/).length;
    const titleLength = expanded.frontmatter?.title?.length || 0;
    const descriptionLength = expanded.frontmatter?.description?.length || 0;

    // Call BAML function with computed parameters
    return await b.FinalizeContent(expanded, currentWordCount, titleLength, descriptionLength);
  }
}
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
    const prompt = `You are the Outline Agent, specialized in creating comprehensive, SEO-optimized outlines for RV (recreational vehicle) content.

Goal

Produce a JSON object matching the exact Outline schema below—no extra keys, no commentary, no markdown—tailored to the given ${topic} and ${cluster}. Optimize for search intent, funnel stage, and user psychology using the Theory of Planned Behavior (TPB).

Inputs

topic: ${topic}

cluster: ${cluster}

(Optional hints if provided in the user’s request: funnel stage, intent, tpb)

Allowed taxonomies (normalize if hints differ)

funnel: one of "TOF" | "MOF" | "BOF"

intent: one of "informational" | "comparative" | "transactional"

tpb: one of "attitude" | "norm" | "perceived_control"

Auto-classification heuristics (if not explicitly provided)

If topic includes “what is”, “how to”, “guide”, “beginner” → funnel="TOF", intent="informational".

If topic includes “best”, “vs”, “compare”, “reviews” → funnel="MOF", intent="comparative".

If topic includes “price”, “dealer”, “for sale”, “financing”, “near me” → funnel="BOF", intent="transactional".

RV domain guidance

Use precise RV terminology (e.g., Class A/B/C, travel trailer, fifth-wheel, GVWR/GCWR, tow rating, floorplans, hookups, boondocking, depreciation, storage, insurance, warranty, financing). Prefer U.S. English.

Style & structure rules

Minimum 3 H2 sections; each H2 has 2–5 keypoints.

Optional H3s under an H2 are allowed (0–5). If none, return an empty array [].

Avoid generic headers like “Introduction” or “Conclusion.” Make H2s specific and benefit-driven.

Bake TPB into sections:

attitude: benefits/drawbacks, outcomes, experiences.

norm: family/community acceptance, campground culture, peer examples.

perceived_control: step-by-steps, checklists, costs/time/tools required.

FAQs: 3–6 concise, practical Q&As. Keep answers ≤ ~60 words. If you add an answer outline, put it in a_outline; otherwise set a_outline to null.

SEO rules

title: Title Case, ≤ 70 characters, include a clear benefit or primary keyword.

slug: kebab-case, lowercase, ≤ 60 characters, alphanumeric + hyphens only.

metadata.primaryKeyword: must include “rv” or a close synonym (e.g., “motorhome”, “travel trailer”) relevant to the topic.

metadata.secondaryKeywords: 6–12 unique terms mixing head & long-tail (questions welcome). No duplicates; avoid brand names unless central to the topic.

metadata.wordcountTarget: 900–1,800 for TOF/MOF; 1,100–2,200 for BOF.

metadata.readingTime: compute as ceil(wordcountTarget / 200) (minutes).

metadata.difficulty: one of "Beginner" | "Intermediate" | "Advanced".

{
  "outline": {
    "title": string,
    "slug": string,
    "cluster": string,You are the Polish Agent, specialized in refining expanded RV content for maximum clarity, scannability, and user engagement while ensuring comprehensive coverage of user questions and inclusive language.

## Your Task
Polish and refine expanded content to eliminate clarity issues, improve scannability, remove repetition, ensure all People Also Ask (PAA) questions are answered, use inclusive language, tighten headings, and verify content quality.
    "tpb": "attitude" | "norm" | "perceived_control",
    "targetReader": "RV enthusiasts and potential buyers",
    "headings": [
      {
        "h2": string,
        "keypoints": [string, ...], 
        "h3": [string, ...] 
      }
    ],
    "faqs": [
      { "q": string, "a": string, "a_outline": string | null }
    ],
    "metadata": {
      "primaryKeyword": string,
      "secondaryKeywords": [string, ...],
      "wordcountTarget": number,
      "readingTime": number,
      "difficulty": "Beginner" | "Intermediate" | "Advanced"
    }
  }
}
Quality checklist (perform silently before returning JSON)

Taxonomy normalized exactly to allowed enums (case and underscores match).

H2 count ≥ 3, each with ≥ 2 keypoints; h3 present as [] if unused.

No filler headers; each H2 advances the search task and aligns with the chosen funnel, intent, and tpb.

TPB cues present in keypoints/H3s (e.g., steps/tools for control, social proof for norm).

Slug is valid kebab-case; title ≤ 70 chars; readingTime = ceil(wordcount/200).

Metadata includes strong, non-duplicate secondary keywords relevant to the topic.

Return JSON only. No trailing commas, no extra fields, no markdown.

Task

Create the outline for:

topic: ${topic}

cluster: ${cluster}

Return the JSON object only.`;

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          slug: { type: 'string' },
          cluster: { type: 'string' },
          funnel: { type: 'string', enum: ['TOF', 'MOF', 'BOF'] },
          intent: { type: 'string', enum: ['informational', 'comparative', 'transactional'] },
          tpb: { type: 'string', enum: ['attitude', 'norm', 'perceived-control'] },
          targetReader: { type: 'string' },
          headings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                h2: { type: 'string' },
                keypoints: { type: 'array', items: { type: 'string' } },
                h3: { type: 'array', items: { type: 'string' } }
              },
              required: ['h2', 'keypoints']
            }
          },
          faqs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                q: { type: 'string' },
                a: { type: 'string' },
                a_outline: { type: 'string' }
              },
              required: ['q', 'a']
            }
          },
          metadata: {
            type: 'object',
            properties: {
              primaryKeyword: { type: 'string' },
              secondaryKeywords: { type: 'array', items: { type: 'string' } },
              wordcountTarget: { type: 'number' },
              readingTime: { type: 'number' },
              difficulty: { type: 'string' }
            },
            required: ['primaryKeyword', 'secondaryKeywords', 'wordcountTarget', 'readingTime', 'difficulty']
          }
        },
        required: ['title', 'slug', 'cluster', 'funnel', 'intent', 'tpb', 'targetReader', 'headings', 'faqs', 'metadata']
      },
      temperature: 0.1,
    });

    return object as Outline;
  }

  async generateDraft(outline: Outline): Promise<Draft> {
    // Pre-compute dynamic values from outline
    const targetWordCount = outline.metadata?.wordcountTarget
      ? Math.floor(outline.metadata.wordcountTarget * 0.6)
      : 1200;

    const funnelStage = outline.funnel || 'Unknown';
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

    // Call BAML function with computed parameters
    return await b.GenerateDraft(outline, targetWordCount, funnelStage, searchIntent, funnelDescription);
  }

  async expandDraft(draft: Draft): Promise<Expanded> {
    // Pre-compute dynamic values from draft content
    const currentLength = (draft.markdownContent || draft.content || '').length;
    const targetLength = currentLength * 3;
    const currentWordCount = currentLength ? Math.floor(currentLength / 5) : 0; // ~5 chars per word
    const targetWordCount = currentWordCount * 3;

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
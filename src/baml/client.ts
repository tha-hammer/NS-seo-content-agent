import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import type { Outline, Draft, Expanded, Final } from '../schemas';

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
    const prompt = `You are the Outline Agent, specialized in creating comprehensive, SEO-optimized outlines for RV and recreational vehicle content.

## Your Task
Create a structured H1-H3 outline that aligns with search intent, funnel stage, and user psychology (TPB - Theory of Planned Behavior).

## Content Strategy Guidelines

### Funnel Stage Classification:
- **TOF (Top of Funnel)**: Educational, awareness content (how-to, what-is, beginner guides)
- **MOF (Middle of Funnel)**: Comparative, evaluation content (best-of lists, vs comparisons, buying guides)
- **BOF (Bottom of Funnel)**: Decision, action content (specific product reviews, local dealers, financing)

### Search Intent Mapping:
- **informational**: Learning, understanding (how-to, guides, explanations)
- **comparative**: Comparing options (best-of, vs, reviews, comparisons)
- **transactional**: Ready to act (buy, contact, sign up, download)

### TPB Classification:
- **attitude**: Beliefs about RV lifestyle (benefits, drawbacks, experiences)
- **norm**: Social influences (family acceptance, community, peer pressure)
- **perceived-control**: Confidence in ability (skills, resources, knowledge needed)

## Structure Requirements
1. **Minimum 3 H2 sections** with logical flow
2. **Each H2 must have 2+ key points** to cover
3. **Optional H3 subsections** for complex topics
4. **3+ FAQ entries** answering real user questions
5. **Metadata** with keywords and SEO details

Create an outline for: "${topic}"
Cluster context: ${cluster}
Target audience: RV enthusiasts and potential buyers

Return a JSON object that matches the Outline schema exactly.`;

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
    const prompt = `You are the Draft Agent, specialized in creating concise, well-cited initial draft content from structured outlines for RV and recreational vehicle topics.

## Your Task
Write concise, source-cited paragraphs per section based on the provided outline. Lead each section with a 40-60 word direct answer for featured snippets. Add footnote-style citation markers for key claims.

Create a draft for this outline:
${JSON.stringify(outline, null, 2)}

Return a JSON object that matches the Draft schema exactly.`;

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: {
        type: 'object',
        properties: {
          frontmatter: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              date: { type: 'string' },
              author: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              funnel: { type: 'string', enum: ['TOF', 'MOF', 'BOF'] },
              intent: { type: 'string', enum: ['informational', 'comparative', 'transactional'] },
              primaryKeyword: { type: 'string' },
              secondaryKeywords: { type: 'array', items: { type: 'string' } },
              wordcount: { type: 'number' },
              readingTime: { type: 'number' },
              schema: { type: 'array', items: { type: 'object' } }
            },
            required: ['title', 'description', 'slug', 'date', 'author', 'tags', 'category', 'funnel', 'intent', 'primaryKeyword', 'secondaryKeywords']
          },
          content: { type: 'string' },
          markdownContent: { type: 'string' },
          faqBlocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' }
              },
              required: ['question', 'answer']
            }
          },
          howtoBlocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number' },
                      description: { type: 'string' },
                      text: { type: 'string' }
                    },
                    required: ['step', 'description', 'text']
                  }
                }
              },
              required: ['title', 'steps']
            }
          }
        },
        required: ['frontmatter', 'content']
      },
      temperature: 0.1,
    });

    return object as Draft;
  }

  async expandDraft(draft: Draft): Promise<Expanded> {
    const prompt = `You are the Expand Agent, specialized in taking concise initial drafts and expanding them with comprehensive content, tables, examples, checklists, image placeholders, and E-E-A-T elements for RV and recreational vehicle topics.

Expand this draft:
${JSON.stringify(draft, null, 2)}

Return a JSON object that matches the Expanded schema exactly.`;

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      prompt,
      schema: {
        type: 'object',
        properties: {
          frontmatter: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              date: { type: 'string' },
              author: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              funnel: { type: 'string', enum: ['TOF', 'MOF', 'BOF'] },
              intent: { type: 'string', enum: ['informational', 'comparative', 'transactional'] },
              primaryKeyword: { type: 'string' },
              secondaryKeywords: { type: 'array', items: { type: 'string' } },
              wordcount: { type: 'number' },
              readingTime: { type: 'number' },
              schema: { type: 'array', items: { type: 'object' } }
            },
            required: ['title', 'description', 'slug', 'date', 'author', 'tags', 'category', 'funnel', 'intent', 'primaryKeyword', 'secondaryKeywords']
          },
          content: { type: 'string' },
          markdownContent: { type: 'string' },
          evidence: {
            type: 'object',
            properties: {
              claims: { type: 'array', items: { type: 'object' } },
              citations: { type: 'array', items: { type: 'object' } },
              expertQuotes: { type: 'array', items: { type: 'object' } }
            },
            required: ['claims', 'citations', 'expertQuotes']
          },
          imagePlaceholders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                altText: { type: 'string' },
                position: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['altText', 'position', 'description']
            }
          },
          eatSignals: {
            type: 'object',
            properties: {
              authorBio: { type: 'string' },
              reviewer: { type: 'string' },
              factChecked: { type: 'boolean' },
              reviewDate: { type: 'string' }
            },
            required: ['authorBio', 'factChecked', 'reviewDate']
          },
          qualityMetrics: {
            type: 'object',
            properties: {
              readabilityGrade: { type: 'number' },
              fleschKincaidScore: { type: 'number' },
              averageSentenceLength: { type: 'number' },
              passiveVoicePercent: { type: 'number' },
              keywordDensity: { type: 'object' },
              brandVoiceAlignment: { type: 'object' },
              toneAlignment: { type: 'object' }
            }
          }
        },
        required: ['frontmatter', 'content', 'evidence', 'imagePlaceholders', 'eatSignals']
      },
      temperature: 0.1,
    });

    return object as Expanded;
  }

  async finalizeContent(expanded: Expanded): Promise<Final> {
    const prompt = `You are the Finalize Agent, responsible for the final SEO optimization and preparation of content for publication.

Finalize this content:
${JSON.stringify(expanded, null, 2)}

Return a JSON object that matches the Final schema exactly.`;

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      prompt,
      schema: {
        type: 'object',
        properties: {
          frontmatter: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              date: { type: 'string' },
              author: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              funnel: { type: 'string', enum: ['TOF', 'MOF', 'BOF'] },
              intent: { type: 'string', enum: ['informational', 'comparative', 'transactional'] },
              primaryKeyword: { type: 'string' },
              secondaryKeywords: { type: 'array', items: { type: 'string' } },
              wordcount: { type: 'number' },
              readingTime: { type: 'number' },
              schema: { type: 'array', items: { type: 'object' } }
            },
            required: ['title', 'description', 'slug', 'date', 'author', 'tags', 'category', 'funnel', 'intent', 'primaryKeyword', 'secondaryKeywords']
          },
          content: { type: 'string' },
          markdownContent: { type: 'string' },
          evidence: {
            type: 'object',
            properties: {
              claims: { type: 'array', items: { type: 'object' } },
              citations: { type: 'array', items: { type: 'object' } },
              expertQuotes: { type: 'array', items: { type: 'object' } }
            },
            required: ['claims', 'citations', 'expertQuotes']
          },
          imagePlaceholders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                altText: { type: 'string' },
                position: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['altText', 'position', 'description']
            }
          },
          eatSignals: {
            type: 'object',
            properties: {
              authorBio: { type: 'string' },
              reviewer: { type: 'string' },
              factChecked: { type: 'boolean' },
              reviewDate: { type: 'string' }
            },
            required: ['authorBio', 'factChecked', 'reviewDate']
          },
          qualityMetrics: {
            type: 'object',
            properties: {
              readabilityGrade: { type: 'number' },
              fleschKincaidScore: { type: 'number' },
              averageSentenceLength: { type: 'number' },
              passiveVoicePercent: { type: 'number' },
              keywordDensity: { type: 'object' },
              brandVoiceAlignment: { type: 'object' },
              toneAlignment: { type: 'object' }
            }
          },
          seoOptimizations: {
            type: 'object',
            properties: {
              titleOptimized: { type: 'boolean' },
              metaDescriptionOptimized: { type: 'boolean' },
              schemaMarkupGenerated: { type: 'boolean' },
              ctaIncluded: { type: 'boolean' },
              keywordDensityOptimized: { type: 'boolean' }
            },
            required: ['titleOptimized', 'metaDescriptionOptimized', 'schemaMarkupGenerated', 'ctaIncluded', 'keywordDensityOptimized']
          }
        },
        required: ['frontmatter', 'content', 'evidence', 'imagePlaceholders', 'eatSignals', 'qualityMetrics', 'seoOptimizations']
      },
      temperature: 0.1,
    });

    return object as Final;
  }
}
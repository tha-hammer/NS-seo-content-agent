import { z } from 'zod';

// Funnel Stage Enum
export const FunnelStageSchema = z.enum(['TOF', 'MOF', 'BOF']);
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

// Search Intent Enum
export const SearchIntentSchema = z.enum(['informational', 'comparative', 'transactional']);
export type SearchIntent = z.infer<typeof SearchIntentSchema>;

// TPB (Theory of Planned Behavior) Enum
export const TPBSchema = z.enum(['attitude', 'norm', 'perceived-control']);
export type TPB = z.infer<typeof TPBSchema>;

// Heading Structure for Outline
export const HeadingSchema = z.object({
  h2: z.string().min(5),
  keypoints: z.array(z.string().min(3)).min(2),
  children: z.array(z.object({
    h3: z.string().min(5),
    bullets: z.array(z.string().min(3)).min(2)
  })).optional().default([])
});

// FAQ Structure
export const FAQSchema = z.object({
  q: z.string().min(10),
  a_outline: z.string().min(20)
});

// Outline Schema
export const OutlineSchema = z.object({
  title: z.string().min(10).max(60),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  funnel: FunnelStageSchema,
  intent: SearchIntentSchema,
  tpb: TPBSchema,
  targetReader: z.string().min(10),
  headings: z.array(HeadingSchema).min(3).max(8),
  faqs: z.array(FAQSchema).min(3).max(10),
  metadata: z.object({
    primaryKeyword: z.string().min(3),
    secondaryKeywords: z.array(z.string().min(2)).min(2).max(5),
    suggestedUrl: z.string().startsWith('/'),
    wordcountTarget: z.number().int().min(1200).max(3000),
    estimatedReadTime: z.number().int().min(5).max(15)
  })
});
export type Outline = z.infer<typeof OutlineSchema>;

// Frontmatter Schema
export const FrontmatterSchema = z.object({
  title: z.string().min(10).max(60),
  description: z.string().min(50).max(160),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  author: z.string().min(3),
  reviewer: z.string().optional(),
  category: z.string().min(3),
  tags: z.array(z.string().min(2)).min(1).max(8),
  cluster_id: z.string().min(3),
  pillar_id: z.string().optional(),
  stage: FunnelStageSchema,
  intent: SearchIntentSchema,
  tpb: TPBSchema,
  canonical: z.string().url(),
  og: z.object({
    image: z.string().optional(),
    type: z.string().default('article')
  }).optional(),
  twitter: z.object({
    card: z.string().default('summary_large_image'),
    image: z.string().optional()
  }).optional(),
  toc: z.boolean().default(true),
  reading_time: z.number().int().min(1),
  word_count: z.number().int().min(800),
  schema: z.array(z.record(z.any())).optional()
});
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// Draft Schema
export const DraftSchema = z.object({
  frontmatter: FrontmatterSchema,
  content: z.string().min(800),
  faqBlocks: z.array(z.object({
    question: z.string(),
    answer: z.string().min(40).max(60) // Featured snippet style
  })).optional(),
  howtoBlocks: z.array(z.object({
    name: z.string(),
    steps: z.array(z.object({
      step: z.string(),
      description: z.string()
    }))
  })).optional()
});
export type Draft = z.infer<typeof DraftSchema>;

// Evidence/Citation Schema
export const EvidenceSchema = z.object({
  claims: z.array(z.object({
    statement: z.string().min(10),
    sources: z.array(z.string().url()).min(1),
    confidence: z.enum(['high', 'medium', 'low']),
    ymyl: z.boolean() // Requires higher authority for YMYL content
  })),
  citations: z.array(z.object({
    url: z.string().url(),
    title: z.string().min(5),
    authority: z.enum(['high', 'medium', 'low']),
    lastAccessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })),
  expertQuotes: z.array(z.object({
    quote: z.string().min(20),
    attribution: z.string().min(5),
    credentials: z.string().min(10)
  }))
});
export type Evidence = z.infer<typeof EvidenceSchema>;

// Expanded Draft Schema
export const ExpandedSchema = z.object({
  frontmatter: FrontmatterSchema,
  content: z.string().min(1200),
  evidence: EvidenceSchema,
  imagePlaceholders: z.array(z.object({
    position: z.string(), // e.g., "after-h2-1", "in-section-2"
    altText: z.string().min(10),
    suggestedCaption: z.string().optional()
  })),
  eatSignals: z.object({
    authorBio: z.string().optional(),
    lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reviewedBy: z.string().optional(),
    factChecked: z.boolean().default(false)
  })
});
export type Expanded = z.infer<typeof ExpandedSchema>;

// Schema Markup Types
export const SchemaMarkupSchema = z.array(z.object({
  '@context': z.string().url().default('https://schema.org'),
  '@type': z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  mainEntity: z.array(z.any()).optional(), // For FAQPage
  step: z.array(z.any()).optional(), // For HowTo
  author: z.object({
    '@type': z.string().default('Person'),
    name: z.string()
  }).optional(),
  datePublished: z.string().optional(),
  dateModified: z.string().optional()
}));

// Final Article Schema
export const FinalSchema = z.object({
  frontmatter: FrontmatterSchema.extend({
    schema: SchemaMarkupSchema.optional()
  }),
  content: z.string().min(1200),
  evidence: EvidenceSchema,
  seoOptimizations: z.object({
    titleOptimized: z.boolean(),
    metaDescriptionOptimized: z.boolean(),
    headingStructureValid: z.boolean(),
    schemaMarkupIncluded: z.boolean(),
    internalLinksAdded: z.boolean(),
    externalLinksAdded: z.boolean(),
    ctaIncluded: z.boolean()
  }),
  qualityMetrics: z.object({
    readabilityGrade: z.number().min(8).max(10),
    wordCount: z.number().int().min(1200),
    avgSentenceLength: z.number(),
    passiveVoicePercent: z.number().max(20),
    fleschKincaidScore: z.number().min(60)
  })
});
export type Final = z.infer<typeof FinalSchema>;

// Link Graph Schema
export const LinkNodeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(5),
  cluster: z.string().min(3),
  type: z.enum(['pillar', 'supporting', 'hub']),
  synonyms: z.array(z.string()).optional().default([])
});

export const LinkEdgeSchema = z.object({
  from: z.string().regex(/^[a-z0-9-]+$/),
  to: z.string().regex(/^[a-z0-9-]+$/),
  anchorHints: z.array(z.string().min(3)).min(1).max(5),
  priority: z.number().int().min(1).max(10),
  type: z.enum(['pillar-to-supporting', 'supporting-to-pillar', 'cross-supporting', 'next-step'])
});

export const LinkGraphSchema = z.object({
  nodes: z.array(LinkNodeSchema).min(1),
  edges: z.array(LinkEdgeSchema).min(0)
});
export type LinkGraph = z.infer<typeof LinkGraphSchema>;
export type LinkNode = z.infer<typeof LinkNodeSchema>;
export type LinkEdge = z.infer<typeof LinkEdgeSchema>;

// Run State Schema for Pipeline
export const RunStateSchema = z.object({
  id: z.string().uuid(),
  topic: z.string().min(5),
  bucket: z.enum(['daily', 'weekly', 'monthly']),
  currentStage: z.enum(['outline', 'draft', 'expand', 'polish', 'finalize', 'link', 'publish', 'complete']),
  outline: OutlineSchema.optional(),
  draft: DraftSchema.optional(),
  expanded: ExpandedSchema.optional(),
  final: FinalSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  errors: z.array(z.object({
    stage: z.string(),
    message: z.string(),
    timestamp: z.string().datetime()
  })).default([])
});
export type RunState = z.infer<typeof RunStateSchema>;

// Published Content Schema
export const PublishedSchema = z.object({
  filePath: z.string().min(1),
  markdownContent: z.string().min(1200),
  frontmatter: FrontmatterSchema,
  publishedAt: z.string().datetime(),
  fileSize: z.number().int().min(1),
  backupPath: z.string().optional(),
  checksums: z.object({
    md5: z.string().regex(/^[a-f0-9]{32}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/)
  }),
  validation: z.object({
    frontmatterValid: z.boolean(),
    markdownValid: z.boolean(),
    linksValid: z.boolean(),
    imagesValid: z.boolean()
  }),
  metadata: z.object({
    wordCount: z.number().int().min(800),
    readingTime: z.number().int().min(1),
    lastModified: z.string().datetime(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/)
  })
});
export type Published = z.infer<typeof PublishedSchema>;
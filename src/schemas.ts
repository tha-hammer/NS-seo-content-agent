import { z } from 'zod';

// Funnel Stage - flexible to handle natural language descriptions
export const FunnelStageSchema = z.union([
  z.enum(['TOF', 'MOF', 'BOF']),
  z.string().min(1)
]);
export type FunnelStage = z.infer<typeof FunnelStageSchema>;

// Search Intent - flexible to handle natural language descriptions
export const SearchIntentSchema = z.union([
  z.enum(['informational', 'comparative', 'transactional']),
  z.string().min(1),
  z.array(z.string()).min(1) // Handle arrays of intents
]);
export type SearchIntent = z.infer<typeof SearchIntentSchema>;

// TPB (Theory of Planned Behavior) - flexible to handle string, object, or array
export const TPBSchema = z.union([
  z.enum(['attitude', 'norm', 'perceived-control']),
  z.string().min(1),
  z.array(z.string()),
  z.object({
    attitude: z.string().optional(),
    norm: z.string().optional(),
    'perceived-control': z.string().optional()
  }).passthrough()
]);
export type TPB = z.infer<typeof TPBSchema>;

// Heading Structure for Outline - flexible to handle natural LLM output
export const HeadingSchema = z.object({
  h2: z.string().min(5).optional(),
  title: z.string().min(5).optional(),
  keypoints: z.array(z.string().min(3)).min(2).optional(),
  children: z.array(z.object({
    h3: z.string().min(5),
    bullets: z.array(z.string().min(3)).min(2)
  })).optional().default([])
}).passthrough();

// FAQ Structure - flexible to handle natural LLM output
export const FAQSchema = z.object({
  q: z.string().min(10).optional(),
  question: z.string().min(10).optional(),
  a_outline: z.string().min(20).optional(),
  answer: z.string().min(20).optional()
}).passthrough();

// Outline Schema - flexible to handle natural LLM output
export const OutlineSchema = z.object({
  title: z.string().min(10).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  funnel: FunnelStageSchema.optional(),
  intent: SearchIntentSchema.optional(),
  tpb: TPBSchema.optional(),
  targetReader: z.union([
    z.string().min(10),
    z.object({}).passthrough()
  ]).optional(),
  headings: z.union([
    z.array(HeadingSchema).min(1),
    z.object({}).passthrough()
  ]).optional(),
  faqs: z.union([
    z.array(FAQSchema).min(1),
    z.object({}).passthrough()
  ]).optional(),
  metadata: z.object({
    primaryKeyword: z.string().min(3).optional(),
    secondaryKeywords: z.array(z.string().min(2)).min(2).max(10).optional(),
    suggestedUrl: z.string().startsWith('/').optional(),
    wordcountTarget: z.number().int().min(1200).max(5000).optional(),
    estimatedReadTime: z.number().int().min(5).max(25).optional()
  }).passthrough().optional()
}).passthrough();
export type Outline = z.infer<typeof OutlineSchema>;

// Frontmatter Schema - flexible to handle natural LLM output
export const FrontmatterSchema = z.object({
  title: z.string().min(10).max(100).optional(),
  description: z.string().min(10).max(300).optional(),
  slug: z.string().optional(),
  date: z.string().optional(),
  updated: z.string().optional(),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cluster_id: z.string().optional(),
  pillar_id: z.string().optional(),
  stage: FunnelStageSchema.optional(),
  funnel: FunnelStageSchema.optional(),
  intent: SearchIntentSchema.optional(),
  searchIntent: SearchIntentSchema.optional(),
  tpb: TPBSchema.optional(),
  tpbClassification: TPBSchema.optional(),
  targetReader: z.union([z.string(), z.object({}).passthrough()]).optional(),
  canonical: z.string().optional(),
  canonicalUrl: z.string().optional(),
  suggestedUrl: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  metaKeywords: z.array(z.string()).optional(),
  estimatedReadTime: z.number().optional(),
  wordCountTarget: z.number().optional(),
  og: z.object({
    image: z.string().optional(),
    type: z.string().default('article')
  }).optional(),
  twitter: z.object({
    card: z.string().default('summary_large_image'),
    image: z.string().optional()
  }).optional(),
  toc: z.boolean().default(true),
  reading_time: z.number().optional(),
  word_count: z.number().optional(),
  schema: z.array(z.record(z.any())).optional()
}).passthrough();
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// Draft Schema - flexible to handle natural LLM output
export const DraftSchema = z.object({
  frontmatter: FrontmatterSchema,
  content: z.string().min(100).optional(),
  markdownContent: z.string().min(100).optional(),
  faqBlocks: z.array(z.object({
    question: z.string().optional(),
    q: z.string().optional(),
    answer: z.string().optional(),
    a: z.string().optional(),
    a_outline: z.string().optional()
  }).passthrough()).optional(),
  howtoBlocks: z.array(z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    steps: z.array(z.union([
      // Object format
      z.object({
        step: z.union([z.string(), z.number()]).optional(),
        description: z.string().optional(),
        text: z.string().optional()
      }).passthrough(),
      // String format (LLM often returns strings)
      z.string()
    ])).optional()
  }).passthrough()).optional()
}).passthrough();
export type Draft = z.infer<typeof DraftSchema>;

// Evidence/Citation Schema - flexible to handle natural LLM output (object or array)
export const EvidenceSchema = z.union([
  // Object format
  z.object({
    claims: z.array(z.object({
      statement: z.string().optional(),
      sources: z.array(z.union([
        z.string(), // Simple URL string
        z.object({  // Object with URL and metadata (real LLM format)
          url: z.string().optional(),
          title: z.string().optional(),
          author: z.string().optional(),
          publishDate: z.string().optional(),
          authority: z.enum(['high', 'medium', 'low']).optional(),
          lastAccessed: z.string().optional()
        }).passthrough()
      ])).optional(),
      confidence: z.enum(['high', 'medium', 'low']).optional(),
      ymyl: z.boolean().optional()
    }).passthrough()).optional(),
    citations: z.array(z.object({
      url: z.string().optional(),
      title: z.string().optional(),
      authority: z.enum(['high', 'medium', 'low']).optional(),
      lastAccessed: z.string().optional()
    }).passthrough()).optional(),
    expertQuotes: z.array(z.object({
      quote: z.string().optional(),
      attribution: z.string().optional(),
      credentials: z.string().optional()
    }).passthrough()).optional()
  }).passthrough(),
  // Array format (convert to object)
  z.array(z.any()),
  // String format
  z.string()
]);
export type Evidence = z.infer<typeof EvidenceSchema>;

// Expanded Draft Schema - flexible to handle natural LLM output
export const ExpandedSchema = z.object({
  frontmatter: FrontmatterSchema,
  content: z.string().min(100).optional(),
  markdownContent: z.string().min(100).optional(),
  evidence: EvidenceSchema.optional(),
  imagePlaceholders: z.array(z.object({
    position: z.string().optional(),
    altText: z.string().optional(),
    suggestedCaption: z.string().optional()
  }).passthrough()).optional(),
  imageBlocks: z.array(z.object({}).passthrough()).optional(),
  tableBlocks: z.array(z.object({}).passthrough()).optional(),
  faqBlocks: z.array(z.object({
    question: z.string().optional(),
    q: z.string().optional(),
    answer: z.string().optional(),
    a: z.string().optional()
  }).passthrough()).optional(),
  eatSignals: z.object({
    authorBio: z.string().optional(),
    lastReviewed: z.string().optional(),
    reviewedBy: z.string().optional(),
    factChecked: z.boolean().optional()
  }).optional()
}).passthrough();
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

// Final Article Schema - flexible to handle natural LLM output
export const FinalSchema = z.object({
  frontmatter: FrontmatterSchema,
  content: z.string().min(100).optional(),
  markdownContent: z.string().min(100).optional(),
  evidence: EvidenceSchema.optional(),
  seoOptimizations: z.object({
    titleOptimized: z.boolean().optional(),
    metaDescriptionOptimized: z.boolean().optional(),
    headingStructureValid: z.boolean().optional(),
    schemaMarkupIncluded: z.boolean().optional(),
    internalLinksAdded: z.boolean().optional(),
    externalLinksAdded: z.boolean().optional(),
    ctaIncluded: z.boolean().optional()
  }).optional(),
  qualityMetrics: z.object({
    readabilityGrade: z.number().optional(),
    wordCount: z.number().optional(),
    avgSentenceLength: z.number().optional(),
    passiveVoicePercent: z.number().optional(),
    fleschKincaidScore: z.number().optional()
  }).optional()
}).passthrough();
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

// Published Content Schema - flexible to handle natural LLM output
export const PublishedSchema = z.object({
  filePath: z.string().optional(),
  markdownContent: z.string().min(100).optional(),
  content: z.string().min(100).optional(),
  frontmatter: FrontmatterSchema,
  publishedAt: z.string().optional(),
  fileSize: z.number().optional(),
  backupPath: z.string().optional(),
  checksums: z.object({
    md5: z.string().optional(),
    sha256: z.string().optional()
  }).optional(),
  validation: z.object({
    frontmatterValid: z.boolean().optional(),
    markdownValid: z.boolean().optional(),
    linksValid: z.boolean().optional(),
    imagesValid: z.boolean().optional()
  }).optional(),
  metadata: z.object({
    wordCount: z.number().optional(),
    readingTime: z.number().optional(),
    lastModified: z.string().optional(),
    version: z.string().optional()
  }).optional()
}).passthrough();
export type Published = z.infer<typeof PublishedSchema>;
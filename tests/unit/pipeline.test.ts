import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunStateSchema } from '@/schemas';
import fs from 'fs/promises';

// Mock all agent modules
vi.mock('@/agents/OutlineAgent', () => ({
  OutlineAgent: {
    generateOutline: vi.fn()
  }
}));

vi.mock('@/agents/DraftAgent', () => ({
  DraftAgent: {
    createDraft: vi.fn()
  }
}));

vi.mock('@/agents/ExpandAgent', () => ({
  ExpandAgent: {
    expandContent: vi.fn()
  }
}));

vi.mock('@/agents/PolishAgent', () => ({
  PolishAgent: {
    polishContent: vi.fn()
  }
}));

vi.mock('@/agents/FinalizeAgent', () => ({
  FinalizeAgent: {
    finalizeContent: vi.fn()
  }
}));

vi.mock('@/agents/PublisherAgent', () => ({
  PublisherAgent: {
    publishContent: vi.fn()
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn()
  }
}));

// Mock the config
vi.mock('@/config', () => ({
  getConfig: () => ({
    paths: {
      runs: '/tmp/test-runs',
      output: '/tmp/test-output'
    }
  })
}));

describe('Pipeline', () => {
  let Pipeline: any;
  let OutlineAgent: any;
  let DraftAgent: any;
  let ExpandAgent: any;
  let PolishAgent: any;
  let FinalizeAgent: any;
  let PublisherAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import modules after mocks are set up
    Pipeline = (await import('@/pipeline')).Pipeline;
    OutlineAgent = (await import('@/agents/OutlineAgent')).OutlineAgent;
    DraftAgent = (await import('@/agents/DraftAgent')).DraftAgent;
    ExpandAgent = (await import('@/agents/ExpandAgent')).ExpandAgent;
    PolishAgent = (await import('@/agents/PolishAgent')).PolishAgent;
    FinalizeAgent = (await import('@/agents/FinalizeAgent')).FinalizeAgent;
    PublisherAgent = (await import('@/agents/PublisherAgent')).PublisherAgent;
  });

  describe('runPipeline', () => {
    it('should execute complete pipeline from topic to published content', async () => {
      const topic = 'Best Budget RVs for Families Under $30k';
      const bucket = 'weekly';

      // Mock successful agent responses
      const mockOutline = {
        title: 'Best Budget RVs for Families Under $30k',
        slug: 'best-budget-rvs-families-under-30k',
        funnel: 'MOF' as const,
        intent: 'comparative' as const,
        tpb: 'perceived-control' as const,
        targetReader: 'Families looking for affordable RV options',
        headings: [
          {
            h2: 'Top RV Options',
            keypoints: ['Used travel trailers', 'New compact models'],
            children: []
          }
        ],
        faqs: [
          {
            q: 'What size RV works best for families?',
            a_outline: '25-30 foot travel trailers provide optimal space'
          }
        ],
        metadata: {
          primaryKeyword: 'budget family RVs',
          secondaryKeywords: ['travel trailers', 'RV buying'],
          suggestedUrl: '/buying/best-budget-rvs-families-under-30k',
          wordcountTarget: 2400,
          estimatedReadTime: 12
        }
      };

      const mockDraft = {
        frontmatter: {
          title: 'Best Budget RVs for Families Under $30k',
          description: 'Find the perfect family RV under $30,000. Compare top models and save thousands.',
          slug: 'best-budget-rvs-families-under-30k',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['budget-rv', 'family-rv'],
          cluster_id: 'rv-buying',
          stage: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          canonical: 'https://example.com/buying/best-budget-rvs-families-under-30k',
          reading_time: 12,
          word_count: 2400
        },
        content: '# Best Budget RVs for Families Under $30k\n\nFinding affordable RVs requires research.',
        faqBlocks: [
          {
            question: 'What size RV works best for families?',
            answer: '25-30 foot travel trailers provide optimal space while remaining manageable.'
          }
        ]
      };

      const mockExpanded = {
        ...mockDraft,
        content: mockDraft.content + '\n\nExpanded content with examples and evidence.',
        evidence: {
          claims: [
            {
              statement: 'Travel trailers offer best value',
              sources: ['https://rvia.org/report'],
              confidence: 'high' as const,
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/report',
              title: 'RV Industry Report',
              authority: 'high' as const,
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Focus on condition over age',
              attribution: 'John Smith, RV Inspector',
              credentials: '15 years experience'
            }
          ]
        },
        imagePlaceholders: [
          {
            position: 'after-h2-1',
            altText: 'Family RV comparison chart',
            suggestedCaption: 'Compare top family RV options'
          }
        ],
        eatSignals: {
          authorBio: 'RV Expert with 10+ years helping families',
          lastReviewed: '2024-03-15',
          reviewedBy: 'Industry Specialist',
          factChecked: true
        }
      };

      const mockPolished = {
        ...mockExpanded,
        content: mockExpanded.content + '\n\n**What size RV works best?**\nTravel trailers between 25-30 feet work best.'
      };

      const mockFinalized = {
        ...mockPolished,
        seoOptimizations: {
          titleOptimized: true,
          metaDescriptionOptimized: true,
          headingStructureValid: true,
          schemaMarkupIncluded: true,
          internalLinksAdded: false,
          externalLinksAdded: false,
          ctaIncluded: true
        },
        qualityMetrics: {
          readabilityGrade: 9,
          wordCount: 2400,
          avgSentenceLength: 18.5,
          passiveVoicePercent: 12,
          fleschKincaidScore: 65
        }
      };

      const mockPublished = {
        filePath: '/tmp/test-output/buying/best-budget-rvs-families-under-30k.md',
        markdownContent: '---\ntitle: "Best Budget RVs"\n---\n# Content',
        frontmatter: mockFinalized.frontmatter,
        publishedAt: '2024-03-15T10:30:00Z',
        fileSize: 2048,
        checksums: {
          md5: 'a1b2c3d4e5f6789012345678901234ab',
          sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
        },
        validation: {
          frontmatterValid: true,
          markdownValid: true,
          linksValid: true,
          imagesValid: true
        },
        metadata: {
          wordCount: 2400,
          readingTime: 12,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      };

      // Mock agent responses
      OutlineAgent.generateOutline.mockResolvedValue({ success: true, data: mockOutline });
      DraftAgent.createDraft.mockResolvedValue({ success: true, data: mockDraft });
      ExpandAgent.expandContent.mockResolvedValue({ success: true, data: mockExpanded });
      PolishAgent.polishContent.mockResolvedValue({ success: true, data: mockPolished });
      FinalizeAgent.finalizeContent.mockResolvedValue({ success: true, data: mockFinalized });
      PublisherAgent.publishContent.mockResolvedValue({ success: true, data: mockPublished });

      const result = await Pipeline.runPipeline(topic, bucket);

      expect(result.success).toBe(true);
      expect(result.runState.topic).toBe(topic);
      expect(result.runState.bucket).toBe(bucket);
      expect(result.runState.currentStage).toBe('complete');
      expect(result.runState.outline).toEqual(mockOutline);
      expect(result.runState.draft).toEqual(mockDraft);
      expect(result.runState.expanded).toEqual(mockPolished);
      expect(result.runState.final).toEqual(mockFinalized);

      // Verify all agents were called
      expect(OutlineAgent.generateOutline).toHaveBeenCalledWith(topic);
      expect(DraftAgent.createDraft).toHaveBeenCalledWith(mockOutline);
      expect(ExpandAgent.expandContent).toHaveBeenCalledWith(mockDraft);
      expect(PolishAgent.polishContent).toHaveBeenCalledWith(mockExpanded);
      expect(FinalizeAgent.finalizeContent).toHaveBeenCalledWith(mockPolished);
      expect(PublisherAgent.publishContent).toHaveBeenCalledWith(mockFinalized);

      // Verify state was persisted
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle agent failures and save error state', async () => {
      const topic = 'Test Topic';
      const bucket = 'daily';

      // Mock outline success but draft failure
      const mockOutline = {
        title: 'Test Topic',
        slug: 'test-topic',
        funnel: 'TOF' as const,
        intent: 'informational' as const,
        tpb: 'attitude' as const,
        targetReader: 'Test readers',
        headings: [
          {
            h2: 'Test Section',
            keypoints: ['Point 1', 'Point 2'],
            children: []
          }
        ],
        faqs: [
          {
            q: 'Test question?',
            a_outline: 'Test answer outline'
          }
        ],
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: ['testing'],
          suggestedUrl: '/test-topic',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      OutlineAgent.generateOutline.mockResolvedValue({ success: true, data: mockOutline });
      DraftAgent.createDraft.mockResolvedValue({ success: false, error: 'Draft creation failed' });

      const result = await Pipeline.runPipeline(topic, bucket);

      expect(result.success).toBe(false);
      expect(result.runState.currentStage).toBe('draft');
      expect(result.runState.errors).toHaveLength(1);
      expect(result.runState.errors[0].stage).toBe('draft');
      expect(result.runState.errors[0].message).toContain('Draft creation failed');
      expect(result.error).toContain('Pipeline failed at stage: draft');

      // Verify state was persisted with error
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should validate pipeline input parameters', async () => {
      const result1 = await Pipeline.runPipeline('', 'daily');
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Topic is required');

      const result2 = await Pipeline.runPipeline('Valid Topic', 'invalid' as any);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid bucket');
    });
  });

  describe('resumePipeline', () => {
    it('should resume pipeline from saved state', async () => {
      const runId = 'test-run-123';
      
      const savedState = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        topic: 'Resume Test Topic',
        bucket: 'weekly' as const,
        currentStage: 'expand' as const,
        outline: {
          title: 'Resume Test Topic',
          slug: 'resume-test-topic',
          funnel: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          targetReader: 'Test readers',
          headings: [
            {
              h2: 'Test Section One',
              keypoints: ['Point 1', 'Point 2'],
              children: []
            },
            {
              h2: 'Test Section Two',
              keypoints: ['Point 3', 'Point 4'],
              children: []
            },
            {
              h2: 'Test Section Three',
              keypoints: ['Point 5', 'Point 6'],
              children: []
            }
          ],
          faqs: [
            {
              q: 'Test question one?',
              a_outline: 'This is a detailed test answer outline that meets the minimum character requirements'
            },
            {
              q: 'Test question two?',
              a_outline: 'This is another detailed test answer outline that meets the minimum character requirements'
            },
            {
              q: 'Test question three?',
              a_outline: 'This is a third detailed test answer outline that meets the minimum character requirements'
            }
          ],
          metadata: {
            primaryKeyword: 'test',
            secondaryKeywords: ['testing', 'resume'],
            suggestedUrl: '/resume-test-topic',
            wordcountTarget: 1200,
            estimatedReadTime: 6
          }
        },
        draft: {
          frontmatter: {
            title: 'Resume Test Topic',
            description: 'Test description for resume functionality testing.',
            slug: 'resume-test-topic',
            date: '2024-03-15',
            updated: '2024-03-15',
            author: 'Test Author',
            category: 'test',
            tags: ['test'],
            cluster_id: 'test',
            stage: 'MOF' as const,
            intent: 'comparative' as const,
            tpb: 'perceived-control' as const,
            canonical: 'https://example.com/resume-test-topic',
            toc: true,
            reading_time: 6,
            word_count: 1200
          },
          content: `# Resume Test Topic

This is comprehensive test content for resume functionality that meets all minimum length requirements for proper validation. The content includes multiple paragraphs, proper structure, and sufficient detail to pass all validation checks including the 800 character minimum requirement.

## Introduction to Resume Testing

When testing resume functionality in pipeline systems, it's important to ensure that all aspects of the saved state meet the established validation criteria. This includes proper formatting, adequate length, meaningful structure, and comprehensive coverage of the topic at hand.

## Test Content Requirements

Detailed information about resume testing with multiple sentences that provide context for the validation process. This section includes comprehensive coverage of important points and maintains quality standards throughout the entire document. The content should be engaging, informative, and well-structured to ensure it passes all validation requirements for resume testing scenarios.`,
          faqBlocks: []
        },
        expanded: undefined,
        final: undefined,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:15:00Z',
        errors: []
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedState));

      // Mock remaining agent calls
      const mockExpanded = {
        ...savedState.draft,
        content: savedState.draft.content + '\n\nExpanded content.',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        imagePlaceholders: [],
        eatSignals: {
          lastReviewed: '2024-03-15',
          factChecked: true
        }
      };

      ExpandAgent.expandContent.mockResolvedValue({ success: true, data: mockExpanded });
      PolishAgent.polishContent.mockResolvedValue({ success: true, data: mockExpanded });
      FinalizeAgent.finalizeContent.mockResolvedValue({ success: true, data: {
        ...mockExpanded,
        seoOptimizations: {
          titleOptimized: true,
          metaDescriptionOptimized: true,
          headingStructureValid: true,
          schemaMarkupIncluded: false,
          internalLinksAdded: false,
          externalLinksAdded: false,
          ctaIncluded: true
        },
        qualityMetrics: {
          readabilityGrade: 9,
          wordCount: 1200,
          avgSentenceLength: 18,
          passiveVoicePercent: 15,
          fleschKincaidScore: 68
        }
      }});
      PublisherAgent.publishContent.mockResolvedValue({ success: true, data: {
        filePath: '/tmp/test.md',
        markdownContent: 'content',
        frontmatter: savedState.draft.frontmatter,
        publishedAt: '2024-03-15T10:30:00Z',
        fileSize: 1024,
        checksums: {
          md5: 'a1b2c3d4e5f6789012345678901234ab',
          sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
        },
        validation: {
          frontmatterValid: true,
          markdownValid: true,
          linksValid: true,
          imagesValid: true
        },
        metadata: {
          wordCount: 1200,
          readingTime: 6,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      }});

      const result = await Pipeline.resumePipeline(runId);

      if (!result.success) {
        console.log('Resume Pipeline Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.runState.currentStage).toBe('publish');
      expect(ExpandAgent.expandContent).toHaveBeenCalledWith(savedState.draft);

      // Should not call agents for already completed stages
      expect(OutlineAgent.generateOutline).not.toHaveBeenCalled();
      expect(DraftAgent.createDraft).not.toHaveBeenCalled();
    });

    it('should handle missing state file', async () => {
      const runId = 'missing-run-123';
      
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      const result = await Pipeline.resumePipeline(runId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load run state');
    });
  });

  describe('getRunState', () => {
    it('should load and validate run state from file', async () => {
      const runId = 'b1c2d3e4-f5a6-4890-b123-456789abcdef';
      
      const validState = {
        id: runId,
        topic: 'Test Topic',
        bucket: 'daily' as const,
        currentStage: 'polish' as const,
        outline: undefined,
        draft: undefined,
        expanded: undefined,
        final: undefined,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:15:00Z',
        errors: []
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(validState));

      const result = await Pipeline.getRunState(runId);

      if (!result.success) {
        console.log('GetRunState Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(runId);
      expect(result.data.topic).toBe('Test Topic');
    });

    it('should handle invalid state data', async () => {
      const runId = 'invalid-state-run';
      
      const invalidState = {
        id: runId,
        topic: '', // Invalid - empty topic
        bucket: 'invalid',
        currentStage: 'unknown',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
        errors: []
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(invalidState));

      const result = await Pipeline.getRunState(runId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid run state');
    });
  });

  describe('saveRunState', () => {
    it('should save valid run state to file', async () => {
      const runState = {
        id: 'save-test-123',
        topic: 'Save Test Topic',
        bucket: 'monthly' as const,
        currentStage: 'draft' as const,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:15:00Z',
        errors: []
      };

      const result = await Pipeline.saveRunState(runState);

      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalled(); // Ensure directory creation
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('save-test-123/state.json'),
        JSON.stringify(runState, null, 2),
        'utf-8'
      );
    });

    it('should handle file write errors', async () => {
      const runState = {
        id: 'error-test-123',
        topic: 'Error Test Topic',
        bucket: 'daily' as const,
        currentStage: 'outline' as const,
        createdAt: '2024-03-15T10:00:00Z',
        updatedAt: '2024-03-15T10:00:00Z',
        errors: []
      };

      (fs.writeFile as any).mockRejectedValue(new Error('Disk full'));

      const result = await Pipeline.saveRunState(runState);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save run state');
    });
  });

  describe('listRuns', () => {
    it('should list all available pipeline runs', async () => {
      // This test would require additional file system mocking
      // Placeholder for future implementation
      expect(true).toBe(true);
    });
  });
});
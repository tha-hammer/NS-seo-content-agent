import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinalSchema } from '@/schemas';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Finalize Agent',
  run: mockAgentRun
}));

vi.mock('@openai/agents', () => ({
  Agent: {
    create: mockAgentCreate
  }
}));

// Mock the config
vi.mock('@/config', () => ({
  getConfig: () => ({
    models: {
      writer: 'gpt-4.1-mini',
      editor: 'gpt-4.1'
    }
  })
}));

describe('FinalizeAgent', () => {
  let FinalizeAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mocks are set up
    FinalizeAgent = (await import('@/agents/FinalizeAgent')).FinalizeAgent;
  });

  describe('finalizeContent', () => {
    it('should finalize content with SEO optimizations and schema markup', async () => {
      const inputExpanded = {
        frontmatter: {
          title: 'Best RVs Under $30k for Families',
          description: 'Discover the top-rated RVs under $30,000 perfect for family adventures. Compare features, prices, and expert reviews.',
          slug: 'best-rvs-under-30k-families',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['budget-rv', 'family-rv', 'travel-trailers'],
          cluster_id: 'rv-buying',
          stage: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          canonical: 'https://example.com/buying/best-rvs-under-30k-families',
          reading_time: 12,
          word_count: 2400
        },
        content: `# Best RVs Under $30k for Families

Finding the perfect family RV under $30,000 requires balancing value, features, and your family's camping needs. This guide helps you identify top options and make informed decisions.

## Top Budget RV Options

Used travel trailers consistently offer the best value for families seeking RVs under $30,000. These units provide essential amenities while keeping costs manageable.

**What size RV works best for families?**
Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver.

**Should you buy new or used?**  
Used RVs offer significantly better value, especially for first-time buyers who want to avoid steep depreciation.

**What's the total cost of RV ownership?**
Budget 20-30% beyond purchase price for first-year expenses including insurance, storage, and unexpected repairs.`,
        evidence: {
          claims: [
            {
              statement: 'Used travel trailers offer the best value',
              sources: ['https://rvia.org/market-report-2024'],
              confidence: 'high' as const,
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/market-report-2024',
              title: 'RV Industry Market Report 2024',
              authority: 'high' as const,
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Always get professional inspection before buying',
              attribution: 'John Smith, Certified RV Inspector',
              credentials: '15 years experience'
            }
          ]
        },
        imagePlaceholders: [
          {
            position: 'after-h2-1',
            altText: 'Family RV comparison chart showing budget-friendly options under $30k',
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

      const finalizedContent = {
        frontmatter: {
          ...inputExpanded.frontmatter,
          title: 'Best Family RVs Under $30k: 2024 Buying Guide',
          description: 'Find the perfect family RV under $30,000. Compare top-rated travel trailers, get expert buying tips, and save thousands on your first RV purchase.',
          schema: [
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What size RV works best for families?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver.'
                  }
                },
                {
                  '@type': 'Question',
                  name: 'Should you buy new or used?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Used RVs offer significantly better value, especially for first-time buyers who want to avoid steep depreciation.'
                  }
                }
              ]
            }
          ]
        },
        content: `# Best Family RVs Under $30k: 2024 Buying Guide

Finding the perfect family RV under $30,000 requires balancing value, features, and your family's camping needs. This comprehensive guide helps you identify top options and make informed decisions that will serve your family for years to come.

## Top Budget RV Options for Family Adventures

Used travel trailers consistently offer the best value for families seeking RVs under $30,000. These units provide essential amenities while keeping costs manageable and offering the flexibility your growing family needs.

**What size RV works best for families?**
Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver at campsites.

**Should you buy new or used?**  
Used RVs offer significantly better value, especially for first-time buyers who want to avoid steep depreciation while still getting quality features.

**What's the total cost of RV ownership?**
Budget 20-30% beyond purchase price for first-year expenses including insurance, storage, and unexpected repairs to ensure financial readiness.

Ready to find your perfect family RV? [Browse certified pre-owned RVs in your area](https://example.com/search) or [get a free RV buying consultation](https://example.com/consultation) with our experts today.`,
        evidence: inputExpanded.evidence,
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
          wordCount: 1420,
          avgSentenceLength: 18.5,
          passiveVoicePercent: 12,
          fleschKincaidScore: 65
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: finalizedContent
      });

      const result = await FinalizeAgent.finalizeContent(inputExpanded);

      expect(result.success).toBe(true);
      expect(result.data.frontmatter.title).toContain('2024');
      expect(result.data.frontmatter.title.length).toBeLessThanOrEqual(60);
      expect(result.data.frontmatter.description.length).toBeLessThanOrEqual(155);
      expect(result.data.frontmatter.schema).toBeDefined();
      expect(result.data.seoOptimizations.titleOptimized).toBe(true);
      expect(result.data.seoOptimizations.ctaIncluded).toBe(true);
      expect(result.data.content).toContain('[Browse certified pre-owned RVs');
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Finalize this content with SEO optimizations')
      });
    });

    it('should handle agent errors gracefully', async () => {
      const inputExpanded = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for comprehensive RV buying guide.',
          slug: 'test-rv-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Test Author',
          category: 'test',
          tags: ['test'],
          cluster_id: 'test',
          stage: 'TOF' as const,
          intent: 'informational' as const,
          tpb: 'attitude' as const,
          canonical: 'https://example.com/test',
          reading_time: 8,
          word_count: 1600
        },
        content: 'Test content that is long enough to meet minimum requirements for finalization processing and SEO optimization.',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        imagePlaceholders: [],
        eatSignals: {
          lastReviewed: '2024-03-15',
          factChecked: false
        }
      };

      mockAgentRun.mockRejectedValue(new Error('Finalize processing failed'));

      const result = await FinalizeAgent.finalizeContent(inputExpanded);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Finalize processing failed');
    });

    it('should handle validation errors', async () => {
      const inputExpanded = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for comprehensive RV buying guide.',
          slug: 'test-rv-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Test Author',
          category: 'test',
          tags: ['test'],
          cluster_id: 'test',
          stage: 'TOF' as const,
          intent: 'informational' as const,
          tpb: 'attitude' as const,
          canonical: 'https://example.com/test',
          reading_time: 8,
          word_count: 1600
        },
        content: 'Test content for validation',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        imagePlaceholders: [],
        eatSignals: {
          lastReviewed: '2024-03-15',
          factChecked: false
        }
      };

      const invalidFinalized = {
        frontmatter: {
          ...inputExpanded.frontmatter,
          title: 'This title is way too long and exceeds the maximum character limit of 60 characters significantly',
          description: 'Too short' // Invalid - too short
        },
        content: 'Too short', // Invalid - too short
        evidence: inputExpanded.evidence,
        seoOptimizations: {
          titleOptimized: false,
          metaDescriptionOptimized: false,
          headingStructureValid: false,
          schemaMarkupIncluded: false,
          internalLinksAdded: false,
          externalLinksAdded: false,
          ctaIncluded: false
        },
        qualityMetrics: {
          readabilityGrade: 5, // Below minimum
          wordCount: 100, // Too short
          avgSentenceLength: 25,
          passiveVoicePercent: 35, // Too high
          fleschKincaidScore: 45 // Below minimum
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidFinalized
      });

      const result = await FinalizeAgent.finalizeContent(inputExpanded);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('optimizeTitle', () => {
    it('should optimize title for SEO within character limits', () => {
      const originalTitle = 'Best RVs Under $30k for Families';
      const funnel = 'MOF' as const;

      const result = FinalizeAgent.optimizeTitle(originalTitle, funnel);

      expect(result.length).toBeLessThanOrEqual(60);
      expect(result).toContain('2024');
      expect(result).toContain('RV');
      expect(result.toLowerCase()).toMatch(/guide|best|top/);
    });

    it('should adapt title based on funnel stage', () => {
      const originalTitle = 'RV Insurance Options';
      
      const tofResult = FinalizeAgent.optimizeTitle(originalTitle, 'TOF' as const);
      const mofResult = FinalizeAgent.optimizeTitle(originalTitle, 'MOF' as const);
      const bofResult = FinalizeAgent.optimizeTitle(originalTitle, 'BOF' as const);

      expect(tofResult.toLowerCase()).toMatch(/guide|what|how/);
      expect(mofResult.toLowerCase()).toMatch(/best|compare|vs/);
      expect(bofResult.toLowerCase()).toMatch(/buy|get|find/);
    });
  });

  describe('optimizeMetaDescription', () => {
    it('should optimize meta description within character limits', () => {
      const content = `# RV Buying Guide
      
      This comprehensive guide covers everything about buying RVs including budget considerations, features to look for, and expert recommendations.`;
      const funnel = 'MOF' as const;

      const result = FinalizeAgent.optimizeMetaDescription(content, funnel);

      expect(result.length).toBeGreaterThanOrEqual(120);
      expect(result.length).toBeLessThanOrEqual(155);
      expect(result.toLowerCase()).toContain('rv');
    });
  });

  describe('generateSchemaMarkup', () => {
    it('should generate FAQ schema for content with questions', () => {
      const content = `# RV Guide
      
      **What size RV should I buy?**
      Consider your family size and towing capacity.
      
      **How much should I budget?**
      Plan for $25,000-40,000 for a quality used RV.`;

      const result = FinalizeAgent.generateSchemaMarkup(content, 'FAQ');

      expect(result).toHaveLength(1);
      expect(result[0]['@type']).toBe('FAQPage');
      expect(result[0].mainEntity).toHaveLength(2);
      expect(result[0].mainEntity[0].name).toBe('What size RV should I buy?');
    });

    it('should generate Article schema for regular content', () => {
      const content = `# RV Buying Guide
      
      This is a comprehensive guide to buying RVs.`;

      const result = FinalizeAgent.generateSchemaMarkup(content, 'Article');

      expect(result).toHaveLength(1);
      expect(result[0]['@type']).toBe('Article');
      expect(result[0].name).toBe('RV Buying Guide');
    });
  });

  describe('addConversionCTA', () => {
    it('should add appropriate CTA based on funnel stage', () => {
      const content = `# RV Guide
      
      This is helpful RV information.`;

      const tofResult = FinalizeAgent.addConversionCTA(content, 'TOF' as const);
      const mofResult = FinalizeAgent.addConversionCTA(content, 'MOF' as const);
      const bofResult = FinalizeAgent.addConversionCTA(content, 'BOF' as const);

      expect(tofResult).toContain('[Learn more');
      expect(mofResult).toContain('[Compare');
      expect(bofResult).toContain('[Get started');
    });
  });

  describe('validateSEOOptimizations', () => {
    it('should validate complete SEO optimizations', () => {
      const finalContent = {
        frontmatter: {
          title: 'Best RVs Under $30k: Complete Guide',
          description: 'Find the perfect family RV under $30,000. Compare top-rated models, get expert buying tips, and make an informed purchase decision with confidence.',
          slug: 'best-rvs-under-30k',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['budget-rv'],
          cluster_id: 'rv-buying',
          stage: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          canonical: 'https://example.com/best-rvs-under-30k',
          reading_time: 10,
          word_count: 2000,
          schema: [
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              name: 'Best RVs Under $30k'
            }
          ]
        },
        content: `# Best RVs Under $30k: Complete Guide
        
        Finding the perfect family RV under $30,000 requires careful research and consideration of your specific needs. This comprehensive guide provides expert insights to help you make the right choice for your family's adventures.
        
        ## Top RV Options for Budget-Conscious Families
        
        Used travel trailers consistently offer the best value for families seeking quality RVs under $30,000. These units provide essential amenities while maintaining affordability and reliability for years of camping adventures.
        
        ### Key Features to Look For
        
        When shopping for budget RVs, focus on these critical elements:
        - Structural integrity and build quality
        - Essential appliances in working condition  
        - Adequate sleeping space for your family
        - Storage capacity for camping gear
        - Towing compatibility with your vehicle
        
        ## Buying Process and Inspection Tips
        
        Professional inspection is crucial when purchasing used RVs. Hidden issues can cost thousands in repairs, making thorough evaluation essential before finalizing your purchase.
        
        ### Financing Options
        
        Most buyers finance their RV purchase through banks, credit unions, or dealer financing. Compare rates and terms to find the best option for your budget and credit situation.
        
        **What size RV works best for families?**
        Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver at campsites.
        
        **Should you buy new or used?**
        Used RVs offer significantly better value, especially for first-time buyers who want to avoid steep depreciation while still getting quality features.
        
        ## Maintenance and Ownership Costs
        
        Budget beyond the purchase price for ongoing expenses including insurance, storage, maintenance, and repairs. These costs typically add 20-30% to your first-year ownership expenses.
        
        [Get started with RV shopping](https://example.com/search) today.`,
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
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
          wordCount: 1800,
          avgSentenceLength: 18,
          passiveVoicePercent: 15,
          fleschKincaidScore: 68
        }
      };

      const validation = FinalizeAgent.validateSEOOptimizations(finalContent);

      if (!validation.isValid) {
        console.log('Validation Issues:', validation.issues);
      }
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect SEO optimization issues', () => {
      const poorFinalContent = {
        frontmatter: {
          title: 'RVs',
          description: 'RV info',
          slug: 'rvs',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Author',
          category: 'buying',
          tags: ['rv'],
          cluster_id: 'rv',
          stage: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          canonical: 'https://example.com/rvs',
          reading_time: 5,
          word_count: 800
        },
        content: `# RVs
        
        RVs are vehicles.`,
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        seoOptimizations: {
          titleOptimized: false,
          metaDescriptionOptimized: false,
          headingStructureValid: false,
          schemaMarkupIncluded: false,
          internalLinksAdded: false,
          externalLinksAdded: false,
          ctaIncluded: false
        },
        qualityMetrics: {
          readabilityGrade: 6,
          wordCount: 500,
          avgSentenceLength: 30,
          passiveVoicePercent: 40,
          fleschKincaidScore: 45
        }
      };

      const validation = FinalizeAgent.validateSEOOptimizations(poorFinalContent);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Title too short (needs optimization)');
      expect(validation.issues).toContain('Meta description too short');
      expect(validation.issues).toContain('No schema markup included');
    });
  });
});
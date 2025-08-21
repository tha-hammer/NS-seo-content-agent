import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftSchema } from '@/schemas';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Draft Agent',
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

describe('DraftAgent', () => {
  let DraftAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mocks are set up
    DraftAgent = (await import('@/agents/DraftAgent')).DraftAgent;
  });

  describe('generateDraft', () => {
    it('should generate a valid draft from outline input', async () => {
      const outline = {
        title: 'Best RVs Under $30k for Families',
        slug: 'best-rvs-under-30k-families',
        funnel: 'MOF',
        intent: 'comparative',
        tpb: 'perceived-control',
        targetReader: 'first-time RV buyers with families',
        headings: [
          {
            h2: 'Top Budget RV Options',
            keypoints: ['Used travel trailers', 'Entry-level motorhomes'],
            children: [
              {
                h3: 'Travel Trailers Under $30k',
                bullets: ['Forest River Cherokee', 'Keystone Passport']
              }
            ]
          },
          {
            h2: 'What to Look For',
            keypoints: ['Inspection checklist', 'Safety features'],
            children: []
          }
        ],
        faqs: [
          {
            q: 'What is the best RV under $30k?',
            a_outline: 'Used travel trailers offer the best value in this price range'
          }
        ],
        metadata: {
          primaryKeyword: 'RVs under 30k',
          secondaryKeywords: ['budget RV', 'family RV'],
          suggestedUrl: '/buying/best-rvs-under-30k-families',
          wordcountTarget: 1800,
          estimatedReadTime: 9
        }
      };

      const validDraft = {
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
          stage: 'MOF',
          intent: 'comparative',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/best-rvs-under-30k-families',
          reading_time: 9,
          word_count: 1080
        },
        content: `# Best RVs Under $30k for Families

Finding the perfect family RV under $30,000 requires understanding value versus features. This guide covers the top budget-friendly options and essential buying considerations for first-time RV families.

## Top Budget RV Options

Used travel trailers consistently offer the best value for families seeking RVs under $30,000, providing essential amenities without premium pricing [1]. These units typically range from 20-28 feet and include sleeping for 4-6 people, basic kitchen facilities, and bathroom amenities.

Popular models in this price range include the Forest River Cherokee and Keystone Passport series [2]. Both manufacturers offer family-friendly layouts with bunk beds, dinette conversions, and adequate storage space.

## What to Look For

Professional inspection is crucial when buying used RVs, as hidden issues can cost thousands in repairs [3]. Focus on roof integrity, plumbing systems, electrical components, and structural soundness during your evaluation.

Key inspection points include checking for water damage, testing all appliances, examining tire condition, and verifying towing equipment compatibility [4]. "Always check the roof and plumbing systems first - these are the most expensive repairs." - Mike Johnson, Certified RV Inspector, 12 years experience.`,
        faqBlocks: [
          {
            question: 'What is the best RV under $30k?',
            answer: 'Used travel trailers offer the best value and features.'
          }
        ]
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: validDraft
      });

      const result = await DraftAgent.generateDraft(outline);

      if (!result.success) {
        console.log('Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.frontmatter.title).toBe('Best RVs Under $30k for Families');
      expect(result.data.content).toContain('# Best RVs Under $30k for Families');
      expect(result.data.content).toContain('## Top Budget RV Options');
      expect(result.data.content).toContain('## What to Look For');
      expect(result.data.faqBlocks).toHaveLength(1);
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Best RVs Under $30k for Families')
      });
    });

    it('should handle agent errors gracefully', async () => {
      const outline = {
        title: 'Test RV Guide',
        slug: 'test-rv-guide',
        funnel: 'TOF',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'RV beginners',
        headings: [],
        faqs: [],
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: [],
          suggestedUrl: '/test',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      mockAgentRun.mockRejectedValue(new Error('Token limit exceeded'));

      const result = await DraftAgent.generateDraft(outline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token limit exceeded');
    });

    it('should handle validation errors', async () => {
      const outline = {
        title: 'Test RV Guide',
        slug: 'test-rv-guide',
        funnel: 'TOF',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'RV beginners',
        headings: [],
        faqs: [],
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: [],
          suggestedUrl: '/test',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      const invalidDraft = {
        frontmatter: {
          title: '', // Invalid - empty title
          description: 'Short', // Invalid - too short
          slug: 'test-rv-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Author',
          category: 'test',
          tags: ['test'],
          cluster_id: 'test',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/test',
          reading_time: 1,
          word_count: 800
        },
        content: 'Short content.', // Invalid - too short, no sections
        faqBlocks: []
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidDraft
      });

      const result = await DraftAgent.generateDraft(outline);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('enhanceDraft', () => {
    it('should enhance draft with additional content', async () => {
      const originalDraft = {
        frontmatter: {
          title: 'RV Buying Guide',
          description: 'Learn how to buy your first RV with this comprehensive guide covering types, costs, and buying tips.',
          slug: 'rv-buying-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying', 'beginner-guide'],
          cluster_id: 'rv-buying',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/buying/rv-buying-guide',
          reading_time: 6,
          word_count: 1200
        },
        content: `# RV Buying Guide

Buying an RV is exciting. This guide helps you choose. We cover types and costs.

## RV Types

There are several types of RVs.`,
        faqBlocks: []
      };

      const enhancedDraft = {
        ...originalDraft,
        content: `# RV Buying Guide

Buying an RV is an exciting step toward adventure and freedom. This comprehensive guide helps you choose the right RV for your needs and budget based on extensive research and expert insights.

## RV Types

There are several types of RVs to consider for your family when making this significant investment. Travel trailers are the most popular choice for first-time buyers [1] due to their excellent balance of features and affordability.

"Travel trailers offer the best value for new RV buyers." - Sarah Williams, RV Dealer, 10 years experience

When selecting an RV type, consider your towing capacity, family size, and camping preferences. Each type offers distinct advantages and trade-offs.

### Travel Trailers

Travel trailers are the most popular choice for first-time buyers due to their affordability and versatility. These units can be unhitched at your campsite, allowing you to use your tow vehicle for local exploration and errands. They come in various sizes from compact 16-footers to spacious 35-foot family units.

## Budget Planning

Setting a realistic budget involves more than just the purchase price. Factor in insurance costs, maintenance expenses, storage fees, and any necessary upgrades to your tow vehicle.

## Getting Started

Before making your purchase, research different brands, visit RV shows, and consider renting to test different configurations and sizes.`
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: enhancedDraft
      });

      const enhancementRequests = [
        'Add more detail about travel trailers',
        'Include expert opinions',
        'Expand on family considerations'
      ];

      const result = await DraftAgent.enhanceDraft(originalDraft, enhancementRequests);

      if (!result.success) {
        console.log('EnhanceDraft Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.content).toContain('Travel trailers are the most popular choice');
      expect(result.data.content).toContain('Sarah Williams');
      expect(result.data.content).toContain('### Travel Trailers');
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Enhance this existing draft')
      });
    });
  });

  describe('validateDraftQuality', () => {
    it('should validate good draft quality', () => {
      const goodDraft = {
        frontmatter: {
          title: 'Complete RV Buying Guide for Families',
          description: 'This comprehensive guide walks through the essential considerations for first-time RV buyers, covering types, budgeting, and inspection tips.',
          slug: 'complete-rv-buying-guide-families',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying', 'family-rv', 'beginner-guide'],
          cluster_id: 'rv-buying',
          stage: 'MOF',
          intent: 'informational',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/complete-rv-buying-guide-families',
          reading_time: 12,
          word_count: 2400
        },
        content: `# Complete RV Buying Guide for Families

Choosing the right RV for your family adventure starts with understanding your specific needs, budget constraints, and long-term travel goals.

## RV Types for Families

Travel trailers between 25-30 feet offer the best balance of space, affordability, and maneuverability for most families [1]. When selecting an RV for family use, size and layout are crucial considerations.

### Travel Trailers

Travel trailers provide excellent value and flexibility for family camping adventures [2]. These units can be unhitched at your campsite, allowing you to use your tow vehicle for local exploration.

## Budget Considerations

Setting a realistic budget includes more than just the purchase price [3]. Factor in insurance costs, maintenance expenses, storage fees, and unexpected repairs when planning your RV investment.

## Inspection Checklist

Professional inspection can save thousands in unexpected repairs [4]. "Always get a professional inspection before buying any used RV." - John Smith, Certified RV Inspector, 15 years experience.

Key inspection points include checking for water damage, testing all systems, and examining structural components for wear and tear.`,
        faqBlocks: [
          {
            question: 'What type of RV is best for families?',
            answer: 'Travel trailers between 25-30 feet offer the best balance.'
          }
        ]
      } as any;

      const validation = DraftAgent.validateDraftQuality(goodDraft);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect draft quality issues', () => {
      const poorDraft = {
        frontmatter: {
          title: 'RV', // Too short
          description: 'Buy RV', // Too short
          slug: 'rv',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Author',
          category: 'buying',
          tags: ['rv'],
          cluster_id: 'rv',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/rv',
          reading_time: 1,
          word_count: 800
        },
        content: `# RV

RVs are good. Buy one.

## Section 1

Short content.`, // Too short, only one section
        faqBlocks: []
      } as any;

      const validation = DraftAgent.validateDraftQuality(poorDraft);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Title too short');
      expect(validation.issues).toContain('Description too short');
      expect(validation.issues).toContain('Draft needs at least 3 main sections');
    });
  });

  describe('addExpertQuote', () => {
    it('should add expert quote to draft', async () => {
      const draft = {
        frontmatter: {
          title: 'Complete RV Guide for Beginners',
          description: 'Complete guide to RV buying, maintenance, and travel tips for beginners.',
          slug: 'rv-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'guide',
          tags: ['rv-guide'],
          cluster_id: 'rv-guides',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/guide/rv-guide',
          reading_time: 8,
          word_count: 1600
        },
        content: `# Complete RV Guide for Beginners

This comprehensive guide covers everything you need to know about RV ownership, from buying your first recreational vehicle to maintaining it for years of reliable service.

## RV Maintenance

Basic maintenance tips for your RV are essential for ensuring long-term reliability and safety on the road. Regular inspections can prevent costly repairs and keep your family safe during travels.

Proper maintenance includes checking tire pressure, inspecting seals around windows and doors, maintaining the roof membrane, and servicing all mechanical systems including the generator, air conditioning, and plumbing.

## RV Types

Understanding different RV types helps you make an informed purchase decision. Travel trailers, fifth wheels, and motorhomes each offer unique advantages for different lifestyles and budgets.

## Getting Started

Before purchasing your first RV, consider renting different types to understand what works best for your family size and camping style.`,
        faqBlocks: []
      };

      const draftWithQuote = {
        ...draft,
        content: `# Complete RV Guide for Beginners

This comprehensive guide covers everything you need to know about RV ownership, from buying your first recreational vehicle to maintaining it for years of reliable service.

## RV Maintenance

Basic maintenance tips for your RV are essential for ensuring long-term reliability and safety on the road. Regular inspections can prevent costly repairs and keep your family safe during travels.

"Always inspect the roof and plumbing before buying." - Lisa Chen, RV Technician, ASE Certified [1]

Proper maintenance includes checking tire pressure, inspecting seals around windows and doors, maintaining the roof membrane, and servicing all mechanical systems including the generator, air conditioning, and plumbing.

## RV Types

Understanding different RV types helps you make an informed purchase decision. Travel trailers, fifth wheels, and motorhomes each offer unique advantages for different lifestyles and budgets.

## Getting Started

Before purchasing your first RV, consider renting different types to understand what works best for your family size and camping style.`
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: draftWithQuote
      });

      const expertInfo = {
        name: 'Lisa Chen',
        credentials: 'RV Technician, ASE Certified',
        topic: 'RV inspection'
      };

      const result = await DraftAgent.addExpertQuote(draft, expertInfo);

      if (!result.success) {
        console.log('AddExpertQuote Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.content).toContain('Lisa Chen');
      expect(result.data.content).toContain('Always inspect the roof and plumbing');
      expect(result.data.content).toContain('[1]');
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Add an expert quote')
      });
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutlineSchema } from '@/schemas';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Outline Agent',
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

describe('OutlineAgent', () => {
  let OutlineAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mocks are set up
    OutlineAgent = (await import('@/agents/OutlineAgent')).OutlineAgent;
  });

  describe('generateOutline', () => {
    it('should generate a valid outline from topic input', async () => {
      const validOutline = {
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
          },
          {
            h2: 'Financing Options',
            keypoints: ['Bank loans', 'Dealer financing'],
            children: []
          }
        ],
        faqs: [
          {
            q: 'What is the best RV under $30k?',
            a_outline: 'Used travel trailers offer the best value in this price range'
          },
          {
            q: 'Should I buy new or used?',
            a_outline: 'Used RVs provide better value and avoid depreciation'
          },
          {
            q: 'What should I inspect?',
            a_outline: 'Check roof, plumbing, electrical, and structural integrity'
          }
        ],
        metadata: {
          primaryKeyword: 'RVs under 30k',
          secondaryKeywords: ['budget RV', 'family RV', 'used RV'],
          suggestedUrl: '/buying/best-rvs-under-30k-families',
          wordcountTarget: 1800,
          estimatedReadTime: 9
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: validOutline
      });

      const result = await OutlineAgent.generateOutline('Best RVs under $30k for families', 'buying');

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Best RVs Under $30k for Families');
      expect(result.data.funnel).toBe('MOF');
      expect(result.data.headings).toHaveLength(3);
      expect(result.data.faqs).toHaveLength(3);
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Best RVs under $30k for families')
      });
    });

    it('should handle agent errors gracefully', async () => {
      mockAgentRun.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await OutlineAgent.generateOutline('Test topic', 'test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    it('should handle validation errors', async () => {
      const invalidOutline = {
        title: 'Invalid Outline',
        slug: 'invalid-outline',
        funnel: 'INVALID', // Invalid funnel stage
        intent: 'comparative',
        tpb: 'attitude',
        targetReader: 'test',
        headings: [], // Too few headings
        faqs: [], // Too few FAQs
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: ['test1', 'test2'],
          suggestedUrl: '/test',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidOutline
      });

      const result = await OutlineAgent.generateOutline('Test topic', 'test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('refineOutline', () => {
    it('should refine outline based on feedback', async () => {
      const originalOutline = {
        title: 'Basic RV Guide',
        slug: 'basic-rv-guide',
        funnel: 'TOF',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'RV beginners',
        headings: [
          { h2: 'RV Types', keypoints: ['Motorhomes', 'Trailers'], children: [] },
          { h2: 'Costs', keypoints: ['Purchase price', 'Maintenance'], children: [] },
          { h2: 'Getting Started', keypoints: ['Licensing', 'Insurance'], children: [] }
        ],
        faqs: [
          { q: 'What type of RV is best?', a_outline: 'It depends on your needs and budget' },
          { q: 'How much do RVs cost?', a_outline: 'Prices range from $10k to $500k+' },
          { q: 'Do I need a special license?', a_outline: 'Most RVs can be driven with a regular license' }
        ],
        metadata: {
          primaryKeyword: 'RV guide',
          secondaryKeywords: ['RV types', 'RV costs'],
          suggestedUrl: '/guide/basic-rv-guide',
          wordcountTarget: 1500,
          estimatedReadTime: 7
        }
      };

      const refinedOutline = {
        ...originalOutline,
        headings: [
          ...originalOutline.headings,
          { h2: 'RV Lifestyle Considerations', keypoints: ['Space management', 'Travel planning'], children: [] }
        ],
        metadata: {
          ...originalOutline.metadata,
          wordcountTarget: 1800
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: refinedOutline
      });

      const feedback = [
        'Add more specific RV models and brands',
        'Include section on RV lifestyle considerations',
        'Expand financing options discussion'
      ];

      const result = await OutlineAgent.refineOutline(originalOutline, feedback);

      expect(result.success).toBe(true);
      expect(result.data.headings).toHaveLength(4);
      expect(result.data.metadata.wordcountTarget).toBe(1800);
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Refine this existing outline')
      });
    });
  });

  describe('validateOutlineQuality', () => {
    it('should validate good outline quality', () => {
      const goodOutline = {
        title: 'Complete RV Buying Guide',
        slug: 'complete-rv-buying-guide',
        funnel: 'MOF',
        intent: 'comparative',
        tpb: 'perceived-control',
        targetReader: 'first-time RV buyers',
        headings: [
          { h2: 'RV Types', keypoints: ['Class A', 'Class B', 'Travel trailers'], children: [] },
          { h2: 'Budget Planning', keypoints: ['Purchase costs', 'Operating costs'], children: [] },
          { h2: 'Buying Process', keypoints: ['Research', 'Inspection', 'Financing'], children: [] }
        ],
        faqs: [
          { q: 'What size RV do I need?', a_outline: 'Consider your family size and travel plans' },
          { q: 'New or used RV?', a_outline: 'Used RVs offer better value for beginners' },
          { q: 'What should I budget?', a_outline: 'Budget 20-30% more than purchase price for first year' }
        ],
        metadata: {
          primaryKeyword: 'RV buying guide',
          secondaryKeywords: ['buy RV', 'RV purchase', 'RV shopping'],
          suggestedUrl: '/buying/complete-rv-buying-guide',
          wordcountTarget: 2000,
          estimatedReadTime: 10
        }
      } as any;

      const validation = OutlineAgent.validateOutlineQuality(goodOutline);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect outline quality issues', () => {
      const poorOutline = {
        title: 'This is a very long title that exceeds the recommended length for search engine display and will be truncated',
        slug: 'poor-outline',
        funnel: 'TOF',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'test users',
        headings: [
          { h2: 'Section 1', keypoints: ['Point 1'], children: [] }
        ],
        faqs: [
          { q: 'Question?', a_outline: 'Answer' }
        ],
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: ['test1'],
          suggestedUrl: '/test',
          wordcountTarget: 800,
          estimatedReadTime: 4
        }
      } as any;

      const validation = OutlineAgent.validateOutlineQuality(poorOutline);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Title too long for search results display');
      expect(validation.issues).toContain('Outline needs at least 3 main sections');
    });
  });
});
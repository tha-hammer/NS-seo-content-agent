import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpandedSchema } from '@/schemas';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Polish Agent',
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

describe('PolishAgent', () => {
  let PolishAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mocks are set up
    PolishAgent = (await import('@/agents/PolishAgent')).PolishAgent;
  });

  describe('polishContent', () => {
    it('should polish expanded content for clarity and scannability', async () => {
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
          stage: 'MOF',
          intent: 'comparative',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/best-rvs-under-30k-families',
          reading_time: 12,
          word_count: 2400
        },
        content: `# Best RVs Under $30k for Families

Finding the perfect family RV under $30,000 requires understanding value versus features while considering your family's specific needs and camping style. This guide provides comprehensive information to help you make the right choice for your family's adventures.

## Top Budget RV Options for Family Adventures

Used travel trailers consistently offer the best value for families seeking RVs under $30,000, providing essential amenities without premium pricing. These units typically range from 20-28 feet and include sleeping accommodations for 4-6 people.

The market for budget family RVs has expanded significantly, with manufacturers focusing on value-oriented features that matter most to families. Budget-conscious families can find excellent options that don't compromise on safety or essential amenities.

| Model | Length | Sleeps | Price Range | Key Features |
|-------|--------|--------|-------------|--------------|
| Forest River Cherokee | 25-28ft | 6-8 | $22,000-28,000 | Bunk beds, outdoor kitchen |
| Keystone Passport | 24-30ft | 6-8 | $20,000-25,000 | Lightweight, family-friendly |

## What to Look For When Buying

Professional inspection is crucial when buying used RVs, as hidden issues can cost thousands in unexpected repairs later on.`,
        evidence: {
          claims: [
            {
              statement: 'Used travel trailers offer the best value',
              sources: ['https://rvia.org/market-report-2024'],
              confidence: 'high',
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/market-report-2024',
              title: 'RV Industry Market Report 2024',
              authority: 'high',
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

      const polishedExpanded = {
        ...inputExpanded,
        content: `# Best RVs Under $30k for Families

Finding the perfect family RV under $30,000 requires balancing value, features, and your family's specific camping needs. This guide helps you identify top options and make informed decisions.

## Top Budget RV Options

Used travel trailers consistently offer the best value for families seeking RVs under $30,000. These units provide essential amenities while keeping costs manageable.

Key advantages of budget travel trailers:
- **Affordability**: Lower purchase price and insurance costs
- **Flexibility**: Unhitch for local exploration
- **Variety**: Wide range of floor plans available

| Model | Length | Sleeps | Price Range | Best Feature |
|-------|--------|--------|-------------|--------------|
| Forest River Cherokee | 25-28ft | 6-8 | $22,000-28,000 | Bunk beds, outdoor kitchen |
| Keystone Passport | 24-30ft | 6-8 | $20,000-25,000 | Lightweight design |

## Buying Checklist

Professional inspection prevents costly surprises. Focus on these critical areas:

- [ ] Roof condition and water damage
- [ ] Plumbing system functionality  
- [ ] Electrical connections and safety
- [ ] Appliance operation
- [ ] Structural integrity

**What size RV works best for families?**
Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver.

**Should you buy new or used?**
Used RVs offer significantly better value, especially for first-time buyers who want to avoid steep depreciation.

**What's the total cost of RV ownership?**
Budget 20-30% beyond purchase price for first-year expenses including insurance, storage, and unexpected repairs.`,
        evidence: {
          ...inputExpanded.evidence,
          claims: [
            {
              statement: 'Used travel trailers offer the best value',
              sources: ['https://rvia.org/market-report-2024'],
              confidence: 'high',
              ymyl: false
            },
            {
              statement: 'Professional inspection prevents costly surprises',
              sources: ['https://rvtrader.com/inspection-guide'],
              confidence: 'high',
              ymyl: false
            }
          ]
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: polishedExpanded
      });

      const result = await PolishAgent.polishContent(inputExpanded);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('**What size RV works best for families?**');
      expect(result.data.content).toContain('- [ ] Roof condition');
      expect(result.data.content).toContain('Key advantages of budget travel trailers:');
      expect(result.data.content).not.toContain('later on'); // Remove redundancy
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Polish this expanded content')
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
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/test',
          reading_time: 8,
          word_count: 1600
        },
        content: 'Test content',
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

      mockAgentRun.mockRejectedValue(new Error('Polish processing failed'));

      const result = await PolishAgent.polishContent(inputExpanded);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Polish processing failed');
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
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/test',
          reading_time: 8,
          word_count: 1600
        },
        content: 'Test content',
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

      const invalidPolished = {
        frontmatter: inputExpanded.frontmatter,
        content: 'Too short', // Invalid - too short
        evidence: inputExpanded.evidence,
        imagePlaceholders: [],
        eatSignals: {
          lastReviewed: 'invalid-date', // Invalid date format
          factChecked: false
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidPolished
      });

      const result = await PolishAgent.polishContent(inputExpanded);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('ensurePAAAnswered', () => {
    it('should ensure all People Also Ask questions are answered', async () => {
      const expanded = {
        frontmatter: {
          title: 'RV Buying Guide',
          description: 'Complete guide to buying your first RV with expert tips.',
          slug: 'rv-buying-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying'],
          cluster_id: 'rv-buying',
          stage: 'MOF',
          intent: 'comparative',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/rv-buying-guide',
          reading_time: 10,
          word_count: 2000
        },
        content: `# RV Buying Guide

Basic RV buying information.

## RV Types

Different types available.`,
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

      const expandedWithPAA = {
        ...expanded,
        content: `# RV Buying Guide

Complete guide to buying your first RV with confidence and expert insights to help you navigate the complex world of recreational vehicle ownership.

## RV Types and Selection

Understanding different RV types helps you choose the right option for your family's unique needs and travel preferences.

Travel trailers offer excellent value for first-time buyers, providing essential amenities while maintaining affordability. These units range from compact 16-footers to spacious 35-foot family models with comprehensive features.

**What size RV should I buy?**
Consider your family size, towing capacity, and camping preferences when selecting RV size. Most families find 25-30 foot travel trailers provide optimal space while remaining manageable.

**How much should I spend on my first RV?**
First-time buyers typically spend $15,000-40,000 for a quality used travel trailer. Budget an additional 20-30% for taxes, fees, and initial setup costs.

## Buying Process and Inspection

The RV buying process requires careful planning and thorough evaluation to ensure you make a smart investment.

**Do I need a special license to drive an RV?**
Most RVs under 26,000 lbs can be driven with a regular driver's license. However, some states have specific requirements for larger units.

**What should I inspect before buying?**
Focus on roof condition, water damage signs, plumbing functionality, electrical systems operation, and structural integrity. Hire a professional inspector for peace of mind.

## Ownership Considerations

Understanding the full scope of RV ownership helps you prepare for long-term success and enjoyment.

**Is RV insurance required?**
Yes, RV insurance is required in all states and covers both vehicle and personal property aspects. Costs typically range from $1,000-$2,500 annually depending on usage and coverage.

### Maintenance Planning

Regular maintenance ensures your RV remains safe and reliable for years of adventure. Create a seasonal maintenance schedule covering all major systems.

### Storage Options

Consider your storage needs carefully, as costs vary significantly between indoor and outdoor options. Indoor storage protects your investment but costs more than outdoor alternatives.`
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: expandedWithPAA
      });

      const paaQuestions = [
        'What size RV should I buy?',
        'How much should I spend on my first RV?',
        'Do I need a special license to drive an RV?',
        'What should I inspect before buying?',
        'Is RV insurance required?'
      ];

      const result = await PolishAgent.ensurePAAAnswered(expanded, paaQuestions);

      if (!result.success) {
        console.log('EnsurePAAAnswered Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.content).toContain('**What size RV should I buy?**');
      expect(result.data.content).toContain('**How much should I spend on my first RV?**');
      expect(result.data.content).toContain('**Do I need a special license to drive an RV?**');
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Ensure all PAA questions are answered')
      });
    });
  });

  describe('validatePolishQuality', () => {
    it('should validate polished content quality', () => {
      const goodPolished = {
        frontmatter: {
          title: 'Complete RV Buying Guide',
          description: 'Expert guide to buying your first RV with confidence.',
          slug: 'complete-rv-buying-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying'],
          cluster_id: 'rv-buying',
          stage: 'MOF',
          intent: 'comparative',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/complete-rv-buying-guide',
          reading_time: 12,
          word_count: 2400
        },
        content: `# Complete RV Buying Guide

Expert guidance for first-time purchasers seeking the perfect recreational vehicle for family adventures and memorable travels.

## Vehicle Types and Features

Understanding different categories helps you select the ideal option for your family's needs and budget constraints.

### Travel Trailers

These towable units offer excellent value for newcomers:
- **Affordability**: Lower costs than motorhomes
- **Flexibility**: Unhitch for local exploration  
- **Variety**: Multiple floor plans available

**What size travel trailer works best?**
Most families find 25-30 foot units provide optimal space while remaining manageable to tow and maneuver at campsites.

## Budget Planning Essentials

| Category | Cost Range | Key Factors |
|----------|------------|-------------|
| Purchase | $20k-30k | Age, condition, features |
| Insurance | $1k-2k/year | Value, usage, location |
| Storage | $600-1.8k/year | Indoor vs outdoor facilities |

### Pre-Purchase Inspection

- [ ] Roof integrity and weatherproof seals
- [ ] Water damage indicators throughout
- [ ] Plumbing functionality and fixtures  
- [ ] Electrical systems and connections
- [ ] Appliance operation and condition

**How much should newcomers budget?**
Plan for $25,000-35,000 total including taxes, fees, and initial setup costs for a quality used unit.

**What questions should I ask sellers?**
Focus on maintenance history, known issues, reason for selling, and included accessories or warranties.

## Getting Started Successfully

### Financing Options

| Lender Type | Interest Range | Benefits |
|-------------|----------------|----------|
| Credit Unions | 4-7% APR | Member rates, personal service |
| Banks | 5-8% APR | Competitive terms, established |
| Dealers | 6-12% APR | Convenient, immediate approval |

**Which financing option works best?**
Credit unions typically offer the most favorable rates and terms for qualified members seeking recreational vehicle loans.`,
        evidence: {
          claims: [
            {
              statement: 'Travel trailers offer excellent value',
              sources: ['https://rvia.org/market-report'],
              confidence: 'high',
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/market-report',
              title: 'RV Industry Market Report',
              authority: 'high',
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Focus on condition over age when buying used',
              attribution: 'Mike Johnson, RV Inspector',
              credentials: '15 years experience'
            }
          ]
        },
        imagePlaceholders: [
          {
            position: 'after-h2-1',
            altText: 'Family examining travel trailer exterior during RV lot visit',
            suggestedCaption: 'Inspect potential RVs thoroughly'
          }
        ],
        eatSignals: {
          authorBio: 'RV Expert has helped over 500 families find their perfect RV',
          lastReviewed: '2024-03-15',
          reviewedBy: 'Sarah Williams, RV Industry Specialist',
          factChecked: true
        }
      } as any;

      const validation = PolishAgent.validatePolishQuality(goodPolished);

      if (!validation.isValid) {
        console.log('Validation Issues:', validation.issues);
      }
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect polish quality issues', () => {
      const poorPolished = {
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
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/rvs',
          reading_time: 2,
          word_count: 400
        },
        content: `# RVs

RVs are good. RVs are great. Buy RVs now. RVs help families. Families love RVs.

## RV Stuff

RVs have things. Things are good. Good things help people. People need things.`,
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
      } as any;

      const validation = PolishAgent.validatePolishQuality(poorPolished);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Content has repetitive language');
      expect(validation.issues).toContain('No PAA questions answered');
      expect(validation.issues).toContain('Headings need improvement');
    });
  });

  describe('checkInclusiveLanguage', () => {
    it('should identify inclusive language opportunities', () => {
      const content = `# RV Guide for Guys

When a man buys his first RV, he should consider his wife's needs too. Guys often focus on technical specs while ladies prefer comfort features.`;

      const result = PolishAgent.checkInclusiveLanguage(content);

      expect(result.hasIssues).toBe(true);
      expect(result.issues).toContain('Use gender-neutral language instead of "guys"');
      expect(result.suggestions).toContain('Consider: "When someone buys their first RV"');
    });

    it('should validate inclusive content', () => {
      const content = `# RV Guide for Everyone

When someone buys their first RV, they should consider their family's needs. People often focus on different priorities when selecting an RV.`;

      const result = PolishAgent.checkInclusiveLanguage(content);

      expect(result.hasIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
    });
  });
});
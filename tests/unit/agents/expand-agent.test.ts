import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpandedSchema } from '@/schemas';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Expand Agent',
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

describe('ExpandAgent', () => {
  let ExpandAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import after mocks are set up
    ExpandAgent = (await import('@/agents/ExpandAgent')).ExpandAgent;
  });

  describe('expandDraft', () => {
    it('should expand a draft with additional content and E-E-A-T elements', async () => {
      const inputDraft = {
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

Finding the perfect family RV under $30,000 requires understanding value versus features [1].

## Top Budget RV Options

Used travel trailers consistently offer the best value for families seeking RVs under $30,000 [2].

## What to Look For

Professional inspection is crucial when buying used RVs [3].`,
        faqBlocks: [
          {
            question: 'What is the best RV under $30k?',
            answer: 'Used travel trailers offer the best value and features.'
          }
        ]
      };

      const expandedDraft = {
        frontmatter: {
          ...inputDraft.frontmatter,
          word_count: 1800
        },
        content: `# Best RVs Under $30k for Families

Finding the perfect family RV under $30,000 requires understanding value versus features while considering your family's specific needs and camping style [1].

## Top Budget RV Options

Used travel trailers consistently offer the best value for families seeking RVs under $30,000, providing essential amenities without premium pricing [2]. Here's a comparison of popular models:

| Model | Length | Sleeps | Avg Price | Key Features |
|-------|--------|--------|-----------|--------------|
| Forest River Cherokee | 25-28ft | 6-8 | $22,000-28,000 | Bunk beds, outdoor kitchen |
| Keystone Passport | 24-30ft | 6-8 | $20,000-25,000 | Lightweight, family-friendly |
| Coachmen Clipper | 21-25ft | 4-6 | $18,000-23,000 | Compact, easy towing |

### Travel Trailer Advantages

Travel trailers offer several key benefits for families:

- **Flexibility**: Unhitch at campsite for local exploration
- **Affordability**: Lower purchase price and insurance costs
- **Variety**: Wide range of floor plans and features
- **Maintenance**: Simpler systems than motorhomes

## What to Look For

Professional inspection is crucial when buying used RVs, as hidden issues can cost thousands in unexpected repairs [3].

### Essential Inspection Checklist

- [ ] Roof condition and seals
- [ ] Water damage signs (soft spots, discoloration)
- [ ] Plumbing system functionality
- [ ] Electrical system operation
- [ ] Tire condition and age
- [ ] Appliance functionality
- [ ] Frame and hitch integrity

**Image Placeholder**: RV inspection checklist infographic showing key areas to examine

## Financing Your RV Purchase

When budgeting for your RV, consider these financing options:

1. **Traditional bank loans** - Often offer competitive rates
2. **Credit union financing** - May provide better terms for members
3. **Dealer financing** - Convenient but compare rates carefully

### Budget Beyond Purchase Price

| Expense Category | Annual Cost Range |
|------------------|-------------------|
| Insurance | $1,000-$2,500 |
| Storage | $600-$1,800 |
| Maintenance | $500-$1,500 |
| Registration/Fees | $200-$800 |

## Family-Friendly Features to Consider

Look for these features when shopping for a family RV:

- **Bunk beds** for children
- **Dinette conversion** for extra sleeping
- **Outdoor entertainment center** for campsite activities
- **Adequate storage** for toys and gear
- **Safety features** like smoke/CO detectors

**Expert Insight**: "Focus on floor plan over fancy features. A functional layout matters more than premium finishes for family camping." - Mike Johnson, Certified RV Inspector, 15 years experience

## Maintenance Tips for Budget RVs

Regular maintenance extends your RV's life and prevents costly repairs:

### Seasonal Maintenance Schedule

**Spring Preparation:**
- Inspect and reseal roof
- Check tire pressure and tread
- Test all systems after storage

**Summer Care:**
- Monitor A/C performance
- Check awning operation
- Inspect exterior seals

**Fall Winterization:**
- Drain water system
- Clean and inspect interior
- Prepare for storage`,
        evidence: {
          claims: [
            {
              statement: 'Used travel trailers consistently offer the best value for families',
              sources: ['https://rvia.org/market-report-2024'],
              confidence: 'high',
              ymyl: false
            },
            {
              statement: 'Professional inspection can save thousands in repairs',
              sources: ['https://rvtrader.com/inspection-guide'],
              confidence: 'high',
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/market-report-2024',
              title: 'RV Industry Association Market Report 2024',
              authority: 'high',
              lastAccessed: '2024-03-15'
            },
            {
              url: 'https://rvtrader.com/inspection-guide',
              title: 'Complete RV Inspection Guide',
              authority: 'high',
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Focus on floor plan over fancy features. A functional layout matters more than premium finishes for family camping.',
              attribution: 'Mike Johnson, Certified RV Inspector',
              credentials: '15 years experience, NRVIA certified'
            }
          ]
        },
        imagePlaceholders: [
          {
            position: 'after-h2-2',
            altText: 'RV inspection checklist infographic showing key areas to examine when buying a used RV',
            suggestedCaption: 'Essential inspection points for used RV purchases'
          },
          {
            position: 'in-section-financing',
            altText: 'Family reviewing RV financing options with dealer at RV lot',
            suggestedCaption: 'Compare financing options before making your RV purchase'
          }
        ],
        eatSignals: {
          authorBio: 'RV Expert has been helping families find the perfect recreational vehicles for over 10 years, with extensive experience in RV sales, service, and lifestyle coaching.',
          lastReviewed: '2024-03-15',
          reviewedBy: 'Sarah Williams, RV Industry Specialist',
          factChecked: true
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: expandedDraft
      });

      const result = await ExpandAgent.expandDraft(inputDraft);

      expect(result.success).toBe(true);
      expect(result.data.content).toContain('| Model | Length | Sleeps');
      expect(result.data.content).toContain('- [ ] Roof condition');
      expect(result.data.content).toContain('Image Placeholder');
      expect(result.data.evidence.claims).toHaveLength(2);
      expect(result.data.imagePlaceholders).toHaveLength(2);
      expect(result.data.eatSignals.factChecked).toBe(true);
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Expand this draft')
      });
    });

    it('should handle agent errors gracefully', async () => {
      const inputDraft = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for RV guide with comprehensive information.',
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
          reading_time: 6,
          word_count: 1200
        },
        content: 'Test content',
        faqBlocks: []
      };

      mockAgentRun.mockRejectedValue(new Error('Content generation failed'));

      const result = await ExpandAgent.expandDraft(inputDraft);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content generation failed');
    });

    it('should handle validation errors', async () => {
      const inputDraft = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for RV guide with comprehensive information.',
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
          reading_time: 6,
          word_count: 1200
        },
        content: 'Test content',
        faqBlocks: []
      };

      const invalidExpanded = {
        frontmatter: inputDraft.frontmatter,
        content: 'Too short', // Invalid - too short
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        imagePlaceholders: [],
        eatSignals: {
          lastReviewed: 'invalid-date', // Invalid date format
          factChecked: false
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidExpanded
      });

      const result = await ExpandAgent.expandDraft(inputDraft);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('addTablesAndExamples', () => {
    it('should add tables and practical examples to content', async () => {
      const draft = {
        frontmatter: {
          title: 'RV Buying Guide',
          description: 'Learn how to buy your first RV with this comprehensive guide.',
          slug: 'rv-buying-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying'],
          cluster_id: 'rv-buying',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/buying/rv-buying-guide',
          reading_time: 8,
          word_count: 1600
        },
        content: `# RV Buying Guide

Learn about different RV types and their costs.`,
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

      const enhancedDraft = {
        ...draft,
        content: `# RV Buying Guide

Learn about different RV types and their costs through detailed comparisons and real-world examples that help you make informed purchasing decisions.

## RV Type Comparison

| RV Type | Price Range | Pros | Cons |
|---------|-------------|------|------|
| Travel Trailer | $15k-40k | Affordable, flexible | Requires tow vehicle |
| Fifth Wheel | $25k-80k | Spacious, stable | Needs pickup truck |
| Motorhome | $50k-300k | Self-contained, convenient | Expensive, complex |

### Detailed Cost Analysis

| Category | Travel Trailer | Fifth Wheel | Motorhome |
|----------|----------------|-------------|-----------|
| Initial Cost | $15k-40k | $25k-80k | $50k-300k |
| Insurance | $1k-2k/year | $1.5k-3k/year | $2k-5k/year |
| Maintenance | $500-1.5k/year | $800-2k/year | $2k-5k/year |
| Storage | $50-150/month | $75-200/month | $100-300/month |

### Example: First-Time Buyer Journey

Meet the Johnson family: two adults, two kids, looking for their first RV. Here's how they approached their purchase:

1. **Budget Planning**: Set $30k maximum including prep costs
2. **Research Phase**: Attended local RV show, test drove 3 models  
3. **Inspection**: Hired certified inspector for $400
4. **Final Decision**: 2018 Forest River Cherokee, 27ft, $24,500

The Johnsons spent 6 months researching before making their purchase. They started by renting different RV types to understand what worked for their family. After trying a motorhome (too expensive), a fifth wheel (couldn't tow with their SUV), they settled on a travel trailer.

Their inspection revealed minor issues that saved them $2,000 in negotiation. Today, they're happy full-time RVers who travel the country while working remotely.

## Financing Options

Understanding your financing options helps you make the best financial decision for your situation.

### Loan Comparison Table

| Lender Type | Interest Rate | Terms | Pros | Cons |
|-------------|---------------|-------|------|------|
| Banks | 4-8% | 5-20 years | Competitive rates | Strict requirements |
| Credit Unions | 3-7% | 5-15 years | Member benefits | Limited availability |
| Dealers | 5-12% | 3-15 years | Convenient | Higher rates |

### Pre-Purchase Checklist

- [ ] Determine your budget including taxes and fees
- [ ] Get pre-approved for financing
- [ ] Research insurance costs
- [ ] Plan for storage and maintenance
- [ ] Consider tow vehicle requirements
- [ ] Factor in campground and fuel costs

## Getting Started Tips

Start your RV journey with confidence by following these proven strategies from experienced RVers and industry professionals.`
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: enhancedDraft
      });

      const topics = ['RV types comparison', 'Real buyer examples'];
      const result = await ExpandAgent.addTablesAndExamples(draft, topics);

      if (!result.success) {
        console.log('AddTablesAndExamples Error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data.content).toContain('| RV Type | Price Range');
      expect(result.data.content).toContain('Example: First-Time Buyer Journey');
      expect(result.data.content).toContain('Johnson family');
    });
  });

  describe('validateExpandedQuality', () => {
    it('should validate good expanded content quality', () => {
      const goodExpanded = {
        frontmatter: {
          title: 'Complete RV Guide',
          description: 'Comprehensive guide to RV buying with expert insights.',
          slug: 'complete-rv-guide',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['rv-buying'],
          cluster_id: 'rv-buying',
          stage: 'MOF',
          intent: 'comparative',
          tpb: 'perceived-control',
          canonical: 'https://example.com/buying/complete-rv-guide',
          reading_time: 12,
          word_count: 2400
        },
        content: `# Complete RV Guide

This comprehensive guide covers everything you need to know about RV ownership, from initial purchase through years of enjoyable travels.

## RV Types Comparison

| Type | Price Range | Pros | Cons | Best For |
|------|-------------|------|------|----------|
| Travel Trailer | $20k-40k | Flexible, affordable | Requires tow vehicle | First-time buyers |
| Fifth Wheel | $30k-80k | Spacious, luxurious | Needs pickup truck | Experienced RVers |
| Motorhome Class A | $80k-500k | Self-contained, luxury | Expensive maintenance | Full-time living |
| Motorhome Class B | $60k-150k | Easy to drive, efficient | Limited space | Solo/couple travel |
| Motorhome Class C | $50k-200k | Good compromise | Average fuel economy | Family adventures |

### Detailed Cost Analysis

| Expense Category | Annual Range | Factors |
|------------------|--------------|---------|
| Insurance | $1,000-$4,000 | RV value, usage, location |
| Maintenance | $1,500-$5,000 | Age, type, DIY vs professional |
| Storage | $600-$3,600 | Indoor vs outdoor, location |
| Registration/Fees | $200-$1,000 | State regulations, weight |

### Checklist: RV Inspection

- [ ] Roof condition and seals
- [ ] Water systems functionality
- [ ] Electrical systems operation
- [ ] Tire condition and age
- [ ] Appliance functionality
- [ ] Frame and structural integrity
- [ ] Slide-out operation
- [ ] Awning condition

**Image Placeholder**: RV comparison chart showing different types and their key characteristics

## Expert Recommendations

"Always get a professional inspection before buying any used RV. The $300-500 cost can save you thousands in unexpected repairs." - John Smith, Certified Inspector with 15 years experience

### Example: First-Time Buyer Success Story

Meet Sarah and Tom, a couple from Colorado who successfully purchased their first RV after months of research. They started with a budget of $40,000 and initially considered a small motorhome. However, after renting different types, they realized a travel trailer would better suit their needs.

Their journey included:
1. Attending three RV shows to compare options
2. Renting a travel trailer for a weekend test
3. Getting pre-approved for financing from their credit union
4. Hiring a professional inspector for their chosen unit
5. Negotiating a fair price based on inspection findings

Today, they're seasoned RVers who have traveled to 15 states and recommend the patient, methodical approach to anyone starting their RV journey.

## Financing and Budget Planning

Understanding your complete financial picture helps ensure RV ownership remains enjoyable rather than stressful.

### Loan Comparison Table

| Lender Type | Typical Rate | Max Term | Benefits | Drawbacks |
|-------------|--------------|----------|----------|-----------|
| Banks | 5-8% APR | 15-20 years | Competitive rates | Strict approval |
| Credit Unions | 4-7% APR | 12-15 years | Member benefits | Limited availability |
| Dealer Financing | 6-12% APR | 10-15 years | Convenient | Higher rates |
| Online Lenders | 5-10% APR | 12-20 years | Quick approval | Less personal service |

The content includes detailed analysis of each RV type with specific examples and actionable advice for buyers at different stages of their journey. Consider your long-term goals when making financing decisions.`,
        evidence: {
          claims: [
            {
              statement: 'Professional inspection saves money',
              sources: ['https://rvia.org/inspection-guide'],
              confidence: 'high',
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvia.org/inspection-guide',
              title: 'RV Inspection Guide',
              authority: 'high',
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Always get a professional inspection',
              attribution: 'John Smith, Certified Inspector',
              credentials: '15 years experience'
            }
          ]
        },
        imagePlaceholders: [
          {
            position: 'after-h2-1',
            altText: 'RV comparison chart showing different types and features',
            suggestedCaption: 'Compare RV types for your needs'
          }
        ],
        eatSignals: {
          authorBio: 'Expert with 10+ years in RV industry',
          lastReviewed: '2024-03-15',
          reviewedBy: 'Industry Specialist',
          factChecked: true
        }
      } as any;

      const validation = ExpandAgent.validateExpandedQuality(goodExpanded);

      if (!validation.isValid) {
        console.log('Validation Issues:', validation.issues);
      }
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect expanded content quality issues', () => {
      const poorExpanded = {
        frontmatter: {
          title: 'RV',
          description: 'Short',
          slug: 'rv',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Author',
          category: 'test',
          tags: ['rv'],
          cluster_id: 'test',
          stage: 'TOF',
          intent: 'informational',
          tpb: 'attitude',
          canonical: 'https://example.com/rv',
          reading_time: 1,
          word_count: 800
        },
        content: `# RV

Short content with no tables or examples.`,
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

      const validation = ExpandAgent.validateExpandedQuality(poorExpanded);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('Content too short for expanded draft');
      expect(validation.issues).toContain('No tables or structured data found');
      expect(validation.issues).toContain('No image placeholders provided');
    });
  });
});
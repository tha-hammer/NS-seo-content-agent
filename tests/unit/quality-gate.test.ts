import { describe, it, expect } from 'vitest';
import {
  validateContentQuality,
  checkEEATCompliance,
  validateSEOOptimization,
  calculateReadabilityScore,
  validateCitationIntegrity,
  checkYMYLCompliance,
  type QualityGateResult,
  type EEATSignals,
  type ReadabilityMetrics
} from '@/quality-gate';

describe('Quality Gate Validation', () => {
  describe('validateContentQuality', () => {
    it('should pass quality checks for good content', () => {
      const goodContent = {
        content: `# How to Buy Your First RV

When purchasing your first recreational vehicle, there are several important factors to consider. This comprehensive guide will walk you through the essential steps to make an informed decision.

## Understanding RV Types

Travel trailers are the most popular choice for beginners. They offer flexibility and are generally more affordable than motorhomes. Here are the main types to consider:

### Travel Trailers
These towable units offer great value and flexibility. You can unhitch them at your campsite and use your vehicle for local transportation.

### Fifth Wheels
Larger than travel trailers, fifth wheels provide more living space and storage. They require a pickup truck with a special hitch.

## Budget Considerations

Setting a realistic budget is crucial. Remember to factor in:
- Purchase price
- Insurance costs
- Maintenance expenses
- Storage fees

Expert John Smith, a certified RV inspector with 15 years of experience, recommends: "Always get a professional inspection before buying. It's worth spending $300-500 to avoid thousands in unexpected repairs."

## Frequently Asked Questions

**Q: What size RV should I buy for a family of four?**
A: For a family of four, consider a travel trailer between 25-30 feet or a fifth wheel between 28-35 feet.

**Q: Should I buy new or used?**
A: Used RVs offer better value, especially for first-time buyers. You'll avoid the steep depreciation hit of new units.

## Financing Your RV Purchase

When it comes to financing your recreational vehicle, you have several options available. Traditional bank loans often offer competitive rates for qualified buyers. Credit unions may provide even better terms for their members. Many RV dealers also offer financing packages, though it's important to compare rates carefully.

The typical loan term for an RV ranges from 10 to 20 years, depending on the purchase price and age of the unit. Newer, more expensive RVs often qualify for longer terms with lower monthly payments. However, remember that longer loans mean more interest paid over time.

## Insurance Considerations

RV insurance is different from standard auto insurance. You'll need coverage that addresses both the vehicle and living space aspects of your RV. Most insurance companies offer specialized RV policies that include liability, collision, comprehensive, and personal property coverage.

The cost of insurance varies based on the type and value of your RV, how often you use it, and where you store it. Full-time RVers will need additional coverage compared to weekend recreational users.

## Maintenance and Storage

Regular maintenance is crucial for RV ownership. Create a maintenance schedule that includes checking the roof for leaks, inspecting seals around windows and doors, and servicing the generator and appliances regularly. Many issues can be prevented with proper maintenance.

Storage is another important consideration. Indoor storage protects your investment but costs more than outdoor storage. If you choose outdoor storage, invest in a quality RV cover to protect against weather damage.

## Conclusion

Buying your first RV is an exciting step toward adventure and freedom. Take your time to research different options, get professional inspections, and understand all the costs involved. With proper planning and preparation, you'll find the perfect RV for your family's needs and budget.

Remember that RV ownership is more than just the initial purchase. Factor in ongoing costs like maintenance, insurance, storage, and fuel. Consider how often you'll realistically use the RV and whether it makes financial sense compared to other vacation options.

Don't rush the decision. Visit RV shows, rent different types of RVs to try them out, and talk to experienced RV owners about their experiences. The RV community is generally very welcoming and willing to share advice with newcomers.

Take RV driving lessons if you're buying a large motorhome. Practice backing up and maneuvering in empty parking lots before heading out on your first camping trip. Learn how to properly level your RV and connect utilities at campgrounds.

Start with shorter trips close to home before embarking on extended adventures. This allows you to work out any issues and get comfortable with your new RV in familiar territory. Keep a detailed checklist for departure and arrival procedures.

Most importantly, remember that RVing is about enjoying the journey and creating memories with family and friends. Don't get so caught up in the technical details that you forget to have fun exploring new destinations and experiencing the freedom that RV life offers.

The investment in a quality RV and proper preparation will pay dividends in years of enjoyable travels and adventures. Welcome to the wonderful world of RV ownership!`,
        frontmatter: {
          title: 'How to Buy Your First RV: Complete Beginner Guide',
          description: 'Learn everything you need to know about buying your first RV with expert tips, budget considerations, and type comparisons.',
          slug: 'how-to-buy-first-rv-guide',
          funnel: 'MOF',
          intent: 'informational',
          wordCount: 1800
        },
        evidence: {
          claims: [
            {
              statement: 'Travel trailers are the most popular choice for beginners',
              sources: ['https://rvtrader.com/rv-statistics'],
              confidence: 'high',
              ymyl: false
            }
          ],
          citations: [
            {
              url: 'https://rvtrader.com/rv-statistics',
              title: 'RV Market Statistics 2024',
              authority: 'high',
              lastAccessed: '2024-03-15'
            }
          ],
          expertQuotes: [
            {
              quote: 'Always get a professional inspection before buying',
              attribution: 'John Smith, Certified RV Inspector',
              credentials: '15 years experience, NRVIA certified'
            }
          ]
        }
      };

      const result = validateContentQuality(goodContent);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should fail quality checks for poor content', () => {
      const poorContent = {
        content: `# RV

Buy RV. Good. Cheap.

RV nice. Buy now.`,
        frontmatter: {
          title: 'RV',
          description: 'Buy RV',
          slug: 'rv',
          funnel: 'BOF',
          intent: 'transactional',
          wordCount: 10
        },
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        }
      };

      const result = validateContentQuality(poorContent);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(50);
      expect(result.issues).toContain('Content too short');
    });
  });

  describe('checkEEATCompliance', () => {
    it('should validate E-E-A-T signals', () => {
      const eatSignals: EEATSignals = {
        hasExpertQuotes: true,
        hasCitations: true,
        hasAuthorBio: true,
        hasReviewDate: true,
        hasCredentials: true,
        citationQuality: 'high',
        expertiseLevel: 'high'
      };

      const result = checkEEATCompliance(eatSignals, false);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(85);
    });

    it('should require higher standards for YMYL content', () => {
      const basicSignals: EEATSignals = {
        hasExpertQuotes: false,
        hasCitations: true,
        hasAuthorBio: false,
        hasReviewDate: true,
        hasCredentials: false,
        citationQuality: 'medium',
        expertiseLevel: 'medium'
      };

      const nonYMYLResult = checkEEATCompliance(basicSignals, false);
      const ymylResult = checkEEATCompliance(basicSignals, true);

      expect(nonYMYLResult.passed).toBe(true);
      expect(ymylResult.passed).toBe(false);
      expect(ymylResult.issues).toContain('YMYL content requires expert quotes');
    });
  });

  describe('validateSEOOptimization', () => {
    it('should validate proper SEO elements', () => {
      const seoContent = {
        title: 'Best Travel Trailers Under $30k for Families',
        description: 'Discover the top-rated travel trailers under $30,000 perfect for family adventures. Compare features, prices, and expert reviews.',
        headings: ['Introduction', 'Top Travel Trailers', 'Buying Tips', 'Conclusion'],
        wordCount: 1500,
        internalLinks: 4,
        externalLinks: 3,
        hasSchema: true,
        keywordDensity: 2.5
      };

      const result = validateSEOOptimization(seoContent, 'travel trailers under 30k');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should detect SEO issues', () => {
      const poorSEO = {
        title: 'A', // Too short
        description: 'Short', // Too short
        headings: [], // No headings
        wordCount: 100, // Too short
        internalLinks: 0,
        externalLinks: 0,
        hasSchema: false,
        keywordDensity: 10 // Keyword stuffing
      };

      const result = validateSEOOptimization(poorSEO, 'travel trailers');
      expect(result.passed).toBe(false);
      expect(result.issues).toContain('Title too short');
      expect(result.issues).toContain('Content too short');
      expect(result.issues).toContain('Keyword density too high');
    });
  });

  describe('calculateReadabilityScore', () => {
    it('should calculate readability metrics', () => {
      const easyText = `This is easy to read. The sentences are short. The words are simple. Anyone can understand this content.`;
      
      const metrics = calculateReadabilityScore(easyText);
      expect(metrics.fleschKincaidGrade).toBeLessThan(8);
      expect(metrics.avgSentenceLength).toBeLessThan(15);
      expect(metrics.avgWordsPerSentence).toBeLessThan(10);
    });

    it('should detect difficult text', () => {
      const difficultText = `This extraordinarily comprehensive documentation elucidates the multifaceted intricacies and sophisticated methodologies inherent in the implementation of recreational vehicle acquisition procedures, necessitating considerable intellectual engagement and substantial cognitive processing capabilities from the intended audience.`;
      
      const metrics = calculateReadabilityScore(difficultText);
      expect(metrics.fleschKincaidGrade).toBeGreaterThan(12);
      expect(metrics.avgSentenceLength).toBeGreaterThan(30);
    });
  });

  describe('validateCitationIntegrity', () => {
    it('should validate proper citations', () => {
      const validCitations = [
        {
          url: 'https://rvtrader.com/market-report',
          title: 'RV Market Report 2024',
          authority: 'high' as const,
          lastAccessed: '2024-03-15'
        },
        {
          url: 'https://rvia.org/industry-statistics',
          title: 'RVIA Industry Statistics',
          authority: 'high' as const,
          lastAccessed: '2024-03-14'
        }
      ];

      const result = validateCitationIntegrity(validCitations);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(85);
    });

    it('should detect citation issues', () => {
      const poorCitations = [
        {
          url: 'https://random-blog.com/rv-stuff',
          title: 'My RV Thoughts',
          authority: 'low' as const,
          lastAccessed: '2020-01-01' // Too old
        }
      ];

      const result = validateCitationIntegrity(poorCitations);
      expect(result.passed).toBe(false);
      expect(result.issues).toContain('Citation too old');
      expect(result.issues).toContain('Low authority source');
    });
  });

  describe('checkYMYLCompliance', () => {
    it('should validate YMYL content requirements', () => {
      const ymylContent = {
        content: `# RV Insurance Guide

**Important:** This information is for educational purposes only. Always consult with a licensed insurance agent before making insurance decisions.

When insuring your RV, consider these factors according to the Insurance Information Institute...`,
        hasDisclaimers: true,
        hasExpertReview: true,
        citationAuthority: 'high' as const,
        lastUpdated: '2024-03-15'
      };

      const result = checkYMYLCompliance(ymylContent);
      expect(result.passed).toBe(true);
    });

    it('should require disclaimers for YMYL content', () => {
      const ymylWithoutDisclaimers = {
        content: `# RV Insurance Guide

Just buy the cheapest insurance. It's all the same anyway.`,
        hasDisclaimers: false,
        hasExpertReview: false,
        citationAuthority: 'low' as const,
        lastUpdated: '2022-01-01'
      };

      const result = checkYMYLCompliance(ymylWithoutDisclaimers);
      expect(result.passed).toBe(false);
      expect(result.issues).toContain('YMYL content missing safety disclaimers');
    });
  });
});
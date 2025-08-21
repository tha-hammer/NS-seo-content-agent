import { describe, it, expect } from 'vitest';
import {
  OutlineSchema,
  DraftSchema,
  ExpandedSchema,
  FinalSchema,
  LinkGraphSchema,
  EvidenceSchema,
  type Outline,
  type Draft,
  type Expanded,
  type Final,
  type LinkGraph,
  type Evidence
} from '@/schemas';

describe('Schemas', () => {
  describe('OutlineSchema', () => {
    it('should validate a complete outline', () => {
      const validOutline = {
        title: 'Best RV Under $25k for Families',
        slug: 'best-rv-under-25k-families',
        funnel: 'MOF',
        intent: 'comparative',
        tpb: 'perceived-control',
        targetReader: 'first-time RV buyer with family of 4',
        headings: [
          {
            h2: 'Top Budget-Friendly RV Options',
            keypoints: ['Used travel trailers', 'Entry-level motorhomes'],
            children: [
              {
                h3: 'Travel Trailers Under $25k',
                bullets: ['Forest River Cherokee', 'Keystone Passport']
              }
            ]
          },
          {
            h2: 'What to Look for When Buying',
            keypoints: ['Inspection checklist', 'Financing options'],
            children: []
          },
          {
            h2: 'Financing Your RV Purchase',
            keypoints: ['Loan options', 'Credit requirements'],
            children: []
          }
        ],
        faqs: [
          {
            q: 'What is the best RV for a family of 4 under $25k?',
            a_outline: 'Used travel trailers with bunkhouse layout offer best value'
          },
          {
            q: 'Should I buy new or used?',
            a_outline: 'Used RVs provide better value in this price range'
          },
          {
            q: 'What financing options are available?',
            a_outline: 'Banks, credit unions, and RV dealers offer various loan programs'
          }
        ],
        metadata: {
          primaryKeyword: 'best RV under 25k',
          secondaryKeywords: ['budget RV', 'family RV', 'used RV'],
          suggestedUrl: '/buying/best-rv-under-25k-families',
          wordcountTarget: 1800,
          estimatedReadTime: 9
        }
      };

      expect(() => OutlineSchema.parse(validOutline)).not.toThrow();
      const parsed = OutlineSchema.parse(validOutline);
      expect(parsed.title).toBe(validOutline.title);
      expect(parsed.headings).toHaveLength(3);
      expect(parsed.faqs).toHaveLength(3);
    });

    it('should reject invalid funnel stage', () => {
      const invalidOutline = {
        title: 'Test Article',
        slug: 'test-article',
        funnel: 'INVALID',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'test reader',
        headings: [{ h2: 'Test', keypoints: ['point1', 'point2'] }],
        faqs: [{ q: 'Test?', a_outline: 'Answer' }],
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: ['test1', 'test2'],
          suggestedUrl: '/test',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      expect(() => OutlineSchema.parse(invalidOutline)).toThrow();
    });

    it('should require minimum headings and FAQs', () => {
      const insufficientOutline = {
        title: 'Test Article',
        slug: 'test-article',
        funnel: 'TOF',
        intent: 'informational',
        tpb: 'attitude',
        targetReader: 'test reader',
        headings: [{ h2: 'Test', keypoints: ['point1'] }], // Only 1 heading
        faqs: [{ q: 'Test?', a_outline: 'Answer' }], // Only 1 FAQ
        metadata: {
          primaryKeyword: 'test',
          secondaryKeywords: ['test1'],
          suggestedUrl: '/test',
          wordcountTarget: 1200,
          estimatedReadTime: 6
        }
      };

      expect(() => OutlineSchema.parse(insufficientOutline)).toThrow();
    });
  });

  describe('LinkGraphSchema', () => {
    it('should validate a complete link graph', () => {
      const validLinkGraph = {
        nodes: [
          {
            slug: 'rv-buying-guide',
            title: 'RV Buying Guide',
            cluster: 'buying',
            type: 'pillar',
            synonyms: ['RV purchase guide', 'buying an RV']
          },
          {
            slug: 'rv-inspection-checklist',
            title: 'RV Inspection Checklist',
            cluster: 'buying',
            type: 'supporting',
            synonyms: ['RV inspection', 'checking used RV']
          }
        ],
        edges: [
          {
            from: 'rv-buying-guide',
            to: 'rv-inspection-checklist',
            anchorHints: ['inspection checklist', 'how to inspect an RV'],
            priority: 9,
            type: 'pillar-to-supporting'
          }
        ]
      };

      expect(() => LinkGraphSchema.parse(validLinkGraph)).not.toThrow();
      const parsed = LinkGraphSchema.parse(validLinkGraph);
      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.edges).toHaveLength(1);
    });
  });

  describe('EvidenceSchema', () => {
    it('should validate evidence ledger', () => {
      const validEvidence = {
        claims: [
          {
            statement: 'RVs depreciate 20% in first year',
            sources: ['https://rvtrader.com/rv-depreciation-study'],
            confidence: 'high',
            ymyl: false
          }
        ],
        citations: [
          {
            url: 'https://rvtrader.com/rv-depreciation-study',
            title: 'RV Depreciation Study 2024',
            authority: 'high',
            lastAccessed: '2024-01-15'
          }
        ],
        expertQuotes: [
          {
            quote: 'Always get a professional inspection before buying',
            attribution: 'John Smith, Certified RV Inspector',
            credentials: 'NRVIA Certified Inspector, 15 years experience'
          }
        ]
      };

      expect(() => EvidenceSchema.parse(validEvidence)).not.toThrow();
      const parsed = EvidenceSchema.parse(validEvidence);
      expect(parsed.claims).toHaveLength(1);
      expect(parsed.citations).toHaveLength(1);
      expect(parsed.expertQuotes).toHaveLength(1);
    });
  });
});
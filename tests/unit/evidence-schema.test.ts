import { describe, it, expect } from 'vitest';
import { EvidenceSchema } from '../../src/schemas.js';

describe('Evidence Schema Flexibility', () => {
  it('should handle object evidence format', () => {
    const objectEvidence = {
      claims: [
        { statement: 'RVs are popular', sources: ['source1'], confidence: 'high', ymyl: false }
      ],
      citations: [
        { url: 'https://example.com', title: 'RV Stats', authority: 'high' }
      ],
      expertQuotes: [
        { quote: 'RVs are great', attribution: 'Expert Name', credentials: 'PhD' }
      ]
    };

    const result = EvidenceSchema.safeParse(objectEvidence);
    expect(result.success).toBe(true);
  });

  it('should handle array evidence format', () => {
    const arrayEvidence = [
      { statement: 'RVs cost $50k on average', sources: ['dealer-data'], confidence: 'high' },
      { url: 'https://rv-facts.com', title: 'RV Market Report', authority: 'high' },
      { quote: 'The RV market is booming', attribution: 'Market Analyst', credentials: 'CFA' }
    ];

    const result = EvidenceSchema.safeParse(arrayEvidence);
    expect(result.success).toBe(true);
  });

  it('should handle string evidence format', () => {
    const stringEvidence = 'Evidence citations and sources will be provided';

    const result = EvidenceSchema.safeParse(stringEvidence);
    expect(result.success).toBe(true);
  });

  it('should handle empty evidence', () => {
    const emptyEvidence = {};

    const result = EvidenceSchema.safeParse(emptyEvidence);
    expect(result.success).toBe(true);
  });
});

describe('Evidence Normalization', () => {
  it('should normalize array evidence to object format', () => {
    // Simulate what ExpandAgent does
    const mockParsedData = {
      frontmatter: { title: 'Test' },
      markdownContent: '# Test Content',
      evidence: [
        { statement: 'Fact 1', sources: ['source1'], confidence: 'high' },
        { url: 'https://example.com', title: 'Source', authority: 'medium' },
        { quote: 'Expert opinion', attribution: 'Expert', credentials: 'PhD' }
      ]
    };

    // Apply the same normalization logic as ExpandAgent
    if (mockParsedData.evidence && Array.isArray(mockParsedData.evidence)) {
      mockParsedData.evidence = {
        claims: mockParsedData.evidence.filter(item => item && typeof item === 'object' && item.statement),
        citations: mockParsedData.evidence.filter(item => item && typeof item === 'object' && item.url),
        expertQuotes: mockParsedData.evidence.filter(item => item && typeof item === 'object' && item.quote)
      };
    }

    expect(mockParsedData.evidence).toHaveProperty('claims');
    expect(mockParsedData.evidence).toHaveProperty('citations');
    expect(mockParsedData.evidence).toHaveProperty('expertQuotes');
    expect(mockParsedData.evidence.claims).toHaveLength(1);
    expect(mockParsedData.evidence.citations).toHaveLength(1);
    expect(mockParsedData.evidence.expertQuotes).toHaveLength(1);
  });
});
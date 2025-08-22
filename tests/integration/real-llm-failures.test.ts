import { describe, it, expect } from 'vitest';
import { EvidenceSchema } from '../../src/schemas.js';

describe('Real LLM Output Testing', () => {
  it('should handle actual LLM evidence format with object sources', () => {
    // This is the ACTUAL structure the LLM returned that caused the failure
    const realLLMEvidence = {
      claims: [
        {
          statement: "RVs require regular maintenance",
          sources: [
            { url: "https://example.com/rv-maintenance", title: "RV Maintenance Guide" },
            { url: "https://rv-tips.com", title: "Expert RV Care" }
          ],
          confidence: "high",
          ymyl: false
        },
        {
          statement: "Class A RVs are most expensive",
          sources: [
            { url: "https://rv-prices.com", title: "RV Pricing Data" }
          ],
          confidence: "medium",
          ymyl: true
        }
      ],
      citations: [],
      expertQuotes: []
    };

    // This should NOT fail - this is what the LLM actually returns
    const result = EvidenceSchema.safeParse(realLLMEvidence);
    if (!result.success) {
      console.log('Actual LLM validation errors:', JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('should handle sources as mixed string and object arrays', () => {
    // Sometimes LLM returns mixed formats
    const mixedSourcesEvidence = {
      claims: [
        {
          statement: "Mixed sources test",
          sources: [
            "https://simple-url.com",  // String
            { url: "https://detailed.com", title: "Detailed Source" }, // Object
            "Another simple string source"
          ]
        }
      ]
    };

    const result = EvidenceSchema.safeParse(mixedSourcesEvidence);
    expect(result.success).toBe(true);
  });

  it('should handle nested source objects with various properties', () => {
    // Real LLM might return complex source objects
    const complexSourcesEvidence = {
      claims: [
        {
          statement: "Complex sources test",
          sources: [
            {
              url: "https://authoritative-source.com",
              title: "Comprehensive RV Guide",
              author: "RV Expert",
              publishDate: "2024-01-15",
              authority: "high",
              lastAccessed: "2024-08-22"
            }
          ]
        }
      ]
    };

    const result = EvidenceSchema.safeParse(complexSourcesEvidence);
    expect(result.success).toBe(true);
  });
});
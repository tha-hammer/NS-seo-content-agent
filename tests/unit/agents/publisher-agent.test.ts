import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishedSchema } from '@/schemas';
import fs from 'fs/promises';
import path from 'path';

// Mock the @openai/agents module
const mockAgentRun = vi.fn();
const mockAgentCreate = vi.fn(() => ({
  name: 'Publisher Agent',
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
    },
    paths: {
      output: '/tmp/test-output',
      backup: '/tmp/test-backup'
    }
  })
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    copyFile: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn()
  }
}));

// Mock crypto
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn()
  }))
}));

describe('PublisherAgent', () => {
  let PublisherAgent: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock fs.stat to return file stats
    (fs.stat as any).mockResolvedValue({ size: 2048 });
    // Import after mocks are set up
    PublisherAgent = (await import('@/agents/PublisherAgent')).PublisherAgent;
  });

  describe('publishContent', () => {
    it('should publish finalized content to markdown file', async () => {
      const inputFinal = {
        frontmatter: {
          title: 'Best Family RVs Under $30k: 2024 Guide',
          description: 'Find the perfect family RV under $30,000. Compare top-rated models, get expert buying tips, and save thousands on your first RV purchase.',
          slug: 'best-family-rvs-under-30k-2024',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'RV Expert',
          category: 'buying',
          tags: ['budget-rv', 'family-rv', 'travel-trailers'],
          cluster_id: 'rv-buying',
          stage: 'MOF' as const,
          intent: 'comparative' as const,
          tpb: 'perceived-control' as const,
          canonical: 'https://example.com/buying/best-family-rvs-under-30k-2024',
          reading_time: 12,
          word_count: 2400,
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
                }
              ]
            }
          ]
        },
        content: `# Best Family RVs Under $30k: 2024 Guide

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

      const publishedContent = {
        filePath: '/tmp/test-output/buying/best-family-rvs-under-30k-2024.md',
        markdownContent: `---
title: "Best Family RVs Under $30k: 2024 Guide"
description: "Find the perfect family RV under $30,000. Compare top-rated models, get expert buying tips, and save thousands on your first RV purchase."
slug: "best-family-rvs-under-30k-2024"
date: "2024-03-15"
updated: "2024-03-15"
author: "RV Expert"
category: "buying"
tags: ["budget-rv", "family-rv", "travel-trailers"]
cluster_id: "rv-buying"
stage: "MOF"
intent: "comparative"
tpb: "perceived-control"
canonical: "https://example.com/buying/best-family-rvs-under-30k-2024"
reading_time: 12
word_count: 2400
schema:
  - "@context": "https://schema.org"
    "@type": "FAQPage"
    mainEntity:
      - "@type": "Question"
        name: "What size RV works best for families?"
        acceptedAnswer:
          "@type": "Answer"
          text: "Travel trailers between 25-30 feet provide optimal space while remaining manageable for most families to tow and maneuver."
---

# Best Family RVs Under $30k: 2024 Guide

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
        frontmatter: inputFinal.frontmatter,
        publishedAt: '2024-03-15T10:30:00Z',
        fileSize: 2048,
        backupPath: '/tmp/test-backup/buying/best-family-rvs-under-30k-2024-20240315-103000.md',
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
          wordCount: 1420,
          readingTime: 12,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: publishedContent
      });

      const result = await PublisherAgent.publishContent(inputFinal);

      expect(result.success).toBe(true);
      expect(result.data.filePath).toContain('.md');
      expect(result.data.markdownContent).toContain('---');
      expect(result.data.markdownContent).toContain('title:');
      expect(result.data.checksums.md5).toMatch(/^[a-f0-9]{32}$/);
      expect(result.data.validation.frontmatterValid).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockAgentRun).toHaveBeenCalledWith({
        input: expect.stringContaining('Publish this finalized content')
      });
    });

    it('should handle agent errors gracefully', async () => {
      const inputFinal = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for comprehensive RV buying guide that meets minimum length requirements.',
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
        content: 'Test content that meets the minimum length requirements for publication and includes all necessary elements for proper markdown generation and file output validation.',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
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
          wordCount: 1600,
          avgSentenceLength: 18,
          passiveVoicePercent: 15,
          fleschKincaidScore: 68
        }
      };

      mockAgentRun.mockRejectedValue(new Error('Publish processing failed'));

      const result = await PublisherAgent.publishContent(inputFinal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Publish processing failed');
    });

    it('should handle validation errors', async () => {
      const inputFinal = {
        frontmatter: {
          title: 'Test RV Guide',
          description: 'Test description for comprehensive RV buying guide that meets minimum length requirements.',
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
        content: 'Test content for validation testing purposes.',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
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
          wordCount: 1600,
          avgSentenceLength: 18,
          passiveVoicePercent: 15,
          fleschKincaidScore: 68
        }
      };

      const invalidPublished = {
        filePath: '/tmp/test.md',
        markdownContent: 'Too short', // Invalid - too short
        frontmatter: inputFinal.frontmatter,
        publishedAt: 'invalid-date', // Invalid date format
        fileSize: -1, // Invalid size
        checksums: {
          md5: 'invalid', // Invalid MD5
          sha256: 'invalid' // Invalid SHA256
        },
        validation: {
          frontmatterValid: true,
          markdownValid: true,
          linksValid: true,
          imagesValid: true
        },
        metadata: {
          wordCount: 100, // Too short
          readingTime: 1,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      };

      mockAgentRun.mockResolvedValue({
        success: true,
        output: invalidPublished
      });

      const result = await PublisherAgent.publishContent(inputFinal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('generateMarkdown', () => {
    it('should generate proper markdown with frontmatter', () => {
      const final = {
        frontmatter: {
          title: 'Test Article',
          description: 'Test description that meets minimum length requirements for proper SEO optimization.',
          slug: 'test-article',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Test Author',
          category: 'test',
          tags: ['test', 'markdown'],
          cluster_id: 'test',
          stage: 'MOF' as const,
          intent: 'informational' as const,
          tpb: 'attitude' as const,
          canonical: 'https://example.com/test-article',
          reading_time: 5,
          word_count: 1000
        },
        content: '# Test Article\n\nThis is test content.',
        evidence: {
          claims: [],
          citations: [],
          expertQuotes: []
        },
        seoOptimizations: {
          titleOptimized: true,
          metaDescriptionOptimized: true,
          headingStructureValid: true,
          schemaMarkupIncluded: false,
          internalLinksAdded: false,
          externalLinksAdded: false,
          ctaIncluded: false
        },
        qualityMetrics: {
          readabilityGrade: 9,
          wordCount: 1000,
          avgSentenceLength: 18,
          passiveVoicePercent: 15,
          fleschKincaidScore: 68
        }
      };

      const markdown = PublisherAgent.generateMarkdown(final);

      expect(markdown).toContain('---');
      expect(markdown).toContain('title: "Test Article"');
      expect(markdown).toContain('slug: "test-article"');
      expect(markdown).toContain('# Test Article');
      expect(markdown).toContain('This is test content.');
    });
  });

  describe('calculateChecksums', () => {
    it('should calculate MD5 and SHA256 checksums', async () => {
      const content = 'Test content for checksum calculation';
      
      // Mock crypto hash functions
      const crypto = await import('crypto');
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn()
      };
      vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);
      mockHash.digest.mockReturnValueOnce('a1b2c3d4e5f6789012345678901234ab');
      mockHash.digest.mockReturnValueOnce('a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456');

      const checksums = PublisherAgent.calculateChecksums(content);

      expect(checksums.md5).toBe('a1b2c3d4e5f6789012345678901234ab');
      expect(checksums.sha256).toBe('a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456');
      expect(crypto.createHash).toHaveBeenCalledWith('md5');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });

  describe('validateMarkdown', () => {
    it('should validate proper markdown structure', () => {
      const validMarkdown = `---
title: "Test Article"
description: "Valid description"
slug: "test-article"
---

# Test Article

Valid content here that meets the minimum length requirements for proper markdown validation. This content includes multiple sentences and sufficient detail to pass all validation checks including content length requirements and proper structure validation.`;

      const result = PublisherAgent.validateMarkdown(validMarkdown);

      if (!result.isValid) {
        console.log('Markdown Validation Issues:', result.issues);
      }
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect markdown validation issues', () => {
      const invalidMarkdown = `title: "Test Article"
# Test Article
Invalid content.`;

      const result = PublisherAgent.validateMarkdown(invalidMarkdown);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('Missing frontmatter delimiters');
    });
  });

  describe('createBackup', () => {
    it('should create backup file with timestamp', async () => {
      const filePath = '/tmp/test-output/test.md';
      const content = 'Test content for backup';

      const backupPath = await PublisherAgent.createBackup(filePath, content);

      expect(backupPath).toContain('/tmp/test-backup/');
      expect(backupPath).toContain('test-');
      expect(backupPath).toMatch(/\d{8}-\d{6}\.md$/);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith(backupPath, content, 'utf-8');
    });
  });

  describe('generateFilePath', () => {
    it('should generate appropriate file path from frontmatter', () => {
      const frontmatter = {
        title: 'Test Article',
        description: 'Test description',
        slug: 'test-article',
        date: '2024-03-15',
        updated: '2024-03-15',
        author: 'Test Author',
        category: 'buying',
        tags: ['test'],
        cluster_id: 'test',
        stage: 'MOF' as const,
        intent: 'informational' as const,
        tpb: 'attitude' as const,
        canonical: 'https://example.com/test',
        reading_time: 5,
        word_count: 1000
      };

      const filePath = PublisherAgent.generateFilePath(frontmatter);

      expect(filePath).toContain('buying/test-article.md');
      expect(filePath).toMatch(/^\/.*\/buying\/test-article\.md$/);
    });
  });

  describe('validatePublication', () => {
    it('should validate complete publication', () => {
      const published = {
        filePath: '/tmp/test.md',
        markdownContent: `---
title: "Complete Test Article for Publication Validation"
description: "Comprehensive test description that meets all minimum length requirements for SEO optimization and publication validation testing"
slug: "complete-test-article-publication-validation"
date: "2024-03-15"
updated: "2024-03-15"
author: "Test Author"
category: "test"
tags: ["testing", "validation", "publication"]
---

# Complete Test Article for Publication Validation

This is comprehensive test content that meets all minimum length requirements for proper publication validation. The content includes multiple paragraphs, proper structure, and sufficient detail to pass all validation checks including the 1200 character minimum requirement.

## Introduction to Test Content

When creating test content for publication validation, it's important to ensure that all aspects of the content meet the established criteria. This includes proper formatting, adequate length, meaningful structure, and comprehensive coverage of the topic at hand.

## Section 1: Detailed Content Requirements

Detailed information about the topic with multiple sentences that provide value to readers. This section includes comprehensive coverage of important points and maintains quality standards throughout the entire document. The content should be engaging, informative, and well-structured to ensure it passes all validation requirements.

### Subsection 1.1: Content Structure

Proper content structure is essential for publication validation. This includes appropriate heading hierarchy, well-organized paragraphs, and logical flow of information from one section to the next.

### Subsection 1.2: Length Requirements

Meeting minimum length requirements ensures that the content provides sufficient value to readers and meets publication standards for comprehensive coverage of topics.

## Section 2: Publication Validation Standards

Additional content that expands on the topic and provides practical examples. This ensures the content meets the minimum word count and length requirements for publication while maintaining quality and readability throughout the document.

### Subsection 2.1: Quality Assurance

More detailed information with specific examples and actionable advice that helps readers understand the topic thoroughly. Quality assurance processes ensure that all published content meets established standards.

### Subsection 2.2: Validation Processes

Comprehensive validation processes check various aspects of content including structure, length, formatting, and overall quality before publication approval.

## Section 3: Best Practices

Implementation of best practices ensures consistent quality across all published content. This includes following established guidelines, maintaining proper formatting, and ensuring adequate coverage of topics.

## Conclusion and Next Steps

Summary content that wraps up the article and provides clear next steps for readers. This conclusion ensures the content is complete, valuable, and meets all publication validation requirements including minimum length standards.`,
        frontmatter: {
          title: 'Test',
          description: 'Valid description that meets minimum length requirements.',
          slug: 'test',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Test',
          category: 'test',
          tags: ['test'],
          cluster_id: 'test',
          stage: 'TOF' as const,
          intent: 'informational' as const,
          tpb: 'attitude' as const,
          canonical: 'https://example.com/test',
          reading_time: 5,
          word_count: 1000
        },
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
          wordCount: 1000,
          readingTime: 5,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      };

      const validation = PublisherAgent.validatePublication(published);

      if (!validation.isValid) {
        console.log('Publication Validation Issues:', validation.issues);
      }
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect publication validation issues', () => {
      const poorPublished = {
        filePath: '',
        markdownContent: 'Too short',
        frontmatter: {
          title: 'T',
          description: 'Short',
          slug: 'test',
          date: '2024-03-15',
          updated: '2024-03-15',
          author: 'Test',
          category: 'test',
          tags: ['test'],
          cluster_id: 'test',
          stage: 'TOF' as const,
          intent: 'informational' as const,
          tpb: 'attitude' as const,
          canonical: 'https://example.com/test',
          reading_time: 1,
          word_count: 100
        },
        publishedAt: '2024-03-15T10:30:00Z',
        fileSize: 0,
        checksums: {
          md5: 'invalid',
          sha256: 'invalid'
        },
        validation: {
          frontmatterValid: false,
          markdownValid: false,
          linksValid: false,
          imagesValid: false
        },
        metadata: {
          wordCount: 100,
          readingTime: 1,
          lastModified: '2024-03-15T10:30:00Z',
          version: '1.0.0'
        }
      };

      const validation = PublisherAgent.validatePublication(poorPublished);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain('File path is empty');
      expect(validation.issues).toContain('Content too short for publication');
    });
  });
});
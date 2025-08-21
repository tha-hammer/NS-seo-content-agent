import { describe, it, expect } from 'vitest';
import {
  validateMarkdownStructure,
  generateTableOfContents,
  insertSchemaMarkup,
  optimizeHeadingStructure,
  validateFrontmatter,
  extractReadingTime,
  generateMetaDescription,
  type MarkdownValidationResult,
  type SchemaMarkup
} from '@/markdown';

describe('Markdown Processing', () => {
  describe('validateMarkdownStructure', () => {
    it('should validate correct markdown structure', () => {
      const validMarkdown = `# Main Title

## Section 1

Some content here.

### Subsection 1.1

More content.

## Section 2

Final content.`;

      const result = validateMarkdownStructure(validMarkdown);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing H1', () => {
      const invalidMarkdown = `## Section 1

Some content.`;

      const result = validateMarkdownStructure(invalidMarkdown);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing H1 heading');
    });

    it('should detect multiple H1 headings', () => {
      const invalidMarkdown = `# First Title

Content here.

# Second Title

More content.`;

      const result = validateMarkdownStructure(invalidMarkdown);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Multiple H1 headings found');
    });

    it('should detect improper heading hierarchy', () => {
      const invalidMarkdown = `# Main Title

#### Skipped levels

Content here.`;

      const result = validateMarkdownStructure(invalidMarkdown);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Improper heading hierarchy: H4 follows H1');
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate TOC from headings', () => {
      const markdown = `# Main Title

## Introduction

## Getting Started

### Prerequisites

### Installation Steps

## Advanced Usage

### Configuration

### Troubleshooting`;

      const toc = generateTableOfContents(markdown);
      expect(toc).toContain('- [Introduction](#introduction)');
      expect(toc).toContain('- [Getting Started](#getting-started)');
      expect(toc).toContain('  - [Prerequisites](#prerequisites)');
      expect(toc).toContain('  - [Installation Steps](#installation-steps)');
      expect(toc).toContain('- [Advanced Usage](#advanced-usage)');
    });

    it('should handle headings with special characters', () => {
      const markdown = `# Main Title

## Section: Getting Started!

### Sub-section (Part 1)`;

      const toc = generateTableOfContents(markdown);
      expect(toc).toContain('[Section: Getting Started!](#section-getting-started)');
      expect(toc).toContain('[Sub-section (Part 1)](#sub-section-part-1)');
    });

    it('should exclude H1 from TOC by default', () => {
      const markdown = `# Main Title

## Section 1`;

      const toc = generateTableOfContents(markdown);
      expect(toc).not.toContain('Main Title');
      expect(toc).toContain('Section 1');
    });
  });

  describe('insertSchemaMarkup', () => {
    it('should insert FAQPage schema', () => {
      const faqSchema: SchemaMarkup = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is the best RV for families?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Travel trailers with bunkhouse layouts are ideal for families.'
            }
          }
        ]
      };

      const frontmatter = { title: 'Test Article' };
      const result = insertSchemaMarkup(frontmatter, [faqSchema]);

      expect(result.schema).toHaveLength(1);
      expect(result.schema[0]['@type']).toBe('FAQPage');
    });

    it('should merge multiple schema types', () => {
      const schemas: SchemaMarkup[] = [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Test Article'
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: []
        }
      ];

      const frontmatter = { title: 'Test Article' };
      const result = insertSchemaMarkup(frontmatter, schemas);

      expect(result.schema).toHaveLength(2);
      expect(result.schema.map(s => s['@type'])).toContain('Article');
      expect(result.schema.map(s => s['@type'])).toContain('FAQPage');
    });
  });

  describe('optimizeHeadingStructure', () => {
    it('should fix heading hierarchy gaps', () => {
      const markdown = `# Main Title

#### Skipped Levels

Content here.

## Proper Section

### Proper Subsection`;

      const optimized = optimizeHeadingStructure(markdown);
      expect(optimized).toContain('## Skipped Levels'); // Should be corrected to H2
      expect(optimized).toContain('## Proper Section');
      expect(optimized).toContain('### Proper Subsection');
    });

    it('should handle multiple consecutive heading issues', () => {
      const markdown = `# Title

##### Deep Heading

###### Even Deeper

## Normal Section`;

      const optimized = optimizeHeadingStructure(markdown);
      expect(optimized).toContain('## Deep Heading');
      expect(optimized).toContain('### Even Deeper');
    });
  });

  describe('validateFrontmatter', () => {
    it('should validate complete frontmatter', () => {
      const frontmatter = {
        title: 'Complete RV Buying Guide',
        description: 'A comprehensive guide to buying your first RV with expert tips and advice.',
        slug: 'complete-rv-buying-guide',
        date: '2024-03-15',
        category: 'Buying Guides',
        tags: ['RV', 'buying', 'guide']
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteFrontmatter = {
        title: 'Test Article'
        // Missing description, slug, etc.
      };

      const result = validateFrontmatter(incompleteFrontmatter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: description');
      expect(result.errors).toContain('Missing required field: slug');
    });

    it('should validate field formats', () => {
      const invalidFrontmatter = {
        title: 'A', // Too short
        description: 'Short', // Too short
        slug: 'Invalid Slug!', // Invalid characters
        date: 'invalid-date',
        category: 'Test',
        tags: ['tag']
      };

      const result = validateFrontmatter(invalidFrontmatter);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be at least 10 characters');
      expect(result.errors).toContain('Description must be at least 50 characters');
      expect(result.errors).toContain('Slug contains invalid characters');
    });
  });

  describe('extractReadingTime', () => {
    it('should calculate reading time based on word count', () => {
      // Average reading speed is ~200 words per minute
      const shortText = 'This is a short text with about twenty words in total for testing reading time calculation.';
      const readingTime = extractReadingTime(shortText);
      expect(readingTime).toBe(1); // Should be 1 minute minimum

      const longText = Array(1000).fill('word').join(' '); // 1000 words
      const longReadingTime = extractReadingTime(longText);
      expect(longReadingTime).toBe(5); // 1000 words / 200 wpm = 5 minutes
    });

    it('should handle empty or very short content', () => {
      expect(extractReadingTime('')).toBe(1);
      expect(extractReadingTime('Short')).toBe(1);
    });
  });

  describe('generateMetaDescription', () => {
    it('should generate meta description from content', () => {
      const content = `# RV Buying Guide

When buying an RV, there are many important factors to consider. First, you need to determine your budget and the type of RV that best suits your needs. Travel trailers are great for families, while motorhomes offer more convenience. Consider the size, features, and maintenance requirements before making your decision.`;

      const metaDescription = generateMetaDescription(content, 155);
      expect(metaDescription.length).toBeLessThanOrEqual(155);
      expect(metaDescription).toContain('buying an RV');
      expect(metaDescription).not.toContain('#'); // Should strip markdown
    });

    it('should truncate at word boundaries', () => {
      const content = 'This is a very long sentence that should be truncated at a word boundary to ensure readability and proper meta description formatting.';
      
      const metaDescription = generateMetaDescription(content, 50);
      expect(metaDescription.length).toBeLessThanOrEqual(50);
      expect(metaDescription).not.toMatch(/\s$/); // Should not end with space
      expect(metaDescription.split(' ').pop()).not.toBe(''); // Last word should be complete
    });
  });
});
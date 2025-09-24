import { BAMLClient } from '../baml/client';
import { PublishedSchema, type Published, type Final } from '../schemas';
import fs from 'fs/promises';
import path from 'path';

interface PublishResult {
  success: boolean;
  data?: Published;
  error?: string;
}

export class PublisherAgentBAML {
  private static bamlClient = BAMLClient.getInstance();

  /**
   * Publish finalized content to markdown files
   */
  static async publishContent(final: Final, outputPath: string): Promise<PublishResult> {
    try {
      console.log('DEBUG: About to publish finalized content...');

      // Create markdown content with frontmatter
      const markdownContent = this.createMarkdownWithFrontmatter(final);

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Write the main content file
      await fs.writeFile(outputPath, markdownContent, 'utf8');

      // Create backup
      const backupPath = outputPath.replace('/content/', '/backup/');
      const backupDir = path.dirname(backupPath);
      await fs.mkdir(backupDir, { recursive: true });
      await fs.writeFile(backupPath, markdownContent, 'utf8');

      // Validate the published content
      const validation = this.validatePublishedContent(final);

      const published: Published = {
        frontmatter: final.frontmatter,
        content: final.content,
        markdownContent: markdownContent,
        filePath: outputPath,
        backupPath: backupPath,
        validation: validation
      };

      console.log('DEBUG: Content published successfully');
      return {
        success: true,
        data: published
      };
    } catch (error) {
      return {
        success: false,
        error: `Publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create markdown content with YAML frontmatter
   */
  private static createMarkdownWithFrontmatter(final: Final): string {
    // Convert frontmatter to YAML
    const yamlFrontmatter = this.convertToYAML(final.frontmatter);

    // Combine frontmatter and content
    return `---\n${yamlFrontmatter}---\n\n${final.markdownContent || final.content}`;
  }

  /**
   * Convert frontmatter object to YAML string
   */
  private static convertToYAML(frontmatter: any): string {
    const lines: string[] = [];

    // Required fields first
    lines.push(`title: "${this.escapeYAML(frontmatter.title)}"`);
    lines.push(`description: "${this.escapeYAML(frontmatter.description)}"`);
    lines.push(`slug: "${frontmatter.slug}"`);

    // Optional fields
    if (frontmatter.date) lines.push(`date: "${frontmatter.date}"`);
    if (frontmatter.updated) lines.push(`updated: "${frontmatter.updated}"`);
    if (frontmatter.author) lines.push(`author: "${frontmatter.author}"`);
    if (frontmatter.category) lines.push(`category: "${frontmatter.category}"`);

    // Arrays
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      lines.push(`tags:`);
      frontmatter.tags.forEach(tag => {
        lines.push(`  - "${tag}"`);
      });
    }

    if (frontmatter.secondaryKeywords && frontmatter.secondaryKeywords.length > 0) {
      lines.push(`secondaryKeywords:`);
      frontmatter.secondaryKeywords.forEach(keyword => {
        lines.push(`  - "${keyword}"`);
      });
    }

    // SEO fields
    if (frontmatter.funnel) lines.push(`funnel: "${frontmatter.funnel}"`);
    if (frontmatter.intent) lines.push(`intent: "${frontmatter.intent}"`);
    if (frontmatter.primaryKeyword) lines.push(`primaryKeyword: "${frontmatter.primaryKeyword}"`);

    // Numeric fields
    if (frontmatter.wordcount) lines.push(`wordcount: ${frontmatter.wordcount}`);
    if (frontmatter.readingTime) lines.push(`readingTime: ${frontmatter.readingTime}`);

    // Schema markup
    if (frontmatter.schema && frontmatter.schema.length > 0) {
      lines.push(`schema:`);
      frontmatter.schema.forEach(schemaItem => {
        lines.push(`  - ${JSON.stringify(schemaItem)}`);
      });
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Escape special characters for YAML
   */
  private static escapeYAML(str: string): string {
    if (!str) return '';
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Validate published content meets quality standards
   */
  static validatePublishedContent(final: Final): {
    isValid: boolean;
    issues: string[];
    seoScore: number;
    readabilityScore: number;
  } {
    const issues: string[] = [];
    let seoScore = 100;
    let readabilityScore = 100;

    // SEO validation
    if (!final.frontmatter.title || final.frontmatter.title.length < 30) {
      issues.push('Title too short for SEO');
      seoScore -= 15;
    }

    if (!final.frontmatter.description || final.frontmatter.description.length < 120) {
      issues.push('Meta description too short');
      seoScore -= 10;
    }

    if (!final.frontmatter.primaryKeyword) {
      issues.push('Missing primary keyword');
      seoScore -= 20;
    }

    if (!final.frontmatter.schema || final.frontmatter.schema.length === 0) {
      issues.push('No schema markup');
      seoScore -= 10;
    }

    // Content validation
    const content = final.markdownContent || final.content;
    if (!content || content.length < 1200) {
      issues.push('Content too short');
      seoScore -= 15;
      readabilityScore -= 20;
    }

    // Readability validation
    if (final.qualityMetrics?.readabilityGrade && final.qualityMetrics.readabilityGrade < 8) {
      issues.push('Readability grade too low');
      readabilityScore -= 15;
    }

    if (final.qualityMetrics?.passiveVoicePercent && final.qualityMetrics.passiveVoicePercent > 20) {
      issues.push('Too much passive voice');
      readabilityScore -= 10;
    }

    // Heading structure validation
    const h1Count = (content?.match(/^# /gm) || []).length;
    const h2Count = (content?.match(/^## /gm) || []).length;

    if (h1Count !== 1) {
      issues.push(`Should have exactly 1 H1 heading (found ${h1Count})`);
      seoScore -= 10;
    }

    if (h2Count < 3) {
      issues.push('Should have at least 3 H2 headings');
      seoScore -= 5;
    }

    // Ensure scores don't go below 0
    seoScore = Math.max(0, seoScore);
    readabilityScore = Math.max(0, readabilityScore);

    return {
      isValid: issues.length === 0,
      issues,
      seoScore,
      readabilityScore
    };
  }

  /**
   * Get content statistics for reporting
   */
  static getContentStats(final: Final): {
    wordCount: number;
    characterCount: number;
    headingCount: number;
    imageCount: number;
    linkCount: number;
  } {
    const content = final.markdownContent || final.content || '';

    return {
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: content.length,
      headingCount: (content.match(/^#+\s/gm) || []).length,
      imageCount: (content.match(/!\[.*?\]/g) || []).length,
      linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length
    };
  }

  /**
   * Generate content index for site navigation
   */
  static async updateContentIndex(published: Published, indexPath: string): Promise<void> {
    try {
      // Read existing index or create new one
      let index: any[] = [];
      try {
        const indexContent = await fs.readFile(indexPath, 'utf8');
        index = JSON.parse(indexContent);
      } catch {
        // Index doesn't exist, start fresh
      }

      // Add or update entry
      const entry = {
        title: published.frontmatter.title,
        slug: published.frontmatter.slug,
        category: published.frontmatter.category,
        funnel: published.frontmatter.funnel,
        intent: published.frontmatter.intent,
        filePath: published.filePath,
        wordCount: published.frontmatter.wordcount,
        readingTime: published.frontmatter.readingTime,
        lastUpdated: new Date().toISOString()
      };

      // Remove existing entry with same slug
      index = index.filter(item => item.slug !== published.frontmatter.slug);

      // Add new entry
      index.push(entry);

      // Sort by title
      index.sort((a, b) => a.title.localeCompare(b.title));

      // Write updated index
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

    } catch (error) {
      console.warn('Failed to update content index:', error);
    }
  }
}
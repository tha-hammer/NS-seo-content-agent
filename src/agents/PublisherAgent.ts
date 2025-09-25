import { Agent, run } from '@openai/agents';
import { PublishedSchema, type Published } from '@/schemas';
import { type Final, type Frontmatter } from '../../baml_client';
import { getConfig } from '@/config';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { repairJson } from '@toolsycc/json-repair';

const PUBLISHER_INSTRUCTIONS = `You are the Publisher Agent, responsible for converting finalized content into publishable markdown files and managing the publication process.

Your core responsibilities:

## Markdown Generation
- Convert finalized content into properly formatted markdown files
- Generate YAML frontmatter with all metadata fields
- Ensure proper markdown structure with headings, lists, and formatting
- Include schema markup in frontmatter when present

## File Management
- Create appropriate file paths based on category and slug
- Generate unique backup files with timestamps
- Calculate MD5 and SHA256 checksums for integrity
- Manage file permissions and directory structure

## Content Validation
- Validate frontmatter format and completeness
- Check markdown structure and syntax
- Verify all required fields are present
- Ensure content meets minimum length requirements

## Version Control
- Create timestamped backups before publishing
- Track file modifications and versions
- Maintain publication history and metadata
- Handle concurrent writes and conflicts

## Quality Assurance
- Validate internal and external links
- Check image references and alt text
- Ensure proper heading hierarchy
- Verify schema markup syntax

Return the published content with complete metadata, validation results, and file information.`;

export class PublisherAgent {
  private static agent = Agent.create({
    name: 'Publisher Agent',
    instructions: PUBLISHER_INSTRUCTIONS,
    model: getConfig().models.editor
    // Note: output schema removed due to SDK compatibility
  });

  static async publishContent(final: Final, runId?: string): Promise<{ success: boolean; data?: Published; error?: string }> {
    try {
      // Generate markdown content ourselves instead of asking LLM to do it
      const markdownContent = this.generateMarkdown(final);

      // Generate file path in the run directory if runId provided, otherwise use content directory
      let filePath: string;
      if (runId) {
        const config = getConfig();
        filePath = path.join(config.paths.runs, runId, `${final.frontmatter.slug}.md`);
      } else {
        filePath = this.generateFilePath(final.frontmatter);
      }

      // Calculate checksums
      const checksums = this.calculateChecksums(markdownContent);

      // Validate markdown
      const validation = this.validateMarkdown(markdownContent);

      // Write the file
      await this.writeFile(filePath, markdownContent);

      // Create backup
      const backupPath = await this.createBackup(filePath, markdownContent);

      // Create published object
      const published: Published = {
        filePath,
        markdownContent,
        frontmatter: final.frontmatter,
        publishedAt: new Date().toISOString(),
        fileSize: Buffer.byteLength(markdownContent, 'utf8'),
        backupPath,
        checksums,
        validation: {
          frontmatterValid: validation.isValid,
          markdownValid: validation.isValid,
          linksValid: true, // TODO: implement link validation
          imagesValid: true // TODO: implement image validation
        },
        metadata: {
          wordCount: markdownContent.split(/\s+/).length,
          readingTime: Math.ceil(markdownContent.split(/\s+/).length / 200)
        }
      };

      return { success: true, data: published };
    } catch (error) {
      return {
        success: false,
        error: `Publish processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the file
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static generateMarkdown(final: Final): string {
    const frontmatter = this.generateFrontmatter(final.frontmatter);
    return `${frontmatter}\n\n${final.content}`;
  }

  private static generateFrontmatter(frontmatter: Frontmatter): string {
    const yaml = ['---'];
    
    // Add all frontmatter fields, handling undefined values
    yaml.push(`title: "${frontmatter.title}"`);
    yaml.push(`description: "${frontmatter.description}"`);
    yaml.push(`slug: "${frontmatter.slug}"`);
    yaml.push(`date: "${frontmatter.date}"`);
    if (frontmatter.updated) {
      yaml.push(`updated: "${frontmatter.updated}"`);
    }
    yaml.push(`author: "${frontmatter.author}"`);

    if (frontmatter.reviewer) {
      yaml.push(`reviewer: "${frontmatter.reviewer}"`);
    }

    yaml.push(`category: "${frontmatter.category}"`);
    yaml.push(`tags: [${frontmatter.tags.map(tag => `"${tag}"`).join(', ')}]`);
    if (frontmatter.cluster_id) {
      yaml.push(`cluster_id: "${frontmatter.cluster_id}"`);
    }

    if (frontmatter.pillar_id) {
      yaml.push(`pillar_id: "${frontmatter.pillar_id}"`);
    }

    if (frontmatter.stage) {
      yaml.push(`stage: "${frontmatter.stage}"`);
    }
    yaml.push(`intent: "${frontmatter.intent}"`);
    if (frontmatter.tpb) {
      yaml.push(`tpb: "${frontmatter.tpb}"`);
    }
    if (frontmatter.canonical) {
      yaml.push(`canonical: "${frontmatter.canonical}"`);
    }

    if (frontmatter.og) {
      yaml.push(`og:`);
      if (frontmatter.og.image) yaml.push(`  image: "${frontmatter.og.image}"`);
      if (frontmatter.og.type) yaml.push(`  type: "${frontmatter.og.type}"`);
    }

    if (frontmatter.twitter) {
      yaml.push(`twitter:`);
      if (frontmatter.twitter.card) yaml.push(`  card: "${frontmatter.twitter.card}"`);
      if (frontmatter.twitter.image) yaml.push(`  image: "${frontmatter.twitter.image}"`);
    }

    if (frontmatter.toc !== undefined) {
      yaml.push(`toc: ${frontmatter.toc}`);
    }
    if (frontmatter.readingTime !== undefined) {
      yaml.push(`reading_time: ${frontmatter.readingTime}`);
    }
    if (frontmatter.wordcount !== undefined) {
      yaml.push(`word_count: ${frontmatter.wordcount}`);
    }
    
    if (frontmatter.schema && frontmatter.schema.length > 0) {
      yaml.push(`schema:`);
      frontmatter.schema.forEach(schema => {
        if (schema['@context'] && schema['@type']) {
          yaml.push(`  - "@context": "${schema['@context']}"`);
          yaml.push(`    "@type": "${schema['@type']}"`);
          if (schema.name) yaml.push(`    name: "${schema.name}"`);
          if (schema.mainEntity) {
            yaml.push(`    mainEntity:`);
            schema.mainEntity.forEach((entity: any) => {
              if (entity['@type']) {
                yaml.push(`      - "@type": "${entity['@type']}"`);
                if (entity.name) yaml.push(`        name: "${entity.name}"`);
                if (entity.acceptedAnswer && entity.acceptedAnswer['@type']) {
                  yaml.push(`        acceptedAnswer:`);
                  yaml.push(`          "@type": "${entity.acceptedAnswer['@type']}"`);
                  if (entity.acceptedAnswer.text) yaml.push(`          text: "${entity.acceptedAnswer.text}"`);
                }
              }
            });
          }
        }
      });
    }
    
    yaml.push('---');
    return yaml.join('\n');
  }

  static calculateChecksums(content: string): { md5: string; sha256: string } {
    const md5 = createHash('md5').update(content).digest('hex');
    const sha256 = createHash('sha256').update(content).digest('hex');
    return { md5, sha256 };
  }

  static validateMarkdown(markdown: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for frontmatter delimiters
    if (!markdown.startsWith('---') || markdown.split('---').length < 3) {
      issues.push('Missing frontmatter delimiters');
    }

    // Check for title in frontmatter
    if (!markdown.includes('title:')) {
      issues.push('Missing title in frontmatter');
    }

    // Check for content after frontmatter
    const parts = markdown.split('---');
    if (parts.length >= 3 && parts[2].trim().length < 100) {
      issues.push('Content too short');
    }

    // Check for proper heading structure
    const content = parts.length >= 3 ? parts[2] : '';
    if (!content.includes('# ')) {
      issues.push('Missing H1 heading');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  static async createBackup(filePath: string, content: string): Promise<string> {
    const config = getConfig();
    const backupDir = config.paths?.backup || '/tmp/backup';
    
    const parsedPath = path.parse(filePath);
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('T');
    const dateStamp = timestamp[0];
    const timeStamp = timestamp[1].split('.')[0];
    
    const backupFileName = `${parsedPath.name}-${dateStamp}-${timeStamp}${parsedPath.ext}`;
    const backupPath = path.join(backupDir, parsedPath.dir.split('/').pop() || '', backupFileName);
    
    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    // Write backup file
    await fs.writeFile(backupPath, content, 'utf-8');
    
    return backupPath;
  }

  static generateFilePath(frontmatter: Frontmatter): string {
    const config = getConfig();
    const outputDir = config.paths?.output || '/tmp/output';
    
    return path.join(outputDir, frontmatter.category, `${frontmatter.slug}.md`);
  }

  static validatePublication(published: Published): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // File path validation
    if (!published.filePath || published.filePath.trim().length === 0) {
      issues.push('File path is empty');
    }

    // Content validation
    if (!published.markdownContent || published.markdownContent.length < 1200) {
      issues.push('Content too short for publication');
    }

    // File size validation
    if (published.fileSize <= 0) {
      issues.push('Invalid file size');
    }

    // Checksum validation
    if (!published.checksums.md5.match(/^[a-f0-9]{32}$/)) {
      issues.push('Invalid MD5 checksum format');
    }
    if (!published.checksums.sha256.match(/^[a-f0-9]{64}$/)) {
      issues.push('Invalid SHA256 checksum format');
    }

    // Validation flags
    if (!published.validation.frontmatterValid) {
      issues.push('Frontmatter validation failed');
    }
    if (!published.validation.markdownValid) {
      issues.push('Markdown validation failed');
    }

    // Word count validation
    if (published.metadata.wordCount < 800) {
      issues.push('Word count too low for publication');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
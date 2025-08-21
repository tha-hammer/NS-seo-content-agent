import { Agent, run } from '@openai/agents';
import { PublishedSchema, type Final, type Published, type Frontmatter } from '@/schemas';
import { getConfig } from '@/config';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

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
    model: getConfig().models.editor,
    output: { type: 'json_schema', schema: PublishedSchema }
  });

  static async publishContent(final: Final): Promise<{ success: boolean; data?: Published; error?: string }> {
    try {
      const prompt = `Publish this finalized content to a markdown file:

**Frontmatter:**
${JSON.stringify(final.frontmatter, null, 2)}

**Content:**
${final.content}

**SEO Optimizations:**
${JSON.stringify(final.seoOptimizations, null, 2)}

**Quality Metrics:**
${JSON.stringify(final.qualityMetrics, null, 2)}

Please:
1. Generate proper markdown with YAML frontmatter
2. Create appropriate file path based on category and slug
3. Calculate checksums for file integrity
4. Validate all content and metadata
5. Create backup with timestamp
6. Return complete publication information

Generate the markdown content and publication metadata.`;

      const response = await run(this.agent, prompt);
      
      if (!response.success) {
        return { success: false, error: response.error || 'Agent failed to publish content' };
      }

      // Validate the response matches our schema
      const validation = PublishedSchema.safeParse(response.output);
      if (!validation.success) {
        return { 
          success: false, 
          error: `Schema validation failed: ${validation.error.message}` 
        };
      }

      const published = validation.data;

      // Actually write the file
      await this.writeFile(published.filePath, published.markdownContent);

      // Create backup if specified
      if (published.backupPath) {
        await this.writeFile(published.backupPath, published.markdownContent);
      }

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
    
    // Add all frontmatter fields
    yaml.push(`title: "${frontmatter.title}"`);
    yaml.push(`description: "${frontmatter.description}"`);
    yaml.push(`slug: "${frontmatter.slug}"`);
    yaml.push(`date: "${frontmatter.date}"`);
    yaml.push(`updated: "${frontmatter.updated}"`);
    yaml.push(`author: "${frontmatter.author}"`);
    
    if (frontmatter.reviewer) {
      yaml.push(`reviewer: "${frontmatter.reviewer}"`);
    }
    
    yaml.push(`category: "${frontmatter.category}"`);
    yaml.push(`tags: [${frontmatter.tags.map(tag => `"${tag}"`).join(', ')}]`);
    yaml.push(`cluster_id: "${frontmatter.cluster_id}"`);
    
    if (frontmatter.pillar_id) {
      yaml.push(`pillar_id: "${frontmatter.pillar_id}"`);
    }
    
    yaml.push(`stage: "${frontmatter.stage}"`);
    yaml.push(`intent: "${frontmatter.intent}"`);
    yaml.push(`tpb: "${frontmatter.tpb}"`);
    yaml.push(`canonical: "${frontmatter.canonical}"`);
    
    if (frontmatter.og) {
      yaml.push(`og:`);
      if (frontmatter.og.image) yaml.push(`  image: "${frontmatter.og.image}"`);
      yaml.push(`  type: "${frontmatter.og.type}"`);
    }
    
    if (frontmatter.twitter) {
      yaml.push(`twitter:`);
      yaml.push(`  card: "${frontmatter.twitter.card}"`);
      if (frontmatter.twitter.image) yaml.push(`  image: "${frontmatter.twitter.image}"`);
    }
    
    yaml.push(`toc: ${frontmatter.toc}`);
    yaml.push(`reading_time: ${frontmatter.reading_time}`);
    yaml.push(`word_count: ${frontmatter.word_count}`);
    
    if (frontmatter.schema && frontmatter.schema.length > 0) {
      yaml.push(`schema:`);
      frontmatter.schema.forEach(schema => {
        yaml.push(`  - "@context": "${schema['@context']}"`);
        yaml.push(`    "@type": "${schema['@type']}"`);
        if (schema.name) yaml.push(`    name: "${schema.name}"`);
        if (schema.mainEntity) {
          yaml.push(`    mainEntity:`);
          schema.mainEntity.forEach((entity: any) => {
            yaml.push(`      - "@type": "${entity['@type']}"`);
            yaml.push(`        name: "${entity.name}"`);
            if (entity.acceptedAnswer) {
              yaml.push(`        acceptedAnswer:`);
              yaml.push(`          "@type": "${entity.acceptedAnswer['@type']}"`);
              yaml.push(`          text: "${entity.acceptedAnswer.text}"`);
            }
          });
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
import { slugify } from './io.js';

export interface MarkdownValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SchemaMarkup {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Validate markdown structure for SEO compliance
 */
export function validateMarkdownStructure(markdown: string): MarkdownValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract headings
  const headingMatches = markdown.match(/^#{1,6}\s+.+$/gm) || [];
  const headings = headingMatches.map(match => {
    const level = match.match(/^#{1,6}/)?.[0].length || 0;
    const text = match.replace(/^#{1,6}\s+/, '').trim();
    return { level, text, raw: match };
  });

  // Check for H1
  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count === 0) {
    errors.push('Missing H1 heading');
  } else if (h1Count > 1) {
    errors.push('Multiple H1 headings found');
  }

  // Check heading hierarchy
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1];
    const curr = headings[i];
    
    if (curr.level > prev.level + 1) {
      errors.push(`Improper heading hierarchy: H${curr.level} follows H${prev.level}`);
    }
  }

  // Check for empty headings
  const emptyHeadings = headings.filter(h => h.text.trim() === '');
  if (emptyHeadings.length > 0) {
    errors.push(`Found ${emptyHeadings.length} empty heading(s)`);
  }

  // Check heading length
  headings.forEach(heading => {
    if (heading.text.length > 60) {
      warnings.push(`Long heading (${heading.text.length} chars): "${heading.text.substring(0, 40)}..."`);
    }
    if (heading.text.length < 3) {
      warnings.push(`Very short heading: "${heading.text}"`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate table of contents from markdown headings
 */
export function generateTableOfContents(markdown: string, includeH1 = false): string {
  const headingMatches = markdown.match(/^#{1,6}\s+.+$/gm) || [];
  const headings = headingMatches.map(match => {
    const level = match.match(/^#{1,6}/)?.[0].length || 0;
    const text = match.replace(/^#{1,6}\s+/, '').trim();
    return { level, text };
  });

  const filteredHeadings = includeH1 ? headings : headings.filter(h => h.level > 1);
  
  if (filteredHeadings.length === 0) {
    return '';
  }

  const tocLines = filteredHeadings.map(heading => {
    const indent = '  '.repeat(heading.level - 2); // H2 = no indent, H3 = 2 spaces, etc.
    const anchor = slugify(heading.text);
    return `${indent}- [${heading.text}](#${anchor})`;
  });

  return tocLines.join('\n');
}

/**
 * Insert schema markup into frontmatter
 */
export function insertSchemaMarkup(
  frontmatter: Record<string, any>,
  schemas: SchemaMarkup[]
): Record<string, any> {
  return {
    ...frontmatter,
    schema: schemas
  };
}

/**
 * Optimize heading structure by fixing hierarchy issues
 */
export function optimizeHeadingStructure(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let lastHeadingLevel = 0;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const currentLevel = headingMatch[1].length;
      const text = headingMatch[2];
      
      // If this is the first heading or H1, use as-is
      if (lastHeadingLevel === 0 || currentLevel === 1) {
        lastHeadingLevel = currentLevel;
        result.push(line);
        continue;
      }
      
      // Fix hierarchy gaps
      let correctedLevel = currentLevel;
      if (currentLevel > lastHeadingLevel + 1) {
        correctedLevel = lastHeadingLevel + 1;
      }
      
      lastHeadingLevel = correctedLevel;
      const correctedHeading = '#'.repeat(correctedLevel) + ' ' + text;
      result.push(correctedHeading);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Validate frontmatter fields for SEO compliance
 */
export function validateFrontmatter(frontmatter: Record<string, any>): MarkdownValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields = ['title', 'description', 'slug', 'date', 'category', 'tags'];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field formats
  if (frontmatter.title) {
    if (typeof frontmatter.title !== 'string' || frontmatter.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }
    if (frontmatter.title.length > 60) {
      warnings.push('Title is longer than 60 characters (may be truncated in search results)');
    }
  }

  if (frontmatter.description) {
    if (typeof frontmatter.description !== 'string' || frontmatter.description.length < 50) {
      errors.push('Description must be at least 50 characters');
    }
    if (frontmatter.description.length > 160) {
      warnings.push('Description is longer than 160 characters (may be truncated in search results)');
    }
  }

  if (frontmatter.slug) {
    if (typeof frontmatter.slug !== 'string' || !/^[a-z0-9-]+$/.test(frontmatter.slug)) {
      errors.push('Slug contains invalid characters');
    }
  }

  if (frontmatter.date) {
    if (typeof frontmatter.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
  }

  if (frontmatter.tags) {
    if (!Array.isArray(frontmatter.tags)) {
      errors.push('Tags must be an array');
    } else if (frontmatter.tags.length === 0) {
      warnings.push('No tags specified');
    } else if (frontmatter.tags.length > 8) {
      warnings.push('More than 8 tags may dilute SEO effectiveness');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extract reading time estimate from content
 */
export function extractReadingTime(content: string, wordsPerMinute = 200): number {
  const text = content.replace(/[#*_`]/g, ''); // Strip markdown formatting
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const minutes = Math.ceil(words.length / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Generate SEO-friendly meta description from content
 */
export function generateMetaDescription(content: string, maxLength = 155): string {
  // Strip markdown formatting and extra whitespace
  let text = content
    .replace(/^#{1,6}\s+/gm, '') // Remove headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  // Truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) { // Only truncate at word if we don't lose too much
    return truncated.substring(0, lastSpaceIndex).trim();
  }
  
  return truncated.trim();
}

/**
 * Extract headings and their levels from markdown
 */
export function extractHeadings(markdown: string): Array<{ level: number; text: string; anchor: string }> {
  const headingMatches = markdown.match(/^#{1,6}\s+.+$/gm) || [];
  
  return headingMatches.map(match => {
    const level = match.match(/^#{1,6}/)?.[0].length || 0;
    const text = match.replace(/^#{1,6}\s+/, '').trim();
    const anchor = slugify(text);
    
    return { level, text, anchor };
  });
}

/**
 * Count words in content (excluding markdown syntax)
 */
export function countWords(content: string): number {
  const text = content
    .replace(/^#{1,6}\s+/gm, '') // Remove headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate image alt text in markdown
 */
export function validateImageAltText(markdown: string): MarkdownValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const imageMatches = markdown.match(/!\[(.*?)\]\(.*?\)/g) || [];
  
  imageMatches.forEach((match, index) => {
    const altTextMatch = match.match(/!\[(.*?)\]/);
    const altText = altTextMatch ? altTextMatch[1] : '';
    
    if (!altText || altText.trim() === '') {
      errors.push(`Image ${index + 1} is missing alt text`);
    } else if (altText.length < 10) {
      warnings.push(`Image ${index + 1} has very short alt text: "${altText}"`);
    } else if (altText.length > 100) {
      warnings.push(`Image ${index + 1} has very long alt text (${altText.length} chars)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
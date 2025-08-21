import { promises as fs } from 'fs';
import path from 'path';
import slugifyLib from 'slugify';
import matter from 'gray-matter';

/**
 * Convert a string to a URL-safe slug
 */
export function slugify(text: string, maxLength = 80): string {
  // Pre-process to handle special characters that slugify converts to words
  const preprocessed = text
    .replace(/\$/g, '') // Remove dollar signs
    .replace(/&/g, '') // Remove ampersands
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  const slug = slugifyLib(preprocessed, {
    lower: true,
    strict: true,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
    replacement: '-'
  });
  
  // Truncate if too long and remove trailing hyphens
  if (slug.length > maxLength) {
    return slug.substring(0, maxLength).replace(/-+$/, '');
  }
  
  return slug;
}

/**
 * Create a safe filename by removing/replacing unsafe characters
 */
export function safeFilename(input: string): string {
  if (!input || input.trim() === '') {
    return 'untitled';
  }
  
  return input
    .replace(/[<>:"/\\|?*]/g, '') // Remove unsafe characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase()
    .trim()
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    || 'untitled';
}

/**
 * Generate a dated directory path
 */
export function datedDir(bucket: 'daily' | 'weekly' | 'monthly', baseDir = 'content'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return path.join(baseDir, bucket, `${year}-${month}-${day}`);
}

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export async function ensureDirExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'EEXIST') {
      throw error;
    }
    // Directory already exists, which is fine
  }
}

/**
 * Write markdown content to a file with optional frontmatter
 */
export async function writeMarkdown(
  dir: string,
  filename: string,
  content: string,
  frontmatter?: Record<string, any>
): Promise<void> {
  // Ensure directory exists
  await ensureDirExists(dir);
  
  // Sanitize filename
  const safeFileName = safeFilename(filename.replace(/\.md$/, '')) + '.md';
  const filePath = path.join(dir, safeFileName);
  
  let fileContent = content;
  
  // Add frontmatter if provided
  if (frontmatter) {
    const matterResult = matter.stringify(content, frontmatter);
    fileContent = matterResult;
  }
  
  await fs.writeFile(filePath, fileContent, 'utf8');
}

/**
 * Read and parse a markdown file with frontmatter
 */
export async function readMarkdown(filePath: string): Promise<{
  content: string;
  data: Record<string, any>;
}> {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const parsed = matter(fileContent);
  
  return {
    content: parsed.content,
    data: parsed.data
  };
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique filename by appending a number if the file already exists
 */
export async function uniqueFilename(dir: string, baseFilename: string): Promise<string> {
  let filename = baseFilename;
  let counter = 1;
  
  while (await fileExists(path.join(dir, filename))) {
    const ext = path.extname(baseFilename);
    const base = path.basename(baseFilename, ext);
    filename = `${base}-${counter}${ext}`;
    counter++;
  }
  
  return filename;
}
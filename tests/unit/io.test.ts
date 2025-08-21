import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { slugify, writeMarkdown, datedDir, ensureDirExists, safeFilename } from '@/io';

// Mock fs for testing
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn()
  }
}));

describe('IO Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('slugify', () => {
    it('should convert title to valid slug', () => {
      expect(slugify('Best RV Under $25k for Families')).toBe('best-rv-under-25k-for-families');
      expect(slugify('How to Buy an RV: Complete Guide')).toBe('how-to-buy-an-rv-complete-guide');
      expect(slugify('Travel Trailers vs. Fifth Wheels')).toBe('travel-trailers-vs-fifth-wheels');
    });

    it('should handle special characters and spaces', () => {
      expect(slugify('RV Buying Tips & Tricks!')).toBe('rv-buying-tips-tricks');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('UPPERCASE Title')).toBe('uppercase-title');
    });

    it('should handle unicode and accented characters', () => {
      expect(slugify('Café & Résumé')).toBe('cafe-resume');
      expect(slugify('Naïve approach')).toBe('naive-approach');
    });

    it('should limit slug length and remove trailing hyphens', () => {
      const longTitle = 'This is a very long title that should be truncated to a reasonable length for URL purposes';
      const slug = slugify(longTitle);
      expect(slug.length).toBeLessThanOrEqual(80);
      expect(slug).not.toMatch(/-$/);
    });
  });

  describe('safeFilename', () => {
    it('should create safe filenames', () => {
      expect(safeFilename('My Article Title')).toBe('my-article-title');
      expect(safeFilename('Article with / and \\ slashes')).toBe('article-with-and-slashes');
      expect(safeFilename('File<>name')).toBe('filename');
    });

    it('should handle empty or whitespace-only input', () => {
      expect(safeFilename('')).toBe('untitled');
      expect(safeFilename('   ')).toBe('untitled');
      expect(safeFilename('\t\n')).toBe('untitled');
    });
  });

  describe('datedDir', () => {
    beforeEach(() => {
      // Mock Date to return consistent results
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate dated directory paths', () => {
      expect(datedDir('daily')).toBe('content/daily/2024-03-15');
      expect(datedDir('weekly')).toBe('content/weekly/2024-03-15');
      expect(datedDir('monthly')).toBe('content/monthly/2024-03-15');
    });

    it('should handle custom base directory', () => {
      expect(datedDir('daily', 'output')).toBe('output/daily/2024-03-15');
    });
  });

  describe('ensureDirExists', () => {
    it('should create directory recursively', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      mockMkdir.mockResolvedValue(undefined);

      await ensureDirExists('/path/to/nested/dir');

      expect(mockMkdir).toHaveBeenCalledWith('/path/to/nested/dir', { recursive: true });
    });

    it('should handle existing directory without error', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const error = new Error('Directory exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      mockMkdir.mockRejectedValue(error);

      await expect(ensureDirExists('/existing/dir')).resolves.not.toThrow();
    });

    it('should propagate non-EEXIST errors', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      mockMkdir.mockRejectedValue(error);

      await expect(ensureDirExists('/forbidden/dir')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeMarkdown', () => {
    it('should write markdown file with frontmatter', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const content = '# Test Article\n\nThis is test content.';
      const frontmatter = {
        title: 'Test Article',
        description: 'A test article for unit testing',
        slug: 'test-article',
        date: '2024-03-15'
      };

      await writeMarkdown('/output/dir', 'test-article.md', content, frontmatter);

      expect(mockMkdir).toHaveBeenCalledWith('/output/dir', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/output/dir/test-article.md',
        expect.stringContaining('---\ntitle: Test Article\n'),
        'utf8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('# Test Article'),
        'utf8'
      );
    });

    it('should write content without frontmatter when not provided', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const content = '# Simple Article\n\nContent only.';

      await writeMarkdown('/output/dir', 'simple.md', content);

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/output/dir/simple.md',
        content,
        'utf8'
      );
    });

    it('should sanitize filename', async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await writeMarkdown('/output', 'unsafe/file<name>.md', 'content');

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/output/unsafefilename.md',
        'content',
        'utf8'
      );
    });
  });
});
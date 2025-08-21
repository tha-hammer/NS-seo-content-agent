import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, validateConfig, Config } from '@/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration with default values', () => {
      process.env.OPENAI_API_KEY = 'test-api-key';
      
      const config = loadConfig();
      
      expect(config.openai.apiKey).toBe('test-api-key');
      expect(config.models.writer).toBe('gpt-4.1-mini');
      expect(config.models.editor).toBe('gpt-4.1');
      expect(config.paths.content).toBe('content');
      expect(config.paths.data).toBe('data');
      expect(config.features.strictStructuredOutputs).toBe(true);
      expect(config.features.linkInjection).toBe(true);
      expect(config.features.qualityGate).toBe(true);
    });

    it('should load configuration from environment variables', () => {
      process.env.OPENAI_API_KEY = 'env-api-key';
      process.env.SITE_BASE_URL = 'https://test.com';
      process.env.CONTENT_DIR = 'custom-content';
      process.env.DATA_DIR = 'custom-data';
      process.env.ENABLE_QUALITY_GATE = 'false';
      
      const config = loadConfig();
      
      expect(config.openai.apiKey).toBe('env-api-key');
      expect(config.site.baseUrl).toBe('https://test.com');
      expect(config.paths.content).toBe('custom-content');
      expect(config.paths.data).toBe('custom-data');
      expect(config.features.qualityGate).toBe(false);
    });

    it('should throw error when OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => loadConfig()).toThrow('OPENAI_API_KEY is required');
    });

    it('should throw error when OPENAI_API_KEY is empty', () => {
      process.env.OPENAI_API_KEY = '';
      
      expect(() => loadConfig()).toThrow('OPENAI_API_KEY is required');
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config: Config = {
        openai: { apiKey: 'sk-test123' },
        site: { baseUrl: 'https://test.com' },
        models: { writer: 'gpt-4.1-mini', editor: 'gpt-4.1' },
        paths: {
          content: 'content',
          data: 'data',
          runs: 'runs',
          keywordMap: 'data/keyword_map.json',
          linkGraph: 'data/link_graph.json',
          styleGuide: 'data/style_guide.md'
        },
        features: {
          strictStructuredOutputs: true,
          linkInjection: true,
          qualityGate: true
        },
        batch: {
          dailyLimit: 25,
          weeklyLimit: 100,
          monthlyLimit: 400,
          concurrency: 3
        }
      };
      
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw error for invalid API key format', () => {
      const config = {
        openai: { apiKey: 'invalid-key' }
      } as Config;
      
      expect(() => validateConfig(config)).toThrow('Invalid OpenAI API key format');
    });

    it('should throw error for invalid URL format', () => {
      const config = {
        openai: { apiKey: 'sk-test123' },
        site: { baseUrl: 'not-a-url' }
      } as Config;
      
      expect(() => validateConfig(config)).toThrow('Invalid site base URL format');
    });

    it('should throw error for non-positive batch limits', () => {
      const config = {
        openai: { apiKey: 'sk-test123' },
        site: { baseUrl: 'https://test.com' },
        models: { writer: 'gpt-4.1-mini', editor: 'gpt-4.1' },
        paths: {
          content: 'content',
          data: 'data',
          runs: 'runs',
          keywordMap: 'data/keyword_map.json',
          linkGraph: 'data/link_graph.json',
          styleGuide: 'data/style_guide.md'
        },
        features: {
          strictStructuredOutputs: true,
          linkInjection: true,
          qualityGate: true
        },
        batch: { dailyLimit: 0, weeklyLimit: 100, monthlyLimit: 400, concurrency: 3 }
      } as Config;
      
      expect(() => validateConfig(config)).toThrow('Batch limits must be positive numbers');
    });
  });
});
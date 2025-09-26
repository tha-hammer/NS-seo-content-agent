import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv();

export interface Config {
  openai: {
    apiKey: string;
  };
  site: {
    baseUrl: string;
  };
  models: {
    writer: string;
    editor: string;
  };
  paths: {
    content: string;
    data: string;
    runs: string;
    keywordMap: string;
    linkGraph: string;
    styleGuide: string;
  };
  features: {
    strictStructuredOutputs: boolean;
    linkInjection: boolean;
    qualityGate: boolean;
    deepResearch: boolean;
  };
  batch: {
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    concurrency: number;
  };
}

function getDefaultConfig(): Omit<Config, 'openai'> {
  return {
    site: {
      baseUrl: process.env.SITE_BASE_URL || 'https://example.com',
    },
  models: {
    writer: process.env.OPENAI_MODEL_WRITER || 'gpt-4o-mini',
    editor: process.env.OPENAI_MODEL_EDITOR || 'gpt-4o',
  },
  paths: {
    content: process.env.CONTENT_DIR || 'content',
    data: process.env.DATA_DIR || 'data',
    runs: process.env.RUNS_DIR || 'runs',
    keywordMap: 'data/keyword_map.json',
    linkGraph: 'data/link_graph.json',
    styleGuide: 'data/style_guide.md',
  },
  features: {
    strictStructuredOutputs: process.env.ENABLE_STRUCTURED_OUTPUTS !== 'false',
    linkInjection: process.env.ENABLE_LINK_INJECTION !== 'false',
    qualityGate: process.env.ENABLE_QUALITY_GATE !== 'false',
    deepResearch: process.env.ENABLE_DEEP_RESEARCH === 'true',
  },
  batch: {
    dailyLimit: parseInt(process.env.DAILY_LIMIT || '25'),
    weeklyLimit: parseInt(process.env.WEEKLY_LIMIT || '100'),
    monthlyLimit: parseInt(process.env.MONTHLY_LIMIT || '400'),
    concurrency: parseInt(process.env.BATCH_CONCURRENCY || '3'),
  },
  };
}

export function loadConfig(): Config {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is required');
  }

  return {
    openai: {
      apiKey: apiKey.trim(),
    },
    ...getDefaultConfig(),
  };
}

export function validateConfig(config: Config): void {
  // Validate OpenAI API key format
  if (!config.openai.apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }

  // Validate site URL format
  try {
    new URL(config.site.baseUrl);
  } catch {
    throw new Error('Invalid site base URL format');
  }

  // Validate batch limits are positive
  const { dailyLimit, weeklyLimit, monthlyLimit, concurrency } = config.batch;
  if (dailyLimit <= 0 || weeklyLimit <= 0 || monthlyLimit <= 0 || concurrency <= 0) {
    throw new Error('Batch limits must be positive numbers');
  }

  // Validate paths are non-empty strings
  const paths = Object.values(config.paths);
  if (paths.some(path => !path || typeof path !== 'string')) {
    throw new Error('All paths must be non-empty strings');
  }
}

// Export singleton config instance
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
    validateConfig(configInstance);
  }
  return configInstance;
}

// Allow resetting config for testing
export function resetConfig(): void {
  configInstance = null;
}
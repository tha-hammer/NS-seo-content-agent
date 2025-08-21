# NS SEO Content Agent

**An AI-powered content generation pipeline that transforms topics into polished, SEO-optimized RV content using OpenAI Agents SDK.**

[![Tests](https://img.shields.io/badge/tests-131%2F131%20passing-brightgreen)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](#)
[![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-SDK-orange)](#)

## 🚀 Overview

This project implements a sophisticated multi-agent content generation system that produces high-quality, SEO-optimized articles through a systematic pipeline. Built with TypeScript and the OpenAI Agents SDK, it transforms simple topic inputs into complete markdown articles with proper structure, metadata, and SEO optimization.

## ✨ Features

- **🤖 Multi-Agent Pipeline**: 6 specialized AI agents handle different aspects of content creation
- **📊 State Management**: Persistent run states with resume capability for failed processes
- **🎯 SEO Optimization**: Built-in title optimization, meta descriptions, and schema markup
- **📝 Content Quality**: Ensures readability, inclusive language, and E-E-A-T compliance
- **🔗 Structured Output**: Generates properly formatted markdown with frontmatter
- **🧪 Test Coverage**: 131/131 tests passing with comprehensive validation
- **⚡ Resume Capability**: Failed pipelines can resume from any stage

## 🏗️ Architecture

The system uses a **multi-agent orchestration pattern** with the following agents:

```
Topic Input → OutlineAgent → DraftAgent → ExpandAgent → PolishAgent → FinalizeAgent → PublisherAgent → Published Article
```

### Agent Responsibilities

1. **OutlineAgent** - Creates structured outlines with search intent mapping and funnel stage classification
2. **DraftAgent** - Writes concise initial drafts with citation markers and featured snippet answers  
3. **ExpandAgent** - Enriches content with tables, examples, checklists, and E-E-A-T signals
4. **PolishAgent** - Improves clarity, scannability, ensures PAA coverage, and uses inclusive language
5. **FinalizeAgent** - Applies on-page SEO, generates frontmatter, and embeds schema markup
6. **PublisherAgent** - Outputs formatted markdown files with backup and validation

## 📋 Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher  
- **OpenAI API Key**: With access to GPT-4 models
- **TypeScript**: 5.x (installed as dependency)

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd NS-seo-content-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   OPENAI_API_KEY=your-openai-api-key-here
   OPENAI_MODEL_WRITER=gpt-4.1-mini
   OPENAI_MODEL_EDITOR=gpt-4.1
   OUTPUT_DIR=./output
   RUNS_DIR=./runs
   BACKUP_DIR=./backup
   ```

4. **Verify installation:**
   ```bash
   npm test
   ```

## 🚀 Usage

### Basic Pipeline Execution

```bash
# Run complete pipeline for a single topic
npm run pipeline "Best Budget RVs Under $30k"

# Run with specific bucket (daily/weekly/monthly)
npm run pipeline "RV Insurance Guide" --bucket weekly
```

### Programmatic Usage

```typescript
import { Pipeline } from './src/pipeline';

// Run complete pipeline
const result = await Pipeline.runPipeline(
  'Best Family RVs for Weekend Trips',
  'weekly'
);

if (result.success) {
  console.log('Pipeline completed!');
  console.log('Run ID:', result.runState.id);
  console.log('Final stage:', result.runState.currentStage);
} else {
  console.error('Pipeline failed:', result.error);
}
```

### Resume Failed Pipeline

```typescript
// Resume a failed pipeline by run ID
const resumeResult = await Pipeline.resumePipeline('run-id-uuid');

if (resumeResult.success) {
  console.log('Pipeline resumed and completed!');
}
```

### Individual Agent Usage

```typescript
import { OutlineAgent } from './src/agents/OutlineAgent';
import { DraftAgent } from './src/agents/DraftAgent';

// Generate outline only
const outlineResult = await OutlineAgent.generateOutline(
  'RV Maintenance Tips for Beginners'
);

// Create draft from outline
if (outlineResult.success) {
  const draftResult = await DraftAgent.createDraft(outlineResult.data);
}
```

## 📁 Project Structure

```
NS-seo-content-agent/
├── src/
│   ├── agents/           # AI agents for content generation
│   │   ├── OutlineAgent.ts
│   │   ├── DraftAgent.ts
│   │   ├── ExpandAgent.ts
│   │   ├── PolishAgent.ts
│   │   ├── FinalizeAgent.ts
│   │   └── PublisherAgent.ts
│   ├── tools/            # Utility functions and tools
│   ├── pipeline.ts       # Main orchestration logic
│   ├── schemas.ts        # Zod validation schemas
│   └── config.ts         # Configuration management
├── tests/                # Comprehensive test suite
│   ├── unit/agents/      # Agent-specific tests
│   ├── unit/tools/       # Tool tests
│   └── unit/pipeline.test.ts
├── output/               # Generated content output
├── runs/                 # Pipeline run states
├── backup/               # Content backups
└── prompts/              # Agent prompt templates
```

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/agents/outline-agent.test.ts

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- **Core Tools**: 72/72 tests passing ✅
- **Agent System**: 49/49 tests passing ✅  
- **Pipeline System**: 10/10 tests passing ✅
- **Total Coverage**: 131/131 tests passing 🎉

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_MODEL_WRITER` | Model for writing tasks | `gpt-4.1-mini` |
| `OPENAI_MODEL_EDITOR` | Model for editing tasks | `gpt-4.1` |
| `OUTPUT_DIR` | Output directory for articles | `./output` |
| `RUNS_DIR` | Directory for run states | `./runs` |
| `BACKUP_DIR` | Backup directory | `./backup` |

### Agent Configuration

Agents can be configured in `src/config.ts`:

```typescript
export const getConfig = () => ({
  models: {
    writer: process.env.OPENAI_MODEL_WRITER || 'gpt-4.1-mini',
    editor: process.env.OPENAI_MODEL_EDITOR || 'gpt-4.1'
  },
  paths: {
    output: process.env.OUTPUT_DIR || './output',
    runs: process.env.RUNS_DIR || './runs',
    backup: process.env.BACKUP_DIR || './backup'
  }
});
```

## 📊 Output Format

Generated articles include:

### Frontmatter
```yaml
---
title: "Optimized SEO Title (≤60 chars)"
description: "Compelling meta description (≤155 chars)"
slug: "seo-friendly-url-slug"
date: "2024-03-15"
author: "Content Expert"
category: "rv-guides"
tags: ["rv-tips", "maintenance", "beginners"]
stage: "MOF"  # TOF/MOF/BOF funnel classification
intent: "informational"  # informational/comparative/transactional
schema:
  - "@context": "https://schema.org"
    "@type": "Article"
    # ... structured data
---
```

### Content Structure
- **H1 Title**: SEO-optimized with target keywords
- **Introduction**: Clear value proposition and overview
- **Structured Sections**: H2/H3 hierarchy with scannable content
- **FAQ Integration**: People Also Ask questions with bold formatting
- **Call-to-Action**: Funnel-stage appropriate CTAs
- **E-E-A-T Signals**: Author expertise, citations, and review dates

## 🔍 Pipeline States

The system tracks pipeline execution through persistent states:

```typescript
interface RunState {
  id: string;           // UUID for run identification
  topic: string;        // Original topic input
  bucket: 'daily' | 'weekly' | 'monthly';
  currentStage: 'outline' | 'draft' | 'expand' | 'polish' | 'finalize' | 'publish' | 'complete';
  outline?: Outline;    // Structured outline data
  draft?: Draft;        // Initial draft content
  expanded?: Expanded;  // Enriched content with evidence
  final?: Final;        // SEO-optimized final version
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  errors: Array<{       // Error tracking
    stage: string;
    message: string;
    timestamp: string;
  }>;
}
```

## 🚨 Error Handling

The pipeline includes comprehensive error handling:

- **Graceful Failures**: Errors are logged and pipeline state is preserved
- **Resume Capability**: Failed runs can be resumed from the last successful stage
- **Validation Errors**: Schema validation errors are detailed and actionable
- **API Failures**: Automatic retry logic for transient API issues

## 🛠️ Development

### Development Commands

```bash
# Start development mode
npm run dev

# Build TypeScript
npm run build

# Lint code
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

### Adding New Agents

1. Create agent class in `src/agents/`
2. Add comprehensive tests in `tests/unit/agents/`
3. Update pipeline orchestration in `src/pipeline.ts`
4. Add schema validation if needed

## 📈 Performance

- **Average Processing Time**: 2-3 minutes per article
- **Token Efficiency**: Optimized prompts reduce API costs
- **Concurrent Processing**: Support for batch operations
- **Resume Capability**: No wasted work on failures

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-agent`
3. Make changes with tests: `npm test`
4. Commit changes: `git commit -m "Add new agent"`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:

1. Check the [troubleshooting guide](#troubleshooting)
2. Review existing [issues](https://github.com/your-repo/issues)
3. Create a new issue with reproduction steps

## 🔧 Troubleshooting

### Common Issues

**Pipeline fails with validation error:**
- Check that all required fields are present in input data
- Verify schema compatibility between agents
- Review error logs in run state files

**OpenAI API errors:**
- Verify API key is valid and has sufficient quota
- Check model availability (GPT-4.1 access required)
- Review rate limiting settings

**Test failures:**
- Run `npm install` to ensure dependencies are current
- Check TypeScript compilation: `npm run type-check`
- Verify environment variables are set correctly

**Resume not working:**
- Confirm run ID exists in runs directory
- Check run state file is valid JSON
- Verify no file permission issues

---

**Built with ❤️ using OpenAI Agents SDK and TypeScript**
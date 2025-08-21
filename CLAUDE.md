# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an SEO content generation pipeline using the OpenAI Agents SDK (@openai/agents) to create high-quality, SEO-optimized RV content. The project implements a multi-agent system that transforms topics into polished, internally-linked Markdown articles following best practices for search engine optimization.

## Architecture

The system is designed around a **multi-agent orchestration pattern** using OpenAI Agents SDK:

1. **OutlineAgent** ✅ - Creates structured outlines with search intent mapping, funnel stage classification, and TPB psychology
2. **DraftAgent** ✅ - Writes concise initial drafts with citation markers and featured snippet answers
3. **ExpandAgent** ✅ - Enriches content with tables, examples, checklists, image placeholders, and E-E-A-T signals
4. **PolishAgent** ✅ - Improves clarity, scannability, ensures PAA coverage, and uses inclusive language
5. **FinalizeAgent** ✅ - Applies on-page SEO, generates frontmatter, and embeds schema markup
6. **LinkerAgent** ⏭️ - Handles internal linking strategy and external authority links (skipped)
7. **PublisherAgent** ✅ - Outputs formatted Markdown files and updates indexes

### Core Components

- **Agents** (`src/agents/`) - Specialized writing agents for each phase (6/7 implemented)
- **Tools** (`src/tools/`) - Function tools for linking, validation, and formatting
- **Pipeline** (`src/pipeline.ts`) ✅ - Orchestrates agent handoffs and state management with resume capability
- **Schemas** (Zod) - Validates structured outputs between agents

## Development Commands

Based on the project requirements and OpenAI Agents SDK setup:

```bash
# Install dependencies
npm install

# Development mode (5 articles as drafts)
npm run dev

# Daily batch processing (25 articles to final)
npm run daily

# Weekly planning batch
npm run weekly

# Monthly audit process
npm run monthly

# Generate outlines only
npm run generate:outlines

# Formatting and linting
npm run format
npm run lint
```

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=sk-...
DEBUG=openai-agents:*  # Optional for debugging
SITE_BASE_URL=https://example.com  # For canonical URLs
```

## Key Data Files

- `data/keyword_map.json` - Topic seeds with search intent mapping
- `data/link_graph.json` - Internal linking strategy and cluster relationships
- `data/style_guide.md` - Brand voice and editorial guidelines

## Output Structure

Articles are generated to:
```
output/YYYY-MM-DD/<cluster>/<stage>/
content/<cluster>/<slug>.md
```

Each article includes:
- YAML frontmatter with SEO metadata
- Structured content with proper heading hierarchy
- Internal and external links
- Schema markup (JSON-LD)
- E-E-A-T compliance elements

## Testing and Quality Assurance

The system includes comprehensive quality gates:
- **Zod schema validation** for all structured outputs between agents
- **Content quality checks** (length, specificity, citations, readability)
- **E-E-A-T compliance** validation for expertise signals
- **Link integrity validation** and internal linking strategy
- **SEO compliance verification** with schema markup validation
- **Test coverage**: 72/72 core tools tests ✅, 49/49 agent tests ✅, 10/10 pipeline tests ✅

## Agent Configuration

- **Models**: Uses GPT-4.1-mini for writing, GPT-4.1 for editing
- **Structured Outputs**: Enforced via Zod schemas
- **Debug Logging**: Enable with `DEBUG=openai-agents:*`
- **Retry Logic**: Built-in for API failures and validation errors

## Content Strategy Implementation

The system implements semantic topic clustering with:
- Pillar pages linking to supporting content
- Cross-cluster internal linking
- Funnel-stage appropriate CTAs (TOF/MOF/BOF)
- YMYL content safety for financial/safety topics

## Pipeline Execution

### Complete Pipeline (TDD Complete):
1. **Topic input** → OutlineAgent ✅ (structured JSON with TPB/funnel classification)
2. **Outline** → DraftAgent ✅ (concise initial content with citation markers)
3. **Draft** → ExpandAgent ✅ (enriched with tables, examples, E-E-A-T)
4. **Expanded** → PolishAgent ✅ (clarity, PAA coverage, inclusive language)
5. **Polished** → FinalizeAgent ✅ (SEO optimization, schema markup, CTAs)
6. **Finalized** → PublisherAgent ✅ (markdown output, backup, validation)

### Orchestration Features:
- **State Persistence**: Run states saved to JSON with UUID tracking
- **Resume Capability**: Failed pipelines can resume from any stage
- **Error Handling**: Comprehensive error tracking and graceful failures
- **Validation**: Schema validation at every agent handoff

### Skipped Components:
- **LinkerAgent** ⏭️ (internal linking strategy - optional feature)

### Current Status:
- **Core Tools**: Complete with 72/72 passing tests ✅
- **Agent System**: 6/7 agents implemented with 49/49 passing tests ✅
- **Pipeline System**: Complete orchestration with 10/10 passing tests ✅
- **Total Test Coverage**: 131/131 passing tests 🎉  
- **Schema Validation**: Complete Zod validation for all data contracts
- **Quality Gates**: Comprehensive validation and error handling

State is preserved between handoffs, allowing for error recovery and process resumption.
# NS SEO Content Agent - Comprehensive Development TODO

## Project Overview
Building an agentic SEO content pipeline using OpenAI Agents SDK that transforms topics into polished, SEO-optimized, internally-linked Markdown articles for RV content.

## Current Status (December 2024)
### ✅ COMPLETED PHASES:
- **Phase 1**: Foundation Setup (TDD) - Complete with 100% test coverage
- **Phase 2**: Core Tools & Utilities (TDD) - Complete with 72/72 passing tests
- **Phase 3**: Agent System (TDD) - Complete with 49/49 passing tests (6/7 agents, 1 skipped)
- **Phase 4**: Orchestration Pipeline (TDD) - Complete with 10/10 passing tests

### 🚧 NEXT PHASE:
- **Phase 5**: Batch Processing & CLI Interface (ready to begin)

### 📋 REMAINING:
- **Phase 5**: Batch Processing Scripts & CLI Interface
- **Phase 6**: Data Setup & Sample Files

### Test Coverage Status:
- **Core Tools**: 72/72 tests passing ✅
- **Agent System**: 49/49 tests passing ✅  
- **Pipeline System**: 10/10 tests passing ✅
- **Total Coverage**: 131/131 tests passing ✅

### Agent Implementation Status:
- **OutlineAgent**: ✅ Complete (6/6 tests)
- **DraftAgent**: ✅ Complete (7/7 tests)
- **ExpandAgent**: ✅ Complete (6/6 tests)
- **PolishAgent**: ✅ Complete (8/8 tests)
- **FinalizeAgent**: ✅ Complete (11/11 tests)
- **LinkerAgent**: ⏭️ Skipped (optional)
- **PublisherAgent**: ✅ Complete (11/11 tests)

## Phase 1: Foundation Setup (TDD) ✅ COMPLETE
### 1.1 Project Structure & Dependencies ✅
- [x] Create proper directory structure (`src/`, `tests/`, `data/`, `content/`, `prompts/`)
- [x] Update package.json with correct dependencies (@openai/agents, zod, dotenv, etc.)
- [x] Set up TypeScript configuration for ES modules
- [x] Create .env.example template
- [x] Set up test framework (Jest/Vitest) for TDD
- [x] Configure ESLint and Prettier
- [x] Create .gitignore

### 1.2 Core Configuration System (TDD) ✅
- [x] Write tests for configuration loading
- [x] Implement config.ts with model settings, paths, feature flags
- [x] Add environment variable validation
- [x] Create configuration types and interfaces
- [x] Test error handling for missing configs

### 1.3 Data Contracts & Schemas (TDD) ✅
- [x] Write tests for Zod schemas
- [x] Create OutlineSchema (hierarchical H1-H3 with search intent, funnel stage, TPB)
- [x] Create DraftSchema (frontmatter + content structure)  
- [x] Create ExpandedSchema (evidence ledger, citations)
- [x] Create FinalSchema (complete frontmatter + schema blocks)
- [x] Create LinkGraphSchema (nodes, edges, priorities)
- [x] Test schema validation with valid/invalid inputs

## Phase 2: Core Tools & Utilities (TDD) ✅ COMPLETE
### 2.1 I/O and File System Tools (TDD) ✅
- [x] Write tests for file operations
- [x] Implement io.ts (slugify, writeMarkdown, datedDir functions)
- [x] Add safe file writing with error handling
- [x] Create directory structure generation
- [x] Test file naming conventions and path safety

### 2.2 Taxonomy & Linking Tools (TDD) ✅
- [x] Write tests for link selection logic
- [x] Implement taxonomy.ts (selectInternalLinks, link policy)
- [x] Create LinkTool for agent use
- [x] Add link validation (avoid orphans, max links per page)
- [x] Test anchor text generation and priority sorting

### 2.3 Markdown Processing Tools (TDD) ✅
- [x] Write tests for markdown normalization
- [x] Implement markdown.ts (frontmatter, TOC generation, validation)
- [x] Add heading structure validation (H1 uniqueness, proper hierarchy)
- [x] Create schema block insertion (FAQPage, HowTo, Article)
- [x] Test markdown parsing and regeneration

### 2.4 Quality Gate Tools (TDD) ✅
- [x] Write tests for content quality validation
- [x] Implement quality-gate.ts (E-E-A-T checks, intent alignment, readability)
- [x] Add word count, specificity, and citation validation
- [x] Create YMYL content safety checks
- [x] Test acceptance/rejection logic

## Phase 3: Agent System Implementation (TDD) ✅ COMPLETE (6/7 Complete, 1 Skipped)
### 3.1 Outline Agent (TDD) ✅
- [x] Write tests for outline generation
- [x] Create OutlineAgent.ts with structured output schema
- [x] Implement prompt template loading system
- [x] Add search intent mapping (Informational/Comparative/Transactional)
- [x] Add funnel stage mapping (TOF/MOF/BOF) and TPB classification
- [x] Test JSON output validation (6/6 tests passing)

### 3.2 Draft Agent (TDD) ✅
- [x] Write tests for initial draft creation
- [x] Implement DraftAgent.ts for concise paragraph writing
- [x] Add featured-snippet style answers (40-60 words)
- [x] Include expert quotes and citation placeholders
- [x] Test YMYL safety disclaimer insertion (7/7 tests passing)

### 3.3 Expand Agent (TDD) ✅
- [x] Write tests for content enrichment
- [x] Implement ExpandAgent.ts for examples, tables, comparisons
- [x] Add E-E-A-T signal insertion (author, credentials, review dates)
- [x] Create image placeholder and alt text generation (6/6 tests passing)

### 3.4 Polish Agent (TDD) ✅
- [x] Write tests for content polishing
- [x] Implement PolishAgent.ts for clarity and scannability
- [x] Add PAA (People Also Ask) question integration
- [x] Include inclusive language checking and suggestions
- [x] Test repetition detection and content quality validation (8/8 tests passing)

### 3.5 Finalize Agent (TDD) 🚧 NEXT
- [ ] Write tests for SEO optimization
- [ ] Implement FinalizeAgent.ts for on-page SEO
- [ ] Add title optimization (<60 chars), meta description (≤155)
- [ ] Create schema block insertion (structured data)
- [ ] Add conversion CTA insertion by funnel stage
- [ ] Test canonical URL and OG/Twitter card generation

### 3.6 Linker Agent (TDD) ⏭️ SKIPPED
- [ ] Write tests for internal linking
- [ ] Implement LinkerAgent.ts for link graph traversal
- [ ] Add external authority link insertion
- [ ] Create link validation and integrity checking
- [ ] Test anchor text optimization

### 3.7 Publisher Agent (TDD) ✅
- [x] Write tests for file output
- [x] Implement PublisherAgent.ts for markdown generation
- [x] Add index file updates and cross-references
- [x] Create backup and versioning system
- [x] Test file integrity and validation (11/11 tests passing)

## Phase 4: Orchestration Pipeline (TDD) ✅ COMPLETE
### 4.1 Agent Handoff System (TDD) ✅
- [x] Write tests for agent orchestration
- [x] Implement pipeline.ts with proper handoff chains
- [x] Add state persistence between agent calls
- [x] Create error handling and retry logic
- [x] Test state validation at each handoff point (10/10 tests passing)

### 4.2 Run State Management (TDD) ✅
- [x] Write tests for run state persistence
- [x] Implement RunState serialization/deserialization
- [x] Add checkpoint saving to `/runs/<id>/state.json`
- [x] Create resume functionality for interrupted runs
- [x] Test state recovery and continuation

### 4.3 Main CLI Interface (TDD) 📋 PENDING
- [ ] Write tests for CLI argument parsing
- [ ] Implement index.ts with topic input handling
- [ ] Add bucket selection (daily/weekly/monthly)
- [ ] Create single-run and batch-run modes
- [ ] Test command line interface and output formatting

## Phase 5: Batch Processing System (TDD)
### 5.1 Daily Batch Runner (TDD)
- [ ] Write tests for daily batch processing
- [ ] Implement runDaily.ts with topic list management
- [ ] Add concurrent processing with rate limiting
- [ ] Create progress tracking and error reporting
- [ ] Test batch completion and failure recovery

### 5.2 Weekly/Monthly Batch Runners (TDD)
- [ ] Write tests for weekly/monthly batches
- [ ] Implement runWeekly.ts and runMonthly.ts
- [ ] Add different topic selection strategies
- [ ] Create batch size configuration
- [ ] Test scheduling and resource management

### 5.3 Topic Management System (TDD)
- [ ] Write tests for topic queue management
- [ ] Implement topic prioritization and selection
- [ ] Add duplicate detection and prevention
- [ ] Create topic clustering and theme management
- [ ] Test topic lifecycle and completion tracking

## Phase 6: Data Layer & Configuration (TDD)
### 6.1 Sample Data Creation (TDD)
- [ ] Write tests for data file validation
- [ ] Create sample keyword_map.json with RV topics
- [ ] Implement link_graph.json with cluster relationships
- [ ] Add style_guide.md with brand voice rules
- [ ] Test data loading and validation

### 6.2 Prompt Templates (TDD)
- [ ] Write tests for prompt template loading
- [ ] Create prompts/outline.sys.md with clear instructions
- [ ] Implement prompts/draft.sys.md with writing guidelines
- [ ] Add prompts/expand.sys.md with enrichment rules
- [ ] Create prompts/polish.sys.md with editing criteria
- [ ] Add prompts/finalize.sys.md with SEO requirements
- [ ] Test template substitution and validation

## Phase 7: Integration & End-to-End Testing
### 7.1 Full Pipeline Integration Tests
- [ ] Write end-to-end pipeline tests
- [ ] Test complete topic → article transformation
- [ ] Validate output quality and SEO compliance
- [ ] Test error handling in complex scenarios
- [ ] Verify performance under load

### 7.2 Content Quality Validation
- [ ] Implement content scoring system
- [ ] Add SEO compliance checks
- [ ] Create readability validation
- [ ] Test internal linking accuracy
- [ ] Verify schema markup correctness

### 7.3 Performance Optimization
- [ ] Profile agent execution times
- [ ] Optimize token usage and API calls
- [ ] Implement caching where appropriate
- [ ] Test concurrent processing limits
- [ ] Monitor resource usage patterns

## Phase 8: Documentation & Deployment Prep
### 8.1 Documentation
- [ ] Update README.md with setup instructions
- [ ] Create API documentation for tools and agents
- [ ] Document configuration options
- [ ] Add troubleshooting guide
- [ ] Create example usage scenarios

### 8.2 Deployment Configuration
- [ ] Set up environment-specific configs
- [ ] Create Docker containerization
- [ ] Add health check endpoints
- [ ] Configure monitoring and logging
- [ ] Test deployment scenarios

## Non-Functional Requirements Implementation
- **Deterministic & Retryable**: Idempotent writes, resume runs, stable filenames
- **Observability**: Debug logging with `DEBUG=openai-agents:*`, state snapshots
- **Validation & Safety**: Zod schemas, citation checks, style linting, link integrity
- **Performance**: Batch operations, streaming, backoff on rate limits
- **Security**: No secrets in logs, sanitized file paths
- **Extensibility**: Pluggable tools, swappable models per agent

## Testing Strategy (TDD Approach)
1. **Unit Tests**: Each function/method gets tests first
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Full pipeline validation
4. **Property Tests**: Edge cases and data validation
5. **Performance Tests**: Load and stress testing
6. **Mock Strategy**: Mock OpenAI API calls for consistent testing

## Success Criteria
- [ ] Generate high-quality, SEO-optimized articles consistently
- [ ] Handle 25+ articles per day in batch processing
- [ ] Maintain E-E-A-T compliance for YMYL content
- [ ] Achieve proper internal linking per topic clusters
- [ ] Output valid schema markup for rich snippets
- [ ] Support resume/retry for interrupted processing
- [ ] Maintain 8-10 grade readability level
- [ ] Include proper citations and expert quotes
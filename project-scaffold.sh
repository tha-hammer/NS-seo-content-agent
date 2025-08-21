#!/usr/bin/env bash
set -euo pipefail

REPO="rvusa-seo-agents"
mkdir -p "$REPO"
cd "$REPO"

# --- Files & folders ---------------------------------------------------------
mkdir -p src/{agents,pipelines,prompts,utils,config} .github/workflows output

# .gitignore
cat > .gitignore << 'EOF'
node_modules
.env
dist
.cache
output
.DS_Store
*.log
*.tmp
*.local
coverage
EOF

# LICENSE
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 RVUSA
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
(see full text as usual)
EOF

# package.json (Node 22+, OpenAI Agents SDK)
cat > package.json << 'EOF'
{
  "name": "rvusa-seo-agents",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Agentic SEO content pipeline for RVUSA using OpenAI Agents SDK (@openai/agents).",
  "engines": { "node": ">=22" },
  "scripts": {
    "postinstall": "node -e \"console.log('✅ Install complete')\"",
    "dev": "node src/pipelines/dailyBatch.js --date=TODAY --limit=5 --mode=draft",
    "daily": "node src/pipelines/dailyBatch.js --date=TODAY --limit=25 --mode=final",
    "weekly": "node src/pipelines/weeklyPlanner.js",
    "monthly": "node src/pipelines/monthlyAudit.js",
    "generate:outlines": "node src/pipelines/generateOutlines.js",
    "format": "prettier -w .",
    "lint": "eslint ."
  },
  "dependencies": {
    "@openai/agents": "^0.0.14",
    "dotenv": "^16.4.5",
    "fs-extra": "^11.2.0",
    "globby": "^14.0.2",
    "gray-matter": "^4.0.3",
    "marked": "^12.0.2",
    "p-limit": "^5.0.0",
    "slugify": "^1.6.6",
    "yaml": "^2.5.0"
  },
  "devDependencies": {
    "eslint": "^9.9.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "prettier": "^3.3.3"
  }
}
EOF

# README
cat > README.md << 'EOF'
# RVUSA SEO Agents (Starter)

Agentic, AIO-ready content pipeline that:
- Builds outlines → drafts → expanded drafts → polished → final Markdown
- Enforces internal linking from `src/config/link_graph.json`
- Writes `.md` into `/output/YYYY-MM-DD/<cluster>/<stage>/`
- Supports **daily / weekly / monthly** batches

## Quick start
```bash
# Node 22+ required
pnpm i   # or: npm i / yarn

cp .env.example .env
# edit .env -> OPENAI_API_KEY=sk-...  and SITE_BASE_URL=https://www.rvusa.com

# smoke test (5 items as drafts)
npm run dev

# full daily batch (25 items -> final)
npm run daily

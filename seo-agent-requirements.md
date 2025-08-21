Here’s a complete, engineering‑ready plan to build an **agentic writing pipeline** (OpenAI Agents JS) that turns a topic into a polished, SEO‑sound, internally linked Markdown article—fully aligned with the SEO research doc you gave me.

---

# Functional requirements (what the agent must do)

1. **Build outline for each article**

* Generate a hierarchical H1–H3 outline, with section purposes mapped to **search intent** (Informational/Comparative/Transactional) and **funnel stage** (TOF/MOF/BOF), plus **TPB** (Attitude / Norm / Perceived Control).
* Include target query, primary/secondary keywords, questions to answer (PAA), and required on‑page elements (FAQ block, checklist, CTA, schema).
* Output: JSON (strict schema) + a preview `.md` skeleton.

2. **Write the initial draft**

* Draft concise paragraphs for every outline node, answering the exact user questions first (featured‑snippet style: 40–60 words), then supporting detail.
* Insert **expert quotes**, **source citations** (external authority), and **safety disclaimers** for YMYL topics (financing, safety, legal/DMV).
* Output: Markdown with frontmatter + `<faq>` and `<howto>` data blocks ready for schema.

3. **Write the expanded draft**

* Enrich with examples, step‑by‑steps, short tables/lists, and comparison modules.
* Add **E‑E‑A‑T signals**: author byline & credentials, last‑reviewed date, “Reviewed by” (optionally) and outbound citations to authoritative sources.
* Insert image placeholders and alt text stubs.
* Output: Markdown (expanded) + JSON “evidence ledger” (citations list).

4. **Polish the expanded draft**

* Improve readability (grade 8–10), remove fluff, fix hedging, tighten ledes.
* Optimize for **semantic coverage** (entities, synonyms), answer gaps vs PAA list, ensure **FAQ/HowTo** completeness.
* Validate compliance with brand voice and editorial style.

5. **Finalize the article**

* Apply **on‑page SEO**: title (<60 chars), meta description (≤155), H1 uniqueness, slug, canonical, OG/Twitter cards.
* Insert **schema blocks** (FAQPage/HowTo/Product/Review/Article/NewsArticle as applicable).
* Add **conversion CTAs** appropriate to stage (e.g., TOF download, MOF comparison tool, BOF inspection checklist).

6. **Ensure linking according to the SEO research doc**

* Build internal link set per **topic cluster**:

  * Pillar ↔ supporting (up & down),
  * Sibling cross‑links inside the cluster,
  * “Next best step” link for each funnel stage,
  * Breadcrumbs and related‑reading block.
* Add **external** links to high‑authority sources (manufacturers, RVIA, state DMV, NPS, etc.).
* Validate links against a **site link‑graph** (avoid orphans; ≤120 links/page; dofollow/nofollow rules).

7. **Output to formatted Markdown files**

* Emit `.md` with **YAML frontmatter**:

  * `title, description, slug, date, updated, author, reviewer, category, tags, cluster_id, pillar_id, stage, intent, tpb, canonical, og:*, twitter:*`
  * `schema:` (embedded JSON‑LD), `toc: true`, `reading_time`, `word_count`
* Save deterministic paths (`/content/<cluster>/<slug>.md`) and write/update a **cluster index** file.

---

# Non‑functional requirements (how it must behave)

* **Deterministic & retryable:** idempotent writes; resume runs; stable filenames.
* **Observability:** enable SDK **debug logging**; per‑step state snapshots; error categories (validation, tool, rate‑limit). (Set `DEBUG=openai-agents:*`.) ([OpenAI GitHub][1])
* **Validation & safety:** Zod schemas for every artifact; citation presence checks on claims; style linting; link integrity check; duplicate‑content guard.
* **Performance:** batch operations (linking/index lookups); streaming where possible; backoff on rate limits.
* **Security:** never expose secrets in logs; sanitize file paths.
* **Extensibility:** pluggable tools (SERP, vector search, CMS exporter); swappable models per agent.
* **Human‑in‑the‑loop (optional):** approval checkpoints before publish, with override/feedback loop. ([OpenAI GitHub][2])

---

# Requirements **stated or implied** by the SEO research doc

* **Semantic topic clusters** with pillar/supporting structure and dense, relevant interlinking.
* **E‑E‑A‑T:** author bios, reviewer, outbound authoritative citations, transparent sourcing.
* **Schema markup:** FAQPage, HowTo, Review/Product, Article/News; concise, structured answers.
* **User‑first structure:** featured‑snippet answers, checklists, step‑by‑steps, tables, and CTAs by funnel stage.
* **YMYL care:** finance/DMV/safety content must be accurate, cited, and include cautionary language.
* **Coverage completeness:** ensure buyer questions across TOF/MOF/BOF + TPB concerns are answered.
* **Accessibility & UX:** alt text stubs, clear headings, scannability, TOC, low reading level target.

---

# Agent topology (OpenAI Agents JS)

We’ll use **multiple specialized agents** orchestrated with handoffs. (The SDK defines **Agents**, **Tools**, **Handoffs**, and run orchestration. ) ([OpenAI GitHub][3])

**Agents**

1. **OutlineAgent** – builds outline + metadata (intent, stage, TPB, keywords, PAA).
2. **DraftAgent** – writes concise initial draft from outline.
3. **ExpandAgent** – expands with examples, tables, images, E‑E‑A‑T.
4. **PolishAgent** – edits for clarity, coverage, style, schema readiness.
5. **FinalizeAgent** – on‑page SEO, schema JSON‑LD, frontmatter, CTAs.
6. **LinkerAgent** – resolves internal/external links via link‑graph.
7. **PublisherAgent** – writes validated Markdown to disk and updates cluster index.

**Core tools** (Agents SDK “function tools”) ([OpenAI GitHub][4])

* `fetch_serp(query, region)` – optional hosted tool/web search (or in‑house proxy) for PAA and freshness.
* `vector_search(index, query)` – retrieve related site nodes for cross‑linking.
* `get_link_graph(cluster_id)` / `update_link_graph(edges)` – maintain cluster graph (JSON file/DB).
* `validate_links(markdown)` – crawl links and return issues.
* `write_markdown(path, content)` – filesystem writer.
* `read_content_index()` / `write_content_index()` – maintain sitewide frontmatter index.
* `slugify(title)` – deterministic slug generator.

**Handoffs**

* OutlineAgent → DraftAgent → ExpandAgent → PolishAgent → FinalizeAgent → LinkerAgent → PublisherAgent.
  Use SDK handoffs so the **RunState** carries validated artifacts between steps and each agent only does its job. ([OpenAI GitHub][3])

**Human‑in‑the‑loop (optional)**

* Before **PublisherAgent**, prompt for approval; store state to disk and resume on approval (mirrors the SDK HITL example). ([OpenAI GitHub][2])

---

# Data contracts (Zod schemas recommended)

* **Outline.json**

  * `topic, primary_kw, secondary_kws[], intent, funnel_stage, tpb, sections[] {id, h, goal, keypoints[], questions[]}`
* **Draft.md** (frontmatter minimal) + **Draft.json** (section map)
* **Expanded.md** + **Evidence.json** `{claims[], citations[]}`
* **Final.md** (full frontmatter + JSON‑LD `schema:` block)
* **LinkSet.json** `{internal[{from,to,anchor,rel}], external[{url,anchor,rel}]}` with rules satisfied
* **Index.json** (sitewide registry with `slug, title, cluster_id, pillar_id, stage, date, updated, tags[]`)

All step outputs **must** validate before handoff; failures re‑route to previous agent with fix instructions.

---

# Internal linking rules (baked into LinkerAgent)

* **Cluster linking:**

  * Each page links **up** to its pillar (1),
  * **Across** to ≥2 siblings (contextual anchors),
  * **Down** to ≥2 children (if any),
  * **Next-step CTA**: TOF→MOF, MOF→BOF, BOF→ownership.
* **External linking:** ≥2 authoritative sources for YMYL; manufacturer manual/specs when citing features; no affiliate in first fold.
* **Breadcrumbs:** `Home > Cluster > Article`.
* **Orphan guard:** each new page must receive ≥1 inbound link (update siblings/pillar or index).
* **Link hygiene:** ≤120 total links; descriptive anchors; no “click here.”

---

# Minimal code changes to the OpenAI Agents JS example

> Goal: Keep the official patterns; add a few agents, a handful of **function tools**, and set config/logging.

1. **Install & configure**

```bash
npm i @openai/agents zod
# env
export OPENAI_API_KEY=...
export DEBUG=openai-agents:*
```

* Use SDK default key discovery or `setDefaultOpenAIKey()` if needed. ([OpenAI GitHub][5])
* Enable **debug logging** as per Troubleshooting. ([OpenAI GitHub][1])

2. **Define agents (minimal delta)**

* Follow the **Basic Agent** + **Add a few more agents** patterns: create `OutlineAgent`, `DraftAgent`, etc., each with:

  * `instructions`: role, acceptance criteria, and Zod schema the agent must output,
  * `model`: pick per step (e.g., lighter model for outline, stronger for polish/final),
  * `tools`: only the ones needed for that step. ([OpenAI GitHub][3])

3. **Add function tools** (SDK “Tools” guide)

* Wrap your local functions with JSON schemas; expose to the relevant agent:

  * `write_markdown`, `read_content_index`, `vector_search`, `get_link_graph`, `validate_links`.
* If you need hosted tools (web/file search), you can attach them as described (or keep your own). ([OpenAI GitHub][4])

4. **Wire handoffs**

* Implement a simple orchestrator using `run()` that:

  * seeds `RunState` with `topic/cluster_id` → calls `OutlineAgent`,
  * passes validated output to `DraftAgent` … → `PublisherAgent`,
  * stores `RunResult` snapshots to `/runs/<id>/state.json`.
    This mirrors multi‑agent orchestration shown in the Quickstart. ([OpenAI GitHub][6])

5. **Add HITL checkpoint (optional)**

* Insert the **human‑approval step** right after `FinalizeAgent` before publishing (copy the SDK example pattern using readline + temp file). ([OpenAI GitHub][2])

6. **Structured outputs**

* Use Zod to validate the JSON artifacts the agents must produce (the SDK examples show Zod integration in tools/HITL flows). ([OpenAI GitHub][2])

7. **Troubleshooting**

* Keep the `DEBUG=openai-agents:*` logs on CI for first runs.
* Scope logs as needed (subsystems) per the Troubleshooting guide. ([OpenAI GitHub][1])

---

# Agent instructions (concise scaffolds)

**OutlineAgent (instructions excerpt)**

* “Produce an outline JSON matching `OutlineSchema`. Map each section to `intent`, `funnel_stage`, `tpb`, and list PAA questions. Include required blocks (FAQ/HowTo/CTA). Ensure coverage of buyer concerns and internal link targets (pillar/sibling/children placeholders).”

**DraftAgent**

* “Write concise, source‑cited paragraphs per section; lead each with a 40–60 word direct answer. Add footnote‑style citation markers (we will render to links later). Keep reading level G8–10.”

**ExpandAgent**

* “Add tables, examples, checklists, image placeholders with alt text, and E‑E‑A‑T elements (author bio/reviewer note). Fill FAQ and HowTo blocks. Update Evidence.json with claim→citation mapping.”

**PolishAgent**

* “Fix clarity, scannability, repetition; ensure all PAA are answered; ensure inclusive language; tighten H1/H2; verify schema blocks are syntactically valid (but do not write to file).”

**FinalizeAgent**

* “Generate frontmatter (see schema), meta title/description, canonical, OG/Twitter; embed JSON‑LD (FAQPage/HowTo/etc). Insert stage‑appropriate CTA.”

**LinkerAgent**

* “Resolve internal links from the link‑graph: up/sibling/down/next‑step. Add 2+ external authority links for YMYL claims. Run `validate_links` and return diffs to apply.”

**PublisherAgent**

* “Write `.md` to `/content/<cluster>/<slug>.md`. Update `/content/<cluster>/index.json` and sitewide `Index.json`. Return final file path.”

---

# Markdown frontmatter template

```yaml
---
title: "Best Travel Trailers Under 30 Feet (2025)"
description: "A buyer’s guide to short, towable RVs with safe weights, layouts, and prices."
slug: best-travel-trailers-under-30-feet-2025
date: 2025-08-20
updated: 2025-08-20
author: "Jane Doe"
reviewer: "ASE Master RV Tech, John Smith"
category: "Buying Guides"
tags: ["travel trailers","under 30 ft","lightweight","bunkhouse"]
cluster_id: "rv-buying"
pillar_id: "rv-buying-pillar"
stage: "MOF"
intent: "Comparative"
tpb: "Perceived Control"
canonical: "https://example.com/buying/best-travel-trailers-under-30-feet-2025"
og:
  image: "/images/og/travel-trailers-30ft-2025.jpg"
twitter:
  card: "summary_large_image"
toc: true
reading_time: 11
word_count: 1850
schema:
  - "@context": "https://schema.org"
    "@type": "FAQPage"
    mainEntity: []
  - "@context": "https://schema.org"
    "@type": "HowTo"
    name: "How to verify a trailer's tow match"
    step: []
---
```

---

# How this maps to the OpenAI Agents JS docs

* **Agents, tools, handoffs, and orchestration**: we define multiple Agents with focused instructions, attach function tools, and chain them with handoffs per the **Agents** and **Quickstart** guides. ([OpenAI GitHub][3])
* **Tools**: we expose local functions (filesystem, link‑graph, validators) as **function tools**; optionally use hosted tools for search/file features. ([OpenAI GitHub][4])
* **Human‑in‑the‑loop**: we borrow the example to pause for editorial approval before publish. ([OpenAI GitHub][2])
* **Config & keys**: rely on default `OPENAI_API_KEY` discovery or `setDefaultOpenAIKey()`; enable **debug** logs to troubleshoot runs. ([OpenAI GitHub][5])

---

## Minimal code diffs checklist

1. **Create agents** `outlineAgent.ts`, `draftAgent.ts`, … `publisherAgent.ts` using `new Agent({ name, instructions, model, tools })`. ([OpenAI GitHub][3])
2. **Add tools** in `tools.ts` with JSON schemas; export and attach per agent. (Filesystem write, link‑graph, validators.) ([OpenAI GitHub][4])
3. **Write orchestrator** `pipeline.ts` that:

   * builds initial `RunState` (`topic, cluster_id, pillar_id`),
   * `await run(outlineAgent, state)` → validate → handoff to next,
   * persists snapshots `/runs/<id>/state.json`, and
   * optionally pauses for **HITL** before `PublisherAgent`. ([OpenAI GitHub][2])
4. **Add config** `config.ts`: model choices per step; retries/backoff; `DEBUG` enabled; key load. ([OpenAI GitHub][5])
5. **Validation**: Zod schemas for all artifacts; throw on failure; return to previous agent with fix notes.
6. **CI task**: run link validator and schema lints on PR; store run logs (debug) as artifacts.

---

If you want, I can turn this design into a starter repo (agents, tools, zod schemas, and a runnable `npm run write -- --topic "..."`) so you can generate your first articles immediately.

[1]: https://openai.github.io/openai-agents-js/guides/troubleshooting/?utm_source=chatgpt.com "Troubleshooting | OpenAI Agents SDK"
[2]: https://openai.github.io/openai-agents-js/guides/human-in-the-loop/?utm_source=chatgpt.com "Human in the loop | OpenAI Agents SDK"
[3]: https://openai.github.io/openai-agents-js/guides/agents/?utm_source=chatgpt.com "Agents | OpenAI Agents SDK"
[4]: https://openai.github.io/openai-agents-js/guides/tools/?utm_source=chatgpt.com "Tools | OpenAI Agents SDK"
[5]: https://openai.github.io/openai-agents-js/guides/config/?utm_source=chatgpt.com "Configuring the SDK | OpenAI Agents SDK"
[6]: https://openai.github.io/openai-agents-js/guides/quickstart/?utm_source=chatgpt.com "Quickstart | OpenAI Agents SDK"

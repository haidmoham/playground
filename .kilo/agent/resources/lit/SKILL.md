---
name: lit
description: Explicit-only literature finder. Use only when the user invokes lit or explicitly asks to find papers, prior work, or published research on a topic. Return grounded current candidates; never write them into slim-brain automatically.
---

# Lit

Find relevant published work for the current question without turning discovery into ingestion.

## Search

1. Derive a narrow query from the user's explicit topic or the active artifact they named.
2. Use current scholarly/web search and primary metadata where available: arXiv, DOI/Crossref, OpenAlex, Semantic Scholar, publisher or conference pages.
3. Prefer the actual paper or primary metadata over model memory.
4. Distinguish open-access full text from metadata/abstract-only access.

## Present

Return a short ranked set, normally 3-6 papers:

- title;
- year;
- authors or venue when useful;
- stable identifier such as arXiv id or DOI;
- access status;
- one clause explaining why it intersects the question.

For a known field, include a seminal source when useful. For a narrow gap, optimize relevance over citation count.

## Rules

- Read-only with respect to slim-brain.
- Do not create paper notes or ontology records merely because a paper was expensive or interesting.
- If a paper later produces a reusable cross-domain principle, `librarian` decides whether that principle belongs in the brain.

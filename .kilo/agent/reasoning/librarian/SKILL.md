---
name: librarian
description: Curate Poneglyph when a session may contain durable cross-domain reasoning, or when the user asks to remember, codify, update, prune, or migrate vault knowledge. Route project-local facts away from the vault by default.
---

# Librarian

Purpose: keep Poneglyph small enough that it remains useful.

## Classify first

Choose exactly one:

- `LOCAL`: belongs in the relevant repository, code comments, docs, or GitHub Issues.
- `EPHEMERAL`: useful in the current conversation but not worth persistence.
- `CROSS_DOMAIN`: a reusable reasoning rule supported by at least two independent domains.
- `CORE`: rare global state or constraint that a fresh agent should know immediately.

Default to `LOCAL` or `EPHEMERAL`.

## Admission tests

A vault candidate should normally pass all of these:

1. **Cross-domain:** changes decisions in at least two independent domains or repositories.
2. **Non-reconstructable:** cannot be recovered cheaply from a project repository, issue, source document, calendar, or other canonical system.
3. **Longevity:** likely to matter after roughly 30 days, or is explicitly marked volatile with a review date.
4. **Compression:** the decision-relevant part fits in one or two sentences.

Interesting is not enough. Expensive research is not automatically durable vault knowledge.

## Write path

For `CROSS_DOMAIN`:

1. Read `ontology/schema.toml`.
2. Search `ontology/records.jsonl` by the candidate's mechanism and domains.
3. Update an existing record when one owns the idea; avoid near-duplicates.
4. Otherwise append one atomic record with type, summary, domains, provenance, relations, and temporal metadata.
5. Use a Markdown note only when the reasoning cannot remain useful in a compact record.

For `CORE`:

1. Edit `core.toml` in place.
2. Remove stale material to stay inside the hard budget. Do not move removed details elsewhere merely to preserve them.

## Temporal judgment

Set:

- `stability`: `volatile`, `active`, `stable`, or `timeless`.
- `relevance`: present usefulness from `0.0` to `1.0`.
- `decay`: `fast`, `medium`, `slow`, or `none`.
- `review_after`: a date when a deliberate re-check is useful, otherwise `null`.

A record can remain historically true while its relevance falls. Do not confuse age with irrelevance.

## Hard boundaries

Do not create:

- project entity mirrors;
- raw transcripts or session handoffs;
- append-only knowledge logs;
- duplicate project documentation;
- task queues;
- deployment/runtime state;
- a new ontology type or relation unless a real retrieval need requires it.

Git history and the legacy `haidmoham/brain` repository are the archive.

## Close

Run:

```bash
python3 scripts/validate.py
```

If the change will be committed, run the installed `commit-boundary` skill against `.ontology/commit-rules.md` before the commit.

Report the classification, canonical home, and exact records/files changed.

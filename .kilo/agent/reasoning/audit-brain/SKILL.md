---
name: audit-brain
description: Audit Poneglyph's size, ontology integrity, temporal hygiene, routing rules, and project-local leakage. Use only when the user explicitly asks to audit, lint, health-check, or prune the vault.
---

# Audit Poneglyph

Run `python3 scripts/validate.py` first.

Then inspect only what automation cannot decide reliably:

- near-duplicate records that express the same rule;
- records that have become project-local implementation history;
- stale `current` state in `core.toml`;
- temporal relevance that no longer matches actual use;
- records whose cross-domain evidence collapsed to one real domain;
- notes that should compress into one record;
- ontology growth that is creating types or relations without retrieval value.

Report findings before destructive changes unless the user explicitly asks to apply them.

The success condition is not a beautiful graph. It is a smaller active reasoning surface with no loss of decision quality.

---
name: resurface
description: Retrieve compact cross-domain context from Poneglyph when prior global reasoning could materially change a new, ambiguous, strategic, research, learning, or architectural task, or when the user explicitly asks to resurface. Do not use for routine bounded repository work.
---

# Resurface

The vault should change the plan, not become a prelude to every task.

## Order

1. If a project repository is in scope, inspect it first. Project truth outranks vault memory.
2. Read `core.toml` only when global state can affect the task.
3. Search `ontology/records.jsonl` with task-specific mechanism and domain terms.
4. Read at most the few records that can change the decision. Default output: no more than three records.
5. Follow a source pointer only when the compact record is insufficient and the source is still the correct canonical evidence.

## Ranking

Prefer records with:

- direct semantic relevance to the decision;
- higher `temporal.relevance`;
- `importance = global` when otherwise tied;
- `stability = stable|timeless` for long-horizon questions;
- fresher evidence for current-state questions.

Do not automatically discard old timeless principles. Do not elevate recent volatile facts above more relevant stable reasoning.

## Output

Return only context likely to change the plan:

- the relevant rule or constraint;
- why it transfers here;
- the record id for auditability.

If nothing changes the plan, say so and continue without vault context.

## Rules

- No whole-repo scan by default.
- No raw legacy brain search unless the user explicitly asks for historical recovery.
- Do not infer live project state from ontology records.
- Do not invoke operator or resource skills as a side effect of resurfacing.

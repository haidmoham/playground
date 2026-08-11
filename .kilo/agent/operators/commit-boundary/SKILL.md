---
name: commit-boundary
description: Explicit operator for checking a repository change against repo-local ontology and semantic commit rules before a commit lands. Use when the user invokes commit-boundary or asks to prepare, validate, or land a commit whose semantic records, evidence state, decisions, claims, checkpoints, provenance, or stable IDs may need to move with the code. Do not invent a repository ontology. Read the repository contract first.
---

# Commit Boundary

Check whether a Git change carries the semantic state that the repository requires.

The repository owns its ontology. This skill owns the check.

## Dispatch

Before changing or committing anything:

1. Read the repository `AGENTS.md` and relevant local instructions.
2. Read `.ontology/commit-rules.md` when it exists.
3. Inspect the staged diff and `git status`.
4. If nothing is staged, inspect the working diff and mark the result advisory until the intended commit is staged.
5. Read existing records that the diff creates, updates, supersedes, projects, or references.

Repository-local rules override this skill.

## Classify the boundary

Classify each relevant change as one or more of:

- implementation only;
- evidence or observation;
- claim, belief, hypothesis, or decision;
- status or lifecycle transition;
- stable identity or provenance;
- public projection, release, checkpoint, or ordinal.

Do not require ontology work for an implementation-only commit unless the repository contract requires it.

## Structural blockers

Treat these as blocking when the local contract makes the concept applicable:

- a stable ID is reused, silently renumbered, or replaced;
- a new semantic record lacks required provenance;
- a semantic record is deleted or replaced without the required supersession or preservation path;
- a commit claims a resolved, completed, published, or released boundary while the required status, outcome, index, log, or evidence artifact remains stale;
- a public projection advances beyond its canonical source evidence;
- two files that must describe the same semantic state disagree after the change.

A local contract can add stricter blockers.

## Advisory checks

Report these without blocking unless the local contract says otherwise:

- a useful relation or cross-link is absent;
- a durable semantic change may deserve a record, but the repository does not require one;
- prose or metadata can be clearer without changing truth conditions.

## Repairs

When the user asks to prepare or fix the commit, make the smallest deterministic repair.

You may repair:

- stable links and references;
- required provenance that is already known from the repository state;
- deterministic status/index synchronization;
- manifest or contract wiring;
- formatting required by the local schema.

Do not invent:

- human evaluation;
- experimental evidence;
- observations that were not recorded;
- claim strength;
- a solved or completed status;
- a new stable identity when the correct identity is ambiguous.

If a required semantic judgment is missing, leave the commit not ready and state the exact missing judgment.

## Parallel work

Treat stable semantic IDs as merge-preserved identity.

When parallel work lands, integrate around existing stable records. Do not regenerate, renumber, or silently replace them because another branch changed the same file.

## Result

Return a compact check:

```text
Boundary: none | advisory | blocking
Contract: <path or repository instructions>
Required: <semantic artifacts or invariants>
Present: <what the diff already satisfies>
Missing: <nothing or exact gaps>
Commit: ready | not ready
```

If the user explicitly asked for the commit and the result is `ready`, create the commit after normal repository validation. If the user asked only for a check, do not commit.

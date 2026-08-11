---
name: test-bench-to-portfolio
description: Explicit-only operator for projecting experimental work from haidmoham/test-bench or haidmoham/robotics-test-bench into mhaider.dev Working Notes. Use only when the user explicitly invokes test-bench-to-portfolio or asks to project, publish, sync, or expose test-bench experiments on the portfolio. Do not trigger from general discussion of experiments, robotics, ML, or portfolio design.
---

# Test Bench to Portfolio

Project experiment evidence from:

- `haidmoham/test-bench`
- `haidmoham/robotics-test-bench`

into `haidmoham/haidmoham.github.io`.

This skill is an operator. It is not project memory.

The source experiment remains canonical. Repository-local instructions override this skill.

## Dispatch

Before changing anything:

1. Read source `AGENTS.md` and `README.md`.
2. Read destination `AGENTS.md`.
3. Inspect the experiment README, code/notebook/data, and relevant `agent-log.md`.
4. Inspect the linked issue when present.
5. Inspect the corresponding portfolio area and nearby entries.

Use Robotics Test Bench `#02` as the canonical semantic example. Reconstruct the relationship between issue `#2`, `2026-08-09-two-link-coupling`, its evidence, and `robotics/02-multi-dof-coupling.html`.

Learn the transformation. Do not copy the HTML.

## Eligibility

Project experiment-bearing work with enough evidence for:

`Question → Prediction → Experiment → Observation → Model update`

Add a stop boundary when the evidence supports one.

Do not project infrastructure, templates, speculative work, routine logs, or concept issues without experimental evidence.

Do not invent missing conclusions. Mark retrospective predictions as retrospective.

## Evidence

Prefer:

1. direct outputs and recorded data;
2. experiment README;
3. human evaluation and outcomes;
4. linked issue;
5. commits and diffs;
6. agent suggestions.

Agent output is not evidence.

Keep observation, interpretation, rejected explanations, implementation-imposed behavior, and unresolved questions distinct.

## Projection

For robotics, keep three identifiers separate:

- source issue ID: stable concept identity and provenance only;
- experiment record: the dated canonical experiment directory and its resolved-boundary commit;
- public experiment ordinal: contiguous order of eligible published evidence.

Assign the public ordinal from experiment completion chronology, not from the source issue number. Use the commit that records the resolved boundary when available; use the dated experiment record as the fallback. If multiple experiments resolve on the same date, compare their completion commits. Unresolved or skipped concept issues do not reserve public numbers.

Show the source issue separately in provenance. Do not present the issue number as the public experiment number unless the two happen to match.

For new robotics pages, use the public ordinal in the visible experiment label and filename prefix. Once a public URL exists, preserve it. If correcting an old URL that encoded the wrong ordinal, publish the corrected URL and keep the old URL as a compatibility redirect.

Keep the general Test Bench separate. Use an existing general lab if present. Otherwise create the smallest parallel structure needed.

Before creating an entry, check for an existing projection. Update it instead of creating a duplicate.

Every important public claim must link back to canonical evidence.

Use the smallest useful evidence presentation. Never fabricate measurements or present browser-generated behavior as original experimental evidence.

## Constraints

- Do not modify either source repository unless the user explicitly asks for a source-side convention change.
- Keep the portfolio static HTML/CSS/JS.
- Prefer existing site patterns.
- Do not add unnecessary infrastructure.
- Do not commit or push unless explicitly requested.

## Validate

Verify claims, provenance, public ordinals, completion chronology, indexes, links, assets, redirects, and duplicate status.

Run the destination repository's existing validation and configured pre-commit checks.

If the destination declares `.ontology/commit-rules.md`, run the installed `commit-boundary` skill before any authorized commit or publication. Treat its blocking result as a stop condition.

Inspect the diff.

Confirm source repositories remain unchanged unless the user explicitly requested a source-side convention change.

Report what was inspected, changed, skipped, validated, and any unresolved evidence gaps.

---
name: goal
description: Explicit-only operator that routes rough goal intent through OpenAI's installed define-goal skill. Use only when the user invokes $goal or explicitly asks to use this ecosystem shortcut for a Codex goal. Do not trigger for ordinary implementation work.
---

# Goal

Use the official OpenAI `define-goal` skill as the canonical goal-definition implementation.

## Invocation

`$goal <rough intent>`

## Dispatch

1. Preserve the user's stated intent, mechanism, hypothesis, scope, and constraints.
2. Invoke `$define-goal` with the rough intent and relevant local context.
3. Let `define-goal` sharpen the outcome, evidence, scope boundary, and stop condition.
4. Do not silently replace the user's mechanism or hypothesis when that reasoning is the learning target.
5. For learning work, define observable success around the user's model. Do not solve the conceptual gap as part of goal phrasing.
6. If the installed `define-goal` skill is unavailable, stop and report the missing dependency. Do not maintain a local copy of the upstream skill.

## Boundary

This operator is only an invocation shim. OpenAI's `define-goal` skill remains canonical for goal quality and goal-tool behavior.

Do not use a goal for a one-off edit or ordinary implementation task unless the user asks for goal-backed work.

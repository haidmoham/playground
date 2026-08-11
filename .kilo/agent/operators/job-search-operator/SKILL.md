---
name: job-search-operator
description: Explicit-only dispatcher for the user's Codex computer-use job application flow. Use only when the user explicitly invokes job-search-operator or asks Codex to run, continue, or submit job applications. Do not trigger from general career discussion or job-search advice.
---

# Job Search Operator

This skill is a dispatcher, not job-search memory or policy.

Canonical job-search behavior, profile data, routing, dedupe, telemetry, and run instructions live in `haidmoham/job-application-agent`.

## Dispatch

1. Locate or clone `haidmoham/job-application-agent`.
2. Read its `AGENTS.md` and `startup.md`, then the config files they name.
3. Execute that repository's current contract using its own code and local state.
4. Keep application state, browser evidence, profile facts, routing rules, and telemetry out of Poneglyph.
5. If this skill and the project repository ever disagree, the project repository is authoritative.

Do not duplicate qualification rules, browser rules, security handoffs, resume routing, or closeout behavior here. Those rules change with the application system and belong beside it.

At closeout, report the bounded result required by the project contract. Store nothing in Poneglyph unless a separate lesson later passes the cross-domain storage gate.

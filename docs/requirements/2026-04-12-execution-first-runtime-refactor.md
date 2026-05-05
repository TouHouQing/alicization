# 2026-04-12 Execution-First Runtime Refactor

## Background

Current Alicization execution turns still run through a model-first dialogue path:

1. explicit execution asks such as `用 cli 查桌面文件` wait for main-gateway first content,
2. if the model stalls, runtime falls back to deterministic required-tool recovery,
3. terminal executor threads are still queued into subconscious callback delivery,
4. callback fallback can emit fixed template replies and leak machine audit strings into visible reasoning.

This produces the exact bad surface the host reported:

- timeout before action on simple execution asks,
- split “我现在直接用 CLI …” plus later callback bubbles,
- deterministic callback prose,
- visible reasoning like `status=completed; channel=cli; ...`.

## Goal

Refactor Alicization execution flow so explicit execution requests become execution-first turns with inline result delivery, duplicate callback suppression, and no mechanistic proactive thought leakage.

## Scope

1. Main chat execution path must support execution-first fast handling for explicit executor turns instead of waiting on model-first first-content timeout.
2. Same-turn terminal executor results must suppress redundant subconscious callback delivery.
3. Execution callback fallback must stop leaking audit/status strings through visible `thought` / reasoning surfaces.
4. Renderer must not expose proactive callback internal reasoning as user-visible “思考”.
5. Add regression tests for the reported CLI desktop flow and proactive callback leakage path.

## Architectural Direction (N.E.K.O + Claude Code parity)

- N.E.K.O-inspired: execution intent is a runtime lane choice, not a post-timeout repair patch.
- Claude Code-inspired: when the host asks to execute, runtime should act first and only surface meaningful state/results, not ceremonial filler.
- Digital-life constraint: deterministic fallback may exist as hidden recovery authority, but must not dominate visible companion surface.

## Constraints

- No rollback of unrelated dirty workspace files.
- Keep executor tool transport contracts compatible for existing callers.
- Preserve true background callback delivery for long-running tasks that do not resolve inline in the same turn.
- Any deliberate fallback authority must remain auditable in runtime logs without leaking into visible dialogue.

## Acceptance Criteria

1. Explicit executor turns no longer depend on waiting for main-gateway first content before action begins.
2. A same-turn completed CLI task does not later emit a duplicate subconscious callback bubble for the same thread.
3. Proactive callback visible reasoning no longer shows machine audit text such as `status=completed; channel=cli`.
4. Execution callback LLM failure does not force fixed-template user-visible callback prose when same-turn delivery already resolved the task.
5. Regression coverage includes the host phrase `用cli命令帮我查一下桌面有什么文件` and proactive callback reasoning suppression.

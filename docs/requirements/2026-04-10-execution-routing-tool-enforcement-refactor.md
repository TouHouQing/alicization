# 2026-04-10 Execution Routing Tool Enforcement Refactor

## Background

Current Alicization turns can still degrade into dialogue fallback when the host gives an explicit execution request (for example: `用cli命令帮我查一下桌面有什么文件`).
This breaks execution continuity and produces mismatch replies (truth-boundary prose instead of tool execution).

## Goal

Refactor execution-governance so explicit execution intent is enforced by runtime contracts, not fragile trigger words or renderer fallback paths.

## Scope

1. Main-session execution preparation (`main-chat-session-runtime`) must treat execution-routing turns as tool-mandatory.
2. Renderer stream retry policy (`packages/stage-ui/src/stores/chat.ts`) must not retry with `supportsTools=false` for execution-routing turns.
3. One-shot generation path (`main-chat-one-shot.ts`) must enforce required-tool evidence parity with stream runner.
4. Add regression tests for the exact host sentence:
   `用cli命令帮我查一下桌面有什么文件`.

## Architectural Direction (N.E.K.O + Claude Code parity)

- N.E.K.O-inspired: route by semantic execution intent and channel obligation instead of literal trigger-word matching.
- Claude Code-inspired: required tool-call is a hard contract; if missing, fail deterministically instead of pretending success.

## Constraints

- No rollback of unrelated dirty workspace files.
- Keep runtime contract surfaces stable for existing callers.
- Preserve capability-inquiry turns as non-execution turns.

## Acceptance Criteria

1. Execution-routing intent forces `allowTools=true` and `waitForTools=true` even if payload tool flags are false.
2. Renderer must not enter no-tools retry branch on execution-routing turns.
3. One-shot path throws deterministic error when required tool is not called.
4. Runtime integration test with user message `用cli命令帮我查一下桌面有什么文件` validates forced `executor_run_cli`.


# 2026-04-13 Execution Follow-Up Closure Refactor

## Background

The previous dialogue runtime refactor removed the worst greeting latency, but two continuity breaks remained in the execution chain:

1. short follow-up turns after an execution result still selected `follow-up`, but frequently fell through `compact-one-shot -> gateway timeout/fetch failure -> meta local fallback`,
2. explicit inline execution could finish and surface a reply in the same user turn, while the already queued subconscious execution-delivery wake still persisted a second proactive callback later.

That combination keeps breaking the “digital life” surface:

- execution-result follow-ups answer with runtime/meta continuation text instead of the actual remaining result,
- same-turn CLI/tool results can re-enter the thread as a second bubble,
- continuity appears split between inline reply, subconscious callback, and session mirror.

## Goal

Close the execution continuity chain from the runtime core:

- execution-result follow-ups must first attempt a deterministic local payoff from real execution artifacts,
- inline execution surfaced in the foreground must suppress queued or already in-flight subconscious callback delivery for the same settled task thread,
- session continuity, execution ledger, and active dialogue must share one truthful result authority.

## Scope

1. Introduce a deterministic execution follow-up payoff path for `active-dialogue` follow-up turns.
2. Resolve follow-up detail from stored task threads and execution events instead of the remote gateway.
3. Add an identity-level “already surfaced inline” guard to execution delivery runtime.
4. Check that guard before and after subconscious callback generation so in-flight deliveries cannot leak through persistence.
5. Add regression tests for:
   - deterministic “remaining items” payoff from CLI desktop listing output,
   - inline-surfaced callback requeue suppression,
   - pre-persist skip when a queued callback becomes inline-surfaced mid-flight.

## Architectural Direction (N.E.K.O + Claude Code parity)

- N.E.K.O-inspired: foreground continuity should pay off from the living local state first, not narrate the runtime when the thread already contains enough grounded evidence.
- Claude Code-inspired: tool results must be rendered once, then treated as settled session state; follow-up turns should consume that state directly instead of reopening the whole model loop.
- Alicization constraint: heart, mind, memory, tool reality, and callback delivery must form one replayable authority, not parallel reply surfaces fighting each other.

## Acceptance Criteria

1. A follow-up like `另外四项是什么？` after a desktop listing answers with actual remaining item names from the settled execution thread.
2. That follow-up no longer depends on `compact-one-shot` success to avoid meta fallback.
3. When an inline executor result has already been surfaced, the matching subconscious execution delivery is skipped even if the wake was already queued or generation already started.
4. No duplicate proactive callback bubble is persisted for the same `sessionId + threadId + completedAt` execution result after inline execution.

# 2026-04-12 Dialogue Runtime Closure Refactor

## Background

Current Alicization dialogue turns still collapse into one heavyweight main-gateway lane:

1. plain greetings such as `你好` enter the same model-first stream path as heavy governed turns,
2. that path waits for a 45 second first-content timeout,
3. then it performs two extra non-streaming timeout recoveries,
4. only after all of that does runtime emit a local fallback reply,
5. the local fallback reply is mostly stateless and does not fully ingest active loop, session mirror, or recent thread continuity.

This creates the exact surface the host is reporting:

- simple dialogue waits minutes before replying,
- short follow-up questions lose continuity,
- timeout fallback sounds like runtime narration instead of a living turn,
- “mind” does not appear to participate in every behaviour because timeout/local recovery bypasses the active dialogue loop.

## Goal

Refactor dialogue runtime so Alicization has a true active dialogue loop:

- low-latency greetings and short dialogue turns must not enter the heavyweight stream lane by default,
- short follow-up turns must preserve continuity from the same conversation session,
- timeout recovery must read mind/runtime/session state instead of replying from fixed templates,
- heart, memory, continuity, execution, and tool reality must form one closed loop.

## Scope

1. Add an active dialogue fast lane for lightweight non-tool turns.
2. Feed that lane with active loop state, session mirror, recent user/assistant turns, and runtime continuity.
3. Make short greetings, capability questions, and short follow-up questions bypass the heavyweight stream lane.
4. Replace stateless timeout fallback with continuity-aware local recovery.
5. Reduce dialogue-first latency by using compact-context one-shot recovery before any heavyweight timeout path.
6. Add regression tests for greeting latency path, follow-up continuity, and local recovery behaviour.

## Architectural Direction (N.E.K.O + Claude Code parity)

- N.E.K.O-inspired: dialogue must have a living foreground loop, not only a post-hoc governance repair surface.
- Claude Code-inspired: short, obvious turns should resolve through the smallest truthful runtime lane that can complete them now.
- Alicization constraint: mind state, continuity, memory carry, and execution thread state must remain one authority across normal reply, fast reply, and timeout recovery.

## Constraints

- Do not revert unrelated dirty workspace files.
- Keep heavy governed stream path intact for inspection-rich, tool-bound, or high-context turns.
- Keep card-scope and session-scope continuity semantics intact.
- Any new fast lane or local recovery must remain auditable in runtime debug logs.

## Acceptance Criteria

1. A simple `你好` turn no longer waits on the 45 second first-event timeout chain before replying.
2. A short follow-up turn such as `另外还有哪四项？` no longer falls into meta runtime chatter like “要我继续回答还是执行下一步”.
3. Dialogue timeout recovery reads session continuity and active loop state rather than emitting fixed generic templates.
4. Non-tool dialogue turns that qualify for the fast lane use a compact dialogue context instead of the full heavyweight message stack.
5. Regression coverage proves:
   - greeting fast lane activation,
   - continuity-aware local fallback,
   - follow-up continuity after a previous desktop listing turn.

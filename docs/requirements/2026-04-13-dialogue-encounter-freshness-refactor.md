# 2026-04-13 Dialogue Encounter Freshness Refactor

## Background

The current active dialogue loop still lets stale continuity seize turns that should belong to the present encounter.

Observed failure chain from runtime logs and host screenshots:

1. short turns like `早上好呀`, `现在几点了？`, and `你在说啥呢` enter the active dialogue loop,
2. continuity/follow-up heuristics run before fresh-turn intent is settled,
3. the turn is mislabeled as `dialogue` or `follow-up`,
4. `compact-one-shot` tries the gateway,
5. the gateway times out or fails,
6. local fallback then speaks from the wrong carried thread.

This is why Alicization feels non-living even when model configuration is valid:

- greetings continue an unrelated task thread,
- utility questions like time/date get dragged into old continuity,
- repair complaints keep inheriting the previous mistaken turn instead of repairing it,
- the host experiences a split between current intent, memory carry, and visible reply.

## Goal

Refactor the active dialogue loop so current-turn encounter freshness becomes the first authority.

The runtime must:

- classify the current turn before continuity inheritance,
- give greeting / capability / local utility / repair turns deterministic local closure,
- require explicit carry markers before a short turn can become `follow-up`,
- keep continuity as a supporting authority instead of a hijacking authority.

## Scope

1. Add an explicit encounter reducer ahead of fast-path lane selection.
2. Introduce fresh-turn encounter kinds for:
   - `greeting`
   - `capability`
   - `utility-time`
   - `utility-date`
   - `repair-clarify`
3. Narrow `follow-up` so it only fires when the host explicitly points back to the carried thread.
4. Make greeting/time/date/repair encounters complete through `local-only` replies without touching the heavyweight stream path.
5. Let repair replies optionally pay off the immediately previous missed local utility question.
6. Add regression tests at reducer and background-run levels.

## Architectural Direction (N.E.K.O + Claude Code parity)

- N.E.K.O-inspired: a living foreground loop must first know what this turn is, not merely what the previous turn was.
- Claude Code-inspired: small deterministic questions should resolve from the smallest truthful local authority available now.
- Alicization constraint: mind, continuity, execution, and repair must still remain one chain, but current-turn encounter ownership must preempt stale carry contamination.

## Constraints

- Do not revert unrelated dirty worktree changes.
- Keep execution-result deterministic payoff logic intact.
- Keep heavy governed stream path available for non-deterministic dialogue or inspection/tool-bound turns.
- Any new local-only path must still emit replayable debug evidence via existing active-dialogue logs.

## Acceptance Criteria

1. `早上好呀` is classified as a greeting and answered locally without continuing the previous thread.
2. `现在几点了？` is classified as a local utility time turn even when a previous thread exists.
3. `你在说啥呢` after a misthreaded time reply becomes a repair-clarify turn and locally realigns the answer instead of continuing the stale thread.
4. Short follow-up turns still work when they explicitly reference prior continuity, such as `另外还有哪四项？` or `刚才那个命令结果呢`.
5. Regression coverage proves:
   - fresh-turn encounter precedence,
   - follow-up explicit-carry requirement,
   - local-only background-run execution for greeting/time/repair turns.

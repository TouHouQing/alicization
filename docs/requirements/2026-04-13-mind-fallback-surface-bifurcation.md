# 2026-04-13 Mind Fallback Surface Bifurcation

## Background

The previous Alicization refactors fixed several transport and runtime split issues, but one shared fallback surface is still leaking non-living repair narration into ordinary dialogue and execution turns:

1. `packages/stage-shared/src/alicization-mind-fallback.ts` still emits `repair-stale-anchor`, `repair-need-reground`, `carry-memory`, and `reground-note` mainly from governance repair flags.
2. Renderer and main both consume that same shared fallback surface during structured repair and governed override, so once the shared surface is too eager, the entire dialogue chain inherits the same old-anchor / reground phrasing.
3. This makes simple turns like `你好` or explicit execution asks sometimes surface "旧锚点 / 重新落地 / 真实边界" speech even when the user did not ask for screen-grounded inspection.

That architecture is still not digital-life-consistent:

- internal repair state is leaking directly into visible speech,
- mind participation is not separated from visible reply authority,
- screen-reground narration is being reused outside real inspection turns.

## Goal

Refactor the shared governed fallback layer so visible repair narration becomes a separate, permissioned surface:

- true inspection / screen-reground turns may still expose repair narration,
- dialogue and execution continuity turns must keep the mind state internally without surfacing stale-anchor repair prose.

## Scope

1. Introduce a shared visible-repair decision in `packages/stage-shared/src/alicization-mind-fallback.ts`.
2. Base that decision on both governance shape and real inspection evidence from the current user turn.
3. Suppress visible repair templates (`repair-*`, `carry-memory`, `reground-note`) when the turn is execution-bound or not a real inspection/reground turn.
4. Align governed override decisions so non-inspection repair flags no longer force generic repair takeover over otherwise organic dialogue.
5. Add regression coverage for:
   - shared fallback surface bifurcation,
   - structured-output local/governed repair behavior,
   - runtime governance reply override on non-inspection dialogue turns.

## Acceptance Criteria

1. A user turn like `你好` or other non-inspection dialogue must not surface `旧锚点`, `真实边界`, `上一条线`, or `重新落地` only because governance still carries repair residue.
2. Explicit execution turns continue to hide repair narration and keep dispatch/result authority separate from visible bubble text.
3. Real inspection/recheck turns such as screen or diff re-reads still preserve truthful repair narration when the user is actually asking for current-visual grounding.
4. Shared fallback, renderer structured repair, and main runtime override all use the same visible-repair permission instead of ad-hoc local exceptions.

# 2026-04-13 Dialogue Self And Utility Surface Refactor

## Background

The previous freshness refactor fixed stale continuity hijacking for some turns, but the foreground dialogue surface still has two structural gaps:

1. self-identity turns such as `你是谁` and `我问你，你是谁` are still folded into generic capability replies,
2. local utility turns with natural word-order variation such as `几点了现在` still miss the deterministic utility lane and fall back into dialogue carry.

This keeps the visible surface non-living:

- identity questions get the same tool-capability paragraph repeatedly,
- time questions still sound like carried dialogue instead of a grounded present-tense answer,
- different foreground entry shapes can still produce different personalities for the same host intent.

## Goal

Refactor the foreground encounter surface so Alicization has distinct local authorities for:

- self identity,
- capability,
- local time/date,
- repair/clarify.

## Scope

1. Introduce an explicit `identity` encounter lane separate from `capability`.
2. Replace brittle regex-only time/date detection with token-aware utility detection that tolerates natural word-order changes.
3. Add local `mind-turn-v1` reply builders for identity and utility turns.
4. Keep fresh-turn thought metadata aligned with the same identity/utility encounter authority.
5. Add regression tests for:
   - `你是谁`
   - `我问你，你是谁`
   - `几点了现在`
   - background-run local-only execution for those turns.

## Acceptance Criteria

1. `你是谁` no longer returns the same capability paragraph as `你能为我做什么`.
2. `我问你，你是谁` still lands in the identity lane even after a prior wrong answer.
3. `几点了现在` and `现在几点了？` both land in `utility-time`.
4. The emitted `thought` for identity/time turns uses self/utility focus rather than stale memory carry.

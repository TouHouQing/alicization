# 2026-04-13 Dialogue Encounter Freshness Refactor Plan

## Internal Grade

- `L` (single governed runtime lane, focused on reordering dialogue authority inside the active foreground loop)

## Workstreams

1. Encounter reducer authority
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- Action:
  - add an explicit encounter reducer before continuity routing,
  - classify fresh-turn intent first,
  - map encounter ownership into fast-path lane + strategy only after intent is settled.

2. Deterministic local surface for fresh-turn utility/repair
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- Action:
  - add local-only replies for greeting, time, date, and repair-clarify,
  - ensure greeting stops defaulting to carried-thread narration,
  - let repair locally pay off the immediately previous missed time/date question when possible.

3. Continuity narrowing
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts`
- Action:
  - require explicit carry markers before selecting `follow-up`,
  - preserve deterministic execution payoff for explicit execution-thread follow-ups,
  - prevent generic short questions from inheriting the previous thread.

4. Regression coverage
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Action:
  - cover `早上好呀` greeting freshness,
  - cover `现在几点了？` time utility precedence over continuity,
  - cover repair complaint local realignment,
  - keep explicit execution follow-up deterministic payoff tests green.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
3. `pnpm typecheck`

## Rollback Rule

- If the new encounter reducer starts swallowing legitimate carried-thread follow-ups, keep the fresh greeting/time/repair local-only lanes, but tighten follow-up detection further to explicit thread nouns plus carry markers.

## Cleanup

- Keep active-dialogue debug events because this refactor depends on replayable lane evidence.
- Do not commit runtime logs or ad-hoc investigation scratch files.

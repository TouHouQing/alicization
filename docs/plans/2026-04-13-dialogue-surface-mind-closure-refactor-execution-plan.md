# 2026-04-13 Dialogue Surface Mind Closure Refactor Plan

## Internal Grade

- `L` (single governed runtime lane, dialogue surface + structured stream closure)

## Workstreams

1. Unified mind-surface renderer
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/mind-surface-renderer.ts`
- Action:
  - add one renderer that accepts governance plus semantic reply moves and owns final visible speech shaping,
  - enrich governance with dialogue-act cues before rendering so visible speech is mind-mediated even in deterministic fast paths,
  - make execution payoff and dialogue fast paths use the same visible reply authority.

2. Active-dialogue surface de-templating
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
- Action:
  - replace hardcoded greeting / identity / capability / repair / follow-up shells with semantic move builders driven by current user text, continuity anchor, and governance,
  - route local deterministic fallback through the shared mind-surface renderer instead of lane-local `build*Reply` text factories.

3. Execution payoff surface unification
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`
- Action:
  - remove direct callback / inline / follow-up payoff sentence factories,
  - convert execution outcomes into semantic listing/detail moves and render them through the shared mind surface.

4. Structured stream leak firewall
- Files:
  - `packages/stage-ui/src/stores/chat.ts`
  - `packages/stage-ui/src/stores/chat.test.ts`
- Action:
  - buffer JSON-shaped structured payload prefixes instead of streaming them into visible text,
  - strengthen fallback ordering so raw structured objects never become final visible speech.

5. Regression coverage and closure
- Files:
  - `packages/stage-ui/src/composables/alicization-structured-output.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`
- Action:
  - cover ordinary dialogue continuity,
  - cover raw JSON leak suppression,
  - ensure the final visible reply stays human-facing and mind-consistent,
  - assert that deterministic fast paths no longer own final visible text directly.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts packages/stage-ui/src/composables/alicization-structured-output.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts packages/stage-ui/src/stores/chat.test.ts --reporter=dot`
2. `pnpm -F @proj-alicization/stage-ui typecheck`
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
4. `pnpm typecheck`

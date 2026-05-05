# 2026-04-10 Execution Routing Tool Enforcement Refactor Plan

## Internal Grade

- `L` (single-lane serial refactor with strict regression gates)

## Workstreams

1. Main runtime enforcement gate
- File: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Action: derive `routingRequired` and force tools/wait flags for execution-routing turns.

2. Renderer retry policy hardening
- File: `packages/stage-ui/src/stores/chat.ts`
- Action: block `stream-retry-without-tools` when current turn has execution-routing requirement.

3. One-shot execution contract parity
- File: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts`
- Action: extract required tool names from `toolChoice`, inspect generation result tool-call evidence, and fail when missing.

4. Regression test updates
- Files:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
  - `packages/stage-ui/src/stores/chat.test.ts`
- Action: add positive and guardrail tests around forced executor routing and no-tools retry suppression.

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
2. `pnpm -F @proj-alicization/stage-ui exec vitest run src/stores/chat.test.ts` (expected environment caveat)
3. `pnpm typecheck`
4. `pnpm lint:fix`

## Rollback Rule

- If execution-routing turns regress for capability inquiry or visual grounding routes, revert the corresponding unit and keep routingRequired enforcement guarded by explicit semantic intent only.

## Cleanup

- Persist governed runtime artifacts under `outputs/runtime/vibe-sessions/<run-id>/`.
- No temp assets expected.


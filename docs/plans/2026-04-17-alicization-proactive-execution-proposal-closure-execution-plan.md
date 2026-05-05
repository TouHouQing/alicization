# 2026-04-17 Alicization Proactive Execution Proposal Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 扩充 `autonomy-actuation` 结果与 proposal surface。
3. 升级 dialogue session mirror 的 execution summary。
4. 把 execution proposal 接入 subconscious runtime。
5. 跑 targeted tests 与 typecheck。

## Ownership Boundaries

1. Proposal derivation:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.ts`
2. Subconscious runtime integration:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
3. Session mirror execution surface:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.ts`
4. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.test.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`

## Implementation Rules

1. execution proposal 只能来自真实 `needs-affirmation` planning result。
2. 提议文本必须说清楚 goal 与确认门，不能变成空洞寒暄。
3. session mirror execution summary 必须与同一 planning truth surface 对齐。
4. 不新增第二种 proactive payload 通道，优先复用现有 subconscious proactive structured reply。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
7. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 确认 proactive `needs-affirmation` thread 能被说成自然提议。
2. 确认 `你在干嘛` 可以读到这条提议。
3. 确认 confirmation gate 仍然存在，没有被偷偷绕过。

## Rollback Rules

1. 如果 proposal 文案过于打扰，优先收紧触发条件，而不是回退 richer execution summary。
2. 如果 session mirror 变得噪声过高，优先压缩 execution summary，而不是删除 proposal 主干。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。

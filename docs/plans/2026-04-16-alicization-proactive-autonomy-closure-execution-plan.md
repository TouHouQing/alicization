# 2026-04-16 Alicization Proactive Autonomy Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 新增 `autonomy-kernel`，统一收束主动说话、主动观察、主动复查、准备行动、行动意图。
3. 将自治快照接入 `runtime-mind-state` 主装配链路，并把 `initiative` 与 private thought 收束到同一 authority。
4. 更新 runtime architecture、digital-life kernel/spine、shared digest、proactive policy。
5. 补 targeted tests 并做验证。

## Ownership Boundaries

1. New autonomy core:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.ts`
2. Mind-state assembly:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
3. Agency/runtime projection:
   `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/private-thought-loop.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
4. Shared transport/digest surfaces:
   `packages/stage-shared/src/alicization-transport-contracts.ts`
5. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
   existing `initiative-engine.test.ts`
   existing `proactive-policy.test.ts`
   existing `digital-life-spine.test.ts`

## Implementation Rules

1. 自治快照必须是一等输出，而不是藏在 runtime summary 里的字符串。
2. `shouldProactivelyAct` 必须改为自治 authority 驱动。
3. `initiative` 继续作为表层可见动作，但其最终表面行为要与 autonomy snapshot 保持一致。
4. 不新增不可解释的魔法分支；所有 act/speak/defer 决策都要能映射到 source goal / agenda / thread / desire。
5. 若为兼容现有显示层保留 `initiative.selectedAction`，需要让自治快照提供 `visibleAction` 与 `selectedMode` 的清晰区分。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/digital-life-spine.test.ts`
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
6. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 确认新增自治层在 runtime 装配链路中有唯一 authority 位置。
2. 确认 runtime / digital-life digest 可以投影 act readiness、execution intent、defer reason。
3. 确认 proactive policy 不会因为 act readiness 而错误地把“准备行动”直接当成“适合开口”。
4. 仅在验证通过后允许使用完整完成措辞。

## Rollback Rules

1. 如果自治层引发链路错位，优先保留新 snapshot 与 digest，再局部回退 consumer 接入点。
2. 如果现有 UI/renderer 无法消费新增自治字段，优先保持字段向后兼容而不是删除自治主干。
3. 如果 proactive policy 出现误判，优先收紧 autonomy-to-speech 映射，而不是回退 autonomy kernel 本身。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 源码提交前确认索引里只有本轮主动系统重构相关文件。

# 2026-04-16 Alicization Autonomous Actuation Closure Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` requirement / plan / runtime artifacts。
2. 新增自主 actuation helper，把 autonomy 映射成 revisit scheduling / proactive task intent。
3. 在 `runtime.ts` 暴露 subconscious runtime 需要的内部计划与 reminder 接口。
4. 接入 `runtime-subconscious-tick`，让 proactive speech 之外还能：
   - schedule revisit
   - plan proactive task thread
   - optionally auto-dispatch safe observe task
5. 补 targeted tests，验证 runtime 不会悄悄越过 affirmation gate。

## Ownership Boundaries

1. Actuation derivation:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.ts`
2. Runtime subconscious integration:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
3. Runtime internal ports:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
4. Optional contract widening if needed:
   `apps/stage-tamagotchi/src/shared/eventa.ts`
   `packages/stage-shared/src/alicization-transport-contracts.ts`
5. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts`
   targeted existing runtime/task tests if required

## Implementation Rules

1. 不复制第二套执行系统；统一复用已有 task governor / reminder / execution delivery。
2. proactive mutate 行为不得绕过 `needs-affirmation`。
3. auto-dispatch 仅允许安全 observe 路径，且必须可审计。
4. revisit scheduling 需要显式依赖自治原因，而不是新增隐式 heuristic。
5. 若需要 widening shared contract，保持向后兼容，优先新增字段而不是改变既有语义。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-actuation.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autonomy-kernel.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/alicization-runtime-architecture.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
7. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 确认 `prepare-act` 能留下 revisit/reminder，而不是下一轮直接蒸发。
2. 确认 `act` 能进入 proactive task planning。
3. 确认 proactive observe task 能在允许时 routed/dispatched。
4. 确认 proactive mutate task 会停在 `needs-affirmation`。
5. 仅在验证通过后允许使用完整完成措辞。

## Rollback Rules

1. 如果 subconscious loop 变得过于激进，优先收紧 actuation eligibility，而不是删除 actuation 主干。
2. 如果 shared contract widening 带来消费端波动，优先保持字段可选。
3. 如果 auto-dispatch 风险过高，保留 proactive planning/revisit，关闭 automatic dispatch 分支。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 提交前确认索引里只有主动系统 actuation 闭环相关源码文件。

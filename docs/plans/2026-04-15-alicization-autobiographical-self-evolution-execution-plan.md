# 2026-04-15 Alicization Autobiographical Self Evolution Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结本轮 `vibe` requirement / plan / governance artifacts。
2. 新增 `autobiographical-self` snapshot 与 builder，定义 persona drift、preference evolution、self-directed goals。
3. 将该 snapshot 接入 Visual Presence persistence、normalizer、Digital Life runtime surface。
4. 把该层接进 `goal-stack`、`initiative-arbiter`、`initiative-engine`、`mind-ecology`、`private-thought`、`mind-synthesis`、`mind-continuity`、main chat runtime surface。
5. 补 targeted tests 并完成 verification。

## Ownership Boundaries

1. Shared runtime contract / persistence:
   `apps/stage-tamagotchi/src/shared/eventa.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/digital-life-kernel.ts`
2. New durable self core:
   `apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.ts`
3. Decision/runtime integration:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/goal-stack.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/initiative-arbiter.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/mind-ecology.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/private-thought-loop.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/mind-continuity.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
4. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/*.test.ts`

## Implementation Rules

1. 长期人格漂移必须进入持久化 snapshot，不能只做运行时 prompt 拼接。
2. 新层必须是现有 mind pipeline 的正式依赖，不允许成为孤立 helper。
3. 优先让长期偏好真的影响 goal / initiative，而不是只描述在文本里。
4. 若存在循环依赖，允许采用 provisional/final 两段式装配，但要保持主链清晰可解释。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/goal-stack.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-continuity.test.ts`
5. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
6. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
7. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 确认 autobiographical self 被持久化到 visual presence snapshot。
2. 确认 runtime surface / prompt surface 能读到稳定 persona drift 与长期偏好。
3. 确认 goal / initiative 对长期偏好产生可测影响。
4. 仅在验证通过后允许使用完整完成措辞。

## Rollback Rules

1. 如果新层接入导致主动行为过度僵化，优先收缩偏好权重，不删除持久化层。
2. 如果 prompt surface 过度自说自话，优先减薄 autobiographical block，不回退底层 snapshot。
3. 如果 goal/initiative 受到过强拖拽，优先降低 long-horizon goals 的 score contribution，而不是删除长期偏好演化链。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 源码提交前确认只有本轮 Alicization runtime / tests 相关文件进入索引。

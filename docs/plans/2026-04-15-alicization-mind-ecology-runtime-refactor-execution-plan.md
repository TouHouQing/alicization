# 2026-04-15 Alicization Mind Ecology Runtime Refactor Execution Plan

## Internal Grade

L

## Wave Structure

1. 冻结 `vibe` 需求与执行产物。
2. 实现新的 `mind-ecology` 模块，统一沉淀人格倾向、情绪天气、行为习惯、自我叙事。
3. 将 ecology 接入 `runtime-mind-state` 的主装配链路。
4. 将 ecology 接入 `private-thought`、`mind synthesis`、main chat prompt 表层与连续性 fragment。
5. 补测试并做 targeted verification。

## Ownership Boundaries

1. Mind-state assembly:
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
2. New ecology core:
   `apps/stage-tamagotchi/src/main/services/alicization/mind-ecology.ts`
3. Thought / synthesis / prompt integration:
   `apps/stage-tamagotchi/src/main/services/alicization/private-thought-loop.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
4. Tests:
   `apps/stage-tamagotchi/src/main/services/alicization/*.test.ts`

## Implementation Rules

1. 新增统一 ecology builder，而不是把更多阈值散落到现有模块里。
2. 优先让 ecology 影响“思维与表层”，保证用户可感知的心智一致性先提升。
3. 若现有接口过薄但无需跨进程暴露，优先保持改造在 runtime 内部。
4. 如必须使用兼容输入，采用渐进式重构，不回退到临时补丁写法。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-ecology.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/private-thought-loop.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
4. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts`
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
6. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 确认 `mind ecology` 已进入运行时主链路，而不是孤立工具函数。
2. 确认回答 prompt 中含 ecology block。
3. 确认生态连续性可以转成 fragment 写回连续性记忆通道。
4. 仅在验证通过后允许使用完整完成措辞。

## Rollback Rules

1. 如果 ecology 接入导致 mind pipeline 行为退化，优先保留 builder 和 system block，再局部回退个别 consumer 接入点。
2. 如果 prompt ecology block 造成回答漂移，优先削弱 block 内容，而不是删除 ecology 主干。
3. 如果连续性 fragment 写入带来噪声，先保留 ecology builder 与 prompt integration，再回退 fragment emission。

## Phase Cleanup Expectations

1. 不提交 `docs/requirements/**`、`docs/plans/**`、`outputs/runtime/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 源码提交前确认只有本轮 runtime / tests 相关代码进入索引。

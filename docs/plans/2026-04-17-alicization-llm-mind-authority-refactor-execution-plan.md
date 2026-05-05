# 2026-04-17 Alicization LLM Mind Authority Refactor Execution Plan

## Internal Grade

`L`

## Wave Structure

### Wave 1: Flow Audit

1. 定位 non-deterministic dialogue lane 在哪些失败路径被 local renderer 接管。
2. 划分：
   - 可以 deterministic 的 lane
   - 必须保留 LLM mind authority 的 lane

### Wave 2: Runtime Authority Refactor

1. refactor `main-chat-active-dialogue-loop.ts`
   - compact invalid / compact exception 不再直接返回 local reply
   - 改成升级回 full LLM runtime
2. refactor `main-chat-background-run.ts`
   - active dialogue try/catch 分支不再把 local fallback 当正常回答
3. refactor `main-chat-timeout-fallback.ts`
   - non-deterministic lane 只返回 minimal infra repair

### Wave 3: Renderer Demotion

1. 把 local renderer 明确降级到 deterministic lane / infra repair only。
2. 避免 greeting / identity / present-state / plain dialogue 再被它当正常回答 surface。

### Wave 4: Regression And Verification

1. 覆盖 compact reject、active-dialogue failure、timeout fallback 分支。
2. 跑 targeted vitest。
3. 跑 typecheck。
4. 跑 lint:fix 并记录状态。

## Ownership Boundaries

1. [main-chat-active-dialogue-loop.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts)
2. [main-chat-background-run.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts)
3. [main-chat-timeout-fallback.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.ts)
4. related `*.test.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts`
4. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
5. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 如果 non-deterministic dialogue turn 仍会在 compact reject 后直接本地代答，不能宣称完成。
2. 如果 deterministic utility lane 被误伤，不能宣称完成。

## Completion Language Rules

1. 可以说“把普通对话失败分支的回答权重新收回给 LLM runtime”。
2. 不可以说“完全移除了所有 fallback”。

## Rollback Rules

1. 若 full runtime escalation 影响 deterministic utility lane，则只回退 lane routing，不回退整体 authority 改造。
2. 若 timeout repair 过弱导致用户完全无反馈，则允许保留最小 repair，但不允许恢复内容性模板回答。

## Phase Cleanup Expectations

1. 不创建新的源码临时文件。
2. `vibe` 产物写入 `docs/` 与 `outputs/runtime/vibe-sessions/...`。

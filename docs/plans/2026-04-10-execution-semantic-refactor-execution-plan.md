# 2026-04-10 Execution Semantic Refactor Execution Plan

## Internal Grade

`L`

原因：需要在同一执行链中做跨模块一致性重构，顺序推进更安全（先统一语义层，再迁移消费层，再测）。

## Wave Structure

### Wave 1: Shared Semantic Runtime

- 重构 `packages/stage-shared/src/alicization-execution-intent.ts`：
  - 建立统一语义信号提取器（request/question/command/artifact/channel）。
  - 保留现有类型接口，替换固定动作词 gate。
  - 输出更可解释的 reason codes。

### Wave 2: Routing Consumer Alignment

- 重构 `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.ts`：
  - 对齐新的 reason codes 与 confidence 策略。
- 重构 `apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.ts`：
  - 移除本地重复词表，改为复用 stage-shared 语义信号。
- 重构 `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.ts`：
  - 用统一语义信号推导 execute/continue-task，而不是动作词 cue。

### Wave 3: Test Migration

- 更新并补充测试：
  - `packages/stage-shared/src/alicization-execution-intent.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts`
  - 受影响时同步调整 `main-chat-execution-surface.test.ts` / `main-chat-session-runtime.test.ts`

### Wave 4: Verification

- 执行定向 Vitest。
- 执行 `pnpm typecheck`。
- 执行 `pnpm lint:fix` 并记录环境/仓库级阻塞。

## Ownership Boundaries

- 本轮允许修改以上语义与路由相关模块及其测试。
- 不改动无关业务域，不触碰用户其他进行中的改动。

## Verification Commands

```bash
pnpm exec vitest run \
  packages/stage-shared/src/alicization-execution-intent.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/task-routing-assessor.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-action-obligation.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts

pnpm typecheck
pnpm lint:fix
```

## Delivery Acceptance Plan

- 以“去固定触发词 + 统一语义层 + 多模块对齐 + 可测”作为验收主线。
- 若 lint 因环境/历史问题失败，需明确归因并给出后续处理建议。

## Completion Language Rules

- “已完成”：语义引擎与消费链已对齐，测试/typecheck通过。
- “建议继续做”：provider 无视 tool choice 时的自动执行旁路、在线学习式语义适配。

## Rollback Rules

- 若语义识别出现明显误触发：
  - 优先下调执行信号阈值策略，保留结构化证据框架。
  - 禁止回滚到原固定动作词白名单。

## Phase Cleanup Expectations

- 输出完整 vibe receipts（含阶段 lineage）。
- 明确列出行为变化与仍存风险点。

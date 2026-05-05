# 2026-04-10 Dialogue Fallback Analysis Execution Plan

## Internal Grade

`L`

原因：单 lane 串行分析更适合本任务。需要先锁定日志证据，再做小范围代码修复，最后验证，不适合并行 fan-out。

## Wave Structure

### Wave 1: Evidence Collection

- 定位 Electron `userData` 实际目录。
- 抽取 2026-04-10 `runtime-debug.log` 中和 timeout / tool routing / visual grounding 相关事件。
- 只读查询 `conversation_turns`、`mind_turn_events`、`executor_events`。

### Wave 2: Root Cause Synthesis

- 区分 timeout、routing miss、provider ignored tool choice 三类路径。
- 对齐代码落点：
  - `packages/stage-shared/src/alicization-execution-intent.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`

### Wave 3: Minimal Fixes

- 扩展执行意图识别的中文动词覆盖，命中“找一下/查一下/列一下/列出/搜一下”。
- 在流式完成阶段增加 required tool guard：
  - 如果 `waitForTools === true`
  - 且 `toolChoice` 已经限制到 executor tools
  - 但整个流没有任何 required tool call
  - 则本轮视为失败，不允许按普通回复落库。

### Wave 4: Verification

- 跑定向 Vitest：
  - `packages/stage-shared/src/alicization-execution-intent.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`
- 跑仓库要求的：
  - `pnpm typecheck`
  - `pnpm lint:fix`

## Ownership Boundaries

- 本轮仅修改：
  - `packages/stage-shared/src/alicization-execution-intent.ts`
  - `packages/stage-shared/src/alicization-execution-intent.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`
- 其他运行时模块只做读取，不改行为。

## Verification Commands

```bash
pnpm exec vitest run packages/stage-shared/src/alicization-execution-intent.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts
pnpm typecheck
pnpm lint:fix
```

## Delivery Acceptance Plan

- 如果日志归因和代码落点一致，且新增测试覆盖了 4 月 10 日日志里的两条关键失败链，则接受本轮最小修复。
- 如果 `pnpm typecheck` 或 `pnpm lint:fix` 失败，必须在最终交付里明确标注。

## Completion Language Rules

- “已修复”只用于：
  - `找一下/查一下/...` 被识别为显式 CLI 执行意图
  - `required tool missing` 被运行时拒绝而不再默默落成自然语言成功
- “建议继续做”用于：
  - provider 忽略 tool choice 时的直接执行旁路
  - task-knot / visible-scene 对显式执行请求的优先级重排
  - CLI 请求的 explicit-routing telemetry

## Rollback Rules

- 如果 required tool guard 导致现有 provider 全量报错，需要回滚到仅记录 debug 但不 hard fail 的策略。
- 如果执行意图扩展误伤 capability inquiry，需要回滚新增中文动词匹配。

## Phase Cleanup Expectations

- 保留本次 session 的 receipts。
- 不触碰用户既有未提交改动。
- 最终总结必须包含：
  - 4 月 10 日的具体 turn 证据
  - 已改内容
  - 尚未改但优先级高的后续项

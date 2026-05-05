# 2026-04-18 Alicization Personality Growth Feedback Loop Execution Plan

## Internal Grade

`L`

## Wave Structure

### Wave 1: Closure Audit

1. 确认已有 proactive / execution / reply outcome closure 已存在。
2. 找出普通对话 reply feedback 缺口。

### Wave 2: Feedback Settlement

1. 新增 ordinary dialogue feedback kind 分类。
2. 新增 ordinary dialogue feedback outcome closure builder。
3. 在 `chat-start` 前增加 settlement hook。
4. 增加 per-card ack 去重。

### Wave 3: Runtime Integration

1. 将反馈 settlement 写入：
   - relationship outcomes
   - reinforcement events
   - memory facts
   - synthesized reflections
2. 确保下一回合 slow variables 会读取这些新记录。

### Wave 4: Verification

1. 跑 outcome reinforcement 单测。
2. 跑 runtime 集成回归。
3. 跑主用户路径回归。
4. 跑 typecheck。
5. 记录 lint 状态。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "ordinary dialogue reply feedback"`
3. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-synthesizer.test.ts apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.test.ts apps/stage-tamagotchi/src/main/services/alicization/answer-compiler.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-timeout-fallback.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
4. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
5. `pnpm lint:fix`

## Rollback Rules

1. 若反馈分类过度激进导致大量误判，则收窄到更显式的 user phrasing，不回退整个闭环。
2. 不为了“学习更多”而牺牲“同一条 assistant reply 只结算一次”的去重约束。

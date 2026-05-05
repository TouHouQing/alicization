# 2026-04-18 Alicization Same-Session Drift And Dialogue Replay Execution Plan

## Internal Grade

`L`

## Wave Structure

### Wave 1: Drift Path Audit

1. 确认 ordinary dialogue feedback closure 已接进 growth tables。
2. 确认 same-session 漂移路径落在哪些 reducer：
   - `host-rhythm-model`
   - `relationship-model`
   - `self-continuity`
   - runtime relationship dynamics writeback

### Wave 2: Same-Session Drift Closure

1. 收口同 session 读取链路，避免 feedback 只是“持久化了但不参与当前人格漂移”。
2. 保证 `hostAttitude / relationshipModel / selfContinuity` 会在当前 session 更明显变化。

### Wave 3: Dialogue Replay Tests

1. 新增长对话 replay 测试夹具。
2. 回放至少两个多轮轨迹：
   - repaired warmth
   - boundary pushback
3. 在测试里断言：
   - guardedness drift
   - companionship drift
   - autonomyRespect drift
   - unfinishedThreadReturn drift

### Wave 4: Verification

1. 跑 growth-chain 相关 vitest。
2. 跑 runtime ordinary dialogue feedback 集成回归。
3. 跑 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`。
4. 跑 root `pnpm lint:fix`，记录仓内其他目录噪音。

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-growth-replay.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/outcome-reinforcement.test.ts apps/stage-tamagotchi/src/main/services/alicization/relationship-model.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-continuity.test.ts apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts apps/stage-tamagotchi/src/main/services/alicization/motive-engine.test.ts apps/stage-tamagotchi/src/main/services/alicization/habit-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "ordinary dialogue reply feedback|dialogue growth replay|same session|reinforcement|recent relationship outcomes|unfinished threads|autonomy|companionship|guardedness"`
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
4. `pnpm lint:fix`

## Rollback Rules

1. 如果 replay 断言证明 same-session drift 仍不明显，优先补强 reducer 读写路径，不回退 ordinary dialogue feedback closure。
2. 如果 root lint 噪音来自无关目录，只记录为仓级阻塞，不把这轮 slice 混同为未完成。

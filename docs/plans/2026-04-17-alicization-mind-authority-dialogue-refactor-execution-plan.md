# 2026-04-17 Alicization Mind Authority Dialogue Refactor Execution Plan

## Internal Grade

`L`

原因：

1. 改动集中在同一条 Alicization dialogue/runtime 链路。
2. 不适合并行改写，因为 `fast-path -> mind-surface -> runtime-governance` 之间强耦合。
3. 当前工作树已经很脏，串行改动更安全。

## Wave Structure

### Wave 1: Authority Audit

1. 确认 normal visible reply 目前在哪些节点被 deterministic prose takeover。
2. 明确三类节点：
   - fast-path local reply authority
   - mind-surface local renderer authority
   - governed fallback takeover authority

### Wave 2: Authority Refactor

1. 在 `main-chat-active-dialogue-loop.ts` 降级 dialogue/self/present-state lane 的 deterministic authorship。
2. 在 `mind-surface-renderer.ts` 收缩 identity / present-state / plain dialogue 的模板化 renderer，让它们只承接 mind cues，而不再写死解释式台词。
3. 在 `packages/stage-shared/src/alicization-mind-fallback.ts` 把 fallback 从“author visible prose”重构成“minimal takeover / infra fallback only”。
4. 在 `runtime-governance.ts` 调整 takeover gate，优先保留 coherent mind-authored reply。

### Wave 3: Regression Proof

1. 新增或改写针对 identity / present-state / critique / dialogue-first 的测试。
2. 验证 stale carry / repair residue 不再触发模板夺权。

### Wave 4: Verification And Cleanup

1. 跑 targeted vitest。
2. 跑 `pnpm typecheck`。
3. 跑 `pnpm lint:fix`。
4. 写 `phase-plan-execute.json`、`cleanup-receipt.json`、`delivery-acceptance-report.json`。

## Ownership Boundaries

1. `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
   - fast-path reply authority and decision logic
2. `apps/stage-tamagotchi/src/main/services/alicization/mind-surface-renderer.ts`
   - local move rendering and mind-surface composition
3. `packages/stage-shared/src/alicization-mind-fallback.ts`
   - shared governed fallback authority
4. `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
   - governed takeover / preservation rules
5. related `*.test.ts`
   - regression coverage

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`
3. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
4. `pnpm lint:fix`

## Delivery Acceptance Plan

1. 如果 identity / present-state / critique 仍出现 deterministic explanation shells，则不能宣称完成。
2. 如果 repair/truth discipline 被削弱到失去约束作用，也不能宣称完成。
3. 只有在“mind authority 保留”与“truth discipline 仍有效”同时成立时，才允许进入交付措辞。

## Completion Language Rules

1. 允许说“收回 visible reply authority 给心智模块”。
2. 不允许说“彻底解决像真人一样对话”。

## Rollback Rules

1. 若重构导致 utility-time / utility-date / execution follow-up 的 deterministic correctness 退化，优先回退该 lane 的行为而不是回退整轮 refactor。
2. 若 takeover gate 修改导致 runtime 接受明显 contaminated reply，优先收紧 preserve 条件，而不是重新打开大面积模板 fallback。

## Phase Cleanup Expectations

1. 不创建额外临时源码文件。
2. `vibe` 产物只写入 `docs/` 与 `outputs/runtime/vibe-sessions/...`。
3. cleanup 阶段必须记录实际验证结果和剩余风险。

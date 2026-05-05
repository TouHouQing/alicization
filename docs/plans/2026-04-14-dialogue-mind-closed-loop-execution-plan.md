# 2026-04-14 Dialogue Mind Closed Loop Execution Plan

## Internal Grade

L

## Wave Structure

1. 建立共享 utility / realtime query parser。
2. 重构 active dialogue fast-path lane 与本地回复渲染。
3. 补测试并验证 main/browser/UI 三端链路。

## Ownership Boundaries

1. Shared parsing:
   `packages/stage-shared/src/*`
2. Main runtime dialogue:
   `apps/stage-tamagotchi/src/main/services/alicization/*`
3. Browser/UI realtime bridge:
   `packages/stage-ui/src/stores/*`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
2. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-realtime.test.ts`
3. `pnpm exec vitest run packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`
4. `pnpm exec vitest run packages/stage-shared/src/alicization-realtime-query-parser.test.ts`
5. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
6. `pnpm -F @proj-alicization/stage-ui typecheck`
7. `pnpm -F @proj-alicization/stage-shared typecheck`

## Rollback Rules

1. 如果共享 parser 引入回归，先保留 API 形状，再回滚调用点接入。
2. 如果 fast-path lane 重构导致工具/执行链退化，保留 deterministic payoff 分支，局部回退 lane 映射。

## Cleanup Expectations

1. 不提交 `docs/plans/**`、`docs/requirements/**`。
2. 不提交 `N.E.K.O/**`、`claude-code-main/**`。
3. 源码提交前重新检查索引，确认只包含本仓库业务代码改动。

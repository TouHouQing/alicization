# Alicization Organic Runtime Refactor Execution Plan

Date: 2026-04-10
Linked requirement: `docs/requirements/2026-04-10-alicization-organic-runtime-refactor.md`
Internal grade: `L`

## Why L

这次是重构主链，但强依赖现有运行时上下文和当前用户工作树，适合在主 lane 串行推进，避免大规模并行写同一批 runtime 文件。

## Wave Structure

### Wave 1: Freeze runtime and route architecture

Ownership:
- `runtime-main-gateway-config.ts`
- `main-chat-start-acceptance.ts`
- `runtime-main-gateway-one-shot.ts`
- `runtime.ts`

Work:
- 引入 card-local remembered route / last healthy route 语义。
- 统一 main gateway route resolution。
- 让 main chat start 与 one-shot 复用同一解析器。

Verification:
- targeted vitest for main gateway config / chat start acceptance

### Wave 2: Refactor visible reply takeover policy

Ownership:
- `packages/stage-shared/src/alicization-mind-fallback.ts`
- `packages/stage-ui/src/composables/alicization-structured-output.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`

Work:
- 拆开 truth discipline 与 visible surface takeover。
- 为“organic direct reply”建立共享判定，减少固定 fallback 接管。
- 只在 repair/conflict/leak 时允许 deterministic fallback 表面接管。

Verification:
- targeted vitest for structured output / runtime governance

### Wave 3: Refactor renderer send route flow

Ownership:
- `packages/stage-ui/src/stores/chat.ts`
- caller surfaces in `apps/*` and `packages/stage-ui/*`

Work:
- SendOptions 显式携带 `providerId`。
- 在 chat orchestrator 内部稳定解析 provider route 和 providerConfig。
- 更新所有主要 ingest 调用点，避免 runtime 只读全局 consciousness 单例。

Verification:
- targeted vitest for chat fallback mapping and route handoff

### Wave 4: Validation and cleanup

Ownership:
- tests
- docs/runtime artifacts

Work:
- 跑 targeted tests
- 跑 `pnpm typecheck`
- 跑 `pnpm lint:fix`
- 记录 cleanup receipt 和 remaining risk

## Verification Commands

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-start-acceptance.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-main-gateway-config.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/composables/alicization-mind-fallback.test.ts`
- `pnpm exec vitest run packages/stage-ui/src/composables/alicization-structured-output.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan

- 如果 targeted tests 表明接管逻辑仍会把自然短答替换成模板句，则不能结束。
- 如果 main gateway route 在 one-shot 或 chat start 任一入口仍会因为 active route 为空而拒绝，则不能结束。
- 如果 typecheck 或 lint 有新增失败，则不能结束。

## Completion Language Rules

- 只在验证完成后使用“已重构完成”。
- 如果只完成主链而未完成全量验证，必须明确写“主链已改，验证未完成”。

## Rollback Rules

- 不用 `git reset --hard`。
- 如果某一步造成接管逻辑大面积回退，优先用局部 patch 撤回该步而不是回滚整个工作树。
- 如果现有用户改动与本次改动直接冲突，立即停止并说明冲突文件与原因。

## Phase Cleanup Expectations

- 为本次 `vibe` 运行写出 skeleton / intent / lineage / cleanup receipts。
- 不留下临时调试文件。
- 如果新增 runtime helper，确保通过现有 index/export 路径暴露，不留下孤儿模块。

# Alicization Digital Life Search Query Controls Surface Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L`
- Rationale: 同一执行面与测试文件的契约增强，串行改动最稳。

## Wave Structure

### Wave 1: Contract Extension
- 扩展 `filesystem_search_files` 参数契约与返回字段。

### Wave 2: Runtime Implementation
- 增加列表归一化与参数压缩 helper。
- 扩展 MCP 参数候选，覆盖异构字段命名。
- 引入客户端后过滤（include/exclude）与路径模式归一化。

### Wave 3: Tests
- 更新搜索测试，断言控制参数透传、结果归一化字段和相对路径输出。

### Wave 4: Verification + Cleanup
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/runtime.test.ts -t "main gateway tool"`
- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
- `pnpm typecheck`
- `pnpm lint:fix`

## Ownership Boundaries
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- `docs/requirements/2026-04-08-alicization-digital-life-search-query-controls-surface.md`
- `docs/plans/2026-04-08-alicization-digital-life-search-query-controls-surface-execution-plan.md`
- `outputs/runtime/vibe-sessions/20260408-140514-digital-life-search-query-controls-surface/*`

## Delivery Acceptance Plan
- 目标测试和 typecheck 通过时接收实现。
- lint 基线问题以 `completed-with-risk` 披露。

## Rollback Rules
- 仅回滚本轮改动文件。
- 不触碰无关脏改动。

## Phase Cleanup Expectations
- 保留命令级证据与残余风险条目。

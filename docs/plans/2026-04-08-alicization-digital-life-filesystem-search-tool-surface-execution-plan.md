# Alicization Digital Life Filesystem Search Tool Surface Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution)
- Rationale: execution-surface 与测试改动高度耦合，串行改动更易控回归。

## Wave Structure

### Wave 1: Surface Extension
- 在主网关执行面新增 `filesystem_search_files`。
- 复用 MCP 候选回退机制，补齐搜索参数形态候选。

### Wave 2: Result Normalization
- 增加结构化匹配结果抽取逻辑。
- 统一匹配计数、输出截断和错误码。

### Wave 3: Prompt Guidance + Tests
- 更新路由系统提示，纳入 `filesystem_search_files` 优先策略。
- 扩展 `main-chat-execution-surface.test.ts` 覆盖注册与 fallback 成功路径。

### Wave 4: Verification + Cleanup
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/runtime.test.ts -t "main gateway tool"`
- `pnpm typecheck`
- `pnpm lint:fix`
- 写入 stage lineage 与 cleanup receipt。

## Ownership Boundaries
- Code write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Artifact scope:
  - `docs/requirements/2026-04-08-alicization-digital-life-filesystem-search-tool-surface.md`
  - `docs/plans/2026-04-08-alicization-digital-life-filesystem-search-tool-surface-execution-plan.md`
  - `outputs/runtime/vibe-sessions/20260408-131025-digital-life-filesystem-search-tool-surface/*`

## Delivery Acceptance Plan
- 目标测试 + typecheck 通过时允许声明实现完成。
- 若 `lint:fix` 暴露仓库级历史问题或外部依赖缺失，则以 `completed-with-risk` 报告。

## Rollback Rules
- 仅回滚本轮新增改动。
- 禁止触碰无关脏改动。

## Phase Cleanup Expectations
- 落地完整 stage 产物与 cleanup receipt，并记录验证证据和残余风险。

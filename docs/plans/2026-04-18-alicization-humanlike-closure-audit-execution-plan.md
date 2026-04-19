# 2026-04-18 Alicization Humanlike Closure Audit Execution Plan

## Execution Summary

冻结一次以“闭环审计”为目标的 L 级 governed 执行：先确认运行时边界与历史工件，再沿主运行时、bridge、memory、autonomy、executor、fallback 逐段核对，最后用测试与代码证据给出能力面分级结论。

## Frozen Inputs

1. Requirement: `docs/requirements/2026-04-18-alicization-humanlike-closure-audit.md`
2. Active branch: `main`
3. Worktree state: dirty
4. Audit focus:
   - personality
   - cognition / truth discipline
   - emotion / relationship
   - memory closure
   - proactive dialogue / execution
   - CLI / tool calling

## Anti-Proxy-Goal-Drift Controls

Prefill from the frozen requirement doc where available. Only diverge with explicit justification.

### Primary Objective

判断跨层闭环是否成立，而不是判断单个模块是否存在。

### Non-Objective Proxy Signals

不以文件数量、测试数量或已有计划数量作为闭环完成的替代指标。

### Validation Material Role

代码链路与测试面优先；历史文档只提供背景。

### Declared Tier

Strict audit

### Intended Scope

主运行时 + bridge + shared contracts + fallback + executor adapters

### Abstraction Layer Target

运行时集成闭环

### Completion State Target

输出已分级的现状判断与优化建议，并附证据。

### Generalization Evidence Plan

同时覆盖主运行时与 browser fallback，避免只看 Electron happy path。

## Internal Grade Decision

L

## Wave Plan

1. 盘点 repo、已有 Alicization requirement/plan、关键运行时与测试入口。
2. 审查主运行时 mind/governance/memory/autonomy/execution 汇总链。
3. 审查 stage-ui bridge、browser fallback、execution engine 与 memory adapter。
4. 跑关键测试，确认闭环是否只存在于单元层还是已有 e2e/assertion。
5. 汇总结论，按 P0/P1/P2 输出优化建议。

## Ownership Boundaries

1. Main runtime:
   `apps/stage-tamagotchi/src/main/services/alicization`
2. Shared transport/contracts:
   `packages/stage-shared/src/alicization-*`
3. Renderer/stores:
   `packages/stage-ui/src/stores/alicization-*`
4. Eventa bridge:
   `apps/stage-tamagotchi/src/shared/eventa.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/epoch2-e2e-closure.test.ts apps/stage-tamagotchi/src/main/services/alicization/epoch3-e2e-closure.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts packages/stage-ui/src/stores/alicization-execution-engine.test.ts packages/stage-ui/src/stores/alicization-epoch1.test.ts`

## Rollback Plan

本轮理论上只新增 governed audit 工件；若后续需要撤回，仅删除本次新增的 requirement / plan / vibe session outputs。

## Phase Cleanup Contract

1. 写入 session receipts
2. 清理临时占位目录
3. 输出 delivery acceptance report，明确哪些结论是“已证实”，哪些是“高概率判断”

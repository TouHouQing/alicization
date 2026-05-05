# 2026-04-19 Alicization Humanlike Memory Implementation Execution Plan

## Execution Summary

以 P0 为先，增量做真人记忆基础设施：

1. schema：episodic event + provenance
2. writes：dialogue/proactive/execution/dream 全部写入事件层
3. recall：从事件层读，并按 thread + affect + relationship + salience 排序
4. runtime/prompt：把 provenance 暴露给 reply/runtime

## Frozen Inputs

1. Requirement: `docs/requirements/2026-04-19-alicization-humanlike-memory-implementation.md`
2. HEAD: `058b2e8b`
3. Existing memory modules already green

## Anti-Proxy-Goal-Drift Controls

### Primary Objective

做真人记忆的底层结构，而不是继续堆碎片表。

### Non-Objective Proxy Signals

1. 新增很多 memory 文件
2. 只是多了 fragments/sourceKind
3. recall 文本更长

### Validation Material Role

要能证明事件被写入、被召回、被 runtime 使用。

### Declared Tier

P0/P1 foundation

### Intended Scope

`db.ts` / `runtime.ts` / `runtime-dream.ts` / `recall-governor.ts` / `runtime-organic-memory-prompt.ts` / `browser bridge`

### Abstraction Layer Target

memory infrastructure + recall integration

### Completion State Target

完成事件图 + provenance + recall 接线。

### Generalization Evidence Plan

证明记忆从写入到召回再到对话使用形成闭环。

## Internal Grade Decision

L

## Wave Plan

1. 定义 episodic event 和 provenance contract。
2. 扩展 DB schema 与 service API。
3. 在 outcome closure / dream / dialogue write paths 写入 episodic events。
4. 升级 recall governor 读取 episodic events。
5. 把 recalled event provenance 接入 organic memory prompt / runtime surface。
6. 跑 memory/runtime tests。

## Ownership Boundaries

1. Shared contracts:
   `packages/stage-shared/src/alicization-transport-contracts.ts`
2. DB and runtime:
   `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-dream.ts`
3. Recall/prompt:
   `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.ts`
   `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`
4. Fallback:
   `packages/stage-ui/src/stores/alicization-browser-bridge.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episodes.test.ts apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/dialogue-memory-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-horizon-memory.test.ts packages/stage-ui/src/stores/alicization-browser-bridge.test.ts`
2. `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Rollback Plan

如果 recall 接线导致对话面回归，先保留 schema/write path，只回退 recall 排序与 prompt surface 接线。

## Phase Cleanup Contract

1. 保留 requirement/plan/receipts
2. 不留下调试日志
3. 明确哪些 P1/P2 仍未完成

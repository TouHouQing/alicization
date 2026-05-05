# 2026-04-19 Alicization Memory Humanlike Audit Execution Plan

## Execution Summary

做一次 L 级记忆系统审计：先梳理主运行时与 fallback 的记忆模块，再按“像真人的记忆”标准判断哪些已经有，哪些只是工具性记忆，哪些仍未闭环。

## Frozen Inputs

1. Requirement: `docs/requirements/2026-04-19-alicization-memory-humanlike-audit.md`
2. HEAD: `75c7b688`
3. Focus:
   - working memory
   - semantic/fact memory
   - autobiographical/episodic memory
   - relationship memory
   - dream/reflection/consolidation
   - fallback parity

## Anti-Proxy-Goal-Drift Controls

### Primary Objective

判断记忆系统是否足以支撑“真人感记忆”，不是只数 memory 文件。

### Non-Objective Proxy Signals

1. memory 文件多
2. tests 多
3. active thoughts / fragments / facts 表很多

### Validation Material Role

代码和测试优先，模块命名次之。

### Declared Tier

Audit

### Intended Scope

主运行时记忆 + renderer memory adapter + browser fallback parity

### Abstraction Layer Target

memory architecture and closure

### Completion State Target

给出当前实现、缺口、以及类人记忆路线图。

### Generalization Evidence Plan

对照“类人记忆”的编码、巩固、召回、遗忘、重构、关系化、时间性几个维度。

## Internal Grade Decision

L

## Wave Plan

1. 盘点记忆相关模块、存储接口和测试。
2. 分析 working / semantic / episodic / autobiographical / relationship / dream 各自职责。
3. 判断哪些闭环已经存在，哪些只停留在工具式记忆。
4. 给出 P0/P1/P2 路线。

## Ownership Boundaries

1. Main runtime memory:
   `apps/stage-tamagotchi/src/main/services/alicization`
2. Renderer/fallback memory:
   `packages/stage-ui/src/stores/alicization-memory.ts`
   `packages/stage-ui/src/stores/alicization-browser-bridge.ts`
3. Shared memory carry:
   `packages/stage-shared/src/alicization-dialogue-memory-carry.ts`

## Verification Commands

1. `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/dialogue-memory-governor.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-horizon-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/autobiographical-self.test.ts apps/stage-tamagotchi/src/main/services/alicization/autobiographical-episodes.test.ts apps/stage-tamagotchi/src/main/services/alicization/reflection-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts packages/stage-ui/src/stores/alicization-memory.ts`

## Rollback Plan

本轮主要是审计工件与报告，不计划大规模代码改动。

## Phase Cleanup Contract

1. 记录当前记忆能力清单
2. 记录缺口和路线
3. 保持工件可追溯

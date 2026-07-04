# Alicization Memory Workbench Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Memory Workbench 产品化为真实健康指标、review 策略持久化、长期记忆分页/搜索、embedding 闭环、persona 候选凝练面板。

**Architecture:** 保留现有 Memory Workbench Eventa/API 作为 UI 唯一入口，在主进程增加小型持久化模块，DB facade 只做组合。长期记忆展示、review 策略、向量索引、persona 候选都从清洗后的长期记忆和 policy overlay 出发，不绕过 WorkingMemory/LongTermMemory owner。

**Tech Stack:** Electron main process, Vue 3 `<script setup>`, Pinia, Eventa, SQLite facade, TypeScript, Vitest, UnoCSS, pnpm workspace filters.

---

## 相关文档

- Spec: `docs/superpowers/specs/2026-07-04-alicization-memory-workbench-productization-design.md`
- 前序 UI 设计: `docs/superpowers/specs/2026-07-03-alicization-memory-dialogue-ui-visible-loop-design.md`
- 长期记忆计划: `docs/superpowers/plans/2026-07-02-alicization-long-term-memory-implementation-plan.md`
- 长期记忆 Phase 2: `docs/superpowers/plans/2026-07-03-alicization-long-term-memory-phase2-implementation-plan.md`

## 文件结构

### 新增文件

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.ts`  
  管理 `long_term_memory_policy_overrides`，提供 source policy upsert/list/merge、pre-admission policy inherit。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts`  
  覆盖 inward-only/no-training 持久化、candidate policy 继承、tombstone 优先级。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.ts`  
  从 transaction、recall metrics、vector index 状态构建 health DTO。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts`  
  覆盖 queue count、recall p95、embedding health 降级。

- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.ts`  
  SQLite 持久向量 store，实现 upsert/search/delete/reindex/health。

- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts`  
  覆盖持久化、model/dimensions 隔离、stale/failed 状态、重启后可查。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts`  
  从 cleaned long-term reflection/reinforcement 构建 Workbench persona candidates，并合并 candidate review 状态。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts`  
  覆盖 candidate 来源、tombstone/no-training 过滤、approve/reject/no-training 持久状态。

### 修改文件

- `apps/stage-tamagotchi/src/shared/eventa.ts`  
  增加 persona candidate 和 embedding reindex DTO/Eventa 合同，扩展 health/list DTO。

- `packages/stage-ui/src/stores/alicization-bridge.ts`  
  同步 renderer bridge 类型。

- `apps/stage-tamagotchi/src/main/services/alicization/db.ts`  
  创建新表；组合 policy、health、persistent vector、persona candidate 模块；修正长期记忆分页/筛选；review 动作真实写回。

- `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`  
  注册新增 reindex/persona handlers，传递 card scope。

- `packages/stage-ui/src/stores/alicization-memory-workbench.ts`  
  增加筛选、cursor、load more、persona candidate、reindex 状态。

- `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`  
  增加长期记忆筛选 UI、分页、health 分区、persona 面板、probe semantic 信息。

- `packages/i18n/src/locales/zh-Hans/settings.yaml`  
  中文文案优先补齐。

- `packages/i18n/src/locales/en/settings.yaml`  
  英文 fallback 补齐，避免 key 缺失。

- 现有测试：
  - `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`
  - `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`
  - `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`

## 执行约束

- 每个任务完成后提交一次 Conventional Commit。
- 不修改 `.serena/project.yml`。
- 不把已有未跟踪 plan 文档混入提交，除非用户明确要求。
- 不把 review 队列候选当作已确认长期记忆。
- 默认 `allowTraining=false`，本阶段 approve persona candidate 也不触发训练。
- 失败必须回到 health/errors，不输出固定人格模板。

---

## Task 1: Eventa 和 Bridge DTO 扩展

**Files:**
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [ ] **Step 1: 写失败测试，锁定新增 DTO 名称**

在 `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts` 增加一条轻量合同测试：

```ts
import type {
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationPersonaCandidateWorkbenchItem,
} from '../../../shared/eventa'

it('exposes productized memory workbench DTO contracts', () => {
  const candidate: AlicizationPersonaCandidateWorkbenchItem = {
    id: 'persona-candidate:reflection-1',
    sourceMemoryIds: ['reflection-1'],
    behaviorLesson: '不要用固定模板遮盖失败。',
    positiveExample: '我先直接说超时了，再继续接住当前问题。',
    negativeExample: '不要把失败包装成正常陪伴。',
    privacyClass: 'personal-redacted',
    status: 'candidate',
    allowTraining: false,
    rejectionReason: null,
    createdAt: 1,
    updatedAt: 1,
  }
  const reindex: AlicizationMemoryEmbeddingReindexResult = {
    scheduled: 1,
    indexed: 0,
    failed: 0,
    modelId: 'local-embedding',
    dimensions: 3,
    errors: [],
  }

  expect(candidate.allowTraining).toBe(false)
  expect(reindex.scheduled).toBe(1)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
```

Expected: FAIL，提示新增类型不存在。

- [ ] **Step 3: 修改 `eventa.ts` 增加 DTO 和 Eventa 合同**

在 Memory Workbench 类型附近增加：

```ts
export type AlicizationPersonaCandidateWorkbenchStatus = 'candidate' | 'approved' | 'rejected' | 'no-training'
export type AlicizationPersonaCandidateWorkbenchDecision = 'approve' | 'reject' | 'no-training'

export interface AlicizationPersonaCandidateWorkbenchItem {
  id: string
  sourceMemoryIds: string[]
  behaviorLesson: string
  positiveExample: string
  negativeExample: string | null
  privacyClass: 'public' | 'personal-redacted'
  status: AlicizationPersonaCandidateWorkbenchStatus
  allowTraining: boolean
  rejectionReason: string | null
  createdAt: number
  updatedAt: number
}

export interface AlicizationPersonaCandidateListPayload extends AlicizationCardScope {
  status?: AlicizationPersonaCandidateWorkbenchStatus | 'all'
  limit?: number
  cursor?: string | null
}

export interface AlicizationPersonaCandidateListResult {
  items: AlicizationPersonaCandidateWorkbenchItem[]
  nextCursor: string | null
}

export interface AlicizationPersonaCandidateActionPayload extends AlicizationCardScope {
  candidateId: string
  decision: AlicizationPersonaCandidateWorkbenchDecision
  reason?: string | null
}

export interface AlicizationMemoryEmbeddingReindexPayload extends AlicizationCardScope {
  source?: string
  sourceIds?: string[]
  modelId?: string
  limit?: number
}

export interface AlicizationMemoryEmbeddingReindexResult {
  scheduled: number
  indexed: number
  failed: number
  modelId: string | null
  dimensions: number | null
  errors: string[]
}
```

在 invoke 合同区域增加：

```ts
export const electronAlicizationMemoryWorkbenchListPersonaCandidates = defineInvokeEventa<AlicizationPersonaCandidateListResult, AlicizationPersonaCandidateListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-persona-candidates')
export const electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction = defineInvokeEventa<AlicizationPersonaCandidateWorkbenchItem | null, AlicizationPersonaCandidateActionPayload>('eventa:invoke:electron:alicization:memory-workbench:apply-persona-candidate-action')
export const electronAlicizationMemoryWorkbenchReindexEmbeddings = defineInvokeEventa<AlicizationMemoryEmbeddingReindexResult, AlicizationMemoryEmbeddingReindexPayload>('eventa:invoke:electron:alicization:memory-workbench:reindex-embeddings')
```

- [ ] **Step 4: 同步 `alicization-bridge.ts` 类型和 bridge 方法**

复制同名 DTO 类型到 `packages/stage-ui/src/stores/alicization-bridge.ts`，并在 bridge interface 增加：

```ts
memoryWorkbenchListPersonaCandidates?: (payload: Omit<AlicizationPersonaCandidateListPayload, 'cardId'>) => Promise<AlicizationPersonaCandidateListResult>
memoryWorkbenchApplyPersonaCandidateAction?: (payload: Omit<AlicizationPersonaCandidateActionPayload, 'cardId'>) => Promise<AlicizationPersonaCandidateWorkbenchItem | null>
memoryWorkbenchReindexEmbeddings?: (payload: Omit<AlicizationMemoryEmbeddingReindexPayload, 'cardId'>) => Promise<AlicizationMemoryEmbeddingReindexResult>
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/shared/eventa.ts packages/stage-ui/src/stores/alicization-bridge.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
git commit -m "feat(alicization): extend memory workbench contracts"
```

---

## Task 2: Policy Overlay Store

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

- [ ] **Step 1: 写 policy store 单测**

创建 `memory-workbench-policy-store.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  deriveMemoryWorkbenchPolicyForSource,
  inheritPreAdmissionMemoryWorkbenchPolicies,
  mergeMemoryWorkbenchPolicy,
} from './memory-workbench-policy-store'

describe('memory workbench policy store helpers', () => {
  it('keeps private sources inward by default and blocks training', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'reflection-1',
      source: 'memory_reflections',
      sensitivity: 'private',
      override: null,
      tombstoned: false,
    })).toMatchObject({
      visibleMode: 'inward-only',
      training: 'blocked',
      tombstoned: false,
    })
  })

  it('lets explicit policy override default visibility while keeping training blocked', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'fact-1',
      source: 'memory_facts',
      sensitivity: 'personal',
      override: {
        sourceId: 'fact-1',
        source: 'memory_facts',
        visibleMode: 'inward-only',
        allowTraining: false,
        reviewState: 'inward-only',
        reason: 'user choice',
        updatedAt: 10,
      },
      tombstoned: false,
    })).toMatchObject({
      visibleMode: 'inward-only',
      training: 'blocked',
    })
  })

  it('treats tombstone as highest priority', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'fact-1',
      source: 'memory_facts',
      sensitivity: 'public',
      override: {
        sourceId: 'fact-1',
        source: 'memory_facts',
        visibleMode: 'explicit',
        allowTraining: true,
        reviewState: 'approved',
        reason: null,
        updatedAt: 10,
      },
      tombstoned: true,
    })).toMatchObject({
      tombstoned: true,
      training: 'blocked',
    })
  })

  it('inherits pre-admission policy to projected source ids', () => {
    const inherited = inheritPreAdmissionMemoryWorkbenchPolicies({
      candidatePolicies: [
        deriveMemoryWorkbenchPolicyForSource({
          sourceId: 'candidate-1',
          source: 'working_memory_long_term_candidate',
          visibleMode: 'inward-only',
          allowTraining: false,
          reviewState: 'inward-only',
          reason: 'review action',
          updatedAt: 10,
        }),
      ],
      candidateSourceIds: ['candidate-1'],
      projectedSources: [
        { sourceId: 'fact-1', source: 'memory_facts' },
        { sourceId: 'reflection-1', source: 'memory_reflections' },
      ],
      now: 20,
    })

    expect(inherited.map(item => `${item.source}:${item.sourceId}:${item.visibleMode}`)).toEqual([
      'memory_facts:fact-1:inward-only',
      'memory_reflections:reflection-1:inward-only',
    ])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts
```

Expected: FAIL，文件不存在。

- [ ] **Step 3: 实现 policy helper 和 runtime 接口**

创建 `memory-workbench-policy-store.ts`：

```ts
import type {
  AlicizationMemoryWorkbenchSensitivity,
  AlicizationMemoryWorkbenchTrainingState,
  AlicizationMemoryWorkbenchVisibility,
} from '../../../shared/eventa'

export type MemoryWorkbenchReviewState = 'none' | 'approved' | 'rejected' | 'tombstoned' | 'inward-only' | 'no-training'

export interface MemoryWorkbenchPolicyOverride {
  sourceId: string
  source: string
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
  updatedAt: number
}

export interface MemoryWorkbenchMergedPolicy {
  visibleMode: AlicizationMemoryWorkbenchVisibility
  training: AlicizationMemoryWorkbenchTrainingState
  tombstoned: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
}

function normalizeText(raw: unknown, maxChars = 240) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function defaultVisibleMode(sensitivity: AlicizationMemoryWorkbenchSensitivity): AlicizationMemoryWorkbenchVisibility {
  return sensitivity === 'private' || sensitivity === 'secret' ? 'inward-only' : 'explicit'
}

export function deriveMemoryWorkbenchPolicyForSource(input: {
  sourceId: string
  source: string
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
  updatedAt: number
}): MemoryWorkbenchPolicyOverride {
  return {
    sourceId: normalizeText(input.sourceId),
    source: normalizeText(input.source, 120),
    visibleMode: input.visibleMode,
    allowTraining: input.allowTraining === true,
    reviewState: input.reviewState,
    reason: normalizeText(input.reason, 240) || null,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : Date.now(),
  }
}

export function mergeMemoryWorkbenchPolicy(input: {
  sourceId: string
  source: string
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  override: MemoryWorkbenchPolicyOverride | null
  tombstoned: boolean
}): MemoryWorkbenchMergedPolicy {
  if (input.tombstoned) {
    return {
      visibleMode: 'inward-only',
      training: 'blocked',
      tombstoned: true,
      reviewState: 'tombstoned',
      reason: input.override?.reason ?? 'tombstoned',
    }
  }

  return {
    visibleMode: input.override?.visibleMode ?? defaultVisibleMode(input.sensitivity),
    training: input.override?.allowTraining ? 'allowed' : 'blocked',
    tombstoned: false,
    reviewState: input.override?.reviewState ?? 'none',
    reason: input.override?.reason ?? null,
  }
}

export function inheritPreAdmissionMemoryWorkbenchPolicies(input: {
  candidatePolicies: MemoryWorkbenchPolicyOverride[]
  candidateSourceIds: string[]
  projectedSources: Array<{ sourceId: string, source: string }>
  now: number
}): MemoryWorkbenchPolicyOverride[] {
  const candidateIds = new Set(input.candidateSourceIds.map(id => normalizeText(id)).filter(Boolean))
  const sourcePolicy = input.candidatePolicies.find(policy => candidateIds.has(policy.sourceId))
  if (!sourcePolicy)
    return []

  return input.projectedSources
    .map(source => deriveMemoryWorkbenchPolicyForSource({
      sourceId: source.sourceId,
      source: source.source,
      visibleMode: sourcePolicy.visibleMode,
      allowTraining: sourcePolicy.allowTraining,
      reviewState: sourcePolicy.reviewState,
      reason: sourcePolicy.reason,
      updatedAt: input.now,
    }))
    .filter(policy => policy.sourceId && policy.source)
}
```

随后在同文件继续追加 `createMemoryWorkbenchPolicyStoreRuntime`，使用注入的 `database/run/get/all/enqueueWrite/runInTransaction/now` 实现：

```ts
export interface MemoryWorkbenchPolicyStoreRuntime {
  upsertPolicyOverride: (input: {
    cardId: string
    sourceId: string
    source: string
    visibleMode: AlicizationMemoryWorkbenchVisibility
    allowTraining: boolean
    reviewState: MemoryWorkbenchReviewState
    reason?: string | null
  }) => Promise<MemoryWorkbenchPolicyOverride>
  listPolicyOverrides: (input: { cardId: string, sourceIds?: string[] }) => Promise<MemoryWorkbenchPolicyOverride[]>
  inheritCandidatePolicies: (input: {
    cardId: string
    candidateSourceIds: string[]
    projectedSources: Array<{ sourceId: string, source: string }>
  }) => Promise<MemoryWorkbenchPolicyOverride[]>
}
```

Implementation requirements:

- `upsertPolicyOverride` 写 `long_term_memory_policy_overrides`。
- `listPolicyOverrides` 允许按 cardId 和 sourceIds 读取。
- `inheritCandidatePolicies` 读取 `source='working_memory_long_term_candidate'` 的 candidate policy 并写入 projected source。

- [ ] **Step 4: 在 `db.ts` 初始化表和 runtime**

在 `initialize` 的 tombstone 表之后创建：

```sql
CREATE TABLE IF NOT EXISTS long_term_memory_policy_overrides (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source TEXT NOT NULL,
  visible_mode TEXT NOT NULL,
  allow_training INTEGER NOT NULL,
  review_state TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(card_id, source_id, source)
)
```

并创建 spec 中两个索引。

在 runtime 创建区域实例化 `memoryWorkbenchPolicyStore`。

- [ ] **Step 5: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts
git commit -m "feat(alicization): persist memory workbench policy overrides"
```

---

## Task 3: Review 动作真实写回策略

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-review-queue.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`

- [ ] **Step 1: 写 failing regression**

在 `memory-workbench-dialogue-loop.test.ts` 增加测试：

```ts
it('persists inward-only and no-training review actions instead of returning a transient item', async () => {
  const db = await setupAlicizationDb(await createSandboxUserDataPath())
  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: 'card-1',
    sessionId: 'session-1',
    items: [{
      id: 'candidate-1',
      kind: 'correction',
      summary: '用户不想要固定模板回复。',
      reason: 'user correction',
      evidenceSnippets: ['不要固定模板回复'],
      salience: 0.9,
      sensitivity: 'personal',
      confidence: 0.9,
      allowTraining: false,
      createdAt: 1,
    }],
  })
  await db.drainWorkingMemoryLongTermQueue(4)
  const review = await db.listMemoryWorkbenchReviewItems({ cardId: 'card-1', limit: 8 })
  expect(review).toHaveLength(1)

  await db.applyMemoryWorkbenchReviewAction({
    cardId: 'card-1',
    reviewItemId: review[0]!.id,
    decision: 'inward-only',
  })
  await db.applyMemoryWorkbenchReviewAction({
    cardId: 'card-1',
    reviewItemId: review[0]!.id,
    decision: 'no-training',
  })

  const after = await db.listMemoryWorkbenchReviewItems({ cardId: 'card-1', limit: 8 })
  expect(after[0]).toMatchObject({
    visibleMode: 'inward-only',
    allowTraining: false,
  })
})
```

如果 test helper 名称不同，使用现有测试文件里的 DB 创建 helper。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected: FAIL，当前 `inward-only` / `no-training` 没有持久效果。

- [ ] **Step 3: 修改 `applyMemoryWorkbenchReviewAction`**

实现规则：

```ts
if (input.decision === 'inward-only' || input.decision === 'no-training') {
  const item = (await listMemoryWorkbenchReviewItems({ cardId: input.cardId, limit: 128 }))
    .find(row => row.id === input.reviewItemId)
  if (!item)
    return null

  const sourceIds = item.sourceMemoryIds.length > 0
    ? item.sourceMemoryIds
    : [item.transactionId]
  for (const sourceId of sourceIds) {
    await memoryWorkbenchPolicyStore.upsertPolicyOverride({
      cardId: input.cardId,
      sourceId,
      source: 'working_memory_long_term_candidate',
      visibleMode: input.decision === 'inward-only' ? 'inward-only' : item.visibleMode,
      allowTraining: false,
      reviewState: input.decision,
      reason: input.reason,
    })
  }
  return {
    ...item,
    visibleMode: input.decision === 'inward-only' ? 'inward-only' : item.visibleMode,
    allowTraining: false,
  }
}
```

同时让 `listLongTermMemoryReviewItems` 或 projection 阶段合并 candidate policy override。

- [ ] **Step 4: tombstone review item 写 candidate source tombstone**

在 tombstone 决策后，对 review item 的 `sourceMemoryIds` 调用 `tombstoneLongTermMemorySources`，reason 使用 `input.reason ?? 'user-tombstoned-review-item'`。

- [ ] **Step 5: approve 后继承 pre-admission policy**

在 `drainWorkingMemoryLongTermQueue` 投影成功并持久化 facts/reflections/episodes/reinforcements 后，收集 projections source：

```ts
const projectedSources = [
  ...projections.memoryFacts.map(item => ({ sourceId: item.id, source: 'memory_facts' })),
  ...projections.memoryReflections.map(item => ({ sourceId: item.id, source: 'memory_reflections' })),
  ...projections.episodicEvents.map(item => ({ sourceId: item.id, source: 'episodic_events' })),
]
await memoryWorkbenchPolicyStore.inheritCandidatePolicies({
  cardId: cleanedTransaction.cardId,
  candidateSourceIds: [
    cleanedTransaction.cleanedCandidate.id,
    cleanedTransaction.queueItemId,
  ],
  projectedSources,
})
```

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-review-queue.test.ts
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-review-queue.test.ts
git commit -m "feat(alicization): persist memory review policy actions"
```

---

## Task 4: Health Runtime 和真实 Queue/Recall 指标

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

- [ ] **Step 1: 写 health helper 测试**

创建 `memory-workbench-health.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  calculateMemoryWorkbenchP95Latency,
  deriveMemoryWorkbenchStatus,
  summarizeMemoryWorkbenchQueueRows,
} from './memory-workbench-health'

describe('memory workbench health', () => {
  it('summarizes queue statuses into workbench health counters', () => {
    expect(summarizeMemoryWorkbenchQueueRows([
      { status: 'pending' },
      { status: 'needs-user-review' },
      { status: 'applied' },
      { status: 'dead-lettered' },
      { status: 'rejected' },
    ])).toEqual({
      pending: 1,
      review: 1,
      applied: 1,
      failed: 1,
      deadLettered: 1,
    })
  })

  it('calculates p95 latency using nearest-rank semantics', () => {
    expect(calculateMemoryWorkbenchP95Latency([10, 20, 30, 40, 50])).toBe(50)
  })

  it('marks health degraded when embedding is not configured or errors exist', () => {
    expect(deriveMemoryWorkbenchStatus({
      errors: [],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('ok')
    expect(deriveMemoryWorkbenchStatus({
      errors: ['recall failed'],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('degraded')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts
```

Expected: FAIL，文件不存在。

- [ ] **Step 3: 实现 health helpers 和 runtime interface**

创建 `memory-workbench-health.ts`，至少导出：

```ts
export function summarizeMemoryWorkbenchQueueRows(rows: Array<{ status: string }>) {
  return rows.reduce((summary, row) => {
    if (row.status === 'pending' || row.status === 'admitted')
      summary.pending += 1
    else if (row.status === 'needs-user-review')
      summary.review += 1
    else if (row.status === 'applied')
      summary.applied += 1
    else if (row.status === 'failed')
      summary.failed += 1
    else if (row.status === 'dead-lettered' || row.status === 'rejected') {
      summary.failed += 1
      summary.deadLettered += row.status === 'dead-lettered' ? 1 : 0
    }
    return summary
  }, { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 })
}

export function calculateMemoryWorkbenchP95Latency(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (sorted.length === 0)
    return null
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1] ?? null
}

export function deriveMemoryWorkbenchStatus(input: {
  errors: string[]
  queueFailed: number
  embeddingConfigured: boolean
}) {
  if (input.errors.length > 0 || input.queueFailed > 0)
    return 'degraded' as const
  return 'ok' as const
}
```

再提供 DB runtime，用 SQL 实现：

- `getQueueHealth(cardId)` 查询 `working_memory_long_term_transactions`。
- `appendRecallMetric(...)` 写 `memory_workbench_recall_metrics`。
- `getRecallHealth(cardId)` 读取最近 50 条计算 last/p95。

- [ ] **Step 4: 在 `db.ts` 创建 metrics 表并替换占位 health**

创建 `memory_workbench_recall_metrics` 表和索引：

```sql
CREATE INDEX IF NOT EXISTS idx_memory_workbench_recall_metrics_card_created
ON memory_workbench_recall_metrics(card_id, created_at DESC)
```

替换：

- `getMemoryWorkbenchQueueHealth`
- `getMemoryWorkbenchRecallHealth`

在 `runMemoryWorkbenchRecallProbe` 成功和 catch 分支都写 metric。

- [ ] **Step 5: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts
git commit -m "feat(alicization): report real memory workbench health"
```

---

## Task 5: 长期记忆真实分页和筛选

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [ ] **Step 1: 写 list pagination regression**

在 `memory-workbench.test.ts` 增加 helper-level 测试，若 DB helper 已存在则使用真实 DB；否则先测 cursor helper：

```ts
it('returns a stable next cursor for long-term memory workbench list results', async () => {
  const db = await setupAlicizationDb(await createSandboxUserDataPath())
  await db.upsertMemoryFacts([
    { id: 'fact-1', subject: '用户', predicate: 'likes', object: '游戏', confidence: 0.9, source: 'test', createdAt: 1, updatedAt: 30 },
    { id: 'fact-2', subject: '用户', predicate: 'prefers', object: '自然回复', confidence: 0.9, source: 'test', createdAt: 1, updatedAt: 20 },
    { id: 'fact-3', subject: '用户', predicate: 'rejects', object: '固定模板', confidence: 0.9, source: 'test', createdAt: 1, updatedAt: 10 },
  ], 'rule')

  const first = await db.listMemoryWorkbenchLongTermItems({ cardId: 'card-1', limit: 2 })
  expect(first.items).toHaveLength(2)
  expect(first.nextCursor).toBeTruthy()

  const second = await db.listMemoryWorkbenchLongTermItems({ cardId: 'card-1', limit: 2, cursor: first.nextCursor })
  expect(second.items.map(item => item.id)).toContain('fact-3')
})
```

调整 fact shape 以匹配现有 `upsertMemoryFacts` 类型。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
```

Expected: FAIL，`nextCursor` 当前为 null。

- [ ] **Step 3: 实现 cursor helpers**

在 `db.ts` 或拆出的本地 helper 中实现：

```ts
function encodeMemoryWorkbenchCursor(input: { updatedAt: number, id: string }) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url')
}

function decodeMemoryWorkbenchCursor(raw: string | null | undefined) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { updatedAt?: unknown, id?: unknown }
    if (!Number.isFinite(parsed.updatedAt) || typeof parsed.id !== 'string' || !parsed.id.trim())
      return null
    return { updatedAt: Number(parsed.updatedAt), id: parsed.id.trim() }
  }
  catch {
    return null
  }
}
```

- [ ] **Step 4: 修改 `listMemoryWorkbenchLongTermItems`**

实现方式：

1. 仍复用现有 facts/reflections/episodes/consolidations mappers。
2. 每个 source 获取 `safeLimit * 6`，避免初版写复杂 UNION。
3. 合并 policy override 和 tombstone。
4. 执行 filters。
5. 排序 `updatedAt DESC, id ASC`。
6. 应用 cursor：

```ts
const cursor = decodeMemoryWorkbenchCursor(input.cursor)
const afterCursor = cursor
  ? sorted.filter(item => item.updatedAt < cursor.updatedAt || (item.updatedAt === cursor.updatedAt && item.id > cursor.id))
  : sorted
const page = afterCursor.slice(0, safeLimit)
const next = afterCursor.length > safeLimit ? page[page.length - 1] : null
```

7. `nextCursor = next ? encodeMemoryWorkbenchCursor({ updatedAt: next.updatedAt, id: next.id }) : null`。

Note: 这一版仍是多源内存合并，但必须实现真实 cursor 和 filters；后续可再优化 SQL UNION。

- [ ] **Step 5: 搜索和筛选合并 policy**

确保：

- query 匹配 summary/evidence/sourceIds/source。
- visibility 来自 policy merge。
- training 来自 policy merge。
- tombstoned 默认过滤。

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
git commit -m "feat(alicization): paginate memory workbench long-term list"
```

---

## Task 6: Renderer Store 分页、筛选和 Persona/Reindex 状态

**Files:**
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`

- [ ] **Step 1: 写 store 测试**

在 store test 增加：

```ts
it('resets long-term cursor when filters change and appends when loading more', async () => {
  const store = useAlicizationMemoryWorkbenchStore()
  mockBridge.memoryWorkbenchListLongTerm = vi.fn()
    .mockResolvedValueOnce({ items: [{ id: 'a' }], nextCursor: 'cursor-a' })
    .mockResolvedValueOnce({ items: [{ id: 'b' }], nextCursor: null })

  await store.refreshLongTerm({ query: '游戏' })
  expect(store.longTermItems.map(item => item.id)).toEqual(['a'])
  expect(store.longTermNextCursor).toBe('cursor-a')

  await store.loadMoreLongTerm()
  expect(store.longTermItems.map(item => item.id)).toEqual(['a', 'b'])
})
```

调整 mock item 到完整 `AlicizationMemoryWorkbenchItem` shape。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
```

Expected: FAIL，store 无 cursor/filter。

- [ ] **Step 3: 修改 store state**

增加：

```ts
const longTermFilters = ref({
  query: '',
  kind: 'all' as const,
  sensitivity: 'all' as const,
  visibility: 'all' as const,
  training: 'all' as const,
  source: '',
})
const longTermNextCursor = ref<string | null>(null)
const personaCandidates = ref<AlicizationPersonaCandidateWorkbenchItem[]>([])
const personaNextCursor = ref<string | null>(null)
const personaLoading = ref(false)
const reindexLoading = ref(false)
const reindexResult = ref<AlicizationMemoryEmbeddingReindexResult | null>(null)
```

- [ ] **Step 4: 修改 actions**

实现：

- `refreshLongTerm(filters?)`: 合并 filters，cursor=null，覆盖 items。
- `loadMoreLongTerm()`: 使用 `longTermNextCursor`，追加 items。
- `refreshPersonaCandidates(status?)`
- `applyPersonaCandidateAction(candidateId, decision)`
- `reindexEmbeddings(payload?)`

所有 action catch 使用 `errorMessageFrom(error)`。

- [ ] **Step 5: 导出新 state/actions**

return 中导出新增字段。

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/stores/alicization-memory-workbench.ts packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
git commit -m "feat(alicization): add memory workbench renderer pagination state"
```

---

## Task 7: 长期记忆筛选 UI 和 Health 分区

**Files:**
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [ ] **Step 1: 写页面静态测试**

在 page test 增加：

```ts
it('renders productized long-term filters and health sections', () => {
  const source = readFileSync(resolve(__dirname, 'index.vue'), 'utf8')
  expect(source).toContain('longTermFilters')
  expect(source).toContain('loadMoreLongTerm')
  expect(source).toContain('settings.pages.memory.workbench.fields.semantic_channel')
  expect(source).toContain('settings.pages.memory.workbench.fields.queue_health')
  expect(source).toContain('settings.pages.memory.workbench.fields.embedding_health')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 更新 i18n**

`zh-Hans/settings.yaml` 在 workbench actions 增加：

```yaml
        load_more: 加载更多
        reindex_embeddings: 重建向量索引
        search: 搜索
```

fields 增加：

```yaml
        semantic_channel: 语义召回
        queue_health: 队列健康
        recall_health: 召回健康
        embedding_health: 向量健康
        policy: 策略
        source: 来源
        updated_at: 更新时间
        confidence: 置信度
        salience: 重要度
```

`en/settings.yaml` 加对应英文。

- [ ] **Step 4: 更新 long-term tab UI**

在 tab 顶部增加：

- input `v-model="longTermFilters.query"`
- select kind/sensitivity/visibility/training
- source input
- search button 调 `store.refreshLongTerm()`
- reset button 清 filters
- load more button 调 `store.loadMoreLongTerm()`

不要让控件挤爆移动端：用 `grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6`。

- [ ] **Step 5: 更新 health tab**

替换 raw JSON 主视图为四个 section：

- Queue health。
- Recall health。
- Embedding health。
- Errors。

保留 `<details>` raw JSON。

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts packages/i18n/src/locales/zh-Hans/settings.yaml packages/i18n/src/locales/en/settings.yaml
git commit -m "feat(alicization): add memory workbench filters and health UI"
```

---

## Task 8: Persistent Vector Store

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`

- [ ] **Step 1: 写 persistent vector store 测试**

创建测试：

```ts
import { describe, expect, it } from 'vitest'
import { createPersistentLongTermMemoryVectorStore } from './long-term-memory-persistent-vector-store'
import { setupAlicizationDb } from './db'

describe('persistent long-term memory vector store', () => {
  it('keeps vector spaces isolated by model id and dimensions', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    const store = createPersistentLongTermMemoryVectorStore(db)
    await store.upsertVectors([{
      id: 'vector-1',
      cardId: 'card-1',
      sourceId: 'fact-1',
      source: 'memory_facts',
      text: '用户想打游戏放松。',
      vector: [1, 0, 0],
      modelId: 'model-a',
      dimensions: 3,
      updatedAt: 10,
      metadata: {},
    }])

    expect(await store.searchVectors([1, 0, 0], {
      cardId: 'card-1',
      modelId: 'model-a',
      dimensions: 3,
      limit: 4,
    })).toHaveLength(1)
    expect(await store.searchVectors([1, 0], {
      cardId: 'card-1',
      modelId: 'model-b',
      dimensions: 2,
      limit: 4,
    })).toHaveLength(0)
  })
})
```

使用现有 DB tests 里的 `setupAlicizationDb + createSandboxUserDataPath` 风格；不要引入真实 Electron runtime。

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 persistent vector store**

接口兼容现有 `LongTermMemoryVectorStore`，但 record 增加 `cardId`。实现：

- `initialize()`
- `upsertVectors(records)`
- `searchVectors(queryVector, filters)`
- `deleteVectorsBySource({ cardId, sourceIds })`
- `reindexByModel({ cardId, modelId })`
- `getHealth({ cardId, activeModelId, dimensions })`

向量序列化：

```ts
function encodeVector(vector: number[]) {
  return Buffer.from(new Float32Array(vector).buffer)
}

function decodeVector(blob: Buffer, dimensions: number) {
  const array = new Float32Array(blob.buffer, blob.byteOffset, Math.floor(blob.byteLength / 4))
  return Array.from(array).slice(0, dimensions)
}
```

SQLite 不可用 Buffer 时，使用 `Uint8Array`。

- [ ] **Step 4: 在 `db.ts` 创建 vector 表并实例化 store**

创建 spec 中的 `long_term_memory_vectors` 表和索引。

替换 `getMemoryWorkbenchEmbeddingHealth`，从 vector store health 返回：

- providerConfigured
- modelId
- dimensions
- reindexRequired

第一版 provider 为空时返回 configured false，但不报错。

- [ ] **Step 5: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-vector-store.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts
git commit -m "feat(alicization): persist long-term memory vectors"
```

---

## Task 9: Embedding Reindex API 和 Recall Probe Semantic Channel

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`

- [ ] **Step 1: 写 reindex unavailable 测试**

增加测试：

```ts
it('reports embedding reindex as unavailable when no provider is configured', async () => {
  const db = await setupAlicizationDb(await createSandboxUserDataPath())
  const result = await db.reindexMemoryWorkbenchEmbeddings({
    cardId: 'card-1',
    limit: 4,
  })
  expect(result).toMatchObject({
    scheduled: 0,
    indexed: 0,
    failed: 0,
    modelId: null,
    dimensions: null,
  })
  expect(result.errors.join(' ')).toContain('embedding provider')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected: FAIL，方法不存在。

- [ ] **Step 3: DB facade 增加 `reindexMemoryWorkbenchEmbeddings`**

实现：

- provider 为空：返回 scheduled/indexed/failed 0 和错误。
- provider 存在：从 `listMemoryWorkbenchLongTermItems({ limit })` 获取 source text。
- 调用 `safeEmbedLongTermMemoryTexts`。
- upsert 到 persistent vector store。
- 失败写 errors。

- [ ] **Step 4: 注册 Eventa handler**

在 `runtime-invoke-handlers-memory.ts` import 新 Eventa：

```ts
electronAlicizationMemoryWorkbenchReindexEmbeddings
```

注册：

```ts
registerInvokeHandler(electronAlicizationMemoryWorkbenchReindexEmbeddings, async payload => await withCardScope(payload.cardId, async () => await getAlicizationDb().reindexMemoryWorkbenchEmbeddings({
  cardId: cardIdFrom(payload),
  source: sanitizeText(payload.source, '') || undefined,
  sourceIds: Array.isArray(payload.sourceIds) ? payload.sourceIds.map(id => sanitizeText(id)).filter(Boolean) : undefined,
  modelId: sanitizeText(payload.modelId, '') || undefined,
  limit: payload.limit,
})))
```

- [ ] **Step 5: Recall probe 写 semantic availability**

扩展 `AlicizationMemoryRecallProbeResult` DTO，增加：

```ts
semantic: {
  available: boolean
  modelId: string | null
  dimensions: number | null
  error: string | null
}
```

在 `runMemoryWorkbenchRecallProbe` 中填充当前 embedding health。

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/shared/eventa.ts packages/stage-ui/src/stores/alicization-bridge.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
git commit -m "feat(alicization): expose embedding reindex for memory workbench"
```

---

## Task 10: Persona Candidate Backend

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`

- [ ] **Step 1: 写 persona candidate 测试**

创建：

```ts
import { describe, expect, it } from 'vitest'
import { mergePersonaCandidateReviewState } from './memory-workbench-persona-candidates'

describe('memory workbench persona candidates', () => {
  it('keeps training blocked until candidate is explicitly approved', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: null,
      now: 10,
    })).toMatchObject({
      status: 'candidate',
      allowTraining: false,
    })
  })

  it('persists no-training as blocked candidate state', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: {
        candidateId: 'persona-candidate:reflection-1',
        status: 'no-training',
        allowTraining: false,
        reason: 'user blocked',
        updatedAt: 20,
      },
      now: 30,
    })).toMatchObject({
      status: 'no-training',
      allowTraining: false,
      rejectionReason: 'user blocked',
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现 persona candidate runtime**

创建 `memory-workbench-persona-candidates.ts`：

- import `buildPersonaTrainingCandidatesFromLongTermMemory`。
- export `mergePersonaCandidateReviewState`。
- runtime 方法：
  - `listPersonaCandidates({ cardId, status, limit, cursor })`
  - `applyPersonaCandidateAction({ cardId, candidateId, decision, reason })`

DB 来源：

- `memoryRelationshipRuntime.listMemoryReflections({ cardId, limit: 200 })`
- `memoryRelationshipRuntime.listPersonaReinforcementEvents({ cardId, limit: 200 })`
- tombstone source ids。
- policy overrides no-training。
- `persona_training_candidate_reviews` review rows。

- [ ] **Step 4: 在 `db.ts` 创建 candidate review 表**

创建 spec 中的 `persona_training_candidate_reviews` 表和索引。

DB facade 暴露：

```ts
listMemoryWorkbenchPersonaCandidates
applyMemoryWorkbenchPersonaCandidateAction
```

- [ ] **Step 5: 注册 Eventa handlers**

在 `runtime-invoke-handlers-memory.ts` 注册：

- `electronAlicizationMemoryWorkbenchListPersonaCandidates`
- `electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction`

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/persona-training-candidate.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts
git commit -m "feat(alicization): expose persona memory candidates"
```

---

## Task 11: Persona UI 和 Reindex UI

**Files:**
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [ ] **Step 1: 写页面测试**

在 page test 增加：

```ts
it('renders persona candidate panel and embedding reindex action', () => {
  const source = readFileSync(resolve(__dirname, 'index.vue'), 'utf8')
  expect(source).toContain('personaCandidates')
  expect(source).toContain('applyPersonaCandidateAction')
  expect(source).toContain('reindexEmbeddings')
  expect(source).toContain('settings.pages.memory.workbench.fields.behavior_lesson')
  expect(source).toContain('settings.pages.memory.workbench.actions.reindex_embeddings')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: FAIL。

- [ ] **Step 3: i18n 增加 persona 字段**

`zh-Hans/settings.yaml`:

```yaml
        behavior_lesson: 行为规则
        positive_example: 正例
        negative_example: 反例
        privacy_class: 隐私类别
        source_ids: 来源 ID
        candidate_status: 候选状态
```

actions:

```yaml
        approve_candidate: 批准候选
        reject_candidate: 拒绝候选
```

英文补同名 key。

- [ ] **Step 4: persona tab UI**

替换占位 section：

- 空状态：`empty_persona`。
- 列表展示 behavior lesson / positive / negative / privacy / source ids / status。
- 按钮：
  - approve -> `store.applyPersonaCandidateAction(item.id, 'approve')`
  - reject -> `store.applyPersonaCandidateAction(item.id, 'reject')`
  - no-training -> `store.applyPersonaCandidateAction(item.id, 'no-training')`

onMounted 时调用 `store.refreshPersonaCandidates()`，或在切换到 persona tab 时懒加载。

- [ ] **Step 5: health tab 加 reindex 按钮**

Embedding health section 中加入：

```vue
<Button
  :label="t('settings.pages.memory.workbench.actions.reindex_embeddings')"
  icon="i-solar:refresh-bold-duotone"
  size="sm"
  :loading="reindexLoading"
  @click="store.reindexEmbeddings()"
/>
```

显示 `reindexResult`。

- [ ] **Step 6: 运行测试**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts packages/i18n/src/locales/zh-Hans/settings.yaml packages/i18n/src/locales/en/settings.yaml
git commit -m "feat(alicization): add persona candidates to memory workbench"
```

---

## Task 12: 端到端回归和产品化验收

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`

- [ ] **Step 1: 增加端到端测试用例**

在 `memory-workbench-dialogue-loop.test.ts` 增加：

```ts
it('keeps memory workbench product loop visible from review policy to recall and persona candidates', async () => {
  const db = await setupAlicizationDb(await createSandboxUserDataPath())
  await db.upsertMemoryReflections([{
    id: 'reflection-template',
    cardId: 'card-1',
    sourceKind: 'working-memory-owner',
    targetScope: 'dialogue',
    summary: '用户不想要固定模板回复。',
    lesson: '回复应该来自 Alicization 自身人格，不要用固定安抚模板。',
    status: 'confirmed',
    confidence: 0.9,
    createdAt: 1,
    updatedAt: 1,
  }])

  const longTerm = await db.listMemoryWorkbenchLongTermItems({
    cardId: 'card-1',
    query: '固定模板',
    limit: 10,
  })
  expect(longTerm.items.some(item => item.summary.includes('固定模板'))).toBe(true)

  const persona = await db.listMemoryWorkbenchPersonaCandidates({
    cardId: 'card-1',
    limit: 10,
  })
  expect(persona.items.some(item => item.behaviorLesson.includes('固定'))).toBe(true)

  const health = await db.getMemoryWorkbenchQueueHealth({ cardId: 'card-1' })
  expect(health).toHaveProperty('pending')
})
```

调整 `upsertMemoryReflections` shape 到现有 runtime 类型。

- [ ] **Step 2: 运行 focused tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: PASS。

- [ ] **Step 3: 运行类型检查**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS。

- [ ] **Step 4: 可选 lint fix**

Run:

```bash
pnpm lint:fix
```

Expected: PASS 或只出现与本任务无关的既有问题。若 lint 修改无关文件，仔细检查并只提交相关变更。

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts packages/stage-ui/src/stores/alicization-memory-workbench.test.ts apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
git commit -m "test(alicization): cover memory workbench product loop"
```

---

## Final Verification

- [ ] **Step 1: 检查工作区**

Run:

```bash
git status --short
```

Expected: 只剩用户已有的无关改动，或工作区干净。

- [ ] **Step 2: 全量目标验证**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-policy-store.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-health.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS。

- [ ] **Step 3: 最终提交或汇报**

如果最后还有未提交的相关修改：

```bash
git add <related-files>
git commit -m "feat(alicization): productize memory workbench"
```

如果 hooks 触发与本任务无关的 workspace build/install 故障，记录具体失败命令和错误摘要；纯文档或已验证代码可在确认暂存范围后使用 `--no-verify`，但不要用它绕过真实测试失败。

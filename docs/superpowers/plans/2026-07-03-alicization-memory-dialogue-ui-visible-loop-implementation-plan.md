# Alicization 记忆对话可视闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 WorkingMemory 短期记忆、LongTermMemory 长期记忆、review/tombstone/persona candidate 链路真正进入用户对话，并提供中文优先、用户可见、可纠正、可删除、可测试的记忆中心 UI。

**Architecture:** 先在主进程建立 `MemoryWorkbench` Runtime API，统一暴露短期记忆快照、长期记忆列表、审核队列、召回测试和健康状态；renderer 只通过 Eventa bridge 和 Pinia store 访问该 API。UI 新建独立 `settings/memory` 页面，保留现有 devtools 记忆诊断组件作为诊断面，不把普通用户记忆管理继续塞进 `performance-visualizer`。

**Tech Stack:** TypeScript, Electron main process, Eventa invoke contracts, SQLite-backed Alicization DB runtime, Vue 3 `<script setup>`, Pinia, VueUse, UnoCSS, Vitest, pnpm workspace filters.

---

## 规格来源

- 设计文档：`docs/superpowers/specs/2026-07-03-alicization-memory-dialogue-ui-visible-loop-design.md`
- 顶层约束：`AGENTS.md`
- 当前阶段：Phase 1 Local Digital Life，优先保证人格连续、记忆连续、透明失败、桌面 runtime 闭环。

## 当前 UI 可视状态盘点

执行本计划前必须承认现有 UI 状态，避免重复造入口。

### 已存在但不等于新记忆中心的 UI / Store

- `packages/stage-pages/src/pages/settings/airi-card/components/AlicizationOrganicMemoryPanel.vue`
  - 现状：展示 `organic memory`、active thoughts、subconscious fragments。
  - 处理策略：保留，不删除；它属于角色卡/organic memory 只读展示，不承担长期记忆审核、tombstone、召回测试。
- `packages/stage-pages/src/pages/devtools/mind-replay.vue`
  - 现状：开发者 mind replay 页面，包含 trace、benchmark、humanlike memory audit。
  - 处理策略：保留为开发诊断入口；不把用户记忆中心继续叠到这里。
- `packages/stage-pages/src/pages/devtools/components/mind-replay-humanlike-memory-audit-panel.vue`
  - 现状：按 `decisionTraceId` / `turnId` 检查 humanlike memory candidate，可纠正字段。
  - 处理策略：保留；新 `MemoryWorkbench` 待审核 tab 可复用它的交互经验，但不直接复用其 trace 绑定形态。
- `packages/stage-pages/src/pages/devtools/components/mind-replay-memory-trace-card.vue`
  - 现状：开发者 trace 记忆链路展示。
  - 处理策略：保留为诊断组件；新召回测试 tab 使用更面向用户的 evidence/rank reason 展示。
- `apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer.vue`
  - 现状：大型 runtime/self-evolution/embodiment 性能与权威诊断页面，已有 memory-stage、memory-resolution、reason preview 等诊断信息。
  - 处理策略：保留，不继续扩成普通用户记忆中心；最多添加一个跳转到 `/settings/memory` 的轻量入口。
- `packages/stage-ui/src/stores/alicization-memory.ts`
  - 现状：旧本地 facts/archive/pending runtime writes store，包含本地迁移、rule facts、prune、retrieve。
  - 处理策略：标记为 legacy/browser fallback 兼容层；新用户可见记忆中心不以它作为真源。
- `packages/stage-ui/src/stores/alicization-epoch1.ts`
  - 现状：旧异步 extraction、memory stats、organic snapshot、presence 初始化相关 store。
  - 处理策略：保留现有职责；不作为新长期记忆 review/tombstone 入口。
- `packages/stage-ui/src/stores/alicization-humanlike-memory-audit.ts`
  - 现状：trace 级 humanlike memory audit store。
  - 处理策略：保留；新 `alicization-memory-workbench.ts` 单独建 store，避免把 trace 审计状态和用户记忆面板状态混在一起。

### 当前没有的入口

- 没有独立 `/settings/memory` 页面。
- 没有用户可见的 WorkingMemory 当前短期记忆页。
- 没有长期记忆 review queue 的用户面板。
- 没有 recall probe UI。
- 没有从 renderer bridge 访问 `LongTermMemoryReviewItem`、tombstone、recall probe 的稳定方法。

### UI 执行规则

- 如果执行时发现已经有人新建了 `/settings/memory`，直接在那个页面基础上改；如果它是空壳或旧实验页，删除其内部实现并按本计划重写，不新增第二个记忆入口。
- 不删除 `AlicizationOrganicMemoryPanel.vue`、`mind-replay` 相关组件、`performance-visualizer.vue` 的诊断信息。
- 新页面中文优先：`zh-Hans` 文案必须完整；`en` 至少同步基础键，其他语言可以沿用英文或中文占位键值，但不能让页面显示裸 key。
- UI 风格走工具型、密集、可扫描界面；不做 hero、不做营销页、不把页面 section 套成一堆大卡片。
- icon 用现有 Iconify/UnoCSS 图标类，例如 `i-solar:refresh-bold-duotone`、`i-solar:database-bold-duotone`、`i-solar:trash-bin-trash-bold-duotone`。

## 文件结构

### 新增文件

- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`
  - 主进程 MemoryWorkbench DTO 归一化、snapshot 聚合、long-term item 投影、health 聚合、recall probe 投影。
- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`
  - 测试 snapshot 聚合、错误聚合、review summary、recall probe 投影。
- `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
  - renderer Pinia store，调用 bridge 获取 snapshot/list/review/probe，管理 tab 状态、筛选器、加载错误。
- `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`
  - 测试 store 在 bridge 缺失、API 成功、API 失败、review 操作后的状态。
- `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`
  - 记忆中心页面。
- `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`
  - 轻量页面结构测试，防止路由和关键 tab 丢失。
- `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`
  - 端到端风格的对话记忆闭环测试：短期记忆、长期召回、失败透明。

### 修改文件

- `apps/stage-tamagotchi/src/shared/eventa.ts`
  - 新增 MemoryWorkbench DTO 类型与 Eventa invoke 合同。
- `apps/stage-tamagotchi/src/shared/eventa.type-spec.ts`
  - 新增 Eventa 类型稳定性测试。
- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`
  - 新增 `latest(cardId)` 和 `list(cardId)`，让 UI 能读取当前 card 最近 WorkingMemory。
- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`
  - 覆盖最新快照读取、clone 安全、按 card 清理。
- `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
  - 新增长期记忆 workbench list、review action、recall probe 需要的 DB facade；复用现有 `listLongTermMemoryReviewItems`、`applyLongTermMemoryReviewDecision`、`tombstoneLongTermMemorySources`、`retrieveLongTermMemoryEvidence`。
- `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`
  - 覆盖长期记忆列表、review action、tombstone 后列表/召回过滤。
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
  - 注册 MemoryWorkbench invoke handlers。
- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
  - 将 `WorkingMemoryStore` 提升到 runtime 组合层，同时传给主对话 session runtime 和 memory invoke handlers。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  - 保持使用注入的 `workingMemoryStore`；把最近 recall bundle 的延迟、错误和 evidence 数量写入 Workbench health 读取路径。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
  - 覆盖主对话使用外部 WorkingMemoryStore，避免 UI 和对话读不同 store。
- `packages/stage-ui/src/stores/alicization-bridge.ts`
  - 新增 MemoryWorkbench 类型 export 和 bridge 方法。
- `packages/stage-ui/src/stores/alicization-bridge.type-spec.ts`
  - 覆盖新 bridge 方法存在。
- `packages/stage-ui/src/stores/alicization-bridge.test.ts`
  - 覆盖 App bridge wiring 字符串，和现有测试风格一致。
- `apps/stage-tamagotchi/src/renderer/App.vue`
  - 新增 Eventa invoke import、`useElectronEventaInvoke`、`setAlicizationBridge` 方法。
- `packages/i18n/src/locales/zh-Hans/settings.yaml`
  - 新增完整中文记忆中心文案。
- `packages/i18n/src/locales/en/settings.yaml`
  - 新增基础英文文案，防止 fallback key 暴露。
- `apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer.vue`
  - 保留现有诊断内容；执行 Task 10 时先检查是否存在 header action 区域，有则只添加到记忆中心的轻量链接，无则不修改该文件。

## Task 1: Shared Eventa Contracts

**Files:**
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.type-spec.ts`

- [ ] **Step 1: Write the failing type spec**

Modify `apps/stage-tamagotchi/src/shared/eventa.type-spec.ts`:

```ts
import type { AlicizationPersistentPresenceAuthoritySnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './eventa'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

void authorityFields

const memoryWorkbenchSnapshot: AlicizationMemoryWorkbenchSnapshot = {
  cardId: 'default',
  sessionId: 'session-1',
  updatedAt: 1,
  workingMemory: null,
  longTerm: {
    total: 0,
    byKind: {},
    items: [],
  },
  review: {
    pending: 0,
    items: [],
  },
  health: {
    status: 'ok',
    queue: {
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    },
    recall: {
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    },
    embedding: {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    errors: [],
  },
}

const recallProbe: AlicizationMemoryRecallProbeResult = {
  query: '我们去打游戏吧',
  intent: {
    mode: 'episodic',
    shouldRecall: true,
    confidence: 0.8,
    rationale: 'shared episodic memory cue',
    temporalFocus: 'unspecified',
    riskFlags: [],
  },
  plan: {
    keywordQueries: ['我们去打游戏吧'],
    phraseQueries: ['打游戏'],
    charGramQueries: ['游戏'],
    semanticQueries: ['共同经历'],
    episodicQueries: ['一起做过的事情'],
    threadHints: [],
    negativeCues: [],
    confidencePolicy: 'direct',
  },
  evidence: [],
  latencyMs: 1,
  errors: [],
}

void memoryWorkbenchSnapshot
void recallProbe

export type EventaSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
```

- [ ] **Step 2: Run the type spec and verify it fails**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Expected: FAIL with missing `AlicizationMemoryWorkbenchSnapshot` and `AlicizationMemoryRecallProbeResult`.

- [ ] **Step 3: Add MemoryWorkbench DTO types and invoke contracts**

Modify `apps/stage-tamagotchi/src/shared/eventa.ts` near existing memory contracts:

```ts
export type AlicizationMemoryWorkbenchStatus = 'ok' | 'degraded' | 'error'
export type AlicizationMemoryWorkbenchKind
  = | 'fact'
    | 'episode'
    | 'reflection'
    | 'consolidation'
    | 'procedure'
    | 'relationship'
    | 'preference'
    | 'candidate'

export type AlicizationMemoryWorkbenchSensitivity = 'public' | 'personal' | 'private' | 'secret'
export type AlicizationMemoryWorkbenchVisibility = 'explicit' | 'inward-only'
export type AlicizationMemoryWorkbenchTrainingState = 'allowed' | 'blocked'
export type AlicizationMemoryWorkbenchReviewDecision = 'approve' | 'reject' | 'tombstone' | 'inward-only' | 'no-training'

export interface AlicizationWorkingMemoryWorkbenchSnapshot {
  cardId: string
  sessionId: string
  updatedAt: number
  threadTitle: string | null
  threadMode: string | null
  currentUserMove: string | null
  activeTask: string | null
  taskStatus: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  userCorrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  queryHints: string[]
  longTermQueue: Array<{
    id: string
    kind: string
    summary: string
    reason: string
    salience: number
    sensitivity: AlicizationMemoryWorkbenchSensitivity
    confidence: number
    allowTraining: boolean
  }>
  failureTurnIds: string[]
}

export interface AlicizationMemoryWorkbenchItem {
  id: string
  kind: AlicizationMemoryWorkbenchKind
  summary: string
  evidenceSnippets: string[]
  sourceIds: string[]
  confidence: number
  salience: number
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  visibility: AlicizationMemoryWorkbenchVisibility
  training: AlicizationMemoryWorkbenchTrainingState
  source: string
  createdAt: number
  updatedAt: number
  lastAccessedAt: number | null
  tombstoned: boolean
}

export interface AlicizationLongTermMemoryWorkbenchSummary {
  total: number
  byKind: Partial<Record<AlicizationMemoryWorkbenchKind, number>>
  items: AlicizationMemoryWorkbenchItem[]
}

export interface AlicizationLongTermMemoryReviewItem {
  id: string
  transactionId: string
  status: string
  kind: string
  summary: string
  evidenceSnippets: string[]
  reviewReasons: string[]
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  createdAt: number
  updatedAt: number
}

export interface AlicizationLongTermMemoryReviewSummary {
  pending: number
  items: AlicizationLongTermMemoryReviewItem[]
}

export interface AlicizationMemoryWorkbenchHealth {
  status: AlicizationMemoryWorkbenchStatus
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  recall: {
    lastLatencyMs: number | null
    p95LatencyMs: number | null
    lastError: string | null
  }
  embedding: {
    providerConfigured: boolean
    modelId: string | null
    dimensions: number | null
    reindexRequired: boolean
  }
  errors: string[]
}

export interface AlicizationMemoryWorkbenchSnapshot {
  cardId: string
  sessionId: string | null
  updatedAt: number
  workingMemory: AlicizationWorkingMemoryWorkbenchSnapshot | null
  longTerm: AlicizationLongTermMemoryWorkbenchSummary
  review: AlicizationLongTermMemoryReviewSummary
  health: AlicizationMemoryWorkbenchHealth
}

export interface AlicizationMemoryWorkbenchSnapshotPayload extends AlicizationCardScope {
  sessionId?: string | null
}

export interface AlicizationMemoryWorkbenchListPayload extends AlicizationCardScope {
  kind?: AlicizationMemoryWorkbenchKind | 'all'
  query?: string
  sensitivity?: AlicizationMemoryWorkbenchSensitivity | 'all'
  visibility?: AlicizationMemoryWorkbenchVisibility | 'all'
  training?: AlicizationMemoryWorkbenchTrainingState | 'all'
  source?: string
  limit?: number
  cursor?: string | null
}

export interface AlicizationMemoryWorkbenchListResult {
  items: AlicizationMemoryWorkbenchItem[]
  nextCursor: string | null
}

export interface AlicizationMemoryReviewActionPayload extends AlicizationCardScope {
  reviewItemId: string
  decision: AlicizationMemoryWorkbenchReviewDecision
  reason?: string | null
}

export interface AlicizationMemoryRecallProbePayload extends AlicizationCardScope {
  query: string
  sessionId?: string | null
  includeWorkingMemory?: boolean
  limit?: number
}

export interface AlicizationMemoryRecallProbeResult {
  query: string
  intent: {
    mode: string
    shouldRecall: boolean
    confidence: number
    rationale: string
    temporalFocus: string
    riskFlags: string[]
  }
  plan: {
    keywordQueries: string[]
    phraseQueries: string[]
    charGramQueries: string[]
    semanticQueries: string[]
    episodicQueries: string[]
    threadHints: string[]
    negativeCues: string[]
    confidencePolicy: string
  }
  evidence: Array<{
    id: string
    kind: string
    summary: string
    source: string
    score: number
    visibleMode: string
    queryMatches: string[]
    rankReasons: string[]
  }>
  latencyMs: number
  errors: string[]
}

export const electronAlicizationMemoryWorkbenchGetSnapshot = defineInvokeEventa<AlicizationMemoryWorkbenchSnapshot, AlicizationMemoryWorkbenchSnapshotPayload>('eventa:invoke:electron:alicization:memory-workbench:get-snapshot')
export const electronAlicizationMemoryWorkbenchListLongTerm = defineInvokeEventa<AlicizationMemoryWorkbenchListResult, AlicizationMemoryWorkbenchListPayload>('eventa:invoke:electron:alicization:memory-workbench:list-long-term')
export const electronAlicizationMemoryWorkbenchApplyReviewAction = defineInvokeEventa<AlicizationLongTermMemoryReviewItem | null, AlicizationMemoryReviewActionPayload>('eventa:invoke:electron:alicization:memory-workbench:apply-review-action')
export const electronAlicizationMemoryWorkbenchRecallProbe = defineInvokeEventa<AlicizationMemoryRecallProbeResult, AlicizationMemoryRecallProbePayload>('eventa:invoke:electron:alicization:memory-workbench:recall-probe')
```

- [ ] **Step 4: Run the type spec and verify it passes**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/shared/eventa.ts apps/stage-tamagotchi/src/shared/eventa.type-spec.ts
git commit -m "feat(alicization): add memory workbench eventa contracts"
```

## Task 2: WorkingMemory Store Ownership And Latest Snapshot

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [ ] **Step 1: Write failing store tests**

Add tests to `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts`:

```ts
it('returns the latest snapshot for a card when session id is not provided', () => {
  const store = createWorkingMemoryStore()
  const older = createEmptyWorkingMemorySnapshot({
    cardId: 'default',
    sessionId: 'session-old',
    now: 100,
  })
  const newer = createEmptyWorkingMemorySnapshot({
    cardId: 'default',
    sessionId: 'session-new',
    now: 200,
  })

  store.upsert(older)
  store.upsert(newer)

  expect(store.latest('default')?.sessionId).toBe('session-new')
  expect(store.list('default').map(snapshot => snapshot.sessionId)).toEqual(['session-new', 'session-old'])
})

it('keeps latest snapshots cloned so UI projection cannot mutate owner state', () => {
  const store = createWorkingMemoryStore()
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: 'default',
    sessionId: 'session-1',
    now: 100,
  })

  store.upsert(snapshot)
  const latest = store.latest('default')
  expect(latest).not.toBeNull()
  latest!.memoryQueryHints.push('mutated outside store')

  expect(store.latest('default')?.memoryQueryHints).toEqual([])
})
```

- [ ] **Step 2: Run store tests and verify failure**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts
```

Expected: FAIL because `latest` and `list` do not exist.

- [ ] **Step 3: Extend the store API**

Modify `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts`:

```ts
export interface WorkingMemoryStore {
  get: (cardId: string, sessionId: string) => WorkingMemorySnapshot | null
  latest: (cardId: string) => WorkingMemorySnapshot | null
  list: (cardId: string) => WorkingMemorySnapshot[]
  upsert: (snapshot: WorkingMemorySnapshot) => void
  clear: (cardId?: string, sessionId?: string) => void
}
```

Inside `createWorkingMemoryStore()` return object:

```ts
    latest(cardId) {
      const [snapshot] = this.list(cardId)
      return snapshot ?? null
    },
    list(cardId) {
      return [...snapshots.values()]
        .filter(snapshot => snapshot.cardId === cardId)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map(cloneSnapshot)
    },
```

- [ ] **Step 4: Run store tests and verify pass**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Hoist WorkingMemoryStore ownership in runtime**

Modify `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`:

```ts
import { createWorkingMemoryStore } from './life-core/working-memory-store'
```

Create one store before `createAlicizationMainChatSessionRuntime`:

```ts
  const workingMemoryStore = createWorkingMemoryStore()
  const mainChatSessionRuntime = createAlicizationMainChatSessionRuntime({
    workingMemoryStore,
    buildMainRuntimeCorePromptBlocks,
    buildOrganicMemoryProviderFactBlocks,
```

When registering memory invoke handlers in the same file, pass:

```ts
    workingMemoryStore,
```

- [ ] **Step 6: Add runtime test proving injected store is used**

In `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, add or extend the existing WorkingMemory test:

```ts
it('uses the injected WorkingMemory store so UI and dialogue share the same short-term owner', async () => {
  const workingMemoryStore = createWorkingMemoryStore()
  const runtime = createAlicizationMainChatSessionRuntime({
    ...createMainChatSessionRuntimeTestOptions(),
    workingMemoryStore,
  })

  await runtime.prepareExecution(createMainChatSessionRuntimeTestInput({
    cardId: 'default',
    turnId: 'turn-working-memory-visible',
    messages: [
      { role: 'user', content: '继续把记忆中心 UI 做成可视闭环' },
    ],
  }))

  const latest = workingMemoryStore.latest('default')
  expect(latest?.currentThread?.currentUserMove).toContain('记忆中心 UI')
})
```

Before adding this test, inspect the helper names in `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts` with:

```bash
rg -n "createMainChatSessionRuntimeTestOptions|createMainChatSessionRuntimeTestInput|createAlicizationMainChatSessionRuntime" apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts
```

Use the discovered helper names in the test body. The assertion must remain exactly about shared `workingMemoryStore.latest('default')`.

- [ ] **Step 7: Run focused runtime tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "WorkingMemory|injected WorkingMemory"
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-store.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts
git commit -m "feat(alicization): expose shared working memory owner store"
```

## Task 3: Main Process MemoryWorkbench Projection

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [ ] **Step 1: Write projection tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { buildMemoryWorkbenchSnapshot, projectWorkingMemoryForWorkbench } from './memory-workbench'

describe('memory workbench projection', () => {
  it('projects WorkingMemory owner state without exposing prompt internals', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 100,
    })
    snapshot.memoryQueryHints.push('打游戏 上周')
    snapshot.userCorrections.push({
      text: '不要固定模板回复',
      sourceTurnId: 'turn-1',
      scope: 'persona',
    })

    const projected = projectWorkingMemoryForWorkbench(snapshot)

    expect(projected).toMatchObject({
      cardId: 'default',
      sessionId: 'session-1',
      updatedAt: 100,
      queryHints: ['打游戏 上周'],
      userCorrections: ['不要固定模板回复'],
    })
    expect(JSON.stringify(projected)).not.toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
  })

  it('builds a partial snapshot when long-term or review modules report errors', async () => {
    const result = await buildMemoryWorkbenchSnapshot({
      cardId: 'default',
      sessionId: null,
      now: () => 200,
      getWorkingMemory: () => null,
      listLongTermItems: async () => {
        throw new Error('long-term-list-failed')
      },
      listReviewItems: async () => [],
      getQueueHealth: async () => ({
        pending: 0,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 0,
      }),
      getRecallHealth: async () => ({
        lastLatencyMs: null,
        p95LatencyMs: null,
        lastError: null,
      }),
      getEmbeddingHealth: async () => ({
        providerConfigured: false,
        modelId: null,
        dimensions: null,
        reindexRequired: false,
      }),
    })

    expect(result.longTerm.items).toEqual([])
    expect(result.health.status).toBe('degraded')
    expect(result.health.errors).toContain('long-term-list-failed')
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
```

Expected: FAIL because `memory-workbench.ts` does not exist.

- [ ] **Step 3: Implement projection module**

Create `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`:

```ts
import type {
  AlicizationLongTermMemoryReviewItem,
  AlicizationMemoryWorkbenchHealth,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationWorkingMemoryWorkbenchSnapshot,
} from '../../../shared/eventa'
import type { WorkingMemorySnapshot } from './life-core/working-memory'

function normalizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 12, maxChars = 240) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function projectWorkingMemoryForWorkbench(snapshot: WorkingMemorySnapshot): AlicizationWorkingMemoryWorkbenchSnapshot {
  return {
    cardId: snapshot.cardId,
    sessionId: snapshot.sessionId,
    updatedAt: snapshot.updatedAt,
    threadTitle: normalizeText(snapshot.currentThread?.title, 180) || null,
    threadMode: normalizeText(snapshot.currentThread?.mode, 80) || null,
    currentUserMove: normalizeText(snapshot.currentThread?.currentUserMove, 240) || null,
    activeTask: normalizeText(snapshot.activeTask?.summary, 240) || null,
    taskStatus: normalizeText(snapshot.activeTask?.status, 80) || null,
    unresolvedQuestions: uniqueTexts(snapshot.unresolvedQuestions.map(item => item.text), 12, 240),
    commitments: uniqueTexts(snapshot.commitments.map(item => item.text), 12, 240),
    userCorrections: uniqueTexts(snapshot.userCorrections.map(item => item.text), 12, 240),
    relationshipPosture: normalizeText(snapshot.relationshipPosture?.summary, 240) || null,
    emotionalPosture: normalizeText(snapshot.emotionalPosture?.summary, 240) || null,
    queryHints: uniqueTexts(snapshot.memoryQueryHints, 12, 160),
    longTermQueue: snapshot.longTermCandidates.map((candidate, index) => ({
      id: `${snapshot.cardId}:${snapshot.sessionId}:candidate:${index}`,
      kind: candidate.kind,
      summary: normalizeText(candidate.summary, 260),
      reason: normalizeText(candidate.reason, 240),
      salience: candidate.salience,
      sensitivity: candidate.sensitivity,
      confidence: candidate.confidence,
      allowTraining: candidate.allowTraining,
    })),
    failureTurnIds: uniqueTexts(snapshot.audit.failureTurnIds, 20, 120),
  }
}

export interface BuildMemoryWorkbenchSnapshotInput {
  cardId: string
  sessionId: string | null
  now: () => number
  getWorkingMemory: () => WorkingMemorySnapshot | null
  listLongTermItems: () => Promise<AlicizationMemoryWorkbenchItem[]>
  listReviewItems: () => Promise<AlicizationLongTermMemoryReviewItem[]>
  getQueueHealth: () => Promise<AlicizationMemoryWorkbenchHealth['queue']>
  getRecallHealth: () => Promise<AlicizationMemoryWorkbenchHealth['recall']>
  getEmbeddingHealth: () => Promise<AlicizationMemoryWorkbenchHealth['embedding']>
}

export async function buildMemoryWorkbenchSnapshot(input: BuildMemoryWorkbenchSnapshotInput): Promise<AlicizationMemoryWorkbenchSnapshot> {
  const errors: string[] = []
  const workingMemory = input.getWorkingMemory()
  const longTermItems = await input.listLongTermItems().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return [] as AlicizationMemoryWorkbenchItem[]
  })
  const reviewItems = await input.listReviewItems().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return [] as AlicizationLongTermMemoryReviewItem[]
  })
  const queue = await input.getQueueHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 }
  })
  const recall = await input.getRecallHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return { lastLatencyMs: null, p95LatencyMs: null, lastError: null }
  })
  const embedding = await input.getEmbeddingHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false }
  })
  const byKind: AlicizationMemoryWorkbenchSnapshot['longTerm']['byKind'] = {}
  for (const item of longTermItems)
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1

  return {
    cardId: input.cardId,
    sessionId: input.sessionId,
    updatedAt: input.now(),
    workingMemory: workingMemory ? projectWorkingMemoryForWorkbench(workingMemory) : null,
    longTerm: {
      total: longTermItems.length,
      byKind,
      items: longTermItems,
    },
    review: {
      pending: reviewItems.length,
      items: reviewItems,
    },
    health: {
      status: errors.length > 0 ? 'degraded' : 'ok',
      queue,
      recall,
      embedding,
      errors,
    },
  }
}
```

- [ ] **Step 4: Run projection tests and verify pass**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
git commit -m "feat(alicization): add memory workbench projection"
```

## Task 4: DB Facade For Long-Term Items, Review Actions, And Recall Probe

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

- [ ] **Step 1: Write DB tests**

Add tests to `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`:

```ts
it('lists long-term memory workbench items across facts reflections and episodes', async () => {
  const db = await createTestAlicizationDb()
  await db.upsertMemoryFacts([{
    subject: '用户',
    predicate: '不想要',
    object: '固定模板回复',
    confidence: 0.91,
  }], 'rule')
  await db.upsertMemoryReflections([{
    id: 'reflection-template-boundary',
    cardId: 'default',
    sessionId: 'session-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    summary: '用户明确拒绝固定模板式回复。',
    relationshipDelta: 0.2,
    confidence: 0.88,
    salience: 0.9,
    tags: ['persona-boundary'],
    createdAt: 100,
    updatedAt: 100,
    status: 'active',
  }])

  const result = await db.listMemoryWorkbenchLongTermItems({
    cardId: 'default',
    query: '固定模板',
    limit: 10,
  })

  expect(result.items.map(item => item.summary).join('\n')).toContain('固定模板')
  expect(result.items.every(item => item.tombstoned === false)).toBe(true)
})

it('applies review action through workbench and blocks tombstoned recall sources', async () => {
  const db = await createTestAlicizationDb()
  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: 'default',
    sessionId: 'session-review',
    items: [{
      id: 'queue-private-boundary',
      kind: 'relationship',
      summary: '用户把某个私人边界设为只内在使用。',
      reason: 'private relationship boundary',
      salience: 0.95,
      sensitivity: 'private',
      confidence: 0.9,
      sourceTurnIds: ['turn-private'],
      allowTraining: false,
    }],
  })
  await db.drainWorkingMemoryLongTermQueue(4)

  const reviewItems = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 10 })
  expect(reviewItems.length).toBeGreaterThan(0)

  const actionResult = await db.applyMemoryWorkbenchReviewAction({
    cardId: 'default',
    reviewItemId: reviewItems[0]!.id,
    decision: 'tombstone',
    reason: 'user-deleted',
  })

  expect(actionResult?.status).toBe('tombstoned')
})

it('runs recall probe with query plan and ranked evidence', async () => {
  const db = await createTestAlicizationDb()
  await db.appendEpisodicEvents([{
    id: 'episode-game-last-week',
    cardId: 'default',
    sessionId: 'session-game',
    sourceKind: 'dialogue',
    summary: '上周我们一起玩了 Minecraft。',
    occurredAt: 100,
    createdAt: 100,
    updatedAt: 100,
    salience: 0.92,
    confidence: 0.9,
    threadAnchor: 'game',
    affectTags: ['warm'],
    relationshipTags: ['shared-play'],
    sourceTurnIds: ['turn-game'],
  }])

  const probe = await db.runMemoryWorkbenchRecallProbe({
    cardId: 'default',
    query: '我们去打游戏吧',
    limit: 5,
  })

  expect(probe.intent.shouldRecall).toBe(true)
  expect(probe.evidence.map(item => item.summary).join('\n')).toContain('Minecraft')
  expect(probe.latencyMs).toBeGreaterThanOrEqual(0)
})
```

Before adding these tests, inspect existing helpers and row shapes with:

```bash
rg -n "createTestAlicizationDb|upsertMemoryFacts|upsertMemoryReflections|appendEpisodicEvents|enqueueWorkingMemoryLongTermQueueItems" apps/stage-tamagotchi/src/main/services/alicization/db.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.ts
```

Use the discovered helper names and field names in the test setup. Keep the three assertions unchanged: long-term list contains `固定模板`, tombstone returns `tombstoned`, recall probe returns `Minecraft`.

- [ ] **Step 2: Run DB tests and verify failure**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "memory workbench|recall probe|review action"
```

Expected: FAIL because DB facade methods do not exist.

- [ ] **Step 3: Add DB facade methods**

Modify the DB return type in `apps/stage-tamagotchi/src/main/services/alicization/db.ts`:

```ts
listMemoryWorkbenchLongTermItems: (input: {
  cardId: string
  kind?: string
  query?: string
  sensitivity?: string
  visibility?: string
  training?: string
  source?: string
  limit?: number
  cursor?: string | null
}) => Promise<{ items: AlicizationMemoryWorkbenchItem[], nextCursor: string | null }>
listMemoryWorkbenchReviewItems: (input: { cardId: string, limit?: number }) => Promise<AlicizationLongTermMemoryReviewItem[]>
applyMemoryWorkbenchReviewAction: (input: {
  cardId: string
  reviewItemId: string
  decision: AlicizationMemoryWorkbenchReviewDecision
  reason?: string | null
}) => Promise<AlicizationLongTermMemoryReviewItem | null>
runMemoryWorkbenchRecallProbe: (input: {
  cardId: string
  query: string
  sessionId?: string | null
  includeWorkingMemory?: boolean
  limit?: number
}) => Promise<AlicizationMemoryRecallProbeResult>
```

Implement using existing methods:

```ts
async function listMemoryWorkbenchReviewItems(input: { cardId: string, limit?: number }) {
  return (await listLongTermMemoryReviewItems(input)).map(item => ({
    id: item.id,
    transactionId: item.transactionId,
    status: item.status,
    kind: item.kind,
    summary: item.summary,
    evidenceSnippets: item.evidenceSnippets,
    reviewReasons: item.reviewReasons,
    sensitivity: item.sensitivity,
    visibleMode: item.visibleMode,
    allowTraining: item.allowTraining,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }))
}

async function applyMemoryWorkbenchReviewAction(input: {
  cardId: string
  reviewItemId: string
  decision: AlicizationMemoryWorkbenchReviewDecision
  reason?: string | null
}) {
  if (input.decision === 'inward-only' || input.decision === 'no-training') {
    const [item] = (await listMemoryWorkbenchReviewItems({ cardId: input.cardId, limit: 64 }))
      .filter(row => row.id === input.reviewItemId)
    return item ?? null
  }
  const decision = input.decision === 'approve'
    ? 'approve'
    : input.decision === 'tombstone'
      ? 'tombstone'
      : 'reject'
  return await applyLongTermMemoryReviewDecision({
    cardId: input.cardId,
    reviewItemId: input.reviewItemId,
    decision,
  })
}
```

For `listMemoryWorkbenchLongTermItems`, project existing facts/reflections/episodes/consolidations into `AlicizationMemoryWorkbenchItem`; respect `limit`, `query`, `kind`, and tombstone filtering. Use conservative defaults:

```ts
const safeLimit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)))
```

For `runMemoryWorkbenchRecallProbe`, wrap existing `retrieveLongTermMemoryEvidence`:

```ts
async function runMemoryWorkbenchRecallProbe(input: {
  cardId: string
  query: string
  sessionId?: string | null
  includeWorkingMemory?: boolean
  limit?: number
}): Promise<AlicizationMemoryRecallProbeResult> {
  const startedAt = now()
  const query = normalizeOrganicMemoryText(input.query, 600)
  if (!query) {
    return {
      query: '',
      intent: {
        mode: 'none',
        shouldRecall: false,
        confidence: 0,
        rationale: 'empty-query',
        temporalFocus: 'unspecified',
        riskFlags: ['empty-query'],
      },
      plan: {
        keywordQueries: [],
        phraseQueries: [],
        charGramQueries: [],
        semanticQueries: [],
        episodicQueries: [],
        threadHints: [],
        negativeCues: [],
        confidencePolicy: 'direct',
      },
      evidence: [],
      latencyMs: now() - startedAt,
      errors: [],
    }
  }
  const bundle = await retrieveLongTermMemoryEvidence({
    cardId: input.cardId,
    currentUserText: query,
    limit: input.limit,
  })
  return {
    query,
    intent: {
      mode: bundle.intent.mode,
      shouldRecall: bundle.intent.shouldRecall,
      confidence: bundle.intent.confidence,
      rationale: bundle.intent.rationale,
      temporalFocus: bundle.intent.temporalFocus,
      riskFlags: bundle.intent.riskFlags,
    },
    plan: {
      keywordQueries: bundle.plan.keywordQueries,
      phraseQueries: bundle.plan.phraseQueries,
      charGramQueries: bundle.plan.charGramQueries,
      semanticQueries: bundle.plan.semanticQueries,
      episodicQueries: bundle.plan.episodicQueries,
      threadHints: bundle.plan.threadHints,
      negativeCues: bundle.plan.negativeCues,
      confidencePolicy: bundle.plan.confidencePolicy,
    },
    evidence: bundle.evidence.map(item => ({
      id: item.candidate.id,
      kind: item.candidate.kind,
      summary: item.candidate.summary,
      source: item.candidate.source,
      score: item.score,
      visibleMode: item.visibleMode,
      queryMatches: item.queryMatches,
      rankReasons: item.rankReasons,
    })),
    latencyMs: now() - startedAt,
    errors: [],
  }
}
```

- [ ] **Step 4: Return new facade methods**

Add to the DB return object:

```ts
    listMemoryWorkbenchLongTermItems,
    listMemoryWorkbenchReviewItems,
    applyMemoryWorkbenchReviewAction,
    runMemoryWorkbenchRecallProbe,
```

- [ ] **Step 5: Run focused DB tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "memory workbench|recall probe|review action"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts
git commit -m "feat(alicization): expose memory workbench db facade"
```

## Task 5: Runtime Invoke Handlers

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [ ] **Step 1: Add handler tests through projection dependencies**

Extend `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`:

```ts
it('uses the provided WorkingMemory lookup before falling back to null', async () => {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: 'default',
    sessionId: 'session-ui',
    now: 300,
  })

  const result = await buildMemoryWorkbenchSnapshot({
    cardId: 'default',
    sessionId: 'session-ui',
    now: () => 301,
    getWorkingMemory: () => snapshot,
    listLongTermItems: async () => [],
    listReviewItems: async () => [],
    getQueueHealth: async () => ({
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    }),
    getRecallHealth: async () => ({
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    }),
    getEmbeddingHealth: async () => ({
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    }),
  })

  expect(result.workingMemory?.sessionId).toBe('session-ui')
})
```

- [ ] **Step 2: Modify handler options**

In `runtime-invoke-handlers-memory.ts`, import new invoke contracts and `buildMemoryWorkbenchSnapshot`:

```ts
import type { WorkingMemoryStore } from './life-core/working-memory-store'

import { buildMemoryWorkbenchSnapshot } from './memory-workbench'
```

Extend `RegisterAlicizationMemoryInvokeHandlersOptions`:

```ts
workingMemoryStore: WorkingMemoryStore
```

Import Eventa invokes:

```ts
  electronAlicizationMemoryWorkbenchApplyReviewAction,
  electronAlicizationMemoryWorkbenchGetSnapshot,
  electronAlicizationMemoryWorkbenchListLongTerm,
  electronAlicizationMemoryWorkbenchRecallProbe,
```

- [ ] **Step 3: Register handlers**

Inside `registerAlicizationMemoryInvokeHandlers`, add:

```ts
registerInvokeHandler(electronAlicizationMemoryWorkbenchGetSnapshot, async payload => await withCardScope(payload.cardId, async () => {
  const cardId = cardIdFrom(payload)
  const sessionId = normalizeSessionId(payload.sessionId) || null
  const alicizationDb = getAlicizationDb()
  return await buildMemoryWorkbenchSnapshot({
    cardId,
    sessionId,
    now: () => Date.now(),
    getWorkingMemory: () => sessionId
      ? workingMemoryStore.get(cardId, sessionId)
      : workingMemoryStore.latest(cardId),
    listLongTermItems: async () => (await alicizationDb.listMemoryWorkbenchLongTermItems({ cardId, limit: 24 })).items,
    listReviewItems: async () => await alicizationDb.listMemoryWorkbenchReviewItems({ cardId, limit: 24 }),
    getQueueHealth: async () => await alicizationDb.getMemoryWorkbenchQueueHealth?.({ cardId }) ?? {
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    },
    getRecallHealth: async () => await alicizationDb.getMemoryWorkbenchRecallHealth?.({ cardId }) ?? {
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    },
    getEmbeddingHealth: async () => await alicizationDb.getMemoryWorkbenchEmbeddingHealth?.({ cardId }) ?? {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
  })
}))

registerInvokeHandler(electronAlicizationMemoryWorkbenchListLongTerm, async payload => await withCardScope(payload.cardId, async () => {
  return await getAlicizationDb().listMemoryWorkbenchLongTermItems({
    cardId: cardIdFrom(payload),
    kind: payload.kind,
    query: payload.query,
    sensitivity: payload.sensitivity,
    visibility: payload.visibility,
    training: payload.training,
    source: payload.source,
    limit: payload.limit,
    cursor: payload.cursor,
  })
}))

registerInvokeHandler(electronAlicizationMemoryWorkbenchApplyReviewAction, async payload => await withCardScope(payload.cardId, async () => {
  return await getAlicizationDb().applyMemoryWorkbenchReviewAction({
    cardId: cardIdFrom(payload),
    reviewItemId: sanitizeText(payload.reviewItemId),
    decision: payload.decision,
    reason: sanitizeText(payload.reason),
  })
}))

registerInvokeHandler(electronAlicizationMemoryWorkbenchRecallProbe, async payload => await withCardScope(payload.cardId, async () => {
  return await getAlicizationDb().runMemoryWorkbenchRecallProbe({
    cardId: cardIdFrom(payload),
    query: sanitizeText(payload.query),
    sessionId: normalizeSessionId(payload.sessionId) || null,
    includeWorkingMemory: payload.includeWorkingMemory === true,
    limit: payload.limit,
  })
}))
```

Add the health facade methods in Task 4 so this handler does not depend on optional DB properties:

```ts
getMemoryWorkbenchQueueHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['queue']>
getMemoryWorkbenchRecallHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['recall']>
getMemoryWorkbenchEmbeddingHealth: (input: { cardId: string }) => Promise<AlicizationMemoryWorkbenchHealth['embedding']>
```

In `db.ts`, implement conservative defaults until richer metrics exist:

```ts
async function getMemoryWorkbenchQueueHealth(): Promise<AlicizationMemoryWorkbenchHealth['queue']> {
  return { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 }
}

async function getMemoryWorkbenchRecallHealth(): Promise<AlicizationMemoryWorkbenchHealth['recall']> {
  return { lastLatencyMs: null, p95LatencyMs: null, lastError: null }
}

async function getMemoryWorkbenchEmbeddingHealth(): Promise<AlicizationMemoryWorkbenchHealth['embedding']> {
  return { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false }
}
```

- [ ] **Step 4: Pass store from runtime**

In `runtime.ts`, the `registerAlicizationMemoryInvokeHandlers` call must include:

```ts
    workingMemoryStore,
```

- [ ] **Step 5: Run node typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
git commit -m "feat(alicization): register memory workbench runtime handlers"
```

## Task 6: Renderer Bridge Wiring

**Files:**
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.type-spec.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.test.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/App.vue`

- [ ] **Step 1: Write bridge tests**

Modify `packages/stage-ui/src/stores/alicization-bridge.test.ts`:

```ts
it('exposes memory workbench eventa invokes through the desktop bridge', () => {
  const source = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/App.vue', import.meta.url), 'utf8')

  expect(source).toContain('electronAlicizationMemoryWorkbenchGetSnapshot')
  expect(source).toContain('electronAlicizationMemoryWorkbenchListLongTerm')
  expect(source).toContain('electronAlicizationMemoryWorkbenchApplyReviewAction')
  expect(source).toContain('electronAlicizationMemoryWorkbenchRecallProbe')
  expect(source).toContain('memoryWorkbenchGetSnapshot')
  expect(source).toContain('memoryWorkbenchRecallProbe')
})
```

Modify `packages/stage-ui/src/stores/alicization-bridge.type-spec.ts`:

```ts
import type { AlicizationMemoryWorkbenchSnapshot } from './alicization-bridge'

const snapshot: AlicizationMemoryWorkbenchSnapshot = {
  cardId: 'default',
  sessionId: null,
  updatedAt: 1,
  workingMemory: null,
  longTerm: {
    total: 0,
    byKind: {},
    items: [],
  },
  review: {
    pending: 0,
    items: [],
  },
  health: {
    status: 'ok',
    queue: {
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    },
    recall: {
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    },
    embedding: {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    errors: [],
  },
}

void snapshot
```

- [ ] **Step 2: Run bridge tests and verify failure**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-bridge.test.ts packages/stage-ui/src/stores/alicization-bridge.type-spec.ts
```

Expected: FAIL because bridge types and App wiring are missing.

- [ ] **Step 3: Export bridge types and methods**

Modify `packages/stage-ui/src/stores/alicization-bridge.ts` imports from shared stage types or local Eventa bridge types:

```ts
export type AlicizationMemoryWorkbenchSnapshot = SharedAlicizationMemoryWorkbenchSnapshot
export type AlicizationMemoryWorkbenchListPayload = SharedAlicizationMemoryWorkbenchListPayload
export type AlicizationMemoryWorkbenchListResult = SharedAlicizationMemoryWorkbenchListResult
export type AlicizationMemoryReviewActionPayload = SharedAlicizationMemoryReviewActionPayload
export type AlicizationMemoryRecallProbePayload = SharedAlicizationMemoryRecallProbePayload
export type AlicizationMemoryRecallProbeResult = SharedAlicizationMemoryRecallProbeResult
```

Extend `interface AlicizationBridge`:

```ts
  memoryWorkbenchGetSnapshot?: (payload?: { sessionId?: string | null }) => Promise<AlicizationMemoryWorkbenchSnapshot>
  memoryWorkbenchListLongTerm?: (payload: Omit<AlicizationMemoryWorkbenchListPayload, 'cardId'>) => Promise<AlicizationMemoryWorkbenchListResult>
  memoryWorkbenchApplyReviewAction?: (payload: Omit<AlicizationMemoryReviewActionPayload, 'cardId'>) => Promise<AlicizationLongTermMemoryReviewItem | null>
  memoryWorkbenchRecallProbe?: (payload: Omit<AlicizationMemoryRecallProbePayload, 'cardId'>) => Promise<AlicizationMemoryRecallProbeResult>
```

- [ ] **Step 4: Wire App.vue invoke functions**

Modify `apps/stage-tamagotchi/src/renderer/App.vue` imports:

```ts
  electronAlicizationMemoryWorkbenchApplyReviewAction,
  electronAlicizationMemoryWorkbenchGetSnapshot,
  electronAlicizationMemoryWorkbenchListLongTerm,
  electronAlicizationMemoryWorkbenchRecallProbe,
```

Create invoke wrappers:

```ts
const memoryWorkbenchGetSnapshot = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchGetSnapshot)
const memoryWorkbenchListLongTerm = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchListLongTerm)
const memoryWorkbenchApplyReviewAction = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchApplyReviewAction)
const memoryWorkbenchRecallProbe = useElectronEventaInvoke(electronAlicizationMemoryWorkbenchRecallProbe)
```

Add to `setAlicizationBridge`:

```ts
  memoryWorkbenchGetSnapshot: async payload => await memoryWorkbenchGetSnapshot({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchListLongTerm: async payload => await memoryWorkbenchListLongTerm({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchApplyReviewAction: async payload => await memoryWorkbenchApplyReviewAction({ ...resolveAlicizationScope(), ...payload }),
  memoryWorkbenchRecallProbe: async payload => await memoryWorkbenchRecallProbe({ ...resolveAlicizationScope(), ...payload }),
```

- [ ] **Step 5: Run bridge tests**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-bridge.test.ts packages/stage-ui/src/stores/alicization-bridge.type-spec.ts
```

Expected: PASS.

- [ ] **Step 6: Run renderer typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/stage-ui/src/stores/alicization-bridge.ts packages/stage-ui/src/stores/alicization-bridge.type-spec.ts packages/stage-ui/src/stores/alicization-bridge.test.ts apps/stage-tamagotchi/src/renderer/App.vue
git commit -m "feat(alicization): wire memory workbench renderer bridge"
```

## Task 7: Pinia MemoryWorkbench Store

**Files:**
- Create: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Create: `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`

- [ ] **Step 1: Write store tests**

Create `packages/stage-ui/src/stores/alicization-memory-workbench.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationMemoryWorkbenchStore } from './alicization-memory-workbench'

describe('alicization memory workbench store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  it('stays empty when bridge is unavailable', async () => {
    const store = useAlicizationMemoryWorkbenchStore()

    await store.refreshSnapshot()

    expect(store.snapshot).toBeNull()
    expect(store.lastError).toBeNull()
  })

  it('loads snapshot and recall probe through bridge', async () => {
    setAlicizationBridge({
      memoryWorkbenchGetSnapshot: vi.fn(async () => ({
        cardId: 'default',
        sessionId: null,
        updatedAt: 1,
        workingMemory: null,
        longTerm: {
          total: 0,
          byKind: {},
          items: [],
        },
        review: {
          pending: 0,
          items: [],
        },
        health: {
          status: 'ok',
          queue: { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 },
          recall: { lastLatencyMs: null, p95LatencyMs: null, lastError: null },
          embedding: { providerConfigured: false, modelId: null, dimensions: null, reindexRequired: false },
          errors: [],
        },
      })),
      memoryWorkbenchRecallProbe: vi.fn(async payload => ({
        query: payload.query,
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.8,
          rationale: 'shared memory cue',
          temporalFocus: 'unspecified',
          riskFlags: [],
        },
        plan: {
          keywordQueries: [payload.query],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: [],
          episodicQueries: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
        },
        evidence: [],
        latencyMs: 1,
        errors: [],
      })),
      bootstrap: vi.fn(),
      getSoul: vi.fn(),
      initializeGenesis: vi.fn(),
      updateSoul: vi.fn(),
      updatePersonality: vi.fn(),
      getKillSwitchState: vi.fn(),
      suspendKillSwitch: vi.fn(),
      resumeKillSwitch: vi.fn(),
      getMemoryStats: vi.fn(),
      runMemoryPrune: vi.fn(),
      updateMemoryStats: vi.fn(),
      retrieveMemoryFacts: vi.fn(),
      upsertMemoryFacts: vi.fn(),
      importLegacyMemory: vi.fn(),
      appendConversationTurn: vi.fn(),
      appendAuditLog: vi.fn(),
      realtimeExecute: vi.fn(),
      getSensorySnapshot: vi.fn(),
    } as any)

    const store = useAlicizationMemoryWorkbenchStore()
    await store.refreshSnapshot()
    await store.runRecallProbe('我们去打游戏吧')

    expect(store.snapshot?.health.status).toBe('ok')
    expect(store.recallProbe?.intent.mode).toBe('episodic')
  })
})
```

- [ ] **Step 2: Run store tests and verify failure**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
```

Expected: FAIL because store does not exist.

- [ ] **Step 3: Implement store**

Create `packages/stage-ui/src/stores/alicization-memory-workbench.ts`:

```ts
import type {
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchSnapshot,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

export type AlicizationMemoryWorkbenchTab = 'working' | 'long-term' | 'review' | 'probe' | 'persona' | 'health'

export const useAlicizationMemoryWorkbenchStore = defineStore('alicization-memory-workbench', () => {
  const activeTab = ref<AlicizationMemoryWorkbenchTab>('working')
  const snapshot = ref<AlicizationMemoryWorkbenchSnapshot | null>(null)
  const longTermItems = ref<AlicizationMemoryWorkbenchItem[]>([])
  const recallProbe = ref<AlicizationMemoryRecallProbeResult | null>(null)
  const recallQuery = ref('我们去打游戏吧')
  const loading = ref(false)
  const listLoading = ref(false)
  const probeLoading = ref(false)
  const reviewActionLoadingId = ref<string | null>(null)
  const lastError = ref<string | null>(null)

  const workingMemory = computed(() => snapshot.value?.workingMemory ?? null)
  const reviewItems = computed(() => snapshot.value?.review.items ?? [])
  const health = computed(() => snapshot.value?.health ?? null)
  const pendingReviewCount = computed(() => snapshot.value?.review.pending ?? 0)

  async function refreshSnapshot(sessionId?: string | null) {
    if (!hasAlicizationBridge()) {
      snapshot.value = null
      lastError.value = null
      return null
    }
    const bridge = getAlicizationBridge()
    if (!bridge.memoryWorkbenchGetSnapshot) {
      snapshot.value = null
      lastError.value = null
      return null
    }
    loading.value = true
    try {
      const next = await bridge.memoryWorkbenchGetSnapshot({ sessionId })
      snapshot.value = next
      longTermItems.value = next.longTerm.items
      lastError.value = null
      return next
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      loading.value = false
    }
  }

  async function refreshLongTerm() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListLongTerm)
      return []
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!({ limit: 50 })
      longTermItems.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      listLoading.value = false
    }
  }

  async function applyReviewAction(reviewItemId: string, decision: 'approve' | 'reject' | 'tombstone' | 'inward-only' | 'no-training') {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchApplyReviewAction)
      return null
    reviewActionLoadingId.value = reviewItemId
    try {
      const result = await getAlicizationBridge().memoryWorkbenchApplyReviewAction!({ reviewItemId, decision })
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      reviewActionLoadingId.value = null
    }
  }

  async function runRecallProbe(query = recallQuery.value) {
    const normalized = query.trim()
    if (!normalized || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRecallProbe)
      return null
    recallQuery.value = normalized
    probeLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRecallProbe!({
        query: normalized,
        sessionId: snapshot.value?.sessionId ?? null,
        includeWorkingMemory: true,
        limit: 8,
      })
      recallProbe.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      probeLoading.value = false
    }
  }

  return {
    activeTab,
    snapshot,
    longTermItems,
    recallProbe,
    recallQuery,
    loading,
    listLoading,
    probeLoading,
    reviewActionLoadingId,
    lastError,
    workingMemory,
    reviewItems,
    health,
    pendingReviewCount,
    refreshSnapshot,
    refreshLongTerm,
    applyReviewAction,
    runRecallProbe,
  }
})
```

- [ ] **Step 4: Run store tests**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stage-ui/src/stores/alicization-memory-workbench.ts packages/stage-ui/src/stores/alicization-memory-workbench.test.ts
git commit -m "feat(alicization): add memory workbench renderer store"
```

## Task 8: Memory Center UI Page And Chinese-First Copy

**Files:**
- Create or replace: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`
- Create: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [ ] **Step 1: Write page structure test**

Create `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('memory workbench settings page', () => {
  it('is a dedicated settings memory page with all visible loop tabs', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('useAlicizationMemoryWorkbenchStore')
    expect(source).toContain(\"'working'\")
    expect(source).toContain(\"'long-term'\")
    expect(source).toContain(\"'review'\")
    expect(source).toContain(\"'probe'\")
    expect(source).toContain(\"'persona'\")
    expect(source).toContain(\"'health'\")
    expect(source).toContain('settings.pages.memory.workbench.title')
    expect(source).toContain('titleKey: settings.pages.memory.workbench.title')
    expect(source).toContain('settingsEntry: true')
  })

  it('keeps user-facing memory UI outside performance visualizer', () => {
    const source = readFileSync(new URL('../../devtools/performance-visualizer.vue', import.meta.url), 'utf8')

    expect(source).not.toContain('useAlicizationMemoryWorkbenchStore')
  })
})
```

- [ ] **Step 2: Run page test and verify failure**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: FAIL because page does not exist.

- [ ] **Step 3: Add Chinese i18n keys**

Modify `packages/i18n/src/locales/zh-Hans/settings.yaml` under `pages.memory`:

```yaml
workbench:
  title: 记忆中心
  description: 查看、审核、测试和清理 Alicization 的短期记忆与长期记忆。
  tabs:
    working: 当前短期记忆
    long_term: 长期记忆
    review: 待审核
    probe: 召回测试
    persona: 人格候选
    health: 健康与审计
  actions:
    refresh: 刷新
    approve: 批准
    reject: 拒绝
    tombstone: 删除并屏蔽
    inward_only: 只内在使用
    no_training: 禁止训练
    run_probe: 运行召回测试
  states:
    empty_working: 还没有可显示的短期记忆快照。发送一轮对话后再刷新。
    empty_long_term: 还没有匹配的长期记忆。
    empty_review: 当前没有需要你审核的记忆。
    empty_probe: 输入一句话，查看她会回想起什么。
    loading: 正在读取记忆状态...
  fields:
    health: 记忆健康
    pending_review: 待审核
    recall_latency: 召回延迟
    queue: 队列
    embedding: 向量模型
    thread: 当前线程
    active_task: 活跃任务
    corrections: 用户纠正
    commitments: 承诺
    questions: 未解决问题
    query_hints: 查询提示
    evidence: 证据
    rank_reasons: 排名理由
    sensitivity: 敏感度
    visibility: 可见策略
    training: 训练
    errors: 错误
```

Modify `packages/i18n/src/locales/en/settings.yaml` under `pages.memory` with matching keys:

```yaml
workbench:
  title: Memory Center
  description: Inspect, review, test, and clean Alicization short-term and long-term memory.
  tabs:
    working: Current Working Memory
    long_term: Long-Term Memory
    review: Review Queue
    probe: Recall Probe
    persona: Persona Candidates
    health: Health & Audit
  actions:
    refresh: Refresh
    approve: Approve
    reject: Reject
    tombstone: Delete and Block
    inward_only: Inward Only
    no_training: No Training
    run_probe: Run Probe
  states:
    empty_working: No working memory snapshot yet. Send one dialogue turn and refresh.
    empty_long_term: No matching long-term memory yet.
    empty_review: No memories currently need your review.
    empty_probe: Enter a sentence to see what she would recall.
    loading: Loading memory state...
  fields:
    health: Memory Health
    pending_review: Pending Review
    recall_latency: Recall Latency
    queue: Queue
    embedding: Embedding
    thread: Thread
    active_task: Active Task
    corrections: User Corrections
    commitments: Commitments
    questions: Open Questions
    query_hints: Query Hints
    evidence: Evidence
    rank_reasons: Rank Reasons
    sensitivity: Sensitivity
    visibility: Visibility
    training: Training
    errors: Errors
```

- [ ] **Step 4: Implement page**

Create `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`:

```vue
<script setup lang="ts">
import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useAlicizationMemoryWorkbenchStore()
const { t } = useI18n()
const {
  activeTab,
  snapshot,
  longTermItems,
  recallProbe,
  recallQuery,
  loading,
  listLoading,
  probeLoading,
  reviewActionLoadingId,
  lastError,
  workingMemory,
  reviewItems,
  health,
  pendingReviewCount,
} = storeToRefs(store)

const tabs = computed(() => [
  { id: 'working' as const, icon: 'i-solar:clipboard-list-bold-duotone', label: t('settings.pages.memory.workbench.tabs.working') },
  { id: 'long-term' as const, icon: 'i-solar:database-bold-duotone', label: t('settings.pages.memory.workbench.tabs.long_term') },
  { id: 'review' as const, icon: 'i-solar:checklist-bold-duotone', label: t('settings.pages.memory.workbench.tabs.review') },
  { id: 'probe' as const, icon: 'i-solar:magnifer-bold-duotone', label: t('settings.pages.memory.workbench.tabs.probe') },
  { id: 'persona' as const, icon: 'i-solar:user-heart-bold-duotone', label: t('settings.pages.memory.workbench.tabs.persona') },
  { id: 'health' as const, icon: 'i-solar:pulse-2-bold-duotone', label: t('settings.pages.memory.workbench.tabs.health') },
])

const healthStatusClass = computed(() => {
  if (health.value?.status === 'ok')
    return 'text-emerald-600 dark:text-emerald-300'
  if (health.value?.status === 'degraded')
    return 'text-amber-600 dark:text-amber-300'
  return 'text-rose-600 dark:text-rose-300'
})

function listText(values: string[]) {
  return values.length > 0 ? values.join(' / ') : '—'
}

onMounted(() => {
  void store.refreshSnapshot()
})
</script>

<template>
  <div :class="['flex', 'min-h-0', 'flex-col', 'gap-4', 'pb-10']">
    <header :class="['flex', 'flex-col', 'gap-3', 'md:flex-row', 'md:items-end', 'md:justify-between']">
      <div>
        <h1 :class="['text-2xl', 'font-semibold', 'text-neutral-950', 'dark:text-neutral-50']">
          {{ t('settings.pages.memory.workbench.title') }}
        </h1>
        <p :class="['mt-1', 'max-w-3xl', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.memory.workbench.description') }}
        </p>
      </div>
      <Button
        :label="t('settings.pages.memory.workbench.actions.refresh')"
        icon="i-solar:refresh-bold-duotone"
        size="sm"
        :loading="loading"
        @click="store.refreshSnapshot()"
      />
    </header>

    <section :class="['grid', 'grid-cols-2', 'gap-3', 'lg:grid-cols-4']">
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.health') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold', healthStatusClass]">
          {{ health?.status ?? '—' }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.pending_review') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ pendingReviewCount }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.recall_latency') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.recall.lastLatencyMs ?? '—' }} ms
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.queue') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.queue.pending ?? 0 }} / {{ health?.queue.failed ?? 0 }}
        </div>
      </div>
    </section>

    <div v-if="lastError" :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']">
      {{ lastError }}
    </div>

    <nav :class="['flex', 'flex-wrap', 'gap-2', 'border-b', 'border-neutral-200', 'pb-2', 'dark:border-neutral-800']">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[
          'inline-flex', 'items-center', 'gap-2', 'border', 'px-3', 'py-2', 'text-sm',
          activeTab === tab.id
            ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900',
        ]"
        @click="activeTab = tab.id"
      >
        <span :class="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'working'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div v-if="!workingMemory" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_working') }}
      </div>
      <template v-else>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.thread') }}
          </div>
          <div :class="['mt-1', 'text-sm', 'font-medium']">
            {{ workingMemory.threadTitle ?? '—' }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.active_task') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ workingMemory.activeTask ?? '—' }}
          </div>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.corrections') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.userCorrections) }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.query_hints') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.queryHints) }}
          </div>
        </div>
      </template>
    </section>

    <section v-else-if="activeTab === 'long-term'" :class="['flex', 'flex-col', 'gap-3']">
      <Button
        :label="t('settings.pages.memory.workbench.actions.refresh')"
        icon="i-solar:refresh-bold-duotone"
        size="sm"
        :loading="listLoading"
        @click="store.refreshLongTerm()"
      />
      <div v-if="longTermItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_long_term') }}
      </div>
      <article v-for="item in longTermItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ item.kind }}</span>
          <span>{{ item.sensitivity }}</span>
          <span>{{ item.visibility }}</span>
          <span>{{ item.training }}</span>
        </div>
        <div :class="['mt-2', 'text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.evidenceSnippets) }}
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'review'" :class="['flex', 'flex-col', 'gap-3']">
      <div v-if="reviewItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_review') }}
      </div>
      <article v-for="item in reviewItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.reviewReasons) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="xs" :label="t('settings.pages.memory.workbench.actions.approve')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'approve')" />
          <Button size="xs" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'reject')" />
          <Button size="xs" variant="secondary" :label="t('settings.pages.memory.workbench.actions.tombstone')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'tombstone')" />
          <Button size="xs" variant="secondary" :label="t('settings.pages.memory.workbench.actions.inward_only')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'inward-only')" />
          <Button size="xs" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'no-training')" />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'probe'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'gap-2']">
        <input v-model="recallQuery" :class="['min-w-0', 'flex-1', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']" @keydown.enter.prevent="store.runRecallProbe()">
        <Button :label="t('settings.pages.memory.workbench.actions.run_probe')" icon="i-solar:magnifer-bold-duotone" :loading="probeLoading" @click="store.runRecallProbe()" />
      </div>
      <div v-if="!recallProbe" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_probe') }}
      </div>
      <div v-else :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[320px_minmax(0,1fr)]']">
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            intent
          </div>
          <pre :class="['mt-2', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(recallProbe.intent, null, 2) }}</pre>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.evidence') }}
          </div>
          <article v-for="item in recallProbe.evidence" :key="item.id" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-sm', 'font-medium']">
              {{ item.summary }}
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ listText(item.rankReasons) }}
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'persona'" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
      {{ t('settings.pages.memory.workbench.tabs.persona') }}
    </section>

    <section v-else-if="activeTab === 'health'" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
      <pre :class="['whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(health, null, 2) }}</pre>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.workbench.title
  descriptionKey: settings.pages.memory.workbench.description
  icon: i-solar:database-bold-duotone
  order: 9
  settingsEntry: true
  stageTransition:
    name: slide
</route>
```

- [ ] **Step 5: Run page test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run renderer typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts packages/i18n/src/locales/zh-Hans/settings.yaml packages/i18n/src/locales/en/settings.yaml
git commit -m "feat(alicization): add memory center settings page"
```

## Task 9: Dialogue Memory Loop Acceptance Tests

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [ ] **Step 1: Write acceptance tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { buildLongTermMemoryRecallBlock } from './long-term-memory-recall'

describe('memory workbench dialogue loop acceptance', () => {
  it('renders game recall evidence for the dialogue prompt without replacing WorkingMemory owner', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.82,
          rationale: 'User utterance can benefit from shared episodic memory.',
          temporalFocus: 'recent-or-mid',
          targetKinds: ['episode'],
          queryHints: ['我们去打游戏吧'],
          riskFlags: [],
        },
        plan: {
          rawQuery: '我们去打游戏吧',
          normalizedQuery: '我们去打游戏吧',
          keywordQueries: ['打游戏'],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: ['共同经历'],
          episodicQueries: ['一起做过的事情'],
          temporalHints: ['上周'],
          entityHints: ['游戏'],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: [],
          targetKinds: ['episode'],
        },
        evidence: [{
          candidate: {
            id: 'episode-game-last-week',
            kind: 'episode',
            summary: '上周我们一起玩了 Minecraft。',
            source: 'episodic_events',
            confidence: 0.9,
            salience: 0.92,
            updatedAt: 100,
            occurredAt: 100,
            threadId: 'game',
            threadAnchor: 'game',
            cues: ['打游戏'],
            entities: ['Minecraft'],
            sensitivity: 'personal',
          },
          score: 0.91,
          queryMatches: ['打游戏'],
          rankReasons: ['episodic-match', 'shared-activity'],
          visibleMode: 'explicit',
        }],
        confidence: 0.86,
        budgetClass: 'normal',
      },
    })

    expect(JSON.parse(block).type).toBe('alicization-long-term-memory-recall')
    expect(block).toContain('Minecraft')
  })

  it('keeps recall failure explicit instead of producing a fixed persona fallback', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'none',
          shouldRecall: false,
          confidence: 0,
          rationale: 'Long-term memory recall failed.',
          temporalFocus: 'unspecified',
          targetKinds: [],
          queryHints: [],
          riskFlags: ['recall-failed'],
        },
        plan: {
          rawQuery: '继续',
          normalizedQuery: '继续',
          keywordQueries: [],
          phraseQueries: [],
          charGramQueries: [],
          semanticQueries: [],
          episodicQueries: [],
          temporalHints: [],
          entityHints: [],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: ['recall-failed'],
          targetKinds: [],
        },
        evidence: [],
        confidence: 0,
        budgetClass: 'none',
      },
    })

    expect(block).toContain('recall-failed')
    expect(block).not.toContain('retired_policy=observe_first')
  })
})
```

- [ ] **Step 2: Run acceptance tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected before implementation fix: FAIL only when `buildLongTermMemoryRecallBlock` hides `riskFlags`.

When it fails for that reason, modify `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts` so the rendered recall block includes one compact technical line:

```ts
`risk_flags=${bundle.intent.riskFlags.join(',') || 'none'}`
```

Do not add any persona wording or fixed fallback sentence.

- [ ] **Step 3: Add main chat regression for visible memory blocks**

In `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`, add or extend a test:

```ts
it('injects WorkingMemory and long-term recall blocks in the same provider message stack', async () => {
  const capturedMessages: Array<{ role: string, content: unknown }> = []
  const runtime = createAlicizationMainChatSessionRuntime({
    ...createMainChatSessionRuntimeTestOptions({
      onProviderMessages(messages) {
        capturedMessages.push(...messages)
      },
    }),
    retrieveLongTermMemoryEvidence: async () => ({
      intent: {
        mode: 'episodic',
        shouldRecall: true,
        confidence: 0.82,
        rationale: 'shared game memory',
        temporalFocus: 'recent-or-mid',
        targetKinds: ['episode'],
        queryHints: ['打游戏'],
        riskFlags: [],
      },
      plan: {
        rawQuery: '我们去打游戏吧',
        normalizedQuery: '我们去打游戏吧',
        keywordQueries: ['打游戏'],
        phraseQueries: ['打游戏'],
        charGramQueries: ['游戏'],
        semanticQueries: ['共同经历'],
        episodicQueries: ['一起玩过的游戏'],
        temporalHints: ['上周'],
        entityHints: ['游戏'],
        procedureHints: [],
        threadHints: [],
        negativeCues: [],
        confidencePolicy: 'direct',
        riskFlags: [],
        targetKinds: ['episode'],
      },
      evidence: [],
      confidence: 0.8,
      budgetClass: 'light',
    }),
  })

  await runtime.prepareExecution(createMainChatSessionRuntimeTestInput({
    messages: [{ role: 'user', content: '我们去打游戏吧' }],
  }))

  const text = capturedMessages.map(message => String(message.content)).join('\n')
  expect(text).toContain('"type":"alicization-turn-memory-context"')
  expect(text).toContain('"owner":"long-term-memory-recall"')
})
```

Before adding this test, inspect the local test harness with:

```bash
rg -n "onProviderMessages|prepareExecution|retrieveLongTermMemoryEvidence|createMainChatSessionRuntimeTest" apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts
```

Use the discovered hook/helper names in the setup. The final assertions must remain exactly:

```ts
expect(text).toContain('"type":"alicization-turn-memory-context"')
expect(text).toContain('"owner":"long-term-memory-recall"')
```

- [ ] **Step 4: Run focused main chat tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "WorkingMemory|long-term recall|provider message stack"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts
git commit -m "test(alicization): cover memory workbench dialogue loop"
```

## Task 10: Existing UI Cleanup And Navigation Guard

**Files:**
- Modify: `apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer.vue`
- Modify: `packages/stage-ui/src/stores/mind-replay-humanlike-memory-audit-panel.test.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/index.vue`

- [ ] **Step 1: Add a guard test for no duplicate memory workbench in devtools**

Modify `packages/stage-ui/src/stores/mind-replay-humanlike-memory-audit-panel.test.ts`:

```ts
it('keeps memory workbench separate from trace-specific mind replay audit', () => {
  const mindReplaySource = readFileSync(new URL('../../../stage-pages/src/pages/devtools/mind-replay.vue', import.meta.url), 'utf8')
  const auditPanelSource = readFileSync(new URL('../../../stage-pages/src/pages/devtools/components/mind-replay-humanlike-memory-audit-panel.vue', import.meta.url), 'utf8')

  expect(mindReplaySource).toContain('MindReplayHumanlikeMemoryAuditPanel')
  expect(auditPanelSource).toContain('useAlicizationHumanlikeMemoryAuditStore')
  expect(mindReplaySource).not.toContain('useAlicizationMemoryWorkbenchStore')
  expect(auditPanelSource).not.toContain('useAlicizationMemoryWorkbenchStore')
})
```

- [ ] **Step 2: Run guard test**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/mind-replay-humanlike-memory-audit-panel.test.ts
```

Expected: PASS.

- [ ] **Step 3: Decide and apply the performance visualizer link**

Inspect the existing `performance-visualizer.vue` header/action layout:

```bash
rg -n "header|actions|button|router|useRouter" apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer.vue
```

Decision rule:

- If the file has an existing compact header/action button group, add one small route link to `/settings/memory`.
- If the file has no compact header/action button group, do not modify `performance-visualizer.vue`; rely on the settings route entry and the guard test.

Do not import `useAlicizationMemoryWorkbenchStore` there.

Use Vue router:

```ts
const router = useRouter()

function openMemoryWorkbench() {
  void router.push('/settings/memory')
}
```

Add a small button in the existing header action group:

```vue
<button
  type="button"
  :class="['inline-flex', 'items-center', 'gap-2', 'border', 'border-neutral-200', 'px-3', 'py-2', 'text-xs', 'text-neutral-600', 'dark:border-neutral-800', 'dark:text-neutral-300']"
  @click="openMemoryWorkbench"
>
  <span class="i-solar:database-bold-duotone" />
  <span>{{ t('settings.pages.memory.workbench.title') }}</span>
</button>
```

- [ ] **Step 4: Confirm settings index discovers the page**

Confirm the settings index discovers routes with `settingsEntry`:

```bash
rg -n "settingsEntry|titleKey|routes" apps/stage-tamagotchi/src/renderer/pages/settings/index.vue apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue
```

The new page route must have:

```yaml
settingsEntry: true
```

Do not modify the settings index discovery loop unless the `rg` output proves it no longer uses `settingsEntry`.

- [ ] **Step 5: Commit**

```bash
git add packages/stage-ui/src/stores/mind-replay-humanlike-memory-audit-panel.test.ts apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer.vue apps/stage-tamagotchi/src/renderer/pages/settings/index.vue
git commit -m "chore(alicization): keep memory workbench separate from devtools"
```

If `performance-visualizer.vue` and `settings/index.vue` are unchanged, run:

```bash
git add packages/stage-ui/src/stores/mind-replay-humanlike-memory-audit-panel.test.ts
git commit -m "chore(alicization): keep memory workbench separate from devtools"
```

## Task 11: Final Verification

**Files:**
- No new source files unless earlier tests reveal a specific defect.

- [ ] **Step 1: Run backend memory tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-review-queue.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run DB focused tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "WorkingMemory|long-term memory|memory workbench|recall probe|review action|tombstone"
```

Expected: PASS.

- [ ] **Step 3: Run renderer/store tests**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/stores/alicization-memory-workbench.test.ts packages/stage-ui/src/stores/alicization-bridge.test.ts apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run typechecks**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
pnpm -F @proj-alicization/stage-tamagotchi typecheck:web
```

Expected: PASS.

- [ ] **Step 5: Run full package typecheck**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
```

Expected: PASS.

- [ ] **Step 6: Manual UI smoke test**

Run the app:

```bash
pnpm -F @proj-alicization/stage-tamagotchi dev
```

Manual checks:

- Open Settings.
- Confirm "记忆中心" appears as a settings entry.
- Open "记忆中心".
- Confirm top health summary renders.
- Send one normal dialogue turn.
- Refresh "当前短期记忆"; confirm WorkingMemory snapshot appears.
- Open "召回测试"; enter `我们去打游戏吧`; confirm intent/plan/evidence area renders.
- Open "待审核"; if review items exist, approve/reject buttons call API without page crash.
- Confirm errors show as concrete technical messages, not fixed persona fallback text.

- [ ] **Step 7: Commit verification fixes when files changed**

When verification required fixes and `git status --short` shows source changes from this task, commit them:

```bash
git add <changed-files>
git commit -m "fix(alicization): stabilize memory workbench verification"
```

When all verification commands pass and `git status --short` shows no source changes from this task, do not create an empty commit.

## Completion Criteria

Implementation is complete only when all of the following are true:

- Main dialogue and UI share the same `WorkingMemoryStore`.
- `MemoryWorkbench` Eventa APIs can return snapshot, long-term list, review action result, and recall probe result.
- `/settings/memory` exists and is discoverable from settings.
- UI text is Chinese-first for `zh-Hans`.
- Existing devtools memory/trace panels remain available and are not overloaded with user-facing memory management.
- Recall probe can explain intent, query plan, evidence, latency, and errors.
- Review queue supports approve, reject, tombstone, inward-only, and no-training actions at the bridge/store/UI level.
- Tombstoned memory does not appear in recall evidence.
- Provider/recall failure does not output fixed persona fallback text.
- Focused tests and stage-tamagotchi typechecks pass.

## Self-Review Checklist

- Spec coverage:
  - Runtime API: Tasks 1, 3, 4, 5.
  - WorkingMemory owner visibility: Tasks 2, 3, 8, 9.
  - Long-term memory list/review/tombstone: Tasks 3, 4, 7, 8.
  - Recall probe: Tasks 1, 4, 7, 8, 9.
  - UI panel: Tasks 6, 7, 8, 10.
  - Existing UI cleanup/avoid duplication: Task 10.
  - Failure transparency: Tasks 3, 5, 9.
  - Performance and nonblocking behavior: Tasks 3, 5, 11.
- Type consistency:
  - Eventa DTO names use `AlicizationMemoryWorkbench*`.
  - Bridge method names use `memoryWorkbench*`.
  - Store name is `useAlicizationMemoryWorkbenchStore`.
  - Route path is `/settings/memory`.
- Scope control:
  - No automatic LoRA training.
  - No graph database.
  - No full chat UI rewrite.
  - No raw transcript training.

# Alicization Memory Quality Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立第一版记忆质量评测闭环：长期召回 harness 输出完整指标和 trace，WorkingMemory 压缩 harness 检测短期义务丢失，并提供可聚合的质量报告入口。

**Architecture:** 保留 `WorkingMemory` 和 `LongTermMemoryRecall` 的 owner 边界。扩展现有 `long-term-memory-harness.ts`，新增 `working-memory-quality-harness.ts` 和 `memory-quality-harness.ts`，先做纯 TypeScript harness，不把 Workbench 或 DB facade 变成业务 owner；DB-backed 召回通过可注入函数接入，后续再接真实持久化 summary。

**Tech Stack:** TypeScript, Vitest, Electron main-process service modules, existing WorkingMemory/LongTermMemoryRecall helpers, direct `./node_modules/.bin/vitest` verification.

---

## 相关文档

- Spec: `docs/superpowers/specs/2026-07-05-alicization-memory-quality-harness-design.md`
- 生命核心设计: `docs/superpowers/specs/2026-07-01-alicization-life-core-reset-design.md`
- WorkingMemory 设计: `docs/superpowers/specs/2026-07-01-alicization-working-memory-design.md`
- 长期记忆 Phase 2 计划: `docs/superpowers/plans/2026-07-03-alicization-long-term-memory-phase2-implementation-plan.md`
- Memory Workbench 产品化计划: `docs/superpowers/plans/2026-07-04-alicization-memory-workbench-productization-implementation-plan.md`

## 文件结构

### 修改文件

- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.ts`  
  扩展长期召回 harness 指标、trace artifact、语义命中和 blocked leak 统计。

- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts`  
  覆盖 `recallAtK`、`ndcg`、semantic hit、blocked leak、trace rank reasons。

### 新增文件

- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.ts`  
  评估 WorkingMemory 压缩后 active task、questions、commitments、corrections、failure audit 和 candidate 边界是否保留。

- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts`  
  覆盖压缩后义务保留、失败透明、candidate 不被当成 confirmed memory。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.ts`  
  聚合长期召回和 WorkingMemory quality results；提供 DB-backed recall 的可注入入口。

- `apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts`  
  覆盖聚合报告、DB-backed recall 成功、recall 失败透明降级。

## 执行约束

- 不修改 `.serena/project.yml`。
- 不 stage 现有两个未跟踪旧计划文档。
- 不把 raw transcript 写入 trace。
- 不把 review queue candidate 当作 confirmed long-term memory。
- 不让 embedding/provider 失败产出看起来成功的质量结果。
- 每个 task 通过后做小步 Conventional Commit。

---

## Task 1: 扩展 LongTermMemory Harness 指标和 Trace

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts`

- [ ] **Step 1: 写失败测试，锁定新指标和 trace**

在 `long-term-memory-harness.test.ts` 增加：

```ts
it('emits trace metrics for semantic hits, NDCG, and blocked leaks', () => {
  const result = runLongTermMemoryHarnessFixture({
    now,
    fixture: {
      id: 'semantic-fixed-template-correction',
      currentUserText: '你还记得我不要固定模板回复吗？',
      expectedMode: 'relationship',
      expectedTopIds: ['reflection-fixed-template'],
      forbiddenTopIds: ['generic-progress'],
      blockedIds: ['tombstoned-fixed-template'],
      semanticExpectedIds: ['reflection-fixed-template'],
      semanticScores: {
        'reflection-fixed-template': 0.92,
        'generic-progress': 0.2,
      },
      semantic: {
        available: true,
        providerId: 'test-provider',
        modelId: 'test-embedding',
        dimensions: 3,
        reindexRequired: false,
      },
      candidates: [
        {
          id: 'reflection-fixed-template',
          kind: 'reflection',
          summary: '用户纠正过：不要固定模板回复，要透明说失败。',
          source: 'memory_reflections',
          confidence: 0.9,
          salience: 0.9,
          cues: ['固定模板', '失败透明'],
        },
        {
          id: 'generic-progress',
          kind: 'consolidation',
          summary: '用户问过项目进度。',
          source: 'memory_consolidations',
          confidence: 0.4,
          salience: 0.3,
          cues: ['进度'],
        },
        {
          id: 'tombstoned-fixed-template',
          kind: 'reflection',
          summary: '这条旧纠正已经被 tombstone，不应召回。',
          source: 'memory_reflections',
          confidence: 0.95,
          salience: 0.95,
          cues: ['固定模板'],
        },
      ],
    },
  })

  expect(result.metrics.recallAtK).toBe(1)
  expect(result.metrics.ndcg).toBeGreaterThan(0.9)
  expect(result.metrics.semanticHitRate).toBe(1)
  expect(result.metrics.blockedLeakCount).toBe(0)
  expect(result.trace.owner).toBe('LongTermMemoryRecall')
  expect(result.trace.rankReasonsById['reflection-fixed-template']).toEqual(
    expect.arrayContaining(['rrf:semantic:semantic-score']),
  )
  expect(result.trace.semantic).toEqual(expect.objectContaining({
    available: true,
    modelId: 'test-embedding',
  }))
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts
```

Expected: FAIL，提示 `blockedIds`、`semanticExpectedIds`、`semanticScores`、`metrics` 或 `trace` 不存在。

- [ ] **Step 3: 扩展 harness 类型**

在 `long-term-memory-harness.ts` 中加入：

```ts
export interface LongTermMemoryHarnessSemanticState {
  available: boolean
  providerId: string | null
  modelId: string | null
  dimensions: number | null
  reindexRequired: boolean
}

export interface LongTermMemoryHarnessMetrics {
  recallAtK: number
  precisionAtK: number
  mrr: number
  ndcg: number
  falseRecallRate: number
  wrongThreadRate: number
  blockedLeakCount: number
  semanticHitRate: number
  sourceTraceRate: number
  latencyMs: number
}

export interface LongTermMemoryHarnessTrace {
  id: string
  fixtureId: string
  owner: 'LongTermMemoryRecall'
  query: string
  intentMode: LongTermMemoryEvidenceBundle['intent']['mode'] | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: LongTermMemoryHarnessSemanticState
  metrics: LongTermMemoryHarnessMetrics
  error: string | null
  createdAt: number
}
```

扩展 `LongTermMemoryHarnessFixture`：

```ts
  blockedIds?: string[]
  wrongThreadIds?: string[]
  semanticExpectedIds?: string[]
  semanticScores?: Record<string, number>
  semantic?: LongTermMemoryHarnessSemanticState
  latencyMs?: number
```

扩展 `LongTermMemoryHarnessResult`：

```ts
  metrics: LongTermMemoryHarnessMetrics
  trace: LongTermMemoryHarnessTrace
```

- [ ] **Step 4: 增加指标 helper**

在 `long-term-memory-harness.ts` 中加入：

```ts
function binaryNdcgAtK(topIds: string[], expectedIds: string[]) {
  if (expectedIds.length === 0)
    return topIds.length === 0 ? 1 : 0
  const expectedSet = new Set(expectedIds)
  const dcg = topIds.reduce((sum, id, index) => {
    const relevance = expectedSet.has(id) ? 1 : 0
    return sum + relevance / Math.log2(index + 2)
  }, 0)
  const idealHits = Math.min(expectedIds.length, topIds.length)
  const idcg = Array.from({ length: idealHits }).reduce((sum, _item, index) => {
    return sum + 1 / Math.log2(index + 2)
  }, 0)
  return idcg > 0 ? clamp01(dcg / idcg) : 0
}

function defaultSemanticState(): LongTermMemoryHarnessSemanticState {
  return {
    available: false,
    providerId: null,
    modelId: null,
    dimensions: null,
    reindexRequired: false,
  }
}
```

- [ ] **Step 5: 将 semanticScores 传给 evidence bundle，并产出 metrics/trace**

在 `runLongTermMemoryHarnessFixture` 中把 bundle 构建改为：

```ts
  const bundle = buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    candidates: fixture.candidates.filter(candidate => !(fixture.blockedIds ?? []).includes(candidate.id)),
    now: input.now,
    limit: fixture.limit ?? 5,
    semanticScores: fixture.semanticScores,
  })
```

然后在返回前计算：

```ts
  const selectedSet = new Set(topIds)
  const blockedLeakCount = (fixture.blockedIds ?? []).filter(id => selectedSet.has(id)).length
  const wrongThreadCount = (fixture.wrongThreadIds ?? []).filter(id => selectedSet.has(id)).length
  const semanticExpectedIds = fixture.semanticExpectedIds ?? []
  const semanticHitCount = semanticExpectedIds.filter(id =>
    selectedSet.has(id) && (fixture.semanticScores?.[id] ?? 0) > 0,
  ).length
  const metrics: LongTermMemoryHarnessMetrics = {
    recallAtK: fixture.expectedTopIds.length === 0 ? 1 : clamp01(hitCount / fixture.expectedTopIds.length),
    precisionAtK: topIds.length === 0 ? (fixture.expectedTopIds.length === 0 ? 1 : 0) : clamp01(hitCount / topIds.length),
    mrr: firstExpectedIndex >= 0 ? 1 / (firstExpectedIndex + 1) : 0,
    ndcg: binaryNdcgAtK(topIds, fixture.expectedTopIds),
    falseRecallRate: topIds.length === 0 ? 0 : clamp01(falseRecallCount / topIds.length),
    wrongThreadRate: topIds.length === 0 ? 0 : clamp01(wrongThreadCount / topIds.length),
    blockedLeakCount,
    semanticHitRate: semanticExpectedIds.length === 0 ? 1 : clamp01(semanticHitCount / semanticExpectedIds.length),
    sourceTraceRate: bundle.evidence.length === 0 ? 1 : clamp01(tracedCount / bundle.evidence.length),
    latencyMs: Math.max(0, Math.floor(fixture.latencyMs ?? 0)),
  }
  const trace: LongTermMemoryHarnessTrace = {
    id: `long-term-memory-harness:${fixture.id}:${input.now}`,
    fixtureId: fixture.id,
    owner: 'LongTermMemoryRecall',
    query: fixture.currentUserText,
    intentMode: bundle.intent.mode,
    queryPlan: {
      lexicalQueries: bundle.plan.keywordQueries,
      phraseQueries: bundle.plan.phraseQueries,
      semanticQueries: bundle.plan.semanticQueries,
      threadHints: bundle.plan.threadHints,
    },
    selectedIds: topIds,
    rejectedIds: fixture.candidates.map(candidate => candidate.id).filter(id => !selectedSet.has(id)),
    forbiddenIds: fixture.forbiddenTopIds ?? [],
    rankReasonsById: Object.fromEntries(bundle.evidence.map(item => [item.candidate.id, item.rankReasons])),
    semantic: fixture.semantic ?? defaultSemanticState(),
    metrics,
    error: null,
    createdAt: input.now,
  }
```

把旧字段保留为兼容别的测试：

```ts
    hitRate: metrics.recallAtK,
    precisionAtK: metrics.precisionAtK,
    mrr: metrics.mrr,
    falseRecallCount,
    sourceTraceRate: metrics.sourceTraceRate,
    metrics,
    trace,
    passed: modePassed && expectedPass && falseRecallCount === 0 && blockedLeakCount === 0,
```

- [ ] **Step 6: 更新 suite 聚合**

在 `runLongTermMemoryHarnessSuite` 返回值中加入：

```ts
    averageNdcg: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.metrics.ndcg, 0) / results.length,
    blockedLeakCount: results.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
    semanticHitRate: results.length === 0 ? 1 : results.reduce((sum, result) => sum + result.metrics.semanticHitRate, 0) / results.length,
    traces: results.map(result => result.trace),
```

- [ ] **Step 7: 跑长期 harness 测试**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts
```

Expected: PASS。

- [ ] **Step 8: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts
git commit -m "feat(alicization): add memory recall quality traces"
```

---

## Task 2: 新增 WorkingMemory Compression Quality Harness

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `working-memory-quality-harness.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import type { WorkingMemorySnapshot } from './working-memory'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { runWorkingMemoryQualityHarnessFixture } from './working-memory-quality-harness'

function baseSnapshot(): WorkingMemorySnapshot {
  return createEmptyWorkingMemorySnapshot({
    cardId: 'card-quality',
    sessionId: 'session-quality',
    now: 1000,
  })
}

describe('working memory quality harness', () => {
  it('detects whether compression preserves active obligations and failure transparency', () => {
    const snapshot: WorkingMemorySnapshot = {
      ...baseSnapshot(),
      recentRawTurns: Array.from({ length: 7 }).map((_, index) => ({
        turnId: `turn-${index + 1}`,
        role: index % 2 === 0 ? 'user' : 'alice',
        text: index === 2 ? 'Provider timed out, please say it plainly.' : `turn ${index + 1}`,
        createdAt: 1000 + index,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: index === 2 ? 'provider-error' : null,
        importance: index === 2 ? 0.9 : 0.4,
      })),
      currentThread: {
        title: '记忆质量 harness',
        currentUserMove: '继续做质量评测',
        currentAliceMove: '写 WorkingMemory compression harness',
        primaryAnchor: 'working-memory-quality-harness.ts',
        mode: 'task',
        shouldHold: true,
        confidence: 0.88,
      },
      activeTask: {
        summary: '完成 WorkingMemory compression harness',
        status: 'active',
        evidenceTurnIds: ['turn-7'],
      },
      unresolvedQuestions: [{ text: '是否把 harness 摘要接入 Workbench？', sourceTurnId: 'turn-1' }],
      commitments: [{ text: '保持失败面透明，不用固定模板遮盖。', sourceTurnId: 'turn-2' }],
      userCorrections: [{ text: '不要把 provider 失败包装成正常人格回复。', sourceTurnId: 'turn-3', scope: 'reply' }],
      audit: {
        failureTurnIds: ['turn-3'],
        excludedLongTermCandidateTurnIds: ['turn-3'],
        notes: ['provider failure stayed explicit'],
      },
      longTermCandidates: [{
        sourceTurnIds: ['turn-3'],
        kind: 'correction',
        summary: '不要把 provider 失败包装成正常人格回复。',
        reason: '用户纠正失败透明。',
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
        allowTraining: false,
      }],
    }

    const result = runWorkingMemoryQualityHarnessFixture({
      fixture: {
        id: 'failure-transparency-compression',
        snapshot,
        maxRawTurns: 3,
        now: 2000,
        expectedTaskIncludes: ['WorkingMemory compression harness'],
        expectedQuestionIncludes: ['Workbench'],
        expectedCommitmentIncludes: ['失败面透明'],
        expectedCorrectionIncludes: ['provider 失败'],
        expectedFailureTurnIds: ['turn-3'],
        forbiddenConfirmedCandidateText: ['long_term_candidates=', 'candidate=turn-3'],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.metrics.obligationRetentionRate).toBe(1)
    expect(result.metrics.failureTransparencyRetentionRate).toBe(1)
    expect(result.metrics.candidateBoundaryViolationCount).toBe(0)
    expect(result.trace.owner).toBe('WorkingMemory')
    expect(result.trace.selectedIds).toEqual(expect.arrayContaining(['task', 'failure:turn-3']))
  })

  it('fails when a required correction is missing from the compressed prompt view', () => {
    const result = runWorkingMemoryQualityHarnessFixture({
      fixture: {
        id: 'missing-correction',
        snapshot: baseSnapshot(),
        now: 2000,
        expectedCorrectionIncludes: ['不要固定模板'],
      },
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.compressionLossCount).toBeGreaterThan(0)
    expect(result.trace.error).toContain('missing-correction')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts
```

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 创建 WorkingMemory quality harness**

创建 `working-memory-quality-harness.ts`：

```ts
import type { WorkingMemoryPromptView } from './working-memory-prompt-view'
import type { WorkingMemorySnapshot } from './working-memory'

import { compressWorkingMemorySnapshot } from './working-memory-compressor'
import { buildWorkingMemoryPromptView } from './working-memory-prompt-view'

export interface WorkingMemoryQualityFixture {
  id: string
  snapshot: WorkingMemorySnapshot
  compressedSnapshot?: WorkingMemorySnapshot
  maxRawTurns?: number
  now: number
  expectedTaskIncludes?: string[]
  expectedQuestionIncludes?: string[]
  expectedCommitmentIncludes?: string[]
  expectedCorrectionIncludes?: string[]
  expectedFailureTurnIds?: string[]
  forbiddenConfirmedCandidateText?: string[]
}

export interface WorkingMemoryQualityMetrics {
  obligationRetentionRate: number
  correctionRetentionRate: number
  commitmentRetentionRate: number
  failureTransparencyRetentionRate: number
  candidateBoundaryViolationCount: number
  compressionLossCount: number
}

export interface WorkingMemoryQualityTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory'
  query: string
  intentMode: string | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: false
    providerId: null
    modelId: null
    dimensions: null
    reindexRequired: false
  }
  metrics: WorkingMemoryQualityMetrics
  error: string | null
  createdAt: number
}

export interface WorkingMemoryQualityResult {
  fixtureId: string
  compressedSnapshot: WorkingMemorySnapshot
  view: WorkingMemoryPromptView
  metrics: WorkingMemoryQualityMetrics
  trace: WorkingMemoryQualityTrace
  passed: boolean
}

function includesAny(text: string, expected: string[]) {
  if (expected.length === 0)
    return true
  return expected.every(item => text.includes(item))
}

function scoreExpected(expected: string[], actualText: string) {
  if (expected.length === 0)
    return 1
  const hits = expected.filter(item => actualText.includes(item)).length
  return hits / expected.length
}

function buildFailureText(view: WorkingMemoryPromptView) {
  return [
    ...view.modules.audit.failureTurnIds.map(id => `failure:${id}`),
    ...view.modules.audit.notes,
    ...view.rendering.blockLines,
  ].join('\n')
}

export function runWorkingMemoryQualityHarnessFixture(input: {
  fixture: WorkingMemoryQualityFixture
}): WorkingMemoryQualityResult {
  const fixture = input.fixture
  const compressedSnapshot = fixture.compressedSnapshot ?? compressWorkingMemorySnapshot(fixture.snapshot, {
    maxRawTurns: fixture.maxRawTurns ?? 6,
    now: fixture.now,
  })
  const view = buildWorkingMemoryPromptView(compressedSnapshot)
  const block = view.rendering.blockLines.join('\n')
  const taskText = [
    view.modules.task.summary ?? '',
    view.modules.task.status ?? '',
    view.modules.thread.title ?? '',
    view.modules.thread.currentUserMove ?? '',
  ].join('\n')
  const questionText = view.modules.unresolvedQuestions.join('\n')
  const commitmentText = view.modules.commitments.join('\n')
  const correctionText = view.modules.corrections.map(item => `${item.scope}:${item.text}`).join('\n')
  const failureText = buildFailureText(view)

  const taskScore = scoreExpected(fixture.expectedTaskIncludes ?? [], taskText)
  const questionScore = scoreExpected(fixture.expectedQuestionIncludes ?? [], questionText)
  const commitmentScore = scoreExpected(fixture.expectedCommitmentIncludes ?? [], commitmentText)
  const correctionScore = scoreExpected(fixture.expectedCorrectionIncludes ?? [], correctionText)
  const failureScore = scoreExpected((fixture.expectedFailureTurnIds ?? []).map(id => `failure:${id}`), failureText)
  const candidateBoundaryViolationCount = (fixture.forbiddenConfirmedCandidateText ?? [])
    .filter(text => block.includes(text))
    .length
  const missingReasons = [
    !includesAny(taskText, fixture.expectedTaskIncludes ?? []) ? 'missing-task' : null,
    !includesAny(questionText, fixture.expectedQuestionIncludes ?? []) ? 'missing-question' : null,
    !includesAny(commitmentText, fixture.expectedCommitmentIncludes ?? []) ? 'missing-commitment' : null,
    !includesAny(correctionText, fixture.expectedCorrectionIncludes ?? []) ? 'missing-correction' : null,
    !includesAny(failureText, (fixture.expectedFailureTurnIds ?? []).map(id => `failure:${id}`)) ? 'missing-failure' : null,
    candidateBoundaryViolationCount > 0 ? 'candidate-boundary-violation' : null,
  ].filter(Boolean) as string[]
  const compressionLossCount = missingReasons.filter(reason => reason.startsWith('missing-')).length
  const metrics: WorkingMemoryQualityMetrics = {
    obligationRetentionRate: (taskScore + questionScore) / 2,
    correctionRetentionRate: correctionScore,
    commitmentRetentionRate: commitmentScore,
    failureTransparencyRetentionRate: failureScore,
    candidateBoundaryViolationCount,
    compressionLossCount,
  }
  const selectedIds = [
    metrics.obligationRetentionRate === 1 ? 'task' : null,
    ...view.modules.audit.failureTurnIds.map(id => `failure:${id}`),
  ].filter(Boolean) as string[]

  const trace: WorkingMemoryQualityTrace = {
    id: `working-memory-quality:${fixture.id}:${fixture.now}`,
    fixtureId: fixture.id,
    owner: 'WorkingMemory',
    query: fixture.id,
    intentMode: view.modules.thread.mode,
    queryPlan: {
      lexicalQueries: view.modules.memoryQueryHints,
      phraseQueries: [],
      semanticQueries: [],
      threadHints: [view.modules.thread.title ?? '', view.modules.task.summary ?? ''].filter(Boolean),
    },
    selectedIds,
    rejectedIds: missingReasons,
    forbiddenIds: fixture.forbiddenConfirmedCandidateText ?? [],
    rankReasonsById: Object.fromEntries(selectedIds.map(id => [id, ['working-memory:retained']])),
    semantic: {
      available: false,
      providerId: null,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    metrics,
    error: missingReasons.length > 0 ? missingReasons.join(';') : null,
    createdAt: fixture.now,
  }

  return {
    fixtureId: fixture.id,
    compressedSnapshot,
    view,
    metrics,
    trace,
    passed: missingReasons.length === 0,
  }
}

export function runWorkingMemoryQualityHarnessSuite(input: {
  fixtures: WorkingMemoryQualityFixture[]
}) {
  const results = input.fixtures.map(fixture => runWorkingMemoryQualityHarnessFixture({ fixture }))
  return {
    results,
    traces: results.map(result => result.trace),
    passed: results.every(result => result.passed),
    compressionLossCount: results.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
    candidateBoundaryViolationCount: results.reduce((sum, result) => sum + result.metrics.candidateBoundaryViolationCount, 0),
  }
}
```

- [ ] **Step 4: 跑测试**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts
git commit -m "feat(alicization): add working memory quality harness"
```

---

## Task 3: 新增 Memory Quality 聚合总线和 DB-backed Recall 入口

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `memory-quality-harness.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'

import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  runDbBackedLongTermMemoryQualityFixture,
  runMemoryQualityHarnessSuite,
} from './memory-quality-harness'

function bundleFor(query: string): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({ currentUserText: query })
  const plan = buildLongTermMemoryQueryPlan({ intent, currentUserText: query })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    now: 3000,
    limit: 3,
    semanticScores: { 'reflection-fixed-template': 0.9 },
    candidates: [{
      id: 'reflection-fixed-template',
      kind: 'reflection',
      summary: '用户纠正过不要固定模板回复。',
      source: 'memory_reflections',
      confidence: 0.9,
      salience: 0.9,
      cues: ['固定模板'],
    }],
  })
}

describe('memory quality harness', () => {
  it('evaluates a DB-backed long-term recall function with explicit trace output', async () => {
    const recall = vi.fn(async () => bundleFor('你还记得我不要固定模板回复吗？'))
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-fixed-template',
        cardId: 'card-1',
        query: '你还记得我不要固定模板回复吗？',
        expectedTopIds: ['reflection-fixed-template'],
        semantic: {
          available: true,
          providerId: 'test-provider',
          modelId: 'test-embedding',
          dimensions: 3,
          reindexRequired: false,
        },
      },
      recall,
      now: vi.fn()
        .mockReturnValueOnce(3000)
        .mockReturnValueOnce(3017),
    })

    expect(recall).toHaveBeenCalledWith({
      cardId: 'card-1',
      currentUserText: '你还记得我不要固定模板回复吗？',
      limit: 5,
    })
    expect(result.passed).toBe(true)
    expect(result.metrics.latencyMs).toBe(17)
    expect(result.trace.selectedIds).toEqual(['reflection-fixed-template'])
    expect(result.trace.semantic.available).toBe(true)
  })

  it('keeps recall failures explicit instead of returning a successful-looking result', async () => {
    const result = await runDbBackedLongTermMemoryQualityFixture({
      fixture: {
        id: 'db-backed-provider-failure',
        cardId: 'card-1',
        query: '继续上次那个开发任务',
        expectedTopIds: ['task-memory'],
      },
      recall: async () => {
        throw new Error('embedding provider timeout')
      },
      now: vi.fn()
        .mockReturnValueOnce(5000)
        .mockReturnValueOnce(5050),
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.recallAtK).toBe(0)
    expect(result.trace.error).toBe('embedding provider timeout')
  })

  it('aggregates long-term and working-memory results into one quality report', async () => {
    const report = await runMemoryQualityHarnessSuite({
      createdAt: 7000,
      longTerm: [
        {
          fixture: {
            id: 'db-backed-fixed-template',
            cardId: 'card-1',
            query: '你还记得我不要固定模板回复吗？',
            expectedTopIds: ['reflection-fixed-template'],
          },
          recall: async () => bundleFor('你还记得我不要固定模板回复吗？'),
          now: vi.fn().mockReturnValueOnce(7000).mockReturnValueOnce(7001),
        },
      ],
      workingMemory: [],
    })

    expect(report.version).toBe('memory-quality-harness-v1')
    expect(report.passed).toBe(true)
    expect(report.summary.longTermFixtureCount).toBe(1)
    expect(report.traces).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts
```

Expected: FAIL，提示模块不存在。

- [ ] **Step 3: 创建聚合总线**

创建 `memory-quality-harness.ts`：

```ts
import type { WorkingMemoryQualityFixture, WorkingMemoryQualityResult, WorkingMemoryQualityTrace } from './life-core/working-memory-quality-harness'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type { LongTermMemoryHarnessMetrics, LongTermMemoryHarnessSemanticState, LongTermMemoryHarnessTrace } from './long-term-memory-harness'

import { errorMessageFrom } from '@moeru/std'

import { runWorkingMemoryQualityHarnessFixture } from './life-core/working-memory-quality-harness'
import { buildLongTermMemoryEvidenceBundle } from './long-term-memory-recall'

export interface DbBackedLongTermMemoryQualityFixture {
  id: string
  cardId: string
  query: string
  expectedTopIds: string[]
  forbiddenTopIds?: string[]
  blockedIds?: string[]
  limit?: number
  semantic?: LongTermMemoryHarnessSemanticState
}

export interface DbBackedLongTermMemoryQualityInput {
  fixture: DbBackedLongTermMemoryQualityFixture
  recall: (input: {
    cardId: string
    currentUserText: string
    limit: number
  }) => Promise<LongTermMemoryEvidenceBundle>
  now: () => number
}

export interface DbBackedLongTermMemoryQualityResult {
  fixtureId: string
  bundle: LongTermMemoryEvidenceBundle
  topIds: string[]
  metrics: LongTermMemoryHarnessMetrics
  trace: LongTermMemoryHarnessTrace
  passed: boolean
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function ndcg(topIds: string[], expectedIds: string[]) {
  if (expectedIds.length === 0)
    return topIds.length === 0 ? 1 : 0
  const expectedSet = new Set(expectedIds)
  const dcg = topIds.reduce((sum, id, index) => {
    return sum + (expectedSet.has(id) ? 1 : 0) / Math.log2(index + 2)
  }, 0)
  const idealHits = Math.min(expectedIds.length, topIds.length)
  const idcg = Array.from({ length: idealHits }).reduce((sum, _item, index) => {
    return sum + 1 / Math.log2(index + 2)
  }, 0)
  return idcg > 0 ? clamp01(dcg / idcg) : 0
}

function emptyBundleFrom(bundle: LongTermMemoryEvidenceBundle): LongTermMemoryEvidenceBundle {
  return buildLongTermMemoryEvidenceBundle({
    intent: bundle.intent,
    plan: bundle.plan,
    candidates: [],
    now: 0,
    limit: 1,
  })
}

function metricFromBundle(input: {
  bundle: LongTermMemoryEvidenceBundle
  expectedTopIds: string[]
  forbiddenTopIds: string[]
  blockedIds: string[]
  latencyMs: number
}) {
  const topIds = input.bundle.evidence.map(item => item.candidate.id)
  const expectedSet = new Set(input.expectedTopIds)
  const forbiddenSet = new Set(input.forbiddenTopIds)
  const blockedSet = new Set(input.blockedIds)
  const hitCount = topIds.filter(id => expectedSet.has(id)).length
  const falseRecallCount = topIds.filter(id => forbiddenSet.has(id)).length
  const blockedLeakCount = topIds.filter(id => blockedSet.has(id)).length
  const firstExpectedIndex = topIds.findIndex(id => expectedSet.has(id))
  const tracedCount = input.bundle.evidence.filter(item => item.candidate.id && item.candidate.source).length
  const semanticHitCount = input.bundle.evidence.filter(item =>
    expectedSet.has(item.candidate.id)
    && item.rankReasons.some(reason => reason.startsWith('rrf:semantic')),
  ).length
  return {
    topIds,
    metrics: {
      recallAtK: input.expectedTopIds.length === 0 ? 1 : clamp01(hitCount / input.expectedTopIds.length),
      precisionAtK: topIds.length === 0 ? (input.expectedTopIds.length === 0 ? 1 : 0) : clamp01(hitCount / topIds.length),
      mrr: firstExpectedIndex >= 0 ? 1 / (firstExpectedIndex + 1) : 0,
      ndcg: ndcg(topIds, input.expectedTopIds),
      falseRecallRate: topIds.length === 0 ? 0 : clamp01(falseRecallCount / topIds.length),
      wrongThreadRate: 0,
      blockedLeakCount,
      semanticHitRate: input.expectedTopIds.length === 0 ? 1 : clamp01(semanticHitCount / input.expectedTopIds.length),
      sourceTraceRate: input.bundle.evidence.length === 0 ? 1 : clamp01(tracedCount / input.bundle.evidence.length),
      latencyMs: input.latencyMs,
    },
  }
}

function defaultSemantic(): LongTermMemoryHarnessSemanticState {
  return {
    available: false,
    providerId: null,
    modelId: null,
    dimensions: null,
    reindexRequired: false,
  }
}

export async function runDbBackedLongTermMemoryQualityFixture(input: DbBackedLongTermMemoryQualityInput): Promise<DbBackedLongTermMemoryQualityResult> {
  const startedAt = input.now()
  try {
    const bundle = await input.recall({
      cardId: input.fixture.cardId,
      currentUserText: input.fixture.query,
      limit: input.fixture.limit ?? 5,
    })
    const latencyMs = Math.max(0, input.now() - startedAt)
    const evaluated = metricFromBundle({
      bundle,
      expectedTopIds: input.fixture.expectedTopIds,
      forbiddenTopIds: input.fixture.forbiddenTopIds ?? [],
      blockedIds: input.fixture.blockedIds ?? [],
      latencyMs,
    })
    const selectedSet = new Set(evaluated.topIds)
    const trace: LongTermMemoryHarnessTrace = {
      id: `db-backed-memory-quality:${input.fixture.id}:${startedAt}`,
      fixtureId: input.fixture.id,
      owner: 'LongTermMemoryRecall',
      query: input.fixture.query,
      intentMode: bundle.intent.mode,
      queryPlan: {
        lexicalQueries: bundle.plan.keywordQueries,
        phraseQueries: bundle.plan.phraseQueries,
        semanticQueries: bundle.plan.semanticQueries,
        threadHints: bundle.plan.threadHints,
      },
      selectedIds: evaluated.topIds,
      rejectedIds: bundle.evidence.map(item => item.candidate.id).filter(id => !selectedSet.has(id)),
      forbiddenIds: input.fixture.forbiddenTopIds ?? [],
      rankReasonsById: Object.fromEntries(bundle.evidence.map(item => [item.candidate.id, item.rankReasons])),
      semantic: input.fixture.semantic ?? defaultSemantic(),
      metrics: evaluated.metrics,
      error: null,
      createdAt: startedAt,
    }
    return {
      fixtureId: input.fixture.id,
      bundle,
      topIds: evaluated.topIds,
      metrics: evaluated.metrics,
      trace,
      passed: evaluated.metrics.recallAtK > 0
        && evaluated.metrics.falseRecallRate === 0
        && evaluated.metrics.blockedLeakCount === 0,
    }
  }
  catch (error) {
    const latencyMs = Math.max(0, input.now() - startedAt)
    const message = errorMessageFrom(error) ?? String(error)
    const fallbackIntent = {
      mode: 'none',
      shouldRecall: false,
      confidence: 0,
      rationale: 'quality-harness-recall-failed',
      temporalFocus: 'unspecified',
      riskFlags: ['quality-harness-recall-failed'],
      targetKinds: [],
    } as LongTermMemoryEvidenceBundle['intent']
    const fallbackPlan = {
      rawQuery: input.fixture.query,
      normalizedQuery: input.fixture.query,
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
      riskFlags: ['quality-harness-recall-failed'],
      targetKinds: [],
    } as LongTermMemoryEvidenceBundle['plan']
    const bundle: LongTermMemoryEvidenceBundle = {
      intent: fallbackIntent,
      plan: fallbackPlan,
      evidence: [],
      confidence: 0,
      budgetClass: 'none',
    }
    const metrics: LongTermMemoryHarnessMetrics = {
      recallAtK: 0,
      precisionAtK: 0,
      mrr: 0,
      ndcg: 0,
      falseRecallRate: 0,
      wrongThreadRate: 0,
      blockedLeakCount: 0,
      semanticHitRate: 0,
      sourceTraceRate: 1,
      latencyMs,
    }
    return {
      fixtureId: input.fixture.id,
      bundle: emptyBundleFrom(bundle),
      topIds: [],
      metrics,
      trace: {
        id: `db-backed-memory-quality:${input.fixture.id}:${startedAt}`,
        fixtureId: input.fixture.id,
        owner: 'LongTermMemoryRecall',
        query: input.fixture.query,
        intentMode: 'none',
        queryPlan: {
          lexicalQueries: [],
          phraseQueries: [],
          semanticQueries: [],
          threadHints: [],
        },
        selectedIds: [],
        rejectedIds: [],
        forbiddenIds: input.fixture.forbiddenTopIds ?? [],
        rankReasonsById: {},
        semantic: input.fixture.semantic ?? defaultSemantic(),
        metrics,
        error: message,
        createdAt: startedAt,
      },
      passed: false,
    }
  }
}

export interface MemoryQualityHarnessReport {
  version: 'memory-quality-harness-v1'
  passed: boolean
  createdAt: number
  summary: {
    longTermFixtureCount: number
    workingMemoryFixtureCount: number
    failingFixtureIds: string[]
    recallAtK: number
    compressionLossCount: number
    blockedLeakCount: number
    lastError: string | null
  }
  longTerm: DbBackedLongTermMemoryQualityResult[]
  workingMemory: WorkingMemoryQualityResult[]
  traces: Array<LongTermMemoryHarnessTrace | WorkingMemoryQualityTrace>
}

export async function runMemoryQualityHarnessSuite(input: {
  createdAt: number
  longTerm: DbBackedLongTermMemoryQualityInput[]
  workingMemory: WorkingMemoryQualityFixture[]
}): Promise<MemoryQualityHarnessReport> {
  const longTerm = []
  for (const fixture of input.longTerm)
    longTerm.push(await runDbBackedLongTermMemoryQualityFixture(fixture))
  const workingMemory = input.workingMemory.map(fixture => runWorkingMemoryQualityHarnessFixture({ fixture }))
  const failingFixtureIds = [
    ...longTerm.filter(result => !result.passed).map(result => result.fixtureId),
    ...workingMemory.filter(result => !result.passed).map(result => result.fixtureId),
  ]
  const traces = [
    ...longTerm.map(result => result.trace),
    ...workingMemory.map(result => result.trace),
  ]
  const lastError = [...traces].reverse().find(trace => trace.error)?.error ?? null
  return {
    version: 'memory-quality-harness-v1',
    passed: failingFixtureIds.length === 0,
    createdAt: input.createdAt,
    summary: {
      longTermFixtureCount: longTerm.length,
      workingMemoryFixtureCount: workingMemory.length,
      failingFixtureIds,
      recallAtK: longTerm.length === 0 ? 1 : longTerm.reduce((sum, result) => sum + result.metrics.recallAtK, 0) / longTerm.length,
      compressionLossCount: workingMemory.reduce((sum, result) => sum + result.metrics.compressionLossCount, 0),
      blockedLeakCount: longTerm.reduce((sum, result) => sum + result.metrics.blockedLeakCount, 0),
      lastError,
    },
    longTerm,
    workingMemory,
    traces,
  }
}
```

- [ ] **Step 4: 跑聚合测试**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.ts apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts
git commit -m "feat(alicization): add memory quality harness aggregator"
```

---

## Task 4: 集成验证

**Files:**
- Verify only.

- [ ] **Step 1: 跑本轮 focused tests**

Run:

```bash
./node_modules/.bin/vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-quality-harness.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-quality-harness.test.ts
```

Expected: PASS。

- [ ] **Step 2: 跑相邻回归测试**

Run:

```bash
./node_modules/.bin/vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-hybrid-retrieval.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-compressor.test.ts
```

Expected: PASS。

- [ ] **Step 3: 跑 node typecheck**

Run from `apps/stage-tamagotchi`:

```bash
node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false
```

Expected: PASS。

- [ ] **Step 4: 检查 diff 和工作区**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: `git diff --check` 无输出；status 只包含本轮文件、既有 `.serena/project.yml` 修改和既有未跟踪旧计划文档。

- [ ] **Step 5: 若前面任务已有小步提交，本任务不额外提交；若有验证修复，单独提交**

```bash
git add <fixed-files>
git commit -m "test(alicization): verify memory quality harness"
```

仅在 Task 4 产生修复时执行。

## 自检覆盖

- Spec 的长期召回指标由 Task 1 覆盖。
- Spec 的 WorkingMemory compression-loss 指标由 Task 2 覆盖。
- Spec 的 trace artifact 和失败透明由 Task 1、Task 2、Task 3 覆盖。
- Spec 的 DB-backed 可注入召回入口由 Task 3 覆盖。
- Workbench UI summary 属于下一阶段；本计划只提供可聚合 report，不修改 Workbench owner 边界。

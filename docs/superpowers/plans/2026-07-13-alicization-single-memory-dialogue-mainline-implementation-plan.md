# Alicization Single Memory-Owned Dialogue Mainline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Current status (2026-07-16):** 单一 Provider 主链路已落地。本计划中曾保留的 Provider 候选重写重试与本地 mind renderer 已被后续实现明确删除；下文按现行边界更新。

**Goal:** 把 Alicization 的普通对话收敛为唯一 Provider 主链路，让正常可见回复只由 Provider 基于动态 SOUL、WorkingMemory、LongTermMemoryRecall 和真实工具事实生成，同时保留可审计的透明失败面与记忆学习排除。

**Architecture:** 在 `packages/stage-shared` 建立严格 Provider JSON Schema、可见 artifact 来源与失败排除合同；在 `apps/stage-tamagotchi` 将短期记忆和长期召回保存为 typed turn context，并以中性 JSON envelope 注入同一 Provider 请求；在 main process 和 renderer 删除 fast-path、固定自然语言 prompt、本地普通回复 repair 与 deterministic tool-success 台词。所有 Provider 候选在 Schema、来源与污染检测通过前保持 provisional；校验失败直接进入透明 FailureSurface，不发起回复重写请求。失败 artifact 贯穿 settlement、WorkingMemory 和 persona learning gate。

**Tech Stack:** TypeScript、Electron、Vue 3、Pinia、Eventa、xsAI `streamText` / `generateText`、Vitest、AJV、pnpm workspace

---

## 文件职责

- `packages/stage-shared/src/alicization-provider-response.ts`
  - 唯一 Provider 回复 JSON Schema、response format、memory usage claim、可见 artifact origin 和失败排除合同。
- `packages/stage-shared/src/alicization-chat-failure-surface.ts`
  - 透明失败分类和最小用户可见错误，不生成普通人格回复。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.ts`
  - 组合 WorkingMemory 与 LongTermMemoryRecall typed context，并序列化为中性 JSON envelope。
- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts`
  - 只生成 WorkingMemory 数据视图，不生成自然语言回复治理。
- `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.ts`
  - 保留 WorkingMemory owner 数据，删除 authority/mustDo/mustNotDo 自然语言 cue。
- `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts`
  - 保留召回意图、计划、证据与排序理由，输出 JSON envelope。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  - 每轮准备 typed memory context，记录 recall/enqueue failure，不创建第二套记忆 owner。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
  - 向 `streamText` 注入原生 `responseFormat`，缓存 provisional 输出，通过校验后才发布普通回复。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts`
  - 向 `generateText` 注入同一 `responseFormat`，不添加 emotion 或 contract 自然语言 system block。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
  - 只组合动态事实，不追加固定人格、continuity 或 reply governance system block。
- `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
  - 工具执行只生成 typed execution fact；最终普通回复仍由 Provider 生成。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
  - 删除 ordinary fast-path、execution-first deterministic visible payoff 和 compact timeout recovery。
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts`
  - timeout 直接落透明失败面，不恢复人格化正常回复。
- `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts`
  - 校验 artifact origin、Schema、memory usage claim 与污染状态；失败直接落透明 FailureSurface，不扩写或重写可见文本。
- `packages/stage-ui/src/composables/alicization-structured-output.ts`
  - 只解析/校验 Provider JSON，不再本地创作 thought/reply。
- `packages/stage-ui/src/stores/chat.ts`
  - renderer 只展示 Provider、failure-surface 或 authorization-surface artifact，不注入 retry prompt 或本地普通回复。
- `packages/stage-ui/src/stores/llm.ts`
  - renderer 直连 Provider 时透传同一原生 `responseFormat`，不创建独立输出协议。

### Task 1: 建立共享 Provider Schema、artifact 来源与失败排除合同

**Files:**
- Create: `packages/stage-shared/src/alicization-provider-response.ts`
- Create: `packages/stage-shared/src/alicization-provider-response.test.ts`
- Modify: `packages/stage-shared/src/alicization-chat-failure-surface.ts`
- Modify: `packages/stage-shared/src/alicization-chat-failure-surface.test.ts`
- Modify: `packages/stage-shared/src/index.ts`

- [ ] **Step 1: 写共享合同失败测试**

```ts
import { describe, expect, it } from 'vitest'

import {
  alicizationProviderResponseFormat,
  alicizationProviderResponseJsonSchema,
  createAlicizationProviderVisibleArtifact,
} from './alicization-provider-response'

describe('alicization provider response contract', () => {
  it('uses a strict native JSON Schema without natural-language reply policy', () => {
    expect(alicizationProviderResponseFormat.type).toBe('json_schema')
    expect(alicizationProviderResponseFormat.json_schema.strict).toBe(true)
    expect(alicizationProviderResponseJsonSchema.additionalProperties).toBe(false)
    expect(alicizationProviderResponseJsonSchema.required).toEqual([
      'format',
      'thought',
      'emotion',
      'reply',
      'performance',
      'memoryUsage',
    ])
    expect(JSON.stringify(alicizationProviderResponseJsonSchema)).not.toMatch(
      /same-her|陪伴|先共情|开场|结尾|语气|phase 1|project-state|continuity/i,
    )
  })

  it('marks normal visible text as provider-authored and trainable only after settlement', () => {
    expect(createAlicizationProviderVisibleArtifact({
      reply: '模型生成的回复',
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-1'],
      },
    })).toMatchObject({
      origin: 'provider',
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    })
  })
})
```

在失败面测试增加：

```ts
expect(resolveAlicizationChatFailureSurface({
  kind: 'provider-schema-unsupported',
})).toMatchObject({
  origin: 'failure-surface',
  allowLongTermCondensation: false,
  allowPersonaLearning: false,
  allowTraining: false,
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  packages/stage-shared/src/alicization-provider-response.test.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.test.ts
```

Expected: FAIL，提示 `alicization-provider-response` 模块不存在，且 `provider-schema-unsupported` 不属于失败类型。

- [ ] **Step 3: 实现最小共享合同**

`alicization-provider-response.ts` 使用以下公共形状：

```ts
import {
  alicizationEmotionWhitelist,
} from './alicization-performance-contracts'

export const alicizationVisibleArtifactOrigins = [
  'provider',
  'failure-surface',
  'authorization-surface',
] as const

export type AlicizationVisibleArtifactOrigin
  = typeof alicizationVisibleArtifactOrigins[number]

export interface AlicizationProviderMemoryUsage {
  workingMemoryVersion: string | null
  longTermEvidenceIds: string[]
}

export interface AlicizationVisibleArtifactLearningPolicy {
  allowLongTermCondensation: boolean
  allowPersonaLearning: boolean
  allowTraining: boolean
}

export interface AlicizationProviderVisibleArtifact
  extends AlicizationVisibleArtifactLearningPolicy {
  origin: 'provider'
  reply: string
  memoryUsage: AlicizationProviderMemoryUsage
}

const deliveryValues = [
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
] as const

export const alicizationProviderResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'format',
    'thought',
    'emotion',
    'reply',
    'performance',
    'memoryUsage',
  ],
  properties: {
    format: { type: 'string', const: 'mind-turn-v1' },
    thought: { type: 'string', maxLength: 2000 },
    emotion: { type: 'string', enum: [...alicizationEmotionWhitelist] },
    reply: { type: 'string', minLength: 1, maxLength: 12000 },
    performance: {
      type: 'object',
      additionalProperties: false,
      required: [
        'baseEmotion',
        'facialCue',
        'actionCue',
        'delivery',
        'emphasis',
      ],
      properties: {
        baseEmotion: { type: 'string', enum: [...alicizationEmotionWhitelist] },
        facialCue: { type: ['string', 'null'], maxLength: 80 },
        actionCue: { type: ['string', 'null'], maxLength: 80 },
        delivery: { type: 'string', enum: [...deliveryValues] },
        emphasis: { type: 'integer', enum: [0, 1, 2] },
      },
    },
    memoryUsage: {
      type: 'object',
      additionalProperties: false,
      required: ['workingMemoryVersion', 'longTermEvidenceIds'],
      properties: {
        workingMemoryVersion: { type: ['string', 'null'], maxLength: 120 },
        longTermEvidenceIds: {
          type: 'array',
          maxItems: 16,
          items: { type: 'string', minLength: 1, maxLength: 160 },
        },
      },
    },
  },
} as const

export const alicizationProviderResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_main_chat_turn',
    strict: true,
    schema: alicizationProviderResponseJsonSchema,
  },
} as const

export function createAlicizationProviderVisibleArtifact(input: {
  reply: string
  memoryUsage: AlicizationProviderMemoryUsage
}): AlicizationProviderVisibleArtifact {
  return {
    origin: 'provider',
    reply: input.reply,
    memoryUsage: input.memoryUsage,
    allowLongTermCondensation: true,
    allowPersonaLearning: true,
    allowTraining: false,
  }
}
```

`AlicizationChatFailureKind` 增加：

```ts
| 'provider-schema-unsupported'
| 'recall-failure'
| 'memory-persistence'
```

`AlicizationChatFailureSurface` 改为：

```ts
export interface AlicizationChatFailureSurface
  extends AlicizationVisibleArtifactLearningPolicy {
  kind: AlicizationChatFailureKind
  reply: string
  nonHumanAuthoredStatus: `direct-infra-repair:${AlicizationChatFailureKind}`
  origin: 'failure-surface'
  visibleReplySource: 'infrastructure-failure'
  auditCategory: 'alicization.chat-failure'
}
```

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add \
  packages/stage-shared/src/alicization-provider-response.ts \
  packages/stage-shared/src/alicization-provider-response.test.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.test.ts \
  packages/stage-shared/src/index.ts
git commit -m "feat(alicization): define provider reply authority contract"
```

### Task 2: 将 WorkingMemory 与 LongTermMemoryRecall 改为 typed JSON context

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts`

- [ ] **Step 1: 写 JSON envelope 失败测试**

```ts
import { describe, expect, it } from 'vitest'

import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'

describe('main chat memory context', () => {
  it('keeps WorkingMemory and LongTermMemoryRecall as typed owners', () => {
    const context = buildAlicizationMainChatMemoryContext({
      workingMemory: {
        version: 'working-memory-owner-context-v1',
        owner: 'working-memory',
        scope: {
          cardId: 'card-1',
          sessionId: 'session-1',
          updatedAt: 10,
          turnRange: { fromTurnId: 'turn-1', toTurnId: 'turn-2' },
        },
        current: {
          threadTitle: '修复对话链路',
          threadMode: 'task',
          shouldHoldThread: true,
          currentUserMove: '继续',
          activeTask: '删除固定模板',
          taskStatus: 'active',
        },
        obligations: [],
        queryHints: ['固定模板'],
        audit: {
          failureTurnIds: [],
          excludedLongTermCandidateTurnIds: [],
          notes: [],
        },
        longTermQueue: [],
      },
      longTermRecall: {
        intent: {
          mode: 'task',
          shouldRecall: true,
          confidence: 0.8,
          rationale: 'task continuity',
          temporalFocus: 'cross-session',
          targetKinds: ['fact'],
          queryHints: ['固定模板'],
          riskFlags: [],
        },
        plan: {
          rawQuery: '继续',
          normalizedQuery: '继续',
          keywordQueries: ['继续'],
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
          riskFlags: [],
          targetKinds: ['fact'],
        },
        evidence: [{
          candidate: {
            id: 'memory-1',
            kind: 'fact',
            summary: '用户要求删除固定模板',
            source: 'long-term-memory',
            confidence: 0.9,
            reviewStatus: 'confirmed',
          },
          score: 0.88,
          queryMatches: ['固定模板'],
          rankReasons: ['keyword'],
          visibleMode: 'explicit',
        }],
        confidence: 0.84,
        budgetClass: 'light',
      },
    })

    expect(context.workingMemory.owner).toBe('working-memory')
    expect(context.longTermRecall?.owner).toBe('long-term-memory-recall')
    expect(context.availableLongTermEvidenceIds).toEqual(['memory-1'])
    expect(JSON.parse(context.providerSystemBlock)).toMatchObject({
      type: 'alicization-turn-memory-context',
    })
    expect(context.providerSystemBlock).not.toMatch(
      /must|should|回答|回复|人格|same-her|project-state|continuity/i,
    )
  })
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
```

Expected: FAIL，提示新 builder 不存在，旧 block 仍含自然语言 authority/reply governance。

- [ ] **Step 3: 删除 owner reply governance，保留纯数据**

`WorkingMemoryOwnerContext` 删除 `authorityLine`。删除 `buildWorkingMemoryOwnerReplyGovernance`。`buildWorkingMemoryOwnerSystemBlock` 改为：

```ts
export function buildWorkingMemoryOwnerSystemBlock(context: WorkingMemoryOwnerContext) {
  return JSON.stringify({
    type: 'working-memory-owner',
    data: context,
  })
}
```

`WorkingMemoryPromptView` 删除 `rendering.blockLines`，`buildWorkingMemorySystemBlock` 改为：

```ts
export function buildWorkingMemorySystemBlock(view: WorkingMemoryPromptView) {
  return JSON.stringify({
    type: 'working-memory-view',
    data: {
      version: view.version,
      scope: view.scope,
      modules: view.modules,
    },
  })
}
```

`buildLongTermMemoryRecallBlock` 改为：

```ts
export function buildLongTermMemoryRecallBlock(input: {
  bundle: LongTermMemoryEvidenceBundle
  maxItems?: number
}) {
  const evidence = input.bundle.evidence.slice(
    0,
    Math.max(0, Math.min(8, Math.floor(input.maxItems ?? 5))),
  )
  if (!input.bundle.intent.shouldRecall && evidence.length === 0)
    return null

  return JSON.stringify({
    type: 'long-term-memory-recall',
    owner: 'long-term-memory-recall',
    data: {
      ...input.bundle,
      evidence,
    },
  })
}
```

- [ ] **Step 4: 实现组合 context**

```ts
import type { WorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

export interface AlicizationMainChatMemoryContext {
  version: 'alicization-main-chat-memory-context-v1'
  workingMemory: WorkingMemoryOwnerContext
  longTermRecall: (LongTermMemoryEvidenceBundle & {
    owner: 'long-term-memory-recall'
  }) | null
  availableLongTermEvidenceIds: string[]
  providerSystemBlock: string
}

export function buildAlicizationMainChatMemoryContext(input: {
  workingMemory: WorkingMemoryOwnerContext
  longTermRecall: LongTermMemoryEvidenceBundle | null
}): AlicizationMainChatMemoryContext {
  const longTermRecall = input.longTermRecall
    ? {
        owner: 'long-term-memory-recall' as const,
        ...input.longTermRecall,
      }
    : null
  const availableLongTermEvidenceIds = longTermRecall?.evidence
    .map(item => item.candidate.id)
    .filter(Boolean) ?? []
  const providerSystemBlock = JSON.stringify({
    type: 'alicization-turn-memory-context',
    version: 'alicization-main-chat-memory-context-v1',
    workingMemory: input.workingMemory,
    longTermRecall,
  })
  return {
    version: 'alicization-main-chat-memory-context-v1',
    workingMemory: input.workingMemory,
    longTermRecall,
    availableLongTermEvidenceIds,
    providerSystemBlock,
  }
}
```

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
git commit -m "refactor(alicization): serialize memory owners as typed context"
```

### Task 3: 在 session preparation 保存 typed memory context 并暴露召回失败

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime-fixed-template-regression.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts`

- [ ] **Step 1: 写 preparation 失败测试**

测试必须断言：

```ts
expect(prepared.memoryContext).toMatchObject({
  version: 'alicization-main-chat-memory-context-v1',
  workingMemory: {
    owner: 'working-memory',
  },
})
expect(prepared.messages.some(message =>
  message.role === 'system'
  && typeof message.content === 'string'
  && JSON.parse(message.content).type === 'alicization-turn-memory-context',
)).toBe(true)
expect(prepared.messages.join('\n')).toContain(
  '"type":"alicization-turn-memory-context"',
)
```

召回抛错场景断言：

```ts
expect(prepared.memoryContext.longTermRecall?.intent.riskFlags)
  .toContain('recall-failed')
expect(prepared.memoryFailures).toEqual([
  expect.objectContaining({ kind: 'recall-failure' }),
])
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime-fixed-template-regression.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts
```

Expected: FAIL，`memoryContext` 和 `memoryFailures` 尚不存在。

- [ ] **Step 3: 扩展 prepared result**

```ts
export interface AlicizationPreparedMainChatExecutionResult
  extends PreparedMainChatExecution {
  // existing fields
  memoryContext: AlicizationMainChatMemoryContext
  memoryFailures: AlicizationChatFailureSurface[]
}
```

将 `retrieveLongTermMemoryEvidence` 的结果保存在 `longTermMemoryBundle`，然后：

```ts
const memoryContext = buildAlicizationMainChatMemoryContext({
  workingMemory: workingMemoryPrompt.ownerContext,
  longTermRecall: longTermMemoryBundle,
})

messages = injectWorkingMemorySystemBlock(
  messages,
  memoryContext.providerSystemBlock,
)
```

删除对 `ownerBlock`、`workingMemoryPrompt.block`、`longTermMemoryRecallBlock` 的三次独立注入。

召回失败时把 `resolveAlicizationChatFailureSurface({ kind: 'recall-failure' })` 放入 `memoryFailures`。长期候选 enqueue/drain catch 不再为空，记录 `memory-persistence` failure 并调用现有 health/debug 入口。

- [ ] **Step 4: 使用 metadata 识别失败 turn**

`WorkingMemoryTurn` 增加：

```ts
failureSurface?: {
  kind: AlicizationChatFailureKind
  origin: 'failure-surface'
  allowLongTermCondensation: false
  allowPersonaLearning: false
  allowTraining: false
} | null
```

`working-memory-builder.ts` 以 `failureSurface` 为首要失败依据；文本正则只保留为历史数据检测，不再决定新 turn 的学习资格。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime-fixed-template-regression.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-builder.test.ts
git commit -m "feat(alicization): carry typed memory context through dialogue"
```

### Task 4: 向 streamText 与 generateText 注入原生 JSON Schema

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/alicization-provider-response-format.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts`
- Modify: `packages/stage-ui/src/stores/llm.ts`
- Modify: `packages/stage-ui/src/stores/llm.abort.test.ts`

- [ ] **Step 1: 写原生 schema 注入失败测试**

stream 测试捕获 `streamTextImpl` 参数：

```ts
expect(streamTextImpl).toHaveBeenCalledWith(expect.objectContaining({
  responseFormat: alicizationProviderResponseFormat,
}))
```

one-shot 测试捕获 `generateTextImpl` 参数：

```ts
expect(generateTextImpl).toHaveBeenCalledWith(expect.objectContaining({
  responseFormat: alicizationProviderResponseFormat,
}))
```

测试还要断言 messages 中不存在自然语言 contract：

```ts
expect(JSON.stringify(request.messages)).not.toMatch(
  /Return ONLY one strict JSON|Output contract|must-follow|Response contract/i,
)
```

模拟 HTTP 400 且错误正文包含 `response_format` 或 `json_schema`，断言分类为 `provider-schema-unsupported`。

wire-format 测试通过 xsAI request body builder 断言：

```ts
expect(body).toMatchObject({
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'alicization_main_chat_turn',
      strict: true,
    },
  },
})
expect(body).not.toHaveProperty('responseFormat')
expect(body.response_format).not.toHaveProperty('jsonSchema')
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/alicization-provider-response-format.test.ts \
  packages/stage-ui/src/stores/llm.abort.test.ts
```

Expected: FAIL，请求参数没有 `responseFormat`，错误仍落到通用 provider failure。

- [ ] **Step 3: 注入 responseFormat**

两个 Provider 调用都增加：

```ts
responseFormat: alicizationProviderResponseFormat,
```

不把 Schema 序列化进 messages。

`packages/stage-ui/src/stores/llm.ts` 的 `StreamOptions` 增加：

```ts
responseFormat?: typeof alicizationProviderResponseFormat
```

调用 `streamText` 时原样透传 `responseFormat`。Alicization renderer 直连入口必须显式传入共享常量；其他非 Alicization 调用不自动继承该 Schema。

增加分类器：

```ts
export function isProviderSchemaUnsupportedError(error: unknown) {
  const text = error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error ?? '')
  return /response[_ -]?format|json[_ -]?schema|structured output/i.test(text)
    && /unsupported|not supported|invalid parameter|unknown field|400/i.test(text)
}
```

命中后直接创建 `provider-schema-unsupported` failure surface，不重试自然语言 contract，不本地生成普通回复。

- [ ] **Step 4: 删除 one-shot 与 stream emotion system prose**

删除：

- `buildOneShotEmotionalKernelSystemBlock`
- `appendOneShotEmotionalKernelSystemMessage`
- `buildStreamRunnerEmotionalKernelSystemBlock`
- `appendStreamRunnerEmotionalKernelSystemMessage`

emotion 继续通过 typed dynamic context 或 prepared runtime data传递，不再转换为固定自然语言 instruction。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/alicization-provider-response-format.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts \
  packages/stage-ui/src/stores/llm.ts \
  packages/stage-ui/src/stores/llm.abort.test.ts
git commit -m "feat(alicization): require native provider response schema"
```

### Task 5: 校验通过前禁止普通回复可见发布

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.type-spec.ts`

- [ ] **Step 1: 写 provisional gate 失败测试**

```ts
expect(emitChunk).not.toHaveBeenCalled()
expect(emitResolved).not.toHaveBeenCalled()
```

直到完整 JSON 到达并通过 Schema、污染检测与 settlement 后：

```ts
expect(emitResolved).toHaveBeenCalledWith(expect.objectContaining({
  origin: 'provider',
  visibleText: '通过校验的模型回复',
}))
```

无效 JSON 被 settlement 阻断时：

```ts
expect(emitResolved).not.toHaveBeenCalledWith(
  expect.objectContaining({ origin: 'provider' }),
)
expect(emitFailure).toHaveBeenCalledWith(expect.objectContaining({
  origin: 'failure-surface',
  kind: 'structured-contract',
}))
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts \
  apps/stage-tamagotchi/src/shared/eventa.type-spec.ts
```

Expected: FAIL，text delta 仍可能立即发布，artifact 没有统一 origin。

- [ ] **Step 3: 扩展 Eventa artifact metadata**

chunk/finish/transport DTO 增加：

```ts
origin?: AlicizationVisibleArtifactOrigin
learningPolicy?: AlicizationVisibleArtifactLearningPolicy
failureSurface?: AlicizationChatFailureSurface | null
```

普通 text delta 只累计到 `provisionalFullText`。工具进度与授权 event 仍实时发送，但不得使用普通 assistant text chunk。

- [ ] **Step 4: settlement 校验 memory usage**

增加：

```ts
export function validateAlicizationProviderMemoryUsage(input: {
  memoryUsage: AlicizationProviderMemoryUsage
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  const allowed = new Set(input.prepared.memoryContext.availableLongTermEvidenceIds)
  const unknownEvidenceIds = input.memoryUsage.longTermEvidenceIds
    .filter(id => !allowed.has(id))
  return {
    valid:
      input.memoryUsage.workingMemoryVersion
      === input.prepared.memoryContext.workingMemory.version
      && unknownEvidenceIds.length === 0,
    unknownEvidenceIds,
  }
}
```

无效 claim 直接进入 `structured-contract` failure surface。settlement 不得改写 `reply`，也不得发起回复重写请求。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts \
  apps/stage-tamagotchi/src/shared/eventa.ts \
  apps/stage-tamagotchi/src/shared/eventa.type-spec.ts
git commit -m "fix(alicization): gate visible replies on provider settlement"
```

### Task 6: 删除固定自然语言 Provider prompt 与 reply governance

**Files:**
- Delete: `packages/stage-shared/src/alicization-prompting.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Modify: `packages/stage-shared/package.json`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.test.ts`
- Modify: `packages/stage-ui/src/composables/alicization-guardrails.ts`
- Modify: `packages/stage-ui/src/composables/alicization-prompt-composer.ts`
- Modify: `packages/stage-ui/src/composables/alicization-prompt-composer.test.ts`

- [ ] **Step 1: 写静态失败测试**

在 `main-chat-single-dialogue-mainline-audit.test.ts` 读取生产文件并断言：

```ts
for (const source of providerFacingSources) {
  expect(source).not.toMatch(
    /Alicization core response policy|Response contract|must-follow|same-her|one continuous her|before answering|reply posture|opening style/i,
  )
}
```

同时断言不存在 `alicization-prompting` 生产 import。

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.test.ts \
  packages/stage-ui/src/composables/alicization-prompt-composer.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts
```

Expected: FAIL，仍存在固定 system/reply governance 文本。

- [ ] **Step 3: 删除固定 prompt API**

删除以下输入和 builder：

- `alicizationFixedCoreSystemInstruction`
- `alicizationFixedStructuredContractAnchor`
- host name、datetime、memory、generic、sensory、project-state、spark 的固定自然语言 template
- `describeAlicizationMainChatProviderMindRequirement`
- `buildWorkingMemoryOwnerReplyGovernance`
- runtime surface 中 autobiographical/habit/motive/mind-ecology/long-horizon 等自然语言 `SystemBlock` 聚合

保留动态事实时统一输出 JSON：

```ts
function buildProviderFactBlock(type: string, data: unknown) {
  return JSON.stringify({ type, data })
}
```

SOUL 原文是用户治理的人格真源，可以作为动态 system content；工程代码不得在其前后追加固定说话规则。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add \
  packages/stage-shared/src/index.ts \
  packages/stage-shared/package.json \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-card-prompt.test.ts \
  packages/stage-ui/src/composables/alicization-guardrails.ts \
  packages/stage-ui/src/composables/alicization-prompt-composer.ts \
  packages/stage-ui/src/composables/alicization-prompt-composer.test.ts
git rm packages/stage-shared/src/alicization-prompting.ts
git commit -m "refactor(alicization): remove fixed provider dialogue prompts"
```

### Task 7: 将工具成功结果改为事实，不再本地生成 payoff 台词

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts`
- Delete: 静态审计确认无生产调用的 local mind authoring、compat、shared fallback 和对应测试文件

- [ ] **Step 1: 写 execution fact 失败测试**

```ts
const fact = buildAlicizationExecutionDeliveryFact({
  toolName: 'executor_run_cli',
  status: 'succeeded',
  summary: '构建完成',
  result: { exitCode: 0 },
})

expect(fact).toEqual({
  type: 'execution-result',
  toolName: 'executor_run_cli',
  status: 'succeeded',
  summary: '构建完成',
  result: { exitCode: 0 },
})
expect(fact).not.toHaveProperty('reply')
expect(fact).not.toHaveProperty('source', 'llm-repaired')
```

模型回复缺失时：

```ts
expect(delivery).toMatchObject({
  status: 'pending-provider-settlement',
})
expect(delivery.visibleReply).toBeUndefined()
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts
```

Expected: FAIL，当前仍生成 deterministic reply 并使用 `llm-repaired`。

- [ ] **Step 3: 删除 deterministic visible API**

删除：

- `buildExecutionPayoffDecision`
- `buildAlicizationDeterministicExecutionDeliveryReply`
- `buildAlicizationInlineExecutionOutcomeReply`
- `buildAlicizationExecutionPayoffDeterministicStructured`
- 对 `buildAlicizationActiveDialogueGovernedReply` 的 import/call

新增：

```ts
export interface AlicizationExecutionDeliveryFact {
  type: 'execution-result'
  toolName: string
  status: 'succeeded' | 'failed' | 'timed-out' | 'denied'
  summary: string
  result: unknown
}

export function buildAlicizationExecutionDeliveryFact(
  input: Omit<AlicizationExecutionDeliveryFact, 'type'>,
): AlicizationExecutionDeliveryFact {
  return {
    type: 'execution-result',
    ...input,
  }
}
```

callback runtime 不再把 `llm-repaired` 当 mind-authored。没有 Provider settlement 时 requeue；超过重试预算进入 `tool-failure` 或 `structured-contract` failure surface。

- [ ] **Step 4: 删除 dead local mind authoring stack**

物理删除无生产调用的 local mind authoring、compat 与 shared/stage-ui reply authoring 文件。保留：

- time/date 真实事实对象
- tool/permission/timeout 的 typed failure 或 authorization object
- emotion/performance 的非可见具身数据
- 独立的 `normalizeExecutionFirstGovernance` agency 路由 owner

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts \
  apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-delivery-reminders.test.ts
# 将静态审计确认的删除逐文件加入暂存区。
git commit -m "refactor(alicization): return tool facts to provider dialogue"
```

### Task 8: 删除 ordinary fast-path 与 compact timeout recovery

**Files:**
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-fast-path-project-state-provider.test.ts`
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/authority-orchestrator.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts`

- [ ] **Step 1: 写单一主链路失败测试**

对 greeting、identity、time、date、普通聊天和 follow-up 分别运行 background turn：

```ts
expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
expect(generateAlicizationMainChatNonStreaming).not.toHaveBeenCalled()
expect(finishRun).not.toHaveBeenCalledWith(
  expect.objectContaining({
    finishReason: 'active-dialogue-fast-path',
  }),
)
```

timeout 测试断言：

```ts
expect(recoveryAttempts.map(item => item.mode)).not.toContain(
  'active-dialogue-compact',
)
expect(emitFailure).toHaveBeenCalledWith(expect.objectContaining({
  kind: 'timeout',
  origin: 'failure-surface',
}))
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts
```

Expected: FAIL，greeting/time/date 仍走 active-dialogue fast-path，timeout 仍含 compact recovery。

- [ ] **Step 3: 删除 foreground fast-path**

从 `main-chat-background-run.ts` 删除：

- active-dialogue imports/types/options
- `deriveAlicizationActiveDialogueFastPathDecision`
- `buildAlicizationActiveDialogueFastPathMessages`
- `normalizeAlicizationActiveDialogueFastPathReplyOrEscalate`
- `chat-stream.active-dialogue-*` 分支和 finish reason
- execution-first deterministic visible payoff 分支

所有正常 turn 直接进入：

```ts
const streamResult = await runAlicizationMainChatStream({
  payload: input.payload,
  prepared: prepared!,
  // existing transport callbacks
})
```

- [ ] **Step 4: 删除 compact recovery 与 mode**

删除：

- `active-dialogue-local`
- `active-dialogue-deterministic`
- `active-dialogue-compact`
- compact 12 秒 timeout 分支
- compact awareness/context 特判
- realization-engine 对 compact mode 的分支
- authority-orchestrator 的 compact authority API

timeout 不再尝试生成正常回复，直接进入透明 failure surface。

- [ ] **Step 5: 删除 fast-path 文件并清理证明清单**

确认：

```bash
rg -n "main-chat-active-dialogue-loop|active-dialogue-fast-path|active-dialogue-compact" \
  apps/stage-tamagotchi/src packages/stage-shared/src packages/stage-ui/src
```

Expected: 只允许历史迁移文档；生产代码和活跃测试为零。

- [ ] **Step 6: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/authority-orchestrator.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.ts \
  apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts
git rm \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-fast-path-project-state-provider.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-follow-up-payoff.ts
git commit -m "refactor(alicization): remove ordinary dialogue fast paths"
```

### Task 9: 删除 Provider 候选重写链路并直接落透明协议失败

**Files:**
- Delete: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/` 下所有 Provider 候选重写模块与对应测试
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts`

- [ ] **Step 1: 写“失败后不再请求改写”的测试**

```ts
expect(generateText).not.toHaveBeenCalled()
expect(settlement).toMatchObject({
  origin: 'failure-surface',
  kind: 'structured-contract',
})
expect(settlement).not.toHaveProperty('visibleText')
```

针对 `schema_parse_failed`、`required_field_missing`、`internal_protocol_leak`、`legacy_template_contamination`、`tool_result_not_settled` 和 `memory_usage_claim_invalid` 都执行同样断言。

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts
```

Expected: FAIL，旧实现仍可能创建第二个 Provider 请求或保留本地候选改写分支。

- [ ] **Step 3: 删除改写 authority**

删除：

- 候选重写 request/response DTO。
- 候选重写 Provider 调用。
- `rewriteAttempted`、`rewriteSucceeded`、`preservedIntoRewrite`、`rewriteClosureApplied`。
- 从 messages 反向解析 WorkingMemory/LTM marker 的代码。
- project-state、persona、continuity 或 reply posture 改写规则。

settlement 只保留：

```ts
{
  status: 'approved' | 'blocked'
  reasonCodes: string[]
  initialCriticStatus: 'pass' | 'blocked' | null
  finalCriticStatus: 'pass' | 'blocked' | null
}
```

被阻断候选不进入普通可见 reply、WorkingMemory 正常 assistant turn、长期凝练或 persona learning。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令，并运行 `fixed-reply-governance-removal.test.ts`。

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/closure-orchestrator.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/fixed-reply-governance-removal.test.ts
git commit -m "refactor(alicization): remove provider reply rewrite authority"
```

### Task 10: 删除 renderer 本地普通回复、retry prompt 与 local repair

**Files:**
- Modify: `packages/stage-ui/src/composables/alicization-structured-output.ts`
- Modify: `packages/stage-ui/src/composables/alicization-structured-output.test.ts`
- Modify: `packages/stage-ui/src/stores/chat.ts`
- Modify: `packages/stage-ui/src/stores/chat.test.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.test.ts`

- [ ] **Step 1: 写 renderer authority 失败测试**

```ts
expect(source).not.toContain('structuredRetrySystemPrompt')
expect(source).not.toContain('createStructuredFallback')
expect(source).not.toContain('stageAssistantFallback')
expect(source).not.toContain('repairStructuredContractLocally')
```

行为测试：

```ts
expect(stageMessage).not.toHaveBeenCalledWith(
  expect.objectContaining({
    visibleReplySource: 'renderer-local',
  }),
)
expect(stageMessage).toHaveBeenCalledWith(expect.objectContaining({
  origin: 'failure-surface',
  learningPolicy: {
    allowLongTermCondensation: false,
    allowPersonaLearning: false,
    allowTraining: false,
  },
}))
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  packages/stage-ui/src/composables/alicization-structured-output.test.ts \
  packages/stage-ui/src/stores/chat.test.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.test.ts
```

Expected: FAIL，本地 repair/fallback 仍能创建或覆盖普通回复。

- [ ] **Step 3: 将 structured output 限制为 parse/validate**

删除：

- `buildLocalRepairThought`
- `repairStructuredContractLocally`
- `enforceGovernedMindTurn` 中的 visible reply override
- `fallbackReply` 参数
- `buildMindGovernedFallbackSurface` 对普通 dialogue 的使用

保留 API：

```ts
export function parseAlicizationProviderResponse(raw: string) {
  // parse JSON only
}

export function validateAlicizationProviderResponse(raw: unknown) {
  // AJV/schema and contamination checks only
}
```

sanitizer 可以删除内部字段或拒绝 artifact，但不得返回替代 `reply`。

- [ ] **Step 4: 删除 chat store 本地回复权威**

删除：

- `structuredRetrySystemPrompt`
- `lowObedienceDeniedRetryDirective`
- `lowObedienceHostDeniedRetrySystemOverride`
- reminder/no-tool/executor payoff 自然语言 retry directives
- `createStructuredFallback`
- `stageAssistantFallback`
- executor summary 普通回复分支
- progress timeout 被标成 `runtime-model/llm-mind` 的分支

Provider retry 只通过 main-process typed request；renderer 自身不注入 system prompt。失败直接展示 transport 中的 failure surface。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  packages/stage-ui/src/composables/alicization-structured-output.ts \
  packages/stage-ui/src/composables/alicization-structured-output.test.ts \
  packages/stage-ui/src/stores/chat.ts \
  packages/stage-ui/src/stores/chat.test.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.test.ts
git commit -m "refactor(alicization): remove renderer reply authorship"
```

### Task 11: 贯穿失败 metadata 并阻断记忆凝练与 persona learning

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts`

- [ ] **Step 1: 写失败排除集成测试**

对 timeout、provider auth、schema unsupported、tool failure、recall failure、memory persistence failure 分别断言：

```ts
expect(persistedArtifact).toMatchObject({
  origin: 'failure-surface',
  allowLongTermCondensation: false,
  allowPersonaLearning: false,
  allowTraining: false,
})
expect(workingMemory.audit.failureTurnIds).toContain(turnId)
expect(workingMemory.longTermCandidates).toEqual([])
expect(personaCandidates).toEqual([])
```

正常 Provider reply 仍允许生成清洗后的长期候选，但候选默认：

```ts
expect(candidate.allowTraining).toBe(false)
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts
```

Expected: FAIL，failure metadata 尚未完整进入 persistence/WorkingMemory/persona gate。

- [ ] **Step 3: 统一 eligibility**

```ts
export function resolveAlicizationLearningEligibility(input: {
  origin: AlicizationVisibleArtifactOrigin
  learningPolicy: AlicizationVisibleArtifactLearningPolicy
  contaminated: boolean
}) {
  const providerAuthored = input.origin === 'provider'
  return {
    allowLongTermCondensation:
      providerAuthored
      && input.learningPolicy.allowLongTermCondensation
      && !input.contaminated,
    allowPersonaLearning:
      providerAuthored
      && input.learningPolicy.allowPersonaLearning
      && !input.contaminated,
    allowTraining: false,
  }
}
```

所有 memory/persona 写入入口调用这一函数。raw transcript、review queue、failure surface、authorization surface、template contamination 均不得通过。

- [ ] **Step 4: 失败 artifact 独立持久化**

正常 Provider reply 与 failure surface 分开保存。recall/persistence side failure 不替换成功回复，但作为同一 turn 的独立 artifact 进入 health/audit。

- [ ] **Step 5: 运行测试并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts
git commit -m "fix(alicization): exclude failure artifacts from learning"
```

### Task 12: 删除旧模板测试并增加单一主链路静态审计

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/project-awareness-coverage-matrix.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/route-authority-boundary-registry-audit.test.ts`
- Delete: 仅删除仍要求 fast-path、same-her、Phase 1、project-state 台词或本地 reply repair 的 canonical/audit fixture；逐文件使用 `git rm`，不得批量删除不相关行为测试。

- [ ] **Step 1: 写生产路径 allowlist 审计**

```ts
const productionDialogueFiles = [
  'main-chat-background-run.ts',
  'main-chat-stream-runner.ts',
  'main-chat-one-shot.ts',
  'main-chat-session-runtime.ts',
  'main-chat-runtime-surface.ts',
  'execution-delivery-surface.ts',
  'visible-reply/settlement.ts',
  '../../../../../../packages/stage-ui/src/stores/chat.ts',
  '../../../../../../packages/stage-ui/src/composables/alicization-structured-output.ts',
]

it('keeps normal visible reply authority on the provider mainline', () => {
  const source = productionDialogueFiles
    .map(readProductionSource)
    .join('\n')

  expect(source).not.toMatch(
    /active-dialogue-fast-path|active-dialogue-compact|stageAssistantFallback|createStructuredFallback|repairStructuredContractLocally|structuredRetrySystemPrompt/,
  )
  expect(source).not.toMatch(
    /Alicization core response policy|Response contract|same-her|one continuous her|Phase 1: Local Digital Life|project-state.*reply/i,
  )
})
```

detector/sanitizer 文件放入明确 allowlist，只允许检测、删除、拒绝和 reason code。

- [ ] **Step 2: 运行审计并确认 RED**

Run:

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/project-awareness-coverage-matrix.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/route-authority-boundary-registry-audit.test.ts
```

Expected: 首次运行列出仍注册旧模板/fast-path 的 fixture。

- [ ] **Step 3: 删除旧 fixture 与精确台词断言**

对每个命中项确认它只验证旧固定模板、旧 fast-path 或本地普通回复权威，然后 `git rm`。保留并改写：

- Provider 请求来源断言
- WorkingMemory/LTM owner 参与断言
- memory evidence ID 与 rank reason 断言
- tool fact 与 Provider payoff 断言
- transparent failure origin/learning policy 断言
- Schema unsupported、timeout、auth、tool、recall、persistence failure 断言

- [ ] **Step 4: 运行审计并确认 GREEN**

Run: 使用 Step 2 同一命令。

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/project-awareness-coverage-matrix.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/route-authority-boundary-registry-audit.test.ts
git diff --cached --name-only
git commit -m "test(alicization): audit single provider dialogue authority"
```

对本任务 Step 3 已确认的每个旧 fixture 路径逐个执行 `git rm`，不得使用 `git add .`、`git add -A` 或目录级 `git add -u`。在执行提交前必须检查 staged diff，确认没有 `.serena/project.yml`、`.claude-flow/`、`tsconfig.node.tsbuildinfo` 或两个未跟踪长期记忆计划。

### Task 13: 完整验证与残留扫描

**Files:**
- Modify only when verification exposes a scoped defect.

- [ ] **Step 1: 运行共享合同与记忆 owner 测试**

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  packages/stage-shared/src/alicization-provider-response.test.ts \
  packages/stage-shared/src/alicization-chat-failure-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-prompt-view.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
```

Expected: PASS。

- [ ] **Step 2: 运行主链路、协议失败面与 renderer 测试**

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-one-shot.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-run-lifecycle.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/visible-reply/settlement.test.ts \
  packages/stage-ui/src/composables/alicization-structured-output.test.ts \
  packages/stage-ui/src/stores/chat.test.ts \
  apps/stage-tamagotchi/src/renderer/alicization-chat-stream-bridge.test.ts
```

Expected: PASS。

- [ ] **Step 3: 运行 Memory Workbench 与学习排除回归**

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts
```

Expected: PASS。

- [ ] **Step 4: 运行 typecheck**

```bash
PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm -F @proj-alicization/stage-shared typecheck

PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm -F @proj-alicization/stage-ui typecheck

PATH=/opt/homebrew/Cellar/node/24.2.0/lib/node_modules/corepack/shims:/opt/homebrew/Cellar/node/24.2.0/bin:$PATH \
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Expected: 三个命令 exit 0。

- [ ] **Step 5: 扫描生产残留**

```bash
rg -n \
  "active-dialogue-fast-path|active-dialogue-compact|structuredRetrySystemPrompt|stageAssistantFallback|createStructuredFallback|repairStructuredContractLocally|Alicization core response policy|Response contract|Return ONLY one strict JSON" \
  apps/stage-tamagotchi/src packages/stage-shared/src packages/stage-ui/src
```

Expected: 无生产命中；允许命中只存在于检测器 allowlist 和明确的静态审计负向样本。

```bash
rg -n \
  "origin:\\s*['\"](?:local-reply|fast-path|fallback-persona|renderer-repair)['\"]|visibleReplySource:\\s*['\"]renderer-local['\"]|source:\\s*['\"]llm-repaired['\"]" \
  apps/stage-tamagotchi/src packages/stage-shared/src packages/stage-ui/src
```

Expected: 无命中。

- [ ] **Step 6: 检查工作区与提交边界**

```bash
git status --short --branch
git diff --check
git log --oneline -15
```

Expected:

- `.serena/project.yml` 保持未暂存。
- `.claude-flow/`、`apps/stage-tamagotchi/tsconfig.node.tsbuildinfo` 不进入提交。
- 两个未跟踪长期记忆计划不被删除、不被误暂存。
- 每个实施任务都有独立 Conventional Commit。

- [ ] **Step 7: 最终审查**

使用 `superpowers:requesting-code-review` 派发完整实现审查。审查必须逐项核对：

- 正常可见回复唯一 origin 为 `provider`。
- failure/authorization artifact 不可进入普通回复学习。
- WorkingMemory 与 LongTermMemoryRecall owner 边界未被打散。
- Provider memory usage 不可引用未提供证据。
- 工具成功后仍由 Provider 生成最终回复。
- raw transcript、review 候选、failure artifact、模板污染不进入 persona learning。
- 不支持 Schema 的 Provider 透明失败。

审查发现 Critical 或 Important 问题时，修复并重新运行相关测试、typecheck 和静态扫描后再结束。

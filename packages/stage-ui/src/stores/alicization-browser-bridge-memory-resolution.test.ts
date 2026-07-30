import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationOrganicMemorySnapshot,
} from './alicization-bridge'
import type { BrowserMemoryConsolidationSnapshot } from './alicization-browser-organic-memory'

import { describe, expect, it } from 'vitest'

import {
  buildBrowserMemoryResolutionLedger,
  buildBrowserMemoryStageReplay,
  buildBrowserRecollectionForeground,
  buildBrowserRecollectionIntent,
  buildBrowserRecollectionPlan,
  buildBrowserRecollectionSpeechPlan,
  buildBrowserSelfEvolution,
} from './alicization-browser-bridge-memory-resolution'

const consolidation: BrowserMemoryConsolidationSnapshot = {
  id: 'memory-1',
  kind: 'procedural',
  facet: null,
  periodKey: '2026-07-30',
  periodStartedAt: 1,
  periodEndedAt: 2,
  summary: '修复记忆检索流程',
  lesson: '先确认当前证据',
  cues: ['检索'],
  confidence: 0.9,
  dominantProvenance: 'observed',
}

const hostPersonModel: AlicizationHostPersonModelSnapshot = {
  summary: '当前关系证据',
  routines: [],
  sensitivities: [],
  repairTriggers: ['先确认当前证据'],
  trustLadder: {
    stage: 'warming',
    score: 0.7,
    rationale: '互动证据正在稳定',
  },
  preferredClosenessByContext: [],
  recurrentBurdens: ['记忆检索需要可追溯'],
  narrative: [],
  updatedAt: 1,
}

describe('browser bridge memory resolution', () => {
  it('emits structured memory facts instead of local speaking cues', () => {
    const foreground = buildBrowserRecollectionForeground({
      consolidations: [consolidation],
      hostPersonModel: null,
    })
    expect(foreground).toMatchObject({
      mode: 'execution-procedure',
      certainty: 'settled',
      summary: '修复记忆检索流程',
    })

    const recollectionForeground = foreground as NonNullable<AlicizationOrganicMemorySnapshot['recollectionForeground']>
    const intent = buildBrowserRecollectionIntent({
      consolidations: [consolidation],
      recollectionForeground,
    })
    const plan = buildBrowserRecollectionPlan({
      consolidations: [consolidation],
      recollectionForeground,
    })
    const speechPlan = buildBrowserRecollectionSpeechPlan({
      recollectionForeground,
    })
    const memoryStageReplay = buildBrowserMemoryStageReplay({
      recollectionForeground,
      recollectionPlan: plan,
      recollectionSpeechPlan: speechPlan,
      selfEvolution: null,
      now: () => 10,
    })
    const memoryResolutionLedger = buildBrowserMemoryResolutionLedger({
      recollectionForeground,
      recollectionPlan: plan,
      recollectionSpeechPlan: speechPlan,
      now: () => 10,
    })
    const serialized = JSON.stringify({
      foreground,
      intent,
      plan,
      speechPlan,
      memoryStageReplay,
      memoryResolutionLedger,
    })

    expect(serialized).toContain('source=browser-memory')
    expect(serialized).toContain('mode=execution-procedure')
    expect(serialized).toContain('browser-memory:primary')
    expect(serialized).not.toMatch(/Browser fallback|browser-fallback|before speaking|bend the next answer|foregrounded/iu)
  })

  it('does not synthesize local learning narration when only browser memory facts exist', () => {
    const selfEvolution = buildBrowserSelfEvolution({
      hostPersonModel,
      recollectionForeground: null,
      knowledgeEvidence: {
        validationCount: 1,
        contradictionCount: 1,
        stronglyValidatedProcedureCount: 0,
        contradictionHeavyFactCount: 1,
      },
      now: () => 20,
    })
    expect(selfEvolution?.nextLearningReason).toBeNull()

    const memoryStageReplay = buildBrowserMemoryStageReplay({
      recollectionForeground: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      selfEvolution,
      now: () => 20,
    })

    expect(memoryStageReplay?.stages[0]?.summary).toBe('')
    expect(JSON.stringify(memoryStageReplay)).not.toMatch(/Browser fallback|browser-fallback/iu)
  })
})

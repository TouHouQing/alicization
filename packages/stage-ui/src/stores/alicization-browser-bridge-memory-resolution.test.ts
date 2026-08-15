import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationOrganicMemorySnapshot,
} from './alicization-bridge'
import type { BrowserMemoryConsolidationSnapshot } from './alicization-browser-organic-memory'

import { describe, expect, it } from 'vitest'

import {
  buildBrowserKnowledgeEvidence,
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

const legacyInwardSurfaceLiteral = ['surface', 'inward'].join('=')
const legacyVisibleSurfaceLiteral = ['surface', 'visible-optional'].join('=')
const literalSurfaceEvidence = `${legacyInwardSurfaceLiteral} is literal recollection evidence, not policy.`

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
    const knowledgeEvidence = buildBrowserKnowledgeEvidence({
      consolidations: [consolidation],
      recollectionForeground: {
        ...recollectionForeground,
        surfaceSummary: literalSurfaceEvidence,
      },
      hostPersonModel: null,
    })
    const memoryStageReplay = buildBrowserMemoryStageReplay({
      recollectionForeground,
      recollectionPlan: plan,
      recollectionSpeechPlan: speechPlan,
      selfEvolution: null,
      now: () => 10,
    })
    const memoryResolutionLedger = buildBrowserMemoryResolutionLedger({
      recollectionForeground: {
        ...recollectionForeground,
        surfaceSummary: literalSurfaceEvidence,
      },
      recollectionPlan: plan,
      recollectionSpeechPlan: speechPlan,
      now: () => 10,
    })
    const visibleMemoryResolutionLedger = buildBrowserMemoryResolutionLedger({
      recollectionForeground: {
        mode: 'experience-pattern',
        certainty: 'firm',
        summary: '用户正在检查记忆链路',
        surfaceSummary: literalSurfaceEvidence,
        confidence: 0.8,
      },
      recollectionPlan: {
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        opening: '用户正在检查记忆链路',
        certainty: 'firm',
        rationale: 'source=browser-memory | selected=phase',
        confidence: 0.8,
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'gist-first',
        placement: 'inside-payoff',
        certainty: 'firm',
        rationale: 'source=browser-memory | mode=experience-pattern',
        confidence: 0.8,
      },
      now: () => 10,
    })
    const serialized = JSON.stringify({
      foreground,
      intent,
      plan,
      speechPlan,
      knowledgeEvidence,
      memoryStageReplay,
      memoryResolutionLedger,
    })

    expect(serialized).toContain('source=browser-memory')
    expect(serialized).toContain('mode=execution-procedure')
    expect(serialized).toContain('browser-memory:primary')
    expect(serialized).not.toContain(legacyInwardSurfaceLiteral)
    expect(serialized).not.toContain(legacyVisibleSurfaceLiteral)
    expect(knowledgeEvidence.contradictionHeavyFactCount).toBe(0)
    expect(memoryResolutionLedger?.stableCoreOnly).toBe(true)
    expect(visibleMemoryResolutionLedger?.stableCoreOnly).toBe(false)
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

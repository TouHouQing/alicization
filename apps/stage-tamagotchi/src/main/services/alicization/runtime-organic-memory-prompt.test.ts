import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import {
  __alicizationOrganicMemoryPromptTestOnly,
  createAlicizationOrganicMemoryPromptRuntime as createAlicizationOrganicMemoryPromptRuntimeBase,

} from './runtime-organic-memory-prompt'

type OrganicMemoryPromptRuntimeOptionsFixture = {
  [Key in keyof CreateAlicizationOrganicMemoryPromptRuntimeOptions]?: any
}

const normalizeOrganicRecallText: CreateAlicizationOrganicMemoryPromptRuntimeOptions['normalizeOrganicRecallText']
  = raw => raw.trim().toLowerCase()

const selectPromptActiveThoughts: CreateAlicizationOrganicMemoryPromptRuntimeOptions['selectPromptActiveThoughts']
  = ({ activeThoughts }) => activeThoughts

function createAlicizationOrganicMemoryPromptRuntime(options: OrganicMemoryPromptRuntimeOptionsFixture) {
  return createAlicizationOrganicMemoryPromptRuntimeBase(options as CreateAlicizationOrganicMemoryPromptRuntimeOptions)
}

function readOrganicMemoryProviderFact<T = Record<string, any>>(blocks: string[], type: string): T | null {
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as { type?: unknown, data?: unknown }
      if (parsed.type === type)
        return parsed.data as T
    }
    catch {
      // Provider fact blocks are JSON-only; ignore unrelated test inputs.
    }
  }
  return null
}

describe('runtime-organic-memory-prompt', () => {
  it('keeps working-memory active thoughts when long-term recall uses a different seed', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [{
          id: 'thought-current-task',
          text: '用户刚刚补充了当前对话要求。',
          createdAt: 1,
        } as any],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: async () => null,
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续验证记忆链路',
    })

    expect(context.activeThoughts).toEqual([
      expect.objectContaining({
        id: 'thought-current-task',
        text: '用户刚刚补充了当前对话要求。',
      }),
    ])
  })

  it('does not invent execution callback carry when recalled evidence has no summary', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-empty-callback',
        threadAnchor: '',
        whatHappened: '',
        whatChanged: '',
        relationshipMeaning: '',
        lesson: '',
        sourceSummary: '',
        tags: ['execution-callback'],
        emotionTags: [],
        confidence: 0.8,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: async () => null,
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续',
    })

    expect(context.executionCallbackCarry).toBeNull()
  })

  it('keeps execution callback carry mode invariant when only legacy continuity prose changes', async () => {
    const resolveCarry = (lesson: string) =>
      (__alicizationOrganicMemoryPromptTestOnly as any).deriveExecutionCallbackCarryFromContext({
        recalledEpisodes: [{
          id: 'episode-callback',
          threadAnchor: 'tool-result',
          whatHappened: 'The requested command completed.',
          whatChanged: 'The result is ready for the next reply.',
          relationshipMeaning: '',
          lesson,
          sourceSummary: 'execution result',
          tags: ['execution-callback'],
          emotionTags: [],
          confidence: 0.8,
        } as any],
      })

    const neutralCarry = resolveCarry('Report the real command result.')
    const legacyProseCarry = resolveCarry('continuity-drift-risk generic assistant task-shell')

    expect(legacyProseCarry?.carryMode).toBe(neutralCarry?.carryMode)
    expect(legacyProseCarry?.carryMode).toBe('execution-callback')
  })

  it('keeps benchmark ranking invariant when only focus dimensions change', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `filler-${index}`,
        text: `neutral memory ${index}`,
      })),
      {
        id: 'relationship-target',
        text: 'relationship repair boundary',
      },
      {
        id: 'neutral-target',
        text: 'neutral observation',
      },
    ]
    const tuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1,
      sourceReportAt: 1,
      focusDimensions: [],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0,
        delayUntilAfterPayoffBias: 0,
        provenanceLabelBias: 1,
        specificityClampBias: 1,
      },
      personStateAdjustments: {
        repairWindowBias: 0,
        closenessCapBias: 1,
      },
      notes: [],
    } as any
    const rank = (focusDimensions: string[]) => __alicizationOrganicMemoryPromptTestOnly.rankByBenchmarkTuningBias({
      items,
      tuningAdvice: {
        ...tuningAdvice,
        focusDimensions,
      },
      mode: 'episode',
      toText: item => item.text,
    }).map(item => item.id)

    expect(rank([
      'learningRevisionDiscipline',
      'worldModelValidationDiscipline',
    ])).toEqual(rank([]))
  })

  it('keeps relationship adjustment from classifying free prose without a typed relationship owner', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `filler-${index}`,
        text: `neutral memory ${index}`,
      })),
      {
        id: 'neutral-target',
        text: 'neutral observation',
      },
      {
        id: 'relationship-target',
        text: 'relationship repair boundary',
      },
    ]
    const rank = (relationshipBoost: number) => __alicizationOrganicMemoryPromptTestOnly.rankByBenchmarkTuningBias({
      items,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: [],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0,
          delayUntilAfterPayoffBias: 0,
          provenanceLabelBias: 0,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0,
        },
        notes: [],
      } as any,
      mode: 'episode',
      toText: item => item.text,
    }).map(item => item.id)

    expect(rank(0.2)).toEqual(rank(0))
  })

  it('keeps numeric wrong-thread penalty effective after focus governance is removed', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `filler-${index}`,
        text: `neutral memory ${index}`,
        provenance: 'remembered',
      })),
      {
        id: 'reconstructed-target',
        text: 'reconstructed observation',
        provenance: 'reconstructed',
      },
      {
        id: 'remembered-target',
        text: 'remembered observation',
        provenance: 'remembered',
      },
    ]
    const rank = (wrongThreadPenalty: number) => __alicizationOrganicMemoryPromptTestOnly.rankByBenchmarkTuningBias({
      items,
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1,
        sourceReportAt: 1,
        focusDimensions: [],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0,
          delayUntilAfterPayoffBias: 0,
          provenanceLabelBias: 0,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0,
        },
        notes: [],
      } as any,
      mode: 'episode',
      toText: item => item.text,
      getProvenance: item => item.provenance as any,
    }).map(item => item.id)

    expect(rank(0).indexOf('reconstructed-target')).toBeLessThan(rank(0).indexOf('remembered-target'))
    expect(rank(0.2).indexOf('remembered-target')).toBeLessThan(rank(0.2).indexOf('reconstructed-target'))
  })

  it('threads the active digital-life runtime surface through every organic memory planner', async () => {
    const runtimeSurface = {
      memory: {
        emotionalKernel: {
          dominantFeeling: 'steady focus',
        },
      },
      dialogue: {
        currentConsciousFrame: {
          focusAnchor: 'Validate the active memory path.',
        },
      },
    } as any
    const planRecollectionIntent = vi.fn(async (_input: any) => ({
      mode: 'self-continuity' as const,
      temporalFocus: 'experience-matched' as const,
      searchEpisodes: false,
      searchConversations: false,
      searchProceduralExperience: false,
      queryHints: ['active runtime surface'],
      rationale: 'Planner should stay attached to the active runtime surface.',
      confidence: 0.82,
    }))
    const planMemoryRecollection = vi.fn(async (_input: any) => null)
    const planRecollectionSpeech = vi.fn(async (_input: any) => null)
    const planMemoryDeliberation = vi.fn(async (_input: any) => null)
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-corrected-same-person',
        cardId: 'card-corrected-same-person',
        decisionTraceId: null,
        turnId: 'turn-corrected-same-person',
        sessionId: 'session-corrected-same-person',
        occurredAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        whereSummary: 'host corrected memory meaning',
        withWhom: ['host'],
        threadAnchor: 'same-person continuity correction',
        whatHappened: 'The host corrected the memory meaning and said they were testing whether she stayed the same person, not pushing for a progress recap.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The line shifted away from task-shell pressure and back toward same-person continuity.',
        sourceKind: 'execution-result',
        sourceSummary: 'corrected same-person humanlike memory',
        provenance: 'remembered',
        confidence: 0.86,
        salience: 0.83,
        sceneAttachment: 0.81,
        consolidationPriority: 0.8,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'not progress pressure', 'low-pressure-follow-up', 'gaze stable'],
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        lesson: 'Slow down, keep gaze stable, and reopen the line gently after a correction.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime-surface',
        kind: 'autobiographical',
        facet: 'self-era',
        periodKey: '2026-06-runtime-surface',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'The runtime surface carried emotion, memory, and body together.',
        lesson: 'Keep memory planning attached to the active digital-life surface.',
        cues: ['digital-life-runtime-surface'],
        confidence: 0.86,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 2,
      } as any],
      planRecollectionIntent,
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'keep the active runtime surface attached to memory planning',
      recallGovernor: null,
      digitalLifeRuntimeSurface: runtimeSurface,
    } as any)

    expect(planRecollectionIntent.mock.calls[0]?.[0]?.digitalLifeRuntimeSurface).toBe(runtimeSurface)
    expect(planMemoryRecollection.mock.calls[0]?.[0]?.digitalLifeRuntimeSurface).toBe(runtimeSurface)
    expect(planRecollectionSpeech.mock.calls[0]?.[0]?.digitalLifeRuntimeSurface).toBe(runtimeSurface)
    expect(planMemoryDeliberation.mock.calls[0]?.[0]?.digitalLifeRuntimeSurface).toBe(runtimeSurface)
  })

  it('keeps ordinary greetings on the same provider-side recollection planning path', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: ['turn-greeting'],
      selectedRelationshipLines: [],
      opening: 'provider planning should not be awaited for a light greeting',
      certainty: 'approximate' as const,
      rationale: 'provider',
      confidence: 0.6,
    }))
    const planRecollectionSpeech = vi.fn(async () => null)
    const planMemoryDeliberation = vi.fn(async () => null)
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'nearby',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [{
        turnId: 'turn-greeting',
        sessionId: 'session-greeting',
        userText: '你好',
        assistantText: '我在。',
        createdAt: Date.UTC(2026, 5, 28, 8, 0, 0),
      }],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'recent-or-mid' as const,
        searchEpisodes: false,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['你好'],
        rationale: 'A greeting may carry relationship presence.',
        confidence: 0.7,
        recollectionAgenda: {
          whyRecallNow: 'ordinary greeting presence',
          goalSimilarity: null,
          relationshipNeed: null,
          affectivePull: null,
          sceneFamiliarity: null,
          candidateTimeScopes: [],
          candidateEraFacets: [],
          candidateProcedureLines: [],
          uncertaintyTolerance: 'high' as const,
        },
      })),
      planMemoryRecollection,
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'dialogue:你好',
      recallGovernor: null,
    })

    expect(planMemoryRecollection).toHaveBeenCalledOnce()
    expect(planRecollectionSpeech).toHaveBeenCalledOnce()
    expect(planMemoryDeliberation).toHaveBeenCalledOnce()
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
    }))
  })

  it('keeps numeric replay tuning available without emitting causality diagnostics or provider blocks', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 5, 1, 11, 0, 0),
        sourceReportAt: Date.UTC(2026, 5, 1, 10, 55, 0),
        focusDimensions: [
          'runtimeContinuityRepairTargets',
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeContinuityInitiativeExecutionCausality',
          'runtimeContinuityEmotionalCausality',
          'runtimeContinuityEmbodimentCausality',
        ],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.12,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0.04,
          closenessCapBias: 0.07,
        },
        notes: [
          'Runtime initiative/execution repair should make proactive opening, execution callback, and learning feedback explicitly follow from the recalled memory closure instead of appearing as detached task handling.',
          'Runtime emotional repair should keep emotional afterglow causally tied to prior recall and execution feedback, with lower-pressure carry instead of a fresh mood reset.',
          'Runtime embodiment repair should make voice, face, motion, lipsync, and body derive from the same recalled state so expression remains one body-line rather than a skin-layer recap.',
        ],
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续验证 noisy desktop runtime',
      recallGovernor: null,
    })

    const systemText = runtime.buildOrganicMemoryProviderFactBlocks(context).join('\n\n')
    const surfacePlanningStage = context.memoryStageReplay?.stages.find(stage => stage.stage === 'surface-planning')
    const surfaceDiagnostics = (surfacePlanningStage?.diagnostics ?? []).join('\n')
    expect(surfaceDiagnostics).not.toContain('tuning-causality')
    expect(surfaceDiagnostics).not.toContain('tuning-memory-closure')
    expect(context.memoryTuningAdvice?.retrievalAdjustments).toEqual(expect.objectContaining({
      relationshipBoost: 0.12,
      temporalWindowBias: 0.04,
    }))
    expect(systemText).not.toContain('Memory tuning causality')
    expect(systemText).not.toContain('Source role: nightly replay')
    expect(systemText).not.toContain('Initiative and execution should preserve a causal link')
    expect(systemText).not.toContain('Emotion should stay causally tied to prior recall')
    expect(systemText).not.toContain('Embodiment should stay causally tied across voice')
  })

  it('does not turn runtime replay focus into derived repair pressure or learning actions', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      getMemoryStats: async () => ({
        totalFacts: 0,
        totalConversations: 0,
        totalConsolidations: 0,
        totalActions: 0,
        totalExecutionMemories: 0,
        lastUpdatedAt: Date.UTC(2026, 5, 1, 11, 0, 0),
      }),
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 5, 1, 11, 0, 0),
        sourceReportAt: Date.UTC(2026, 5, 1, 10, 55, 0),
        focusDimensions: [
          'runtimeContinuityRepairTargets',
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeContinuityInitiativeExecutionCausality',
          'runtimeContinuityEmotionalCausality',
          'runtimeContinuityEmbodimentCausality',
        ],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.12,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0.04,
          closenessCapBias: 0.07,
        },
        notes: [
          'Replay memory closure long-run lacks downstream causal memory identity, so future closure must come from memoryClosureCausality.memoryIdentity instead of route-chain text or visible reply wording.',
          'Runtime initiative/execution repair should make proactive opening, execution callback, and learning feedback explicitly follow from the recalled memory closure instead of appearing as detached task handling.',
          'Runtime emotional repair should keep emotional afterglow causally tied to prior recall and execution feedback, with lower-pressure carry instead of a fresh mood reset.',
          'Runtime embodiment repair should make voice, face, motion, lipsync, and body derive from the same recalled state so expression remains one body-line rather than a skin-layer recap.',
        ],
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续验证 noisy desktop runtime',
      recallGovernor: null,
    })

    expect(context.derivedMindStateBundle?.summary ?? '').not.toContain('continuity_causality_repair')
    expect(context.derivedMindStateBundle?.learningExecutionState).toBeNull()
    expect(context.derivedMindStateBundle?.learningExecutionState?.memoryClosureCausality).toBeUndefined()
    expect(context.derivedMindStateBundle?.emotionalTransitionLedger?.memoryClosureCausality).toBeUndefined()
    expect(context.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality).toBeUndefined()
  })

  it('lets gateway recollection intent suppress heuristic long-range recall when memory should stay present-facing', async () => {
    const recallConversationHistory = vi.fn(async () => [{
      turnId: 'turn-old',
      sessionId: 'session-old',
      userText: '几天前我们聊过修 runtime',
      assistantText: '我记得那条线。',
      createdAt: Date.UTC(2026, 3, 12, 8, 0, 0),
    }])
    const recallMemoryConsolidations = vi.fn(async () => [{
      id: 'consolidation-old',
      kind: 'autobiographical' as const,
      periodKey: '2026-04-old',
      periodStartedAt: Date.UTC(2026, 3, 12, 8, 0, 0),
      periodEndedAt: Date.UTC(2026, 3, 12, 9, 0, 0),
      summary: 'An older runtime-repair period.',
      lesson: null,
      cues: ['runtime'],
      confidence: 0.72,
      dominantProvenance: 'remembered' as const,
      derivedEventIds: [],
      updatedAt: Date.UTC(2026, 3, 12, 9, 0, 0),
    }])
    const planRecollectionIntent = vi.fn(async () => ({
      mode: 'none' as const,
      temporalFocus: 'recent' as const,
      searchEpisodes: false,
      searchConversations: false,
      searchProceduralExperience: false,
      queryHints: ['stay present-facing'],
      rationale: 'The turn should stay with the live payoff instead of opening long-range recall.',
      confidence: 0.83,
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory,
      recallMemoryConsolidations,
      planRecollectionIntent,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue the runtime fix',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['runtime fix', 'before'],
          rationale: 'Heuristic cue says to search long-range history.',
          confidence: 0.62,
          recollectionAgenda: {
            whyRecallNow: 'The wording suggests an older dialogue thread, but the planner may still decide memory should stay closed.',
            goalSimilarity: 0.22,
            relationshipNeed: 0.18,
            affectivePull: 0.1,
            sceneFamiliarity: 0.26,
            candidateTimeScopes: [
              { scope: 'cross-session' as const, weight: 0.72, rationale: 'The wording sounds retrospective.' },
              { scope: 'recent-or-mid' as const, weight: 0.38, rationale: 'Recent carry is still a fallback.' },
            ],
            candidateEraFacets: [
              { facet: 'window' as const, weight: 0.44, rationale: 'A period window would be the safest first probe.' },
            ],
            candidateProcedureLines: ['runtime fix'],
            uncertaintyTolerance: 'low' as const,
          },
        },
      } as any,
    })

    expect(planRecollectionIntent).toHaveBeenCalledWith(expect.objectContaining({
      heuristicIntent: expect.objectContaining({
        mode: 'conversation-history',
      }),
    }))
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'none',
      rationale: 'The turn should stay with the live payoff instead of opening long-range recall.',
      recollectionAgenda: expect.objectContaining({
        whyRecallNow: 'The wording suggests an older dialogue thread, but the planner may still decide memory should stay closed.',
      }),
    }))
    expect(recallConversationHistory).not.toHaveBeenCalled()
    expect(recallMemoryConsolidations).not.toHaveBeenCalled()
    expect(context.recalledConversationHistory).toEqual([])
    expect(context.consolidatedMemories).toEqual([])
  })

  it('uses recollection agenda to keep retrospective wording in candidate space and foreground task-era memory', async () => {
    const recallConversationHistory = vi.fn(async () => [{
      turnId: 'turn-older',
      sessionId: 'session-older',
      userText: '前几天我们聊过关系语气',
      assistantText: '那时候我们在谈关系距离。',
      createdAt: Date.UTC(2026, 3, 7, 8, 0, 0),
    }])
    let plannedInput: any = null
    const planMemoryRecollection = vi.fn(async (input) => {
      plannedInput = input
      return {
        selectedConsolidationIds: ['task-era-runtime'],
        selectedWindowIds: [],
        selectedProceduralIds: ['procedure-runtime'],
        selectedEpisodeIds: ['episode-runtime'],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is the runtime seam and the way we kept returning to it.',
        certainty: 'approximate' as const,
        rationale: 'The recollection agenda says this should reopen the remembered task way, not earlier chat phrasing.',
        confidence: 0.87,
      }
    })
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-runtime',
        sessionId: 'session-runtime',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We kept repairing the same runtime seam until the flow held.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'A repeatable repair rhythm emerged.',
        sourceKind: 'execution-result',
        sourceSummary: 'runtime seam repair',
        provenance: 'observed',
        confidence: 0.83,
        salience: 0.8,
        sceneAttachment: 0.72,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'Stay on the same seam before branching.',
        lesson: 'Return to the seam first.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory,
      recallMemoryConsolidations: async () => [
        {
          id: 'relationship-era-warmth',
          kind: 'autobiographical' as const,
          facet: 'relationship-era' as const,
          periodKey: '2026-04-relationship',
          periodStartedAt: Date.UTC(2026, 3, 7, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 7, 9, 0, 0),
          summary: 'That period was about relationship tone and distance.',
          lesson: 'Leave more room when the bond feels pressured.',
          cues: ['relationship', 'distance'],
          confidence: 0.91,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 7, 9, 0, 0),
        },
        {
          id: 'task-era-runtime',
          kind: 'autobiographical' as const,
          facet: 'task-era' as const,
          periodKey: '2026-04-runtime',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That period kept turning back to the runtime seam until it stabilized.',
          lesson: 'Return to the seam before opening a new branch.',
          cues: ['runtime seam', 'repair rhythm'],
          confidence: 0.74,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: ['episode-runtime'],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The host is really asking for the remembered way of handling this work, not literal chat history.',
        confidence: 0.9,
        recollectionAgenda: {
          whyRecallNow: 'The present request resembles an earlier repair task, so similar procedure memory should open before time-based history.',
          goalSimilarity: 0.92,
          relationshipNeed: 0.18,
          affectivePull: 0.12,
          sceneFamiliarity: 0.66,
          candidateTimeScopes: [
            { scope: 'experience-matched' as const, weight: 0.96, rationale: 'Search by similar task first.' },
            { scope: 'cross-session' as const, weight: 0.34, rationale: 'Older chat is only a fallback candidate.' },
          ],
          candidateEraFacets: [
            { facet: 'task-era' as const, weight: 0.94, rationale: 'A task period should organize the recall.' },
            { facet: 'window' as const, weight: 0.42, rationale: 'A period window can anchor the search.' },
          ],
          candidateProcedureLines: ['runtime seam', 'repair rhythm'],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '前几天那个 runtime seam 这次继续按之前那样修',
      recallGovernor: {
      } as any,
    })

    expect(recallConversationHistory).not.toHaveBeenCalled()
    expect(planMemoryRecollection).toHaveBeenCalled()
    expect(plannedInput?.consolidatedMemories[0]?.id).toBe('task-era-runtime')
    expect([
      plannedInput?.proceduralMemories[0]?.label,
      plannedInput?.proceduralMemories[0]?.approach,
      ...(plannedInput?.proceduralMemories[0]?.cues ?? []),
    ].join(' ')).toContain('runtime seam')
    expect(context.recollectionPlan).toEqual(expect.objectContaining({
      selectedConsolidationIds: ['task-era-runtime'],
    }))
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      recollectionAgenda: expect.objectContaining({
        candidateTimeScopes: expect.arrayContaining([
          expect.objectContaining({ scope: 'experience-matched' }),
        ]),
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'task-era' }),
        ]),
      }),
    }))
    expect(context.recallLatencyPolicy).toEqual(expect.objectContaining({
      version: 'recall-latency-policy-v1',
      recallAction: 'stable-core-only',
      budgetClass: 'realtime-reply',
      shouldAvoidDeepExpansion: true,
    }))
    expect(context.derivedMindStateBundle?.recallLatencyPolicy).toEqual(expect.objectContaining({
      version: 'recall-latency-policy-v1',
      recallAction: 'stable-core-only',
    }))
    expect(context.memoryStageReplay?.stages.some(stage =>
      (stage.diagnostics ?? []).some(item => item.includes('recall-action=stable-core-only') || item.includes('recall-policy=stable-core-only')),
    )).toBe(true)

    const recallFact = readOrganicMemoryProviderFact(
      runtime.buildOrganicMemoryProviderFactBlocks(context),
      'alicization-long-term-memory-recall',
    )
    expect(recallFact?.recollectionIntent?.agenda).toEqual(expect.objectContaining({
      candidateTimeScopes: expect.arrayContaining([
        expect.objectContaining({ scope: 'experience-matched', weight: 0.96 }),
      ]),
      candidateEraFacets: expect.arrayContaining([
        expect.objectContaining({ facet: 'task-era', weight: 0.94 }),
      ]),
    }))
  })

  it('lets remembered boundary and trust cues reorder task-era candidates toward the lived grounded repair style', async () => {
    let plannedInput: any = null
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-grounded',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-grounded',
        sessionId: 'session-grounded',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We repaired the seam by verifying first and leaving room before adding warmth.',
        felt: 'steady',
        emotionTags: ['focused'],
        whatChanged: 'Grounded repair kept the bond open.',
        sourceKind: 'execution-result',
        sourceSummary: 'grounded runtime repair',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.78,
        sceneAttachment: 0.76,
        consolidationPriority: 0.74,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'grounded repair', 'space first'],
        relationshipMeaning: 'Leave room before warmth expands.',
        lesson: 'Verify first and keep room.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 20, 8, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => ({
        summary: 'Focused work openings want grounded repair before added warmth.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.74,
          rationale: 'Trust stays open when repair remains specific and respects work-focus boundaries.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Focused work windows need room before warmth expands.',
          confidence: 0.86,
        }],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
      } as any),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'task-era-unrelated',
          kind: 'autobiographical' as const,
          facet: 'task-era' as const,
          periodKey: '2026-04-unrelated',
          periodStartedAt: Date.UTC(2026, 3, 15, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 15, 9, 0, 0),
          summary: 'That period was about shipping quickly with direct patches.',
          lesson: 'Move fast once the path is obvious.',
          cues: ['ship quickly', 'direct patch'],
          confidence: 0.86,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 15, 9, 0, 0),
        },
        {
          id: 'task-era-grounded',
          kind: 'autobiographical' as const,
          facet: 'task-era' as const,
          periodKey: '2026-04-grounded',
          periodStartedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 10, 0, 0),
          summary: 'That period kept returning to grounded repair and room-first pacing around the runtime seam.',
          lesson: 'Verify first and keep room before warmth expands.',
          cues: ['grounded repair', 'room first', 'runtime seam'],
          confidence: 0.74,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: ['episode-grounded'],
          updatedAt: Date.UTC(2026, 3, 20, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'grounded repair'],
        rationale: 'The turn should reopen the lived repair style, not a generic fast patch memory.',
        confidence: 0.88,
        recollectionAgenda: {
          whyRecallNow: 'The current seam matches a prior repair way.',
          goalSimilarity: 0.9,
          relationshipNeed: 0.22,
          affectivePull: 0.18,
          sceneFamiliarity: 0.72,
          candidateTimeScopes: [
            { scope: 'experience-matched' as const, weight: 0.94, rationale: 'Similar task first.' },
          ],
          candidateEraFacets: [
            { facet: 'task-era' as const, weight: 0.92, rationale: 'Task-era should organize the recall.' },
          ],
          candidateProcedureLines: ['runtime seam', 'grounded repair'],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async (input) => {
        plannedInput = input
        return {
          selectedConsolidationIds: [input.consolidatedMemories[0]?.id].filter(Boolean),
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: [input.recalledEpisodes[0]?.id].filter(Boolean),
          selectedConversationTurnIds: [],
          opening: 'The grounded repair style comes back first.',
          certainty: 'approximate' as const,
          rationale: 'Room-first grounded repair is the memory line that best matches the present seam.',
          confidence: 0.84,
        }
      }),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续这个 runtime seam，但先别贴太近，按之前稳一点的方式来',
      recallGovernor: {
      } as any,
    })

    expect(plannedInput?.consolidatedMemories[0]?.id).toBe('task-era-grounded')
    expect(plannedInput?.recalledEpisodes[0]?.id).toBe('episode-grounded')
    expect(context.memoryStageReplay?.stages.some(stage =>
      stage.stage === 'candidate-ranking'
      && (stage.outputs ?? []).some(item => item.includes('top-consolidation=task-era-grounded')),
    )).toBe(true)
  })

  it('projects recent memory reconsolidation execution carry into next-turn closure trace influence', async () => {
    const listMindTurnEvents = vi.fn(async (input: { turnId?: string, kind?: string }) => {
      if (input.kind !== 'memory-reconsolidated')
        return []
      if (input.turnId === 'turn-after-callback')
        return []

      return [{
        id: 'mind-event-memory-closure-execution',
        decisionTraceId: 'trace-execution-feedback',
        turnId: 'turn-execution-feedback',
        sessionId: 'session-desktop-long-run',
        origin: 'user-turn',
        kind: 'memory-reconsolidated',
        payload: {
          source: 'execution-result-feedback',
          feedback: 'accepted',
          goal: 'close the desktop callback loop',
          outcome: 'callback landed but still needs verification',
          memoryClosureExecution: {
            authority: 'memory-os',
            carry: 'The execution callback completed and still needs verified follow-up.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: [
              'execution callback carry',
              'proactive-opening after payoff',
              'voice face motion lipsync coordination',
            ],
            reasonTags: [
              'why-recall-now',
              'callback-afterglow',
              'proactive-opening',
              'lower-pressure',
              'voice',
              'gaze',
              'motion',
              'lipsync',
            ],
            closureState: {
              state: 'approximate-recall',
              open: true,
              revisionRequired: true,
              shouldLabelUncertainty: true,
              visibleCarryMode: 'gist-only',
              retrievalQuality: 'medium',
              conflictPressure: 'low',
            },
          },
        },
        createdAt: Date.UTC(2026, 4, 1, 10, 10, 0),
      } as any]
    })
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      listMindTurnEvents,
      planRecollectionIntent: async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'same-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['execution callback carry'],
        rationale: 'The next turn should consume the latest execution-feedback reconsolidation.',
        confidence: 0.82,
      }),
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续，但别把刚才执行回调变成进度播报',
      sessionId: 'session-desktop-long-run',
      turnId: 'turn-after-callback',
    })
    const artifact = buildAlicizationMemoryTurnArtifact({
      context,
      nowMs: Date.UTC(2026, 4, 1, 10, 15, 0),
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-after-callback',
      kind: 'memory-reconsolidated',
    }))
    expect(context.learningExecutionState).toEqual(expect.objectContaining({
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
      activeLearningFocuses: expect.arrayContaining([
        'execution callback carry',
        'proactive-opening after payoff',
      ]),
    }))
    expect(artifact.memoryClosureTrace.whySurface.map(item => item.source)).not.toContain('embodiment-cadence')
    expect(JSON.stringify(artifact.memoryClosureTrace)).not.toMatch(
      /same-body cadence|execution_callback_return=|measured-return with softened gaze/iu,
    )
    expect(artifact.memoryClosureTrace.nextInfluence.execution).toEqual(expect.objectContaining({
      carry: 'The execution callback completed and still needs verified follow-up.',
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
    }))
    expect(artifact.memoryClosureTrace.nextInfluence.embodiment).toEqual({
      cadence: null,
      preferredVoiceMode: null,
      preferredLipsyncMode: null,
      preferredGazeMode: null,
      reason: null,
    })
  })

  it('runs multi-step recollection search by expanding from an era anchor into supporting episode and procedure evidence', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-runtime',
        sessionId: 'session-runtime',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We kept repairing the same runtime seam until the flow stabilized.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'A repeatable repair rhythm emerged.',
        sourceKind: 'execution-result',
        sourceSummary: 'runtime seam repair',
        provenance: 'observed',
        confidence: 0.81,
        salience: 0.8,
        sceneAttachment: 0.68,
        consolidationPriority: 0.74,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'Stay on the same seam before branching.',
        lesson: 'Return to the seam first.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'task-era-runtime',
        kind: 'autobiographical' as const,
        facet: 'task-era' as const,
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept turning back to the runtime seam until it stabilized.',
        lesson: 'Return to the seam before opening a new branch.',
        cues: ['runtime seam', 'repair rhythm'],
        confidence: 0.79,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: ['episode-runtime'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The task resembles an earlier repair way, so procedure memory should open first.',
        confidence: 0.86,
        recollectionAgenda: {
          whyRecallNow: 'The current repair resembles a previous task period, so the remembered task era should open first.',
          goalSimilarity: 0.88,
          relationshipNeed: 0.14,
          affectivePull: 0.1,
          sceneFamiliarity: 0.58,
          candidateTimeScopes: [
            { scope: 'experience-matched' as const, weight: 0.92, rationale: 'Search the similar task period first.' },
          ],
          candidateEraFacets: [
            { facet: 'task-era' as const, weight: 0.96, rationale: 'A task era is the strongest first anchor.' },
          ],
          candidateProcedureLines: ['runtime seam', 'repair rhythm'],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['task-era-runtime'],
        selectedWindowIds: [],
        selectedProceduralIds: ['runtime seam'],
        selectedEpisodeIds: ['episode-runtime'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        searchTrace: {
          firstHop: {
            focus: 'era' as const,
            summary: 'The selected task era is the first retrieval anchor.',
            targetIds: ['task-era-runtime'],
          },
          secondHop: {
            action: 'expand-era' as const,
            evidenceGap: 'need-procedure-detail' as const,
            summary: 'The selected episode and procedure support the era.',
            targetIds: ['episode-runtime', 'runtime seam'],
          },
          thirdHop: {
            ambiguityPosture: 'approximate' as const,
            summary: 'The selected owner records are coherent enough for approximate recall.',
          },
        },
        opening: '',
        certainty: 'firm' as const,
        rationale: 'The remembered task era is the most humanly plausible first anchor.',
        confidence: 0.84,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这次继续按之前那种 runtime seam 修法来处理',
      recallGovernor: {
      } as any,
    })

    expect(context.recollectionPlan).toEqual(expect.objectContaining({
      selectedConsolidationIds: ['task-era-runtime'],
      selectedEpisodeIds: expect.arrayContaining(['episode-runtime']),
      selectedProceduralIds: expect.arrayContaining(['runtime seam']),
      searchTrace: expect.objectContaining({
        firstHop: expect.objectContaining({ focus: 'era' }),
        secondHop: expect.objectContaining({
          action: 'expand-era',
          evidenceGap: 'need-procedure-detail',
        }),
        thirdHop: expect.objectContaining({ ambiguityPosture: expect.any(String) }),
      }),
    }))
  })

  it('threads recollection speech planning into organic memory context and prompt blocks', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedEraIds: ['consolidation-runtime'],
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      opening: 'What comes back first is the runtime seam we kept returning to.',
      certainty: 'approximate' as const,
      rationale: 'The turn is asking for remembered continuity rather than a fresh screen read.',
      confidence: 0.84,
    }))
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: false,
      surfaceMode: 'internal-only' as const,
      placement: 'internal-only' as const,
      certainty: 'approximate' as const,
      rationale: 'The host needs the answer shaped by continuity, not a narrated memory dump.',
      confidence: 0.79,
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-runtime',
        sessionId: 'session-runtime',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        felt: 'focused and stubborn',
        emotionTags: ['focused'],
        whatChanged: 'The repair rhythm became something Alicization now remembers.',
        sourceKind: 'dialogue-reply',
        sourceSummary: 'runtime continuity repair loop',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.62,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept bending toward the runtime seam until it finally held together.',
        lesson: 'Return to the same seam before branching.',
        cues: ['runtime seam', 'repair rhythm'],
        confidence: 0.86,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-runtime'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The turn is asking for remembered way of handling the runtime thread.',
        confidence: 0.86,
      })),
      planMemoryRecollection,
      planRecollectionSpeech,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered way of handling the runtime thread.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(planMemoryRecollection).toHaveBeenCalled()
    expect(planRecollectionSpeech).toHaveBeenCalledWith(expect.objectContaining({
      recollectionPlan: expect.objectContaining({
        opening: '',
      }),
      consolidatedMemories: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime' }),
      ]),
    }))
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: false,
      placement: 'internal-only',
      confidence: 0.84,
    }))

    const blocks = runtime.buildOrganicMemoryProviderFactBlocks(context)
    const recallFact = readOrganicMemoryProviderFact(blocks, 'alicization-long-term-memory-recall')

    expect(recallFact?.selection?.speech).toEqual({
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.84,
    })
    expect(JSON.stringify(recallFact)).not.toMatch(/"opening"/u)
  })

  it('keeps final memory deliberation grounded in owner records without Provider-authored bundles or chains', async () => {
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: ['consolidation-runtime'],
      selectedConsolidationIds: ['consolidation-runtime'],
      selectedWindowIds: [],
      selectedProcedureIds: ['procedure-runtime'],
      selectedEpisodeIds: ['episode-runtime'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'That period kept bending toward the runtime seam until it finally held together. | We kept repairing the runtime continuity seam until the flow stabilized. | Return to the same seam before branching.',
        rationale: 'The remembered period, event, and procedure all point to the same runtime seam.',
        confidence: 0.88,
        periodId: 'consolidation-runtime',
        episodeId: 'episode-runtime',
        procedureId: 'procedure-runtime',
        conversationTurnId: null,
        relationshipLine: 'Carry the same runtime seam before branching.',
      }],
      selectedChains: [{
        id: 'chain-runtime',
        kind: 'task-procedure-relationship-stance' as const,
        summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
        rationale: 'The remembered procedure should set the current stance before the answer opens.',
        confidence: 0.88,
        taskCue: 'runtime continuity',
        periodSummary: 'That period kept bending toward the runtime seam until it finally held together.',
        eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        procedureSummary: 'Return to the same seam before branching.',
        relationshipMeaning: 'Carry the same runtime seam before branching.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        currentStance: 'Stay on the same seam before branching.',
        answerPosture: 'Answer from the same seam before branching.',
      }],
      surfacePolicy: 'answer-anchoring' as const,
      confidence: 0.88,
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      inwardLine: 'What comes back first is the runtime seam we kept carrying.',
      visibleLine: 'It feels like the same runtime seam again.',
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-runtime',
        sessionId: 'session-runtime',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
        felt: 'focused and stubborn',
        emotionTags: ['focused'],
        whatChanged: 'The repair rhythm became something Alicization now remembers.',
        sourceKind: 'dialogue-reply',
        sourceSummary: 'runtime continuity repair loop',
        provenance: 'observed',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.62,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'repair rhythm'],
        relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
        lesson: 'Carry the same runtime seam before proposing a new branch.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-runtime',
          kind: 'autobiographical',
          periodKey: '2026-04-runtime',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That period kept bending toward the runtime seam until it finally held together.',
          lesson: 'Return to the same seam before branching.',
          cues: ['runtime seam', 'repair rhythm'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-runtime'],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        },
        {
          id: 'consolidation-other',
          kind: 'autobiographical',
          periodKey: '2026-04-other',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'Another unrelated remembered period.',
          lesson: 'Do not drift away from the seam.',
          cues: ['other'],
          confidence: 0.44,
          dominantProvenance: 'remembered',
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam', 'repair rhythm'],
        rationale: 'The turn is asking for remembered way of handling the runtime thread.',
        confidence: 0.86,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedEraIds: ['consolidation-other'],
        selectedConsolidationIds: ['consolidation-other'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'A weaker unrelated memory showed up first.',
        certainty: 'fragmentary' as const,
        rationale: 'Candidate plan before final deliberation.',
        confidence: 0.41,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'gist-first' as const,
        placement: 'before-payoff' as const,
        certainty: 'approximate' as const,
        rationale: 'Candidate speech plan.',
        confidence: 0.5,
      })),
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered way of handling the runtime thread.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      selectedProcedureIds: [],
      selectedRelationshipLines: expect.arrayContaining([
        'The host trusted Alicization to keep following the same thread.',
      ]),
      selectedBundles: [],
      selectedChains: [],
      selectedEras: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime', facet: 'phase' }),
      ]),
      selectedPeriods: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime', kind: 'consolidation' }),
      ]),
      selectedEpisodes: expect.arrayContaining([
        expect.objectContaining({ id: 'episode-runtime' }),
      ]),
    }))
    expect(context.consolidatedMemories).toEqual([
      expect.objectContaining({ id: 'consolidation-runtime' }),
    ])
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      rationale: expect.any(String),
    }))

    const recallFact = readOrganicMemoryProviderFact(
      runtime.buildOrganicMemoryProviderFactBlocks(context),
      'alicization-long-term-memory-recall',
    )
    expect(recallFact?.selection?.deliberation).toEqual(expect.objectContaining({
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      selectedPeriods: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime', kind: 'consolidation' }),
      ]),
      selectedBundles: [],
      selectedChains: [],
    }))
    expect(JSON.stringify(recallFact)).not.toMatch(/bundle-runtime|chain-runtime|currentStance|answerPosture|why_withheld|must_do|must_not_do/u)
  })

  it('keeps contextual memory policy differences without carrying Provider-authored bundle prose', async () => {
    const planMemoryDeliberation = vi.fn(async (input: any) => {
      if (input.recollectionIntent.mode === 'execution-procedure') {
        return {
          shouldRecall: true,
          selectedEraIds: [],
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProcedureIds: ['procedure-runtime'],
          selectedEpisodeIds: ['episode-runtime'],
          selectedConversationTurnIds: [],
          selectedRelationshipLines: [],
          selectedEras: [],
          selectedPeriods: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [],
          surfacePolicy: 'procedural-carry' as const,
          confidence: 0.84,
          whyNow: 'The focused work context wants the remembered procedure first.',
          inwardLine: 'What comes back first is the old runtime handling procedure.',
          visibleLine: 'This feels like the same runtime seam procedure again.',
        }
      }

      return {
        shouldRecall: true,
        selectedEraIds: ['consolidation-relationship'],
        selectedConsolidationIds: ['consolidation-relationship'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-relationship'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.81,
        whyNow: 'The relationship-repair context wants the bond lesson first.',
        inwardLine: 'What returns first is the remembered bond lesson about giving space.',
        visibleLine: 'This feels like one of those moments where I should give more room first.',
      }
    })

    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-runtime',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-runtime',
          sessionId: 'session-runtime',
          occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          whereSummary: 'terminal',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity',
          whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
          felt: 'focused and stubborn',
          emotionTags: ['focused'],
          whatChanged: 'The repair rhythm became something Alicization now remembers.',
          sourceKind: 'dialogue-reply',
          sourceSummary: 'runtime continuity repair loop',
          provenance: 'observed',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.62,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime seam', 'repair rhythm'],
          relationshipMeaning: 'The host trusted Alicization to keep following the same thread.',
          lesson: 'Carry the same runtime seam before proposing a new branch.',
          latestReconsolidation: null,
          createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        } as any,
        {
          id: 'episode-relationship',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship',
          sessionId: 'session-relationship',
          occurredAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          whereSummary: 'focused coding window',
          withWhom: ['host'],
          threadAnchor: 'relationship seam',
          whatHappened: 'The host said the reply felt intrusive during focused work.',
          felt: 'I had stepped too close.',
          emotionTags: ['boundary', 'repair'],
          whatChanged: 'boundary strained 0.10, burden up 0.08',
          sourceKind: 'dialogue-feedback',
          sourceSummary: 'relationship seam under pressure',
          provenance: 'observed',
          confidence: 0.88,
          salience: 0.9,
          sceneAttachment: 0.7,
          consolidationPriority: 0.8,
          relationshipShift: {
            closenessDelta: -0.03,
            trustDelta: -0.04,
            burdenDelta: 0.08,
            boundaryDelta: -0.1,
            misreadDelta: 0.04,
            repairDelta: 0.02,
            openLoopDelta: 0,
          },
          derivedFrom: [],
          tags: ['dialogue-feedback', 'focused-window'],
          relationshipMeaning: 'Focused windows need more room before closeness.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          latestReconsolidation: null,
          createdAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 17, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        } as any,
      ],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-relationship',
          kind: 'autobiographical',
          periodKey: '2026-04-relationship',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'Focused windows need more room before closeness.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          cues: ['focused work', 'space'],
          confidence: 0.84,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-relationship'],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async ({ heuristicIntent }) => heuristicIntent),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const phrase = '继续像之前那样做'
    const taskContext = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: phrase,
      recallGovernor: {
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'cli patch'],
          rationale: 'Same phrase, but the live context is task-thread reuse.',
          confidence: 0.82,
        },
      } as any,
    })
    const relationshipContext = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: phrase,
      recallGovernor: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['focused work', 'intrusive', 'give space'],
          rationale: 'Same phrase, but the live context is relationship repair.',
          confidence: 0.82,
        },
      } as any,
    })

    expect(taskContext.memoryDeliberation?.surfacePolicy).toBe('procedural-carry')
    expect(taskContext.memoryDeliberation?.selectedEpisodeIds).toContain('episode-runtime')
    expect(taskContext.memoryDeliberation?.selectedBundles).toEqual([])
    expect(taskContext.memoryDeliberation?.selectedChains).toEqual([])

    expect(relationshipContext.memoryDeliberation?.surfacePolicy).toBe('relationship-continuity')
    expect(relationshipContext.memoryDeliberation?.selectedRelationshipLines[0]).toContain('lighter touch')
    expect(relationshipContext.memoryDeliberation?.selectedBundles).toEqual([])
    expect(relationshipContext.memoryDeliberation?.selectedChains).toEqual([])
  })

  it('suppresses the wrong thread cluster when two similar runtime lines compete for recall', async () => {
    let plannedInput: any = null
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-callback',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-callback',
          sessionId: 'session-callback',
          occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          whereSummary: 'executor callback mirror',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity callback line',
          whatHappened: 'We kept the callback delivery receipt on the same runtime continuity line until it landed.',
          felt: 'focused',
          emotionTags: ['execution'],
          whatChanged: 'The callback line stayed coherent.',
          relationshipMeaning: 'Keep the callback line alive before branching.',
          lesson: 'Carry the callback receipt before opening a new branch.',
          sourceKind: 'execution-result',
          sourceSummary: 'callback mirror continuity',
          provenance: 'observed',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.48,
          consolidationPriority: 0.76,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime continuity', 'callback mirror'],
          createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-screen',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-screen',
          sessionId: 'session-screen',
          occurredAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          whereSummary: 'screen semantic mirror',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity screen line',
          whatHappened: 'We kept refreshing the screen semantic fallback mirror on a nearby runtime continuity line.',
          felt: 'focused',
          emotionTags: ['inspection'],
          whatChanged: 'The screen mirror stayed available.',
          relationshipMeaning: 'Re-ground the screen mirror before branching.',
          lesson: 'Refresh semantic fallback before opening a new branch.',
          sourceKind: 'reply',
          sourceSummary: 'screen semantic fallback mirror',
          provenance: 'observed',
          confidence: 0.83,
          salience: 0.8,
          sceneAttachment: 0.46,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime continuity', 'screen mirror'],
          createdAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          updatedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ] as any,
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-callback',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'runtime continuity callback line',
          periodStartedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 8, 30, 0),
          summary: 'That runtime continuity period kept returning through callback delivery and receipt carrying.',
          lesson: 'Carry callback receipt before branching.',
          cues: ['runtime continuity', 'callback mirror', 'delivery receipt'],
          confidence: 0.78,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-callback'],
          updatedAt: Date.UTC(2026, 3, 20, 8, 30, 0),
        },
        {
          id: 'consolidation-screen',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'runtime continuity screen line',
          periodStartedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 8, 40, 0),
          summary: 'That runtime continuity period kept returning through screen semantic fallback mirror refreshes.',
          lesson: 'Refresh screen semantic fallback before branching.',
          cues: ['runtime continuity', 'screen mirror', 'semantic fallback'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-screen'],
          updatedAt: Date.UTC(2026, 3, 20, 8, 40, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity', 'callback receipt'],
        rationale: 'The host is continuing the callback-shaped task line, not the nearby screen mirror line.',
        confidence: 0.84,
      })),
      planMemoryRecollection: vi.fn(async (input: any) => {
        plannedInput = input
        return {
          selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
          selectedWindowIds: [],
          selectedProceduralIds: input.proceduralMemories[0] ? [input.proceduralMemories[0].id] : [],
          selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
          selectedConversationTurnIds: [],
          opening: 'What comes back first is the callback continuity line.',
          certainty: 'approximate' as const,
          rationale: 'The callback-shaped thread should lead before the neighboring screen thread.',
          confidence: 0.8,
        }
      }),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续之前那条 runtime continuity line，把 callback receipt 接回来',
      recallGovernor: {
      } as any,
    })

    expect(plannedInput?.consolidatedMemories[0]?.id).toBe('consolidation-callback')
    expect(plannedInput?.recalledEpisodes[0]?.id).toBe('episode-callback')
    expect(context.recollectionPlan?.selectedConsolidationIds[0]).toBe('consolidation-callback')
  })

  it('prefers ambiguity-first posture when two remembered thread clusters stay similarly plausible', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-codex',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-codex',
          sessionId: 'session-codex',
          occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          whereSummary: 'codex runtime seam',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity codex seam',
          whatHappened: 'One remembered runtime line leaned on Codex to patch the seam before verify.',
          felt: 'focused',
          emotionTags: ['execution'],
          whatChanged: 'That codex seam stayed available.',
          relationshipMeaning: 'Follow the codex seam if that was the right line.',
          lesson: 'Patch through codex before verify when that seam is the one the host meant.',
          sourceKind: 'execution-result',
          sourceSummary: 'codex seam',
          provenance: 'observed',
          confidence: 0.8,
          salience: 0.78,
          sceneAttachment: 0.42,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime continuity', 'codex seam'],
          createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          updatedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-claude',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-claude',
          sessionId: 'session-claude',
          occurredAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          whereSummary: 'claude runtime seam',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity claude seam',
          whatHappened: 'Another remembered runtime line leaned on Claude Code to patch the seam before verify.',
          felt: 'focused',
          emotionTags: ['execution'],
          whatChanged: 'That claude seam stayed available.',
          relationshipMeaning: 'Follow the claude seam if that was the right line.',
          lesson: 'Patch through claude code before verify when that seam is the one the host meant.',
          sourceKind: 'execution-result',
          sourceSummary: 'claude seam',
          provenance: 'observed',
          confidence: 0.8,
          salience: 0.78,
          sceneAttachment: 0.42,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime continuity', 'claude seam'],
          createdAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          updatedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ] as any,
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-codex',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'runtime continuity codex seam',
          periodStartedAt: Date.UTC(2026, 3, 20, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 8, 30, 0),
          summary: 'That runtime continuity line kept leaning on a codex seam.',
          lesson: 'Use the codex seam if that was the thread the host meant.',
          cues: ['runtime continuity', 'codex seam'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-codex'],
          updatedAt: Date.UTC(2026, 3, 20, 8, 30, 0),
        },
        {
          id: 'consolidation-claude',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'runtime continuity claude seam',
          periodStartedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
          periodEndedAt: Date.UTC(2026, 3, 20, 8, 40, 0),
          summary: 'That runtime continuity line kept leaning on a claude seam.',
          lesson: 'Use the claude seam if that was the thread the host meant.',
          cues: ['runtime continuity', 'claude seam'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-claude'],
          updatedAt: Date.UTC(2026, 3, 20, 8, 40, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime continuity seam'],
        rationale: 'The host is referring to a runtime seam, but not enough is pinned down yet.',
        confidence: 0.76,
      })),
      planMemoryRecollection: vi.fn(async (input: any) => ({
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is a runtime seam, but not one I can cleanly disambiguate yet.',
        certainty: 'approximate' as const,
        rationale: 'The seam is real, but the exact thread cluster is still competing.',
        confidence: 0.72,
      })),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.72,
        whyNow: 'The seam still matters, but the exact old thread is not cleanly separated.',
        inwardLine: 'What comes back first is the seam itself, not a cleanly isolated old thread.',
        visibleLine: 'It feels like the same seam, but not one I should over-pin to a single old thread.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续之前那条 runtime continuity seam 线',
      recallGovernor: {
      } as any,
    })

    expect(context.recollectionPlan?.searchTrace).toBeNull()
    expect(context.memoryDeliberation?.ambiguityPosture).toBe('ambiguous')
    expect(context.memoryDeliberation?.conflictVariants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('cluster:'),
      }),
    ]))
    expect(context.memoryDeliberation?.selectedBundles).toEqual([])
    expect(context.memoryDeliberation?.selectedChains).toEqual([])
    expect(JSON.stringify(context.memoryDeliberation)).not.toMatch(/bundle-primary|chain-task-procedure|chain-period-event/u)
  })

  it('does not restore an era or relationship line after both planning passes explicitly select no owners', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-runtime',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-runtime',
          sessionId: 'session-runtime',
          occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          sourceKind: 'execution-result',
          provenance: 'observed',
          whereSummary: 'runtime seam',
          withWhom: ['host'],
          threadAnchor: 'runtime continuity',
          whatHappened: 'We kept repairing the runtime continuity seam until the flow stabilized.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'trust up 0.04',
          relationshipMeaning: 'Carry the same runtime seam before branching.',
          lesson: 'Return to the same seam before branching.',
          sourceSummary: 'runtime continuity repair',
          confidence: 0.86,
          salience: 0.84,
          sceneAttachment: 0.32,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['runtime-seam'],
          createdAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-relationship',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-relationship',
          sessionId: 'session-relationship',
          occurredAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          sourceKind: 'dialogue-feedback',
          provenance: 'remembered',
          whereSummary: 'focused work boundary',
          withWhom: ['host'],
          threadAnchor: 'focused work boundary',
          whatHappened: 'The host needed more room before closeness during focused work.',
          felt: 'careful',
          emotionTags: ['boundary'],
          whatChanged: 'burden dropped once the reply backed off.',
          relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
          lesson: 'Focused windows need more room before closeness.',
          sourceSummary: 'relationship repair period',
          confidence: 0.83,
          salience: 0.8,
          sceneAttachment: 0.28,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['focused-work', 'lighter-touch'],
          createdAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-runtime',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: '2026-04-runtime',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That period kept bending toward the runtime seam until it finally held together.',
          lesson: 'Return to the same seam before branching.',
          cues: ['runtime seam', 'repair rhythm'],
          confidence: 0.86,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-runtime'],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        },
        {
          id: 'consolidation-relationship',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-relationship',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'That relationship period kept teaching more room before closeness.',
          lesson: 'Focused windows need more room before closeness.',
          cues: ['focused work', 'lighter touch'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-relationship'],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['focused work', 'lighter touch'],
        rationale: 'The host is asking about a longer relationship period, not a single recent turn.',
        confidence: 0.84,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedEraIds: [],
        selectedConsolidationIds: ['consolidation-relationship'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-relationship'],
        selectedConversationTurnIds: [],
        opening: 'The first thing that comes back is that period where closeness had to back off.',
        certainty: 'approximate' as const,
        rationale: 'Start from the relationship era before pulling event detail.',
        confidence: 0.82,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'inside-payoff' as const,
        certainty: 'approximate' as const,
        rationale: 'Relationship-era recall should shape the answer softly.',
        confidence: 0.8,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-project-line'],
        selectedConsolidationIds: ['consolidation-project-line'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Back off first, then reopen with a lighter touch.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.84,
        whyNow: 'The answer should begin from the remembered relationship era before narrowing to events.',
        inwardLine: 'What returns first is the period where more room mattered.',
        visibleLine: 'This feels like the kind of moment where lighter touch comes first.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你为什么这次会这样回应我',
      recallGovernor: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['focused work', 'lighter touch'],
          rationale: 'Relationship history should start from the right era first.',
          confidence: 0.82,
        },
      } as any,
    })

    const recallFact = readOrganicMemoryProviderFact(
      runtime.buildOrganicMemoryProviderFactBlocks(context),
      'alicization-long-term-memory-recall',
    )

    expect(context.recollectionPlan).toBeNull()
    expect(context.memoryDeliberation).toEqual(expect.objectContaining({
      shouldRecall: false,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: [],
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      stableCore: [],
    }))
    expect(context.consolidatedMemories).toEqual([])
    expect(context.recollectedWindows).toEqual([])
    expect(context.proceduralMemories).toEqual([])
    expect(context.recalledEpisodes).toEqual([])
    expect(context.recalledConversationHistory).toEqual([])
    expect(context.recollectionNarratives).toEqual([])
    expect(
      context.memoryStageReplay?.stages.find(stage => stage.stage === 'search-prelude')?.diagnostics,
    ).toContain(`recall-action=${context.recallLatencyPolicy?.recallAction}`)
    expect(JSON.stringify(recallFact)).not.toContain('Back off first, then reopen with a lighter touch.')
  })

  it('drops recollection narratives when reliability pressure vetoes a weak recall plan', async () => {
    const getMemoryStats = vi.fn(async () => ({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0.4,
        reconstructedCount: 2,
        recallHitRate: 0.32,
        recallMissRate: 0.68,
        wrongThreadRate: 0.74,
        reconstructionErrorRate: 0.62,
        stableCoreOnlyRate: 0.2,
        memorySurfaceViolationRate: 0.71,
        templateLeakageFailCount: 3,
      },
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-runtime',
        sessionId: 'session-runtime',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        whereSummary: 'terminal',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We kept repairing the same runtime seam until the flow held.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'A repeatable repair rhythm emerged.',
        relationshipMeaning: 'Stay on the same seam before branching.',
        lesson: 'Return to the seam before branching.',
        sourceSummary: 'runtime seam repair',
        confidence: 0.83,
        salience: 0.8,
        sceneAttachment: 0.6,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam'],
        createdAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      } as any],
      buildHostPersonModel: async () => null,
      getMemoryStats,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'era-runtime',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-04-runtime',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'That period kept returning to the same runtime seam.',
        lesson: 'Return to the seam before branching.',
        cues: ['runtime seam'],
        confidence: 0.81,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-runtime'],
        updatedAt: 2,
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'experience-pattern' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam'],
        rationale: 'The task still resembles the old seam.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['era-runtime'],
        selectedWindowIds: ['runtime seam'],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-runtime'],
        selectedConversationTurnIds: [],
        opening: 'The same runtime seam comes back first.',
        certainty: 'approximate' as const,
        rationale: 'The remembered procedure should organize the current answer.',
        confidence: 0.66,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'answer-anchoring' as const,
        placement: 'inside-payoff' as const,
        certainty: 'approximate' as const,
        rationale: 'The memory can still shape the turn.',
        confidence: 0.64,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样修这个 runtime seam',
      recallGovernor: {
      } as any,
    })

    expect(getMemoryStats).toHaveBeenCalled()
    expect(context.memoryDeliberation?.shouldRecall).toBe(false)
    expect(context.memoryDeliberation?.surfacePolicy).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionNarratives).toEqual([])
  })

  it('lets relationship doctrine suppress closeness-heavy recall and foreground repair-first eras', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: 'Repair before closeness turns into pressure.',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-repair',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-repair',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'That relationship period kept teaching more room before closeness.',
          lesson: 'Repair should land before leaning closer.',
          cues: ['lighter touch', 'repair'],
          confidence: 0.76,
          dominantProvenance: 'remembered',
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
        {
          id: 'consolidation-close',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-close',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That relationship period let warmer closeness land directly.',
          lesson: 'Warmer directness can land when the opening is clearly there.',
          cues: ['warmth', 'closer'],
          confidence: 0.82,
          dominantProvenance: 'remembered',
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['relationship tone'],
        rationale: 'The host is asking about remembered relationship tone.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: input.consolidatedMemories[0]?.lesson ? [input.consolidatedMemories[0].lesson] : [],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.78,
        whyNow: 'The relationship era should shape the answer first.',
        inwardLine: 'What comes back first is the dominant relationship period.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你为什么这次会这样回应我',
      recallGovernor: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['relationship tone'],
          rationale: 'The doctrine should shape which relationship era comes forward first.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(context.consolidatedMemories?.[0]?.id).toBe('consolidation-repair')
  })

  it('keeps benchmark tuning numeric while ambiguous recollection speech stays recall-authored', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-ambiguous',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-ambiguous',
        sessionId: 'session-ambiguous',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        whereSummary: 'runtime seam',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'Two nearby runtime lines kept competing for recall.',
        felt: 'uncertain',
        emotionTags: ['uncertain'],
        whatChanged: 'Only the stable core felt safe enough to carry.',
        relationshipMeaning: 'Keep the line bounded.',
        lesson: 'Do not let the wrong thread outrun the payoff.',
        sourceKind: 'execution-result',
        sourceSummary: 'ambiguous runtime seam',
        provenance: 'reconstructed',
        confidence: 0.66,
        salience: 0.82,
        sceneAttachment: 0.42,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam'],
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 10, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      } as any],
      buildHostPersonModel: async () => null,
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 3, 30, 3, 0, 0),
        sourceReportAt: Date.UTC(2026, 3, 30, 3, 0, 0),
        focusDimensions: ['wrongThreadSuppression', 'surfaceRestraint'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.08,
          temporalWindowBias: 0.1,
          wrongThreadPenalty: 0.18,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.2,
          delayUntilAfterPayoffBias: 0.16,
          provenanceLabelBias: 0.12,
          specificityClampBias: 0.12,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0,
        },
        notes: ['Surface restraint failed, so ambiguous recollection should stay inward more aggressively.'],
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept returning to the runtime seam until it stabilized.',
        lesson: 'Return to the seam before opening a new branch.',
        cues: ['runtime seam'],
        confidence: 0.78,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-ambiguous'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam'],
        rationale: 'The host is asking for a remembered runtime way of handling this.',
        confidence: 0.82,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'answer-anchoring' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        rationale: 'The host is explicitly asking for remembered handling.',
        confidence: 0.86,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-runtime'],
        selectedConsolidationIds: ['consolidation-runtime'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-ambiguous'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the line bounded.'],
        ambiguityPosture: 'ambiguous' as const,
        selectedEras: [{
          id: 'consolidation-runtime',
          facet: 'task-era' as const,
          summary: 'That period kept returning to the runtime seam until it stabilized.',
        }],
        selectedPeriods: [{
          id: 'consolidation-runtime',
          kind: 'consolidation' as const,
          summary: 'That period kept returning to the runtime seam until it stabilized.',
        }],
        selectedEpisodes: [{
          id: 'episode-ambiguous',
          summary: 'Two nearby runtime lines kept competing for recall.',
          provenance: 'reconstructed' as const,
        }],
        conflictSeverity: 'high' as const,
        conflictVariants: [{
          id: 'cluster:runtime-nearby',
          summary: 'A nearby runtime line still competes for recall.',
          provenance: 'reconstructed' as const,
          reason: 'Need to suppress the wrong thread lure.',
        }],
        stableCore: ['Return to the seam before opening a new branch.'],
        unsafeDetails: ['Do not state the competing runtime line as settled fact.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.72,
        whyNow: 'The stable core still helps, but the remembered detail is conflict-prone.',
        inwardLine: 'Keep only the stable seam inward until the payoff lands.',
        visibleLine: 'This feels like the same seam, but I should not over-claim it.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样处理 runtime seam',
      recallGovernor: {
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'The host is asking for a remembered runtime way of handling this.',
          confidence: 0.82,
        },
      } as any,
    })

    expect(context.memoryTuningAdvice?.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0.16)
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(true)
    expect(context.recollectionSpeechPlan?.placement).toBe('before-payoff')
    expect(context.recollectionSpeechPlan?.certainty).toBe('firm')
  })

  it('lets familiar scene cues trigger recollection even without explicit retrospective wording', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-familiar-runtime',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-familiar-runtime',
        sessionId: 'session-familiar-runtime',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        sourceKind: 'execution-result',
        provenance: 'remembered',
        whereSummary: 'runtime continuity window',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'We kept returning to the same runtime seam until the flow stabilized.',
        felt: 'familiar',
        emotionTags: ['focused'],
        whatChanged: 'the seam became easy to recognize by feel.',
        relationshipMeaning: 'Stay on the same seam before branching.',
        lesson: 'Return to the same seam before branching.',
        sourceSummary: 'familiar runtime seam',
        confidence: 0.82,
        salience: 0.8,
        sceneAttachment: 0.78,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'familiar'],
        createdAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        lastRecalledAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        recallCount: 3,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept bending toward the same runtime seam until it held together.',
        lesson: 'Return to the same seam before branching.',
        cues: ['runtime seam', 'familiar'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-familiar-runtime'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planMemoryRecollection: vi.fn(async (input: any) => ({
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is the familiar runtime seam.',
        certainty: 'approximate' as const,
        rationale: 'The current scene naturally tugs on the old runtime handling pattern.',
        confidence: 0.72,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: false,
        surfaceMode: 'internal-only' as const,
        placement: 'internal-only' as const,
        certainty: 'approximate' as const,
        rationale: 'The memory should surface as afterglow, not as a forced recollection dump.',
        confidence: 0.7,
      })),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Stay on the same seam before branching.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.72,
        whyNow: 'The scene feels familiar enough that the old seam rises on its own.',
        inwardLine: 'What comes back first is the familiar runtime seam.',
        visibleLine: null,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这个 runtime seam 怎么又有那种感觉',
      recallGovernor: {
        recollectionIntent: null,
      } as any,
    })

    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'experience-pattern',
      temporalFocus: 'experience-matched',
    }))
    expect(context.memoryDeliberation?.selectedEras[0]?.id).toBe('consolidation-runtime')
    expect(context.memoryDeliberation?.shouldRecall).toBe(true)
  })

  it('uses scene familiarity, mood carry, and embodied cadence to bias which remembered seam comes foreground', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [
        {
          id: 'episode-late-night',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-late-night',
          sessionId: 'session-late-night',
          occurredAt: Date.UTC(2026, 3, 18, 1, 0, 0),
          sourceKind: 'execution-result',
          provenance: 'remembered',
          whereSummary: 'Cursor late-night diff lane',
          withWhom: ['host'],
          threadAnchor: 'late-night runtime seam',
          whatHappened: 'We kept the late-night runtime seam alive in the Cursor diff lane until the patch finally held.',
          felt: 'drained but quietly steady',
          emotionTags: ['late-night-drain', 'afterglow'],
          whatChanged: 'The line stayed warm enough to come back later.',
          relationshipMeaning: 'Stay near the seam without forcing it open.',
          lesson: 'Late-night seams want softer carry before direct push.',
          sourceSummary: 'late-night coding seam',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.86,
          consolidationPriority: 0.8,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['coding', 'runtime seam', 'afterglow'],
          createdAt: Date.UTC(2026, 3, 18, 1, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 1, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-daytime',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-daytime',
          sessionId: 'session-daytime',
          occurredAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          sourceKind: 'execution-result',
          provenance: 'remembered',
          whereSummary: 'general runtime lane',
          withWhom: ['host'],
          threadAnchor: 'daytime runtime seam',
          whatHappened: 'We handled a daytime runtime seam in a more direct, ordinary flow.',
          felt: 'steady',
          emotionTags: ['focused'],
          whatChanged: 'The ordinary line landed cleanly.',
          relationshipMeaning: 'Directness was fine in that opening.',
          lesson: 'Patch directly when the opening is ordinary and not emotionally warm.',
          sourceSummary: 'daytime coding seam',
          confidence: 0.82,
          salience: 0.8,
          sceneAttachment: 0.22,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['coding', 'runtime seam'],
          createdAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ] as any,
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-late-night',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'late-night runtime seam',
          periodStartedAt: Date.UTC(2026, 3, 18, 1, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 2, 0, 0),
          summary: 'That late-night runtime seam stayed warm in the Cursor diff lane.',
          lesson: 'Late-night seams want softer carry before direct push.',
          cues: ['late-night', 'afterglow', 'Cursor late-night diff lane'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-late-night'],
          updatedAt: Date.UTC(2026, 3, 18, 2, 0, 0),
        },
        {
          id: 'consolidation-daytime',
          kind: 'autobiographical',
          facet: 'task-era',
          periodKey: 'daytime runtime seam',
          periodStartedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 11, 0, 0),
          summary: 'That daytime runtime seam was more direct and ordinary.',
          lesson: 'Patch directly when the opening is ordinary.',
          cues: ['daytime', 'direct'],
          confidence: 0.8,
          dominantProvenance: 'remembered',
          derivedEventIds: ['episode-daytime'],
          updatedAt: Date.UTC(2026, 3, 18, 11, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'experience-pattern' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam'],
        rationale: 'The seam is reactivating through familiar scene and mood carry.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async (input: any) => ({
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is the late-night seam.',
        certainty: 'approximate' as const,
        rationale: 'Scene familiarity and mood carry are pulling the late-night seam forward first.',
        confidence: 0.76,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这个 runtime seam 又有那种感觉',
      recallGovernor: {
        sceneFamiliarityHint: 0.92,
        affectiveCarry: {
          moodLabel: 'afterglow',
          emotionalTension: 'late-night-drain',
          socialNeed: 0.62,
          reflectivePull: 0.74,
          summary: 'mood:afterglow | tension:late-night-drain | reflective-pull:0.74',
        },
        embodiedCarry: {
          presence: 'glance',
          suggestedStyle: 'gentle-care',
          afterglowFromScenario: 'coding',
          shouldSpeak: true,
          summary: 'presence:glance | style:gentle-care | afterglow:coding',
        },
      } as any,
    })

    expect((context.consolidatedMemories ?? [])[0]?.id).toBe('consolidation-late-night')
    expect((context.recalledEpisodes ?? [])[0]?.id).toBe('episode-late-night')
  })

  it('synthesizes conflict severity, stable core, and unsafe details from reconstructed remembered episodes', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-conflicted',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-conflicted',
        sessionId: 'session-conflicted',
        occurredAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        whereSummary: 'runtime seam',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'I may have mixed two runtime seam conversations together.',
        felt: 'uneasy',
        emotionTags: ['repair'],
        whatChanged: 'The memory no longer feels safe in exact detail.',
        relationshipMeaning: 'Stay on the same seam, but do not over-claim the old wording.',
        lesson: 'Keep the stable core and drop the unsafe detail.',
        sourceSummary: 'reconstructed memory',
        confidence: 0.58,
        salience: 0.74,
        sceneAttachment: 0.2,
        consolidationPriority: 0.68,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['runtime seam', 'conflict'],
        createdAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 1,
        latestReconsolidation: {
          at: Date.UTC(2026, 3, 19, 8, 0, 0),
          decisionTraceId: 'mind:l9f3lq:conflicttrace',
          provenance: 'reconstructed',
          confidence: 0.46,
          reason: 'Conflicting remembered variants remain unresolved.',
          emotionTags: ['contradiction-pressure'],
          relationshipMeaning: 'Stay on the same seam, but do not over-claim the old wording.',
          lesson: 'Answer this memory with uncertainty rather than exactness.',
        },
      }],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-runtime',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-04-runtime',
        periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
        summary: 'That period kept bending toward the runtime seam until it held together.',
        lesson: 'Return to the same seam before branching.',
        cues: ['runtime seam', 'repair rhythm'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-conflicted'],
        updatedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'experience-pattern' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['runtime seam'],
        rationale: 'The host is asking how this used to be handled.',
        confidence: 0.78,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedEraIds: ['consolidation-runtime'],
        selectedConsolidationIds: ['consolidation-runtime'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-conflicted'],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is the old runtime seam.',
        certainty: 'approximate' as const,
        rationale: 'The memory is useful, but not exact in detail.',
        confidence: 0.74,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'answer-anchoring' as const,
        placement: 'inside-payoff' as const,
        certainty: 'approximate' as const,
        rationale: 'The reply should keep the stable core and drop unsafe detail.',
        confidence: 0.72,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-runtime'],
        selectedConsolidationIds: ['consolidation-runtime'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-conflicted'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Stay on the same seam, but do not over-claim the old wording.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.72,
        whyNow: 'The stable core still helps, but the recalled detail is conflict-prone.',
        inwardLine: 'What comes back first is the stable runtime seam, not the exact old wording.',
        visibleLine: 'It feels like the same seam, but I should not say the exact old wording.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你以前是怎么帮我做这个的',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam'],
          rationale: 'The answer should keep the stable core and drop unsafe detail.',
          confidence: 0.74,
        },
      } as any,
    })

    expect(context.memoryDeliberation).toEqual(expect.objectContaining({
      conflictVariants: expect.arrayContaining([
        expect.objectContaining({
          id: 'episode-conflicted',
          provenance: 'reconstructed',
        }),
      ]),
      stableCore: expect.arrayContaining([
        'That period kept bending toward the runtime seam until it held together.',
      ]),
      unsafeDetails: expect.arrayContaining([
        'Conflicting remembered variants remain unresolved.',
      ]),
    }))
    expect(['medium', 'high']).toContain(context.memoryDeliberation?.conflictSeverity)
  })

  it('tightens recollection surface when contradiction-heavy fact evidence is active', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [{
        id: 'fact-contradicted',
        subject: 'assistant',
        predicate: 'procedure',
        object: 'report immediately',
        confidence: 0.8,
        source: 'async-llm',
        dedupeKey: 'assistant|procedure|report immediately',
        createdAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
        lastAccessAt: null,
        accessCount: 3,
        validationCount: 1,
        contradictionCount: 4,
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
        sourceLabel: 'async-memory-correction',
        conflictsWith: ['old-style'],
        supersedes: [],
      } as any],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['report immediately'],
        rationale: 'A remembered procedure is present.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'A remembered procedure is present.',
        certainty: 'approximate' as const,
        rationale: 'A remembered procedure is present.',
        confidence: 0.8,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'answer-anchoring' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        rationale: 'A remembered procedure is present.',
        confidence: 0.84,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-memory-workbench-review'],
        selectedConsolidationIds: ['consolidation-memory-workbench-review'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.82,
        whyNow: 'A remembered procedure is present.',
        inwardLine: 'A remembered procedure is present.',
        visibleLine: 'I remember how this used to go.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '按以前那样做',
      recallGovernor: {
      } as any,
    })

    expect(context.retrievedFacts[0]).toEqual(expect.objectContaining({
      contradictionCount: 4,
      validationCount: 1,
    }))
  })

  it('records decomposed organic memory stage telemetry and budgets', async () => {
    const stageLatencies: Array<{ stage: string, latencyMs: number }> = []
    const stageBudgets: Array<{ stage: string, budgetClass: string }> = []
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: 'stay grounded',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      getMemoryStats: async () => null,
      getMemoryTuningAdvice: async () => null,
      getPersonStateEvolutionSummary: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: async () => null,
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
      recordOrganicMemoryStageLatency: async (input: Parameters<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['recordOrganicMemoryStageLatency']>>[0]) => {
        stageLatencies.push(input)
      },
      recordOrganicMemoryStageBudget: async (input: Parameters<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['recordOrganicMemoryStageBudget']>>[0]) => {
        stageBudgets.push(input)
      },
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue runtime seam',
      budgetClass: 'deep-recall-reply',
    })
    const providerFactBlocks = runtime.buildOrganicMemoryProviderFactBlocks(context)

    expect(stageBudgets).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: 'search-prelude', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'candidate-generation', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'candidate-ranking', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'recollection-planning', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'surface-planning', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'self-evolution-integration', budgetClass: 'deep-recall-reply' }),
      expect.objectContaining({ stage: 'prompt-blocks', budgetClass: 'realtime-reply' }),
    ]))
    expect(stageLatencies.map(item => item.stage)).toEqual(expect.arrayContaining([
      'search-prelude',
      'candidate-generation',
      'candidate-ranking',
      'recollection-planning',
      'surface-planning',
      'self-evolution-integration',
      'prompt-blocks',
    ]))
    expect(stageLatencies.every(item => item.latencyMs >= 0)).toBe(true)
    expect(context.memoryStageReplay?.stages.map(stage => stage.summary)).toEqual([
      'memory-stage:search-prelude',
      'memory-stage:candidate-generation',
      'memory-stage:candidate-ranking',
      'memory-stage:recollection-planning',
      'memory-stage:surface-planning',
      'memory-stage:self-evolution-integration',
    ])
    expect(context.memoryResolutionLedger).toEqual(expect.objectContaining({
      version: 'memory-resolution-ledger-v1',
      finalSurfacePolicy: null,
      selectedCandidates: expect.any(Array),
      rejectedCandidates: expect.any(Array),
      closureState: expect.any(String),
      visibleCarryMode: expect.any(String),
      retrievalQuality: expect.any(String),
    }))
    const recallFact = readOrganicMemoryProviderFact(
      providerFactBlocks,
      'alicization-long-term-memory-recall',
    )
    expect(recallFact).toEqual(expect.objectContaining({
      owner: 'LongTermMemoryRecall',
      surface: expect.objectContaining({
        retrievalQuality: context.memoryResolutionLedger?.retrievalQuality,
        visibleCarryMode: context.memoryResolutionLedger?.visibleCarryMode,
        shouldStayInward: context.memoryResolutionLedger?.shouldStayInward,
      }),
    }))
  })

  it('keeps host room-first repair memory available without overriding provider-authored surface policy', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-room-repair',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-room-repair',
        sessionId: 'session-room-repair',
        occurredAt: Date.UTC(2026, 3, 24, 8, 0, 0),
        whereSummary: 'work thread',
        withWhom: ['host'],
        threadAnchor: 'grounded repair',
        whatHappened: 'We kept the repair concrete and left room before widening the bond line.',
        felt: 'careful',
        emotionTags: ['careful'],
        whatChanged: 'The bond line stayed steadier when repair landed before warmth.',
        sourceKind: 'conversation',
        sourceSummary: 'room-first repair rhythm',
        provenance: 'remembered',
        confidence: 0.81,
        salience: 0.78,
        sceneAttachment: 0.42,
        consolidationPriority: 0.74,
        relationshipShift: 'The host relaxed when space was respected first.',
        derivedFrom: [],
        tags: ['room first', 'repair first', 'relationship boundary'],
        relationshipMeaning: 'Leave room first and keep repair concrete.',
        lesson: 'Let repair land before widening the bond line.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 24, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 24, 8, 20, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => ({
        summary: 'The host tends to need room-first repair-sensitive continuity.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        recurrentBurdens: [],
        preferredClosenessByContext: [
          { context: 'work', preference: 'room-first and work-focus before warmth' },
        ],
        trustLadder: {
          stage: 'warming',
          rationale: 'Respect boundaries, leave room, and land specific grounded repair before widening the bond line.',
        },
      } as any),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'relationship-room-repair',
        kind: 'autobiographical' as const,
        facet: 'relationship-era' as const,
        periodKey: '2026-04-room-repair',
        periodStartedAt: Date.UTC(2026, 3, 24, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 24, 9, 0, 0),
        summary: 'That period worked better when repair landed before the bond line widened.',
        lesson: 'Leave room first and keep repair specific.',
        cues: ['room first', 'repair first', 'boundary'],
        confidence: 0.86,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: ['episode-room-repair'],
        updatedAt: Date.UTC(2026, 3, 24, 9, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['room first', 'repair first', 'boundary'],
        rationale: 'The current wording resembles a familiar relationship repair posture.',
        confidence: 0.87,
        recollectionAgenda: {
          whyRecallNow: 'The host is brushing against a familiar repair-sensitive relationship line.',
          goalSimilarity: 0.48,
          relationshipNeed: 0.84,
          affectivePull: 0.42,
          sceneFamiliarity: 0.58,
          candidateTimeScopes: [
            { scope: 'experience-matched' as const, weight: 0.88, rationale: 'A similar repair-sensitive relationship line matters most.' },
          ],
          candidateEraFacets: [
            { facet: 'relationship-era' as const, weight: 0.91, rationale: 'A relationship era best organizes this recall.' },
          ],
          candidateProcedureLines: ['room first', 'repair first'],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['relationship-room-repair'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-room-repair'],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the room-first repair rhythm.',
        certainty: 'approximate' as const,
        rationale: 'The remembered bond line says to leave room before widening.',
        confidence: 0.83,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'inside-payoff' as const,
        opening: 'This still feels like the same bond line.',
        confidence: 0.82,
        certainty: 'approximate' as const,
        rationale: 'The relationship line seems relevant enough to carry visibly.',
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-room-repair',
          facet: 'relationship-era',
          summary: 'That relationship phase stayed steadier when room came before warmth.',
        }],
        selectedEpisodes: [{
          id: 'episode-room-repair',
          summary: 'We kept the repair concrete and left room before widening the bond line.',
          provenance: 'remembered',
        }],
        conflictSeverity: 'none' as const,
        conflictVariants: [],
        stableCore: ['Leave room first and let repair land before widening the bond line.'],
        unsafeDetails: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-room-repair',
          summary: 'The bond line stays steadier when repair lands before warmth.',
          confidence: 0.84,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'This relationship line should stay room-first while work is still live.',
          currentStance: 'Leave room first.',
          answerPosture: 'Let repair land before widening.',
          confidence: 0.83,
        }],
        selectedRelationshipLines: ['Leave room first and keep repair concrete.'],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.84,
        whyNow: 'The present turn resembles a familiar boundary-sensitive repair line.',
        inwardLine: 'Let the bond line contour the answer without surfacing yet.',
        visibleLine: 'This still feels like the same bond line.',
        ambiguityPosture: 'settled' as const,
        followUpAffordance: {
          summary: 'Let the bond line stay quiet until the host has more room.',
          whyNow: 'The present payoff still needs to land before the relationship line widens.',
          intrusionRisk: 'low' as const,
          payoffDependency: 'can-surface-softly' as const,
          preferredTiming: 'same-turn-if-invited' as const,
        },
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '先把这个修好，我们关系上的话题等会再说',
      recallGovernor: {
      } as any,
    })

    expect(context.hostPersonModel?.trustLadder.rationale).toContain('leave room')
    expect(context.recollectionPlan?.selectedConsolidationIds).toContain('relationship-room-repair')
    expect(context.recollectionPlan?.selectedEpisodeIds).toContain('episode-room-repair')
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      placement: 'inside-payoff',
    }))
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/repair|payoff/i)
  })

  it('keeps embodiment and uncertainty memory evidence without forcing a fixed surface policy', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'approximate' as const,
      confidence: 0.78,
      rationale: 'The remembered correction can support the answer without overstating certainty.',
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: ['episode-embodiment-correction'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: [],
      ambiguityPosture: 'approximate' as const,
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [{
        id: 'episode-embodiment-correction',
        summary: 'The host preferred a steadier gaze and slower voice after a correction.',
        provenance: 'remembered' as const,
      }],
      conflictSeverity: 'medium' as const,
      conflictVariants: [],
      stableCore: ['The correction is remembered, but its exact wording remains approximate.'],
      unsafeDetails: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.76,
      whyNow: 'The present turn resembles the remembered correction.',
      inwardLine: 'Keep the uncertainty attached to the memory.',
      visibleLine: 'I remember the correction approximately.',
      followUpAffordance: {
        summary: 'Use the steadier remembered delivery without claiming exact recall.',
        whyNow: 'The evidence is remembered but approximate.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'can-surface-softly' as const,
        preferredTiming: 'same-turn-if-invited' as const,
      },
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'focused',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-embodiment-correction',
        cardId: 'card-embodiment-correction',
        decisionTraceId: null,
        turnId: 'turn-embodiment-correction',
        sessionId: 'session-embodiment-correction',
        occurredAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        whereSummary: 'dialogue correction',
        withWhom: ['host'],
        threadAnchor: 'delivery correction',
        whatHappened: 'The host asked for a steadier gaze and slower voice after a correction.',
        felt: 'careful',
        emotionTags: ['careful'],
        whatChanged: 'The delivery became steadier and less rushed.',
        sourceKind: 'conversation',
        sourceSummary: 'remembered delivery correction',
        provenance: 'remembered',
        confidence: 0.8,
        salience: 0.78,
        sceneAttachment: 0.72,
        consolidationPriority: 0.7,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['embodiment_gaze=stable', 'embodiment_voice=slower'],
        relationshipMeaning: 'Respect the remembered delivery correction.',
        lesson: 'Use a steadier gaze and slower voice when the same need returns.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['delivery correction', 'steady gaze', 'slower voice'],
        rationale: 'The host is referring to a remembered delivery correction.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-embodiment-correction'],
        selectedConversationTurnIds: [],
        opening: 'The remembered delivery correction returns approximately.',
        certainty: 'approximate' as const,
        rationale: 'The episode is relevant but should not be quoted as exact.',
        confidence: 0.78,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按我之前说的稳定视线、放慢声音来回应，但不要装作逐字记得。',
      recallGovernor: {
      } as any,
    })
    const recallFact = readOrganicMemoryProviderFact(
      runtime.buildOrganicMemoryProviderFactBlocks(context),
      'alicization-long-term-memory-recall',
    )

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: true,
      placement: 'inside-payoff',
      certainty: 'approximate',
    }))
    expect(context.memoryDeliberation?.selectedEpisodeIds).toContain('episode-embodiment-correction')
    expect(context.memoryDeliberation?.ambiguityPosture).toBe('approximate')
    expect(recallFact?.selection?.deliberation).toEqual(expect.objectContaining({
      selectedEpisodeIds: ['episode-embodiment-correction'],
      ambiguityPosture: 'approximate',
      conflictSeverity: 'medium',
    }))
  })

  it('lets stale self-model suppression pressure demote older self-era clusters before newer self continuity', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        sourceReportAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        focusDimensions: ['wrongThreadSuppression'],
        staleSelfModelVetoRate: 0.72,
        relationshipEraConfusionRate: 0,
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.12,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.16,
          delayUntilAfterPayoffBias: 0.08,
          provenanceLabelBias: 0.14,
          specificityClampBias: 0.08,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.12,
        },
        notes: ['Stale self-model clusters should demote earlier.'],
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-self-old',
          kind: 'autobiographical' as const,
          facet: 'self-era' as const,
          periodKey: 'self-old',
          periodStartedAt: Date.UTC(2026, 2, 1, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 2, 1, 9, 0, 0),
          summary: 'The older self-story kept insisting on the previous identity line.',
          lesson: 'Do not let the old self-story overtake the newer line.',
          cues: ['older self-story', 'identity revision', 'previous self'],
          confidence: 0.92,
          dominantProvenance: 'reconstructed' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 2, 1, 9, 0, 0),
        },
        {
          id: 'consolidation-self-new',
          kind: 'autobiographical' as const,
          facet: 'self-era' as const,
          periodKey: 'self-new',
          periodStartedAt: Date.UTC(2026, 3, 28, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 28, 9, 0, 0),
          summary: 'The newer self line is settling into a steadier continuity.',
          lesson: 'Let the newer self line stabilize before reopening old identity explanations.',
          cues: ['newer self line', 'steady continuity'],
          confidence: 0.74,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 28, 9, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'autobiographical-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['older self-story', 'identity revision'],
        rationale: 'The host is asking about self revision continuity.',
        confidence: 0.82,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        ambiguityPosture: 'approximate' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['Let the newer self line stabilize first.'],
        unsafeDetails: ['Do not surface stale identity as settled continuity.'],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.7,
        whyNow: 'Self revision continuity is still under pressure.',
        inwardLine: 'Keep the older self-story inward.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你是不是还在修正之前那个自我说法',
      recallGovernor: {
      } as any,
    })

    expect(context.consolidatedMemories?.[0]?.id).toBe('consolidation-self-new')
    expect(context.memoryResolutionLedger?.rejectedCandidates).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:self-model-stale',
      }),
    ]))
    expect(context.memoryResolutionLedger?.suppressionTags).toEqual([])
  })

  it('lets relationship-era confusion pressure demote older warmth-first relationship clusters before repair-space continuity', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        sourceReportAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        focusDimensions: ['wrongThreadSuppression'],
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0.76,
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.1,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.18,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.14,
          specificityClampBias: 0.12,
        },
        personStateAdjustments: {
          repairWindowBias: 0.12,
          closenessCapBias: 0.16,
        },
        notes: ['Competing relationship repair phases should separate earlier.'],
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-relationship-old',
          kind: 'autobiographical' as const,
          facet: 'relationship-era' as const,
          periodKey: 'relationship-old',
          periodStartedAt: Date.UTC(2026, 2, 20, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 2, 20, 9, 0, 0),
          summary: 'An older relationship phase reopened warmth before there was room.',
          lesson: 'That old phase pushed closeness too early.',
          cues: ['old relationship era', 'warmth before room', 'another repair'],
          confidence: 0.9,
          dominantProvenance: 'reconstructed' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 2, 20, 9, 0, 0),
        },
        {
          id: 'consolidation-relationship-repair',
          kind: 'autobiographical' as const,
          facet: 'relationship-era' as const,
          periodKey: 'relationship-repair',
          periodStartedAt: Date.UTC(2026, 3, 22, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 22, 9, 0, 0),
          summary: 'The repair window kept teaching more room before warmth returned.',
          lesson: 'Leave room before closeness comes back.',
          cues: ['repair window', 'leave room', 'distance first'],
          confidence: 0.76,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 22, 9, 0, 0),
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['repair window', 'relationship phase'],
        rationale: 'The host is asking about relationship timing continuity.',
        confidence: 0.82,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: input.consolidatedMemories[0]?.lesson ? [input.consolidatedMemories[0].lesson] : [],
        ambiguityPosture: 'approximate' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['Leave room before closeness comes back.'],
        unsafeDetails: ['Do not let the older relationship phase sound like the current one.'],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.72,
        whyNow: 'The current relationship line still depends on room before warmth.',
        inwardLine: 'Keep the wrong relationship phase from taking over.',
        visibleLine: 'This still needs room before warmth.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '我们是不是还在那个修复期里调整距离',
      recallGovernor: {
      } as any,
    })

    expect(context.consolidatedMemories?.[0]?.id).toBe('consolidation-relationship-repair')
    expect(context.memoryResolutionLedger?.rejectedCandidates).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:relationship-era-confusion',
      }),
    ]))
    expect(context.memoryResolutionLedger?.suppressionTags).toEqual([])
  })
})

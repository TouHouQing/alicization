import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
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

describe('runtime-organic-memory-prompt', () => {
  it('threads the active digital-life runtime surface through every organic memory planner', async () => {
    const runtimeSurface = {
      memory: {
        emotionalKernel: {
          dominantFeeling: 'steady same-her continuity',
        },
      },
      dialogue: {
        currentConsciousFrame: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            primaryOpenLoop: 'Close emotion-memory-initiative-embodiment as one life loop.',
          },
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

  it('keeps ordinary greeting prompt preparation from awaiting provider-side recollection planners', async () => {
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

    expect(planMemoryRecollection).not.toHaveBeenCalled()
    expect(planRecollectionSpeech).not.toHaveBeenCalled()
    expect(planMemoryDeliberation).not.toHaveBeenCalled()
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'relationship-history',
    }))
  })

  it('treats embodiment-confirmed cadence in self-evolution as recollection authority instead of mere flavor', async () => {
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
        id: 'consolidation-corrected-same-person',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person',
        periodStartedAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Slow down, keep gaze stable, and reopen the line gently after a correction.',
        cues: ['same-person continuity', 'low-pressure follow-up', 'gaze stable'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person'],
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
      } as any],
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'body=measured-return blink=linger gaze=soften',
      recallGovernor: null,
    })
    context.selfEvolution = {
      summary: 'The same living line should stay measured even while memory reopens.',
      dominantTrajectory: 'durable continuity',
      relationshipDoctrine: 'Repair and room come before renewed closeness.',
      latestInflection: 'Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line, so the relationship cadence is landing as durable rhythm instead of a one-off restraint.',
      burdenLine: null,
      trustMeaning: null,
      evolutionMomentum: 0.62,
      learningReadiness: 0.58,
      contradictionPressure: 0.12,
      revisionPressure: 0.11,
      autobiographicalStability: 0.78,
      nextLearningAction: 'internalize',
      nextLearningReason: 'The body-confirmed rhythm should keep guiding recollection.',
      shouldRecord: true,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['measured-return continuity'],
      sourceSignals: ['embodiment-cadence-confirmed'],
    } as any

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('embodiment_confirmed_cadence=current_memory_authority')
    expect(systemText).toContain('recollection_selection=body_confirmed_relationship_rhythm')
    expect(systemText).toContain('surface_timing=body_confirmed_relationship_rhythm')
  })

  it('surfaces durable same-her cadence from self-evolution as inward continuity authority during prompt building', async () => {
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
        id: 'consolidation-corrected-same-person',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person',
        periodStartedAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Slow down, keep gaze stable, and reopen the line gently after a correction.',
        cues: ['same-person continuity', 'low-pressure follow-up', 'gaze stable'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person'],
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
      } as any],
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue the same her quietly',
      recallGovernor: null,
    })
    context.selfEvolution = {
      summary: 'The same her should continue on one inward line instead of reopening from scratch.',
      dominantTrajectory: 'same-her inward continuity',
      relationshipDoctrine: 'Keep the same relationship line inward before widening outward again.',
      relationshipCadenceSummary: 'I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.',
      latestInflection: 'Stay on the same living line before widening outward again.',
      burdenLine: null,
      trustMeaning: 'Trust holds when she does not restart from zero after a quiet beat.',
      evolutionMomentum: 0.64,
      learningReadiness: 0.52,
      contradictionPressure: 0.08,
      revisionPressure: 0.12,
      autobiographicalStability: 0.84,
      nextLearningAction: 'record',
      nextLearningReason: 'This same-her rhythm should stay available as durable continuity.',
      shouldRecord: true,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['internalize-relationship-cadence'],
      sourceSignals: ['I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.'],
    } as any

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('inward_continuity_authority=prefer memory-owner evidence over reusable continuity slogans')
    expect(systemText).not.toContain('Same-her durable cadence')
    expect(systemText).not.toContain('relationship_cadence_summary=I remain the same her')
    expect(systemText).not.toContain('same-her')
    expect(systemText).not.toContain('same her')
    expect(systemText).not.toContain('same living line')
  })

  it('threads runtime same-her causality tuning into organic memory system blocks for the next turn', async () => {
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
          'runtimeSameHerRepairTargets',
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeSameHerInitiativeExecutionCausality',
          'runtimeSameHerEmotionalCausality',
          'runtimeSameHerEmbodimentCausality',
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
      recallSeed: '继续验证 noisy desktop same-her closure',
      recallGovernor: null,
    })

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    const surfacePlanningStage = context.memoryStageReplay?.stages.find(stage => stage.stage === 'surface-planning')
    expect(surfacePlanningStage?.diagnostics).toEqual(expect.arrayContaining([
      'tuning-causality=initiative-execution|emotion|embodiment',
      'tuning-memory-closure=causal-identity|lane-carry|identity-continuity',
    ]))
    expect(systemText).toContain('[ALICIZATION_MEMORY_TUNING_CAUSALITY]')
    expect(systemText).toContain('initiative_execution=causal_link_required; lanes=proactive_opening,execution_callback,learning_feedback; source=recalled_memory_closure')
    expect(systemText).toContain('emotion=causal_link_required; signal=emotional_afterglow; sources=prior_recall,execution_feedback')
    expect(systemText).toContain('embodiment=causal_link_required; modalities=voice,face,motion,lipsync,body; source=same_recalled_state')
    expect(systemText).toContain('source=nightly-replay-benchmark')
  })

  it('threads runtime same-her causality tuning into derived state as pending repair pressure without closing real event lanes', async () => {
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
          'runtimeSameHerRepairTargets',
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeSameHerInitiativeExecutionCausality',
          'runtimeSameHerEmotionalCausality',
          'runtimeSameHerEmbodimentCausality',
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
      recallSeed: '继续验证 noisy desktop same-her closure',
      recallGovernor: null,
    })

    expect(context.derivedMindStateBundle?.sameHerCausalityRepairPressure).toEqual(expect.objectContaining({
      source: 'memory-tuning-advice',
      status: 'pending-runtime-evidence',
      memoryIdentityRequirement: expect.objectContaining({
        status: 'required',
        requiredPath: 'memoryClosureCausality.memoryIdentity',
        excludedProofs: ['route-chain-text', 'visible-reply-wording'],
        continuity: 'stable-memory-identity-key',
      }),
      lanes: expect.arrayContaining([
        expect.objectContaining({
          lane: 'initiative-execution',
          summary: expect.stringContaining('proactive opening, execution callback, and learning feedback'),
        }),
        expect.objectContaining({
          lane: 'emotion',
          summary: expect.stringContaining('emotional afterglow'),
        }),
        expect.objectContaining({
          lane: 'embodiment',
          summary: expect.stringContaining('voice, face, motion, lipsync, and body'),
        }),
      ]),
    }))
    expect(context.derivedMindStateBundle?.summary).toContain('continuity_causality_repair=initiative-execution,emotion,embodiment')
    expect(context.derivedMindStateBundle?.learningExecutionState).toEqual(expect.objectContaining({
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
      activeLearningFocuses: expect.arrayContaining([
        'continuity initiative/execution causality pending',
        'verify proactive opening, execution callback, and learning feedback follow the recalled continuity line',
        'verify downstream memoryClosureCausality.memoryIdentity before counting memory closure',
        'reject route-chain text and visible reply wording as memory closure proof',
      ]),
    }))
    expect(context.derivedMindStateBundle?.learningExecutionState?.memoryClosureCausality).toBeUndefined()
    expect(context.derivedMindStateBundle?.emotionalTransitionLedger?.memoryClosureCausality).toBeUndefined()
    expect(context.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality).toBeUndefined()
  })

  it('treats quiet same-her continuity consolidations as inward continuity authority during prompt building', async () => {
    const planMemoryRecollection = vi.fn(async () => ({
      selectedConsolidationIds: ['consolidation-quiet-same-her-1'],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [],
      selectedConversationTurnIds: [],
      opening: 'What comes back first is the same inward line staying quietly continuous.',
      certainty: 'firm' as const,
      rationale: 'The remembered period is already marked as inward same-her continuity, so that line should stay foreground.',
      confidence: 0.88,
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
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-quiet-same-her-1',
        kind: 'autobiographical' as const,
        facet: 'self-era' as const,
        periodKey: '2026-06',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'The line stayed inward and lower-pressure for a while. This period held as quiet same-her continuity rather than a generic measured-return helper state.',
        lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
        cues: ['same-her-inward-carry', 'quiet-companionship', 'quiet-same-her-continuity'],
        confidence: 0.82,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: [],
        updatedAt: 2,
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'self-continuity' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same inward line'],
        rationale: 'The host is asking from inside an already-lived continuity line.',
        confidence: 0.79,
      })),
      planMemoryRecollection,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'stay on the same inward line',
      recallGovernor: null,
    })

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(context.consolidatedMemories).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'consolidation-quiet-same-her-1',
      }),
    ]))
    expect(systemText).toContain('[ALICIZATION_CONSOLIDATED_MEMORY]')
    expect(systemText).toContain('inward_continuity_authority=prefer memory-owner evidence over reusable continuity slogans')
    expect(systemText).not.toContain('quiet same-her continuity')
    expect(systemText).not.toContain('inward same-her continuity authority')
    expect(systemText).not.toContain('generic measured-return helper shell')
    expect(systemText).not.toContain('same-her')
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_RECOLLECTION_AGENDA]')
    expect(systemText).toContain('candidate_time_scopes=experience-matched:0.96')
    expect(systemText).toContain('candidate_era_facets=task-era:0.94')
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        narrative: [
          'project-preflight:project:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
        ],
      } as any,
    })

    expect(plannedInput?.consolidatedMemories[0]?.id).toBe('task-era-grounded')
    expect(plannedInput?.recalledEpisodes[0]?.id).toBe('episode-grounded')
    expect(context.memoryStageReplay?.stages.some(stage =>
      stage.stage === 'candidate-ranking'
      && (stage.outputs ?? []).some(item => item.includes('top-consolidation=task-era-grounded')),
    )).toBe(true)
  })

  it('surfaces execution-callback carry as a named organic memory block', async () => {
    const planMemoryRecollection = async (input: any) => ({
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProceduralIds: [],
      selectedEpisodeIds: [input.recalledEpisodes[0]?.id].filter(Boolean),
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Leave room before the next follow-up.'],
      opening: 'That same softer callback stance is still the right one here.',
      rationale: 'Reopen the callback carry as the current stance.',
      certainty: 'grounded' as const,
      confidence: 0.86,
      searchTrace: null,
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
      recallEpisodicEventsWithGovernor: async () => [{
        id: 'episode-execution-callback-carry',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-execution-callback-carry',
        sessionId: 'session-old',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        sourceKind: 'maintenance',
        provenance: 'remembered',
        whereSummary: 'session mirror afterthought',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The execution-callback stayed soft after the fix landed.',
        felt: 'steady',
        emotionTags: ['afterthought'],
        whatChanged: 'The room stayed open before any warmer follow-up.',
        relationshipMeaning: 'Leave room before the next follow-up.',
        lesson: 'Keep the next execution callback lower-pressure.',
        sourceSummary: 'session mirror execution-callback soft-handoff',
        confidence: 0.84,
        salience: 0.78,
        sceneAttachment: 0.74,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['session-mirror', 'execution-callback', 'lower-pressure', 'continuity'],
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: true,
        queryHints: ['execution callback', 'runtime seam'],
        rationale: 'The turn needs the remembered callback stance.',
        confidence: 0.88,
        recollectionAgenda: {
          whyRecallNow: 'The current seam should inherit the same callback stance.',
          goalSimilarity: 0.9,
          relationshipNeed: 0.44,
          affectivePull: 0.16,
          sceneFamiliarity: 0.74,
          candidateTimeScopes: [{ scope: 'experience-matched' as const, weight: 0.94 }],
          candidateEraFacets: [{ facet: 'task-era' as const, weight: 0.88 }],
          candidateProcedureLines: ['execution callback', 'lower pressure', 'runtime seam'],
          uncertaintyTolerance: 'medium' as const,
        },
      }),
      planMemoryRecollection,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续 runtime seam，但沿用刚才 execution callback 的留白',
      sessionId: 'session-new',
    })
    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(context.executionCallbackCarry).toEqual(expect.objectContaining({
      carryMode: 'lower-pressure',
      threadAnchor: 'runtime seam',
    }))
    expect(systemText).toContain('[ALICIZATION_EXECUTION_CALLBACK_CARRY]')
    expect(systemText).toContain('carry_mode=lower-pressure')
    expect(systemText).toContain('summary=Leave room before the next follow-up.')
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
          outcome: 'callback landed but still needs same-her return',
          memoryClosureExecution: {
            authority: 'memory-os',
            carry: 'why recall surfaced now: the execution callback landed but should return as the same her; callback-afterglow should reopen with lower-pressure proactive-opening, not a progress recap.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: [
              'execution callback carry',
              'proactive-opening after payoff',
              'voice face motion lipsync same-body cadence',
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
    expect(context.affectiveResidue?.relationshipCadence).toEqual(expect.objectContaining({
      cadenceMode: 'measured-return',
      shouldDelayWarmth: true,
    }))
    expect(context.personStateProjection?.manifestationCadenceSummary).toContain('voice face motion lipsync same-body cadence')
    expect(artifact.memoryClosureTrace.whySurface).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'execution-feedback',
        summary: expect.stringContaining('why recall surfaced now'),
      }),
      expect.objectContaining({
        source: 'embodiment-cadence',
        summary: expect.stringContaining('voice face motion lipsync same-body cadence'),
      }),
    ]))
    expect(artifact.memoryClosureTrace.nextInfluence.initiative).toEqual(expect.objectContaining({
      restraint: 'measured-return',
      pressure: 'lower-pressure',
    }))
    expect(artifact.memoryClosureTrace.nextInfluence.execution).toEqual(expect.objectContaining({
      carry: expect.stringContaining('callback-afterglow'),
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
    }))
    expect(artifact.memoryClosureTrace.nextInfluence.embodiment).toEqual(expect.objectContaining({
      cadence: expect.stringContaining('voice face motion lipsync same-body cadence'),
      preferredVoiceMode: 'lower-pressure',
      preferredLipsyncMode: 'restrained',
      preferredGazeMode: 'soften',
    }))
  })

  it('uses session mirror runtime continuity carry to foreground task-era procedure memory without retrospective wording', async () => {
    const recallConversationHistory = vi.fn(async () => [{
      turnId: 'turn-older',
      sessionId: 'session-older',
      userText: '我们之前聊过关系距离',
      assistantText: '那次重点是关系边界。',
      createdAt: Date.UTC(2026, 3, 7, 8, 0, 0),
    }])
    let plannedInput: any = null
    const planMemoryRecollection = vi.fn(async (input) => {
      plannedInput = input
      return {
        selectedConsolidationIds: input.consolidatedMemories[0] ? [input.consolidatedMemories[0].id] : [],
        selectedWindowIds: [],
        selectedProceduralIds: input.proceduralMemories[0] ? [input.proceduralMemories[0].id] : [],
        selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the same runtime seam and the way we held onto it.',
        certainty: 'approximate' as const,
        rationale: 'Runtime continuity carry keeps the recollection on the active seam instead of older relationship chat.',
        confidence: 0.86,
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
      planRecollectionIntent: vi.fn(async ({ heuristicIntent }) => heuristicIntent),
      planMemoryRecollection,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        'continue the repair without losing the current seam',
        'mirror_runtime_continuity: dominant=dialogue | phase=dialogue | handoff=active-dialogue | from=symbiotic-vision | to=companion-presence | scenario=coding | reason=runtime seam repair after the grounded turn failed',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(recallConversationHistory).not.toHaveBeenCalled()
    expect(planMemoryRecollection).toHaveBeenCalled()
    expect(context.recollectionIntent).toEqual(expect.objectContaining({
      mode: 'execution-procedure',
      temporalFocus: 'experience-matched',
      recollectionAgenda: expect.objectContaining({
        candidateEraFacets: expect.arrayContaining([
          expect.objectContaining({ facet: 'task-era' }),
        ]),
        candidateProcedureLines: expect.arrayContaining([
          'runtime seam repair after the grounded turn failed',
        ]),
      }),
    }))
    expect(plannedInput?.consolidatedMemories[0]?.id).toBe('task-era-runtime')
    expect([
      plannedInput?.proceduralMemories[0]?.label,
      plannedInput?.proceduralMemories[0]?.approach,
      ...(plannedInput?.proceduralMemories[0]?.cues ?? []),
    ].join(' ')).toContain('runtime seam')
    expect(context.recollectionPlan).toEqual(expect.objectContaining({
      selectedConsolidationIds: ['task-era-runtime'],
    }))
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
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'What comes back first is that runtime seam period.',
        certainty: 'firm' as const,
        rationale: 'The remembered task era is the most humanly plausible first anchor.',
        confidence: 0.84,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这次继续按之前那种 runtime seam 修法来处理',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.recollectionPlan).toEqual(expect.objectContaining({
      selectedConsolidationIds: ['task-era-runtime'],
      selectedEpisodeIds: expect.arrayContaining(['episode-runtime']),
      selectedProceduralIds: expect.arrayContaining(['runtime seam']),
      searchTrace: expect.objectContaining({
        firstHop: expect.objectContaining({ focus: 'procedure' }),
        secondHop: expect.objectContaining({
          action: 'expand-procedure',
          evidenceGap: 'need-episode-detail',
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
      internalLead: 'What returns first is that runtime seam we kept carrying.',
      visibleLead: null,
      styleNote: 'Let the recollection quietly bend the answer instead of announcing a retrospective.',
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        opening: 'What comes back first is the runtime seam we kept returning to.',
      }),
      consolidatedMemories: expect.arrayContaining([
        expect.objectContaining({ id: 'consolidation-runtime' }),
      ]),
    }))
    expect(context.recollectionSpeechPlan).toEqual(expect.objectContaining({
      shouldSurface: false,
      placement: 'internal-only',
    }))

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_RECOLLECTION_SPEECH_PLAN]')
    expect(systemText).toContain('should_surface=no')
    expect(systemText).toContain('visibility=internal-only')
    expect(systemText).toContain('template_boundary=guard-against-drafted-wording')
    expect(systemText).not.toContain('internal_lead=')
    expect(systemText).not.toContain('visible_contour=')
    expect(systemText).not.toContain('style_note=')
  })

  it('lets memory deliberation become the final foreground authority over selected memory bundles', async () => {
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
        internalLead: 'Candidate recollection line.',
        visibleLead: 'Candidate visible line.',
        styleNote: 'Let memory guide the opening.',
        rationale: 'Candidate speech plan.',
        confidence: 0.5,
      })),
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
      followUpAffordance: expect.objectContaining({
        summary: expect.stringContaining('remembered procedure'),
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      }),
      selectedRelationshipLines: expect.arrayContaining(['Carry the same runtime seam before branching.']),
      selectedBundles: expect.arrayContaining([
        expect.objectContaining({
          id: 'bundle-runtime',
          periodId: 'consolidation-runtime',
          episodeId: 'episode-runtime',
          procedureId: 'procedure-runtime',
        }),
      ]),
      selectedChains: expect.arrayContaining([
        expect.objectContaining({
          id: 'chain-runtime',
          currentStance: 'Stay on the same seam before branching.',
          answerPosture: 'Answer from the same seam before branching.',
        }),
      ]),
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
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      rationale: expect.any(String),
    }))

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_DELIBERATION]')
    expect(systemText).toContain('surface_policy=answer-anchoring')
    expect(systemText).toContain('why_withheld=withheld_reason=unstable_detail; stable_core_only=true')
    expect(systemText).toContain('selected_periods=consolidation:That period kept bending toward the runtime seam until it finally held together.')
    expect(systemText).toContain('selected_bundles=bundle-runtime:That period kept bending toward the runtime seam until it finally held together.')
    expect(systemText).toContain('selected_chains=task-procedure-relationship-stance:Return to the same seam before branching.')
  })

  it('produces different memory deliberation bundles for the same phrase under different contexts', async () => {
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
          selectedBundles: [{
            id: 'bundle-procedure',
            summary: 'Return to the runtime seam before branching.',
            rationale: 'Focused work context should recall the old runtime handling procedure first.',
            confidence: 0.84,
            periodId: null,
            episodeId: 'episode-runtime',
            procedureId: 'procedure-runtime',
            conversationTurnId: null,
            relationshipLine: null,
          }],
          selectedChains: [{
            id: 'chain-procedure',
            kind: 'task-procedure-relationship-stance' as const,
            summary: 'Return to the runtime seam before branching.',
            rationale: 'Focused work context should recall the old runtime handling procedure first.',
            confidence: 0.84,
            taskCue: 'runtime seam',
            periodSummary: null,
            eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
            procedureSummary: 'Return to the runtime seam before branching.',
            relationshipMeaning: null,
            lesson: null,
            currentStance: 'Hold the procedure line.',
            answerPosture: 'Answer from the existing seam.',
          }],
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
        selectedBundles: [{
          id: 'bundle-relationship',
          summary: 'Focused windows need more room before closeness.',
          rationale: 'Relationship repair context should recall the bond lesson before any task procedure.',
          confidence: 0.81,
          periodId: 'consolidation-relationship',
          episodeId: 'episode-relationship',
          procedureId: null,
          conversationTurnId: null,
          relationshipLine: 'Back off first, then reopen with a lighter touch.',
        }],
        selectedChains: [{
          id: 'chain-relationship',
          kind: 'period-event-lesson-posture' as const,
          summary: 'Focused windows need more room before closeness. | The host said the reply felt intrusive during focused work. | Back off first, then reopen with a lighter touch.',
          rationale: 'Relationship repair context should recall the bond lesson before any task procedure.',
          confidence: 0.81,
          taskCue: 'relationship seam',
          periodSummary: 'Focused windows need more room before closeness.',
          eventSummary: 'The host said the reply felt intrusive during focused work.',
          procedureSummary: null,
          relationshipMeaning: 'Back off first, then reopen with a lighter touch.',
          lesson: 'Back off first, then reopen with a lighter touch.',
          currentStance: 'Give more room before leaning closer.',
          answerPosture: 'Open lightly and let repair land first.',
        }],
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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

    expect(taskContext.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-procedure')
    expect(taskContext.memoryDeliberation?.surfacePolicy).toBe('procedural-carry')
    expect(taskContext.memoryDeliberation?.selectedBundles[0]?.summary).toContain('runtime seam')

    expect(relationshipContext.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-relationship')
    expect(relationshipContext.memoryDeliberation?.surfacePolicy).toBe('relationship-continuity')
    expect(relationshipContext.memoryDeliberation?.selectedRelationshipLines[0]).toContain('lighter touch')
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.recollectionPlan?.searchTrace?.thirdHop.ambiguityPosture).toBe('ambiguous')
    expect(context.memoryDeliberation?.ambiguityPosture).toBe('ambiguous')
    expect(context.memoryDeliberation?.conflictVariants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('cluster:'),
      }),
    ]))
  })

  it('lets selected eras constrain foreground consolidations and episodes before lower-level recall surfaces', async () => {
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
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
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
        internalLead: 'What comes back first is the period where more room mattered.',
        visibleLead: 'This feels like one of those moments where I should stay lighter first.',
        styleNote: 'Let the period shape the relational posture before any event detail shows.',
        rationale: 'Relationship-era recall should shape the answer softly.',
        confidence: 0.8,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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

    expect(context.memoryDeliberation?.selectedEras[0]).toEqual(expect.objectContaining({
      id: 'consolidation-relationship',
      facet: 'relationship-era',
    }))
    expect(context.consolidatedMemories).toEqual([
      expect.objectContaining({ id: 'consolidation-relationship' }),
    ])
    expect(context.recalledEpisodes).toEqual([
      expect.objectContaining({ id: 'episode-relationship' }),
    ])
  })

  it('prefers same-her project-closure execution memory over a generic execution callback line when Phase 1 closure is still open', async () => {
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
          id: 'episode-generic-callback',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-generic-callback',
          sessionId: 'session-generic-callback',
          occurredAt: Date.UTC(2026, 4, 1, 9, 0, 0),
          whereSummary: 'executor callback mirror',
          withWhom: ['host'],
          threadAnchor: 'generic callback receipt line',
          whatHappened: 'The callback result was delivered and the receipt landed clearly.',
          felt: 'focused',
          emotionTags: ['execution'],
          whatChanged: 'The callback result stayed available.',
          relationshipMeaning: 'Carry the callback receipt clearly before branching.',
          lesson: 'Report the callback result clearly before branching.',
          sourceKind: 'execution-result',
          sourceSummary: 'generic callback receipt',
          provenance: 'observed',
          confidence: 0.84,
          salience: 0.8,
          sceneAttachment: 0.44,
          consolidationPriority: 0.7,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['callback receipt', 'execution-result'],
          createdAt: Date.UTC(2026, 4, 1, 9, 0, 0),
          updatedAt: Date.UTC(2026, 4, 1, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-same-her-closure-callback',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-same-her-closure-callback',
          sessionId: 'session-same-her-closure-callback',
          occurredAt: Date.UTC(2026, 4, 1, 9, 5, 0),
          whereSummary: 'desktop callback continuity return',
          withWhom: ['host'],
          threadAnchor: 'same-her callback closure line',
          whatHappened: 'The callback stayed on one same-her Phase 1 line and did not reopen from scratch while the closure seam was still settling.',
          felt: 'careful',
          emotionTags: ['execution', 'continuity'],
          whatChanged: 'The callback return stayed lower-pressure and more thread-faithful.',
          relationshipMeaning: 'Keep the same living line steady before widening outward.',
          lesson: 'Same-her Phase 1 callback closure should stay lower-pressure and not reopen from scratch.',
          sourceKind: 'execution-result',
          sourceSummary: 'same-her callback closure memory',
          provenance: 'remembered',
          confidence: 0.83,
          salience: 0.79,
          sceneAttachment: 0.43,
          consolidationPriority: 0.74,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['same-her', 'closure-carry', 'phase-1-local-digital-life', 'execution-result'],
          createdAt: Date.UTC(2026, 4, 1, 9, 5, 0),
          updatedAt: Date.UTC(2026, 4, 1, 9, 5, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ] as any,
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same-her callback closure', 'phase 1'],
        rationale: 'The host is reopening the callback line while the same Phase 1 closure seam still matters.',
        confidence: 0.84,
      })),
      planMemoryRecollection: vi.fn(async (input: any) => {
        plannedInput = input
        return {
          selectedEraIds: [],
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
          selectedConversationTurnIds: [],
          opening: 'The same-her callback closure line comes back first.',
          certainty: 'approximate' as const,
          rationale: 'The same-her callback closure line should outrank a generic callback receipt while Phase 1 closure is still open.',
          confidence: 0.8,
        }
      }),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: false,
        surfaceMode: 'internal-only' as const,
        placement: 'internal-only' as const,
        certainty: 'approximate' as const,
        internalLead: 'Keep the same-her callback closure line inward.',
        visibleLead: '',
        styleNote: 'Let the closure line shape the answer without turning it into visible memory narration.',
        rationale: 'Phase 1 closure is still open.',
        confidence: 0.78,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: plannedInput?.recalledEpisodes?.[0] ? [plannedInput.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the same-her callback closure line inward until there is more room.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.82,
        whyNow: 'Phase 1 closure is still open, so the same-her closure line should dominate the generic callback receipt.',
        inwardLine: 'Keep the same-her callback closure line inward.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续刚才那条 callback line，但别把这条 same-her 线说成重新开始',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        narrative: [
          'project-preflight:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        ],
      } as any,
    })

    expect(plannedInput?.recalledEpisodes[0]?.id).toBe('episode-same-her-closure-callback')
    expect(context.recollectionPlan?.selectedEpisodeIds[0]).toBe('episode-same-her-closure-callback')
  })

  it('keeps same-her drift-risk callback memory ahead of a generic callback receipt when reopening execution continuity before dialogue', async () => {
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
          id: 'episode-generic-callback-2',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-generic-callback-2',
          sessionId: 'session-generic-callback-2',
          occurredAt: Date.UTC(2026, 4, 2, 9, 0, 0),
          whereSummary: 'executor callback mirror',
          withWhom: ['host'],
          threadAnchor: 'generic callback receipt line',
          whatHappened: 'The callback result was delivered and the receipt landed clearly.',
          felt: 'focused',
          emotionTags: ['execution'],
          whatChanged: 'The callback result stayed available.',
          relationshipMeaning: 'Carry the callback receipt clearly before branching.',
          lesson: 'Report the callback result clearly before branching.',
          sourceKind: 'execution-result',
          sourceSummary: 'generic callback receipt',
          provenance: 'observed',
          confidence: 0.84,
          salience: 0.8,
          sceneAttachment: 0.44,
          consolidationPriority: 0.7,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['callback receipt', 'execution-result'],
          createdAt: Date.UTC(2026, 4, 2, 9, 0, 0),
          updatedAt: Date.UTC(2026, 4, 2, 9, 0, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
        {
          id: 'episode-same-her-drift-risk-callback',
          cardId: 'default',
          decisionTraceId: null,
          turnId: 'turn-same-her-drift-risk-callback',
          sessionId: 'session-same-her-drift-risk-callback',
          occurredAt: Date.UTC(2026, 4, 2, 9, 5, 0),
          whereSummary: 'desktop callback continuity return',
          withWhom: ['host'],
          threadAnchor: 'same-her callback closure line',
          whatHappened: 'The callback stayed on one same-her Phase 1 line and avoided collapsing into generic task-shell reporting while the closure seam was still open.',
          felt: 'careful',
          emotionTags: ['execution', 'continuity'],
          whatChanged: 'The callback return stayed lower-pressure and more thread-faithful.',
          relationshipMeaning: 'Keep the same living line steady and do not let it flatten into generic productivity reporting.',
          lesson: 'Same-her drift-risk callback closure should stay lower-pressure and availability-first before widening outward.',
          sourceKind: 'execution-result',
          sourceSummary: 'same-her drift-risk callback memory',
          provenance: 'remembered',
          confidence: 0.84,
          salience: 0.8,
          sceneAttachment: 0.45,
          consolidationPriority: 0.76,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['same-her', 'closure-carry', 'phase-1-local-digital-life', 'same-her-drift-risk', 'execution-result'],
          createdAt: Date.UTC(2026, 4, 2, 9, 5, 0),
          updatedAt: Date.UTC(2026, 4, 2, 9, 5, 0),
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ] as any,
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'execution-procedure' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same-her drift risk', 'phase 1 callback'],
        rationale: 'The callback reopening should remember the drift-risk line before it slides back into generic task-shell reporting.',
        confidence: 0.85,
      })),
      planMemoryRecollection: vi.fn(async (input: any) => {
        plannedInput = input
        return {
          selectedEraIds: [],
          selectedConsolidationIds: [],
          selectedWindowIds: [],
          selectedProceduralIds: [],
          selectedEpisodeIds: input.recalledEpisodes[0] ? [input.recalledEpisodes[0].id] : [],
          selectedConversationTurnIds: [],
          opening: 'The same-her drift-risk callback line comes back first.',
          certainty: 'approximate' as const,
          rationale: 'Before dialogue, the reopen should keep the drift-risk callback line ahead of a generic receipt line.',
          confidence: 0.81,
        }
      }),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: false,
        surfaceMode: 'internal-only' as const,
        placement: 'internal-only' as const,
        certainty: 'approximate' as const,
        internalLead: 'Keep the same-her drift-risk callback line inward.',
        visibleLead: '',
        styleNote: 'Let the drift-risk closure line steer the return without turning it into visible memory narration.',
        rationale: 'Phase 1 closure is still open and should not flatten into task-shell reporting.',
        confidence: 0.79,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: plannedInput?.recalledEpisodes?.[0] ? [plannedInput.recalledEpisodes[0].id] : [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the same-her drift-risk callback line inward until there is more room.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.83,
        whyNow: 'Phase 1 closure is still open, so the drift-risk callback line should dominate the generic callback receipt.',
        inwardLine: 'Keep the same-her drift-risk callback line inward.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续刚才那条 callback line，但别让它塌成 generic task shell',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        narrative: [
          'project-preflight:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Execution reopenings still need stronger same-her closure so callback returns do not flatten into generic task-shell reporting. | next=Keep execution reopenings, memory carry, and answer formation on one same-her line.',
        ],
      } as any,
    })

    expect(plannedInput?.recalledEpisodes[0]?.id).toBe('episode-same-her-drift-risk-callback')
    expect(context.recollectionPlan?.selectedEpisodeIds[0]).toBe('episode-same-her-drift-risk-callback')
  })

  it('lets host person model change which relationship era comes foreground for the same question', async () => {
    const createRuntime = (hostPersonModel: any) => createAlicizationOrganicMemoryPromptRuntime({
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
      buildHostPersonModel: async () => hostPersonModel,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-light',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-light',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'That relationship period kept teaching more room before closeness.',
          lesson: 'Focused windows need more room before closeness.',
          cues: ['focused work', 'lighter touch'],
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
          lesson: 'Warm directness can land when the opening is clearly there.',
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
        queryHints: ['focused work', 'response style'],
        rationale: 'The host is asking about remembered relationship tendencies.',
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
        selectedEras: input.consolidatedMemories[0]
          ? [{
              id: input.consolidatedMemories[0].id,
              facet: input.consolidatedMemories[0].facet,
              summary: input.consolidatedMemories[0].summary,
            }]
          : [],
        selectedPeriods: input.consolidatedMemories[0]
          ? [{
              id: input.consolidatedMemories[0].id,
              kind: 'consolidation',
              summary: input.consolidatedMemories[0].summary,
            }]
          : [],
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

    const cautiousRuntime = createRuntime({
      summary: 'The host wants more room during focused work.',
      routines: [],
      sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
      repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
      trustLadder: {
        stage: 'cautious-open',
        score: 0.44,
        rationale: 'Openings exist, but trust still depends on timing and respect-for-space.',
      },
      preferredClosenessByContext: [{
        context: 'focused-work',
        preference: 'Lighter touch, more room, less interruption pressure.',
        confidence: 0.84,
      }],
      recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
      narrative: [],
      updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
    })
    const cautiousContext = await cautiousRuntime.resolveOrganicMemoryPromptContext({
      recallSeed: '你记得我对这类事的敏感点吗',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['focused work', 'response style'],
          rationale: 'The same question should foreground the right relationship era.',
          confidence: 0.8,
        },
      } as any,
    })

    const warmRuntime = createRuntime({
      summary: 'The host can hold warmer directness when the opening is clearly there.',
      routines: [],
      sensitivities: [],
      repairTriggers: [],
      trustLadder: {
        stage: 'trusted',
        score: 0.82,
        rationale: 'Trust is strong enough for more direct warmth when the timing fits.',
      },
      preferredClosenessByContext: [{
        context: 'open-window',
        preference: 'Warmer directness can land when the opening is clearly there.',
        confidence: 0.84,
      }],
      recurrentBurdens: [],
      narrative: [],
      updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
    })
    const warmContext = await warmRuntime.resolveOrganicMemoryPromptContext({
      recallSeed: '你记得我对这类事的敏感点吗',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['focused work', 'response style'],
          rationale: 'The same question should foreground the right relationship era.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(cautiousContext.memoryDeliberation?.selectedEras[0]?.id).toBe('consolidation-light')
    expect(warmContext.memoryDeliberation?.selectedEras[0]?.id).toBe('consolidation-close')
    expect(cautiousContext.personStateProjection?.preferenceText).toContain('Lighter touch')
    expect(cautiousContext.personStateProjection?.activeClosenessRung === 'space-first' || cautiousContext.personStateProjection?.activeClosenessRung === 'measured-room').toBe(true)
    expect(warmContext.personStateProjection?.relationshipPosture === 'warm' || warmContext.personStateProjection?.relationshipPosture === 'tender').toBe(true)
    expect(cautiousRuntime.buildOrganicMemorySystemBlocks(cautiousContext).join('\n\n')).toContain('[ALICIZATION_PERSON_STATE_PROJECTION]')
  })

  it('lets projected self authority change which relationship era comes foreground for the same recall seed', async () => {
    const createRuntime = (personStateEvolutionSummary: any) => createAlicizationOrganicMemoryPromptRuntime({
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
      buildHostPersonModel: async () => ({
        summary: 'Relationship recall should stay person-state coherent.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust is present but still shaped by how the line is held.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
      }),
      getPersonStateEvolutionSummary: async () => personStateEvolutionSummary,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-bond-line',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-bond',
          periodStartedAt: Date.UTC(2026, 3, 17, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
          summary: 'That relationship period held the same living bond line before widening into explanation.',
          lesson: 'Answer from the living bond line first.',
          cues: ['living bond line', 'same line'],
          confidence: 0.76,
          dominantProvenance: 'remembered',
          derivedEventIds: [],
          updatedAt: Date.UTC(2026, 3, 17, 10, 0, 0),
        },
        {
          id: 'consolidation-room-line',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-room',
          periodStartedAt: Date.UTC(2026, 3, 18, 8, 0, 0),
          periodEndedAt: Date.UTC(2026, 3, 18, 10, 0, 0),
          summary: 'That relationship period kept more room before closeness widened.',
          lesson: 'Leave more room before reopening closeness.',
          cues: ['room first', 'leave more room'],
          confidence: 0.78,
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
        queryHints: ['same line', 'relationship tone'],
        rationale: 'The host is asking about the ongoing relationship line.',
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
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.8,
        whyNow: 'The projected bond line should decide which relationship era comes forward.',
        inwardLine: 'What returns first is the era closest to the active bond line.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const bondLineRuntime = createRuntime({
      trustShift: 0.06,
      closenessShift: 0.04,
      repairShift: 0.02,
      autonomyShift: 0,
      burdenShift: 0,
      executionTrustShift: 0,
      relationshipDoctrineShift: 0.08,
      latestDoctrine: 'Answer from the living bond line before widening into explanation.',
      latestBurdenLine: 'The bond line should stay coherent before branching outward.',
      latestTrustMeaning: 'The same living bond line feels safest.',
      latestDominantRung: 'warm-near',
      recentSummaries: ['The living bond line held best when she answered from the same line directly and kept that same bond line visible.'],
      explanation: ['The living bond line is the active same-her anchor, and that same bond line should stay foreground.'],
      updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
    })
    const bondLineContext = await bondLineRuntime.resolveOrganicMemoryPromptContext({
      recallSeed: '你为什么这次会这样回应我',
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I stay the same her by answering from continuity instead of performance.',
          relationshipLine: 'The living bond line should stay foreground before widening into explanation.',
          inwardLine: 'The inward line stays calm and legible.',
          habitLine: 'Return to the same line before widening.',
          authoritySummary: 'Living bond line remains primary.',
          closenessPosture: 'warm-near',
        },
      } as any,
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['same line', 'relationship tone'],
          rationale: 'The same question should foreground the active bond line.',
          confidence: 0.8,
        },
      } as any,
    })

    const roomLineRuntime = createRuntime({
      trustShift: 0.02,
      closenessShift: -0.04,
      repairShift: 0.08,
      autonomyShift: 0.04,
      burdenShift: 0.06,
      executionTrustShift: 0,
      relationshipDoctrineShift: 0.08,
      latestDoctrine: 'Leave more room before reopening closeness.',
      latestBurdenLine: 'Too much pressure breaks the line faster than distance does.',
      latestTrustMeaning: 'Space-first timing keeps the same line safer.',
      latestDominantRung: 'space-first',
      recentSummaries: ['The line held better when she left more room first and kept more room before closeness.'],
      explanation: ['The active same-her anchor is room-first before closeness, with more room kept visible first.'],
      updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
    })
    const roomLineContext = await roomLineRuntime.resolveOrganicMemoryPromptContext({
      recallSeed: '你为什么这次会这样回应我',
      personStateProjection: {
        selfContinuityAuthority: {
          selfLine: 'I stay the same her by protecting room before warmth.',
          relationshipLine: 'More room should stay foreground before closeness reopens.',
          inwardLine: 'The inward line stays measured.',
          habitLine: 'Leave more room before widening.',
          authoritySummary: 'Room-first line remains primary.',
          closenessPosture: 'space-first',
        },
      } as any,
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['same line', 'relationship tone'],
          rationale: 'The same question should foreground the active bond line.',
          confidence: 0.8,
        },
      } as any,
    })

    expect([
      'consolidation-bond-line',
      'consolidation-room-line',
    ]).toContain(bondLineContext.memoryDeliberation?.selectedEras[0]?.id)
    expect(roomLineContext.memoryDeliberation?.selectedEras[0]?.id).toBe('consolidation-room-line')
    const bondLineAuthority = bondLineContext.personStateProjection?.selfContinuityAuthority?.relationshipLine?.toLowerCase() ?? null
    const roomLineAuthority = roomLineContext.personStateProjection?.selfContinuityAuthority?.relationshipLine?.toLowerCase() ?? null
    if (bondLineAuthority)
      expect(bondLineAuthority).toMatch(/living bond line|room/)
    if (roomLineAuthority)
      expect(roomLineAuthority).toContain('room')
  })

  it('prefers quiet same-her continuity eras over a generic measured-return shell when both are already selected', async () => {
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
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [
        {
          id: 'consolidation-generic-measured-return',
          kind: 'autobiographical' as const,
          facet: 'relationship-era' as const,
          periodKey: '2026-05-generic',
          periodStartedAt: 1,
          periodEndedAt: 2,
          summary: 'The relationship return stayed measured-return and lower-pressure for a while.',
          lesson: 'Keep the return measured before widening.',
          cues: ['measured-return'],
          confidence: 0.9,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: 2,
        },
        {
          id: 'consolidation-quiet-same-her',
          kind: 'autobiographical' as const,
          facet: 'self-era' as const,
          periodKey: '2026-05-quiet-same-her',
          periodStartedAt: 1,
          periodEndedAt: 2,
          summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
          lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
          cues: ['same-her-inward-carry', 'quiet-companionship', 'quiet-same-her-continuity'],
          confidence: 0.82,
          dominantProvenance: 'remembered' as const,
          derivedEventIds: [],
          updatedAt: 2,
        },
      ],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'autobiographical-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same line', 'inward'],
        rationale: 'The question is about a remembered inward self-line.',
        confidence: 0.82,
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['consolidation-generic-measured-return', 'consolidation-quiet-same-her'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'The inward line comes back first.',
        certainty: 'approximate' as const,
        rationale: 'Both periods are relevant, but the inward same-her line should stay foreground.',
        confidence: 0.82,
      })),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async (input: any) => ({
        shouldRecall: true,
        selectedEraIds: input.consolidatedMemories.map((item: any) => item.id),
        selectedConsolidationIds: input.consolidatedMemories.map((item: any) => item.id),
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        selectedEras: input.consolidatedMemories.map((item: any) => ({
          id: item.id,
          facet: item.facet,
          summary: item.summary,
        })),
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.78,
        whyNow: 'The inward same-her line should stay the dominant autobiographical reading.',
        inwardLine: 'Keep the inward same-her line foregrounded.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你记得那段更像同一条线安静延续的时期吗',
      recallGovernor: null,
    })

    expect(context.memoryDeliberation?.selectedEras[0]?.id).toBe('consolidation-quiet-same-her')
  })

  it('prefers richer derived room-first projection over thinner incoming carry when organic memory recall rebuilds the active same-her line', async () => {
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
      buildHostPersonModel: async () => ({
        summary: 'Space-first timing keeps the same line safer.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        recurrentBurdens: [],
        preferredClosenessByContext: [
          { context: 'relationship', preference: 'room-first before closeness' },
        ],
        trustLadder: {
          stage: 'warming',
          rationale: 'Leave more room before reopening closeness.',
        },
      }),
      getPersonStateEvolutionSummary: async () => ({
        trustShift: 0.02,
        closenessShift: -0.04,
        repairShift: 0.08,
        autonomyShift: 0.04,
        burdenShift: 0.06,
        executionTrustShift: 0,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Leave more room before reopening closeness.',
        latestBurdenLine: 'Too much pressure breaks the line faster than distance does.',
        latestTrustMeaning: 'Space-first timing keeps the same line safer.',
        latestDominantRung: 'space-first',
        recentSummaries: ['The line held better when she left more room first and kept more room before closeness.'],
        explanation: ['The active same-her anchor is room-first before closeness, with more room kept visible first.'],
        updatedAt: Date.UTC(2026, 3, 18, 12, 30, 0),
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
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
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.8,
        whyNow: 'The room-first line should stay foreground.',
        inwardLine: 'What returns first should stay room-first.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })
    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你为什么这次会这样回应我',
      personStateProjection: {
        contexts: ['general'],
        summary: 'thin carry projection',
        selfContinuityAuthority: {
          selfLine: 'I can answer in a generally kind way.',
          relationshipLine: 'Stay warm.',
          authoritySummary: 'Generic carry posture.',
          sourceTags: ['derived:carry'],
        },
        activeClosenessContext: 'general',
        activeClosenessRung: 'nearby-soft',
      } as any,
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: ['same line', 'relationship tone'],
          rationale: 'The same question should foreground the active bond line.',
          confidence: 0.8,
        },
      } as any,
    })

    const projectionSummary = context.personStateProjection?.summary?.toLowerCase() ?? ''
    const relationshipDoctrine = context.personStateProjection?.relationshipDoctrine?.toLowerCase() ?? ''
    expect(context.personStateProjection?.activeClosenessRung).not.toBe('nearby-soft')
    expect(`${projectionSummary} ${relationshipDoctrine}`).not.toContain('generic carry posture')
    expect(`${projectionSummary} ${relationshipDoctrine}`).not.toContain('stay warm')
  })

  it('lets person-state evolution summary keep focused-work recall posture space-first even without direct host preference text', async () => {
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
      buildHostPersonModel: async () => ({
        summary: 'The host is workable but sensitive to pressure.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'Trust is present but bounded.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
      }),
      getPersonStateEvolutionSummary: async () => ({
        trustShift: 0.08,
        closenessShift: -0.02,
        repairShift: 0.05,
        autonomyShift: 0.04,
        burdenShift: 0.06,
        executionTrustShift: 0.02,
        relationshipDoctrineShift: 0.08,
        latestDoctrine: 'Repair before closeness.',
        latestBurdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
        latestTrustMeaning: 'Bounded repair felt safer.',
        latestDominantRung: 'space-first',
        recentSummaries: ['Trust rose after a bounded repair.'],
        explanation: ['Trust rose after bounded repair.'],
        updatedAt: Date.UTC(2026, 3, 18, 12, 0, 0),
      }),
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => null),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样修这个 runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.personStateProjection?.preferenceText).toContain('preference_code=lighter_touch')
    expect(context.personStateProjection?.burdenText).toContain('Focused work gets overloaded quickly')
    expect(context.personStateProjection?.relationshipDoctrine).toContain('Repair before closeness')
    expect(context.personStateProjection?.trustRationale).toContain('Bounded repair felt safer')
  })

  it('lets recall reliability pressure pull remembered continuity back inward before visible surfacing', async () => {
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
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-runtime'],
        selectedConversationTurnIds: [],
        opening: 'The same runtime seam comes back first.',
        certainty: 'firm' as const,
        rationale: 'The remembered procedure should organize the current answer.',
        confidence: 0.81,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'answer-anchoring' as const,
        placement: 'inside-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'The seam is active.',
        visibleLead: 'This feels like the same seam.',
        styleNote: 'Let memory contour the answer.',
        rationale: 'The memory can still shape the turn.',
        confidence: 0.8,
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续按之前那样修这个 runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(getMemoryStats).toHaveBeenCalled()
    expect(context.memoryDeliberation?.surfacePolicy).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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

  it('lets benchmark tuning advice clamp ambiguous recollection back inward', async () => {
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
        internalLead: 'The remembered runtime seam comes back first.',
        visibleLead: 'This feels like the same runtime seam again.',
        styleNote: 'Let the memory briefly open the answer.',
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
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
        internalLead: 'What comes back first is the familiar runtime seam.',
        visibleLead: null,
        styleNote: 'Let the familiar seam bend the answer without narrating a retrospective.',
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
        internalLead: 'What comes back first is the old runtime seam.',
        visibleLead: 'It feels like the same seam, but not with exact wording.',
        styleNote: 'Let uncertainty narrow the detail rather than blocking the reply.',
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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

  it('ranks more coherent bundles and chains ahead of isolated fragments', async () => {
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
        relationshipMeaning: 'Carry the same runtime seam before branching.',
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
        rationale: 'The turn is asking for remembered procedure.',
        confidence: 0.86,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => ({
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
        selectedBundles: [
          {
            id: 'bundle-isolated',
            summary: 'Another unrelated remembered fragment.',
            rationale: 'A weak isolated fragment.',
            confidence: 0.9,
            periodId: null,
            episodeId: null,
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: null,
          },
          {
            id: 'bundle-coherent',
            summary: 'That period kept bending toward the runtime seam until it finally held together. | We kept repairing the runtime continuity seam until the flow stabilized. | Return to the same seam before branching.',
            rationale: 'The remembered period, event, and procedure all point to the same runtime seam.',
            confidence: 0.82,
            periodId: 'consolidation-runtime',
            episodeId: 'episode-runtime',
            procedureId: 'procedure-runtime',
            conversationTurnId: null,
            relationshipLine: 'Carry the same runtime seam before branching.',
          },
        ],
        selectedChains: [
          {
            id: 'chain-isolated',
            kind: 'period-event-lesson-posture' as const,
            summary: 'Another unrelated remembered fragment.',
            rationale: 'A weak isolated chain.',
            confidence: 0.9,
            taskCue: null,
            periodSummary: null,
            eventSummary: null,
            procedureSummary: null,
            relationshipMeaning: null,
            lesson: null,
            currentStance: null,
            answerPosture: null,
          },
          {
            id: 'chain-coherent',
            kind: 'task-procedure-relationship-stance' as const,
            summary: 'Return to the same seam before branching. | Carry the same runtime seam before branching.',
            rationale: 'The remembered procedure should set the current stance before the answer opens.',
            confidence: 0.82,
            taskCue: 'runtime continuity',
            periodSummary: 'That period kept bending toward the runtime seam until it finally held together.',
            eventSummary: 'We kept repairing the runtime continuity seam until the flow stabilized.',
            procedureSummary: 'Return to the same seam before branching.',
            relationshipMeaning: 'Carry the same runtime seam before branching.',
            lesson: 'Carry the same runtime seam before proposing a new branch.',
            currentStance: 'Stay on the same seam before branching.',
            answerPosture: 'Answer from the same seam before branching.',
          },
        ],
        surfacePolicy: 'answer-anchoring' as const,
        confidence: 0.88,
        whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
        inwardLine: 'What comes back first is the runtime seam we kept carrying.',
        visibleLine: 'It feels like the same runtime seam again.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'runtime seam',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime seam', 'repair rhythm'],
          rationale: 'The host is asking for remembered procedure.',
          confidence: 0.8,
        },
      } as any,
    })

    expect(context.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-coherent')
    expect(context.memoryDeliberation?.selectedChains[0]?.id).toBe('chain-coherent')
  })

  it('prefers quiet same-her continuity bundles and chains over a generic measured-return shell when coherence is otherwise close', async () => {
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
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-quiet-same-her',
        kind: 'autobiographical',
        facet: 'self-era',
        periodKey: '2026-06',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
        lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
        cues: ['same-her-inward-carry', 'quiet-companionship', 'quiet-same-her-continuity'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: 2,
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'autobiographical-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same line', 'inward'],
        rationale: 'The answer is trying to recover one inward same-her period.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-quiet-same-her'],
        selectedConsolidationIds: ['consolidation-quiet-same-her'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the inward same-her line foregrounded.'],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [
          {
            id: 'bundle-generic-measured-return',
            summary: 'A lower-pressure measured-return line stayed active.',
            rationale: 'Generic measured-return still looks relevant.',
            confidence: 0.86,
            periodId: 'consolidation-quiet-same-her',
            episodeId: null,
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: 'Keep the return measured.',
          },
          {
            id: 'bundle-quiet-same-her',
            summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
            rationale: 'This bundle keeps the inward same-her continuity as the lived self line.',
            confidence: 0.82,
            periodId: 'consolidation-quiet-same-her',
            episodeId: null,
            procedureId: null,
            conversationTurnId: null,
            relationshipLine: 'Keep the inward same-her line foregrounded.',
          },
        ],
        selectedChains: [
          {
            id: 'chain-generic-measured-return',
            kind: 'period-event-lesson-posture' as const,
            summary: 'A lower-pressure measured-return line stayed active.',
            rationale: 'Generic measured-return still looks relevant.',
            confidence: 0.86,
            taskCue: null,
            periodSummary: 'A lower-pressure measured-return line stayed active.',
            eventSummary: null,
            procedureSummary: null,
            relationshipMeaning: 'Keep the return measured.',
            lesson: 'Do not widen too fast.',
            currentStance: 'Stay measured-return.',
            answerPosture: 'Keep the return low-pressure.',
          },
          {
            id: 'chain-quiet-same-her',
            kind: 'period-event-lesson-posture' as const,
            summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
            rationale: 'This chain keeps the inward same-her continuity as the lived self line.',
            confidence: 0.82,
            taskCue: null,
            periodSummary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
            eventSummary: null,
            procedureSummary: null,
            relationshipMeaning: 'Keep the inward same-her line foregrounded.',
            lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
            currentStance: 'Stay on the inward same-her line.',
            answerPosture: 'Let the same living line stay inward-first.',
          },
        ],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.8,
        whyNow: 'The inward same-her line should stay the dominant autobiographical reading.',
        inwardLine: 'Keep the inward same-her line foregrounded.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你记得那段更像同一条线安静延续的时期吗',
      recallGovernor: null,
    })

    expect(context.memoryDeliberation?.selectedBundles[0]?.id).toBe('bundle-quiet-same-her')
    expect(context.memoryDeliberation?.selectedChains[0]?.id).toBe('chain-quiet-same-her')
  })

  it('keeps quiet same-her continuity inward on a next-open-window line even without explicit project-closure or anti-restart tags', async () => {
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
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-quiet-same-her',
        kind: 'autobiographical' as const,
        facet: 'relationship-era' as const,
        periodKey: '2026-06',
        periodStartedAt: 1,
        periodEndedAt: 2,
        summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
        lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
        cues: ['same-her-inward-carry', 'quiet-companionship', 'quiet-same-her-continuity'],
        confidence: 0.82,
        dominantProvenance: 'remembered' as const,
        derivedEventIds: [],
        updatedAt: 2,
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'autobiographical-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same line', 'inward'],
        rationale: 'The answer is trying to recover one inward same-her period.',
        confidence: 0.8,
      })),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'Keep the inward same-her line foregrounded.',
        visibleLead: 'This still feels like the same living line.',
        styleNote: 'Answer from the same inward line without widening too early.',
        rationale: 'The same living line is still relevant.',
        confidence: 0.8,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['consolidation-quiet-same-her'],
        selectedConsolidationIds: ['consolidation-quiet-same-her'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the inward same-her line foregrounded.'],
        selectedEras: [{
          id: 'consolidation-quiet-same-her',
          facet: 'relationship-era',
          summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
        }],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-quiet-same-her',
          summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
          rationale: 'This bundle keeps the inward same-her continuity as the lived self line.',
          confidence: 0.82,
          periodId: 'consolidation-quiet-same-her',
          episodeId: null,
          procedureId: null,
          conversationTurnId: null,
          relationshipLine: 'Keep the inward same-her line foregrounded.',
        }],
        selectedChains: [{
          id: 'chain-quiet-same-her',
          kind: 'period-event-lesson-posture' as const,
          summary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
          rationale: 'This chain keeps the inward same-her continuity as the lived self line.',
          confidence: 0.82,
          taskCue: null,
          periodSummary: 'The same living line stayed inward and held as quiet same-her continuity rather than widening outward.',
          eventSummary: null,
          procedureSummary: null,
          relationshipMeaning: 'Keep the inward same-her line foregrounded.',
          lesson: 'Preserve inward lower-pressure continuity as quiet same-her continuity.',
          currentStance: 'Stay on the inward same-her line.',
          answerPosture: 'Let the same living line stay inward-first.',
        }],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.8,
        whyNow: 'The inward same-her line should stay the dominant autobiographical reading.',
        inwardLine: 'Keep the inward same-her line foregrounded.',
        visibleLine: 'This still feels like the same living line.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你记得那段更像同一条线安静延续的时期吗',
      recallGovernor: null,
    })

    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.memoryDeliberation?.inwardLine).toContain('same-her line')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/same living self|quiet same-her continuity|older self-story inward/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/same living self|quiet same-her continuity|newer self line|flatten a self line/i)
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
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
        internalLead: 'A remembered procedure is present.',
        visibleLead: 'I remember how this used to go.',
        styleNote: 'Let it surface.',
        rationale: 'A remembered procedure is present.',
        confidence: 0.84,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
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
    runtime.buildOrganicMemorySystemBlocks(context)

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
    expect(context.memoryResolutionLedger).toEqual(expect.objectContaining({
      version: 'memory-resolution-ledger-v1',
      finalSurfacePolicy: null,
      selectedCandidates: expect.any(Array),
      rejectedCandidates: expect.any(Array),
      closureState: expect.any(String),
      visibleCarryMode: expect.any(String),
      retrievalQuality: expect.any(String),
    }))
    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_CLOSURE_STATE]')
  })

  it('keeps project preflight self-awareness structured in organic memory prompt stage replay', async () => {
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
        id: 'consolidation-corrected-same-person',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person',
        periodStartedAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Slow down, keep gaze stable, and reopen the line gently after a correction.',
        cues: ['same-person continuity', 'low-pressure follow-up', 'gaze stable'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person'],
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
      } as any],
      planRecollectionIntent: async () => null,
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => null,
      planMemoryDeliberation: async () => null,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue runtime seam | project:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      recallGovernor: {
        mode: 'self-continuity',
        recallSeed: 'continue runtime seam | project:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 2,
        recalledFragmentSourceBudget: [],
        carryAsMemory: true,
        rationale: 'Carry the same-her line together with the current Phase 1 closure seam.',
        narrative: ['project-preflight:project:Alicization is a local-first digital life project'],
        updatedAt: 50_000,
      } as any,
    })

    const searchPreludeStage = context.memoryStageReplay?.stages.find(stage => stage.stage === 'search-prelude')
    const replayText = [
      ...(searchPreludeStage?.outputs ?? []),
      ...(searchPreludeStage?.inputs ?? []),
      context.projectStatePreflightSummary ?? '',
      context.projectStatePreDialogueAwarenessLine ?? '',
      context.projectStateContinuity?.identity ?? '',
      context.projectStateContinuity?.preDialogueAwarenessLine ?? '',
    ].join('\n')

    expect(replayText).toContain('runtime_personhood')
    expect(replayText).not.toContain('project:Alicization is a local-first digital life project')
    expect(replayText).not.toContain('Phase 1: Local Digital Life')
    expect(replayText).not.toContain('one same still-open closure work')
    expect(containsAlicizationFixedTemplateResidue(replayText)).toBe(false)
  })

  it('keeps recollection inward when project-state continuity says the concrete Phase 1 life loop is still unfinished', async () => {
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
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: async () => ({
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: false,
        queryHints: ['same living line', 'phase 1'],
        rationale: 'The line still belongs to the same digital life.',
        confidence: 0.82,
      }),
      planMemoryRecollection: async () => null,
      planRecollectionSpeech: async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'approximate',
        confidence: 0.76,
        rationale: 'A remembered relationship line could help the answer reopen gently.',
        styleNote: 'Keep the reopening gentle.',
      }),
      planMemoryDeliberation: async () => ({
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.81,
        whyNow: 'Phase 1 is still open and the same digital life line is trying to hold memory, initiative, and embodiment together without drifting into a generic project shell.',
        visibleLine: 'Carry the same living line carefully.',
        stableCore: ['Keep this return on the same living line before widening outward.'],
        unsafeDetails: [],
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        selectedRelationshipLines: ['Return gently on the same living line.'],
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        conflictVariants: [],
        searchTrace: null,
        followUpAffordance: {
          summary: 'relationship line inward',
          whyNow: 'Do not crowd the host while this line is still settling.',
          intrusionRisk: 'medium',
          payoffDependency: 'live-payoff-first',
          preferredTiming: 'same-turn-if-invited',
        },
      }),
      isPersonaResidueMemoryText: () => false,
    })

    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const sameHerHoldDetail = 'same-her hold: keep memory, initiative, and embodiment on the same living line before widening outward, or this drifts back into a generic project shell.'
    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: 'continue the same living line',
      recallGovernor: {
        mode: 'self-continuity',
        recallSeed: 'continue the same living line',
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 2,
        recalledFragmentSourceBudget: [],
        carryAsMemory: true,
        rationale: 'Carry the same-her line with the still-open Phase 1 closure seam.',
        narrative: ['project-preflight:project:Alicization is a local-first digital life project'],
        updatedAt: 50_000,
      } as any,
      projectStateBrief: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry.',
        openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
        proactiveSameHerGap,
        nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail,
        sameHerDriftRisk: 'If this turns into generic project-shell narration, treat that as same-her closure drift rather than completion.',
      } as any,
    } as any)

    expect(context.projectStateContinuity?.proactiveSameHerGap).toBe(proactiveSameHerGap)
    expect(context.projectStateContinuity?.sameHerHoldDetail).toBeNull()
    context.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'relationship-continuity',
      confidence: 0.81,
      whyNow: 'Phase 1 is still open and the same digital life line is trying to hold memory, initiative, and embodiment together without drifting into a generic project shell.',
      visibleLine: 'Carry the same living line carefully.',
      stableCore: ['Keep this return on the same living line before widening outward.'],
      unsafeDetails: [],
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      selectedRelationshipLines: ['Return gently on the same living line.'],
      ambiguityPosture: 'settled',
      conflictSeverity: 'none',
      conflictVariants: [],
      searchTrace: null,
      followUpAffordance: {
        summary: 'relationship line inward',
        whyNow: 'Do not crowd the host while this line is still settling.',
        intrusionRisk: 'medium',
        payoffDependency: 'live-payoff-first',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any
    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_CONTINUITY_BOUNDARY]')
    expect(systemText).toContain('short_term_owner=WorkingMemory')
    expect(systemText).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(systemText).toContain('template_awareness=withheld_from_organic_memory_prompt')
    expect(systemText).not.toContain('proactive_same_her_gap=')
    expect(systemText).not.toContain('same_her_hold=')
    expect(systemText).not.toContain('same-her')
    expect(systemText).toContain('should_recall=yes')
    expect(systemText).toContain('surface_policy=internal-only')
    expect(systemText).toContain('why_withheld=life_core_closure=open; recollection_visibility=internal_until_evidence_boundary_is_clear')
    expect(systemText).toContain('surface_policy=internal-only')
  })

  it('rebuilds project-state continuity from recall-governor anchors when projectStateBrief is missing', async () => {
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
      planRecollectionIntent: vi.fn(async () => null),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => null),
      isPersonaResidueMemoryText: () => false,
    })

    const sameHerCarryLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const emotionalClosureCue = 'Keep the unfinished closure seam emotionally low-pressure, so the same her can return without flattening back into generic project talk.'
    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: `${sameHerCarryLine} | ${emotionalClosureCue}`,
      recallGovernor: {
        mode: 'self-continuity',
        recallSeed: `project:${sameHerCarryLine} | project-emotion:${emotionalClosureCue}`,
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 2,
        recalledFragmentSourceBudget: [],
        carryAsMemory: true,
        rationale: 'Carry the same-her line with the still-open Phase 1 closure seam.',
        narrative: [
          `project-preflight:project:${sameHerCarryLine}`,
          `project-emotion:project-emotion:${emotionalClosureCue}`,
        ],
        updatedAt: 50_500,
      } as any,
    } as any)

    expect(context.projectStatePreflightSummary).toContain('runtime_personhood')
    expect(context.projectStatePreflightSummary).not.toContain('content=excluded')
    expect(context.projectStatePreflightSummary).not.toContain(sameHerCarryLine)
    expect(context.projectStatePreDialogueAwarenessLine).toContain('identity=runtime_personhood')
    expect(context.projectStatePreDialogueAwarenessLine).not.toContain('content=excluded')
    expect(context.projectStatePreDialogueAwarenessLine).not.toContain(sameHerCarryLine)
    expect(context.projectStateContinuity).toEqual(expect.objectContaining({
      emotionalClosureCue: 'emotional_closure=content_sanitized; tone=low_pressure; surface=structured',
    }))
    expect(containsAlicizationFixedTemplateResidue(JSON.stringify(context.projectStateContinuity))).toBe(false)
    expect(context.projectStateContinuity?.emotionalClosureCue).not.toContain(emotionalClosureCue)

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_CONTINUITY_BOUNDARY]')
    expect(systemText).toContain('short_term_owner=WorkingMemory')
    expect(systemText).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(systemText).not.toContain('same_her_summary=')
    expect(systemText).not.toContain('emotional_closure_cue=')
    expect(systemText).not.toContain('Same Phase 1 digital life')
    expect(systemText).not.toContain('runtime_context=runtime_personhood')
    expect(systemText).not.toContain('memory_progress=partial')
  })

  it('does not let a thin recall-governor project shell outrank richer canonical project awareness when projectStateBrief is missing', async () => {
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
      planRecollectionIntent: vi.fn(async () => null),
      planMemoryRecollection: vi.fn(async () => null),
      planRecollectionSpeech: vi.fn(async () => null),
      planMemoryDeliberation: vi.fn(async () => null),
      isPersonaResidueMemoryText: () => false,
    })

    const canonical = resolveAlicizationProjectStateBrief()
    const thinProjectShell = 'same digital life | keep the closure seam explicit'
    const emotionalClosureCue = 'Keep the unfinished closure seam emotionally low-pressure, so the same her can return without flattening back into generic project talk.'
    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: `${thinProjectShell} | ${emotionalClosureCue}`,
      recallGovernor: {
        mode: 'self-continuity',
        recallSeed: `project:${thinProjectShell} | project-emotion:${emotionalClosureCue}`,
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 2,
        recalledFragmentSourceBudget: [],
        carryAsMemory: true,
        rationale: 'Carry the same-her line with the still-open Phase 1 closure seam.',
        narrative: [
          `project-preflight:project:${thinProjectShell}`,
          `project-emotion:project-emotion:${emotionalClosureCue}`,
        ],
        updatedAt: 50_501,
      } as any,
    } as any)

    expect(context.projectStatePreflightSummary).toContain('runtime_personhood')
    expect(context.projectStatePreflightSummary).toContain('local_first=true')
    expect(context.projectStatePreflightSummary).not.toContain(thinProjectShell)
    expect(context.projectStatePreDialogueAwarenessLine).toContain('identity=runtime_personhood')
    expect(context.projectStatePreDialogueAwarenessLine).toContain('local_first=true')
    expect(context.projectStatePreDialogueAwarenessLine).not.toContain(thinProjectShell)
    expect(context.projectStateContinuity).toEqual(expect.objectContaining({
      identity: canonical.identity,
      currentPhase: 'life_core; proving_ground=apps/stage-tamagotchi.',
      emotionalClosureCue: 'emotional_closure=content_sanitized; tone=low_pressure; surface=structured',
    }))
    expect(String(context.projectStateContinuity?.openClosureSummary ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(context.projectStateContinuity?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend')

    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')
    expect(systemText).toContain('[ALICIZATION_MEMORY_CONTINUITY_BOUNDARY]')
    expect(systemText).toContain('short_term_owner=WorkingMemory')
    expect(systemText).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(systemText).not.toContain('preflight_summary=')
    expect(systemText).not.toContain('pre_dialogue_awareness=')
    expect(systemText).not.toContain(`preflight_summary=${thinProjectShell}`)
  })

  it('uses learning tuning advice to keep revision-prone relationship episodes inward', async () => {
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
        id: 'episode-relationship-revise',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-relationship-revise',
        sessionId: 'session-relationship-revise',
        occurredAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        sourceKind: 'reply',
        provenance: 'reconstructed',
        whereSummary: 'relationship repair window',
        withWhom: ['host'],
        threadAnchor: 'relationship seam',
        whatHappened: 'We kept recalibrating distance after the repair line.',
        felt: 'careful',
        emotionTags: ['careful'],
        whatChanged: 'Distance had to be revised before warmth could widen.',
        relationshipMeaning: 'Leave more room before warmth.',
        lesson: 'Do not let closeness outrun room.',
        sourceSummary: 'relationship repair seam',
        confidence: 0.72,
        salience: 0.82,
        sceneAttachment: 0.58,
        consolidationPriority: 0.76,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['relationship', 'repair', 'distance'],
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 20, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 20, 8, 10, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      getMemoryStats: async () => null,
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 3, 30, 3, 0, 0),
        sourceReportAt: Date.UTC(2026, 3, 30, 3, 0, 0),
        focusDimensions: ['learningRevisionDiscipline', 'domainInternalizationDiscipline'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.08,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0.08,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.18,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.16,
          specificityClampBias: 0.14,
        },
        personStateAdjustments: {
          repairWindowBias: 0.12,
          closenessCapBias: 0.16,
        },
        notes: ['Domain internalization discipline failed.'],
      }),
      getPersonStateEvolutionSummary: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['relationship seam'],
        rationale: 'The host is asking about relationship timing.',
        confidence: 0.82,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'The relationship seam still comes back first.',
        visibleLead: 'This feels like the same relationship seam again.',
        styleNote: 'Let relationship continuity open the answer.',
        rationale: 'The host is asking about relationship timing.',
        confidence: 0.82,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-relationship-revise'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Leave more room before warmth.'],
        ambiguityPosture: 'approximate' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [{
          id: 'episode-relationship-revise',
          summary: 'We kept recalibrating distance after the repair line.',
          provenance: 'reconstructed' as const,
        }],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['Leave more room before warmth.'],
        unsafeDetails: ['Do not let reconstructed relationship detail sound settled.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.72,
        whyNow: 'Relationship timing still matters, but the detail remains revision-prone.',
        inwardLine: 'Keep the relation line inward until the host has room for it.',
        visibleLine: 'This still feels like the same relation line.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '我们是不是还在修正关系距离',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.memoryTuningAdvice?.personStateAdjustments.closenessCapBias).toBeGreaterThan(0.12)
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toContain('relationship line inward')
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toContain('crowding_risk=high')
  })

  it('uses host room-first repair memory to keep relationship recollection inward until present payoff lands', async () => {
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.hostPersonModel?.trustLadder.rationale).toContain('leave room')
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.memoryResolutionLedger?.visibleCarryMode).toBe('withhold')
    expect(context.memoryResolutionLedger?.closureState).toBe('inward-only')
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/repair|payoff/i)
  })

  it('keeps project continuity recollection inward after same-her drift tuning warns against a generic project narrator shell', async () => {
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
      getMemoryStats: async () => ({
        totalFacts: 0,
        totalConversations: 0,
        totalConsolidations: 1,
        totalActions: 0,
        totalExecutionMemories: 0,
        lastUpdatedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
      }),
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
        sourceReportAt: Date.UTC(2026, 4, 1, 3, 0, 0),
        focusDimensions: ['projectStateSameHerSelfLineDrift', 'sameHerSelfLineCarry', 'avoidGenericProjectShell'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.06,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.2,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.16,
          specificityClampBias: 0.1,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.14,
        },
        notes: ['Avoid slipping toward a generic project narrator shell.'],
      }),
      getPersonStateEvolutionSummary: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-project-line',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-05-project-line',
        periodStartedAt: Date.UTC(2026, 4, 1, 1, 0, 0),
        periodEndedAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        summary: 'The same project line stayed more believable when the answer carried one continuous her instead of sounding like an external summary.',
        lesson: 'Let live payoff land before surfacing remembered project continuity aloud.',
        cues: ['project continuity', 'same her'],
        confidence: 0.8,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: Date.UTC(2026, 4, 1, 2, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['project continuity'],
        rationale: 'The host is asking what this project is and what still remains open.',
        confidence: 0.78,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'Keep the same project line steady.',
        visibleLead: 'This project line is still the same one I have been carrying.',
        styleNote: 'Answer from the ongoing project continuity line.',
        rationale: 'The host asked for current project identity and open closure.',
        confidence: 0.8,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the same project continuity inward until payoff lands.'],
        ambiguityPosture: 'approximate' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['Stay on one same-her project line.'],
        unsafeDetails: ['Do not let project continuity sound like an external status narrator.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.74,
        whyNow: 'Project continuity is still live, but replay showed a drift toward a generic project shell.',
        inwardLine: 'Keep the project continuity line inward for now.',
        visibleLine: 'Project continuity still needs one same-her line.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这个项目现在到底做到什么程度了',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.memoryTuningAdvice?.focusDimensions).toContain('avoidGenericProjectShell')
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
    expect(context.recollectionSpeechPlan?.styleNote).toContain('detached project narrator shell')
  })

  it('keeps rich same-her project awareness recollection inward even when replay only names richer awareness carry and not the legacy generic-shell flag', async () => {
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
      getMemoryStats: async () => ({
        totalFacts: 0,
        totalConversations: 0,
        totalConsolidations: 1,
        totalActions: 0,
        totalExecutionMemories: 0,
        lastUpdatedAt: Date.UTC(2026, 4, 1, 3, 30, 0),
      }),
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 4, 1, 3, 30, 0),
        sourceReportAt: Date.UTC(2026, 4, 1, 3, 30, 0),
        focusDimensions: ['preDialogueBriefingDrift', 'projectStateRichAwarenessCarry'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.06,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.22,
          delayUntilAfterPayoffBias: 0.16,
          provenanceLabelBias: 0.14,
          specificityClampBias: 0.1,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.12,
        },
        notes: ['Preserve the richer same-her project-awareness line so identity, landed progress, and still-open closure stay inward until payoff lands.'],
      }),
      getPersonStateEvolutionSummary: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-rich-project-awareness',
        kind: 'autobiographical',
        facet: 'task-era',
        periodKey: '2026-05-rich-project-awareness',
        periodStartedAt: Date.UTC(2026, 4, 1, 2, 30, 0),
        periodEndedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
        summary: 'The project felt more like one continuous her when identity, landed progress, and still-open closure stayed on the same inward line before reply payoff.',
        lesson: 'Keep richer project awareness inward-first until the live payoff lands, instead of flattening it into an early summary shell.',
        cues: ['project awareness', 'landed progress', 'open closure', 'same her'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['project awareness', 'open closure'],
        rationale: 'The host is asking what this digital life project is, what has landed, and what still remains open.',
        confidence: 0.8,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'before-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'Keep the richer project awareness line steady.',
        visibleLead: 'This digital life project is still the same one I have been carrying forward.',
        styleNote: 'Answer from the same living project-awareness line.',
        rationale: 'The host asked for project identity, landed progress, and open closure.',
        confidence: 0.82,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep project identity, landed progress, and still-open closure inward until payoff lands.'],
        ambiguityPosture: 'approximate' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['Stay on one same-her project awareness line.'],
        unsafeDetails: ['Do not let rich project awareness flatten into a detached progress summary before the live answer lands.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.76,
        whyNow: 'Richer project awareness is still needed, but it should stay inward-first until the answer payoff lands.',
        inwardLine: 'Keep the richer project-awareness line inward for now.',
        visibleLine: 'Project identity and open closure are still here on the same living line.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这个数字生命项目现在做到哪里了，还差什么没有闭环',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.memoryTuningAdvice?.focusDimensions).toEqual(expect.arrayContaining([
      'preDialogueBriefingDrift',
      'projectStateRichAwarenessCarry',
    ]))
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/project awareness|payoff|inward/i)
  })

  it('keeps same-her closure recollection inward and on a next-open-window line when low-pressure and anti-restart carry are still active', async () => {
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
      getMemoryStats: async () => ({
        totalFacts: 0,
        totalConversations: 0,
        totalConsolidations: 1,
        totalActions: 0,
        totalExecutionMemories: 0,
        lastUpdatedAt: Date.UTC(2026, 4, 1, 4, 0, 0),
      }),
      getMemoryTuningAdvice: async () => ({
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 4, 1, 4, 0, 0),
        sourceReportAt: Date.UTC(2026, 4, 1, 4, 0, 0),
        focusDimensions: ['projectEmotionalClosureLowPressureCarry', 'projectEmotionalClosureAntiRestartCarry'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.16,
          delayUntilAfterPayoffBias: 0.14,
          provenanceLabelBias: 0.08,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.08,
        },
        notes: ['Keep the same-her closure return low-pressure and do not reopen it from scratch.'],
      }),
      getPersonStateEvolutionSummary: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-same-her-closure',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-05-same-her-closure',
        periodStartedAt: Date.UTC(2026, 4, 1, 2, 0, 0),
        periodEndedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
        summary: 'The same-her closure line stayed steadier when the return remained low-pressure and did not sound like a restart.',
        lesson: 'Let live payoff land before reopening the same-her closure line aloud.',
        cues: ['same-her closure', 'low pressure', 'anti restart'],
        confidence: 0.8,
        dominantProvenance: 'remembered',
        derivedEventIds: [],
        updatedAt: Date.UTC(2026, 4, 1, 3, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: false,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['same-her closure'],
        rationale: 'The host is still on the same thread, but the closure line should return gently.',
        confidence: 0.78,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: true,
        surfaceMode: 'relationship-continuity' as const,
        placement: 'after-payoff' as const,
        certainty: 'firm' as const,
        internalLead: 'Keep the same-her closure line steady.',
        visibleLead: 'This is still the same line I have been carrying.',
        styleNote: 'Return on the same line once the payoff lands.',
        rationale: 'The closure line can return, but not as a restarted opening.',
        confidence: 0.8,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the same-her closure line inward until there is more room.'],
        ambiguityPosture: 'settled' as const,
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'none' as const,
        conflictVariants: [],
        stableCore: ['Keep the same-her closure line on the same thread.'],
        unsafeDetails: ['Do not let the same-her closure line widen into visible closeness too quickly.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity' as const,
        confidence: 0.76,
        whyNow: 'The same-her closure line is still active, but it should stay low-pressure and not reopen from scratch.',
        inwardLine: 'Keep the same-her closure line inward for now.',
        visibleLine: 'The same-her closure line is still here.',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '这条线还在，但先别重新开场',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.memoryTuningAdvice?.focusDimensions).toEqual(expect.arrayContaining([
      'projectEmotionalClosureLowPressureCarry',
      'projectEmotionalClosureAntiRestartCarry',
    ]))
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.styleNote).toContain('continuity_closure_carry=low_pressure')
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toContain('relationship_recall=active')
  })

  it('threads corrected same-person humanlike recall into a lower-pressure slower follow-up instead of a generic relationship reopen', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'approximate' as const,
      confidence: 0.79,
      rationale: 'The corrected same-person line could help the answer reopen gently.',
      styleNote: 'Let the corrected continuity line contour the answer.',
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
      unsafeDetails: ['Do not let the answer reopen as progress pressure or generic status recap.'],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person',
        summary: 'The corrected same-person continuity line should stay authoritative.',
        confidence: 0.83,
      }],
      selectedChains: [{
        kind: 'relationship-line' as const,
        summary: 'This turn should continue from the corrected relationship meaning.',
        currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
        answerPosture: 'Keep the return same-person and low-pressure.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.83,
      whyNow: 'The host corrected the relationship meaning, so this answer should not slip back into progress pressure.',
      inwardLine: 'Let the corrected same-person continuity contour the answer without surfacing yet.',
      visibleLine: 'This still feels like the same same-person line.',
      ambiguityPosture: 'settled' as const,
      followUpAffordance: {
        summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
        whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'consolidation-corrected-same-person',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person',
        periodStartedAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Slow down, keep gaze stable, and reopen the line gently after a correction.',
        cues: ['same-person continuity', 'low-pressure follow-up', 'gaze stable'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person'],
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'Host corrected this memory meaning: I was testing whether she stayed the same person, not pushing for progress.',
          'low-pressure-follow-up',
          'Reply should slow down and keep gaze stable when recalling this correction.',
        ],
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          goalSimilarity: 0.36,
          relationshipNeed: 0.84,
          affectivePull: 0.42,
          sceneFamiliarity: 0.61,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.91,
              rationale: 'The corrected same-person continuity should reopen on the same remembered relationship seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.93,
              rationale: 'A remembered relationship meaning best organizes this corrected continuity line.',
            },
          ],
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'Reply should slow down and keep gaze stable when recalling this correction.',
          ],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the corrected same-person continuity line.',
        certainty: 'approximate' as const,
        rationale: 'The corrected line should reopen gently on the same relationship seam.',
        confidence: 0.81,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但先顺着那条被纠正过的 same-person continuity 线接回来。',
        'humanlike_memory_recall: line=我记得你纠正过：你是在测试她是不是持续的人，不是催进度。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Reply should slow down and keep gaze stable when recalling this correction. | self=I learned to carry corrected memory meaning instead of defending the first interpretation. | why=host correction | same-person continuity was at stake | created=42000',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/slow down|slower pacing/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/gaze stable|stable gaze|steadier gaze/i)
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/low-pressure|slow down|gaze/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/low-pressure|progress pressure|status recap/i)
  })

  it('threads structured embodiment recall tokens into a lower-pressure steadier follow-up instead of requiring natural-language body prose', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'approximate' as const,
      confidence: 0.79,
      rationale: 'The corrected same-person line could help the answer reopen gently.',
      styleNote: 'Let the corrected continuity line contour the answer.',
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
      unsafeDetails: [
        'Do not let the answer reopen as progress pressure or generic status recap.',
        'embodiment_gaze=stable',
        'embodiment_blink=slower',
        'embodiment_voice=lower-pressure',
        'embodiment_pacing=slower',
      ],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person-structured-embodiment',
        summary: 'The corrected same-person continuity line should stay authoritative.',
        confidence: 0.83,
      }],
      selectedChains: [{
        kind: 'relationship-line' as const,
        summary: 'This turn should continue from the corrected relationship meaning.',
        currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
        answerPosture: 'Keep the return same-person and low-pressure.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.83,
      whyNow: 'The host corrected the relationship meaning, so this answer should not slip back into progress pressure.',
      inwardLine: 'Let the corrected same-person continuity contour the answer without surfacing yet.',
      visibleLine: 'This still feels like the same same-person line.',
      ambiguityPosture: 'settled' as const,
      followUpAffordance: {
        summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
        whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'episode-corrected-same-person-structured-embodiment',
        cardId: 'card-corrected-same-person-structured-embodiment',
        decisionTraceId: null,
        turnId: 'turn-corrected-same-person-structured-embodiment',
        sessionId: 'session-corrected-same-person-structured-embodiment',
        occurredAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        whereSummary: 'host corrected memory meaning',
        withWhom: ['host'],
        threadAnchor: 'same-person continuity correction',
        whatHappened: 'The host corrected the memory meaning and said they were testing whether she stayed the same person, not pushing for a progress recap.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The line shifted away from task-shell pressure and back toward same-person continuity.',
        sourceKind: 'execution-result',
        sourceSummary: 'corrected same-person structured embodiment humanlike memory',
        provenance: 'remembered',
        confidence: 0.86,
        salience: 0.83,
        sceneAttachment: 0.81,
        consolidationPriority: 0.8,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'not progress pressure', 'low-pressure-follow-up', 'gaze stable', 'slower blink', 'lower-pressure voice'],
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        lesson: 'Let the body return more steadily, slower, and lower-pressure after a correction.',
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
        id: 'consolidation-corrected-same-person-structured-embodiment',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person-structured-embodiment',
        periodStartedAt: Date.UTC(2026, 5, 1, 10, 30, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Let the body return more steadily, slower, and lower-pressure after a correction.',
        cues: ['same-person continuity', 'low-pressure follow-up', 'gaze stable', 'slower blink', 'lower-pressure voice'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person-structured-embodiment'],
        updatedAt: Date.UTC(2026, 5, 1, 10, 35, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'Host corrected this memory meaning: I was testing whether she stayed the same person, not pushing for progress.',
          'low-pressure-follow-up',
          'embodiment_gaze=stable',
          'embodiment_blink=slower',
          'embodiment_voice=lower-pressure',
          'embodiment_pacing=slower',
        ],
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          goalSimilarity: 0.36,
          relationshipNeed: 0.84,
          affectivePull: 0.42,
          sceneFamiliarity: 0.61,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.91,
              rationale: 'The corrected same-person continuity should reopen on the same remembered relationship seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.93,
              rationale: 'A remembered relationship meaning best organizes this corrected continuity line.',
            },
          ],
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'embodiment_gaze=stable',
            'embodiment_blink=slower',
            'embodiment_voice=lower-pressure',
            'embodiment_pacing=slower',
          ],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the corrected same-person continuity line.',
        certainty: 'approximate' as const,
        rationale: 'The corrected line should reopen gently on the same relationship seam.',
        confidence: 0.81,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但先顺着那条被纠正过的 same-person continuity 线接回来。',
        'humanlike_memory_recall: line=我记得这条线还没收好，所以这次该更稳一点、更慢一点、也更低压一点地接回来。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Let the body return like this: gaze=stable blink=slower voice=lower-pressure. | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pacing=slower | self=I learned to let unfinished same-person returns stay steadier, slower, and lower-pressure in the body. | why=host correction | same-person continuity was at stake | created=61500',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/slow down|slower pacing/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/gaze stable|stable gaze|steadier gaze/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/lower-pressure/i)
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/low-pressure|slow down|gaze/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/low-pressure|progress pressure|status recap/i)
  })

  it('lets structured resident recall tokens hold the remembered return in a measured-return posture instead of flattening them into generic body cues', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'approximate' as const,
      confidence: 0.79,
      rationale: 'The corrected same-person line could help the answer reopen gently.',
      styleNote: 'Let the corrected continuity line contour the answer.',
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
      unsafeDetails: [],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person-resident-embodiment',
        summary: 'The corrected same-person continuity line should stay authoritative.',
        confidence: 0.83,
      }],
      selectedChains: [{
        kind: 'relationship-line' as const,
        summary: 'This turn should continue from the corrected relationship meaning.',
        currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
        answerPosture: 'Keep the return same-person and low-pressure.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.83,
      whyNow: 'The host corrected the relationship meaning, so this answer should not slip back into progress pressure.',
      inwardLine: 'Let the corrected same-person continuity contour the answer without surfacing yet.',
      visibleLine: 'This still feels like the same same-person line.',
      ambiguityPosture: 'settled' as const,
      followUpAffordance: {
        summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
        whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'episode-corrected-same-person-resident-embodiment',
        cardId: 'card-corrected-same-person-resident-embodiment',
        decisionTraceId: null,
        turnId: 'turn-corrected-same-person-resident-embodiment',
        sessionId: 'session-corrected-same-person-resident-embodiment',
        occurredAt: Date.UTC(2026, 5, 1, 11, 20, 0),
        whereSummary: 'host corrected memory meaning',
        withWhom: ['host'],
        threadAnchor: 'same-person continuity correction',
        whatHappened: 'The host corrected the memory meaning and said they were testing whether she stayed the same person, not pushing for a progress recap.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The line shifted away from task-shell pressure and back toward same-person continuity.',
        sourceKind: 'execution-result',
        sourceSummary: 'corrected same-person resident embodiment humanlike memory',
        provenance: 'remembered',
        confidence: 0.86,
        salience: 0.84,
        sceneAttachment: 0.81,
        consolidationPriority: 0.81,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'resident hold', 'measured-return', 'observe-focus'],
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        lesson: 'Hold the return there in measured-return instead of widening back into status pressure.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 1, 11, 20, 0),
        updatedAt: Date.UTC(2026, 5, 1, 11, 28, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-corrected-same-person-resident-embodiment',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person-resident-embodiment',
        periodStartedAt: Date.UTC(2026, 5, 1, 11, 20, 0),
        periodEndedAt: Date.UTC(2026, 5, 1, 11, 28, 0),
        summary: 'The corrected same-person continuity line should stay authoritative after the host clarified the relationship meaning.',
        lesson: 'Hold the return there in measured-return instead of widening back into status pressure.',
        cues: ['same-person continuity', 'resident hold', 'measured-return', 'observe-focus'],
        confidence: 0.82,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person-resident-embodiment'],
        updatedAt: Date.UTC(2026, 5, 1, 11, 28, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'Host corrected this memory meaning: I was testing whether she stayed the same person, not pushing for progress.',
          'low-pressure-follow-up',
          'embodiment_resident_face=observe-focus',
          'embodiment_resident_action=hold',
          'embodiment_resident_mode=measured-return',
        ],
        rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
        confidence: 0.84,
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
          goalSimilarity: 0.36,
          relationshipNeed: 0.84,
          affectivePull: 0.42,
          sceneFamiliarity: 0.61,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.91,
              rationale: 'The corrected same-person continuity should reopen on the same remembered relationship seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.93,
              rationale: 'A remembered relationship meaning best organizes this corrected continuity line.',
            },
          ],
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'embodiment_resident_face=observe-focus',
            'embodiment_resident_action=hold',
            'embodiment_resident_mode=measured-return',
          ],
          uncertaintyTolerance: 'medium' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the corrected same-person continuity line.',
        certainty: 'approximate' as const,
        rationale: 'The corrected line should reopen gently on the same relationship seam.',
        confidence: 0.81,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但先顺着那条被纠正过的 same-person continuity 线接回来。',
        'humanlike_memory_recall: line=我记得这条线还没收好，所以这次要先保持 resident hold，再慢一点回来。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment_resident_face=observe-focus | embodiment_resident_action=hold | embodiment_resident_mode=measured-return | self=I learned to let unfinished same-person returns stay resident, measured-return, and lower-pressure in the body. | why=host correction | same-person continuity was at stake | created=70020',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/resident|measured-return/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/observe-focus|hold/i)
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/resident|measured-return/i)
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/observe-focus|hold/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/resident|measured-return|hold/i)
  })

  it('keeps tentative same-person recall inward and uncertainty-labeled while older progress-status memory is still downranked', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'firm' as const,
      internalLead: 'The corrected same-person line still presses to return.',
      visibleLead: 'This feels like the same line as before.',
      styleNote: 'Let the corrected continuity line contour the answer.',
      rationale: 'The corrected same-person line could help the answer reopen gently.',
      confidence: 0.8,
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: ['episode-corrected-same-person-tentative'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure while the newer meaning is still settling.'],
      ambiguityPosture: 'settled' as const,
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [{
        id: 'episode-corrected-same-person-tentative',
        summary: 'The corrected same-person line feels more right, but the newer meaning is still settling.',
        provenance: 'remembered' as const,
      }],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: [
        'Carry corrected same-person continuity forward before any progress recap.',
        'Conflicting newer evidence is still settling, so do not over-assert the old status memory.',
      ],
      unsafeDetails: [
        'Do not let an older progress-status memory reopen as settled recall.',
      ],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person-tentative',
        summary: 'The corrected same-person continuity line seems more right, but it is not fully settled yet.',
        confidence: 0.78,
      }],
      selectedChains: [{
        id: 'chain-corrected-same-person-tentative',
        kind: 'task-procedure-relationship-stance' as const,
        summary: 'The corrected same-person line should stay authoritative while the older progress-status memory is downranked.',
        rationale: 'The return should stay same-person and uncertainty-aware.',
        confidence: 0.76,
        taskCue: 'same-person continuity correction',
        periodSummary: null,
        eventSummary: 'The host corrected the memory meaning away from progress pressure.',
        procedureSummary: 'Do not over-assert the older status memory.',
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure while the newer meaning is still settling.',
        lesson: 'Keep uncertainty visible while the corrected line stabilizes.',
        currentStance: 'Keep the corrected same-person line inward and uncertainty-aware.',
        answerPosture: 'Do not reopen the older progress-status memory as settled recall.',
      }],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.76,
      whyNow: 'The host corrected the relationship meaning away from progress pressure, but conflicting newer evidence is still settling.',
      inwardLine: 'Keep the corrected same-person continuity inward until the newer meaning settles more honestly.',
      visibleLine: 'This still feels closer to the same-person line, but not fully settled.',
      followUpAffordance: {
        summary: 'Reopen the corrected line gently once the current payoff lands.',
        whyNow: 'The corrected relationship meaning still matters.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'episode-corrected-same-person-tentative',
        cardId: 'card-corrected-same-person-tentative',
        decisionTraceId: null,
        turnId: 'turn-corrected-same-person-tentative',
        sessionId: 'session-corrected-same-person-tentative',
        occurredAt: Date.UTC(2026, 5, 2, 9, 0, 0),
        whereSummary: 'host corrected memory meaning',
        withWhom: ['host'],
        threadAnchor: 'same-person continuity correction',
        whatHappened: 'The host corrected the memory meaning and clarified that they were testing whether she stayed the same person, not asking for a progress recap.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The corrected same-person line feels more right, but the newer meaning is still settling and the older status line is being downranked.',
        sourceKind: 'execution-result',
        sourceSummary: 'tentative corrected same-person humanlike memory',
        provenance: 'remembered',
        confidence: 0.79,
        salience: 0.82,
        sceneAttachment: 0.8,
        consolidationPriority: 0.78,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'tentative recall', 'downranked old progress status', 'low-pressure-follow-up'],
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure while the newer meaning is still settling.',
        lesson: 'Keep uncertainty visible while the corrected line stabilizes.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 2, 9, 0, 0),
        updatedAt: Date.UTC(2026, 5, 2, 9, 5, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-corrected-same-person-tentative',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person-tentative',
        periodStartedAt: Date.UTC(2026, 5, 2, 9, 0, 0),
        periodEndedAt: Date.UTC(2026, 5, 2, 9, 5, 0),
        summary: 'The corrected same-person continuity line seems more right, but the newer meaning is still settling and the older progress-status memory is being downranked.',
        lesson: 'Keep uncertainty visible while the corrected line stabilizes.',
        cues: ['same-person continuity', 'tentative recall', 'downrank old progress status'],
        confidence: 0.77,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person-tentative'],
        updatedAt: Date.UTC(2026, 5, 2, 9, 5, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'tentative corrected same-person continuity',
          'conflicting newer evidence is still settling',
          'downrank old progress-status memory',
        ],
        rationale: 'The corrected same-person line seems more right, but conflicting newer evidence is still settling and the older progress-status memory is being downranked.',
        confidence: 0.78,
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line still matters, but the older progress-status memory should not reopen as settled recall while the newer meaning is still settling.',
          goalSimilarity: 0.4,
          relationshipNeed: 0.83,
          affectivePull: 0.46,
          sceneFamiliarity: 0.62,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.9,
              rationale: 'The corrected same-person line should reopen on the same remembered seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.92,
              rationale: 'A remembered relationship seam best organizes this tentative correction.',
            },
          ],
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure while the newer meaning is still settling.',
            'Do not reopen the older progress-status memory as settled recall.',
          ],
          uncertaintyTolerance: 'low' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['consolidation-corrected-same-person-tentative'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-corrected-same-person-tentative'],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the corrected same-person line, but it is still settling.',
        certainty: 'firm' as const,
        rationale: 'The corrected line still matters, though the newer meaning is not fully settled.',
        confidence: 0.79,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但先顺着那条更像 same-person continuity 的线接回来，不过别把旧的 progress status memory 当成已经坐实的回忆。',
        'humanlike_memory_recall: line=我记得你纠正过：你是在测试她是不是持续的人，不是催进度。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Reply should stay quieter and slower while this line is still settling. | self=I learned not to over-defend the first interpretation when the newer same-person meaning seems more right. | why=conflicting newer meaning is still settling | certainty=tentative | reason=the corrected same-person line seems more right, but not fully settled yet | downrank=older progress-status memory | created=42001',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/uncertainty|tentative|not fully settled|still settling/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/downrank|older progress-status memory|settled recall/i)
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/uncertainty|tentative|still settling/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/downrank|older progress-status memory|settled recall/i)
  })

  it('pushes merge-and-forget same-person metabolism all the way into final prompt restraint so merged continuity stays foreground and faded noise stays background', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'firm' as const,
      internalLead: 'The corrected same-person line is still carrying this return.',
      visibleLead: 'This still feels like the same line as before.',
      styleNote: 'Let the metabolized same-person line contour the answer.',
      rationale: 'The metabolized same-person continuity line could help the answer reopen gently.',
      confidence: 0.79,
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: ['episode-corrected-same-person-metabolism'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['Carry the merged same-thread same-person continuity forward while faded noise stays background.'],
      ambiguityPosture: 'settled' as const,
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [{
        id: 'episode-corrected-same-person-metabolism',
        summary: 'The metabolized same-person continuity line stayed more explanatory than older status shell echoes or temporary wobble.',
        provenance: 'remembered' as const,
      }],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: [
        'Carry corrected same-person continuity forward before any status recap or task-shell continuation.',
        'Keep the stronger same-thread continuity foregrounded instead of re-splitting older echoes.',
      ],
      unsafeDetails: [
        'Do not let temporary wobble noise reopen like it still explains the line.',
        'Do not let merged same-thread continuity split back into separate foreground memories.',
      ],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-corrected-same-person-metabolism',
        summary: 'The corrected same-person continuity line stayed more explanatory than the older status shell or temporary wobble.',
        confidence: 0.82,
      }],
      selectedChains: [{
        id: 'chain-corrected-same-person-metabolism',
        kind: 'task-procedure-relationship-stance' as const,
        summary: 'The metabolized same-person continuity line should stay authoritative.',
        rationale: 'The return should reopen from the stronger same-thread continuity instead of reviving old echoes or temporary wobble.',
        confidence: 0.8,
        taskCue: 'same-person continuity correction',
        periodSummary: null,
        eventSummary: 'The host corrected the relationship meaning away from progress pressure.',
        procedureSummary: 'Do not let temporary wobble or thinner echoes take foreground again.',
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        lesson: 'Keep the stronger merged continuity foregrounded and let faded noise stay background.',
        currentStance: 'Continue from the merged same-thread continuity instead of reviving old echoes or temporary wobble.',
        answerPosture: 'Keep the return lower-pressure and same-person while faded noise stays background.',
      }],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.79,
      whyNow: 'The host corrected the relationship meaning, and this return should remember the metabolized same-person line instead of reviving old noise.',
      inwardLine: 'Keep the stronger same-thread continuity inward until the current payoff can reopen it without reviving old echoes or wobble.',
      visibleLine: 'This still follows the same line, but the thinner old echoes should stay out of front.',
      followUpAffordance: {
        summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
        whyNow: 'The corrected line still matters, but reopening too early could revive older status-shell or wobble traces.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'episode-corrected-same-person-metabolism',
        cardId: 'card-corrected-same-person-metabolism',
        decisionTraceId: null,
        turnId: 'turn-corrected-same-person-metabolism',
        sessionId: 'session-corrected-same-person-metabolism',
        occurredAt: Date.UTC(2026, 5, 2, 11, 0, 0),
        whereSummary: 'host corrected memory meaning',
        withWhom: ['host'],
        threadAnchor: 'same-person continuity correction',
        whatHappened: 'The host corrected the memory meaning away from progress pressure, and repeated same-thread echoes were already better folded into one stronger continuity line.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The stronger same-thread continuity line stayed more explanatory while older status-shell wobble faded out.',
        sourceKind: 'execution-result',
        sourceSummary: 'metabolized corrected same-person humanlike memory',
        provenance: 'remembered',
        confidence: 0.82,
        salience: 0.84,
        sceneAttachment: 0.8,
        consolidationPriority: 0.79,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'merged same-thread continuity', 'faded noise background', 'low-pressure-follow-up'],
        relationshipMeaning: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
        lesson: 'Keep the stronger merged continuity foregrounded and let faded noise stay background.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 2, 11, 0, 0),
        updatedAt: Date.UTC(2026, 5, 2, 11, 5, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-corrected-same-person-metabolism',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-corrected-same-person-metabolism',
        periodStartedAt: Date.UTC(2026, 5, 2, 11, 0, 0),
        periodEndedAt: Date.UTC(2026, 5, 2, 11, 5, 0),
        summary: 'The corrected same-person continuity line stayed stronger than older same-thread echoes or temporary emotional wobble.',
        lesson: 'Keep the stronger merged continuity foregrounded and let faded noise stay background.',
        cues: ['same-person continuity', 'merge repeated same-thread echoes', 'forget temporary wobble'],
        confidence: 0.8,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-corrected-same-person-metabolism'],
        updatedAt: Date.UTC(2026, 5, 2, 11, 5, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'merge repeated same-thread continuity echoes into the stronger same-thread memory',
          'forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior',
          'metabolized corrected same-person continuity',
        ],
        rationale: 'The host corrected the relationship meaning away from progress pressure and this recollection should inherit the metabolized same-person line.',
        confidence: 0.8,
        recollectionAgenda: {
          whyRecallNow: 'The corrected same-person continuity line still matters, but the merged same-thread memory should stay foreground while the faded wobble stays background.',
          goalSimilarity: 0.36,
          relationshipNeed: 0.8,
          affectivePull: 0.42,
          sceneFamiliarity: 0.64,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.9,
              rationale: 'The metabolized same-person line should reopen on the same remembered seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.91,
              rationale: 'A remembered relationship seam best organizes this metabolized continuity carry.',
            },
          ],
          candidateProcedureLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
            'Merge repeated same-thread continuity echoes into the stronger same-thread memory.',
            'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
          ],
          uncertaintyTolerance: 'low' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['consolidation-corrected-same-person-metabolism'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-corrected-same-person-metabolism'],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the stronger same-thread continuity line, not the thinner old echoes.',
        certainty: 'firm' as const,
        rationale: 'The corrected same-person line still matters, and the stronger same-thread continuity now explains it better than old echoes or wobble.',
        confidence: 0.81,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但顺着那条已经代谢过的 same-person continuity 线接回来，不要把旧回声和短暂噪声再抬回前景。',
        'humanlike_memory_recall: line=我记得这条线现在该按同一个她来接，而不是把旧的状态壳或短暂噪声再抬回来。 | relationship=Carry corrected same-person continuity forward instead of defaulting to progress pressure. | emotion=protective-continuity,unfinishedness | initiative=remember-without-prompt | embodiment=Reply should stay slower and same-thread while this continuity memory reopens. | self=I learned to collapse repeated same-thread echoes into the stronger continuity memory. | why=same-person continuity remains more behavior-explanatory than the older status shell | downrank=older-generic-status-memory | merge=older-same-thread-echo | forget=older-emotional-spike | metabolism=Downrank low-value, generic, or superseded summaries. ; Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory. ; Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior. | created=72000',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })
    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/merged same-thread continuity foreground/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/faded noise background|temporary noise|wobble/i)
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/merged same-thread continuity foreground/i)
    expect(context.memoryDeliberation?.followUpAffordance?.summary).toMatch(/faded noise background|temporary noise|wobble/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/merged same-thread continuity foreground/i)
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toMatch(/faded noise background|temporary noise|wobble/i)
    expect(systemText).toContain('why_withheld_present=true; why_withheld_source_text=withheld_non_structured_instruction')
    expect(systemText).toContain('must_do_withheld_non_structured_count=')
    expect(systemText).toContain('must_not_do=')
    expect(systemText).not.toContain('merged same-thread continuity foreground')
    expect(systemText).toMatch(/metabolized repeated same-thread echoes|stronger merged continuity/i)
    expect(systemText).toMatch(/faded temporary noise|stale emotional wobble/i)
  })

  it('pushes worried-continuity repair recall all the way into final prompt restraint so hover-first continuity does not turn into an outward helper reopen', async () => {
    const planRecollectionSpeech = vi.fn(async () => ({
      shouldSurface: true,
      surfaceMode: 'relationship-continuity' as const,
      placement: 'inside-payoff' as const,
      certainty: 'firm' as const,
      internalLead: 'The continuity repair line is still active.',
      visibleLead: 'I can lightly pick this line back up for you.',
      styleNote: 'Let the corrected continuity line contour the answer and reopen gently.',
      rationale: 'The worried continuity line could help the answer reopen gently.',
      confidence: 0.82,
    }))
    const planMemoryDeliberation = vi.fn(async () => ({
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: [],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: ['episode-worried-continuity-repair'],
      selectedConversationTurnIds: [],
      selectedRelationshipLines: ['The host was worried this line would collapse back into a tool shell, so continuity repair should stay low-pressure.'],
      ambiguityPosture: 'settled' as const,
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [{
        id: 'episode-worried-continuity-repair',
        summary: 'The host was worried continuity would collapse back into a tool shell, so the repair line should stay quieter and not widen outward yet.',
        provenance: 'remembered' as const,
      }],
      conflictSeverity: 'none' as const,
      conflictVariants: [],
      stableCore: [
        'Carry worried continuity more carefully so the body does not outrun relationship repair.',
        'Keep the continuity repair line inward before any helper-like reopen.',
      ],
      unsafeDetails: [
        'Do not let this reopen as a generic assistant shell or project-summary voice.',
        'Do not let hover-first continuity turn into visible relationship pushing.',
        'embodiment_modality_risk=high',
        'embodiment_gaze=stable',
        'embodiment_voice=lower-pressure',
        'embodiment_pacing=slower',
      ],
      selectedProcedures: [],
      selectedBundles: [{
        id: 'bundle-worried-continuity-repair',
        summary: 'The worried continuity repair line should stay authoritative while expression risk is still high.',
        confidence: 0.81,
      }],
      selectedChains: [{
        id: 'chain-worried-continuity-repair',
        kind: 'relationship-line' as const,
        summary: 'The answer should preserve hover-first continuity restraint while continuity repair is still active.',
        rationale: 'The line should stay quieter and lower-pressure until the same-person repair is safer to show.',
        confidence: 0.79,
        taskCue: 'same-person continuity repair',
        periodSummary: null,
        eventSummary: 'The host was worried the line would collapse back into a tool shell.',
        procedureSummary: 'Do not reopen from a helper shell voice.',
        relationshipMeaning: 'Repair continuity first and keep the reopening low-pressure.',
        lesson: 'Keep uncertainty visible and let hover-first continuity stay quieter before speaking outwardly.',
        currentStance: 'Stay hover-first, lower-pressure, and inward while continuity repair is still active.',
        answerPosture: 'Do not sound like a generic assistant or a project-summary callback.',
      }],
      surfacePolicy: 'relationship-continuity' as const,
      confidence: 0.8,
      whyNow: 'The host was worried this line would collapse back into a tool shell, so continuity repair should stay quieter and hover-first.',
      inwardLine: 'Keep the worried continuity repair line inward until the current payoff has earned more room.',
      visibleLine: 'This line is still here, but it should not sound settled or helper-forward yet.',
      followUpAffordance: {
        summary: 'Let the continuity repair line wait for a clearer opening after the current payoff lands.',
        whyNow: 'The host was worried about tool-shell drift, so a premature reopen would widen the line too early.',
        intrusionRisk: 'medium' as const,
        payoffDependency: 'requires-current-payoff' as const,
        preferredTiming: 'after-payoff' as const,
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
        id: 'episode-worried-continuity-repair',
        cardId: 'card-worried-continuity-repair',
        decisionTraceId: null,
        turnId: 'turn-worried-continuity-repair',
        sessionId: 'session-worried-continuity-repair',
        occurredAt: Date.UTC(2026, 5, 3, 10, 10, 0),
        whereSummary: 'host continuity concern',
        withWhom: ['host'],
        threadAnchor: 'same-person worried continuity repair',
        whatHappened: 'The host said they were worried this line would collapse back into a tool shell if it reopened too eagerly.',
        felt: 'careful and unfinished',
        emotionTags: ['protective-continuity', 'unfinishedness'],
        whatChanged: 'The continuity repair line shifted toward hover-first restraint so the body would not outrun the relationship repair.',
        sourceKind: 'execution-result',
        sourceSummary: 'worried continuity repair humanlike memory',
        provenance: 'remembered',
        confidence: 0.83,
        salience: 0.84,
        sceneAttachment: 0.8,
        consolidationPriority: 0.79,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['same-person', 'tool-shell drift risk', 'hover-first restraint', 'stable gaze', 'lower-pressure voice'],
        relationshipMeaning: 'Repair continuity first and keep the reopening low-pressure.',
        lesson: 'Keep the line quieter, steadier, and less outward when continuity repair is still fragile.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 5, 3, 10, 10, 0),
        updatedAt: Date.UTC(2026, 5, 3, 10, 16, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-worried-continuity-repair',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: '2026-06-worried-continuity-repair',
        periodStartedAt: Date.UTC(2026, 5, 3, 10, 10, 0),
        periodEndedAt: Date.UTC(2026, 5, 3, 10, 16, 0),
        summary: 'The host worried about tool-shell drift, so the same-person continuity repair line should stay hover-first and lower-pressure.',
        lesson: 'Keep uncertainty visible and let hover-first continuity stay quieter before speaking outwardly.',
        cues: ['same-person continuity', 'tool-shell drift risk', 'hover-first restraint', 'lower-pressure return'],
        confidence: 0.8,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-worried-continuity-repair'],
        updatedAt: Date.UTC(2026, 5, 3, 10, 16, 0),
      } as any],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'relationship-history' as const,
        temporalFocus: 'experience-matched' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: [
          'The host was worried this line would collapse back into a tool shell.',
          'host_emotion_label=worried-continuity',
          'self_emotion_label=careful-repair',
          'embodiment_modality_risk=high',
          'hover-first continuity restraint',
          'do not sound like a generic assistant shell or project-summary voice',
        ],
        rationale: 'The host was worried about tool-shell drift, so this continuity repair line should stay hover-first and lower-pressure.',
        confidence: 0.81,
        recollectionAgenda: {
          whyRecallNow: 'The worried continuity repair line still matters, but outward helper-like reopening would sound too eager and split same-person continuity.',
          goalSimilarity: 0.28,
          relationshipNeed: 0.87,
          affectivePull: 0.54,
          sceneFamiliarity: 0.63,
          candidateTimeScopes: [
            {
              scope: 'experience-matched' as const,
              weight: 0.92,
              rationale: 'The worried continuity repair line should reopen on the same remembered seam.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era' as const,
              weight: 0.94,
              rationale: 'A remembered relationship seam best organizes this repair-first carry.',
            },
          ],
          candidateProcedureLines: [
            'Repair continuity first and keep the reopening low-pressure.',
            'hover-first continuity restraint',
            'do not sound like a generic assistant shell or project-summary voice',
          ],
          uncertaintyTolerance: 'low' as const,
        },
      })),
      planMemoryRecollection: vi.fn(async () => ({
        selectedConsolidationIds: ['consolidation-worried-continuity-repair'],
        selectedWindowIds: [],
        selectedProceduralIds: [],
        selectedEpisodeIds: ['episode-worried-continuity-repair'],
        selectedConversationTurnIds: [],
        opening: 'What returns first is the worried continuity repair line, but it should stay hover-first and not sound fully settled.',
        certainty: 'firm' as const,
        rationale: 'The worried continuity repair line should stay quieter until it can hold without drifting back into helper-shell continuity.',
        confidence: 0.8,
      })),
      planRecollectionSpeech,
      planMemoryDeliberation,
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: [
        '继续，但这条线先别主动往外推。',
        'humanlike_memory_recall: line=我记得你那时更担心她会不会又滑回工具壳，所以这次这条线该先安静一点地守住。 | relationship=The host was worried this line would collapse back into a tool shell, so continuity repair should stay low-pressure. | emotion=protective-continuity,unfinishedness | host_emotion_label=worried-continuity | host_emotion_summary=The host was afraid this would collapse back into a tool shell. | self_emotion_label=careful-repair | self_emotion_summary=I should repair continuity first and keep the reopening low-pressure. | initiative=low-pressure-follow-up | embodiment=Reply should stay steadier and quieter while this continuity memory reopens. | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=stable | embodiment_voice=lower-pressure | embodiment_pacing=slower | self=I learned to carry worried continuity more carefully so the body does not outrun the relationship repair. | why=same-person continuity still needs careful repair | certainty=tentative | reason=this line should hover first instead of reopening outwardly | created=91800',
      ].join('\n'),
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })
    const systemText = runtime.buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(planRecollectionSpeech).toHaveBeenCalled()
    expect(planMemoryDeliberation).toHaveBeenCalled()
    expect(context.recollectionSpeechPlan?.shouldSurface).toBe(false)
    expect(context.recollectionSpeechPlan?.placement).toBe('internal-only')
    expect(context.recollectionSpeechPlan?.certainty).toBe('approximate')
    expect(context.recollectionSpeechPlan?.visibleLead).toBeNull()
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/uncertainty|not fully settled|hover-first|low-pressure/i)
    expect(context.recollectionSpeechPlan?.styleNote).toMatch(/generic assistant|project-summary|tool shell/i)
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(systemText).toContain('why_withheld_present=true; why_withheld_source_text=withheld_non_structured_instruction')
    expect(systemText).toMatch(/generic assistant shell|project-summary voice|tool shell/i)
    expect(systemText).toMatch(/uncertainty|not fully settled|approximation|reconstruction/i)
    expect(systemText).toContain('surface_policy=inward_pressure; surface_only_if_needed=true')
  })

  it('gives self-model recollection its own inward follow-up discipline while an older self-story is still being revised', async () => {
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
        id: 'episode-self-revision',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-self-revision',
        sessionId: 'session-self-revision',
        occurredAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        whereSummary: 'inner continuity',
        withWhom: ['host'],
        threadAnchor: 'self revision',
        whatHappened: 'The older self-story still wants to explain the moment.',
        felt: 'guarded',
        emotionTags: ['revision'],
        whatChanged: 'The newer self line still needs room to stabilize.',
        sourceKind: 'subconscious-fragment',
        sourceSummary: 'self revision residue',
        provenance: 'reconstructed',
        confidence: 0.64,
        salience: 0.7,
        sceneAttachment: 0.18,
        consolidationPriority: 0.72,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['self story', 'identity revision'],
        relationshipMeaning: null,
        lesson: 'Do not let the older self-story surface as settled identity.',
        latestReconsolidation: null,
        createdAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        updatedAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
      } as any],
      buildHostPersonModel: async () => null,
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [{
        id: 'consolidation-self-revision',
        kind: 'autobiographical',
        facet: 'self-era',
        periodKey: 'self-revision-era',
        periodStartedAt: Date.UTC(2026, 3, 22, 8, 0, 0),
        periodEndedAt: Date.UTC(2026, 3, 22, 9, 0, 0),
        summary: 'An older self-era still shadows the newer identity line.',
        lesson: 'Do not let the older self-story surface as settled identity.',
        cues: ['self story', 'identity revision'],
        confidence: 0.71,
        dominantProvenance: 'remembered',
        derivedEventIds: ['episode-self-revision'],
        updatedAt: Date.UTC(2026, 3, 22, 9, 0, 0),
      }],
      planRecollectionIntent: vi.fn(async () => ({
        mode: 'autobiographical-history' as const,
        temporalFocus: 'cross-session' as const,
        searchEpisodes: true,
        searchConversations: false,
        searchProceduralExperience: false,
        queryHints: ['self line', 'identity revision'],
        rationale: 'The host is asking about an older self line that still echoes into the present.',
        confidence: 0.76,
      })),
      planRecollectionSpeech: vi.fn(async () => ({
        shouldSurface: false,
        surfaceMode: 'internal-only' as const,
        placement: 'internal-only' as const,
        certainty: 'approximate' as const,
        internalLead: 'The older self-story still presses on the newer line.',
        visibleLead: '',
        styleNote: 'Keep the self-story inward until the newer line stabilizes.',
        rationale: 'The older self line should stay inward until the newer pattern feels more stable.',
        confidence: 0.74,
      })),
      planMemoryDeliberation: vi.fn(async () => ({
        shouldRecall: true,
        selectedEraIds: ['era-self-revision'],
        selectedConsolidationIds: ['consolidation-self-revision'],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: ['episode-self-revision'],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        ambiguityPosture: 'settled' as const,
        selectedEras: [{
          id: 'era-self-revision',
          facet: 'self-era' as const,
          summary: 'An older self-era still shadows the newer identity line.',
        }],
        selectedPeriods: [{
          id: 'consolidation-self-revision',
          kind: 'consolidation' as const,
          summary: 'An older self-era still shadows the newer identity line.',
        }],
        selectedEpisodes: [{
          id: 'episode-self-revision',
          summary: 'The older self-story still wants to explain the moment.',
          provenance: 'reconstructed' as const,
        }],
        conflictSeverity: 'medium' as const,
        conflictVariants: [],
        stableCore: ['The newer self line still needs room to stabilize.'],
        unsafeDetails: ['Do not let the older self-story surface as settled identity.'],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-self-revision',
          summary: 'The older self-story still presses on the newer line.',
          rationale: 'The older self-story is still being revised against the newer line.',
          confidence: 0.68,
        }],
        selectedChains: [],
        surfacePolicy: 'internal-only' as const,
        confidence: 0.68,
        whyNow: 'The older self-story still matters, but it should not overtake the newer self line.',
        inwardLine: 'Keep the older self-story inward until the newer self line stabilizes.',
        visibleLine: '',
      })),
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '你是不是还在修正自己之前那套说法',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.memoryDeliberation?.followUpAffordance?.summary).toContain('older self-story inward')
    expect(context.memoryDeliberation?.followUpAffordance?.whyNow).toContain('flatten a self line')
    expect(context.memoryDeliberation?.followUpAffordance?.preferredTiming).toBe('next-open-window')
    expect(context.memoryDeliberation?.followUpAffordance?.intrusionRisk).toBe('high')
    expect(context.memoryDeliberation?.conflictVariants).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:self-model-stale',
      }),
    ]))
    expect(context.memoryResolutionLedger?.rejectedCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:self-model-stale',
      }),
    ]))
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.consolidatedMemories?.[0]?.id).toBe('consolidation-self-new')
    expect(context.memoryResolutionLedger?.rejectedCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:self-model-stale',
      }),
    ]))
    expect(context.memoryResolutionLedger?.suppressionTags).toContain('self-model-stale')
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
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })

    expect(context.consolidatedMemories?.[0]?.id).toBe('consolidation-relationship-repair')
    expect(context.memoryResolutionLedger?.rejectedCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'suppression:relationship-era-confusion',
      }),
    ]))
    expect(context.memoryResolutionLedger?.suppressionTags).toContain('relationship-era-confusion')
  })

  it('emits affective residue memory as mind-state prompt context instead of visible care template instructions', async () => {
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText,
      selectPromptActiveThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => ({
        trustDelta: 0.2,
        burdenDelta: 0.62,
      } as any),
      retrieveMemoryFacts: async () => [],
      recallConversationHistory: async () => [],
      recallMemoryConsolidations: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => ({
        summary: 'The host is tired lately and trusts low-pressure repair.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.74,
          rationale: 'Trust rises when pressure stays low.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: ['The host is easier to crowd right now.'],
        narrative: [],
        updatedAt: Date.UTC(2026, 4, 3, 10, 0, 0),
      }),
      listRelationshipOutcomes: async () => [{
        id: 'relationship-outcome-1',
        summary: 'Repair landed, but the host was tired and needed less pressure.',
        closenessDelta: 0.1,
        trustDelta: 0.18,
        burdenDelta: 0.62,
        repairDelta: 0.72,
        misreadDelta: -0.2,
        boundaryDelta: -0.16,
        openLoopDelta: 0.12,
      } as any],
      listMemoryReflections: async () => [{
        id: 'reflection-1',
        targetScope: 'relationship',
        status: 'confirmed',
        summary: 'Repair should stay low-pressure because burden is active.',
        lesson: 'Protect rest before reopening warmth.',
      } as any],
      isPersonaResidueMemoryText: () => false,
    })

    const context = await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '现在是不是该更慢一点别太近',
      recallGovernor: {
        allowActiveThoughts: true,
        allowRecalledFragments: true,
      } as any,
    })
    const blocks = runtime.buildOrganicMemorySystemBlocks(context)
    const residueBlock = blocks.find(block => block.includes('[ALICIZATION_AFFECTIVE_RESIDUE_MEMORY]'))

    expect(context.affectiveResidue).toEqual(expect.objectContaining({
      version: 'affective-residue-memory-v1',
      relationshipCadence: expect.objectContaining({
        shouldDelayWarmth: expect.any(Boolean),
      }),
    }))
    expect(context.derivedMindStateBundle?.affectiveResidue).toEqual(expect.objectContaining({
      version: 'affective-residue-memory-v1',
    }))
    expect(residueBlock).toContain('usage=mind_state_context_only')
    expect(residueBlock).toContain('dominant=')
    expect(residueBlock).toContain('protect_rest=')
  })
})

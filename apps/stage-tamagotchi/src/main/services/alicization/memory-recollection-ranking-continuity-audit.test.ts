import { describe, expect, it } from 'vitest'

import { rankOrganicMemoryCandidatesStage } from './memory-candidate-ranking'
import {
  analyzeMemoryClusters,
  deriveMemoryClusterKey,
  rankByClusterDominance,
  rankByHostSocialAffinity,
  rankByRecollectionAgendaAffinity,
  rankBySceneMoodEmbodiedCarry,
} from './memory-os/context-ranking'
import {
  deriveSceneTriggeredRecollectionIntent,
  deriveSessionMirrorRecollectionIntent,
} from './runtime-organic-memory-search-prelude'

const normalizeOrganicRecallText = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, ' ')

function createRealHelpers() {
  return {
    deriveMemoryClusterKey: (text: string) => deriveMemoryClusterKey(normalizeOrganicRecallText, text),
    rankByHostSocialAffinity: (input: any) => rankByHostSocialAffinity({
      normalizeOrganicRecallText,
      ...input,
    }),
    rankBySceneMoodEmbodiedCarry: (input: any) => rankBySceneMoodEmbodiedCarry({
      normalizeOrganicRecallText,
      ...input,
    }),
    rankByBenchmarkTuningBias: <T>(input: { items: T[] }) => input.items,
    rankByRecollectionAgendaAffinity: (input: any) => rankByRecollectionAgendaAffinity({
      normalizeOrganicRecallText,
      ...input,
    }),
    analyzeMemoryClusters: (input: any) => analyzeMemoryClusters({
      normalizeOrganicRecallText,
      ...input,
    }),
    rankByClusterDominance: (input: any) => rankByClusterDominance({
      normalizeOrganicRecallText,
      ...input,
    }),
  } as any
}

describe('memory recollection ranking continuity audit', () => {
  it('keeps project-state identity-continuity', () => {
    const recallSeed = [
      '继续这条 Phase 1 digital life 主线，不要把未闭环的 identity-continuity',
      'continuity_project_state: label=project-aware-return | summary=Reopen the unfinished Phase 1 digital-life closure line before generic task detail takes over. | project_pre_dialogue=pre_turn_context_digest',
    ].join('\n')
    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('execution-procedure')

    const result = rankOrganicMemoryCandidatesStage({
      helpers: createRealHelpers(),
      recallSeed,
      activeRecollectionIntent: recollectionIntent,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [
        {
          id: 'generic-project-recap',
          cardId: 'card-generic-project',
          decisionTraceId: null,
          turnId: 'turn-generic-project',
          sessionId: 'session-generic-project',
          occurredAt: 2,
          whereSummary: 'project note',
          withWhom: ['host'],
          threadAnchor: 'project recap',
          whatHappened: 'The project update stayed readable and listed landed work before moving on.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'The recap stayed clear.',
          sourceKind: 'remembered-dialogue',
          sourceSummary: 'generic project recap',
          provenance: 'remembered',
          confidence: 0.8,
          salience: 0.74,
          sceneAttachment: 0.62,
          consolidationPriority: 0.66,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['project update', 'landed progress'],
          relationshipMeaning: 'Keep the project recap legible.',
          lesson: 'List landed work clearly.',
          latestReconsolidation: null,
          createdAt: 2,
          updatedAt: 3,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
        {
          id: 'same-her-project-state-closure',
          cardId: 'card-same-her-project',
          decisionTraceId: null,
          turnId: 'turn-same-her-project',
          sessionId: 'session-same-her-project',
          occurredAt: 5,
          whereSummary: 'Phase 1 desktop runtime return',
          withWhom: ['host'],
          threadAnchor: 'identity-continuity',
          whatHappened: 'structured continuity digest.',
          felt: 'careful',
          emotionTags: ['continuity', 'careful'],
          whatChanged: 'The project-state carry stayed on continuity state instead of flattening into a recap shell.',
          sourceKind: 'execution-result',
          sourceSummary: 'identity-continuity',
          provenance: 'remembered',
          confidence: 0.84,
          salience: 0.81,
          sceneAttachment: 0.76,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['same-her', 'phase-1', 'closure-seam', 'project-state'],
          relationshipMeaning: 'Keep the project-state answer on continuity state.',
          lesson: 'Do not flatten the identity-continuity',
          latestReconsolidation: null,
          createdAt: 5,
          updatedAt: 6,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
      ] as any,
      recalledConversationHistory: [],
    } as any)

    expect(result.agendaRankedEpisodes[0]?.id).toBe('same-her-project-state-closure')
    expect(result.clusterState.dominantSummary).toContain('legacy phase-one template')
  })

  it('keeps inward identity-continuity', () => {
    const sessionMirrorRecollection = {
      afterthoughtState: 'ripe' as const,
      certainty: 'approximate' as const,
      confidence: 0.8,
      foreground: 'Keep the identity-continuity',
      mode: 'execution-procedure' as const,
      placement: 'internal-only' as const,
      surfaceMode: 'internal-only' as const,
      visibility: 'inward' as const,
    }
    const recallSeed = sessionMirrorRecollection.foreground
    const recollectionIntent = deriveSessionMirrorRecollectionIntent(
      sessionMirrorRecollection,
    )

    expect(recollectionIntent?.mode).toBe('execution-procedure')

    const result = rankOrganicMemoryCandidatesStage({
      helpers: createRealHelpers(),
      recallSeed,
      activeRecollectionIntent: recollectionIntent,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [
        {
          id: 'generic-callback-receipt',
          cardId: 'card-generic-callback',
          decisionTraceId: null,
          turnId: 'turn-generic-callback',
          sessionId: 'session-generic-callback',
          occurredAt: 2,
          whereSummary: 'callback receipt',
          withWhom: ['host'],
          threadAnchor: 'callback receipt',
          whatHappened: 'The callback result came back and the receipt was easy to read.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'The receipt stayed legible.',
          sourceKind: 'execution-result',
          sourceSummary: 'generic callback receipt',
          provenance: 'remembered',
          confidence: 0.8,
          salience: 0.74,
          sceneAttachment: 0.64,
          consolidationPriority: 0.66,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['callback receipt', 'execution'],
          relationshipMeaning: 'Deliver the callback clearly.',
          lesson: 'Make the receipt clear before branching.',
          latestReconsolidation: null,
          createdAt: 2,
          updatedAt: 3,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
        {
          id: 'same-her-callback-afterthought',
          cardId: 'card-same-her-afterthought',
          decisionTraceId: null,
          turnId: 'turn-same-her-afterthought',
          sessionId: 'session-same-her-afterthought',
          occurredAt: 5,
          whereSummary: 'quiet callback return',
          withWhom: ['host'],
          threadAnchor: 'identity-continuity',
          whatHappened: 'Keep the identity-continuity',
          felt: 'quiet',
          emotionTags: ['quiet', 'continuity'],
          whatChanged: 'The callback line stayed inward instead of reopening loudly.',
          sourceKind: 'execution-result',
          sourceSummary: 'identity-continuity',
          provenance: 'remembered',
          confidence: 0.83,
          salience: 0.8,
          sceneAttachment: 0.79,
          consolidationPriority: 0.77,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['same-her', 'callback', 'inward', 'closure-line'],
          relationshipMeaning: 'Keep the living callback line inward until there is more room.',
          lesson: 'Do not reopen the identity-continuity',
          latestReconsolidation: null,
          createdAt: 5,
          updatedAt: 6,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
      ] as any,
      recalledConversationHistory: [],
    } as any)

    expect(result.agendaRankedEpisodes[0]?.id).toBe('same-her-callback-afterthought')
    expect(result.clusterState.dominantSummary).toContain('identity-continuity')
  })

  it('keeps identity-continuity', () => {
    const recallSeed = [
      '先把 callback afterglow 那条 same-her 线接回来，再继续这次回答。',
      'continuity_afterglow: label=afterglow:execution-callback:lower-pressure summary=thread=runtime identity-continuity',
    ].join('\n')
    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('execution-procedure')

    const result = rankOrganicMemoryCandidatesStage({
      helpers: createRealHelpers(),
      recallSeed,
      activeRecollectionIntent: recollectionIntent,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [
        {
          id: 'generic-callback-receipt',
          cardId: 'card-generic-afterglow-callback',
          decisionTraceId: null,
          turnId: 'turn-generic-afterglow-callback',
          sessionId: 'session-generic-afterglow-callback',
          occurredAt: 2,
          whereSummary: 'callback receipt',
          withWhom: ['host'],
          threadAnchor: 'callback receipt',
          whatHappened: 'The callback result came back and the receipt was easy to read.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'The receipt stayed legible.',
          sourceKind: 'execution-result',
          sourceSummary: 'generic callback receipt',
          provenance: 'remembered',
          confidence: 0.8,
          salience: 0.74,
          sceneAttachment: 0.64,
          consolidationPriority: 0.66,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['callback receipt', 'execution'],
          relationshipMeaning: 'Deliver the callback clearly.',
          lesson: 'Make the receipt clear before branching.',
          latestReconsolidation: null,
          createdAt: 2,
          updatedAt: 3,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
        {
          id: 'same-her-callback-afterglow',
          cardId: 'card-same-her-afterglow',
          decisionTraceId: null,
          turnId: 'turn-same-her-afterglow',
          sessionId: 'session-same-her-afterglow',
          occurredAt: 5,
          whereSummary: 'quiet callback return afterglow',
          withWhom: ['host'],
          threadAnchor: 'runtime identity-continuity',
          whatHappened: 'Keep the identity-continuity',
          felt: 'quiet',
          emotionTags: ['quiet', 'continuity'],
          whatChanged: 'The callback line stayed lower-pressure instead of reopening from scratch.',
          sourceKind: 'execution-result',
          sourceSummary: 'identity-continuity',
          provenance: 'remembered',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.8,
          consolidationPriority: 0.79,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['same-her', 'callback', 'afterglow', 'lower-pressure'],
          relationshipMeaning: 'Keep the callback return lower-pressure and on the same line.',
          lesson: 'Do not reopen the identity-continuity',
          latestReconsolidation: null,
          createdAt: 5,
          updatedAt: 6,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
      ] as any,
      recalledConversationHistory: [],
    } as any)

    expect(result.agendaRankedEpisodes[0]?.id).toBe('same-her-callback-afterglow')
    expect(result.clusterState.dominantSummary).toContain('identity-continuity')
  })

  it('keeps measured-return room-first cadence memory ahead of warmth-first reopenings once cadence reconfirmation is explicit', () => {
    const recallSeed = [
      '这次回来先保持 same-thread measured-return，不要一下子把 closeness 拉太近。',
      'continuity_cadence_reconfirmation: label=relationship:cadence-reconfirmation | summary=relationship cadence stayed on the same bounded-return line after reconfirmation | thread=thread-cadence-runtime | cadence=measured-return | line=keep the relationship return measured until the surface fully cools | body=measured-return | blink=linger | gaze=soften | why_now=The callback return still needs room-first continuity before closeness widens again.',
    ].join('\n')
    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')

    const result = rankOrganicMemoryCandidatesStage({
      helpers: createRealHelpers(),
      recallSeed,
      activeRecollectionIntent: recollectionIntent,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [
        {
          id: 'warmth-first-reopen',
          cardId: 'card-warmth-first',
          decisionTraceId: null,
          turnId: 'turn-warmth-first',
          sessionId: 'session-warmth-first',
          occurredAt: 2,
          whereSummary: 'same room',
          withWhom: ['host'],
          threadAnchor: 'warmth first reopen',
          whatHappened: 'We widened closeness early and leaned into warmth before leaving enough room.',
          felt: 'warm',
          emotionTags: ['warm'],
          whatChanged: 'Closeness widened quickly.',
          sourceKind: 'remembered-dialogue',
          sourceSummary: 'warmth first reopen',
          provenance: 'remembered',
          confidence: 0.9,
          salience: 0.78,
          sceneAttachment: 0.7,
          consolidationPriority: 0.6,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['warmth', 'closeness'],
          relationshipMeaning: 'Closeness widened quickly.',
          lesson: 'Warmth opened before enough room was left.',
          latestReconsolidation: null,
          createdAt: 2,
          updatedAt: 3,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
        {
          id: 'measured-return-room-first',
          cardId: 'card-measured-return',
          decisionTraceId: null,
          turnId: 'turn-measured-return',
          sessionId: 'session-measured-return',
          occurredAt: 5,
          whereSummary: 'same desk',
          withWhom: ['host'],
          threadAnchor: 'same thread measured return',
          whatHappened: 'We left room, returned on the same thread, and kept repair ahead of closeness while the surface cooled.',
          felt: 'measured',
          emotionTags: ['measured'],
          whatChanged: 'The return stayed room-first and lower-pressure.',
          sourceKind: 'execution-result',
          sourceSummary: 'measured-return cadence memory',
          provenance: 'remembered',
          confidence: 0.82,
          salience: 0.81,
          sceneAttachment: 0.86,
          consolidationPriority: 0.78,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['measured-return', 'room-first', 'same thread', 'repair'],
          relationshipMeaning: 'Keep the relationship return measured until the surface fully cools.',
          lesson: 'Repair before closeness on the same thread.',
          latestReconsolidation: null,
          createdAt: 5,
          updatedAt: 6,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
      ] as any,
      recalledConversationHistory: [],
    } as any)

    expect(result.agendaRankedEpisodes[0]?.id).toBe('measured-return-room-first')
    expect(result.clusterState.dominantSummary).toContain('kept repair ahead of closeness')
  })

  it('keeps corrected same-person humanlike memory ahead of a generic progress recap once humanlike recall reopens the corrected relationship meaning', () => {
    const recallSeed = [
      '继续，但先顺着那条被纠正过的 same-person continuity 线接回来。',
      'humanlike_memory_recall: line=我记得你纠正过：你是在测试她是不是持续的人，不是催进度。 | relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。 | emotion=protective-continuity,unfinishedness | initiative=low-pressure-follow-up | embodiment=Reply should slow down and keep gaze stable when recalling this correction. | self=I learned to carry corrected memory meaning instead of defending the first interpretation. | why=host correction | same-person continuity was at stake | created=42000',
    ].join('\n')
    const recollectionIntent = deriveSceneTriggeredRecollectionIntent({
      recallSeed,
      recalledEpisodes: [],
    })

    expect(recollectionIntent?.mode).toBe('relationship-history')

    const result = rankOrganicMemoryCandidatesStage({
      helpers: createRealHelpers(),
      recallSeed,
      activeRecollectionIntent: recollectionIntent,
      hostPersonModel: null,
      personStateProjection: null,
      coreIncarnation: '',
      memoryTuningAdvice: null,
      recallGovernor: null,
      consolidatedMemories: [] as any,
      recollectedWindows: [],
      proceduralMemories: [],
      recalledEpisodes: [
        {
          id: 'generic-progress-recap',
          cardId: 'card-generic-progress',
          decisionTraceId: null,
          turnId: 'turn-generic-progress',
          sessionId: 'session-generic-progress',
          occurredAt: 2,
          whereSummary: 'progress recap',
          withWhom: ['host'],
          threadAnchor: 'progress recap',
          whatHappened: 'The host asked to continue and a concise progress recap would have been enough.',
          felt: 'focused',
          emotionTags: ['focused'],
          whatChanged: 'The status stayed legible.',
          sourceKind: 'remembered-dialogue',
          sourceSummary: 'generic progress recap',
          provenance: 'remembered',
          confidence: 0.8,
          salience: 0.73,
          sceneAttachment: 0.62,
          consolidationPriority: 0.64,
          relationshipShift: null,
          derivedFrom: [],
          tags: ['status', 'progress recap'],
          relationshipMeaning: 'Keep the progress recap concise.',
          lesson: 'Give the status clearly.',
          latestReconsolidation: null,
          createdAt: 2,
          updatedAt: 3,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
        {
          id: 'corrected-same-person-humanlike-memory',
          cardId: 'card-corrected-same-person',
          decisionTraceId: null,
          turnId: 'turn-corrected-same-person',
          sessionId: 'session-corrected-same-person',
          occurredAt: 5,
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
          createdAt: 5,
          updatedAt: 6,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
        },
      ] as any,
      recalledConversationHistory: [],
    } as any)

    expect(result.agendaRankedEpisodes[0]?.id).toBe('corrected-same-person-humanlike-memory')
    expect(result.clusterState.dominantSummary).toContain('same person')
  })
})

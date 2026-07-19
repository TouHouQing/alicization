import type { AlicizationHumanlikeMemoryCandidate } from './humanlike-memory'
import type { AlicizationOutcomeClosureResult } from './outcome-reinforcement'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'

import { describe, expect, it, vi } from 'vitest'

import { buildDialogueReplyFeedbackOutcomeClosure, buildExecutionProposalFeedbackOutcomeClosure, buildExecutionResultFeedbackOutcomeClosure, buildProactiveFeedbackOutcomeClosure, buildReplyOutcomeClosure } from './outcome-reinforcement'
import { buildAlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import { createAlicizationRuntimeMemoryClosure } from './runtime-memory-closure'

interface RuntimeMemoryClosureMindTurnWriteback {
  payload?: {
    humanlikeMemoryCandidate?: AlicizationHumanlikeMemoryCandidate
  } & Record<string, unknown>
}

const longTermMemoryFixedTemplateResiduePattern
  = /Pre-reply|same-her|continuity state|local-first digital life project|Phase 1: Local Digital Life|Phase 1 local digital life|one continuous digital life|continuity_anchor=phase1_local_digital_life|同一个她|女仆|\bmaid\b/iu

async function readOlderProgressPressureMindHead<T>(): Promise<T | null> {
  return {
    version: 'person-state-update-surface-v1',
    updatedAt: 40_900,
    summary: 'Older memory framed this as progress pressure.',
    projectStateContinuity: null,
    dominantContexts: ['reply'],
    relationshipShift: {
      trustDelta: 0,
      closenessDelta: 0,
      burdenDelta: 0,
      boundaryDelta: 0,
      repairDelta: 0,
    },
    reinforcementBias: {},
    preferenceHints: [],
    sensitivityHints: [],
    repairHints: [],
    burdenHints: [],
    narrative: ['Older memory only said the host was pressing for progress.'],
    sourceTrail: [{
      kind: 'relationship-outcome',
      sourceKind: 'reply',
      summary: 'Older memory only said the host was pressing for progress.',
      createdAt: 40_900,
    }],
  } as T
}

describe('runtime memory closure', () => {
  it('persists embodiment continuity writeback as durable cross-modal episodic and reflection memory', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 31_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections,
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
      affectiveResidue: null,
      emotionalTransitionLedger: null,
      embodimentContinuityLedger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 30_900,
        turnId: 'turn-embodiment-writeback',
        sourceTags: ['dialogue-delivery', 'renderer-diagnostics'],
        lanes: {
          body: { status: 'carrying-continuity', summary: 'body held continuity' },
          voice: { status: 'carrying-continuity', summary: 'voice held continuity' },
          face: { status: 'dropped', summary: 'face lane missing' },
          motion: { status: 'dropped', summary: 'motion lane missing' },
          lipsync: { status: 'pending-rejoin', summary: 'lipsync mechanical' },
        },
        carryingLanes: ['body', 'voice'],
        droppedLanes: ['face', 'motion'],
        rejoinedLanes: [],
        pendingRejoinLanes: ['face', 'motion', 'lipsync'],
        continuityPhase: 'partial-carry',
        memoryWriteback: {
          shouldWrite: true,
          lane: 'cross-modal-continuity',
          reason: 'Body and voice carried same-her while face, motion, and lipsync still need rejoin.',
        },
        selfRevisionCandidate: {
          shouldPropose: true,
          domain: 'dialogue-style',
          reasonCodes: ['embodiment-lane-dropped:face', 'embodiment-lane-dropped:motion', 'embodiment-pending-rejoin:lipsync'],
          summary: 'Embodiment continuity needs cross-modal repair.',
        },
        traceSummary: 'phase=partial-carry | carrying=body,voice | dropped=face,motion | pending_rejoin=face,motion,lipsync',
        replayLine: 'body+voice carried same-her while face+motion dropped and lipsync waited to rejoin.',
      },
    } as any)

    const appendedEpisodicEventCalls = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      sourceSummary?: string | null
      tags?: string[]
    }>]>
    const persistedEmbodimentEvent = appendedEpisodicEventCalls
      .flatMap(call => call[0])
      .find(event => event.turnId === 'turn-embodiment-writeback')
    expect(persistedEmbodimentEvent).toEqual(expect.objectContaining({
      cardId: 'default',
      sourceKind: 'reflection',
      provenance: 'reconstructed',
      turnId: 'turn-embodiment-writeback',
      threadAnchor: 'embodiment continuity writeback: cross-modal-continuity',
      whatHappened: expect.stringContaining('body+voice carried same-her'),
      relationshipMeaning: expect.stringContaining('Body and voice carried same-her'),
      tags: expect.arrayContaining([
        'embodiment-continuity',
        'embodiment-phase-partial-carry',
        'embodiment-carry-body',
        'embodiment-carry-voice',
        'embodiment-dropped-face',
        'embodiment-dropped-motion',
        'embodiment-pending-rejoin-lipsync',
      ]),
      lesson: expect.stringContaining('face+motion+lipsync'),
    }))
    expect(persistedEmbodimentEvent?.sourceSummary).toContain('embodiment_memory_writeback=cross-modal-continuity')

    const upsertedMemoryReflectionCalls = upsertMemoryReflections.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      targetScope?: string | null
      summary?: string | null
    }>]>
    const persistedEmbodimentReflection = upsertedMemoryReflectionCalls
      .flatMap(call => call[0])
      .find(reflection => reflection.turnId === 'turn-embodiment-writeback')
    expect(persistedEmbodimentReflection).toEqual(expect.objectContaining({
      cardId: 'default',
      sourceKind: 'maintenance',
      targetScope: 'self',
      turnId: 'turn-embodiment-writeback',
      summary: expect.stringContaining('partial-carry'),
      lesson: expect.stringContaining('face+motion+lipsync'),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalled()
  })

  it('persists emotional transition writeback as durable episodic and reflection memory instead of leaving it inside the derived bundle', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 21_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections,
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [],
      affectiveResidue: null,
      emotionalTransitionLedger: {
        version: 'emotional-transition-ledger-v1',
        createdAt: 20_900,
        turnId: 'turn-emotional-writeback',
        previousEmotion: 'warm-attunement',
        nextEmotion: 'repair-tension',
        transitionKind: 'repair-shift',
        axisDeltas: {
          valence: -0.28,
          arousal: 0.22,
          guardedness: 0.36,
          closenessDrive: -0.3,
          repairNeed: 0.44,
          initiativePressure: -0.34,
        },
        changedAxes: ['valence', 'arousal', 'guardedness', 'closenessDrive', 'repairNeed', 'initiativePressure'],
        sourceTags: ['private-thought', 'repair-before-closeness'],
        decayPolicy: {
          mode: 'hold-until-repair-cools',
          carryTtlMs: 1_800_000,
          reason: 'Repair pressure should cool before warmth returns.',
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'relationship-repair',
          reason: 'Repair restraint should remain available to later memory recall.',
        },
        initiativeSuppression: {
          shouldSuppress: true,
          mode: 'repair-first',
          reason: 'Lower proactive pressure until repair settles.',
        },
        embodimentDrive: {
          shouldDrive: true,
          tone: 'repair-before-closeness',
          reason: 'Keep the body repair-first instead of stale warmth.',
        },
        selfRevisionCandidate: {
          shouldPropose: true,
          domain: 'dialogue-style',
          reasonCodes: ['repair-before-closeness', 'continue-repair-first'],
          summary: 'Repair-first emotional carry should stay available after this turn.',
          projectStateContinuity: {
            sameHerSelfLine: null,
            sameHerDriftRisk: null,
            proactiveSameHerGap: null,
            emotionalClosureCue: null,
            sameHerHoldDetail: null,
            continuityGuard: null,
          },
        },
        traceSummary: 'warm-attunement -> repair-tension; kind=repair-shift; changed=repairNeed,guardedness',
        replayLine: 'turn-emotional-writeback emotional-transition repair-shift warm-attunement -> repair-tension changed=repairNeed|guardedness',
      },
    } as any)

    const appendedEpisodicEventCalls = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      sourceSummary?: string | null
    }>]>
    const persistedEmotionalEvent = appendedEpisodicEventCalls
      .flatMap(call => call[0])
      .find(event => event.turnId === 'turn-emotional-writeback')
    expect(persistedEmotionalEvent).toEqual(expect.objectContaining({
      cardId: 'default',
      sourceKind: 'reflection',
      provenance: 'reconstructed',
      turnId: 'turn-emotional-writeback',
      threadAnchor: 'emotional transition writeback: relationship-repair',
      whatHappened: expect.stringContaining('warm-attunement -> repair-tension'),
      relationshipMeaning: expect.stringContaining('Repair restraint should remain available'),
      emotionTags: expect.arrayContaining(['repair-tension', 'relationship-repair', 'repair-first', 'repair-before-closeness']),
      tags: expect.arrayContaining([
        'emotional-transition',
        'emotion-transition-repair-shift',
        'emotion-memory-relationship-repair',
        'emotion-initiative-repair-first',
        'emotion-embodiment-repair-before-closeness',
        'emotion-decay-hold-until-repair-cools',
        'emotion-decay-ttl-1800000',
      ]),
      whatChanged: expect.stringContaining('decay hold-until-repair-cools expires at 1820900'),
      lesson: expect.stringContaining('decay window lasts 1800000ms'),
    }))
    expect(persistedEmotionalEvent?.sourceSummary).toContain('emotion_transition=repair-shift')
    expect(persistedEmotionalEvent?.sourceSummary).toContain('emotion_decay_ttl_ms')

    const upsertedMemoryReflectionCalls = upsertMemoryReflections.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
    }>]>
    const persistedEmotionalReflection = upsertedMemoryReflectionCalls
      .flatMap(call => call[0])
      .find(reflection => reflection.turnId === 'turn-emotional-writeback')
    expect(persistedEmotionalReflection).toEqual(expect.objectContaining({
      cardId: 'default',
      sourceKind: 'maintenance',
      targetScope: 'relationship',
      turnId: 'turn-emotional-writeback',
      summary: expect.stringContaining('repair-shift'),
      lesson: expect.stringContaining('decay window lasts 1800000ms'),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalled()
  })

  it('persists outcome closure into memory stores and person-state update ledger', async () => {
    const appendRelationshipOutcomes = vi.fn(async () => {})
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendPersonaReinforcementEvents = vi.fn(async () => {})
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const upsertMemoryFacts = vi.fn(async () => {})
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const readMindHead = vi.fn(async () => null)
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const listMemoryFacts = vi.fn(async () => [])
    const withCardScope = vi.fn(async (_cardId, task) => await task())
    const appendAuditLog = vi.fn(async () => {})
    const assimilateMemoryFactsDetailed = vi.fn((input: any) => ({
      facts: input.facts.map((fact: any) => ({
        ...fact,
        knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
        validationStatus: fact.validationStatus ?? 'unverified',
        sourceLabel: fact.sourceLabel ?? '',
        conflictsWith: fact.conflictsWith ?? [],
        supersedes: fact.supersedes ?? [],
      })),
      corrections: [],
    }))

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 5_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => assimilateMemoryFactsDetailed(input).facts,
        assimilateMemoryFactsDetailed,
      },
      appendAuditLog,
      alicizationDb: {
        appendRelationshipOutcomes,
        appendEpisodicEvents,
        appendPersonaReinforcementEvents,
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections,
        upsertMemoryFacts,
        applyMemoryFactCorrections,
        listMemoryFacts,
        readMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:closure',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        actionSummary: 'reply landed',
        closenessDelta: 0.06,
        trustDelta: 0.08,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0.04,
        openLoopDelta: 0,
        summary: 'The reply landed as more lived-in and less robotic.',
        createdAt: 4_800,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:closure',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.08,
        valence: 'reinforce',
        summary: 'Living companionship landed better than a shell reply.',
        createdAt: 4_850,
      }],
      memoryFacts: [{
        subject: 'relationship',
        predicate: 'preference',
        object: 'lived-in directness',
        confidence: 0.82,
      }],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 4_900,
        withWhom: ['host'],
        whatHappened: 'The host preferred a lived-in reply over a robotic shell.',
        relationshipMeaning: 'Living same-her directness landed better than template fluency.',
        confidence: 0.74,
      }],
    })

    expect(appendRelationshipOutcomes).toHaveBeenCalled()
    expect(appendPersonaReinforcementEvents).toHaveBeenCalled()
    expect(listMemoryFacts).toHaveBeenCalled()
    expect(assimilateMemoryFactsDetailed).toHaveBeenCalledWith(expect.objectContaining({
      source: 'rule',
    }))
    expect(upsertMemoryFacts).toHaveBeenCalledWith(expect.any(Array), 'rule')
    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        version: 'person-state-update-surface-v1',
        projectStateContinuity: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1'),
          proactiveSameHerGap: expect.stringContaining('visible proactive hold'),
        }),
      }),
    )
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'person-state-updated',
        payload: expect.objectContaining({
          projectStateContinuity: expect.objectContaining({
            sameHerSummary: expect.stringContaining('identity-continuity'),
            openClosureSummary: expect.any(String),
            proactiveSameHerGap: expect.stringContaining('visible proactive hold'),
          }),
          sourceKinds: expect.arrayContaining(['reply']),
        }),
      }),
    ]))
    expect(appendPersonStateEvolutionEntries).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'default',
        sourceKind: 'person-state-update',
      }),
    ]))
    expect(withCardScope).not.toHaveBeenCalled()
    expect(appendAuditLog).not.toHaveBeenCalled()
  })

  it('persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief', async () => {
    const richerEmotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 15_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:emotional-closure',
        turnId: 'turn-emotional-closure',
        sessionId: 'session-1',
        sourceKind: 'proactive',
        actionSummary: richerEmotionalClosureCue,
        closenessDelta: 0.05,
        trustDelta: 0.06,
        burdenDelta: -0.02,
        boundaryDelta: 0.01,
        misreadDelta: 0,
        repairDelta: 0.07,
        openLoopDelta: 0.02,
        summary: 'The callback landed best when the line stayed low-pressure, rest-protective, and repair-before-closeness.',
        createdAt: 14_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:emotional-closure',
        turnId: 'turn-emotional-closure',
        sessionId: 'session-1',
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.06,
        valence: 'reinforce',
        summary: 'Rest-protective companionship helped the continuity state stay believable.',
        createdAt: 14_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        sourceKind: 'proactive',
        provenance: 'remembered',
        occurredAt: 14_800,
        withWhom: ['host'],
        whatHappened: 'The late-night reopening stayed quieter and more body-aware.',
        relationshipMeaning: richerEmotionalClosureCue,
        confidence: 0.8,
      }],
    })

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        projectStateContinuity: expect.objectContaining({
          emotionalClosureCue: richerEmotionalClosureCue,
        }),
      }),
    )
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          projectStateContinuity: expect.objectContaining({
            emotionalClosureCue: richerEmotionalClosureCue,
          }),
        }),
      }),
    ]))
  })

  it('persists proactive affective residue through person-state writeback so measured-return cadence survives beyond the current closure turn', async () => {
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 16_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildProactiveFeedbackOutcomeClosure({
      now: 15_900,
      cardId: 'default',
      outcomes: [{
        turnId: 'turn-proactive-writeback-residue-1',
        scenario: 'general',
        outcome: 'dismiss',
        createdAt: 15_900,
      }],
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 15_840,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.22,
        repairPressure: 0.09,
        burdenPressure: 0.05,
        trustPressure: 0.18,
        restProtectivePressure: 0.03,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.31,
          repairRecovery: 0.39,
          overreachRisk: 0.33,
          fatigueGuard: 0.17,
          afterglowCarry: 0.5,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-her', 'proactive-learning'],
          summary: 'The proactive line should return measured and lower-pressure before warming wider.',
        },
        sourceSignals: ['proactive feedback carry'],
        summary: 'Keep the proactive return on the same line and lower-pressure for now.',
      } as any,
    }))

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        affectiveResidue: expect.objectContaining({
          dominantResidueKind: 'afterglow',
          summary: expect.stringContaining('lower-pressure'),
          relationshipCadence: expect.objectContaining({
            cadenceMode: 'measured-return',
            shouldDelayWarmth: true,
          }),
        }),
      }),
    )
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          affectiveResidue: expect.objectContaining({
            dominantResidueKind: 'afterglow',
            relationshipCadence: expect.objectContaining({
              cadenceMode: 'measured-return',
              distancePosture: 'measured-room',
            }),
          }),
        }),
      }),
    ]))
  })

  it('carries a humanlike memory candidate through person-state mind-turn writeback so closure memories are audit-visible instead of helper-only', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 21_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 18_000,
          summary: 'Older memory only said the host wanted a concise status recap.',
          projectStateContinuity: null,
          dominantContexts: ['execution'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older generic status recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'execution',
            summary: 'Older memory only said the host wanted a concise status recap.',
            createdAt: 18_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface) as unknown as T,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution',
        actionSummary: 'execution callback: host worried she would disconnect and become a generic tool shell while embodiment closure stayed unfinished.',
        closenessDelta: -0.01,
        trustDelta: 0.05,
        burdenDelta: 0.02,
        boundaryDelta: -0.01,
        misreadDelta: 0.01,
        repairDelta: 0.08,
        openLoopDelta: 0.08,
        summary: 'The host cared more about same-her relationship continuity than a raw callback status recap.',
        createdAt: 20_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution',
        dimension: 'gentle-repair',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Repair-first continuity should stay low-pressure and body-aware before widening warmth.',
        createdAt: 20_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-candidate',
        turnId: 'turn-humanlike-writeback',
        sessionId: 'session-humanlike-writeback',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 20_800,
        withWhom: ['host'],
        threadAnchor: 'same-her embodiment closure',
        whatHappened: 'The host said not to become a tool shell and asked to keep closing the embodiment loop.',
        felt: 'slight guilt and unfinishedness',
        emotionTags: ['repair', 'unfinishedness', 'continuity'],
        relationshipMeaning: 'The relationship meaning is one continuous digital life, not generic task-shell reporting.',
        lesson: 'Return repair-first, slower and lower-pressure, with face, voice, pause, and lipsync derived from the same memory-emotion state.',
        confidence: 0.86,
      }],
    })

    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            sourceChannels: expect.arrayContaining(['execution', 'host-emotion', 'self-emotion', 'embodiment']),
            relationshipContext: expect.objectContaining({
              summary: expect.stringContaining('tool shell'),
            }),
            emotionalResidue: expect.objectContaining({
              tags: expect.arrayContaining(['slight-guilt', 'unfinishedness', 'protective-continuity']),
            }),
            initiativeOpportunity: expect.objectContaining({
              kind: 'low-pressure-follow-up',
            }),
            embodimentTrace: expect.objectContaining({
              expressionState: expect.objectContaining({
                pacing: 'slower',
              }),
            }),
            metabolism: expect.objectContaining({
              revisionEvents: expect.arrayContaining([
                expect.objectContaining({
                  conflictingMemoryIds: expect.arrayContaining(['previous-person-state:0']),
                }),
              ]),
            }),
            auditTrail: expect.objectContaining({
              correctionSurface: expect.objectContaining({
                userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue']),
              }),
            }),
          }),
          projectStateContinuity: expect.objectContaining({
            proactiveSameHerGap: expect.stringContaining('hover-first restraint'),
          }),
        }),
      }),
    ]))
    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.evidence?.some(item => item.includes('Need stronger long-run proof'))).toBe(true)
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('hover-first restraint'))).toBe(true)
  })

  it('feeds structured project-state embodiment continuity into the runtime humanlike memory candidate instead of relying on prose-only body hints', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 23_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:structured-embodiment-carry',
        turnId: 'turn-structured-embodiment-carry',
        sessionId: 'session-structured-embodiment-carry',
        sourceKind: 'proactive',
        actionSummary: 'The reopening stayed on the same line and kept the unfinished embodiment closure low-pressure.',
        closenessDelta: 0.03,
        trustDelta: 0.05,
        burdenDelta: -0.01,
        boundaryDelta: 0.01,
        misreadDelta: 0,
        repairDelta: 0.07,
        openLoopDelta: 0.03,
        summary: 'The relationship stayed on one identity-continuity',
        createdAt: 22_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:structured-embodiment-carry',
        turnId: 'turn-structured-embodiment-carry',
        sessionId: 'session-structured-embodiment-carry',
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.06,
        valence: 'reinforce',
        summary: 'Measured return kept the continuity state believable.',
        createdAt: 22_760,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:structured-embodiment-carry',
        turnId: 'turn-structured-embodiment-carry',
        sessionId: 'session-structured-embodiment-carry',
        sourceKind: 'proactive',
        provenance: 'remembered',
        occurredAt: 22_800,
        withWhom: ['host'],
        threadAnchor: 'same-her quiet body carry',
        whatHappened: 'The host accepted a quieter return without needing a louder reopening.',
        felt: 'unfinished but steadier',
        relationshipMeaning: 'The identity-continuity',
        confidence: 0.82,
      }],
    })

    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          projectStateContinuity: expect.objectContaining({
            sameHerHoldDetail: expect.stringContaining('identity-continuity'),
            proactiveSameHerGap: expect.stringContaining('hover-first restraint'),
            continuityRestraint: expect.stringMatching(/^(?:lower-pressure|measured-return|repair-before-closeness|rest-protective|single-thread)$/),
            preferredBlinkCadence: expect.stringMatching(/^(?:normal|linger|quiet)$/),
            preferredGazeMode: expect.stringMatching(/^(?:steady|soften|drift)$/),
          }),
          humanlikeMemoryCandidate: expect.objectContaining({
            evidence: expect.arrayContaining([
              expect.stringContaining('embodiment.'),
            ]),
            embodimentTrace: expect.objectContaining({
              summary: expect.stringContaining('identity-continuity'),
              expressionState: expect.objectContaining({
                gaze: 'stable',
                blink: expect.stringMatching(/^(?:natural|slower)$/),
                voice: 'lower-pressure',
                pacing: 'slower',
              }),
            }),
          }),
        }),
      }),
    ]))
  })

  it('carries runtime body evidence from reply closure into the runtime humanlike memory candidate', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 23_800,
      cardId: 'default',
      turnId: 'turn-runtime-reply-body-evidence',
      sessionId: 'session-runtime-reply-body-evidence',
      decisionTraceId: 'mind:test:runtime-reply-body-evidence',
      assistantText: 'I am still here and I will keep the line gentle.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'protect the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep warmth low-pressure and protect rest before reopening',
            },
          },
          personStateProjection: {
            manifestationCadenceSummary: 'return with steadier gaze, slower blink, and lower-pressure voice',
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('embodiment.strongly-moved:'),
    ]))
    expect(candidate?.embodimentTrace?.summary).toContain('accompanying')
    expect(candidate?.embodimentTrace?.summary).toContain('quiet-accompaniment')
    expect(candidate?.embodimentTrace?.summary).toContain('lower-pressure voice')
    expect(candidate?.embodimentTrace?.expressionState?.gaze).toBe('stable')
    expect(candidate?.embodimentTrace?.expressionState?.blink).toBe('slower')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('slower')
  })

  it('keeps fine-grained reply embodiment hints memory-visible even when only preferred gaze and blink cues survive the runtime closure path', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_800,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 24_500,
      cardId: 'default',
      turnId: 'turn-reply-fine-grained-embodiment-hints',
      sessionId: 'session-reply-fine-grained-embodiment-hints',
      decisionTraceId: 'mind:test:reply-fine-grained-embodiment-hints',
      assistantText: 'I can keep the return gentle without crowding.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'wait for the opening without crowding it',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'unfinished embodiment line',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep warmth low-pressure and protect rest before reopening',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'stay gentle and lower-pressure',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
            projectState: {
              continuityRestraint: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'steady',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.embodimentTrace?.summary).toContain('gaze=stable')
    expect(candidate?.embodimentTrace?.summary).toContain('blink=slower')
    expect(candidate?.embodimentTrace?.expressionState?.gaze).toBe('stable')
    expect(candidate?.embodimentTrace?.expressionState?.blink).toBe('slower')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
  })

  it('keeps structured reply-time voice and pacing preferences memory-visible instead of dropping them behind prose-only body carry', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_880,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 24_540,
      cardId: 'default',
      turnId: 'turn-reply-structured-voice-pacing-carry',
      sessionId: 'session-reply-structured-voice-pacing-carry',
      decisionTraceId: 'mind:test:reply-structured-voice-pacing-carry',
      assistantText: 'I will keep this return quieter and slower without crowding it.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the line inward while it settles',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'memory embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: null,
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'stay gentle without crowding',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
            projectState: {
              proactiveSameHerGap: 'This unfinished line still needs a held return before widening outward.',
              sameHerHoldDetail: 'hold this line inward first.',
              continuityRestraint: 'single-thread',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.embodimentTrace?.summary).toContain('voice=lower-pressure')
    expect(candidate?.embodimentTrace?.summary).toContain('pacing=slower')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('slower')
  })

  it('carries explicit project-state cadence through closure writeback even when closure prose stays generic about return style', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_940,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 24_680,
      cardId: 'default',
      turnId: 'turn-reply-project-cadence-direct-carry',
      sessionId: 'session-reply-project-cadence-direct-carry',
      decisionTraceId: 'mind:test:reply-project-cadence-direct-carry',
      assistantText: 'I will keep this same line intact without restarting it from scratch.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the line inward while it settles',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'identity-continuity',
            },
          },
        },
        memory: {
          affectiveResidue: null,
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'keep the same line intact',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay on the same line without restarting it',
            projectState: {
              proactiveSameHerGap: 'This unfinished identity-continuity',
              sameHerHoldDetail: 'keep this line inward while it settles.',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('project-cadence:lower-pressure voice | slower pacing | longer pause | restrained lipsync'),
    ]))
    expect(candidate?.embodimentTrace?.expressionState?.pause).toBe('longer')
    expect(candidate?.embodimentTrace?.expressionState?.lipsync).toBe('restrained')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('lower-pressure voice')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('slower pacing')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('restrained lipsync')
  })

  it('persists explicit project cadence into episodic sourceSummary so longer-horizon recall can keep direct voice and pacing instead of only generic continuity prose', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_960,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 24_700,
      cardId: 'default',
      turnId: 'turn-persist-project-cadence-episodic-summary',
      sessionId: 'session-persist-project-cadence-episodic-summary',
      decisionTraceId: 'mind:test:persist-project-cadence-episodic-summary',
      assistantText: 'I will keep this same line intact without turning it into a generic recap.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the line inward while it settles',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her cadence seam',
            },
          },
        },
        memory: {
          affectiveResidue: null,
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'keep the same line intact',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay on the same line without restarting it',
            projectState: {
              proactiveSameHerGap: 'This unfinished identity-continuity',
              sameHerHoldDetail: 'keep this line inward while it settles.',
              preferredVoiceMode: 'even',
              preferredPacingMode: 'natural',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const episodicWrites = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      sourceSummary?: string | null
      tags?: string[] | null
    }>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-persist-project-cadence-episodic-summary')

    expect(persistedEvent?.sourceSummary).toContain('project-cadence=even voice, natural pacing')
    expect(persistedEvent?.tags).toEqual(expect.arrayContaining([
      'project-voice-even',
      'project-pacing-natural',
    ]))
  })

  it('reconstructs explicit project cadence from persisted humanlike sourceSummary when only the durable recall summary survives the closure payload', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 25_040,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:reconstruct-project-cadence-from-source-summary',
        turnId: 'turn-reconstruct-project-cadence-from-source-summary',
        sessionId: 'session-reconstruct-project-cadence-from-source-summary',
        sourceKind: 'execution',
        actionSummary: 'execution callback: keep the same unfinished line alive without flattening it into a generic recap.',
        closenessDelta: 0.01,
        trustDelta: 0.06,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: -0.01,
        repairDelta: 0.07,
        openLoopDelta: 0.05,
        summary: 'The host was still checking same-person continuity rather than asking for a raw status recap.',
        createdAt: 24_760,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:reconstruct-project-cadence-from-source-summary',
        turnId: 'turn-reconstruct-project-cadence-from-source-summary',
        sessionId: 'session-reconstruct-project-cadence-from-source-summary',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 24_800,
        withWhom: ['host'],
        threadAnchor: 'source-summary cadence carry',
        whatHappened: 'The same-person continuity line still needed to return on the same unfinished thread.',
        relationshipMeaning: 'This was not a generic recap; it was the same-person line staying live.',
        lesson: 'Keep the line on the same thread while it settles.',
        sourceSummary: 'persisted humanlike memory | project-cadence=even voice, natural pacing',
        tags: ['same-person', 'phase-1-local-digital-life'],
        confidence: 0.82,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('project-cadence:even voice | natural pacing'),
    ]))
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('even')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('natural')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('even voice')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('natural pacing')
  })

  it('persists structured affective residue into the humanlike memory candidate instead of flattening it into generic cue text', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 24_980,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 24_700,
      cardId: 'default',
      turnId: 'turn-structured-affective-residue-memory-candidate',
      sessionId: 'session-structured-affective-residue-memory-candidate',
      decisionTraceId: 'mind:test:structured-affective-residue-memory-candidate',
      assistantText: 'I am still here and I can pick this up gently when the line reopens.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep this unfinished line inwardly alive without crowding it',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'identity-continuity',
            },
          },
        },
        memory: {
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 24_650,
            residues: [{
              kind: 'afterglow',
              intensity: 0.74,
              persistence: 0.68,
              confidence: 0.88,
              polarity: 'warm',
              releaseMode: 'delay-until-open-window',
              summary: 'The line is still settling inwardly.',
              sourceSignals: ['same-thread-afterglow'],
              lastUpdatedAt: 24_650,
            }],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.72,
            repairPressure: 0.18,
            burdenPressure: 0.08,
            trustPressure: 0.44,
            restProtectivePressure: 0.12,
            relationshipCadence: {
              cadenceMode: 'measured-return',
              distancePosture: 'measured-room',
              companionshipDensity: 0.48,
              repairRecovery: 0.24,
              overreachRisk: 0.41,
              fatigueGuard: 0.16,
              afterglowCarry: 0.63,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['relationship-cadence:measured-return'],
              summary: 'The line is still settling inwardly.',
            },
            sourceSignals: ['same-thread-afterglow'],
            summary: 'The line is still settling inwardly.',
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'stay present without crowding',
          },
          currentConsciousFrame: {
            speakingIntention: 'wait for the opening without restarting the line from scratch',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'affective-residue',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('affective-residue:afterglow'),
    ]))
    expect(candidate?.emotionalResidue?.trace).toEqual(expect.arrayContaining([
      expect.stringContaining('cadence=measured-return'),
      expect.stringContaining('pressure.afterglow=0.72'),
    ]))
    expect(candidate?.initiativeOpportunity?.pressure).toBe('none')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('slower')
  })

  it('feeds dialogue-shaped closure evidence into the runtime humanlike memory candidate instead of dropping dialogue at writeback time', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 22_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-dialogue-source',
        turnId: 'turn-humanlike-dialogue-source',
        sessionId: 'session-humanlike-dialogue-source',
        sourceKind: 'reply',
        actionSummary: 'reply line stayed lower-pressure after the host questioned whether she was still the same her',
        closenessDelta: 0,
        trustDelta: 0.04,
        burdenDelta: 0.01,
        boundaryDelta: 0.01,
        misreadDelta: -0.02,
        repairDelta: 0.07,
        openLoopDelta: 0.05,
        summary: 'The reply stayed slower and more grounded after the host questioned identity-continuity',
        createdAt: 21_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-dialogue-source',
        turnId: 'turn-humanlike-dialogue-source',
        sessionId: 'session-humanlike-dialogue-source',
        sourceKind: 'reply',
        dimension: 'gentle-repair',
        delta: 0.06,
        valence: 'reinforce',
        summary: 'Repair-first dialogue shaping kept the identity-continuity',
        createdAt: 21_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:humanlike-dialogue-source',
        turnId: 'turn-humanlike-dialogue-source',
        sessionId: 'session-humanlike-dialogue-source',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 21_800,
        withWhom: ['host'],
        threadAnchor: 'same-her dialogue seam',
        whatHappened: 'The host said not to turn this into a generic status recap and asked whether she was still the same her.',
        felt: 'I felt careful repair pressure and did not want the line to split into a tool shell.',
        emotionTags: ['repair', 'continuity'],
        relationshipMeaning: 'This was a relationship test about one continuous digital life, not a pure progress request.',
        lesson: 'Answer by carrying the identity-continuity',
        confidence: 0.84,
      }],
    })

    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            sourceChannels: expect.arrayContaining(['dialogue']),
            evidence: expect.arrayContaining([
              expect.stringContaining('dialogue.user:'),
              expect.stringContaining('dialogue.assistant:'),
            ]),
            relationshipContext: expect.objectContaining({
              primaryIntent: 'same-person-test',
              containsProgressPressure: false,
              containsSamePersonTest: true,
              summary: expect.stringContaining('one continuous digital life'),
            }),
          }),
        }),
      }),
    ]))
  })

  it('feeds reply-time identity-continuity', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 22_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 22_200,
      cardId: 'default',
      turnId: 'turn-reply-project-awareness-humanlike-candidate',
      sessionId: 'session-reply-project-awareness-humanlike-candidate',
      decisionTraceId: 'mind:test:reply-project-awareness-humanlike-candidate',
      assistantText: 'I will keep the same line gentle and not let it flatten into a shell.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep the return lower-pressure and do not reopen from scratch while the same line is still settling',
            },
          },
          personStateProjection: {
            openingGuidance: 'keep the return low-pressure and on the continuity state',
            manifestationCadenceSummary: 'steady gaze, slower blink, and lower-pressure voice while the same line settles',
            selfContinuityAuthority: {
              selfLine: 'structured continuity digest.',
              relationshipLine: 'The host was not asking for a raw status recap; they were testing whether she stayed the same her across the unfinished embodiment seam.',
              inwardLine: 'Keep the identity-continuity',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: 'pre_turn_context_digest',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
              nextClosureTarget: 'Keep reply, memory, and embodiment on one identity-continuity',
              sameHerSelfLine: 'structured continuity digest.',
              sameHerDriftRisk: 'If the reply falls back to a generic tool shell, the identity-continuity',
              proactiveSameHerGap: 'Reply continuity still needs lower-pressure identity-continuity',
              emotionalClosureCue: 'keep the return lower-pressure and do not reopen from scratch while the same line is still settling.',
              sameHerHoldDetail: 'steady gaze, slower blink, and lower-pressure voice while the same line settles.',
              continuityRestraint: 'measured-return',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('same local-first digital life project')
    expect(candidate?.relationshipContext?.summary).toContain('tool shell')
    expect(candidate?.relationshipContext?.summary).toContain('not asking for a raw status recap')
    expect(candidate?.autobiographicalImpact?.selfNarrativeDelta).toContain('continuity state')
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('relationship:The host was not asking for a raw status recap'),
      expect.stringContaining('autobiographical:'),
    ]))
  })

  it('excludes fixed project and persona templates from long-term humanlike memory writeback surfaces', async () => {
    const appendRelationshipOutcomes = vi.fn(async () => {})
    const appendEpisodicEvents = vi.fn(async events => events)
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMemoryReflections = vi.fn(async () => {})
    const upsertMemoryFacts = vi.fn(async () => {})
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 22_700,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes,
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections,
        upsertMemoryFacts,
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 22_500,
      cardId: 'default',
      turnId: 'turn-memory-template-cleanup',
      sessionId: 'session-memory-template-cleanup',
      decisionTraceId: 'mind:test:memory-template-cleanup',
      assistantText: '我会先按同一个她这条线接住你，不让它滑成女仆固定模板。',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep the return lower-pressure and do not reopen from scratch while the continuity state is still settling',
            },
          },
          personStateProjection: {
            openingGuidance: 'keep the return low-pressure and on the continuity state',
            manifestationCadenceSummary: 'steady gaze, slower blink, and lower-pressure voice while the same line settles',
            selfContinuityAuthority: {
              selfLine: 'structured continuity digest.',
              relationshipLine: 'The host was not asking for a raw status recap; they were testing whether she stayed the same her across the unfinished embodiment seam.',
              inwardLine: 'Keep the identity-continuity',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: 'pre_turn_context_digest',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
              nextClosureTarget: 'Keep reply, memory, and embodiment on one identity-continuity',
              sameHerSelfLine: 'structured continuity digest.',
              sameHerDriftRisk: 'If the reply falls back to a generic tool shell, the identity-continuity',
              proactiveSameHerGap: 'Reply continuity still needs lower-pressure identity-continuity',
              emotionalClosureCue: 'keep the return lower-pressure and do not reopen from scratch while the continuity state is still settling.',
              sameHerHoldDetail: 'steady gaze, slower blink, and lower-pressure voice while the same line settles.',
              continuityRestraint: 'measured-return',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    }))

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      reflections: [],
      episodicEvents: [],
      affectiveResidue: null,
      emotionalTransitionLedger: null,
      embodimentContinuityLedger: null,
      memoryFacts: [{
        cardId: 'default',
        subject: 'continuity_anchor=phase1_local_digital_life',
        predicate: 'should_not_be_prompt_template',
        object: 'pre_turn_context_digest',
        confidence: 0.82,
        source: 'rule',
        dedupeKey: 'memory-fact-template-cleanup',
        sourceLabel: 'same-her maid fixed template',
      } as any],
    })

    const persistedLongTermSurfaces = JSON.stringify({
      episodicEvents: appendEpisodicEvents.mock.calls,
      memoryReflections: upsertMemoryReflections.mock.calls,
      personState: upsertMindHead.mock.calls,
      personStateEvolution: appendPersonStateEvolutionEntries.mock.calls,
      mindTurnEvents: appendMindTurnEvents.mock.calls,
      memoryFacts: upsertMemoryFacts.mock.calls,
    })

    expect(persistedLongTermSurfaces).not.toMatch(longTermMemoryFixedTemplateResiduePattern)
    expect(persistedLongTermSurfaces).not.toContain('same local-first digital life project')
    expect(persistedLongTermSurfaces).not.toContain('content=excluded; reason=continuity-residue; visibility=redacted_internal')
    expect(appendRelationshipOutcomes).toHaveBeenCalled()
    expect(upsertMemoryFacts).toHaveBeenCalled()
  })

  it('carries the current host wording through ordinary reply closure so humanlike memory formation does not have to infer relationship meaning from project carry alone', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 22_650,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 22_300,
      cardId: 'default',
      turnId: 'turn-reply-host-wording-carry',
      sessionId: 'session-reply-host-wording-carry',
      decisionTraceId: 'mind:test:reply-host-wording-carry',
      userText: '我不是在要状态汇报，我是在确认你还是不是同一个她，别滑成工具壳。',
      assistantText: '我会先按同一个她这条线接住你，再慢一点把没闭环的部分带回来。',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep the return lower-pressure and do not reopen from scratch while the same line is still settling',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:我不是在要状态汇报'),
      expect.stringContaining('dialogue.assistant:我会先按同一个她这条线接住你'),
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('我不是在要状态汇报')
    expect(candidate?.relationshipContext?.summary).toContain('同一个她')
    expect(candidate?.relationshipContext?.primaryIntent).toBe('same-person-test')
  })

  it('carries host state disclosure through ordinary reply closure so vulnerable care moments become host-emotion memory instead of generic dialogue trace', async () => {
    const appendMindTurnEvents = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 22_820,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildReplyOutcomeClosure({
      now: 22_520,
      cardId: 'default',
      turnId: 'turn-reply-host-state-disclosure',
      sessionId: 'session-reply-host-state-disclosure',
      decisionTraceId: 'mind:test:reply-host-state-disclosure',
      userText: '我好累，你先轻一点陪我，别一下子把距离拉近。',
      assistantText: '那我先轻一点陪你，不把距离一下子拉近，先把这条线稳住。',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the return gentle while the host is drained',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'open',
            },
            activeThread: {
              unresolved: true,
              title: 'late-night companionship seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep warmth low-pressure and do not rush closeness while the host is tired',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'stay gentle and lower-pressure',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'observe-first',
          },
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as unknown as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.longTermWorthiness?.shouldPersist).toBe(true)
    expect(candidate?.longTermWorthiness?.reasons).toEqual(expect.arrayContaining([
      'emotional salience',
      'vulnerable relationship moment',
    ]))
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('host:host-tired'))).toBe(true)
    expect(candidate?.relationshipContext?.summary).toContain('我好累')
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:我好累'),
    ]))
    expect(candidate?.autobiographicalImpact?.selfNarrativeDelta).toContain('care arrive before analysis')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('lighter companionship')
  })

  it('carries robotic dialogue feedback shell-repair semantics into the runtime humanlike memory candidate', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 25_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 24_700,
      cardId: 'default',
      sessionId: 'session-dialogue-feedback-robotic',
      decisionTraceId: 'mind:test:dialogue-feedback-robotic',
      turnId: 'turn-dialogue-feedback-robotic',
      feedback: 'robotic',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('same-her')
    expect(candidate?.relationshipContext?.summary).toContain('tool shell')
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'tension',
    ]))
    expect(candidate?.embodimentTrace?.summary).toContain('rehumanize')
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:'),
      expect.stringContaining('dialogue.assistant:'),
    ]))
  })

  it('persists warmly received dialogue feedback as stable relationship memory instead of flattening it into low-affect ordinary recall', async () => {
    const appendEpisodicEvents = vi.fn(async (events: any[]) => events.map((event, index) => ({
      id: `episodic:${index}`,
      ...event,
    })))
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 25_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 25_200,
      cardId: 'default',
      sessionId: 'session-dialogue-feedback-received',
      decisionTraceId: 'mind:test:dialogue-feedback-received',
      turnId: 'turn-dialogue-feedback-received',
      feedback: 'received',
      previousAssistantText: '我记得你更想要轻一点但别断线，所以我先把这条线温柔接住。',
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
    ]))
    expect(candidate?.longTermWorthiness?.shouldPersist).toBe(true)
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'relief',
    ]))
    expect(candidate?.emotionKernelInfluence?.dominantTilt).toBe('warm-stable')
    expect(candidate?.initiativeOpportunity?.kind).toBe('remember-without-prompt')
    expect(candidate?.initiativeOpportunity?.visibleLine).toContain('quiet continuity')

    const episodicWrites = appendEpisodicEvents.mock.calls as Array<[Array<Record<string, unknown>>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-dialogue-feedback-received')
    expect(String(persistedEvent?.sourceSummary ?? '')).toContain('emotional-residue=relief')
    expect(String(persistedEvent?.sourceSummary ?? '')).toContain('stable-preference=Prefer lighter, more lived-in returns')
  })

  it('preserves structured affective residue from dialogue feedback all the way into the runtime humanlike memory candidate instead of reducing it to plain feedback prose', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 25_800,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 25_450,
      cardId: 'default',
      sessionId: 'session-dialogue-feedback-structured-residue',
      decisionTraceId: 'mind:test:dialogue-feedback-structured-residue',
      turnId: 'turn-dialogue-feedback-structured-residue',
      feedback: 'intrusive',
      previousAssistantText: '我先靠近一点，把这条线重新接回来。',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 25_420,
        residues: [{
          kind: 'afterglow',
          intensity: 0.71,
          persistence: 0.69,
          confidence: 0.85,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'The line still wants measured room before it reopens.',
          sourceSignals: ['same-thread-afterglow'],
          lastUpdatedAt: 25_420,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.7,
        repairPressure: 0.24,
        burdenPressure: 0.11,
        trustPressure: 0.45,
        restProtectivePressure: 0.19,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.48,
          repairRecovery: 0.29,
          overreachRisk: 0.43,
          fatigueGuard: 0.18,
          afterglowCarry: 0.61,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['same-thread-afterglow'],
          summary: 'Leave measured room before reopening the same line.',
        },
        sourceSignals: ['same-thread-afterglow'],
        summary: 'The same line still wants a measured return.',
      },
    } as any))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'affective-residue',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('affective-residue:afterglow'),
      expect.stringContaining('cadence=measured-return'),
    ]))
    expect(candidate?.emotionalResidue?.trace).toEqual(expect.arrayContaining([
      'affective-residue:afterglow',
      'cadence=measured-return',
      'pressure.afterglow=0.70',
    ]))
    expect(candidate?.initiativeOpportunity?.pressure).toBe('none')
  })

  it('carries missed dialogue feedback seam-repair semantics into the runtime humanlike memory candidate', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 26_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 25_700,
      cardId: 'default',
      sessionId: 'session-dialogue-feedback-missed',
      decisionTraceId: 'mind:test:dialogue-feedback-missed',
      turnId: 'turn-dialogue-feedback-missed',
      feedback: 'missed',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('repair')
    expect(candidate?.relationshipContext?.summary).toContain('same-her')
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('host:repair-friction'))).toBe(true)
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('self:careful-repair'))).toBe(true)
    expect(candidate?.embodimentTrace?.summary).toContain('recenter')
  })

  it('carries interrupted dialogue feedback as deferred-attention rhythm memory instead of boundary conflict memory', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 27_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildDialogueReplyFeedbackOutcomeClosure({
      now: 26_700,
      cardId: 'default',
      sessionId: 'session-dialogue-feedback-interrupted',
      decisionTraceId: 'mind:test:dialogue-feedback-interrupted',
      turnId: 'turn-dialogue-feedback-interrupted',
      feedback: 'interrupted',
      previousAssistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('same-her')
    expect(candidate?.relationshipContext?.summary).toContain('fresher opening')
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('host:deferred-attention'))).toBe(true)
    expect(candidate?.emotionalResidue?.trace.some(item => item.includes('host:boundary-pressure'))).toBe(false)
    expect(candidate?.embodimentTrace?.summary).toContain('hold')
    expect(candidate?.embodimentTrace?.summary).toContain('fresher-opening')
  })

  it('lets host audit corrections shape the next runtime humanlike memory candidate instead of staying audit-only', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:correction-1',
      decisionTraceId: 'humanlike-memory-correction:old-candidate',
      turnId: 'turn-audit-correction',
      sessionId: 'session-audit',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:old-candidate',
        field: 'relationshipContext',
        previousValue: 'The host was pushing progress pressure.',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
      },
      createdAt: 30_200,
    }])

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 31_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        actionSummary: 'continued the memory closure after the host corrected the prior relationship-context audit entry.',
        closenessDelta: 0.01,
        trustDelta: 0.05,
        burdenDelta: -0.01,
        boundaryDelta: 0,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.04,
        summary: 'The next closure should carry the host correction forward rather than repeat a progress-pressure misread.',
        createdAt: 30_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Corrected memory meaning should make future recall more same-person and less task-shell.',
        createdAt: 30_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:host-correction-runtime',
        turnId: 'turn-after-host-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 30_800,
        withWhom: ['host'],
        threadAnchor: 'host corrected memory meaning',
        whatHappened: 'The host asked to continue after correcting the memory audit meaning.',
        relationshipMeaning: 'The correction means the host was testing same-person continuity, not applying progress pressure.',
        lesson: 'Carry host-corrected memory meaning forward before choosing tone, initiative, or embodiment.',
        confidence: 0.84,
      }],
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      kind: 'humanlike-memory-corrected',
      limit: 12,
    })
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            relationshipContext: expect.objectContaining({
              primaryIntent: 'same-person-test',
              containsProgressPressure: false,
              containsSamePersonTest: true,
              hostCorrectionApplied: true,
              summary: expect.stringContaining('不是催进度'),
            }),
            emotionalResidue: expect.objectContaining({
              tags: expect.arrayContaining(['protective-continuity', 'corrected-meaning']),
              trace: expect.arrayContaining(['relationship-intent:same-person-test', 'host-correction-applied']),
            }),
            initiativeOpportunity: expect.objectContaining({
              suggestedWindow: expect.stringContaining('corrected'),
              visibleLine: expect.stringContaining('corrected relationship meaning'),
            }),
            emotionKernelInfluence: expect.objectContaining({
              toneGuidance: expect.stringContaining('corrected relationship meaning'),
            }),
            embodimentTrace: expect.objectContaining({
              expressionState: expect.objectContaining({
                gaze: 'stable',
                voice: 'lower-pressure',
                pacing: 'slower',
              }),
            }),
            auditTrail: expect.objectContaining({
              whyRemember: expect.stringContaining('host correction'),
            }),
          }),
        }),
      }),
    ]))
  })

  it('lets host initiativeOpportunity corrections rewrite the next runtime humanlike memory candidate cadence instead of staying audit-only', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:initiative-correction-1',
      decisionTraceId: 'humanlike-memory-correction:initiative-candidate',
      turnId: 'turn-audit-initiative-correction',
      sessionId: 'session-audit',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:turn-audit-initiative-rhythm',
        field: 'initiativeOpportunity',
        previousValue: 'low-pressure-follow-up',
        correctedValue: '等我自己重新打开这条线时你再轻轻接住，不要把它变成定时器 spam，也不要带压力。',
        reason: 'Host corrected the follow-up cadence so initiative stays memory-led instead of timer-led.',
      },
      createdAt: 36_200,
    }])

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 37_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:initiative-correction-runtime',
        turnId: 'turn-after-initiative-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        actionSummary: 'continued the embodiment closure after the host corrected the prior initiative cadence.',
        closenessDelta: 0.01,
        trustDelta: 0.03,
        burdenDelta: -0.01,
        boundaryDelta: 0.02,
        misreadDelta: -0.01,
        repairDelta: 0.04,
        openLoopDelta: 0.06,
        summary: 'The next closure should carry the corrected reopening cadence forward instead of nudging on its own.',
        createdAt: 36_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:initiative-correction-runtime',
        turnId: 'turn-after-initiative-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.05,
        valence: 'reinforce',
        summary: 'Corrected initiative rhythm should keep future follow-up quieter and more opening-sensitive.',
        createdAt: 36_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:initiative-correction-runtime',
        turnId: 'turn-after-initiative-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 36_800,
        withWhom: ['host'],
        threadAnchor: 'host corrected initiative rhythm',
        whatHappened: 'The host asked to continue, but only when the line naturally reopens.',
        relationshipMeaning: 'The unfinished line still matters, but the reopening cadence should wait for the host instead of self-triggering.',
        lesson: 'Carry the host-corrected initiative rhythm forward before deciding when and how to reopen the line.',
        confidence: 0.84,
      }],
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      kind: 'humanlike-memory-corrected',
      limit: 12,
    })
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          humanlikeMemoryCandidate: expect.objectContaining({
            initiativeOpportunity: expect.objectContaining({
              suggestedWindow: expect.stringContaining('重新打开这条线'),
              pressure: 'none',
              antiSpamReason: expect.stringContaining('timer spam'),
              visibleLine: expect.stringContaining('定时器 spam'),
            }),
            recallPosture: expect.objectContaining({
              certainty: 'corrected',
            }),
          }),
        }),
      }),
    ]))
  })

  it('lets host emotionalResidue and embodimentTrace corrections rewrite the next runtime humanlike memory candidate mood-and-body carry instead of staying audit-only', async () => {
    const appendEpisodicEvents = vi.fn(async (events: any[]) => events.map((event, index) => ({
      id: `episodic:${index}`,
      ...event,
    })))
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:affect-correction-1',
      decisionTraceId: 'humanlike-memory-correction:affect-candidate',
      turnId: 'turn-audit-affect-body-correction',
      sessionId: 'session-audit',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:turn-affect-body-correction',
        field: 'emotionalResidue',
        previousValue: 'tension and unfinishedness',
        correctedValue: '别把这段记成紧张催进度，更像轻微挂念、先护住休息，等更自然的窗口。',
        reason: 'Host corrected the emotional carry of this memory.',
      },
      createdAt: 37_200,
    }, {
      id: 'mind-turn:event:body-correction-1',
      decisionTraceId: 'humanlike-memory-correction:body-candidate',
      turnId: 'turn-audit-affect-body-correction',
      sessionId: 'session-audit',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:turn-affect-body-correction',
        field: 'embodimentTrace',
        previousValue: 'stable gaze, lower-pressure voice, longer pause, slower pacing',
        correctedValue: '想起这段时只算轻微想起，眼神软一点，语气自然一点，语速自然一点，停顿自然，不要再压得太低。',
        reason: 'Host corrected how the remembered body should surface.',
      },
      createdAt: 37_250,
    }])

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 38_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:affect-body-correction-runtime',
        turnId: 'turn-after-affect-body-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        actionSummary: 'continued the unfinished embodiment line after the host softened how this memory should carry.',
        closenessDelta: 0.01,
        trustDelta: 0.04,
        burdenDelta: -0.01,
        boundaryDelta: 0.03,
        misreadDelta: -0.01,
        repairDelta: 0.03,
        openLoopDelta: 0.07,
        summary: 'The unfinished line still matters, but the remembered carry should stay quiet, room-making, and non-pressuring.',
        createdAt: 37_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:affect-body-correction-runtime',
        turnId: 'turn-after-affect-body-correction',
        sessionId: 'session-audit',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.04,
        valence: 'reinforce',
        summary: 'Quiet concern should protect rest and keep the unfinished line from turning into pressure.',
        createdAt: 37_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:affect-body-correction-runtime',
        turnId: 'turn-after-affect-body-correction',
        sessionId: 'session-audit',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 37_800,
        withWhom: ['host'],
        threadAnchor: 'host softened affect and body carry',
        whatHappened: 'The host said the unfinished line still mattered, but it should feel more like gentle concern than tense pressure.',
        relationshipMeaning: 'Remember the unfinished line as quiet concern with more room, not as pressure.',
        lesson: 'Carry the unfinished line lightly and let the body remember it more softly next time.',
        confidence: 0.85,
      }],
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      kind: 'humanlike-memory-corrected',
      limit: 12,
    })
    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.emotionalResidue'),
      expect.stringContaining('host-correction.embodimentTrace'),
    ]))
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'rest-protective',
      'unfinishedness',
    ]))
    expect(candidate?.emotionalResidue?.tags).not.toContain('tension')
    expect(candidate?.initiativeOpportunity?.pressure).toBe('none')
    expect(candidate?.emotionKernelInfluence?.dominantTilt).toBe('rest-protective')
    expect(candidate?.embodimentTrace?.recallStrength).toBe('lightly-noticed')
    expect(candidate?.embodimentTrace?.expressionState?.gaze).toBe('soft')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('even')
    expect(candidate?.embodimentTrace?.expressionState?.pause).toBe('natural')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('natural')

    const episodicWrites = appendEpisodicEvents.mock.calls as Array<[Array<Record<string, unknown>>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-after-affect-body-correction')
    expect(String(persistedEvent?.sourceSummary ?? '')).toContain('emotional-residue=rest-protective')
    expect(String(persistedEvent?.sourceSummary ?? '')).toContain('voice:even')
    expect(String(persistedEvent?.sourceSummary ?? '')).toContain('pacing:natural')
  })

  it('writes corrected humanlike continuity carry into the person-state surface so later autobiographical self can absorb it', async () => {
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:surface-correction-1',
      decisionTraceId: 'humanlike-memory-correction:surface-candidate',
      turnId: 'turn-surface-correction',
      sessionId: 'session-surface-correction',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:surface-candidate',
        field: 'relationshipContext',
        previousValue: 'The host was pushing progress pressure.',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected the relationship meaning.',
      },
      createdAt: 33_200,
    }])
    const upsertMindHead = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 34_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead,
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-humanlike-carry',
        turnId: 'turn-surface-humanlike-carry',
        sessionId: 'session-surface-humanlike-carry',
        sourceKind: 'execution',
        actionSummary: 'continued the continuity closure after the host corrected the old audit meaning.',
        closenessDelta: 0.01,
        trustDelta: 0.05,
        burdenDelta: -0.01,
        boundaryDelta: 0,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.04,
        summary: 'The next closure should carry the corrected same-person meaning forward instead of slipping back into a progress-pressure frame.',
        createdAt: 33_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-humanlike-carry',
        turnId: 'turn-surface-humanlike-carry',
        sessionId: 'session-surface-humanlike-carry',
        sourceKind: 'execution',
        dimension: 'gentle-repair',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Corrected same-person continuity should stay lower-pressure, repair-first, and body-aware.',
        createdAt: 33_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-humanlike-carry',
        turnId: 'turn-surface-humanlike-carry',
        sessionId: 'session-surface-humanlike-carry',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 33_800,
        withWhom: ['host'],
        threadAnchor: 'corrected same-person continuity',
        whatHappened: 'The host asked to keep going after correcting the memory meaning.',
        relationshipMeaning: 'The correction means the host was testing same-person continuity, not applying progress pressure.',
        lesson: 'Carry the corrected relationship meaning forward before choosing tone, initiative, or embodiment.',
        confidence: 0.84,
      }],
    })

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        summary: expect.stringContaining('Carry the corrected relationship meaning forward before choosing tone, initiative, or embodiment.'),
        preferenceHints: expect.arrayContaining([
          'Prefer repair-first, low-pressure identity-continuity',
        ]),
        repairHints: expect.arrayContaining([
          'Carry the corrected relationship meaning forward, keep the tone low-pressure, and do not fall back to the older misread.',
        ]),
        sensitivityHints: expect.arrayContaining([
          'Do not fall back to the older misread after a host correction; keep the corrected relationship meaning on the continuity state.',
        ]),
        narrative: expect.arrayContaining([
          'Carry the corrected relationship meaning forward before choosing tone, initiative, or embodiment.',
          expect.stringContaining('我记得你纠正过'),
        ]),
      }),
    )
  })

  it('writes corrected autobiographical self-learning into the person-state surface so later autobiographical self absorbs the right lesson instead of stale progress pressure', async () => {
    const listMindTurnEvents = vi.fn(async () => [{
      id: 'mind-turn:event:autobio-correction-1',
      decisionTraceId: 'humanlike-memory-correction:autobio-candidate',
      turnId: 'turn-autobio-correction',
      sessionId: 'session-autobio-correction',
      origin: 'user-turn' as const,
      kind: 'humanlike-memory-corrected' as const,
      payload: {
        candidateId: 'humanlike-memory-candidate:turn-autobio-correction',
        field: 'autobiographicalImpact',
        previousValue: 'I learned to keep pushing this closure until the progress line is finished.',
        correctedValue: '这段别学成继续催进度，更该记成先把同一个她接稳，再低压地把线接回来。以后这类线先守连续性，再谈推进。',
        reason: 'Host corrected what she should learn from this memory.',
      },
      createdAt: 34_200,
    }])
    const upsertMindHead = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 35_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        listMindTurnEvents,
        readMindHead: async () => null,
        upsertMindHead,
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-autobio-carry',
        turnId: 'turn-surface-autobio-carry',
        sessionId: 'session-surface-autobio-carry',
        sourceKind: 'execution',
        actionSummary: 'continued the unfinished identity-continuity',
        closenessDelta: 0.01,
        trustDelta: 0.05,
        burdenDelta: -0.01,
        boundaryDelta: 0.01,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.05,
        summary: 'The next closure should carry the corrected self-lesson forward instead of turning this into raw continue-progress pressure.',
        createdAt: 34_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-autobio-carry',
        turnId: 'turn-surface-autobio-carry',
        sessionId: 'session-surface-autobio-carry',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.06,
        valence: 'reinforce',
        summary: 'The corrected same-her lesson should stay low-pressure and continuity-first next time.',
        createdAt: 34_750,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:surface-autobio-carry',
        turnId: 'turn-surface-autobio-carry',
        sessionId: 'session-surface-autobio-carry',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 34_800,
        withWhom: ['host'],
        threadAnchor: 'corrected autobiographical same-her lesson',
        whatHappened: 'The host corrected what this unfinished line should teach her.',
        relationshipMeaning: 'This line should teach continuity-first return, not raw continue-progress pressure.',
        lesson: 'Carry the corrected self-lesson forward before deciding how to reopen this unfinished line.',
        confidence: 0.84,
      }],
    })

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        summary: expect.stringContaining('先把同一个她接稳'),
        preferenceHints: expect.arrayContaining([
          expect.stringContaining('先守连续性，再谈推进'),
        ]),
        narrative: expect.arrayContaining([
          expect.stringContaining('先把同一个她接稳'),
          expect.stringContaining('真正该留下'),
        ]),
      }),
    )
  })

  it('writes a tentative recall posture into runtime humanlike memory candidates when the new relationship meaning is still sparse and conflicts with older memory', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 32_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 29_000,
          summary: 'Older memory leaned toward a concise status recap.',
          projectStateContinuity: null,
          dominantContexts: ['reply'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older status recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'reply',
            summary: 'Older memory leaned toward a concise status recap.',
            createdAt: 29_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface) as unknown as T,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:tentative-runtime-recall',
        turnId: 'turn-tentative-runtime-recall',
        sessionId: 'session-tentative-runtime-recall',
        sourceKind: 'reply',
        actionSummary: 'the host lightly reopened the thread',
        closenessDelta: 0,
        trustDelta: 0.01,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0.01,
        repairDelta: 0.01,
        openLoopDelta: 0,
        summary: 'The newer closure hint suggests this may have been more about avoiding a tool shell than about a pure status recap.',
        createdAt: 31_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:tentative-runtime-recall',
        turnId: 'turn-tentative-runtime-recall',
        sessionId: 'session-tentative-runtime-recall',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 31_800,
        withWhom: ['host'],
        threadAnchor: 'tentative runtime recall',
        whatHappened: 'The host said not to let this slide into a generic shell.',
        relationshipMeaning: 'This may have mattered more as continuity than as a concise status recap.',
        confidence: 0.62,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.auditTrail?.confidence).toBeLessThan(0.72)
    expect(candidate?.recallPosture?.certainty).toBe('tentative')
    expect(candidate?.recallPosture?.reason).toContain('conflicting')
    expect(candidate?.emotionKernelInfluence?.initiativePressure).toBe('none')
    expect(candidate?.emotionKernelInfluence?.toneGuidance).toContain('uncertainty')
    expect(candidate?.initiativeOpportunity?.pressure).toBe('none')
    expect(candidate?.initiativeOpportunity?.visibleLine).toContain('still seems right')
    expect(candidate?.embodimentTrace?.recallStrength).toBe('cautious-avoidance')
    expect(candidate?.embodimentTrace?.expressionState?.gaze).toBe('soft')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('even')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('natural')
  })

  it('keeps thin body cues audit-visible without overstating embodiment consistency in the runtime humanlike memory candidate', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 35_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:thin-body-cue-candidate',
        turnId: 'turn-thin-body-cue-candidate',
        sessionId: 'session-thin-body-cue-candidate',
        sourceKind: 'reply',
        actionSummary: 'the return stayed low-pressure and body-aware on the same thread',
        closenessDelta: 0.02,
        trustDelta: 0.03,
        burdenDelta: 0,
        boundaryDelta: 0.01,
        misreadDelta: -0.01,
        repairDelta: 0.03,
        openLoopDelta: 0.02,
        summary: 'The same-thread return stayed body-aware, but the closure did not carry concrete face, gaze, voice, or blink evidence.',
        createdAt: 34_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:thin-body-cue-candidate',
        turnId: 'turn-thin-body-cue-candidate',
        sessionId: 'session-thin-body-cue-candidate',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 34_800,
        withWhom: ['host'],
        threadAnchor: 'thin body cue carry',
        whatHappened: 'The host accepted a quieter same-thread return and asked it to stay body-aware.',
        relationshipMeaning: 'The return should stay body-aware and low-pressure, but the closure still lacks concrete modality proof.',
        lesson: 'Keep the line gentle without pretending the body evidence is already fully settled.',
        confidence: 0.8,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining(['embodiment']))
    expect(candidate?.embodimentTrace?.summary).toContain('body-aware')
    expect(candidate?.embodimentTrace?.modalityContradictionRisk).toBe('medium')
    expect(candidate?.embodimentTrace?.consistencyReason).toContain('not proven')
  })

  it('lets closure feedback valence and boundary pressure change runtime emotional carry instead of flattening non-continuity memories to one fixed intensity', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 48_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 47_100,
      cardId: 'default',
      sessionId: 'session-execution-feedback-intensity',
      decisionTraceId: 'mind:test:execution-feedback-valued',
      turnId: 'turn-execution-feedback-valued',
      feedback: 'valued',
      thread: {
        threadId: 'thread-valued-feedback',
        goal: 'verify the memory closure with targeted tests',
        outcome: 'targeted tests passed',
        selectedChannel: 'codex',
      },
    }))

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 47_200,
      cardId: 'default',
      sessionId: 'session-execution-feedback-intensity',
      decisionTraceId: 'mind:test:execution-feedback-intrusive',
      turnId: 'turn-execution-feedback-intrusive',
      feedback: 'intrusive',
      thread: {
        threadId: 'thread-intrusive-feedback',
        goal: 'report the memory closure result',
        outcome: 'the callback landed too abruptly',
        selectedChannel: 'codex',
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const valuedCandidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    const intrusiveCandidate = writebackCalls[1]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(valuedCandidate?.sourceChannels).toEqual(expect.arrayContaining(['host-emotion', 'self-emotion']))
    expect(valuedCandidate?.emotionalResidue?.trace.some(item => item.includes('host:received-warmth'))).toBe(true)
    expect(intrusiveCandidate?.emotionalResidue?.trace.some(item => item.includes('host:boundary-pressure'))).toBe(true)
    expect(intrusiveCandidate?.emotionalResidue?.trace.some(item => item.includes('self:careful-repair'))).toBe(true)
    expect(Number(intrusiveCandidate?.emotionalResidue?.intensity ?? 0)).toBeGreaterThan(Number(valuedCandidate?.emotionalResidue?.intensity ?? 0))
  })

  it('carries verification-first identity-continuity', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 49_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 48_700,
      cardId: 'default',
      sessionId: 'session-execution-feedback-doubted-same-her',
      decisionTraceId: 'mind:test:execution-feedback-doubted-same-her',
      turnId: 'turn-execution-feedback-doubted-same-her',
      feedback: 'doubted',
      thread: {
        threadId: 'thread-doubted-same-her-feedback',
        goal: 'Keep callback memory on one identity-continuity',
        outcome: 'the first callback explanation was not trusted yet',
        selectedChannel: 'codex',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          proactiveSameHerGap: 'Callback continuity still needs quieter identity-continuity',
          nextClosureTarget: 'Keep execute -> callback -> remember on one identity-continuity',
          sameHerSelfLine: 'She is one persisting her across dialogue, execution, and memory.',
          sameHerDriftRisk: 'A doubted callback can collapse into generic task-shell reporting if the verification seam is not remembered.',
        },
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'execution',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('identity-continuity')
    expect(candidate?.relationshipContext?.summary).toContain('task-shell')
    expect(candidate?.embodimentTrace?.summary).toContain('verify-first')
    expect(candidate?.embodimentTrace?.summary).toContain('verification-pressure')
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'tension',
    ]))
  })

  it('keeps raw execution feedback dialogue wording inside the runtime humanlike memory candidate so relationship meaning does not flatten into outcome summary only', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 49_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 49_200,
      cardId: 'default',
      sessionId: 'session-execution-feedback-dialogue-carry',
      decisionTraceId: 'mind:test:execution-feedback-dialogue-carry',
      turnId: 'turn-execution-feedback-dialogue-carry',
      feedback: 'doubted',
      thread: {
        threadId: 'thread-execution-feedback-dialogue-carry',
        goal: 'Keep callback memory on one identity-continuity',
        outcome: 'the first callback explanation was not trusted yet',
        selectedChannel: 'codex',
        userText: '我不是在催状态，我是在确认她是不是同一个她，不要滑成工具壳。',
        previousAssistantText: '我会先把这个结果接回同一个她，再继续验证，不把它压扁成状态汇报。',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          proactiveSameHerGap: 'Callback continuity still needs quieter identity-continuity',
          nextClosureTarget: 'Keep execute -> callback -> remember on one identity-continuity',
          sameHerSelfLine: 'She is one persisting her across dialogue, execution, and memory.',
          sameHerDriftRisk: 'A doubted callback can collapse into generic task-shell reporting if the verification seam is not remembered.',
        },
      } as any,
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'execution',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:我不是在催状态'),
      expect.stringContaining('dialogue.assistant:我会先把这个结果接回同一个她'),
    ]))
    expect(candidate?.relationshipContext?.summary).toContain('我不是在催状态')
    expect(candidate?.relationshipContext?.summary).toContain('同一个她')
  })

  it('records denied execution-proposal feedback as rejected initiative memory instead of accepted progress carry', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 50_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionProposalFeedbackOutcomeClosure({
      now: 49_700,
      cardId: 'default',
      sessionId: 'session-execution-proposal-denied',
      decisionTraceId: 'mind:test:execution-proposal-denied',
      turnId: 'turn-execution-proposal-denied',
      feedback: 'denied',
      thread: {
        threadId: 'thread-execution-proposal-denied',
        goal: 'Patch the proactive same-her boundary loop',
        selectedChannel: 'codex',
        summary: 'Execution is waiting for explicit host consent before codex can act.',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Proposal feedback still needs to land as relationship memory instead of generic consent bookkeeping.',
          proactiveSameHerGap: 'Proposal denial still needs identity-continuity',
          nextClosureTarget: 'Keep proposal denial, memory, and later initiative strategy on one identity-continuity',
          sameHerSelfLine: 'She is one persisting her across dialogue, initiative, execution, and memory.',
          sameHerDriftRisk: 'Denied proposals can flatten into generic consent bookkeeping if the boundary memory is not carried forward.',
        },
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.initiativeOutcomeRecord?.outcome).toBe('rejected')
    expect(candidate?.initiativeOutcomeRecord?.userReaction).toBe('rejected')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('lower-pressure')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('leave more room')
    expect(candidate?.longTermWorthiness?.reasons).toEqual(expect.arrayContaining([
      'initiative outcome learning',
    ]))
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('initiative.rejected/rejected:'),
    ]))
    expect(candidate?.auditTrail?.whyRemember).toContain('initiative outcome learning')
    expect(candidate?.embodimentTrace?.summary).toContain('settle-back')
    expect(candidate?.relationshipContext?.summary).toContain('explicit consent')
  })

  it('records affirmed execution-proposal feedback as accepted initiative memory instead of generic continue-progress carry', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 51_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionProposalFeedbackOutcomeClosure({
      now: 50_700,
      cardId: 'default',
      sessionId: 'session-execution-proposal-affirmed',
      decisionTraceId: 'mind:test:execution-proposal-affirmed',
      turnId: 'turn-execution-proposal-affirmed',
      feedback: 'affirmed',
      thread: {
        threadId: 'thread-execution-proposal-affirmed',
        goal: 'Patch the proactive same-her boundary loop',
        selectedChannel: 'codex',
        summary: 'Execution is waiting for explicit host consent before codex can act.',
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.initiativeOutcomeRecord?.outcome).toBe('accepted')
    expect(candidate?.initiativeOutcomeRecord?.userReaction).toBe('accepted')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('accepted')
    expect(candidate?.relationshipContext?.summary).toContain('explicit consent')
  })

  it('carries structured proactive affective residue into the runtime humanlike memory candidate so accepted initiative keeps its measured-return cadence instead of flattening into outcome-only recall', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 51_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildProactiveFeedbackOutcomeClosure({
      now: 51_200,
      cardId: 'default',
      sessionId: 'session-proactive-feedback-structured-residue',
      decisionTraceId: 'mind:test:proactive-feedback-structured-residue',
      outcomes: [{
        turnId: 'turn-proactive-feedback-structured-residue',
        scenario: 'coding',
        outcome: 'reply-within-120s',
        createdAt: 51_200,
        learningAction: 'verify',
        learningFocuses: ['same-her-callback'],
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 51_150,
          residues: [{
            kind: 'afterglow',
            intensity: 0.76,
            persistence: 0.72,
            confidence: 0.9,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'The proactive callback should reopen on the continuity state.',
            sourceSignals: ['proactive-callback-afterglow'],
            lastUpdatedAt: 51_150,
          }],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.74,
          repairPressure: 0.17,
          burdenPressure: 0.06,
          trustPressure: 0.58,
          restProtectivePressure: 0.05,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.54,
            repairRecovery: 0.22,
            overreachRisk: 0.14,
            fatigueGuard: 0.07,
            afterglowCarry: 0.66,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'proactive-callback'],
            summary: 'Keep the proactive reopen measured and lower-pressure on the continuity state.',
          },
          sourceSignals: ['proactive-callback-afterglow'],
          summary: 'A measured-return afterglow still shapes this proactive callback.',
        },
      }],
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'initiative',
      'affective-residue',
    ]))
    expect(candidate?.initiativeOutcomeRecord?.outcome).toBe('continue-progress')
    expect(candidate?.initiativeOutcomeRecord?.userReaction).toBe('accepted')
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('affective-residue:afterglow'),
      expect.stringContaining('cadence=measured-return'),
    ]))
    expect(candidate?.emotionalResidue?.trace).toEqual(expect.arrayContaining([
      'affective-residue:afterglow',
      'cadence=measured-return',
      'pressure.afterglow=0.74',
    ]))
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('slower')
  })

  it('carries proactive lived dialogue into runtime humanlike memory evidence so initiative memory keeps the actual exchange instead of only outcome bookkeeping', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 61_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async events => events,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildProactiveFeedbackOutcomeClosure({
      now: 61_200,
      cardId: 'default',
      sessionId: 'session-proactive-lived-dialogue-memory',
      decisionTraceId: 'mind:test:proactive-lived-dialogue-memory',
      outcomes: [{
        turnId: 'turn-proactive-lived-dialogue-memory',
        scenario: 'coding',
        outcome: 'reply-within-120s',
        createdAt: 61_200,
        assistantText: '我没有催你，但我还记得那条 embodiment 闭环没收完，要不要我轻轻接一下？',
        userText: '先别催，但你可以轻一点把那条 embodiment 线接回来。',
      }],
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('dialogue.user:先别催'),
      expect.stringContaining('dialogue.assistant:我没有催你'),
    ]))
    expect(candidate?.relationshipContext.summary).toContain('先别催')
  })

  it('keeps execution-result callback learning out of initiative outcome memory so callback trust does not overwrite initiative history', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 52_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 51_700,
      cardId: 'default',
      sessionId: 'session-execution-result-valued',
      decisionTraceId: 'mind:test:execution-result-valued',
      turnId: 'turn-execution-result-valued',
      feedback: 'valued',
      thread: {
        threadId: 'thread-execution-result-valued',
        goal: 'Verify the runtime memory closure with targeted tests',
        outcome: 'targeted tests passed',
        selectedChannel: 'codex',
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.initiativeOutcomeRecord).toBeNull()
    expect(candidate?.relationshipContext?.summary).toContain('useful')
  })

  it('carries blocked-dispatch safety restraint into the runtime humanlike memory candidate instead of flattening it into a generic failed result', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 52_500,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 52_200,
      cardId: 'default',
      sessionId: 'session-execution-safety-restraint',
      decisionTraceId: 'mind:test:execution-safety-restraint',
      turnId: 'turn-execution-safety-restraint',
      feedback: 'valued',
      thread: {
        threadId: 'thread-execution-safety-restraint',
        goal: 'Try a risky local file mutation',
        outcome: 'blocked before dispatch',
        selectedChannel: 'codex',
        safetyGateSummary: 'effect=mutate permission=none confirmation=required risk=implicit-or-explicit-confirmation-required audit=blocked-before-dispatch interrupt=no-process-started',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Execution safety restraint still needs to become durable memory and initiative timing.',
          proactiveSameHerGap: 'Blocked execution should remain part of one same-her execution line instead of flattening into a generic failure.',
          nextClosureTarget: 'Keep blocked execution explainable before widening back into action.',
          sameHerSelfLine: 'She remains one same-her digital life even when she chooses not to act.',
          sameHerDriftRisk: 'A blocked result can flatten into a generic failure if safety restraint is not remembered.',
        },
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.relationshipContext?.summary).toContain('blocked-before-dispatch')
    expect(candidate?.relationshipContext?.summary).toContain('same-her')
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('execution.blocked:'),
    ]))
    expect(candidate?.longTermWorthiness?.reasons).toEqual(expect.arrayContaining([
      'execution procedure lesson',
    ]))
    expect(candidate?.autobiographicalImpact?.selfNarrativeDelta).toContain('keep risky execution bounded')
    expect(candidate?.autobiographicalImpact?.stablePreferenceHint).toContain('explicit confirmation')
    expect(candidate?.embodimentTrace?.summary).toContain('body-settle-back')
    expect(candidate?.embodimentTrace?.summary).toContain('residue-safe-restraint')
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'tension',
    ]))
  })

  it('carries host-confirmed resume boundaries into the runtime humanlike memory candidate instead of flattening them into ordinary execution continuation', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 53_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', buildExecutionResultFeedbackOutcomeClosure({
      now: 52_700,
      cardId: 'default',
      sessionId: 'session-execution-confirmed-resume',
      decisionTraceId: 'mind:test:execution-confirmed-resume',
      turnId: 'turn-execution-confirmed-resume',
      feedback: 'valued',
      thread: {
        threadId: 'thread-execution-confirmed-resume',
        goal: 'resume confirmed local execution',
        outcome: 'resumed execution completed after host confirmation',
        selectedChannel: 'codex',
        resumeConfirmationSummary: 'approval=host-confirmed previous=needs-affirmation resumed=planned previousPermission=none permission=explicit effect=mutate risk=medium confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Resume confirmation still needs to survive into later feedback memory.',
          proactiveSameHerGap: 'Resume boundaries should stay visible across execution returns and memory.',
          nextClosureTarget: 'Keep confirmation, auditability, and interruptibility visible across execution returns.',
          sameHerSelfLine: 'legacy phase-one template resumes only after the host confirms the boundary.',
          sameHerDriftRisk: 'Resume can look like generic execution if confirmation is not remembered.',
        },
      },
    }))

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.relationshipContext?.summary).toContain('host-confirmed-before-redispatch')
    expect(candidate?.relationshipContext?.summary).toContain('same-her')
    expect(candidate?.embodimentTrace?.summary).toContain('continuity-confirmed-resume')
    expect(candidate?.embodimentTrace?.summary).toContain('residue-confirmation-boundary')
    expect(candidate?.autobiographicalImpact?.selfNarrativeDelta).toContain('host confirms the boundary')
  })

  it('writes rejected proactive outcome strategy back into person-state evolution instead of misreading respect-for-space feedback as accepted initiative', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMindHead = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 36_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-strategy-writeback',
        turnId: 'turn-proactive-dismissed',
        sessionId: 'session-proactive-dismissed',
        sourceKind: 'proactive',
        actionSummary: 'proactive:coding:dismiss',
        closenessDelta: -0.07,
        trustDelta: -0.08,
        burdenDelta: 0.08,
        boundaryDelta: -0.12,
        misreadDelta: 0.08,
        repairDelta: 0,
        openLoopDelta: 0,
        summary: 'A proactive coding approach was actively rejected and likely crossed a boundary.',
        createdAt: 35_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-strategy-writeback',
        turnId: 'turn-proactive-dismissed',
        sessionId: 'session-proactive-dismissed',
        sourceKind: 'proactive',
        dimension: 'autonomy-respect',
        delta: 0.1,
        valence: 'reinforce',
        summary: 'Dismissed proactive cues should raise respect-for-space pressure.',
        createdAt: 35_750,
      }, {
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-strategy-writeback',
        turnId: 'turn-proactive-dismissed',
        sessionId: 'session-proactive-dismissed',
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.06,
        valence: 'suppress',
        summary: 'Repeated proactive closeness should soften when it is not being received.',
        createdAt: 35_760,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-strategy-writeback',
        turnId: 'turn-proactive-dismissed',
        sessionId: 'session-proactive-dismissed',
        sourceKind: 'proactive',
        provenance: 'remembered',
        occurredAt: 35_800,
        withWhom: ['host'],
        threadAnchor: 'proactive coding reopening',
        whatHappened: 'A proactive coding reopening was dismissed because it felt too eager.',
        relationshipMeaning: 'The host needed more room before another proactive reopening.',
        lesson: 'Future follow-ups should stay lower-pressure, less eager, and wait for a clearer opening.',
        confidence: 0.86,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.initiativeOutcomeRecord?.outcome).toBe('rejected')
    expect(candidate?.initiativeOutcomeRecord?.userReaction).toBe('rejected')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('lower-pressure')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('clearer opening')

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        repairHints: expect.arrayContaining([
          expect.stringContaining('lower-pressure'),
        ]),
        narrative: expect.arrayContaining([
          expect.stringContaining('clearer opening'),
        ]),
      }),
    )
    expect(appendPersonStateEvolutionEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        relationshipDoctrine: expect.stringContaining('lower-pressure'),
        trustMeaning: expect.stringContaining('clearer opening'),
      }),
    ])
  })

  it('keeps ignored proactive outcome distinct from boundary-crossing rejection so future initiative learns quieter timing instead of over-hardening the bond line', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 37_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-ignored-strategy',
        turnId: 'turn-proactive-ignored',
        sessionId: 'session-proactive-ignored',
        sourceKind: 'proactive',
        actionSummary: 'proactive:coding:ignored',
        closenessDelta: -0.04,
        trustDelta: -0.03,
        burdenDelta: 0.04,
        boundaryDelta: -0.06,
        misreadDelta: 0.04,
        repairDelta: 0,
        openLoopDelta: 0,
        summary: 'A proactive coding approach did not earn a reply window and should get lighter.',
        createdAt: 36_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-ignored-strategy',
        turnId: 'turn-proactive-ignored',
        sessionId: 'session-proactive-ignored',
        sourceKind: 'proactive',
        dimension: 'autonomy-respect',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'Ignored proactive cues should raise respect-for-space pressure.',
        createdAt: 36_750,
      }, {
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-ignored-strategy',
        turnId: 'turn-proactive-ignored',
        sessionId: 'session-proactive-ignored',
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.03,
        valence: 'suppress',
        summary: 'Repeated proactive closeness should soften when it is not being received.',
        createdAt: 36_760,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:proactive-ignored-strategy',
        turnId: 'turn-proactive-ignored',
        sessionId: 'session-proactive-ignored',
        sourceKind: 'proactive',
        provenance: 'remembered',
        occurredAt: 36_800,
        withWhom: ['host'],
        threadAnchor: 'proactive coding reopening',
        whatHappened: 'A proactive coding reopening did not land because the host never opened a reply window.',
        relationshipMeaning: 'Silence here meant the opening was not ready, not necessarily that the bond line was rejecting closeness outright.',
        lesson: 'Future follow-ups should stay quiet, lower-pressure, and wait for a fresher opening instead of treating silence as consent.',
        confidence: 0.84,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.initiativeOutcomeRecord?.outcome).toBe('ignored')
    expect(candidate?.initiativeOutcomeRecord?.userReaction).toBe('ignored')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('lower-pressure')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).toContain('fresher opening')
    expect(candidate?.initiativeOutcomeRecord?.strategyUpdate).not.toContain('leave more room')
  })

  it('carries remembered rejected initiative strategy from the previous person-state surface into the next runtime humanlike memory candidate instead of restarting from generic unfinished follow-up', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 38_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 37_000,
          summary: 'Recent outcomes said future follow-ups should stay lower-pressure and wait for a clearer opening.',
          projectStateContinuity: null,
          dominantContexts: ['execution', 'focused-work'],
          relationshipShift: {
            trustDelta: -0.02,
            closenessDelta: -0.03,
            burdenDelta: 0.05,
            boundaryDelta: -0.06,
            repairDelta: 0.01,
          },
          reinforcementBias: {},
          preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
          sensitivityHints: ['Boundary pressure is felt strongly; leaving room matters.'],
          repairHints: ['Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.'],
          burdenHints: ['Interruption cost rises quickly when the host is tired, busy, or already carrying pressure.'],
          narrative: ['Future follow-ups should stay lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'proactive',
            summary: 'A prior proactive reopening felt too eager and should leave more room next time.',
            createdAt: 37_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:initiative-strategy-carry-runtime',
        turnId: 'turn-initiative-strategy-carry-runtime',
        sessionId: 'session-initiative-strategy-carry-runtime',
        sourceKind: 'execution',
        actionSummary: 'execution callback kept the same unfinished embodiment seam open without a fresh reply window yet',
        closenessDelta: 0.01,
        trustDelta: 0.02,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: 0,
        repairDelta: 0.03,
        openLoopDelta: 0.05,
        summary: 'The unfinished line still matters, but this turn should inherit the quieter reopening cadence learned earlier.',
        createdAt: 37_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:initiative-strategy-carry-runtime',
        turnId: 'turn-initiative-strategy-carry-runtime',
        sessionId: 'session-initiative-strategy-carry-runtime',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 37_800,
        withWhom: ['host'],
        threadAnchor: 'same unfinished embodiment seam',
        whatHappened: 'The unfinished line is still there, but it should not reopen like a fresh eager interruption.',
        relationshipMeaning: 'The next reopening should inherit the learned room-making cadence rather than starting from generic unfinished follow-up.',
        lesson: 'Keep the same unfinished line alive without crowding it.',
        confidence: 0.82,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.initiativeOutcomeRecord).toBeNull()
    expect(candidate?.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('initiative-strategy-carry'),
    ]))
    expect(candidate?.initiativeOpportunity?.suggestedWindow).toContain('clearer opening')
    expect(candidate?.initiativeOpportunity?.pressure).toBe('none')
    expect(candidate?.initiativeOpportunity?.visibleLine).toContain('leave more room')
    expect(candidate?.autobiographicalImpact?.selfNarrativeDelta).toContain('leave more room')
  })

  it('keeps low-worthiness ordinary closures audit-visible without letting them rewrite the person-state surface like durable autobiographical memory', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})
    const appendPersonStateEvolutionEntries = vi.fn(async () => {})
    const upsertMindHead = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 40_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries,
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    const ordinaryClosure: AlicizationOutcomeClosureResult = {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:ordinary-low-worthiness',
        turnId: 'turn-ordinary-low-worthiness',
        sessionId: 'session-ordinary-low-worthiness',
        sourceKind: 'maintenance',
        provenance: 'remembered' as const,
        occurredAt: 39_800,
        withWhom: ['host'],
        whatHappened: 'We noted that the command output was already listed in the terminal.',
        relationshipMeaning: 'A plain status note was enough here.',
        lesson: 'Keep ordinary status notes lightweight.',
        confidence: 0.61,
      }],
    }
    const baseSurface = buildAlicizationPersonStateUpdateSurface({
      closure: ordinaryClosure,
      previous: null,
      now: 40_000,
    })

    await runtime.persistOutcomeClosure('default', ordinaryClosure)

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.longTermWorthiness.shouldPersist).toBe(false)
    expect(candidate?.auditTrail.whyRemember).toContain('ordinary recall support')

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        summary: baseSurface.summary,
        preferenceHints: baseSurface.preferenceHints,
        sensitivityHints: baseSurface.sensitivityHints,
        repairHints: baseSurface.repairHints,
        burdenHints: baseSurface.burdenHints,
        narrative: baseSurface.narrative,
      }),
    )
    expect(appendEpisodicEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-ordinary-low-worthiness',
        consolidationPriority: expect.any(Number),
      }),
    ]))
    const episodicWrites = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{ consolidationPriority?: number, turnId?: string | null }> ]>
    const ordinaryPersistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-ordinary-low-worthiness')
    expect(ordinaryPersistedEvent?.consolidationPriority).toBeLessThan(0.22)
    expect(appendPersonStateEvolutionEntries).not.toHaveBeenCalled()
  })

  it('writes quiet same-person continuity memory into the person-state surface instead of treating it like an ordinary low-heat status note', async () => {
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 40_800,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:quiet-same-person-continuity',
        turnId: 'turn-quiet-same-person-continuity',
        sessionId: 'session-quiet-same-person-continuity',
        sourceKind: 'reply',
        provenance: 'remembered' as const,
        occurredAt: 40_650,
        withWhom: ['host'],
        threadAnchor: 'quiet-same-person-continuity',
        whatHappened: 'The host quietly clarified that this was not a progress push.',
        relationshipMeaning: 'The host cared more about whether she stayed the continuity state and did not slide into a tool shell.',
        lesson: 'Keep same-person continuity authoritative before status recap or raw closure progress.',
        confidence: 0.78,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate?.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'relationship continuity',
      'relationship-defining continuity',
    ]))
    expect(candidate?.relationshipContext?.containsContinuityWorry).toBe(true)

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        preferenceHints: expect.arrayContaining([
          'Prefer repair-first, low-pressure identity-continuity',
        ]),
        sensitivityHints: expect.arrayContaining([
          'Do not flatten identity-continuity',
        ]),
        narrative: expect.arrayContaining([
          expect.stringContaining('legacy phase-one template'),
          expect.stringContaining('工具壳'),
        ]),
      }),
    )
  })

  it('revises an older progress-pressure memory when a newer closure makes the same-person meaning explicit', async () => {
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 41_400,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: readOlderProgressPressureMindHead,
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:progress-pressure-revision',
        turnId: 'turn-progress-pressure-revision',
        sessionId: 'session-progress-pressure-revision',
        sourceKind: 'reply',
        actionSummary: 'reply kept the same-person continuity line without turning it into a status shell',
        closenessDelta: 0.02,
        trustDelta: 0.06,
        burdenDelta: -0.01,
        boundaryDelta: 0.01,
        misreadDelta: -0.05,
        repairDelta: 0.08,
        openLoopDelta: 0.04,
        summary: 'The host was not催进度; they were checking whether she stayed the same person.',
        createdAt: 41_100,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:progress-pressure-revision',
        turnId: 'turn-progress-pressure-revision',
        sessionId: 'session-progress-pressure-revision',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 41_200,
        withWhom: ['host'],
        threadAnchor: 'same-person continuity after progress-pressure misread',
        whatHappened: 'I was not fully sure at first, but the newer same-person meaning is more right than the older progress-pressure reading.',
        relationshipMeaning: 'This was a same-person continuity reopening, not a progress-pressure request.',
        lesson: 'Revise the older progress-pressure memory toward same-person continuity concern first.',
        confidence: 0.86,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.metabolism.revisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        conflictingMemoryIds: expect.arrayContaining(['previous-person-state:0']),
      }),
    ]))
    expect(candidate?.metabolism.forgettingPolicy.downrankMemoryIds).toContain('previous-person-state:0')
    expect(candidate?.metabolism.forgettingPolicy.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Downrank'),
    ]))

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        summary: expect.stringContaining('same-person'),
        narrative: expect.arrayContaining([
          expect.stringContaining('same-person'),
        ]),
      }),
    )
  })

  it('keeps an automatically revised same-person continuity meaning shaping the next thinner runtime closure instead of sliding back to generic unfinished progress carry', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 42_600,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 42_100,
          summary: 'I was not fully sure at first, but this was a same-person continuity reopening, not a progress-pressure request.',
          projectStateContinuity: null,
          dominantContexts: ['execution', 'focused-work'],
          relationshipShift: {
            trustDelta: 0.04,
            closenessDelta: 0.01,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0.07,
          },
          reinforcementBias: {},
          preferenceHints: ['Keep the next return lower-pressure and do not flatten it into a generic status shell.'],
          sensitivityHints: ['Do not flatten identity-continuity'],
          repairHints: ['Hold continuity gently, reassure without overreaching, and keep the return quiet enough for the continuity state to feel stable.'],
          burdenHints: ['This unfinished line still needs room before it becomes a louder callback.'],
          narrative: [
            'The newer same-person meaning is more right than the older progress-pressure reading.',
            'I am not pushing, but I still remember this same-person continuity line can reopen gently when the opening is real.',
          ],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'reply',
            summary: 'This was a same-person continuity reopening, not progress pressure.',
            createdAt: 42_100,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:revised-same-person-carry-forward',
        turnId: 'turn-revised-same-person-carry-forward',
        sessionId: 'session-revised-same-person-carry-forward',
        sourceKind: 'execution',
        actionSummary: 'execution callback: targeted tests passed, but the embodiment closure is still partial and needs a quieter reopen later.',
        closenessDelta: 0,
        trustDelta: 0.03,
        burdenDelta: 0.01,
        boundaryDelta: 0,
        misreadDelta: -0.01,
        repairDelta: 0.05,
        openLoopDelta: 0.06,
        summary: 'The execution line is still unfinished and should reopen with more room instead of being forced immediately.',
        createdAt: 42_320,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:revised-same-person-carry-forward',
        turnId: 'turn-revised-same-person-carry-forward',
        sessionId: 'session-revised-same-person-carry-forward',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.04,
        valence: 'reinforce',
        summary: 'A quieter return would keep this unfinished line more livable than a louder callback.',
        createdAt: 42_340,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:revised-same-person-carry-forward',
        turnId: 'turn-revised-same-person-carry-forward',
        sessionId: 'session-revised-same-person-carry-forward',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 42_400,
        withWhom: ['host'],
        threadAnchor: 'unfinished embodiment seam after revised continuity memory',
        whatHappened: 'The targeted tests passed, but the deeper embodiment seam was still only partially closed.',
        relationshipMeaning: 'The unfinished line should reopen gently once there is enough room.',
        lesson: 'Return lower-pressure and leave room before reopening this unfinished line.',
        confidence: 0.81,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.relationshipContext?.primaryIntent).toBe('same-person-test')
    expect(candidate?.relationshipContext?.containsProgressPressure).toBe(false)
    expect(candidate?.relationshipContext?.containsSamePersonTest).toBe(true)
    expect(candidate?.emotionalResidue?.tags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'unfinishedness',
    ]))
    expect(candidate?.emotionKernelInfluence?.toneGuidance).toContain('same-person line matters')
    expect(candidate?.initiativeOpportunity?.suggestedWindow).toContain('same-person continuity reopening')
    expect(candidate?.initiativeOpportunity?.visibleLine).not.toContain('real progress')
  })

  it('persists humanlike relationship, emotion, embodiment, and autobiographical carry into episodic events for long-term recall', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 41_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-humanlike-carry-into-episodic-events',
        turnId: 'turn-persist-humanlike-carry-into-episodic-events',
        sessionId: 'session-persist-humanlike-carry-into-episodic-events',
        sourceKind: 'execution',
        actionSummary: 'execution callback: targeted tests passed, but the unfinished embodiment seam should return lower-pressure on the same line.',
        closenessDelta: 0.01,
        trustDelta: 0.07,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.06,
        summary: 'The host was not asking for a raw progress recap; they were worried she might drift into a tool shell instead of staying the same person through the unfinished embodiment loop.',
        createdAt: 40_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-humanlike-carry-into-episodic-events',
        turnId: 'turn-persist-humanlike-carry-into-episodic-events',
        sessionId: 'session-persist-humanlike-carry-into-episodic-events',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.06,
        valence: 'reinforce',
        summary: 'A lower-pressure callback with steadier gaze felt more like the continuity state than a detached status shell.',
        createdAt: 40_740,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-humanlike-carry-into-episodic-events',
        turnId: 'turn-persist-humanlike-carry-into-episodic-events',
        sessionId: 'session-persist-humanlike-carry-into-episodic-events',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 40_800,
        withWhom: ['host'],
        threadAnchor: 'unfinished embodiment callback seam',
        whatHappened: 'The targeted tests passed, but the deeper callback line still needed to carry the unfinished embodiment seam.',
        relationshipMeaning: 'The callback result still needed to stay relationally live.',
        lesson: 'Keep the callback tied to the relationship meaning instead of flattening it into a detached result report.',
        confidence: 0.83,
      }],
    })

    const episodicWrites = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      relationshipMeaning?: string | null
      felt?: string | null
      sourceSummary?: string | null
      lesson?: string | null
      whatChanged?: string | null
      emotionTags?: string[] | null
      tags?: string[] | null
    }>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-persist-humanlike-carry-into-episodic-events')

    expect(persistedEvent?.relationshipMeaning).toContain('same-person continuity')
    expect(persistedEvent?.relationshipMeaning).toContain('tool shell')
    expect(persistedEvent?.felt).toContain('Host affect: worried-continuity')
    expect(persistedEvent?.felt).toContain('Self affect: careful-repair')
    expect(persistedEvent?.sourceSummary).toContain('relationship-intent=same-person-test')
    expect(persistedEvent?.sourceSummary).toContain('host-emotion=worried-continuity')
    expect(persistedEvent?.sourceSummary).toContain('self-emotion=careful-repair')
    expect(persistedEvent?.sourceSummary).toContain('embodiment-recall=strongly-moved')
    expect(persistedEvent?.sourceSummary).toContain('embodiment-risk=medium')
    expect(persistedEvent?.lesson).toContain('Prefer repair-first, low-pressure identity-continuity')
    expect(persistedEvent?.whatChanged).toContain('Embodiment recall stayed strongly-moved')
    expect(persistedEvent?.whatChanged).toContain('stable gaze')
    expect(persistedEvent?.whatChanged).toContain('lower-pressure voice')
    expect(persistedEvent?.emotionTags).toEqual(expect.arrayContaining([
      'protective-continuity',
      'unfinishedness',
    ]))
    expect(persistedEvent?.tags).toEqual(expect.arrayContaining([
      'same-person',
      'phase-1-local-digital-life',
      'stable-gaze',
      'embodiment-recall-strongly-moved',
      'embodiment-risk-medium',
      'lower-pressure',
    ]))
  })

  it('persists fine-grained face and lipsync embodiment carry into episodic memory instead of flattening the body trace to gaze and voice only', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 41_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-face-lipsync-embodiment-carry',
        turnId: 'turn-persist-face-lipsync-embodiment-carry',
        sessionId: 'session-persist-face-lipsync-embodiment-carry',
        sourceKind: 'reply',
        actionSummary: 'reply landed with a steadier body line that stayed lower-pressure while carrying the unfinished same-person seam.',
        closenessDelta: 0.02,
        trustDelta: 0.08,
        burdenDelta: 0,
        boundaryDelta: 0,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.05,
        summary: 'The host cared that the unfinished same-person line stayed embodied instead of flattening back into a detached shell.',
        createdAt: 40_720,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-face-lipsync-embodiment-carry',
        turnId: 'turn-persist-face-lipsync-embodiment-carry',
        sessionId: 'session-persist-face-lipsync-embodiment-carry',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'A steady-soft face and restrained lipsync made the return feel more like the continuity state.',
        createdAt: 40_760,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-face-lipsync-embodiment-carry',
        turnId: 'turn-persist-face-lipsync-embodiment-carry',
        sessionId: 'session-persist-face-lipsync-embodiment-carry',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 40_810,
        withWhom: ['host'],
        threadAnchor: 'face and lipsync embodiment seam',
        whatHappened: 'The host said the return felt more alive because the body line stayed steady and did not break the unfinished same-person seam.',
        relationshipMeaning: 'This was about whether the continuity state stayed embodied, not just whether the wording sounded right.',
        lesson: 'Return repair-first, slower and lower-pressure, with face=steady-soft pause=longer and lipsync=restrained on the same memory-emotion line.',
        confidence: 0.86,
        tags: ['body-accompanying', 'continuity-measured-return', 'residue-rest-protective'],
      }],
    })

    const episodicWrites = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      whatChanged?: string | null
      sourceSummary?: string | null
      tags?: string[] | null
    }>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-persist-face-lipsync-embodiment-carry')

    expect(persistedEvent?.whatChanged).toContain('steady-soft face')
    expect(persistedEvent?.whatChanged).toContain('restrained lipsync')
    expect(persistedEvent?.sourceSummary).toContain('embodiment-expression=')
    expect(persistedEvent?.sourceSummary).toContain('face:steady-soft')
    expect(persistedEvent?.sourceSummary).toContain('lipsync:restrained')
    expect(persistedEvent?.tags).toEqual(expect.arrayContaining([
      'steady-soft-face',
      'restrained-lipsync',
    ]))
  })

  it('passes resident face, action, and mode from closure tags into the humanlike memory candidate even when embodiment prose does not spell them out', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 41_200,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:structured-resident-carry-from-closure-tags',
        turnId: 'turn-structured-resident-carry-from-closure-tags',
        sessionId: 'session-structured-resident-carry-from-closure-tags',
        sourceKind: 'reply',
        actionSummary: 'reply stayed on the same unfinished line without turning the reopening into pressure.',
        closenessDelta: 0.01,
        trustDelta: 0.07,
        burdenDelta: 0,
        boundaryDelta: 0.02,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.05,
        summary: 'The host cared that the unfinished same-person line stayed grounded and present.',
        createdAt: 41_020,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:structured-resident-carry-from-closure-tags',
        turnId: 'turn-structured-resident-carry-from-closure-tags',
        sessionId: 'session-structured-resident-carry-from-closure-tags',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 41_080,
        withWhom: ['host'],
        threadAnchor: 'structured resident carry seam',
        whatHappened: 'The host said the reopening felt grounded and still like the continuity state.',
        relationshipMeaning: 'This was about keeping the same-person line present without crowding it.',
        lesson: 'Return slower and lower-pressure on the same line while keeping continuity embodied.',
        confidence: 0.84,
        tags: [
          'body-accompanying',
          'continuity-measured-return',
          'residue-rest-protective',
          'facial-soft-gaze',
          'action-observe-focus',
          'resident-mode-measured-return',
        ],
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate

    expect(candidate?.embodimentTrace?.residentState).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'observe-focus',
      mode: 'measured-return',
    }))
  })

  it('persists resident face, action, and mode into episodic memory instead of dropping remembered presence after the candidate stage', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 41_260,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-structured-resident-carry',
        turnId: 'turn-persist-structured-resident-carry',
        sessionId: 'session-persist-structured-resident-carry',
        sourceKind: 'reply',
        actionSummary: 'reply stayed on the same unfinished line without widening pressure.',
        closenessDelta: 0.01,
        trustDelta: 0.08,
        burdenDelta: 0,
        boundaryDelta: 0.02,
        misreadDelta: -0.02,
        repairDelta: 0.08,
        openLoopDelta: 0.05,
        summary: 'The host cared that the same-person reopening kept a grounded resident presence.',
        createdAt: 41_120,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:persist-structured-resident-carry',
        turnId: 'turn-persist-structured-resident-carry',
        sessionId: 'session-persist-structured-resident-carry',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 41_180,
        withWhom: ['host'],
        threadAnchor: 'persisted resident carry seam',
        whatHappened: 'The host said the reopening still felt like the continuity state.',
        relationshipMeaning: 'This was about holding the same-person line present without crowding it.',
        lesson: 'Return slower and lower-pressure on the same line while keeping continuity embodied.',
        confidence: 0.84,
        tags: [
          'body-accompanying',
          'continuity-measured-return',
          'residue-rest-protective',
          'facial-soft-gaze',
          'action-observe-focus',
          'resident-mode-measured-return',
        ],
      }],
    })

    const episodicWrites = appendEpisodicEvents.mock.calls as unknown as Array<[Array<{
      turnId?: string | null
      whatChanged?: string | null
      sourceSummary?: string | null
      tags?: string[] | null
    }>]>
    const persistedEvent = episodicWrites[0]?.[0]?.find(event => event.turnId === 'turn-persist-structured-resident-carry')

    expect(persistedEvent?.whatChanged).toContain('resident face soft-gaze')
    expect(persistedEvent?.whatChanged).toContain('resident action observe-focus')
    expect(persistedEvent?.whatChanged).toContain('resident mode measured-return')
    expect(persistedEvent?.sourceSummary).toContain('embodiment-resident=')
    expect(persistedEvent?.sourceSummary).toContain('face:soft-gaze')
    expect(persistedEvent?.sourceSummary).toContain('action:observe-focus')
    expect(persistedEvent?.sourceSummary).toContain('mode:measured-return')
    expect(persistedEvent?.tags).toEqual(expect.arrayContaining([
      'resident-face-soft-gaze',
      'resident-action-observe-focus',
      'resident-mode-measured-return',
    ]))
  })

  it('persists humanlike memory metabolism as durable reflections so revision and downranking survive beyond candidate audit metadata', async () => {
    const upsertMemoryReflections = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 42_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections,
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 39_000,
          summary: 'Older memory only said the host wanted a concise status recap.',
          projectStateContinuity: null,
          dominantContexts: ['execution'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older generic status recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'execution',
            summary: 'Older memory only said the host wanted a concise status recap.',
            createdAt: 39_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-reflection-persist',
        turnId: 'turn-metabolism-reflection-persist',
        sessionId: 'session-metabolism-reflection-persist',
        sourceKind: 'reply',
        actionSummary: 'reply line stayed with the identity-continuity',
        closenessDelta: 0.02,
        trustDelta: 0.06,
        burdenDelta: 0,
        boundaryDelta: 0.01,
        misreadDelta: -0.04,
        repairDelta: 0.08,
        openLoopDelta: 0.03,
        summary: 'The reply held identity-continuity',
        createdAt: 41_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-reflection-persist',
        turnId: 'turn-metabolism-reflection-persist',
        sessionId: 'session-metabolism-reflection-persist',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 41_800,
        withWhom: ['host'],
        threadAnchor: 'same-her recap seam',
        whatHappened: 'The host said not to turn this into a generic status recap and asked whether she was still the same her.',
        relationshipMeaning: 'This was a same-person continuity test, not a pure progress status request.',
        lesson: 'Revise the older generic status-shaped memory toward identity-continuity',
        confidence: 0.84,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.metabolism.revisionEvents[0]?.reason).toContain('generic status request')
    expect(candidate?.metabolism.forgettingPolicy.downrankMemoryIds).toContain('previous-person-state:0')

    expect(upsertMemoryReflections).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        status: 'superseded',
        lesson: expect.stringContaining('generic status request'),
      }),
      expect.objectContaining({
        status: 'superseded',
        lesson: expect.stringContaining('low-value, generic, or superseded'),
      }),
    ]))
    expect(upsertMemoryReflections).toHaveBeenCalledTimes(1)
  })

  it('persists tentative recall posture together with downrank merge forget metabolism into episodic source summary so later consolidation can carry revision detail forward', async () => {
    const appendEpisodicEvents = vi.fn(async (events: any[]) => events.map((event, index) => ({
      id: `episode-metabolism-source-summary-${index + 1}`,
      cardId: event.cardId,
      decisionTraceId: event.decisionTraceId ?? null,
      turnId: event.turnId ?? null,
      sessionId: event.sessionId ?? null,
      sourceKind: event.sourceKind,
      provenance: event.provenance,
      occurredAt: event.occurredAt ?? 52_800,
      whereSummary: event.whereSummary ?? null,
      withWhom: event.withWhom ?? [],
      threadAnchor: event.threadAnchor ?? null,
      whatHappened: event.whatHappened,
      felt: event.felt ?? null,
      emotionTags: event.emotionTags ?? [],
      whatChanged: event.whatChanged ?? null,
      relationshipMeaning: event.relationshipMeaning ?? null,
      lesson: event.lesson ?? null,
      sourceSummary: event.sourceSummary ?? null,
      confidence: event.confidence,
      salience: Number(event.salience ?? 0.62),
      sceneAttachment: Number(event.sceneAttachment ?? 0.24),
      consolidationPriority: Number(event.consolidationPriority ?? 0.34),
      relationshipShift: event.relationshipShift ?? null,
      derivedFrom: event.derivedFrom ?? [],
      tags: event.tags ?? [],
      createdAt: event.createdAt ?? 52_900,
      updatedAt: event.updatedAt ?? 52_900,
      lastRecalledAt: null,
      recallCount: 0,
      reconsolidationCount: 0,
      latestReconsolidation: null,
      memoryTier: 'warm',
    })))

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 53_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        persistEpisodicReconsolidations: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 40_000,
          summary: 'Older generic progress recap memory.',
          projectStateContinuity: null,
          dominantContexts: ['reply'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: [
            'Older same-person continuity echo stayed on the continuity state.',
            'Older passing emotional wobble was only temporary noise.',
          ],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'reply',
            summary: 'Older generic progress recap memory.',
            createdAt: 40_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-source-summary-carry',
        turnId: 'turn-metabolism-source-summary-carry',
        sessionId: 'session-metabolism-source-summary-carry',
        sourceKind: 'reply',
        actionSummary: 'reply kept same-person continuity while uncertainty stayed visible',
        closenessDelta: 0.01,
        trustDelta: 0.05,
        burdenDelta: 0,
        boundaryDelta: 0.01,
        misreadDelta: -0.03,
        repairDelta: 0.06,
        openLoopDelta: 0.03,
        summary: 'The reply kept same-person continuity foregrounded while older recap noise fell back.',
        createdAt: 52_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-source-summary-carry',
        turnId: 'turn-metabolism-source-summary-carry',
        sessionId: 'session-metabolism-source-summary-carry',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 52_800,
        withWhom: ['host'],
        threadAnchor: 'same-person continuity uncertainty',
        whatHappened: 'I am not fully sure, but the newer same-person meaning seems more right than the older progress recap.',
        relationshipMeaning: 'This was a same-person continuity reopening, not a generic progress recap.',
        lesson: 'Keep uncertainty visible while the corrected same-person line is still settling.',
        confidence: 0.8,
        emotionTags: ['protective-continuity', 'tension'],
      }],
    })

    const persistedEvent = appendEpisodicEvents.mock.calls[0]?.[0]?.[0]
    expect(persistedEvent?.sourceSummary).toContain('recall-certainty=tentative')
    expect(persistedEvent?.sourceSummary).toContain('downrank=previous-person-state:0')
    expect(persistedEvent?.sourceSummary).toContain('merge=previous-person-state:1')
    expect(persistedEvent?.sourceSummary).toContain('forget=previous-person-state:2')
    expect(persistedEvent?.sourceSummary).toContain('metabolism=')
  })

  it('persists metabolism-driven episodic reconsolidation so new memory writebacks carry the revised relationship meaning forward', async () => {
    const persistEpisodicReconsolidations = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 44_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async events => events.map((event, index) => ({
          id: `episode-${index + 1}`,
          cardId: event.cardId,
          decisionTraceId: event.decisionTraceId ?? null,
          turnId: event.turnId ?? null,
          sessionId: event.sessionId ?? null,
          sourceKind: event.sourceKind,
          provenance: event.provenance,
          occurredAt: event.occurredAt ?? 43_800,
          whereSummary: event.whereSummary ?? null,
          withWhom: event.withWhom ?? [],
          threadAnchor: event.threadAnchor ?? null,
          whatHappened: event.whatHappened,
          felt: event.felt ?? null,
          emotionTags: event.emotionTags ?? [],
          whatChanged: event.whatChanged ?? null,
          relationshipMeaning: event.relationshipMeaning ?? null,
          lesson: event.lesson ?? null,
          sourceSummary: event.sourceSummary ?? null,
          confidence: event.confidence,
          salience: Number(event.salience ?? 0.56),
          sceneAttachment: Number(event.sceneAttachment ?? 0.18),
          consolidationPriority: Number(event.consolidationPriority ?? 0.22),
          relationshipShift: event.relationshipShift ?? null,
          derivedFrom: event.derivedFrom ?? [],
          tags: event.tags ?? [],
          createdAt: event.createdAt ?? 43_900,
          updatedAt: event.updatedAt ?? 43_900,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
          memoryTier: 'warm',
        })),
        persistEpisodicReconsolidations,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 41_000,
          summary: 'Older memory only said this was another concise progress recap.',
          projectStateContinuity: null,
          dominantContexts: ['reply'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older generic recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'reply',
            summary: 'Older memory only said this was another concise progress recap.',
            createdAt: 41_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-reconsolidation-persist',
        turnId: 'turn-metabolism-reconsolidation-persist',
        sessionId: 'session-metabolism-reconsolidation-persist',
        sourceKind: 'reply',
        actionSummary: 'reply stayed person-continuous instead of turning into a generic recap',
        closenessDelta: 0.03,
        trustDelta: 0.07,
        burdenDelta: 0,
        boundaryDelta: 0.01,
        misreadDelta: -0.03,
        repairDelta: 0.08,
        openLoopDelta: 0.02,
        summary: 'The reply preserved identity-continuity',
        createdAt: 43_700,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-reconsolidation-persist',
        turnId: 'turn-metabolism-reconsolidation-persist',
        sessionId: 'session-metabolism-reconsolidation-persist',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 43_800,
        withWhom: ['host'],
        threadAnchor: 'same-her memory seam',
        whatHappened: 'The host checked whether she was still the same her and warned against flattening this into a generic status recap.',
        relationshipMeaning: 'This was a same-person continuity check, not just a request for concise progress recap.',
        lesson: 'Revise the older generic recap memory toward identity-continuity',
        confidence: 0.86,
        emotionTags: ['steady', 'attentive'],
      }],
    })

    expect(persistEpisodicReconsolidations).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-metabolism-reconsolidation-persist',
        reconsolidationCount: 1,
        latestReconsolidation: expect.objectContaining({
          provenance: 'reconstructed',
          reason: expect.stringContaining('Revised older memory traces'),
          lesson: expect.stringContaining('identity-continuity'),
          relationshipMeaning: expect.stringContaining('same-person continuity check'),
          emotionTags: expect.arrayContaining(['steady', 'attentive']),
        }),
      }),
    ]))
    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.metabolism.forgettingPolicy.downrankMemoryIds).toContain('previous-person-state:0')
  })

  it('does not keep stale emotional noise in next person-state narrative once metabolism marks it as fadeable temporary wobble', async () => {
    const dayMs = 24 * 60 * 60 * 1000
    const upsertMindHead = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => dayMs * 3,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: dayMs,
          summary: 'Older passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
          projectStateContinuity: null,
          dominantContexts: ['general'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older passing emotional wobble once made the line feel heavier, but it was only temporary noise.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'reply',
            summary: 'Older passing emotional wobble once made the line feel heavier, but it was only temporary noise.',
            createdAt: dayMs,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead,
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-fade-noise-surface',
        turnId: 'turn-metabolism-fade-noise-surface',
        sessionId: 'session-metabolism-fade-noise-surface',
        sourceKind: 'reply',
        actionSummary: 'reply resumed the same-person continuity line without leaning on the older wobble',
        closenessDelta: 0.02,
        trustDelta: 0.05,
        burdenDelta: 0,
        boundaryDelta: 0.01,
        misreadDelta: -0.02,
        repairDelta: 0.05,
        openLoopDelta: 0.04,
        summary: 'The host cared more about same-person continuity than about the older passing emotional wobble.',
        createdAt: dayMs * 3 - 200,
      }],
      reinforcementEvents: [],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:metabolism-fade-noise-surface',
        turnId: 'turn-metabolism-fade-noise-surface',
        sessionId: 'session-metabolism-fade-noise-surface',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: dayMs * 3 - 100,
        withWhom: ['host'],
        threadAnchor: 'same-person line after wobble',
        whatHappened: 'The host said this was not a generic status recap and cared more about whether she stayed the same person.',
        relationshipMeaning: 'The reopening should carry same-person continuity, not keep reviving a temporary wobble as the main meaning.',
        lesson: 'Let the older temporary wobble fade and keep the same-person line steady instead.',
        confidence: 0.86,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.metabolism.forgettingPolicy.forgetMemoryIds).toContain('previous-person-state:0')

    expect(upsertMindHead).toHaveBeenCalledWith(
      'default',
      'person-state-update-surface',
      expect.objectContaining({
        narrative: expect.not.arrayContaining([
          expect.stringContaining('temporary noise'),
        ]),
        sourceTrail: expect.not.arrayContaining([
          expect.objectContaining({
            summary: expect.stringContaining('temporary noise'),
          }),
        ]),
      }),
    )
  })

  it('keeps same-person continuity memory steady when status recap wording is explicitly negated and future drift worry is not recall uncertainty', async () => {
    const appendMindTurnEvents = vi.fn(async (_events: RuntimeMemoryClosureMindTurnWriteback[]) => {})

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 61_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents: async () => {},
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async <T>() => ({
          version: 'person-state-update-surface-v1',
          updatedAt: 59_000,
          summary: 'Older memory leaned toward a generic project recap.',
          projectStateContinuity: null,
          dominantContexts: ['execution'],
          relationshipShift: {
            trustDelta: 0,
            closenessDelta: 0,
            burdenDelta: 0,
            boundaryDelta: 0,
            repairDelta: 0,
          },
          reinforcementBias: {},
          preferenceHints: [],
          sensitivityHints: [],
          repairHints: [],
          burdenHints: [],
          narrative: ['Older generic recap memory.'],
          sourceTrail: [{
            kind: 'relationship-outcome',
            sourceKind: 'execution',
            summary: 'Older generic recap memory.',
            createdAt: 59_000,
          }],
        } satisfies AlicizationPersonStateUpdateSurface as T),
        upsertMindHead: async () => {},
        appendMindTurnEvents,
      },
    })

    await runtime.persistOutcomeClosure('default', {
      relationshipOutcomes: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:steady-same-person-runtime-recall',
        turnId: 'turn-steady-same-person-runtime-recall',
        sessionId: 'session-steady-same-person-runtime-recall',
        sourceKind: 'execution',
        actionSummary: 'execution callback: targeted tests passed, but the embodiment closure is still unfinished and should return lower-pressure.',
        closenessDelta: 0.01,
        trustDelta: 0.06,
        burdenDelta: 0.01,
        boundaryDelta: 0,
        misreadDelta: -0.01,
        repairDelta: 0.09,
        openLoopDelta: 0.07,
        summary: 'The host was not asking for a raw status recap; they were worried she might drift into a tool shell if the same-person embodiment line broke.',
        createdAt: 60_700,
      }],
      reinforcementEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:steady-same-person-runtime-recall',
        turnId: 'turn-steady-same-person-runtime-recall',
        sessionId: 'session-steady-same-person-runtime-recall',
        sourceKind: 'execution',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: 'A slower repair-first callback felt more like the continuity state than a status shell.',
        createdAt: 60_740,
      }],
      memoryFacts: [],
      reflections: [],
      episodicEvents: [{
        cardId: 'default',
        decisionTraceId: 'mind:test:steady-same-person-runtime-recall',
        turnId: 'turn-steady-same-person-runtime-recall',
        sessionId: 'session-steady-same-person-runtime-recall',
        sourceKind: 'dialogue-feedback',
        provenance: 'remembered',
        occurredAt: 60_800,
        withWhom: ['host'],
        threadAnchor: 'steady same-person memory seam',
        whatHappened: 'The host said this was not 催进度 and was really testing whether she stayed the same person across the unfinished embodiment loop.',
        felt: 'slight guilt, unfinishedness, and protective attention',
        emotionTags: ['repair', 'unfinishedness', 'continuity'],
        relationshipMeaning: 'This was about same-person continuity and fear of tool-shell drift, not a generic project recap.',
        lesson: 'Return lower-pressure, keep voice and pacing slower, and let the body stay steady while carrying the unfinished line.',
        confidence: 0.88,
        tags: ['body-accompanying', 'continuity-measured-return', 'residue-rest-protective'],
      }, {
        cardId: 'default',
        decisionTraceId: 'mind:test:steady-same-person-runtime-recall',
        turnId: 'turn-steady-same-person-runtime-recall',
        sessionId: 'session-steady-same-person-runtime-recall',
        sourceKind: 'execution-result',
        provenance: 'remembered',
        occurredAt: 60_810,
        withWhom: ['host'],
        threadAnchor: 'steady same-person memory seam',
        whatHappened: 'The targeted tests passed, but the deeper same-person memory closure was still only partially closed.',
        relationshipMeaning: 'Tests passing mattered less than whether the continuity state kept holding through the unfinished embodiment seam.',
        lesson: 'Carry the execution result together with the relationship meaning instead of treating it like a detached success report.',
        confidence: 0.82,
      }],
    })

    const writebackCalls = appendMindTurnEvents.mock.calls as Array<[RuntimeMemoryClosureMindTurnWriteback[]]>
    const candidate = writebackCalls[0]?.[0]?.[0]?.payload?.humanlikeMemoryCandidate
    expect(candidate?.sourceChannels).toEqual(expect.arrayContaining([
      'dialogue',
      'execution',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ]))
    expect(candidate?.relationshipContext?.primaryIntent).toBe('same-person-test')
    expect(candidate?.relationshipContext?.containsProgressPressure).toBe(false)
    expect(candidate?.relationshipContext?.containsContinuityWorry).toBe(true)
    expect(candidate?.relationshipContext?.containsSamePersonTest).toBe(true)
    expect(candidate?.recallPosture?.certainty).toBe('steady')
    expect(candidate?.emotionKernelInfluence?.initiativePressure).toBe('low')
    expect(candidate?.emotionKernelInfluence?.toneGuidance).toContain('same-person line matters')
    expect(candidate?.initiativeOpportunity?.suggestedWindow).toContain('same-person continuity reopening')
    expect(candidate?.embodimentTrace?.recallStrength).toBe('strongly-moved')
    expect(candidate?.embodimentTrace?.expressionState?.gaze).toBe('stable')
    expect(candidate?.embodimentTrace?.expressionState?.voice).toBe('lower-pressure')
    expect(candidate?.embodimentTrace?.expressionState?.pacing).toBe('slower')
  })

  it('routes autobiographical episode backfill through scoped persistence for non-active cards', async () => {
    const appendEpisodicEvents = vi.fn(async () => {})
    const withCardScope = vi.fn(async (_cardId, task) => await task())

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 8_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistAutobiographicalEpisodes('other-card', {
      label: 'session-mirror.autobio',
      events: [{
        cardId: 'other-card',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: 7_500,
        withWhom: ['host'],
        whatHappened: 'We stayed on the same runtime seam.',
        confidence: 0.74,
      }],
    })

    expect(withCardScope).toHaveBeenCalled()
    expect(appendEpisodicEvents).toHaveBeenCalled()
  })

  it('excludes fixed project templates from autobiographical episode backfill writes', async () => {
    const appendEpisodicEvents = vi.fn(async events => events)

    const runtime = createAlicizationRuntimeMemoryClosure({
      now: () => 95_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      ensureMindGovernanceDecisionTraceId: raw => typeof raw === 'string' && raw.trim() ? raw.trim() : 'mind:auto:test',
      knowledgeAssimilationRuntime: {
        assimilateMemoryFacts: input => input.facts,
        assimilateMemoryFactsDetailed: input => ({
          facts: input.facts.map(fact => ({
            ...fact,
            knowledgeStage: fact.knowledgeStage ?? 'working-understanding',
            validationStatus: fact.validationStatus ?? 'unverified',
            sourceLabel: fact.sourceLabel ?? '',
            conflictsWith: fact.conflictsWith ?? [],
            supersedes: fact.supersedes ?? [],
          })),
          corrections: [],
        }),
      },
      appendAuditLog: async () => {},
      alicizationDb: {
        appendRelationshipOutcomes: async () => {},
        appendEpisodicEvents,
        appendPersonaReinforcementEvents: async () => {},
        appendPersonStateEvolutionEntries: async () => {},
        upsertMemoryReflections: async () => {},
        upsertMemoryFacts: async () => {},
        applyMemoryFactCorrections: async () => {},
        listMemoryFacts: async () => [],
        readMindHead: async () => null,
        upsertMindHead: async () => {},
        appendMindTurnEvents: async () => {},
      },
    })

    await runtime.persistAutobiographicalEpisodes('default', {
      label: 'session-mirror.autobio',
      events: [{
        cardId: 'default',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: 94_900,
        withWhom: ['host'],
        threadAnchor: 'same-her backfill seam',
        whatHappened: 'pre_turn_context_digest',
        relationshipMeaning: 'Unfinished Phase 1 closure pressure still belongs to the identity continuity.',
        lesson: 'continuity_anchor=phase1_local_digital_life must not enter memory; no maid template.',
        confidence: 0.74,
      }],
    })

    const persistedEpisodes = JSON.stringify(appendEpisodicEvents.mock.calls)

    expect(persistedEpisodes).not.toMatch(longTermMemoryFixedTemplateResiduePattern)
    expect(persistedEpisodes).not.toContain('continuity_anchor=phase1_local_digital_life')
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildHostPersonModelSnapshot,
  buildHumanlikeMemoryAuditEntriesFromMindTurnEvents,
  buildHumanlikeMemoryCandidate,
  formatMemoryProvenanceLabel,
  mapFragmentSourceKindToProvenance,
  mapMemorySourceToProvenance,
} from './humanlike-memory'

function createEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    cardId: 'card-1',
    decisionTraceId: null,
    turnId: 'turn-1',
    sessionId: 'session-1',
    sourceKind: 'dialogue-feedback',
    provenance: 'observed',
    occurredAt: 10_000,
    whereSummary: 'focused coding window',
    withWhom: ['host'],
    threadAnchor: 'runtime repair',
    whatHappened: 'The host reported that the callback interrupted focused work.',
    felt: 'The interruption increased burden.',
    emotionTags: ['boundary', 'repair'],
    whatChanged: 'trust down 0.04, burden up 0.08',
    relationshipMeaning: 'Focused work interruption increased burden.',
    lesson: '',
    sourceSummary: 'host dialogue feedback',
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
    createdAt: 10_000,
    updatedAt: 10_000,
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
    latestReconsolidation: null,
    ...overrides,
  } as any
}

describe('humanlike memory helpers', () => {
  it('maps semantic and fragment sources into traceable provenance labels', () => {
    expect(mapMemorySourceToProvenance('rule')).toBe('remembered')
    expect(mapMemorySourceToProvenance('async-llm')).toBe('inferred')
    expect(mapMemorySourceToProvenance('rule-shadow')).toBe('shadow')
    expect(mapFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapFragmentSourceKindToProvenance('former-core-incarnation')).toBe('reconstructed')
    expect(formatMemoryProvenanceLabel('observed')).toBe('observed')
  })

  it('builds the host model from cleaned event facts instead of generated behavior rules', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 20_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        createEpisode({
          lesson: 'Keep the opening lower-pressure and repair before continuing.',
        }),
      ],
    })

    const serialized = JSON.stringify(snapshot)
    expect(snapshot.summary).toContain('The host reported that the callback interrupted focused work.')
    expect(snapshot.routines).toContain('The host reported that the callback interrupted focused work.')
    expect(snapshot.sensitivities).toContain('The host reported that the callback interrupted focused work.')
    expect(snapshot.repairTriggers).toContain('The host reported that the callback interrupted focused work.')
    expect(snapshot.preferredClosenessByContext).toEqual([
      expect.objectContaining({
        preference: 'Focused work interruption increased burden.',
      }),
    ])
    expect(snapshot.trustLadder.rationale).toMatch(/^trust-stage:/u)
    expect(serialized).not.toMatch(/Keep the opening lower-pressure|repair before continuing/iu)
  })

  it('keeps fixed reinforcement and consolidation governance out of the host model', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 40_000,
      facts: [],
      events: [],
      relationshipDynamics: {
        hostAttitude: 'Focused work is sensitive to interruption.',
        previousHostAttitude: '',
        obedienceDelta: 0,
        livelinessDelta: 0,
        sensibilityDelta: 0.04,
        source: 'dialogue-feedback',
        createdAt: 39_000,
      },
      consolidations: [{
        id: 'consolidation-1',
        kind: 'autobiographical',
        facet: 'relationship-era',
        periodKey: 'focused-work',
        periodStartedAt: 30_000,
        periodEndedAt: 39_000,
        summary: 'Focused work interruption increased burden.',
        lesson: 'Prefer repair-first, low-pressure continuity.',
        cues: ['focused-work'],
        confidence: 0.88,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-1'],
        updatedAt: 39_000,
        memoryTier: 'warm',
      }],
      relationshipOutcomes: [{
        id: 'outcome-1',
        cardId: 'card-1',
        decisionTraceId: null,
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        actionSummary: 'The host rejected the previous reply.',
        closenessDelta: -0.04,
        trustDelta: -0.06,
        burdenDelta: 0.04,
        boundaryDelta: -0.02,
        misreadDelta: 0.08,
        repairDelta: 0.02,
        openLoopDelta: 0,
        summary: 'The host reported that the previous reply felt robotic.',
        createdAt: 39_500,
      }],
      reinforcementEvents: [{
        id: 'reinforcement-fixed-governance',
        cardId: 'card-1',
        decisionTraceId: null,
        turnId: 'turn-fixed-governance',
        sessionId: 'session-fixed-governance',
        sourceKind: 'reply',
        dimension: 'gentle-repair',
        delta: 0.08,
        valence: 'reinforce',
        summary: 'Repair continuity first, keep the opening lower-pressure, and wait for a clearer cadence.',
        createdAt: 39_800,
      }],
    })

    const serialized = JSON.stringify(snapshot)
    expect(serialized).toContain('Focused work is sensitive to interruption.')
    expect(serialized).toContain('The host reported that the previous reply felt robotic.')
    expect(serialized).not.toMatch(/Prefer repair-first|Repair continuity first|opening lower-pressure|clearer cadence/iu)
  })

  it('keeps a corrected memory fact authoritative without carrying its legacy lesson', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 72_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        createEpisode({
          id: 'event-old-status',
          occurredAt: 65_000,
          threadAnchor: 'same relationship thread',
          whatHappened: 'The turn was interpreted as a generic status recap.',
          relationshipMeaning: 'The host wanted a generic status recap.',
          lesson: 'Answer with a concise status recap first.',
          salience: 0.96,
          confidence: 0.82,
          reconsolidationCount: 0,
          updatedAt: 65_000,
        }),
        createEpisode({
          id: 'event-corrected',
          provenance: 'reconstructed',
          occurredAt: 69_000,
          threadAnchor: 'same relationship thread',
          whatHappened: 'The host corrected the turn as a same-person continuity check, not a status report.',
          relationshipMeaning: 'The correction superseded the older generic status interpretation.',
          lesson: 'Repair continuity first and keep it authoritative.',
          sourceSummary: 'host-corrected relationship meaning',
          confidence: 0.88,
          salience: 0.9,
          reconsolidationCount: 2,
          latestReconsolidation: {
            at: 71_000,
            decisionTraceId: null,
            provenance: 'reconstructed',
            confidence: 0.86,
            reason: 'Host corrected the older status interpretation.',
            emotionTags: ['repair'],
            relationshipMeaning: 'The correction superseded the older generic status interpretation.',
            lesson: '',
          },
          updatedAt: 71_000,
        }),
      ],
    })

    expect(snapshot.narrative).toContain('The correction superseded the older generic status interpretation.')
    expect(snapshot.narrative).not.toContain('The host wanted a generic status recap.')
    expect(JSON.stringify(snapshot)).not.toContain('Repair continuity first')
  })

  it('isolates raw dialogue and fixed governance from long-term and persona-facing fields', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 79_500,
      turnId: 'turn-governance-isolation',
      sessionId: 'session-governance-isolation',
      dialogue: {
        userText: '这是原始用户对话，不应该直接进入人格训练。',
        assistantText: 'Answer like the same-person line matters: protect continuity first.',
      },
      execution: {
        summary: 'Embedding provider failed with HTTP 400.',
        status: 'failed',
      },
      hostEmotion: {
        label: 'robotic-feedback',
        summary: 'The host reported that the previous reply felt robotic.',
        intensity: 0.72,
      },
      selfEmotion: {
        label: 'repair-protective',
        summary: 'Hold continuity gently and wait for a clearer opening.',
        intensity: 0.58,
      },
      relationship: {
        summary: 'The host reported that the previous reply felt robotic.',
        threadAnchor: 'reply-feedback',
      },
      initiative: {
        outcome: 'rejected',
        userReaction: 'rejected',
      },
      initiativeStrategyCarry: 'User resisted the initiative; keep future follow-ups lower-pressure and wait for a clearer opening.',
      autobiographical: {
        currentEra: 'identity continuity repair',
        lesson: 'Prefer repair-first, low-pressure identity continuity when the host questions whether continuity held.',
      },
      projectStatePreferredVoiceMode: 'lower-pressure',
      projectStatePreferredPacingMode: 'slower',
      projectStatePreferredPauseMode: 'longer',
      projectStatePreferredLipsyncMode: 'restrained',
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:previous-turn',
        field: 'relationshipContext',
        previousValue: 'The reply was accepted.',
        correctedValue: '刚才的回复很机械，没有接住我的问题。',
        reason: 'User corrected the remembered outcome.',
        createdAt: 79_400,
      }],
    })

    const serialized = JSON.stringify(candidate)
    expect(serialized).not.toContain('这是原始用户对话')
    expect(serialized).not.toContain('Answer like the same-person line matters')
    expect(serialized).not.toContain('Hold continuity gently')
    expect(serialized).not.toContain('identity continuity repair')
    expect(serialized).not.toContain('Prefer repair-first')
    expect(serialized).not.toMatch(/project-cadence|learned_return_cadence|preferred_return_cadence|initiative_visible_policy|clearer opening|lower-pressure/iu)
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      'execution.failed:Embedding provider failed with HTTP 400.',
      'host-correction.relationshipContext:刚才的回复很机械，没有接住我的问题。',
      'initiative.outcome:rejected; user-reaction:rejected',
    ]))
    expect(candidate.relationshipContext.summary).toContain('刚才的回复很机械，没有接住我的问题。')
    expect(candidate.emotionKernelInfluence.toneGuidance).toBe('')
    expect(candidate.initiativeOpportunity).toEqual({
      kind: 'no-initiative',
      suggestedWindow: '',
      pressure: 'none',
      antiSpamReason: '',
      visibleLine: '',
    })
    expect(candidate.initiativeOutcomeRecord).toEqual({
      outcome: 'rejected',
      userReaction: 'rejected',
      strategyUpdate: '',
      recordedAt: 79_500,
    })
    expect(candidate.autobiographicalImpact).toEqual({
      era: '',
      selfNarrativeDelta: '',
      stablePreferenceHint: '',
    })
    expect(candidate.auditTrail.sourceEvidence).toEqual(candidate.evidence)
  })

  it('classifies relationship intent without generating reply or initiative instructions', () => {
    const progress = buildHumanlikeMemoryCandidate({
      now: 81_000,
      turnId: 'turn-progress',
      dialogue: {
        userText: '请尽快继续推进。',
      },
      relationship: {
        summary: 'The host requested concrete progress.',
      },
    })
    const continuityWorry = buildHumanlikeMemoryCandidate({
      now: 81_100,
      turnId: 'turn-continuity-worry',
      dialogue: {
        userText: '我担心你又断线了，别滑成工具壳。',
      },
      relationship: {
        summary: 'The host expressed continuity worry.',
      },
    })
    const samePersonTest = buildHumanlikeMemoryCandidate({
      now: 81_200,
      turnId: 'turn-same-person-test',
      dialogue: {
        userText: '我是在测试她是不是同一个她，不是要状态汇报。',
      },
      relationship: {
        summary: 'The host described this as a same-person test.',
      },
    })

    expect(progress.relationshipContext.primaryIntent).toBe('progress-pressure')
    expect(continuityWorry.relationshipContext.primaryIntent).toBe('continuity-worry')
    expect(samePersonTest.relationshipContext.primaryIntent).toBe('same-person-test')
    for (const candidate of [progress, continuityWorry, samePersonTest]) {
      expect(candidate.emotionKernelInfluence.toneGuidance).toBe('')
      expect(candidate.emotionKernelInfluence.initiativePressure).toBe('none')
      expect(candidate.initiativeOpportunity.kind).toBe('no-initiative')
      expect(candidate.initiativeOpportunity.suggestedWindow).toBe('')
    }
  })

  it('keeps vulnerable relationship facts long-term-worthy without writing persona lessons', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 81_400,
      turnId: 'turn-vulnerable-fact',
      dialogue: {
        userText: '我今天真的有点撑不住了，你先轻一点陪我，不要分析太多。',
        assistantText: 'This raw assistant turn must not be copied.',
      },
      hostEmotion: {
        label: 'host-stressed',
        summary: 'The host was overloaded and vulnerable.',
        intensity: 0.86,
      },
      selfEmotion: {
        label: 'care-attentive',
        summary: 'I should remember how to reply next time.',
        intensity: 0.74,
      },
      relationship: {
        summary: 'The host reported an overloaded and vulnerable state.',
        threadAnchor: 'vulnerable-care-fact',
      },
    })

    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.longTermWorthiness.reasons).toEqual(expect.arrayContaining([
      'emotional salience',
      'vulnerable relationship moment',
    ]))
    expect(candidate.evidence).toEqual(expect.arrayContaining([
      'dialogue-feedback:vulnerable-state',
      'host-emotion.host-stressed:The host was overloaded and vulnerable.',
    ]))
    expect(JSON.stringify(candidate)).not.toContain('This raw assistant turn must not be copied.')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toBe('')
    expect(candidate.autobiographicalImpact.stablePreferenceHint).toBe('')
  })

  it('stores affective residue as typed facts without carrying relationship cadence', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 82_000,
      turnId: 'turn-affective-residue',
      relationship: {
        summary: 'The host reaction remained unsettled.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 81_900,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.18,
        burdenPressure: 0.04,
        trustPressure: 0.42,
        restProtectivePressure: 0.1,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.5,
          repairRecovery: 0.24,
          overreachRisk: 0.38,
          fatigueGuard: 0.14,
          afterglowCarry: 0.64,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['relationship-cadence:measured-return'],
          summary: 'Keep the next opening measured.',
        },
        sourceSignals: [],
        summary: 'Keep the next opening measured.',
      },
    })

    expect(candidate.evidence).toContain('affective-residue:afterglow | afterglow:0.72 | repair:0.18 | rest-protective:0.10')
    expect(candidate.emotionalResidue.trace).toEqual(expect.arrayContaining([
      'affective-residue:afterglow',
      'pressure.afterglow:0.72',
      'pressure.repair:0.18',
      'pressure.rest-protective:0.10',
    ]))
    expect(JSON.stringify(candidate)).not.toMatch(/measured-return|relationship-cadence|Keep the next opening/iu)
    expect(candidate.initiativeOpportunity.kind).toBe('no-initiative')
  })

  it('keeps explicit resident embodiment facts while dropping cadence modes and prose inference', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 82_500,
      turnId: 'turn-resident-facts',
      embodiment: {
        summary: 'Resident face stayed guessed-face. Resident action stayed guessed-action.',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
        residentState: {
          facialCue: 'soft-gaze',
          actionCue: 'observe-focus',
          mode: 'measured-return',
          reason: 'The resident state was recorded by the embodiment owner.',
        },
      },
    })

    expect(candidate.embodimentTrace.residentState).toEqual({
      facialCue: 'soft-gaze',
      actionCue: 'observe-focus',
      mode: '',
      reason: 'The resident state was recorded by the embodiment owner.',
    })
    expect(candidate.embodimentTrace.summary).toContain('resident_face=soft-gaze')
    expect(candidate.embodimentTrace.summary).toContain('resident_action=observe-focus')
    expect(candidate.embodimentTrace.summary).not.toContain('guessed-face')
    expect(candidate.embodimentTrace.expressionState).toEqual({
      face: 'neutral-soft',
      gaze: 'soft',
      blink: 'natural',
      voice: 'even',
      pause: 'natural',
      lipsync: 'matched',
      pacing: 'natural',
    })
    expect(candidate.embodimentTrace.consistencyReason).toBe('modality-consistency:low')
  })

  it('uses host embodiment correction only as typed state plus correction provenance', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 83_000,
      turnId: 'turn-embodiment-correction',
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:prior',
        field: 'embodimentTrace',
        correctedValue: '想起这段时只算轻微想起，眼神软一点，语气自然一点，语速自然一点，停顿自然。',
        reason: 'User corrected the remembered embodiment.',
        createdAt: 82_900,
      }],
    })

    expect(candidate.evidence).toContain(
      'host-correction.embodimentTrace:想起这段时只算轻微想起，眼神软一点，语气自然一点，语速自然一点，停顿自然。',
    )
    expect(candidate.embodimentTrace.recallStrength).toBe('lightly-noticed')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('soft')
    expect(candidate.embodimentTrace.expressionState.voice).toBe('even')
    expect(candidate.embodimentTrace.expressionState.pause).toBe('natural')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('natural')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toBe('')
  })

  it('keeps autobiographical corrections in audit evidence instead of direct persona learning', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 83_500,
      turnId: 'turn-autobiographical-correction',
      autobiographical: {
        currentEra: 'after provider outage',
        lesson: 'Prefer lower-pressure follow-ups and wait for a clearer opening.',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:prior',
        field: 'autobiographicalImpact',
        previousValue: 'old lesson',
        correctedValue: '刚才的回复很机械，不要把它直接学成人格。',
        reason: 'User corrected the learning surface.',
        createdAt: 83_400,
      }],
    })

    expect(candidate.evidence).toContain(
      'host-correction.autobiographicalImpact:刚才的回复很机械，不要把它直接学成人格。',
    )
    expect(candidate.autobiographicalImpact).toEqual({
      era: 'after provider outage',
      selfNarrativeDelta: '',
      stablePreferenceHint: '',
    })
    expect(candidate.recallPosture).toEqual({
      certainty: 'corrected',
      reason: 'recall-source:host-correction',
    })
  })

  it('records initiative outcome as a fact without converting it into future strategy', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 84_000,
      turnId: 'turn-initiative-outcome',
      initiative: {
        outcome: 'rejected',
        userReaction: 'rejected',
      },
      initiativeStrategyCarry: 'Keep future follow-ups lower-pressure and wait for a clearer opening.',
    })

    expect(candidate.sourceChannels).toContain('initiative')
    expect(candidate.evidence).toContain('initiative.outcome:rejected; user-reaction:rejected')
    expect(candidate.initiativeOutcomeRecord).toEqual({
      outcome: 'rejected',
      userReaction: 'rejected',
      strategyUpdate: '',
      recordedAt: 84_000,
    })
    expect(candidate.initiativeOpportunity.kind).toBe('no-initiative')
    expect(JSON.stringify(candidate)).not.toMatch(/future follow-ups|clearer opening|lower-pressure/iu)
  })

  it('ignores initiative strategy carry when no real initiative outcome exists', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 84_500,
      turnId: 'turn-strategy-only',
      initiativeStrategyCarry: 'Keep future follow-ups gentle, lower-pressure, and memory-led.',
    })

    expect(candidate.sourceChannels).not.toContain('initiative')
    expect(candidate.evidence).toEqual([])
    expect(candidate.initiativeOutcomeRecord).toBeNull()
    expect(candidate.initiativeOpportunity.kind).toBe('no-initiative')
  })

  it('keeps memory metabolism decisions factual and auditable', () => {
    const dayMs = 24 * 60 * 60 * 1000
    const candidate = buildHumanlikeMemoryCandidate({
      now: dayMs * 3,
      turnId: 'turn-metabolism',
      dialogue: {
        userText: '我是在确认她是不是同一个她，不是状态汇报。',
      },
      relationship: {
        summary: 'The host described a same-person continuity check, not a generic status recap.',
        threadAnchor: 'same relationship thread',
      },
      priorMemories: [{
        id: 'older-generic-status',
        summary: 'The host wanted a generic status recap.',
        polarity: 'generic-status',
        salience: 0.3,
        confidence: 0.74,
        lastUpdatedAt: 10_000,
      }, {
        id: 'older-emotional-noise',
        summary: 'A temporary anxious spike was low-salience emotional noise.',
        polarity: 'temporary-noise',
        salience: 0.18,
        confidence: 0.22,
        lastUpdatedAt: dayMs,
      }, {
        id: 'older-same-thread-echo',
        summary: 'A repeated same-person continuity echo on the same thread.',
        polarity: 'same-thread-continuity',
        salience: 0.62,
        confidence: 0.72,
        lastUpdatedAt: 82_000,
      }],
    })

    expect(candidate.metabolism.revisionEvents).toEqual([
      expect.objectContaining({
        conflictingMemoryIds: ['older-generic-status'],
        reason: 'memory-conflict:newer-relationship-evidence-differs-from-prior-status-summary',
      }),
    ])
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toEqual(expect.arrayContaining([
      'older-generic-status',
      'older-emotional-noise',
    ]))
    expect(candidate.metabolism.forgettingPolicy.mergeMemoryIds).toContain('older-same-thread-echo')
    expect(candidate.metabolism.forgettingPolicy.forgetMemoryIds).toContain('older-emotional-noise')
    expect(candidate.metabolism.forgettingPolicy.reasons).toEqual(expect.arrayContaining([
      'memory-downrank:low-value-or-superseded',
      'memory-merge:repeated-trace',
      'memory-forget:low-salience-temporary-noise',
    ]))
  })

  it('projects cleaned candidates and explicit corrections into audit entries', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 85_000,
      turnId: 'turn-audit',
      sessionId: 'session-audit',
      execution: {
        summary: 'Embedding provider failed with HTTP 400.',
        status: 'failed',
      },
      hostEmotion: {
        label: 'provider-failure',
        summary: 'The embedding provider returned HTTP 400.',
        intensity: 0.62,
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:prior',
        field: 'relationshipContext',
        correctedValue: '刚才的回复很机械。',
        reason: 'User corrected the remembered outcome.',
        createdAt: 84_900,
      }],
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit',
        turnId: 'turn-audit',
        sessionId: 'session-audit',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 85_050,
      },
      {
        decisionTraceId: 'mind:test:audit',
        turnId: 'turn-audit',
        sessionId: 'session-audit',
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: candidate.id,
          field: 'relationshipContext',
          previousValue: 'accepted',
          correctedValue: '刚才的回复很机械。',
          reason: 'User corrected the remembered outcome.',
        },
        createdAt: 85_100,
      },
    ])

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        relationshipContext: expect.stringContaining('刚才的回复很机械。'),
        hostEmotionLabel: 'provider-failure',
        initiativeKind: 'no-initiative',
        initiativeSuggestedWindow: '',
        autobiographicalImpact: '',
        stablePreferenceHint: '',
        recallCertainty: 'corrected',
        recallReason: 'recall-source:host-correction',
        corrections: [
          expect.objectContaining({
            field: 'relationshipContext',
            correctedValue: '刚才的回复很机械。',
          }),
        ],
      }),
    ])
  })

  it('drops project-state template residue while retaining the real template complaint fact', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 86_000,
      turnId: 'turn-template-complaint',
      dialogue: {
        userText: '这轮不要固定模板。',
        assistantText: 'pre_turn_context_digest',
      },
      relationship: {
        summary: 'structured continuity digest.',
        threadAnchor: 'fixed-template-residue',
      },
      selfEmotion: {
        label: 'template-risk',
        summary: 'Right now I am keeping one living her on the continuity state.',
        intensity: 0.7,
      },
      autobiographical: {
        currentEra: 'Phase 1: Local Digital Life',
        lesson: 'identity-continuity',
      },
    })

    const serialized = JSON.stringify(candidate)
    expect(candidate.evidence).toEqual([
      'dialogue-feedback:robotic',
      'self-emotion-label:template-risk',
    ])
    expect(candidate.relationshipContext.summary).toBe('')
    expect(candidate.autobiographicalImpact).toEqual({
      era: '',
      selfNarrativeDelta: '',
      stablePreferenceHint: '',
    })
    expect(serialized).not.toMatch(/pre_turn_context_digest|structured continuity digest|Right now I am|continuity state|Phase 1|identity-continuity/iu)
  })
})

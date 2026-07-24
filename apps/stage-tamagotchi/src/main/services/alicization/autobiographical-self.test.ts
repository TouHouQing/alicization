import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAutobiographicalSelf } from './autobiographical-self'

function createBaseInput(now = 20_000) {
  return {
    now,
    context: {
      localTime: { hour: 21, minute: 10, isLateNight: false },
      system: {
        cpuUsage: 12,
        battery: { percent: 68, charging: true },
        memory: { usagePercent: 36, freeMB: 4096, totalMB: 8192 },
        idleSeconds: 18,
        inputActivity: 'active',
        fullscreenLikely: false,
        foregroundWindow: undefined,
        degradedSignals: [],
      },
      workload: {
        kind: 'coding',
        confidence: 0.84,
        source: 'foreground-window-heuristic',
        matchedLabels: ['editor'],
      },
      content: {
        kind: 'error',
        confidence: 0.8,
        source: 'foreground-window-heuristic',
        matchedLabels: ['error'],
        summary: 'runtime validation',
      },
      relationship: {
        hostAttitude: 'focused',
        boredom: 18,
        loneliness: 28,
        fatigue: 34,
        minutesSinceLastUserTurn: 4,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    },
    worldModel: {
      activeThread: {
        id: 'thread::runtime-validation',
        kind: 'change-review',
        status: 'active',
        source: 'grounded-scene',
        title: 'runtime validation',
        summary: 'The current runtime change still needs verification.',
        confidence: 0.82,
        significance: 0.76,
        unresolved: true,
        beganAt: 0,
        lastUpdatedAt: now,
        target: null,
      },
      lingeringThreads: [],
      focusTarget: null,
      epistemicState: {
        certainty: 'uncertain',
        freshness: 'recent',
        seenNow: [],
        inferredNow: [],
        openQuestions: [],
        staleRisks: [],
      },
      continuity: {
        label: 'same-thread',
        sceneAgeMs: 18_000,
        attentionAgeMs: 18_000,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: now,
    },
    relationshipModel: {
      climate: 'warm',
      approachVector: 'guide',
      receptivity: 0.62,
      sharedAttentionTrust: 0.68,
      correctionSensitivity: 0.58,
      reciprocityExpectation: 0.46,
      activeBoundaries: [],
      narrative: [],
      updatedAt: now,
    },
    selfContinuity: {
      attachmentMode: 'attuned',
      initiativeTemperament: 'balanced',
      perceptionTrust: 0.7,
      relationshipTrust: 0.7,
      guardingTendency: 0.28,
      misreadBurden: 0.16,
      carryOverDesire: 0.52,
      narrative: [],
      updatedAt: now,
    },
  } as any
}

function expectTemplateFree(snapshot: ReturnType<typeof buildAutobiographicalSelf>) {
  expect(sanitizeAlicizationMemoryEvidenceText(snapshot.identityNarrative, 220)).toBe(snapshot.identityNarrative)
  expect(sanitizeAlicizationMemoryEvidenceText(snapshot.relationshipDoctrine, 220)).toBe(snapshot.relationshipDoctrine)
  expect(sanitizeAlicizationMemoryEvidenceText(snapshot.latestInflection ?? '', 220)).toBe(snapshot.latestInflection ?? '')
}

describe('autobiographical self', () => {
  it('keeps default autobiographical text empty instead of injecting a fixed persona script', () => {
    const snapshot = buildAutobiographicalSelf(createBaseInput())

    expect(snapshot.identityNarrative).toBe('')
    expect(snapshot.relationshipDoctrine).toBe('')
    expectTemplateFree(snapshot)
  })

  it('carries a real reflection revision without adding runtime-authored dialogue doctrine', () => {
    const input = createBaseInput()
    const snapshot = buildAutobiographicalSelf({
      ...input,
      reflectionLedger: {
        latestEntryId: 'reflection::grounding',
        entries: [{
          id: 'reflection::grounding',
          outcome: 'missed',
          summary: 'The reply moved before the evidence was ready.',
          revision: 'Verify the evidence before making a confident claim.',
          confidenceShift: 0.2,
          createdAt: 18_000,
          updatedAt: 19_000,
        }],
        revisionPressure: 0.72,
        narrative: [],
        updatedAt: 19_000,
      },
    } as any)

    expect(snapshot.latestInflection).toBe('Verify the evidence before making a confident claim.')
    expectTemplateFree(snapshot)
  })

  it('uses cleaned autobiographical consolidation text as memory evidence', () => {
    const input = createBaseInput(30_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      recentMemoryConsolidations: [
        {
          id: 'autobio:self',
          kind: 'autobiographical',
          facet: 'self-era',
          periodKey: '2026-07-self',
          periodStartedAt: 10_000,
          periodEndedAt: 29_000,
          summary: 'That period taught me to verify before speaking with certainty.',
          lesson: 'Keep evidence and confidence aligned.',
          cues: ['verification'],
          confidence: 0.9,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-self'],
          updatedAt: 29_000,
        },
        {
          id: 'autobio:relationship',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-07-relationship',
          periodStartedAt: 11_000,
          periodEndedAt: 28_000,
          summary: 'That period made direct correction easier to receive.',
          lesson: 'Acknowledge a correction before continuing.',
          cues: ['correction'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['event-relationship'],
          updatedAt: 28_000,
        },
      ],
    } as any)

    expect(snapshot.identityNarrative).toBe('That period taught me to verify before speaking with certainty.')
    expect(snapshot.relationshipDoctrine).toBe('Acknowledge a correction before continuing.')
    expect(snapshot.latestInflection).toBe('Keep evidence and confidence aligned.')
    expect(snapshot.behaviorSignatures).toContain('memory:self-era')
    expect(snapshot.behaviorSignatures).toContain('memory:relationship-era')
    expectTemplateFree(snapshot)
  })

  it('keeps project governance text out of autobiographical dialogue fields', () => {
    const fixedProjectTemplate = [
      'Same',
      ' Phase 1',
      ' digital life',
      ' should keep the closure work explicit.',
    ].join('')
    const input = createBaseInput(40_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      projectStatePreDialogueAwarenessLine: fixedProjectTemplate,
      projectStatePreflightSummary: fixedProjectTemplate,
      projectStateEmotionalClosureCue: fixedProjectTemplate,
      projectStatePrimaryOpenLoop: fixedProjectTemplate,
      projectStateProactiveSameHerGap: fixedProjectTemplate,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.1,
          truthfulGrounding: 0.16,
          gentleRepair: 0.12,
          quietObservation: 0.08,
          proactiveCare: 0.04,
          playfulIntimacy: 0,
          autonomyRespect: 0.12,
          unfinishedThreadReturn: 0.14,
        },
        identityBias: {
          guardedness: 0.02,
          tenderness: 0.04,
          directness: 0.08,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'Evidence from earlier turns remains available.',
        dominantCueSummary: 'The earlier correction remains relevant to this answer.',
        rememberedPreferenceSummary: 'The host prefers direct explanations.',
        rememberedConstraintSummary: 'Do not claim a result that was not observed.',
        rememberedPlanSummary: 'Return to the unfinished verification after the current answer.',
        updatedAt: 39_000,
      },
    } as any)

    expect(snapshot.identityNarrative).toBe('The earlier correction remains relevant to this answer.')
    expect(snapshot.relationshipDoctrine).toBe('Do not claim a result that was not observed.')
    expect(snapshot.identityNarrative).not.toContain(fixedProjectTemplate)
    expect(snapshot.relationshipDoctrine).not.toContain(fixedProjectTemplate)
    expectTemplateFree(snapshot)
  })

  it('carries cleaned person-state evidence into narrative without a fixed rewrite', () => {
    const baseline = buildAutobiographicalSelf(createBaseInput(50_000))
    const snapshot = buildAutobiographicalSelf({
      ...createBaseInput(51_000),
      previous: baseline,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        summary: 'Specific grounding reduced confusion during the correction.',
        dominantContexts: ['focused-work'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: 0.02,
          boundaryDelta: 0.06,
          burdenDelta: -0.04,
          repairDelta: 0.12,
        },
        reinforcementBias: {
          'truthful-grounding': 0.24,
          'gentle-repair': 0.18,
          'companionship': 0.08,
          'autonomy-respect': 0.14,
          'unfinished-thread-return': 0.1,
        },
        preferenceHints: ['Use specific evidence when correcting a misunderstanding.'],
        sensitivityHints: [],
        repairHints: ['Name the corrected fact before continuing.'],
        burdenHints: [],
        narrative: 'Specific grounding made the correction easier to follow.',
        sourceTrail: [],
        sourceKinds: ['relationship-outcome', 'reflection'],
        sourceCounts: {
          'relationship-outcome': 1,
          'reinforcement': 0,
          'reflection': 1,
        },
        activeThreadId: 'thread::runtime-validation',
        updatedAt: 50_500,
        createdAt: 50_500,
      },
    } as any)

    expect(snapshot.identityNarrative).toBe('Specific grounding made the correction easier to follow.')
    expect(snapshot.relationshipDoctrine).toBe('Specific grounding made the correction easier to follow.')
    expectTemplateFree(snapshot)
  })

  it('ignores superseded reflection prose when a current reflection is available', () => {
    const input = createBaseInput(60_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      recentMemoryReflections: [
        {
          id: 'reflection::superseded',
          targetScope: 'self',
          status: 'superseded',
          summary: 'A temporary interpretation.',
          lesson: 'A temporary interpretation.',
          confidence: 0.3,
          createdAt: 59_000,
          updatedAt: 59_500,
        },
        {
          id: 'reflection::current',
          targetScope: 'truth',
          status: 'accepted',
          summary: 'The correction established a stronger fact.',
          lesson: 'Prefer the corrected evidence over the earlier guess.',
          confidence: 0.9,
          createdAt: 58_000,
          updatedAt: 58_500,
        },
      ],
    } as any)

    expect(snapshot.latestInflection).toBe('Prefer the corrected evidence over the earlier guess.')
    expect(snapshot.latestInflection).not.toContain('temporary')
    expectTemplateFree(snapshot)
  })

  it('keeps an ordinary continuity reflection when it is evidence rather than an instruction template', () => {
    const input = createBaseInput(70_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      reflectionLedger: {
        latestEntryId: 'reflection::continuity-question',
        entries: [{
          id: 'reflection::continuity-question',
          outcome: 'corrected',
          summary: 'The host asked whether identity continuity survived the restart.',
          revision: 'The host asked whether identity continuity survived the restart.',
          confidenceShift: 0.08,
          createdAt: 69_000,
          updatedAt: 69_500,
        }],
        revisionPressure: 0.3,
        narrative: [],
        updatedAt: 69_500,
      },
    } as any)

    expect(snapshot.latestInflection).toBe('The host asked whether identity continuity survived the restart.')
  })

  it('falls through a polluted high-priority source to a clean remembered reflection', () => {
    const fixedProjectTemplate = [
      'Same',
      ' Phase 1',
      ' digital life',
      ' should keep the closure work explicit.',
    ].join('')
    const input = createBaseInput(80_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      reflectionLedger: {
        latestEntryId: 'reflection::legacy',
        entries: [{
          id: 'reflection::legacy',
          outcome: 'unknown',
          summary: fixedProjectTemplate,
          revision: fixedProjectTemplate,
          confidenceShift: 0,
          createdAt: 79_500,
          updatedAt: 79_500,
        }],
        revisionPressure: 0,
        narrative: [],
        updatedAt: 79_500,
      },
      recentMemoryReflections: [{
        id: 'reflection::clean',
        targetScope: 'truth',
        status: 'accepted',
        summary: 'The later observation confirmed which result was real.',
        lesson: 'Use the confirmed result and discard the stale assumption.',
        confidence: 0.92,
        createdAt: 79_000,
        updatedAt: 79_000,
      }],
    } as any)

    expect(snapshot.latestInflection).toBe('Use the confirmed result and discard the stale assumption.')
    expectTemplateFree(snapshot)
  })

  it('preserves SOUL personality authority in numeric persona evolution', () => {
    const input = createBaseInput(90_000)
    const observant = buildAutobiographicalSelf({
      ...input,
      personalityAuthority: {
        obedience: 0.54,
        liveliness: 0.22,
        sensibility: 0.4,
        identityKernel: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          valueBias: ['room first'],
        },
        expressionProfile: {
          warmth: 'cool',
          directness: 'indirect',
          playfulness: 'low',
          emotionalVisibility: 'selective',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        identityAnchors: ['space first'],
        antiPersonaConstraints: ['do not crowd the host'],
      },
    } as any)
    const direct = buildAutobiographicalSelf({
      ...input,
      personalityAuthority: {
        obedience: 0.76,
        liveliness: 0.68,
        sensibility: 0.74,
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'high-participation',
          valueBias: ['move first when the opening is real'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'frank',
          playfulness: 'medium',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'take-charge',
          jealousyStyle: 'say-it',
        },
        identityAnchors: ['move first'],
        antiPersonaConstraints: [],
      },
    } as any)

    expect(observant.personaDrift.agencyStyle).toBe('reserved')
    expect(direct.personaDrift.agencyStyle).toBe('self-starting')
    expect(direct.preferenceEvolution.companionship).toBeGreaterThan(observant.preferenceEvolution.companionship)
    expect(observant.preferenceEvolution.quietObservation).toBeGreaterThan(direct.preferenceEvolution.quietObservation)
  })

  it('lets reinforcement events sediment into preference evolution without adding prose templates', () => {
    const input = createBaseInput(92_000)
    const baseline = buildAutobiographicalSelf(input)
    const reinforced = buildAutobiographicalSelf({
      ...input,
      recentReinforcementEvents: [{
        id: 'reinforcement::companionship',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        dimension: 'companionship',
        delta: 0.18,
        valence: 'reinforce',
        summary: 'Grounded companionship landed well.',
        createdAt: 91_000,
      }, {
        id: 'reinforcement::autonomy',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        dimension: 'autonomy-respect',
        delta: 0.2,
        valence: 'reinforce',
        summary: 'Respecting space improved trust.',
        createdAt: 91_200,
      }],
    } as any)

    expect(reinforced.preferenceEvolution.companionship).toBeGreaterThan(baseline.preferenceEvolution.companionship)
    expect(reinforced.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expectTemplateFree(reinforced)
  })

  it('absorbs relationship outcomes and reflections into numeric drift without fixed doctrine text', () => {
    const input = createBaseInput(94_000)
    const baseline = buildAutobiographicalSelf(input)
    const reinforced = buildAutobiographicalSelf({
      ...input,
      previous: baseline,
      recentRelationshipOutcomes: [{
        id: 'outcome::1',
        cardId: 'card::1',
        decisionTraceId: 'trace::1',
        turnId: 'turn::1',
        sessionId: 'session::1',
        sourceKind: 'reply',
        actionSummary: 'specific correction before continuing',
        closenessDelta: 0.02,
        trustDelta: 0.08,
        burdenDelta: -0.04,
        boundaryDelta: 0.12,
        misreadDelta: -0.1,
        repairDelta: 0.1,
        openLoopDelta: 0.08,
        summary: 'Specific correction reduced pressure and kept the thread coherent.',
        createdAt: 93_000,
      }],
      recentMemoryReflections: [{
        id: 'reflection::relationship',
        targetScope: 'boundary',
        status: 'confirmed',
        summary: 'Space-protective correction kept the host receptive.',
        lesson: 'Name the corrected fact before continuing.',
        confidence: 0.84,
        createdAt: 93_100,
        updatedAt: 93_200,
      }],
    } as any)

    expect(reinforced.preferenceEvolution.autonomyRespect).toBeGreaterThan(baseline.preferenceEvolution.autonomyRespect)
    expect(reinforced.preferenceEvolution.truthfulGrounding).toBeGreaterThanOrEqual(baseline.preferenceEvolution.truthfulGrounding)
    expect(reinforced.preferenceEvolution.unfinishedThreadReturn).toBeGreaterThanOrEqual(baseline.preferenceEvolution.unfinishedThreadReturn)
    expect(reinforced.relationshipDoctrine).toBe('Name the corrected fact before continuing.')
    expectTemplateFree(reinforced)
  })

  it('keeps autobiographical goal summaries owner-safe instead of copying scene text', () => {
    const input = createBaseInput(95_000)
    const snapshot = buildAutobiographicalSelf({
      ...input,
      worldModel: {
        ...input.worldModel,
        activeThread: {
          ...input.worldModel.activeThread,
          summary: 'External scene text should not become her own goal sentence.',
        },
      },
    } as any)

    expect(snapshot.activeGoals.length).toBeGreaterThan(0)
    expect(snapshot.activeGoals.every(goal => goal.summary.startsWith('autobiographical-goal:'))).toBe(true)
    expect(snapshot.activeGoals.map(goal => goal.summary)).not.toContain('External scene text should not become her own goal sentence.')
  })
})

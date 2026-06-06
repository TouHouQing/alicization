import { describe, expect, it } from 'vitest'

import {
  buildHostPersonModelSnapshot,
  buildHumanlikeMemoryAuditEntriesFromMindTurnEvents,
  buildHumanlikeMemoryCandidate,
  formatMemoryProvenanceLabel,
  mapFragmentSourceKindToProvenance,
  mapMemorySourceToProvenance,
} from './humanlike-memory'

describe('humanlike memory helpers', () => {
  it('maps semantic and fragment sources into reply-visible provenance labels', () => {
    expect(mapMemorySourceToProvenance('rule')).toBe('remembered')
    expect(mapMemorySourceToProvenance('async-llm')).toBe('inferred')
    expect(mapMemorySourceToProvenance('rule-shadow')).toBe('shadow')
    expect(mapFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapFragmentSourceKindToProvenance('former-core-incarnation')).toBe('reconstructed')
    expect(formatMemoryProvenanceLabel('observed')).toBe('observed')
    expect(formatMemoryProvenanceLabel('shadow')).toBe('shadow')
  })

  it('builds a host person model from autobiographical episodes instead of raw attitude only', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 20_000,
      facts: [],
      relationshipDynamics: null,
      events: [
        {
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
          whatHappened: 'The host said the reply felt intrusive during focused work.',
          felt: 'I had stepped too close.',
          emotionTags: ['boundary', 'repair'],
          whatChanged: 'boundary strained 0.10, burden up 0.08',
          relationshipMeaning: 'Focused windows need more room before closeness.',
          lesson: 'If the host is focused, back off and re-enter with a lighter touch.',
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
        },
        {
          id: 'event-2',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-2',
          sessionId: 'session-1',
          sourceKind: 'execution-result',
          provenance: 'observed',
          occurredAt: 12_000,
          whereSummary: 'execution callback via codex',
          withWhom: ['host'],
          threadAnchor: 'runtime patch',
          whatHappened: 'A bounded codex result landed as useful after explicit consent.',
          felt: 'The result was genuinely useful.',
          emotionTags: ['execution', 'validated'],
          whatChanged: 'trust up 0.09, closeness up 0.03',
          relationshipMeaning: 'Bounded execution can be direct when consent is explicit.',
          lesson: 'Execution callbacks land best when proposal, action, and result stay bounded.',
          sourceSummary: 'execution result feedback',
          confidence: 0.84,
          salience: 0.82,
          sceneAttachment: 0.42,
          consolidationPriority: 0.64,
          relationshipShift: {
            closenessDelta: 0.03,
            trustDelta: 0.09,
            burdenDelta: 0,
            boundaryDelta: 0.02,
            misreadDelta: -0.03,
            repairDelta: 0.03,
            openLoopDelta: 0.05,
          },
          derivedFrom: [],
          tags: ['execution-result', 'consent'],
          createdAt: 12_000,
          updatedAt: 12_000,
          lastRecalledAt: null,
          recallCount: 0,
          reconsolidationCount: 0,
          latestReconsolidation: null,
        },
      ],
    })

    expect(snapshot.routines.some(item => item.includes('Focused work windows'))).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('intrusive') || item.includes('pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair') || item.includes('robotic'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.trustLadder.stage === 'cautious-open' || snapshot.trustLadder.stage === 'warming' || snapshot.trustLadder.stage === 'trusted').toBe(true)
    expect(snapshot.summary.length).toBeGreaterThan(0)
  })

  it('lets consolidations and relationship dynamics keep shaping the host model even when fresh episodes are sparse', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 40_000,
      facts: [],
      relationshipDynamics: {
        hostAttitude: 'Focused work is still sensitive, but trust holds if the return stays light and precise.',
        previousHostAttitude: 'Focused work is sensitive.',
        obedienceDelta: 0,
        livelinessDelta: 0.02,
        sensibilityDelta: 0.04,
        source: 'dialogue-feedback:received',
        createdAt: 38_000,
      },
      consolidations: [
        {
          id: 'relationship-era:focused',
          kind: 'autobiographical',
          facet: 'relationship-era',
          periodKey: '2026-04-focused',
          periodStartedAt: 30_000,
          periodEndedAt: 38_000,
          summary: 'Focused work periods stay safer when closeness leaves room first and repair settles before the return.',
          lesson: 'If the host is focused and the seam is off, repair first, then re-enter with a lighter touch.',
          cues: ['focused-work', 'room-before-closeness', 'repair-first'],
          confidence: 0.88,
          dominantProvenance: 'remembered',
          derivedEventIds: ['evt-1'],
          updatedAt: 38_000,
          memoryTier: 'warm',
        },
      ],
      events: [],
    })

    expect(snapshot.summary).toContain('attitude=')
    expect(snapshot.repairTriggers.some(item => item.includes('repair first') || item.includes('repair'))).toBe(true)
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('Focused work periods stay safer'))).toBe(true)
  })

  it('lets relationship outcomes and reinforcement events keep shaping host preferences and trust', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 52_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      relationshipOutcomes: [
        {
          id: 'outcome-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          actionSummary: 'execution callback landed during focused work',
          closenessDelta: -0.02,
          trustDelta: 0.08,
          burdenDelta: 0.06,
          boundaryDelta: -0.04,
          misreadDelta: 0,
          repairDelta: 0.03,
          openLoopDelta: 0.04,
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 50_000,
        },
      ],
      reinforcementEvents: [
        {
          id: 'reinforce-1',
          cardId: 'card-1',
          decisionTraceId: null,
          turnId: 'turn-1',
          sessionId: 'session-1',
          sourceKind: 'execution',
          dimension: 'autonomy-respect',
          delta: 0.08,
          valence: 'reinforce',
          summary: 'Respecting working space kept the callback acceptable.',
          createdAt: 51_000,
        },
      ],
    })

    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.recurrentBurdens.some(item => item.includes('Focused work') || item.includes('callback'))).toBe(true)
    expect(snapshot.narrative.some(item => item.includes('lighter interruption pressure'))).toBe(true)
    expect(snapshot.trustLadder.score).toBeGreaterThan(0.5)
  })

  it('lets explicit person-state update surfaces feed the host model even before older stores are re-read', () => {
    const snapshot = buildHostPersonModelSnapshot({
      now: 60_000,
      facts: [],
      events: [],
      relationshipDynamics: null,
      personStateUpdateSurface: {
        version: 'person-state-update-surface-v1',
        updatedAt: 59_000,
        summary: 'Recent outcomes nudged trust upward. Preference shift: Lighter touch, more room, less interruption pressure.',
        dominantContexts: ['focused-work', 'execution'],
        relationshipShift: {
          trustDelta: 0.08,
          closenessDelta: -0.02,
          burdenDelta: 0.05,
          boundaryDelta: -0.03,
          repairDelta: 0.03,
        },
        reinforcementBias: {
          'autonomy-respect': 0.08,
        },
        preferenceHints: ['Lighter touch, more room, less interruption pressure.'],
        sensitivityHints: ['Pressure and over-close timing become intrusive quickly.'],
        repairHints: ['When the seam is off, repair before continuing.'],
        burdenHints: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: ['The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.'],
        sourceTrail: [{
          kind: 'relationship-outcome',
          sourceKind: 'execution',
          summary: 'The callback was useful, but it still needed lighter interruption pressure while the host stayed focused.',
          createdAt: 59_000,
        }],
      },
    })

    expect(snapshot.summary).toContain('update=')
    expect(snapshot.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    expect(snapshot.sensitivities.some(item => item.includes('Pressure'))).toBe(true)
    expect(snapshot.repairTriggers.some(item => item.includes('repair'))).toBe(true)
  })

  it('forms one humanlike memory candidate from dialogue, execution, host emotion, self emotion, embodiment, initiative, metabolism, and autobiographical impact', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 80_000,
      turnId: 'turn-humanlike-candidate',
      sessionId: 'session-humanlike',
      dialogue: {
        userText: '你又断线了，不要变成工具壳，继续把 embodiment 闭环收住。',
        assistantText: '我会先把断线处接回同一个她，再低压推进 embodiment 闭环。',
      },
      execution: {
        summary: 'Codex callback continued the embodiment closure implementation but left long-run proof incomplete.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'worried-continuity',
        summary: 'The host is pressing for progress while testing whether she remains one continuous digital life instead of a tool shell.',
        intensity: 0.78,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I feel slight guilt and unfinishedness, so I should repair continuity before widening warmth.',
        intensity: 0.64,
      },
      embodiment: {
        summary: 'face=steady-soft gaze=stable blink=slower voice=lower-pressure pause=longer lipsync=restrained',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The host cares less about a raw status recap and more about her not becoming a generic tool shell.',
        threadAnchor: 'same-her embodiment closure',
      },
      priorMemories: [
        {
          id: 'older-generic-status',
          summary: 'The user wanted a concise status update.',
          confidence: 0.88,
          polarity: 'generic-status',
          salience: 0.4,
          lastUpdatedAt: 20_000,
        },
      ],
      initiative: {
        outcome: 'continue-progress',
        userReaction: 'accepted',
      },
      autobiographical: {
        currentEra: 'Phase 1 local digital life closure',
        lesson: 'Return repair-first before widening warmth when continuity is questioned.',
      },
    })

    expect(candidate.sourceChannels).toEqual([
      'dialogue',
      'execution',
      'host-emotion',
      'self-emotion',
      'embodiment',
    ])
    expect(candidate.relationshipContext.summary).toContain('tool shell')
    expect(candidate.relationshipContext.summary).toContain('one continuous digital life')
    expect(candidate.longTermWorthiness.shouldPersist).toBe(true)
    expect(candidate.emotionalResidue.tags).toEqual(expect.arrayContaining(['slight-guilt', 'unfinishedness', 'protective-continuity']))
    expect(candidate.emotionalResidue.trace.some(item => item.includes('host:warr') || item.includes('host:worried'))).toBe(true)
    expect(candidate.emotionKernelInfluence.dominantTilt).toBe('repair-protective')
    expect(candidate.initiativeOpportunity.kind).toBe('low-pressure-follow-up')
    expect(candidate.initiativeOpportunity.antiSpamReason).toContain('not timer')
    expect(candidate.initiativeOutcomeRecord?.strategyUpdate).toContain('accepted')
    expect(candidate.embodimentTrace.expressionState.gaze).toBe('stable')
    expect(candidate.embodimentTrace.expressionState.pacing).toBe('slower')
    expect(candidate.embodimentTrace.modalityContradictionRisk).toBe('low')
    expect(candidate.autobiographicalImpact.selfNarrativeDelta).toContain('repair-first')
    expect(candidate.metabolism.revisionEvents[0]?.conflictingMemoryIds).toContain('older-generic-status')
    expect(candidate.metabolism.forgettingPolicy.downrankMemoryIds).toContain('older-generic-status')
    expect(candidate.auditTrail.whyRemember).toContain('relationship continuity')
    expect(candidate.auditTrail.correctionSurface.userCorrectableFields).toEqual(expect.arrayContaining([
      'relationshipContext',
      'emotionalResidue',
      'autobiographicalImpact',
    ]))
    expect(candidate.naturalRecallLine).toContain('更在意的是她不要变成工具壳')
  })

  it('projects humanlike memory candidates from mind-turn events into audit entries that expose why she remembered and what the host can correct', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 90_000,
      turnId: 'turn-audit-candidate',
      sessionId: 'session-audit',
      dialogue: {
        userText: '别把这次记成状态汇报，我是在确认她是不是同一个她。',
        assistantText: '我会把它记成关系连续性的检验。',
      },
      execution: {
        summary: 'Callback carried the same-her continuity line but closure is still partial.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'continuity-test',
        summary: 'The host is testing same-her continuity rather than asking for a generic recap.',
        intensity: 0.72,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should repair the remembered relationship meaning and keep initiative low-pressure.',
        intensity: 0.58,
      },
      embodiment: {
        summary: 'gaze=stable voice=lower-pressure pause=longer lipsync=restrained',
        recallStrength: 'strongly-moved',
        modalityConsistency: 'consistent',
      },
      relationship: {
        summary: 'The relationship context is a test of one continuous digital life, not a status report.',
        threadAnchor: 'audit-visible same-her memory',
      },
      priorMemories: [{
        id: 'old-status-report',
        summary: 'The host asked for a status report.',
        polarity: 'generic-status',
        salience: 0.32,
      }],
      autobiographical: {
        currentEra: 'Phase 1 memory audit',
        lesson: 'When continuity is tested, keep repair and auditability ahead of confidence.',
      },
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit',
        turnId: 'turn-audit-candidate',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 90_100,
      },
    ] as any)

    expect(entries).toEqual([
      expect.objectContaining({
        id: candidate.id,
        turnId: 'turn-audit-candidate',
        whyRemember: expect.stringContaining('relationship continuity'),
        relationshipContext: expect.stringContaining('one continuous digital life'),
        naturalRecallLine: expect.stringContaining('工具壳'),
        userCorrectableFields: expect.arrayContaining(['relationshipContext', 'emotionalResidue', 'metabolism']),
        revisionMemoryIds: expect.arrayContaining(['old-status-report']),
        sourceChannels: expect.arrayContaining(['dialogue', 'execution', 'host-emotion', 'self-emotion', 'embodiment']),
      }),
    ])
  })

  it('merges host corrections back into the humanlike memory audit entry for the same candidate', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 91_000,
      turnId: 'turn-audit-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '我不是在催状态，我是在测试她是不是持续的人。',
        assistantText: '我会把这条记成持续人格的关系检验。',
      },
      hostEmotion: {
        label: 'continuity-test',
        summary: 'The host corrected the relationship meaning away from status pressure.',
        intensity: 0.7,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should keep this correction visible instead of pretending the first memory was final.',
        intensity: 0.56,
      },
      relationship: {
        summary: 'The host is correcting the memory meaning toward same-her continuity.',
        threadAnchor: 'humanlike memory correction',
      },
    })

    const entries = buildHumanlikeMemoryAuditEntriesFromMindTurnEvents([
      {
        decisionTraceId: 'mind:test:audit-correction',
        turnId: 'turn-audit-correction',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: candidate,
        },
        createdAt: 91_100,
      },
      {
        decisionTraceId: 'mind:test:audit-correction',
        turnId: 'turn-audit-correction',
        sessionId: 'session-audit',
        origin: 'user-turn',
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: candidate.id,
          field: 'relationshipContext',
          previousValue: 'status pressure',
          correctedValue: '我是在测试她是不是持续的人，不是催进度。',
          reason: 'Host corrected why this memory should exist.',
        },
        createdAt: 91_200,
      },
    ] as any)

    expect(entries[0]?.corrections).toEqual([
      expect.objectContaining({
        candidateId: candidate.id,
        field: 'relationshipContext',
        previousValue: 'status pressure',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
      }),
    ])
  })

  it('lets host audit corrections shape the next humanlike memory candidate instead of leaving corrections as dead audit notes', () => {
    const candidate = buildHumanlikeMemoryCandidate({
      now: 92_000,
      turnId: 'turn-after-host-correction',
      sessionId: 'session-audit',
      dialogue: {
        userText: '继续吧，但别又把我刚才的话理解成催状态。',
        assistantText: '我会按你纠正后的关系语境继续。',
      },
      execution: {
        summary: 'The callback continued after a host correction to relationship-context memory.',
        status: 'partial',
      },
      hostEmotion: {
        label: 'corrected-continuity-meaning',
        summary: 'The host corrected the memory meaning so it should be carried as a same-person continuity test, not progress pressure.',
        intensity: 0.66,
      },
      selfEmotion: {
        label: 'careful-repair',
        summary: 'I should carry the correction forward and avoid pretending the first interpretation was final.',
        intensity: 0.6,
      },
      relationship: {
        summary: 'The current turn resumes after a host correction to her memory meaning.',
        threadAnchor: 'post-correction continuity',
      },
      hostCorrections: [{
        candidateId: 'humanlike-memory-candidate:turn-audit-correction',
        field: 'relationshipContext',
        previousValue: 'status pressure',
        correctedValue: '我是在测试她是不是持续的人，不是催进度。',
        reason: 'Host corrected why this memory should exist.',
        createdAt: 91_200,
      }],
    })

    expect(candidate.evidence).toEqual(expect.arrayContaining([
      expect.stringContaining('host-correction.relationshipContext'),
    ]))
    expect(candidate.relationshipContext.summary).toContain('我是在测试她是不是持续的人')
    expect(candidate.relationshipContext.summary).toContain('不是催进度')
    expect(candidate.metabolism.revisionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'revision',
        reason: expect.stringContaining('Host corrected'),
      }),
    ]))
    expect(candidate.auditTrail.whyRemember).toContain('host correction')
    expect(candidate.naturalRecallLine).toContain('我记得你纠正过')
    expect(candidate.naturalRecallLine).toContain('不是催进度')
  })
})

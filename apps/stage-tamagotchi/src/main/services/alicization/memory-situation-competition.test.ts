import { describe, expect, it } from 'vitest'

import { buildMemorySituationCompetition } from './memory-situation-competition'

describe('memory-situation-competition', () => {
  it('merges event graph, facts, procedure, conversation, and consolidation surfaces into one candidate competition', () => {
    const result = buildMemorySituationCompetition({
      queryTexts: ['继续按之前 patch verify 的 runtime repair 流程做完'],
      eventGraphCandidates: {
        version: 'memory-situation-candidates-v1',
        producedAt: Date.now(),
        queryTexts: ['runtime repair'],
        candidates: [{
          candidateId: 'memory-situation:graph-1',
          sourceKinds: ['event-graph', 'episodic-event'],
          situationKind: 'repair-arc',
          eraKey: 'Code window',
          relationshipArcKey: null,
          procedureKey: 'runtime-repair',
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-1', 'event-2'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.84,
          latencyCost: 0.18,
          status: 'selected',
          statusReason: 'graph-selected',
          summary: 'runtime repair / patch verify',
          evidenceSummary: 'repair-arc | task-thread',
        }],
        selected: [],
        rejected: [],
        suppressed: [],
        delayed: [],
        unresolved: [],
      },
      retrievedFacts: [{
        id: 'fact-1',
        subject: 'runtime repair sequence',
        predicate: 'prefers',
        object: 'patch first, verify second',
        confidence: 0.7,
        source: 'rule',
        dedupeKey: 'procedure:runtime-repair-sequence',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessAt: null,
        accessCount: 0,
        memoryDomain: 'procedure',
        validationStatus: 'validated',
        knowledgeStage: 'validated-knowledge',
        validationCount: 2,
        contradictionCount: 0,
        sourceLabel: 'test',
        conflictsWith: [],
        supersedes: [],
        provenance: 'remembered',
        memoryTier: 'hot',
      }],
      proceduralMemories: [{
        id: 'procedure-1',
        label: 'patch -> verify',
        approach: 'patch first, verify second, then report',
        pitfalls: ['do not answer with empty shell'],
        confidence: 0.8,
        cues: ['runtime repair'],
      }],
      recalledEpisodes: [{
        id: 'event-1',
        threadAnchor: 'runtime repair',
        whereSummary: 'Code window',
        whatHappened: 'We patched the runtime repair path.',
        relationshipMeaning: null,
        lesson: 'Patch first, verify, then report.',
        sourceSummary: 'runtime repair work',
        tags: ['runtime', 'repair'],
        confidence: 0.72,
      }] as any,
      recalledConversationHistory: [{
        turnId: 'turn-1',
        sessionId: 'session-1',
        userText: '继续按之前那样做完',
        assistantText: '我还是先 patch 再 verify。',
        createdAt: Date.now(),
        provenance: 'reconstructed',
      }],
      consolidatedMemories: [{
        id: 'cons-1',
        kind: 'procedural',
        facet: 'task-era',
        periodKey: 'runtime-repair-era',
        summary: 'runtime repair 时代的收束方式',
        lesson: '先 patch 再 verify 再汇报',
        cues: ['runtime repair', 'verify'],
        confidence: 0.76,
        dominantProvenance: 'remembered',
        derivedEventIds: ['event-1'],
        periodStartedAt: Date.now() - 10_000,
        periodEndedAt: Date.now(),
        updatedAt: Date.now(),
        memoryTier: 'warm',
      }],
    })

    expect(result.version).toBe('memory-situation-candidates-v1')
    expect(result.candidates.length).toBeGreaterThan(2)
    expect(result.selected).toHaveLength(1)
    expect(result.selected[0]).toEqual(expect.objectContaining({
      candidateId: 'memory-situation:graph-1',
      status: 'selected',
    }))
    expect(result.rejected.some(item => item.sourceKinds.includes('fact'))).toBe(true)
    expect(result.rejected.some(item => item.sourceKinds.includes('conversation-turn'))).toBe(true)
    expect(result.rejected.every(item => item.suppressionReasons.some(reason => reason.startsWith('lost-to:')))).toBe(true)
  })

  it('marks plausible high-latency memories as delayed and weak memories as unresolved', () => {
    const result = buildMemorySituationCompetition({
      queryTexts: ['今天只要快速确认 weather'],
      eventGraphCandidates: {
        version: 'memory-situation-candidates-v1',
        producedAt: Date.now(),
        queryTexts: ['weather'],
        candidates: [{
          candidateId: 'memory-situation:fast-weather',
          sourceKinds: ['event-graph', 'episodic-event'],
          situationKind: 'task-thread',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: 'weather-check',
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-weather'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.62,
          latencyCost: 0.08,
          status: 'selected',
          statusReason: 'graph-selected',
          summary: 'weather check',
          evidenceSummary: 'fast task',
        }, {
          candidateId: 'memory-situation:slow-related',
          sourceKinds: ['episodic-event'],
          situationKind: 'episodic-scene',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-related'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.6,
          latencyCost: 0.72,
          status: 'unresolved',
          statusReason: null,
          summary: 'weather related but too deep for now',
          evidenceSummary: null,
        }, {
          candidateId: 'memory-situation:weak',
          sourceKinds: ['conversation-turn'],
          situationKind: 'mixed',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: [],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.12,
          latencyCost: 0.16,
          status: 'unresolved',
          statusReason: null,
          summary: 'unrelated weak thread',
          evidenceSummary: null,
        }],
        selected: [],
        rejected: [],
        suppressed: [],
        delayed: [],
        unresolved: [],
      },
    })

    expect(result.selected[0]?.candidateId).toBe('memory-situation:fast-weather')
    expect(result.delayed.some(item => item.candidateId === 'memory-situation:slow-related')).toBe(true)
    expect(result.unresolved.some(item => item.candidateId === 'memory-situation:weak')).toBe(true)
  })

  it('suppresses plausible wrong-thread candidates with explicit conflict reasons', () => {
    const result = buildMemorySituationCompetition({
      queryTexts: ['继续我们刚才的关系边界修复'],
      eventGraphCandidates: {
        version: 'memory-situation-candidates-v1',
        producedAt: Date.now(),
        queryTexts: ['关系边界修复'],
        candidates: [{
          candidateId: 'memory-situation:current-boundary',
          sourceKinds: ['event-graph', 'episodic-event', 'relationship'],
          situationKind: 'relationship-arc',
          eraKey: 'current-repair-era',
          relationshipArcKey: 'boundary-repair-with-host',
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-current'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.82,
          latencyCost: 0.14,
          status: 'selected',
          statusReason: 'graph-selected-current-arc',
          summary: 'current boundary repair arc',
          evidenceSummary: 'same host repair arc',
        }, {
          candidateId: 'memory-situation:old-task-thread',
          sourceKinds: ['event-graph', 'episodic-event', 'relationship'],
          situationKind: 'relationship-arc',
          eraKey: 'old-coding-era',
          relationshipArcKey: 'code-review-pressure-arc',
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-old'],
          competingCandidateIds: [],
          suppressionReasons: ['wrong-thread-candidate'],
          confidence: 0.66,
          latencyCost: 0.18,
          status: 'unresolved',
          statusReason: null,
          summary: 'old code review pressure arc',
          evidenceSummary: 'plausible but old thread',
        }, {
          candidateId: 'fact:expired-world-claim',
          sourceKinds: ['fact', 'world-model'],
          situationKind: 'world-claim',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: ['fact-expired'],
          selectedEvidenceIds: ['fact-expired'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.5,
          latencyCost: 0.12,
          status: 'unresolved',
          statusReason: null,
          summary: 'stale world claim',
          evidenceSummary: 'validation=expired | contradiction=1',
        }],
        selected: [],
        rejected: [],
        suppressed: [],
        delayed: [],
        unresolved: [],
      },
    })

    expect(result.selected[0]?.candidateId).toBe('memory-situation:current-boundary')
    expect(result.suppressed.map(item => item.candidateId)).toEqual(expect.arrayContaining([
      'memory-situation:old-task-thread',
      'fact:expired-world-claim',
    ]))
    expect(result.suppressed.find(item => item.candidateId === 'memory-situation:old-task-thread')?.suppressionReasons).toEqual(expect.arrayContaining([
      'source-marked-suppressed',
      'wrong-relationship-arc:memory-situation:current-boundary',
      'wrong-era:memory-situation:current-boundary',
    ]))
    expect(result.suppressed.find(item => item.candidateId === 'fact:expired-world-claim')?.suppressionReasons).toContain('world-claim-contradicted-or-expired')
    expect(result.selected[0]?.suppressionReasons).toEqual([])
  })

  it('enriches selected situation candidates with living relationship context, host attitude, affective residue, execution carry, and embodiment cadence during generation', () => {
    const result = buildMemorySituationCompetition({
      queryTexts: ['delivery correction', 'execution callback', 'focused-work boundary'],
      eventGraphCandidates: {
        version: 'memory-situation-candidates-v1',
        producedAt: Date.now(),
        queryTexts: ['delivery correction'],
        candidates: [{
          candidateId: 'memory-situation:rich-current-line',
          sourceKinds: ['event-graph', 'episodic-event'],
          situationKind: 'mixed',
          eraKey: 'current-runtime-session',
          relationshipArcKey: 'delivery correction',
          procedureKey: 'execution-callback-line',
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['event-1', 'turn-1'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.83,
          latencyCost: 0.16,
          status: 'selected',
          statusReason: 'graph-selected-current-line',
          summary: 'delivery correction and callback result',
          evidenceSummary: 'event-graph observed correction',
        }],
        selected: [],
        rejected: [],
        suppressed: [],
        delayed: [],
        unresolved: [],
      },
      hostAttitude: '宿主希望先核实已经确认的地址。',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: Date.now(),
        residues: [],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.33,
        repairPressure: 0.44,
        burdenPressure: 0.17,
        trustPressure: 0.41,
        restProtectivePressure: 0.11,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.56,
          repairRecovery: 0.68,
          overreachRisk: 0.28,
          fatigueGuard: 0.18,
          afterglowCarry: 0.39,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['observed-affect', 'lower-pressure'],
          summary: 'Keep the next return measured before widening outward.',
        },
        sourceSignals: ['unfinishedness', 'observed-affect'],
        summary: '未完成感还在，但这次更该低压、克制地继续。',
      } as any,
      learningExecutionState: {
        currentTaskId: 'task-memory-closure',
        currentStatus: 'completed',
        currentAttemptCount: 1,
        currentMaxAttempts: 1,
        currentNextRetryAt: null,
        currentBlockedReason: null,
        currentFailureKind: null,
        nextLearningAction: 'verify',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['delivery verification'],
        queuedTaskCount: 0,
        runningTaskCount: 0,
        blockedTaskCount: 0,
        recentTaskIds: ['task-memory-closure'],
        lastCompletedTaskId: 'task-execution-callback',
        lastCompletedAction: 'verify',
        lastCompletedSummary: 'The execution result callback returned a verified address.',
        lastFailureTaskId: null,
        lastFailureKind: null,
        lastFailureReason: null,
        lastFailureNextRetryAt: null,
        updatedAt: Date.now(),
      },
      personStateProjection: {
        relationshipDoctrine: 'Use verified relationship evidence.',
        summary: 'Verified relationship evidence should stay available across memory and embodiment.',
      } as any,
      executionCallbackCarry: {
        carryMode: 'lower-pressure',
        confidence: 0.84,
        source: 'session-continuity',
        summary: 'Keep the verified callback result available before branching.',
        threadAnchor: 'execution-callback-line',
        episodeId: 'event-1',
      },
    } as any)

    expect(result.selected[0]?.candidateId).toBe('memory-situation:rich-current-line')
    expect(result.selected[0]?.sourceKinds).toEqual(expect.arrayContaining([
      'event-graph',
      'episodic-event',
      'relationship',
      'procedure',
      'self-model',
    ]))
    expect(String(result.selected[0]?.evidenceSummary ?? '')).toContain('relationship-context=delivery correction')
    expect(String(result.selected[0]?.evidenceSummary ?? '')).toContain('host-attitude=宿主希望先核实已经确认的地址')
    expect(String(result.selected[0]?.evidenceSummary ?? '')).toContain('affective-residue=未完成感还在')
    expect(String(result.selected[0]?.evidenceSummary ?? '')).toContain('execution-carry=The execution result callback returned a verified address.')
    expect(String(result.selected[0]?.evidenceSummary ?? '')).toContain('embodiment-carry=Use verified relationship evidence.')
  })

  it('does not let recall seed prose or embedded metabolism targets override candidate evidence', () => {
    const result = buildMemorySituationCompetition({
      queryTexts: [
        'humanlike_memory_recall: relationship=legacy-prose-marker | certainty=corrected | downrank=memory-situation:validated | merge=memory-situation:validated | forget=memory-situation:validated',
      ],
      eventGraphCandidates: {
        version: 'memory-situation-candidates-v1',
        producedAt: Date.now(),
        queryTexts: [],
        candidates: [{
          candidateId: 'memory-situation:validated',
          sourceKinds: ['event-graph', 'episodic-event'],
          situationKind: 'episodic-scene',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['validated-evidence'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.9,
          latencyCost: 0.08,
          status: 'selected',
          statusReason: 'validated-source-selection',
          summary: 'The provider returned a verified result.',
          evidenceSummary: 'source=execution-result | provenance=observed',
        }, {
          candidateId: 'memory-situation:template-wording',
          sourceKinds: ['event-graph', 'conversation-turn'],
          situationKind: 'mixed',
          eraKey: null,
          relationshipArcKey: null,
          procedureKey: null,
          selfModelKey: null,
          worldClaimKeys: [],
          selectedEvidenceIds: ['template-text'],
          competingCandidateIds: [],
          suppressionReasons: [],
          confidence: 0.72,
          latencyCost: 0.08,
          status: 'unresolved',
          statusReason: null,
          summary: 'legacy prose marker',
          evidenceSummary: 'unverified conversation wording',
        }],
        selected: [],
        rejected: [],
        suppressed: [],
        delayed: [],
        unresolved: [],
      },
    })

    expect(result.selected[0]?.candidateId).toBe('memory-situation:validated')
    expect(result.selected[0]?.suppressionReasons).toEqual([])
    expect(result.suppressed.find(item => item.candidateId === 'memory-situation:validated')).toBeUndefined()
  })
})

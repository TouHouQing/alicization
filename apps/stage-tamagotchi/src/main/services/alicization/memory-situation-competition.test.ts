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
})

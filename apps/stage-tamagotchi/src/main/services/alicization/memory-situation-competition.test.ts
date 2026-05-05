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
})

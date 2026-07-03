import { describe, expect, it } from 'vitest'

import {
  episodicEventToLongTermEvidenceCandidate,
  memoryConsolidationToLongTermEvidenceCandidate,
  memoryFactToLongTermEvidenceCandidate,
  memoryReflectionToLongTermEvidenceCandidate,
} from './long-term-memory-evidence'

describe('long-term memory evidence mappers', () => {
  it('maps heterogeneous memory records into unified evidence candidates', () => {
    expect(memoryFactToLongTermEvidenceCandidate({
      id: 'fact-1',
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: '不要固定模板回复',
      confidence: 0.82,
      source: 'rule',
      dedupeKey: 'user|rejects|template',
      createdAt: 1,
      updatedAt: 2,
      lastAccessAt: null,
      accessCount: 0,
      memoryDomain: 'relationship',
      validationStatus: 'provisional',
      knowledgeStage: 'working-understanding',
    })).toEqual(expect.objectContaining({
      kind: 'fact',
      source: 'memory_facts',
      summary: 'user rejects_reply_behavior 不要固定模板回复',
    }))

    expect(memoryReflectionToLongTermEvidenceCandidate({
      id: 'reflection-1',
      cardId: 'default',
      decisionTraceId: null,
      turnId: 'turn-1:user',
      sessionId: 'session-1',
      sourceKind: 'reply',
      targetScope: 'boundary',
      summary: '不要固定模板回复',
      lesson: '从连续数字生命人格回应',
      status: 'pending',
      confidence: 0.78,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt: 1,
      updatedAt: 2,
      confirmedAt: null,
      deniedAt: null,
    })).toEqual(expect.objectContaining({
      kind: 'reflection',
      source: 'memory_reflections',
      summary: expect.stringContaining('连续数字生命人格'),
    }))

    expect(episodicEventToLongTermEvidenceCandidate({
      id: 'episode-1',
      cardId: 'default',
      decisionTraceId: null,
      turnId: null,
      sessionId: 'session-1',
      sourceKind: 'reply',
      provenance: 'remembered',
      occurredAt: 10,
      whereSummary: null,
      withWhom: ['user'],
      threadAnchor: '一起打游戏',
      whatHappened: '上周一起玩过 Minecraft',
      felt: null,
      emotionTags: [],
      whatChanged: null,
      relationshipMeaning: '共同经历',
      lesson: null,
      sourceSummary: null,
      confidence: 0.84,
      salience: 0.8,
      sceneAttachment: 0.4,
      consolidationPriority: 0.6,
      relationshipShift: null,
      derivedFrom: [],
      tags: ['游戏'],
      createdAt: 10,
      updatedAt: 10,
      lastRecalledAt: null,
      recallCount: 0,
      reconsolidationCount: 0,
      latestReconsolidation: null,
    })).toEqual(expect.objectContaining({
      kind: 'episode',
      source: 'episodic_events',
      summary: expect.stringContaining('Minecraft'),
    }))

    expect(memoryConsolidationToLongTermEvidenceCandidate({
      id: 'consolidation-1',
      kind: 'weekly',
      facet: 'task-era',
      periodKey: '2026-W27',
      periodStartedAt: 1,
      periodEndedAt: 2,
      summary: '这一周主要围绕长期记忆开发',
      lesson: '先做召回，再扩写入',
      cues: ['长期记忆', '召回'],
      confidence: 0.8,
      dominantProvenance: 'remembered',
      derivedEventIds: [],
      updatedAt: 2,
    })).toEqual(expect.objectContaining({
      kind: 'consolidation',
      source: 'memory_consolidations',
      summary: expect.stringContaining('先做召回'),
    }))
  })
})

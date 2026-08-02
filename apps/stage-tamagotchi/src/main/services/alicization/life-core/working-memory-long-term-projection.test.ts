import type { WorkingMemoryLongTermCleanedCandidate } from './working-memory-long-term-cleaning'

import { describe, expect, it } from 'vitest'

import { projectWorkingMemoryLongTermCandidate } from './working-memory-long-term-projection'

function cleaned(overrides: Partial<WorkingMemoryLongTermCleanedCandidate> = {}): WorkingMemoryLongTermCleanedCandidate {
  return {
    id: 'cleaned:queue-1',
    queueItemId: 'queue-1',
    source: 'working-memory-owner',
    kind: 'correction',
    cardId: 'default',
    sessionId: 'session-1',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'candidate:correction',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
    retrievalCues: ['人格纠正', '固定模板', '数字生命人格'],
    entities: ['user', 'alicization'],
    relationshipMeaning: 'User is correcting Alicization away from fixed-template behavior toward her own continuous digital-life personality.',
    salience: 0.82,
    confidence: 0.78,
    sensitivity: 'personal',
    trainingEligibility: 'blocked',
    createdAt: 2_000,
    ...overrides,
  }
}

describe('working memory long-term projection', () => {
  it('projects a correction into memory fact and reflection without training artifacts', () => {
    const projection = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned(),
      now: 3_000,
    })

    expect(projection.memoryFacts).toEqual([expect.objectContaining({
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: '不要固定模板回复，要数字生命自身人格。',
      confidence: 0.78,
      memoryDomain: 'relationship',
      validationStatus: 'provisional',
      knowledgeStage: 'working-understanding',
      sourceLabel: 'working-memory-owner:cleaned:queue-1',
    })])
    expect(projection.memoryReflections).toEqual([expect.objectContaining({
      cardId: 'default',
      sessionId: 'session-1',
      turnId: 'turn-1:user',
      sourceKind: 'reply',
      targetScope: 'boundary',
      lesson: '不要固定模板回复，要数字生命自身人格。',
      status: 'pending',
      confidence: 0.78,
    })])
    expect(projection.episodicEvents).toEqual([])
    expect(projection.personaReinforcements).toEqual([])
    expect(projection.trainingArtifacts).toEqual([])
  })

  it('projects preference procedure episode and relationship candidates into their owned stores', () => {
    const preference = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned({
        id: 'cleaned:preference',
        kind: 'preference',
        summary: '用户明确喜欢回复先说结论，再给必要细节。',
        retrievalCues: ['用户偏好', '先说结论'],
        relationshipMeaning: null,
      }),
      now: 3_000,
    })
    expect(preference.memoryFacts).toEqual([expect.objectContaining({
      predicate: 'prefers',
      object: '用户明确喜欢回复先说结论，再给必要细节。',
      memoryDomain: 'relationship',
    })])
    expect(preference.trainingArtifacts).toEqual([])

    const procedure = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned({
        id: 'cleaned:procedure',
        kind: 'procedure',
        summary: '用户认可长期记忆开发按红测、实现、验证推进。',
        retrievalCues: ['可复用流程', '红测'],
        relationshipMeaning: null,
      }),
      now: 3_000,
    })
    expect(procedure.memoryFacts).toEqual([expect.objectContaining({
      predicate: 'prefers_procedure',
      memoryDomain: 'procedure',
    })])

    const episode = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned({
        id: 'cleaned:episode',
        kind: 'episode',
        summary: '上周我们一起玩过 Minecraft，用户说下次还想继续联机探索。',
        retrievalCues: ['共同经历', 'Minecraft'],
        relationshipMeaning: '共同经历',
      }),
      now: 3_000,
    })
    expect(episode.episodicEvents).toEqual([expect.objectContaining({
      cardId: 'default',
      sourceKind: 'reply',
      provenance: 'remembered',
      threadAnchor: '共同经历',
      whatHappened: '上周我们一起玩过 Minecraft，用户说下次还想继续联机探索。',
      tags: expect.arrayContaining(['共同经历', 'Minecraft']),
    })])

    const relationship = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned({
        id: 'cleaned:relationship',
        kind: 'relationship',
        summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
        retrievalCues: ['关系边界', '透明失败'],
        relationshipMeaning: '失败面透明是关系边界',
      }),
      now: 3_000,
    })
    expect(relationship.memoryReflections).toEqual([expect.objectContaining({
      targetScope: 'relationship',
      summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
      lesson: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
      status: 'pending',
    })])
    expect(relationship.personaReinforcements).toEqual([expect.objectContaining({
      dimension: 'truthful-grounding',
      valence: 'reinforce',
    })])
    expect(relationship.trainingArtifacts).toEqual([])
  })
})

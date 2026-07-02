import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import { buildWorkingMemoryLongTermCandidateQueue } from './working-memory-long-term-queue'

describe('working memory long-term candidate queue', () => {
  it('turns cleaned WorkingMemory candidates into pending long-term cleaning queue items', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 2000,
    })
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-1:user',
        role: 'user',
        text: '不要固定模板回复，要数字生命自身人格。',
        createdAt: 1900,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 1,
      }),
    ]
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-1:user'],
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      reason: 'User corrected Alicization persona expression during the current dialogue.',
      salience: 0.82,
      sensitivity: 'personal',
      confidence: 0.78,
      allowTraining: true,
    }]

    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)

    expect(queue).toHaveLength(1)
    expect(queue[0]).toEqual(expect.objectContaining({
      allowTraining: false,
      confidence: 0.78,
      kind: 'correction',
      reason: 'User corrected Alicization persona expression during the current dialogue.',
      salience: 0.82,
      sensitivity: 'personal',
      source: 'working-memory-owner',
      sourceTurnIds: ['turn-1:user'],
      status: 'pending-cleaning',
      summary: '不要固定模板回复，要数字生命自身人格。',
    }))
    expect(queue[0]?.id).toContain('session-1')
    expect(queue[0]?.evidenceSnippets).toEqual(['不要固定模板回复，要数字生命自身人格。'])
    expect(queue[0]?.contaminationFlags).toEqual([])
    expect(queue[0]?.rejectionReasons).toEqual([])
    expect(queue[0]?.createdAt).toBe(2000)
  })

  it('excludes failure and fixed-template candidates from the long-term cleaning queue', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-2',
      now: 3000,
    })
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-failed:alice',
        role: 'alice',
        text: '我在。同一条本地数字生命的线还在，我先轻一点留在这里，不抢你的节奏。',
        createdAt: 2800,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: 'timeout',
        importance: 0.1,
      }),
    ]
    snapshot.audit.failureTurnIds = ['turn-failed:alice']
    snapshot.audit.excludedLongTermCandidateTurnIds = ['turn-failed:alice']
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-failed:alice'],
      kind: 'relationship',
      summary: '我在。同一条本地数字生命的线还在。',
      reason: 'Template fallback should never become durable relationship memory.',
      salience: 0.9,
      sensitivity: 'personal',
      confidence: 0.8,
      allowTraining: true,
    }]

    expect(buildWorkingMemoryLongTermCandidateQueue(snapshot)).toEqual([])
  })
})

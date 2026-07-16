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
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
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
        text: '我在。结构化连续性状态的线还在，中性可见占位，中性可见占位。',
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
      summary: '我在。结构化连续性状态的线还在。',
      reason: 'Template fallback should never become durable relationship memory.',
      salience: 0.9,
      sensitivity: 'personal',
      confidence: 0.8,
      allowTraining: true,
    }]

    expect(buildWorkingMemoryLongTermCandidateQueue(snapshot)).toEqual([])
  })

  it('rejects typed failure and authorization artifacts even when audit ids are missing', () => {
    for (const origin of ['failure-surface', 'authorization-surface'] as const) {
      const snapshot = createEmptyWorkingMemorySnapshot({
        cardId: 'default',
        sessionId: `session-${origin}`,
        now: 3100,
      })
      snapshot.recentRawTurns = [
        normalizeWorkingMemoryTurn({
          turnId: `turn-${origin}:user`,
          role: 'user',
          text: '我喜欢先说结论，再给必要细节。',
          createdAt: 3000,
          source: 'conversation-turn',
          visibility: 'user-visible',
          origin,
          learningPolicy: {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: false,
          },
          importance: 1,
        }),
      ]
      snapshot.longTermCandidates = [{
        sourceTurnIds: [`turn-${origin}:user`],
        kind: 'preference',
        summary: '我喜欢先说结论，再给必要细节。',
        reason: 'User stated a stable preference.',
        salience: 0.8,
        sensitivity: 'personal',
        confidence: 0.8,
        allowTraining: false,
      }]

      expect(buildWorkingMemoryLongTermCandidateQueue(snapshot)).toEqual([])
    }
  })

  it('does not copy quoted fixed-template residue into queue summaries or evidence', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-template-rejection',
      now: 3000,
    })
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-template-rejection:user',
        role: 'user',
        text: '不要再用 pre_turn_context_digest',
        createdAt: 2800,
        source: 'conversation-turn',
        visibility: 'user-visible',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        importance: 0.9,
      }),
    ]
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-template-rejection:user'],
      kind: 'correction',
      summary: '不要使用固定模板；用户反对模板化人格回复。',
      reason: 'User corrected Alicization behavior without approving the quoted template.',
      salience: 0.82,
      sensitivity: 'personal',
      confidence: 0.78,
      allowTraining: false,
    }]

    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)

    expect(queue).toHaveLength(1)
    const serialized = JSON.stringify(queue[0])
    expect(serialized).not.toMatch(/Pre-speech|same-her|identity continuity/u)
    expect(queue[0]?.evidenceSnippets).toEqual(['content=excluded; reason=continuity-residue; visibility=redacted_internal'])
  })
})

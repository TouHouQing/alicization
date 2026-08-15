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
      reason: 'candidate:correction',
      salience: 0.82,
      sensitivity: 'personal',
      confidence: 0.78,
      allowTraining: true,
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'correction',
        summary: '不要固定模板回复，要数字生命自身人格。',
        reason: 'candidate:correction',
        evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
      },
    }]

    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)

    expect(queue).toHaveLength(1)
    expect(queue[0]).toEqual(expect.objectContaining({
      allowTraining: false,
      confidence: 0.78,
      kind: 'correction',
      reason: 'candidate:correction',
      salience: 0.82,
      sensitivity: 'personal',
      source: 'working-memory-owner',
      sourceTurnIds: ['turn-1:user'],
      status: 'pending-cleaning',
      summary: '不要固定模板回复，要数字生命自身人格。',
    }))
    expect(queue[0]?.id).toMatch(/^working-memory-long-term:v1:sha256:[0-9a-f]{64}$/)
    expect(queue[0]?.evidenceSnippets).toEqual(['不要固定模板回复，要数字生命自身人格。'])
    expect(queue[0]?.contaminationFlags).toEqual([])
    expect(queue[0]?.rejectionReasons).toEqual([])
    expect(queue[0]?.createdAt).toBe(2000)
  })

  it('builds fixed-length canonical queue ids without leaking long candidate text', () => {
    const longSessionId = `session-private-${'s'.repeat(180)}`
    const sourceTurnIds = Array.from(
      { length: 12 },
      (_, index) => `turn-private-source-${index}-${'t'.repeat(72)}`,
    )
    const sharedSummaryPrefix = `long-summary-marker-${'a'.repeat(96)}`
    const summaryA = `${sharedSummaryPrefix}-candidate-a-${'x'.repeat(180)}`
    const summaryB = `${sharedSummaryPrefix}-candidate-b-${'x'.repeat(180)}`
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: longSessionId,
      now: 4000,
    })
    snapshot.longTermCandidates = [
      {
        sourceTurnIds,
        kind: 'correction',
        summary: summaryA,
        reason: 'candidate:correction',
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
        allowTraining: false,
        memoryEvidence: {
          version: 'working-memory-long-term-evidence-v1',
          source: 'explicit-structured-memory-evidence',
          kind: 'correction',
          summary: summaryA,
          reason: 'candidate:correction',
          evidenceSnippets: [summaryA],
          salience: 0.82,
          sensitivity: 'personal',
          confidence: 0.78,
        },
      },
      {
        sourceTurnIds,
        kind: 'correction',
        summary: summaryB,
        reason: 'candidate:correction',
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
        allowTraining: false,
        memoryEvidence: {
          version: 'working-memory-long-term-evidence-v1',
          source: 'explicit-structured-memory-evidence',
          kind: 'correction',
          summary: summaryB,
          reason: 'candidate:correction',
          evidenceSnippets: [summaryB],
          salience: 0.82,
          sensitivity: 'personal',
          confidence: 0.78,
        },
      },
    ]

    const firstBuild = buildWorkingMemoryLongTermCandidateQueue(snapshot)
    const secondBuild = buildWorkingMemoryLongTermCandidateQueue(snapshot)
    const firstId = firstBuild[0]?.id ?? ''
    const secondCandidateId = firstBuild[1]?.id ?? ''

    expect(longSessionId.length).toBeGreaterThan(160)
    expect(sourceTurnIds.join('+').length).toBeGreaterThan(240)
    expect(summaryA.length).toBeGreaterThan(240)
    expect(summaryB.length).toBeGreaterThan(240)
    expect(firstBuild).toHaveLength(2)
    expect(firstId).toMatch(/^working-memory-long-term:v1:sha256:[0-9a-f]{64}$/)
    expect(firstId.length).toBeLessThan(240)
    expect(secondCandidateId.length).toBe(firstId.length)
    expect(secondBuild.map(item => item.id)).toEqual(firstBuild.map(item => item.id))
    expect(secondCandidateId).not.toBe(firstId)
    expect(firstId).not.toContain('long-summary-marker')
    expect(firstId).not.toContain(sourceTurnIds[0]!)
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
        text: 'retired_policy=observe_first',
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
      summary: '用户要求回复保持自然，并遵循当前对话内容。',
      reason: 'candidate:correction',
      salience: 0.82,
      sensitivity: 'personal',
      confidence: 0.78,
      allowTraining: false,
      memoryEvidence: {
        version: 'working-memory-long-term-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        kind: 'correction',
        summary: '用户要求回复保持自然，并遵循当前对话内容。',
        reason: 'candidate:correction',
        evidenceSnippets: ['用户要求回复保持自然，并遵循当前对话内容。'],
        salience: 0.82,
        sensitivity: 'personal',
        confidence: 0.78,
      },
    }]

    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)

    expect(queue).toHaveLength(1)
    const serialized = JSON.stringify(queue[0])
    expect(serialized).not.toContain('retired_policy=observe_first')
    expect(queue[0]?.evidenceSnippets).toEqual([
      '用户要求回复保持自然，并遵循当前对话内容。',
    ])
  })
})

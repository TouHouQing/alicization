import { describe, expect, it } from 'vitest'

import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { cleanWorkingMemoryLongTermQueueItem } from './working-memory-long-term-cleaner'

function item(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'queue-1',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'User corrected Alicization persona expression during the current dialogue.',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
    salience: 0.82,
    confidence: 0.78,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 2_000,
    ...overrides,
  }
}

describe('working memory long-term cleaner', () => {
  it('admits high-confidence correction candidates but keeps training blocked', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item(),
      now: 3_000,
    })

    expect(result.status).toBe('admitted')
    expect(result.decision).toBe('admit')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      trainingEligibility: 'blocked',
      retrievalCues: expect.arrayContaining(['固定模板', '数字生命人格', '人格纠正']),
      entities: expect.arrayContaining(['user', 'alicization']),
    }))
    expect(result.rejectionReasons).toEqual([])
    expect(result.reviewReasons).toEqual([])
    expect(result.allowTraining).toBe(false)
  })

  it('rejects fixed fallback template contamination', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        summary: '我在。同一条本地数字生命的线还在。',
        evidenceSnippets: ['我在。同一条本地数字生命的线还在，我先轻一点留在这里。'],
      }),
      now: 3_000,
    })

    expect(result.status).toBe('rejected')
    expect(result.decision).toBe('reject')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('fixed-fallback-template')
  })

  it('rejects failure turn contamination even when the summary looks useful', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        contaminationFlags: ['failure-turn'],
        rejectionReasons: ['failure-turn'],
      }),
      now: 3_000,
    })

    expect(result.status).toBe('rejected')
    expect(result.rejectionReasons).toEqual(expect.arrayContaining(['failure-turn']))
  })

  it('routes private or low-confidence candidates to review', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        sensitivity: 'private',
        confidence: 0.48,
      }),
      now: 3_000,
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.decision).toBe('review')
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      'private-or-secret',
      'low-confidence',
    ]))
  })
})

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

function clean(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}) {
  return cleanWorkingMemoryLongTermQueueItem({
    cardId: 'default',
    sessionId: 'session-1',
    item: item(overrides),
    now: 3_000,
  })
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
      id: 'cleaned:queue-1',
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      trainingEligibility: 'blocked',
      createdAt: 2_000,
      retrievalCues: expect.arrayContaining(['固定模板', '数字生命人格', '人格纠正']),
      entities: expect.arrayContaining(['user', 'alicization']),
    }))
    expect(result.nextAttemptAt).toBe(3_000)
    expect(result.rejectionReasons).toEqual([])
    expect(result.reviewReasons).toEqual([])
    expect(result.allowTraining).toBe(false)
  })

  it('normalizes non-finite cleaner time before admission', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item(),
      now: Number.NaN,
    })

    expect(result.status).toBe('admitted')
    expect(result.updatedAt).toBe(0)
    expect(result.nextAttemptAt).toBe(0)
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      createdAt: 2_000,
    }))
  })

  it('rejects wrong source candidates', () => {
    const result = clean({
      source: 'external' as WorkingMemoryLongTermQueueItem['source'],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('wrong-source')
  })

  it('rejects non-pending candidates', () => {
    const result = clean({
      status: 'ready-for-long-term',
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('non-pending-status')
  })

  it('rejects candidates without source turns', () => {
    const result = clean({
      sourceTurnIds: [],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('missing-source-turns')
  })

  it('rejects candidates without evidence', () => {
    const result = clean({
      evidenceSnippets: [],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('missing-evidence')
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

  it('rejects prompt residue contamination', () => {
    const result = clean({
      summary: 'ALICIZATION_project_state Phase 1 mustDo same-her reminder.',
      evidenceSnippets: ['WorkingMemory owner answerPlanner same living line.'],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('prompt-residue')
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
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toEqual(expect.arrayContaining(['failure-turn']))
  })

  it('routes low-salience candidates to review with a blocked cleaned candidate', () => {
    const result = clean({
      salience: 0.42,
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      trainingEligibility: 'blocked',
    }))
    expect(result.reviewReasons).toContain('low-salience')
  })

  it('routes unsupported kinds to review with a blocked cleaned candidate', () => {
    const result = clean({
      kind: 'preference',
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      kind: 'preference',
      trainingEligibility: 'blocked',
    }))
    expect(result.reviewReasons).toContain('unsupported-kind')
  })

  it('routes weak correction cues to review', () => {
    const result = clean({
      summary: '用户希望以后对话节奏安静一点。',
      reason: 'User gave a gentle conversation style note.',
      evidenceSnippets: ['以后节奏安静一点。'],
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      trainingEligibility: 'blocked',
    }))
    expect(result.reviewReasons).toContain('weak-correction-cue')
  })

  it('routes secret candidates to review', () => {
    const result = clean({
      sensitivity: 'secret',
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      trainingEligibility: 'blocked',
    }))
    expect(result.reviewReasons).toContain('private-or-secret')
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
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      trainingEligibility: 'blocked',
    }))
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      'private-or-secret',
      'low-confidence',
    ]))
  })

  it('rejects contaminated unsupported kinds before review', () => {
    const result = clean({
      kind: 'episode',
      contaminationFlags: ['failure-turn'],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('failure-turn')
    expect(result.reviewReasons).toEqual([])
  })
})

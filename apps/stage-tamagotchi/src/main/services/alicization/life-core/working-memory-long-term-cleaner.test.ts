import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { describe, expect, it } from 'vitest'

import { cleanWorkingMemoryLongTermQueueItem } from './working-memory-long-term-cleaner'

function item(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'queue-1',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: '不要固定模板回复，请保留用户的原话。',
    reason: 'User corrected the reply behavior during the current dialogue.',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，请保留用户的原话。'],
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
      summary: '不要固定模板回复，请保留用户的原话。',
      trainingEligibility: 'blocked',
      createdAt: 2_000,
      retrievalCues: expect.arrayContaining(['不要固定模板回复，请保留用户的原话。']),
      entities: expect.arrayContaining(['user', 'alicization']),
      relationshipMeaning: null,
    }))
    expect(result.cleanedCandidate?.retrievalCues).not.toEqual(expect.arrayContaining([
      '数字生命人格',
      '人格纠正',
    ]))
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

  it('admits clear generic corrections without injecting persona retrieval semantics', () => {
    const result = clean({
      summary: '你搞错了，不是这个任务。',
      reason: 'User corrected the selected task.',
      evidenceSnippets: ['你搞错了，不是这个任务。'],
      salience: 0.91,
      confidence: 0.93,
    })

    expect(result.status).toBe('admitted')
    expect(result.decision).toBe('admit')
    expect(result.reviewReasons).toEqual([])
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      trainingEligibility: 'blocked',
      relationshipMeaning: null,
      summary: '你搞错了，不是这个任务。',
    }))
    expect(result.cleanedCandidate?.retrievalCues).not.toEqual(expect.arrayContaining([
      '数字生命人格',
      '人格纠正',
    ]))
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

  it('rejects a structured summary even when the other candidate fields are natural language', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        summary: 'mode=internal; state=held',
        evidenceSnippets: ['你搞错了，不是这个日期。'],
      }),
      now: 3_000,
    })

    expect(result.status).toBe('rejected')
    expect(result.decision).toBe('reject')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('structured-residue')
  })

  it('rejects generic multiline structured residue', () => {
    const result = clean({
      summary: 'mode="internal state"\nvisibility=hidden',
      reason: 'reason=internal',
      evidenceSnippets: ['state=held'],
    })

    expect(result.status).toBe('rejected')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('structured-residue')
  })

  it('preserves natural language that discusses a key=value setting', () => {
    const result = clean({
      kind: 'preference',
      summary: '用户明确喜欢配置项 mode=balanced，并希望以后继续使用。',
      reason: 'User stated a stable configuration preference.',
      evidenceSnippets: ['我喜欢 mode=balanced 这个设置。'],
      salience: 0.8,
      confidence: 0.84,
    })

    expect(result.status).toBe('admitted')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      summary: '用户明确喜欢配置项 mode=balanced，并希望以后继续使用。',
      trainingEligibility: 'blocked',
    }))
    expect(result.rejectionReasons).toEqual([])
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

  it('admits clear preference candidates while keeping training blocked', () => {
    const result = clean({
      kind: 'preference',
      summary: '用户明确喜欢回复先说结论，再给必要细节。',
      reason: 'candidate:preference',
      evidenceSnippets: ['我喜欢你先说结论，再给必要细节。'],
      salience: 0.78,
      confidence: 0.82,
    })

    expect(result.status).toBe('admitted')
    expect(result.decision).toBe('admit')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      kind: 'preference',
      trainingEligibility: 'blocked',
      retrievalCues: expect.arrayContaining(['用户偏好']),
    }))
    expect(result.reviewReasons).toEqual([])
  })

  it('admits clear episode procedure and relationship candidates with reviewable evidence', () => {
    expect(clean({
      id: 'queue-episode',
      kind: 'episode',
      summary: '上周我们一起玩过 Minecraft，用户说下次还想继续联机探索。',
      reason: 'Shared episode with time and activity anchor.',
      evidenceSnippets: ['上周我们一起玩过 Minecraft，下次继续联机。'],
      salience: 0.82,
      confidence: 0.84,
    })).toEqual(expect.objectContaining({
      status: 'admitted',
      decision: 'admit',
      cleanedCandidate: expect.objectContaining({
        kind: 'episode',
        retrievalCues: expect.arrayContaining(['共同经历']),
      }),
    }))

    expect(clean({
      id: 'queue-procedure',
      kind: 'procedure',
      summary: '用户认可长期记忆开发按红测、实现、验证的方式推进。',
      reason: 'candidate:procedure',
      evidenceSnippets: ['可以，按红测、实现、验证继续。'],
      salience: 0.78,
      confidence: 0.82,
    })).toEqual(expect.objectContaining({
      status: 'admitted',
      decision: 'admit',
      cleanedCandidate: expect.objectContaining({
        kind: 'procedure',
        retrievalCues: expect.arrayContaining(['可复用流程']),
      }),
    }))

    expect(clean({
      id: 'queue-relationship',
      kind: 'relationship',
      summary: '用户希望出错或超时时直接说明问题，不要固定安抚模板。',
      reason: 'Relationship boundary for failure transparency.',
      evidenceSnippets: ['如果某个链路节点出错了就直接告诉用户有问题。'],
      salience: 0.86,
      confidence: 0.86,
    })).toEqual(expect.objectContaining({
      status: 'admitted',
      decision: 'admit',
      cleanedCandidate: expect.objectContaining({
        kind: 'relationship',
        retrievalCues: expect.arrayContaining(['关系边界']),
      }),
    }))
  })

  it('routes vague non-correction candidates to review instead of automatic write', () => {
    const result = clean({
      kind: 'preference',
      summary: '用户说这样也行。',
      reason: 'Vague preference-like statement.',
      evidenceSnippets: ['这样也行。'],
      salience: 0.76,
      confidence: 0.78,
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.reviewReasons).toContain('weak-preference-cue')
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

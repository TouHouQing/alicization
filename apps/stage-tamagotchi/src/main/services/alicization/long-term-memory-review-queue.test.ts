import { describe, expect, it } from 'vitest'

import type { WorkingMemoryLongTermCleaningTransaction } from './life-core/working-memory-long-term-cleaning'

import {
  applyLongTermMemoryReviewDecision,
  createLongTermMemoryReviewItemFromTransaction,
  filterTombstonedLongTermMemoryCandidates,
  longTermMemoryPrivacyVisibleMode,
} from './long-term-memory-review-queue'

function transaction(
  overrides: Partial<WorkingMemoryLongTermCleaningTransaction> = {},
): WorkingMemoryLongTermCleaningTransaction {
  return {
    id: 'tx-1',
    idempotencyKey: 'key-1',
    queueItemId: 'queue-1',
    source: 'working-memory-owner',
    cardId: 'default',
    sessionId: 'session-1',
    status: 'needs-user-review',
    decision: 'review',
    item: {
      id: 'queue-1',
      source: 'working-memory-owner',
      kind: 'relationship',
      summary: '用户希望出错时直接说明问题。',
      reason: 'Relationship boundary review.',
      sourceTurnIds: ['turn-1:user'],
      evidenceSnippets: ['出错了就直接告诉用户。'],
      salience: 0.82,
      confidence: 0.84,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 2_000,
    },
    cleanedCandidate: {
      id: 'cleaned:queue-1',
      queueItemId: 'queue-1',
      source: 'working-memory-owner',
      kind: 'relationship',
      cardId: 'default',
      sessionId: 'session-1',
      summary: '用户希望出错时直接说明问题。',
      reason: 'Relationship boundary review.',
      sourceTurnIds: ['turn-1:user'],
      evidenceSnippets: ['出错了就直接告诉用户。'],
      retrievalCues: ['关系边界'],
      entities: ['user', 'alicization'],
      relationshipMeaning: 'failure transparency boundary',
      salience: 0.82,
      confidence: 0.84,
      sensitivity: 'personal',
      trainingEligibility: 'blocked',
      createdAt: 2_000,
    },
    projections: null,
    allowTraining: false,
    rejectionReasons: [],
    reviewReasons: ['private-or-secret'],
    contaminationFlags: [],
    attemptCount: 0,
    lastError: null,
    createdAt: 2_000,
    updatedAt: 2_000,
    nextAttemptAt: null,
    appliedAt: null,
    ...overrides,
  }
}

describe('long-term memory review queue', () => {
  it('creates a review item from a needs-review WorkingMemory transaction', () => {
    const item = createLongTermMemoryReviewItemFromTransaction({
      transaction: transaction(),
      now: 3_000,
    })

    expect(item).toEqual(expect.objectContaining({
      id: 'review:tx-1',
      transactionId: 'tx-1',
      status: 'needs-user-review',
      summary: '用户希望出错时直接说明问题。',
      sensitivity: 'personal',
      allowTraining: false,
      visibleMode: 'explicit',
    }))
  })

  it('applies approve reject and tombstone decisions as transaction writebacks', () => {
    const base = createLongTermMemoryReviewItemFromTransaction({
      transaction: transaction(),
      now: 3_000,
    })

    const approved = applyLongTermMemoryReviewDecision({
      item: base!,
      transaction: transaction(),
      decision: 'approve',
      now: 4_000,
    })
    expect(approved.transaction).toEqual(expect.objectContaining({
      status: 'admitted',
      decision: 'admit',
      nextAttemptAt: 4_000,
    }))
    expect(approved.item.status).toBe('approved')

    const rejected = applyLongTermMemoryReviewDecision({
      item: base!,
      transaction: transaction(),
      decision: 'reject',
      now: 5_000,
    })
    expect(rejected.transaction).toEqual(expect.objectContaining({
      status: 'rejected',
      decision: 'reject',
      nextAttemptAt: null,
      rejectionReasons: expect.arrayContaining(['user-rejected']),
    }))

    const tombstoned = applyLongTermMemoryReviewDecision({
      item: base!,
      transaction: transaction(),
      decision: 'tombstone',
      now: 6_000,
    })
    expect(tombstoned.item.status).toBe('tombstoned')
    expect(tombstoned.transaction.rejectionReasons).toEqual(expect.arrayContaining(['tombstoned']))
  })

  it('keeps private memories inward and filters tombstoned memories from recall and training', () => {
    expect(longTermMemoryPrivacyVisibleMode('private')).toBe('inward-only')
    expect(longTermMemoryPrivacyVisibleMode('secret')).toBe('inward-only')

    const filtered = filterTombstonedLongTermMemoryCandidates({
      tombstonedSourceIds: ['memory-tombstone'],
      candidates: [
        { id: 'memory-ok', sourceMemoryIds: ['memory-ok'] },
        { id: 'memory-tombstone', sourceMemoryIds: ['memory-tombstone'] },
        { id: 'candidate-derived', sourceMemoryIds: ['memory-ok', 'memory-tombstone'] },
      ],
    })

    expect(filtered.map(item => item.id)).toEqual(['memory-ok'])
  })
})

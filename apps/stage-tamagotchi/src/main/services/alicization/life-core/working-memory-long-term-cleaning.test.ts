import { describe, expect, it } from 'vitest'

import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import {
  buildWorkingMemoryLongTermIdempotencyKey,
  createWorkingMemoryLongTermCleaningTransaction,
  normalizeWorkingMemoryLongTermCleaningStatus,
} from './working-memory-long-term-cleaning'

function queueItem(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template',
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

describe('working memory long-term cleaning domain', () => {
  it('builds stable idempotency keys from owner queue identity and evidence', () => {
    const item = queueItem()

    expect(buildWorkingMemoryLongTermIdempotencyKey({
      cardId: 'default',
      sessionId: 'session-1',
      item,
    })).toBe('working-memory-owner:default:session-1:correction:turn-1:user:不要固定模板回复，要数字生命自身人格。')
  })

  it('creates a pending transaction without allowing training by default', () => {
    const transaction = createWorkingMemoryLongTermCleaningTransaction({
      cardId: 'default',
      sessionId: 'session-1',
      item: queueItem(),
      now: 2_500,
    })

    expect(transaction).toMatchObject({
      id: 'wm-lt-clean:working-memory-owner:default:session-1:correction:turn-1:user:不要固定模板回复，要数字生命自身人格。',
      queueItemId: 'working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template',
      source: 'working-memory-owner',
      cardId: 'default',
      sessionId: 'session-1',
      status: 'pending-cleaning',
      decision: 'pending',
      cleanedCandidate: null,
      projections: null,
      allowTraining: false,
      createdAt: 2_000,
      updatedAt: 2_500,
    })
  })

  it('normalizes unknown status to dead-lettered instead of pretending it is valid', () => {
    expect(normalizeWorkingMemoryLongTermCleaningStatus('admitted')).toBe('admitted')
    expect(normalizeWorkingMemoryLongTermCleaningStatus('unexpected')).toBe('dead-lettered')
  })
})

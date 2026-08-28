import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { describe, expect, it } from 'vitest'

import {
  buildWorkingMemoryLongTermIdempotencyKey,
  createWorkingMemoryLongTermCleaningTransaction,
  createWorkingMemoryLongTermDrainMutex,
  normalizeWorkingMemoryLongTermCleaningStatus,
} from './working-memory-long-term-cleaning'

function queueItem(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'candidate:correction',
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
  it('serializes concurrent drain calls so one DB runtime cannot process two batches at once', async () => {
    const mutex = createWorkingMemoryLongTermDrainMutex()
    let active = 0
    let maximumActive = 0
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = mutex.run(async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await firstGate
      active -= 1
      return 'first'
    })
    const second = mutex.run(async () => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      active -= 1
      return 'second'
    })

    await Promise.resolve()
    expect(maximumActive).toBe(1)
    releaseFirst?.()
    await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second'])
    expect(maximumActive).toBe(1)
  })

  it('builds stable idempotency keys from owner queue identity and evidence', () => {
    const item = queueItem()

    expect(buildWorkingMemoryLongTermIdempotencyKey({
      cardId: 'default',
      sessionId: 'session-1',
      item,
    })).toBe('working-memory-owner:default:session-1:correction:working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template:turn-1:user:不要固定模板回复，要数字生命自身人格。')
  })

  it('keeps distinct source ids separate within the same card and session', () => {
    const first = buildWorkingMemoryLongTermIdempotencyKey({
      cardId: 'card-1',
      sessionId: 'session-1',
      item: queueItem({ id: 'source-one' }),
    })
    const second = buildWorkingMemoryLongTermIdempotencyKey({
      cardId: 'card-1',
      sessionId: 'session-1',
      item: queueItem({ id: 'source-two' }),
    })

    expect(first).not.toBe(second)
  })

  it('creates a pending transaction without allowing training by default', () => {
    const transaction = createWorkingMemoryLongTermCleaningTransaction({
      cardId: 'default',
      sessionId: 'session-1',
      item: queueItem(),
      now: 2_500,
    })

    expect(transaction).toMatchObject({
      id: 'wm-lt-clean:working-memory-owner:default:session-1:correction:working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template:turn-1:user:不要固定模板回复，要数字生命自身人格。',
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

  it('keeps transaction and item queue ids aligned after normalization', () => {
    const normalizedQueueItemId = 'queue:'.repeat(40)
    const transaction = createWorkingMemoryLongTermCleaningTransaction({
      cardId: 'default',
      sessionId: 'session-1',
      item: queueItem({
        id: `  ${'queue:'.repeat(80)}  `,
      }),
      now: 2_500,
    })

    expect(transaction.queueItemId).toBe(normalizedQueueItemId)
    expect(transaction.item.id).toBe(normalizedQueueItemId)
  })

  it('forces training off on both transaction and normalized item', () => {
    const transaction = createWorkingMemoryLongTermCleaningTransaction({
      cardId: 'default',
      sessionId: 'session-1',
      item: queueItem({
        allowTraining: true,
      }),
      now: 2_500,
    })

    expect(transaction.allowTraining).toBe(false)
    expect(transaction.item.allowTraining).toBe(false)
  })

  it('normalizes unknown status to dead-lettered instead of pretending it is valid', () => {
    expect(normalizeWorkingMemoryLongTermCleaningStatus('admitted')).toBe('admitted')
    expect(normalizeWorkingMemoryLongTermCleaningStatus('failed')).toBe('failed')
    expect(normalizeWorkingMemoryLongTermCleaningStatus('unexpected')).toBe('dead-lettered')
  })
})

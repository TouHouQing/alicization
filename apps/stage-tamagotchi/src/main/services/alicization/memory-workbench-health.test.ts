import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach } from 'vitest'
import { describe, expect, it } from 'vitest'

import {
  calculateMemoryWorkbenchP95Latency,
  deriveMemoryWorkbenchStatus,
  summarizeMemoryWorkbenchQueueRows,
} from './memory-workbench-health'
import { setupAlicizationDb } from './db'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-workbench-health-'))
  sandboxDirs.push(dir)
  return dir
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

describe('memory workbench health', () => {
  it('summarizes queue statuses into workbench health counters', () => {
    expect(summarizeMemoryWorkbenchQueueRows([
      { status: 'pending' },
      { status: 'admitted' },
      { status: 'needs-user-review' },
      { status: 'applied' },
      { status: 'failed' },
      { status: 'dead-lettered' },
      { status: 'rejected' },
    ])).toEqual({
      pending: 2,
      review: 1,
      applied: 1,
      failed: 3,
      deadLettered: 1,
    })
  })

  it('calculates p95 latency using nearest-rank semantics', () => {
    expect(calculateMemoryWorkbenchP95Latency([10, 20, 30, 40, 50])).toBe(50)
  })

  it('marks health degraded when errors or queue failures exist', () => {
    expect(deriveMemoryWorkbenchStatus({
      errors: [],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('ok')
    expect(deriveMemoryWorkbenchStatus({
      errors: ['recall failed'],
      queueFailed: 0,
      embeddingConfigured: true,
    })).toBe('degraded')
    expect(deriveMemoryWorkbenchStatus({
      errors: [],
      queueFailed: 1,
      embeddingConfigured: true,
    })).toBe('degraded')
  })

  it('reports real queue health from working memory long-term transactions', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-health',
        items: [
          {
            id: 'queue-health-applied',
            source: 'working-memory-owner',
            kind: 'correction',
            summary: '用户不要固定模板回复。',
            reason: 'User corrected Alicization reply behavior.',
            sourceTurnIds: ['turn-1:user'],
            evidenceSnippets: ['不要固定模板回复。'],
            salience: 0.88,
            confidence: 0.88,
            sensitivity: 'personal',
            allowTraining: false,
            status: 'pending-cleaning',
            rejectionReasons: [],
            contaminationFlags: [],
            createdAt: 2_000,
          },
          {
            id: 'queue-health-review',
            source: 'working-memory-owner',
            kind: 'correction',
            summary: '用户希望以后对话节奏安静一点。',
            reason: 'User gave a gentle conversation style note.',
            sourceTurnIds: ['turn-2:user'],
            evidenceSnippets: ['以后节奏安静一点。'],
            salience: 0.82,
            confidence: 0.68,
            sensitivity: 'personal',
            allowTraining: false,
            status: 'pending-cleaning',
            rejectionReasons: [],
            contaminationFlags: [],
            createdAt: 2_100,
          },
        ],
      })

      expect(await db.getMemoryWorkbenchQueueHealth({ cardId: 'default' })).toEqual({
        pending: 2,
        review: 0,
        applied: 0,
        failed: 0,
        deadLettered: 0,
      })

      await db.drainWorkingMemoryLongTermQueue(4)

      expect(await db.getMemoryWorkbenchQueueHealth({ cardId: 'default' })).toEqual({
        pending: 0,
        review: 1,
        applied: 1,
        failed: 0,
        deadLettered: 0,
      })
    }
    finally {
      await db.close()
    }
  })

  it('records recall probe latency into recall health', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.runMemoryWorkbenchRecallProbe({
        cardId: 'default',
        query: '你还记得我不要固定模板回复吗？',
        limit: 4,
      })

      const recall = await db.getMemoryWorkbenchRecallHealth({ cardId: 'default' })
      expect(recall.lastLatencyMs).not.toBeNull()
      expect(recall.p95LatencyMs).not.toBeNull()
    }
    finally {
      await db.close()
    }
  })
})

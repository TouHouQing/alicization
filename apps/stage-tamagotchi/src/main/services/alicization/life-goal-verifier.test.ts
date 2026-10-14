import type { LifeObligation } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { verifyLifeGoal } from './life-goal-verifier'

const obligation: LifeObligation = { cardId: 'alice', id: 'goal', generation: 1, revision: 1, kind: 'task', summary: 'write a note', status: 'verifying', sourceTurnId: 'turn', deliveryTurnId: null, dueAt: null, timezone: null, threadId: null, scheduledTaskId: null, proof: { kind: 'file' }, receiptId: null, createdAt: 0, updatedAt: 0 }

describe('independent goal proof', () => {
  it('detects a successful file write with the wrong content and verifies the actual corrected file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-goal-proof-'))
    try {
      const path = join(root, 'note.txt')
      const contentHash = createHash('sha256').update('expected').digest('hex')
      const input = { obligation: { ...obligation, proof: { kind: 'file' as const, path, contentHash } }, readSetting: async () => undefined }
      await writeFile(path, 'wrong')
      expect((await verifyLifeGoal(input)).verdict).toBe('not-satisfied')
      await writeFile(path, 'expected')
      expect((await verifyLifeGoal(input)).verdict).toBe('satisfied')
      expect((await verifyLifeGoal({ ...input, obligation: { ...input.obligation, status: 'cancelled' } })).verdict).toBe('stale')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('keeps incomplete proof unknown and preserves the meaning of a user report', async () => {
    expect((await verifyLifeGoal({ obligation, readSetting: async () => undefined })).verdict).toBe('unknown')
    const reported = await verifyLifeGoal({ obligation: { ...obligation, proof: { kind: 'user-reported' } }, readSetting: async () => undefined, userReported: true })
    expect(reported.verdict).toBe('satisfied')
    expect(reported.independent).toBe(false)
    expect((await verifyLifeGoal({ obligation: { ...obligation, proof: { kind: 'setting', settingKey: 'theme', expectedValue: 'dark' } }, readSetting: async () => 'light' })).verdict).toBe('not-satisfied')
  })
})

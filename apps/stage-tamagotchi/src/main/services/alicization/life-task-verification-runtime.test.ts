import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { buildAlicizationExecutionPayoffPrompt } from './execution-delivery-surface'
import { projectLifeTaskOutcome } from './life-task-outcome'
import { verifyLifeTaskCompletion } from './life-task-verification-runtime'

describe('independent task goal settlement', () => {
  it('does not accept executor completion with wrong bytes and rejects lowering the proof after execution starts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-task-proof-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'expected.txt')
      const contentHash = createHash('sha256').update('accepted target').digest('hex')
      const initial = await db.upsertTaskThread({ id: 'proof-task', status: 'planned', goal: 'Write the accepted content', kind: 'codebase-edit', metadata: { goalProof: { kind: 'file', path, contentHash } } })
      const running = await db.upsertTaskThread({ ...initial, status: 'running', expectedUpdatedAt: initial.updatedAt })
      await expect(db.upsertTaskThread({ ...running, status: 'completed', metadata: { goalProof: { kind: 'user-reported' } }, expectedUpdatedAt: running.updatedAt })).rejects.toThrow('accepted goal proof')
      expect((await db.readLifeState()).obligations[0].proof.contentHash).toBe(contentHash)
      await writeFile(path, 'wrong output')
      await db.upsertTaskThread({ ...running, status: 'completed', expectedUpdatedAt: running.updatedAt })
      const verification = await verifyLifeTaskCompletion({ cardId: 'alice', threadId: initial.id, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue })
      expect(verification?.verdict).toBe('not-satisfied')
      expect((await db.readLifeState()).obligations[0].status).toBe('blocked')
      expect((await db.getTaskThread(initial.id))?.status).toBe('completed')
      const outcome = projectLifeTaskOutcome(await db.readLifeState(), initial.id)
      expect(outcome).toMatchObject({ status: 'blocked', verdict: 'not-satisfied', independent: true, verificationId: verification!.id })
      const prompt = buildAlicizationExecutionPayoffPrompt({ mode: 'callback-delivery', channel: 'cli', goal: initial.goal, status: 'completed', summary: 'Adapter completed', outcome: 'exitCode=0', goalVerification: outcome })
      const fact = JSON.parse(prompt.system).data.executionFact
      expect(fact.status).toBe('succeeded')
      expect(fact.result.goalVerification.verdict).toBe('not-satisfied')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

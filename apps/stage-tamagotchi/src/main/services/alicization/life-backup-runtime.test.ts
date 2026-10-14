import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { applyPendingLifeRestore, cancelPendingLifeRestore, createLifeBackupRuntime } from './life-backup-runtime'
import { verifyLifeGoal } from './life-goal-verifier'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('closed desktop backup restore', () => {
  it.each(['corrupt-backup', 'before-moved'] as const)('can cancel %s recovery and reopen the untouched original life', async (failure) => {
    const root = await mkdtemp(join(tmpdir(), 'life-restore-cancel-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const soul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
      await writeFile(soul, 'backup identity')
      const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => 5 })
      const backup = await runtime.create()
      await writeFile(soul, 'original current identity')
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: 'current original fact', confidence: 1 }], 'rule')
      await runtime.requestRestore(backup.id, backup.manifestHash)
      await db.close()
      if (failure === 'corrupt-backup') {
        await writeFile(join(root, 'alicizations', 'life-backups', backup.id, 'alicization.db'), 'damaged after review')
        await expect(applyPendingLifeRestore(root)).rejects.toThrow('changed')
      }
      else {
        await expect(applyPendingLifeRestore(root, (point) => {
          if (point === 'before-moved')
            throw new Error('power-loss')
        })).rejects.toThrow('power-loss')
      }
      await cancelPendingLifeRestore(root)
      expect(await applyPendingLifeRestore(root)).toBeNull()
      expect(await readFile(soul, 'utf8')).toBe('original current identity')
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).some(fact => fact.value === 'current original fact')).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it.each(['staged', 'before-moved'] as const)('recovers a %s interruption without replaying a real file mutation', async (phase) => {
    const root = await mkdtemp(join(tmpdir(), 'life-backup-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const soul = join(root, 'alicizations', 'cards', 'alice', 'SOUL.md')
    const output = join(root, 'actual-task.txt')
    try {
      await writeFile(soul, 'Original local identity')
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', conversationId: 'session', turnId: 'write-file', messages: [{ role: 'user', content: 'Write the local QA artifact' }] }, new AbortController().signal)
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '咖啡', confidence: 1 }], 'rule')
      const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => 5 })
      const backup = await runtime.create()
      expect(await runtime.list()).toHaveLength(1)
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '茶', confidence: 1 }], 'rule')
      await writeFile(soul, 'Current local identity')
      const effect = { id: 'write-once', operationKey: 'write-once', kind: 'execute' as const, turnId: 'write-file', actionId: 'file-create', generation: 1, payload: { path: output } }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'write-intent', changes: [], mutations: [{ type: 'effect-prepare', effect }] })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'write-dispatch', changes: [], mutations: [{ type: 'effect-transition', id: effect.id, expected: 'prepared', status: 'claimed' }, { type: 'effect-transition', id: effect.id, expected: 'claimed', status: 'dispatched' }] })
      await writeFile(output, 'Actual external result', { flag: 'wx' })
      const proof = { kind: 'file' as const, path: output, contentHash: createHash('sha256').update('Actual external result').digest('hex') }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'current-goal', changes: [], mutations: [{ type: 'obligation-create', dedupeKey: 'current-goal', obligation: { id: 'current-goal', cardId: 'alice', generation: 1, revision: 0, kind: 'task', summary: 'Retain current task authority', status: 'accepted', sourceTurnId: 'write-file', deliveryTurnId: null, dueAt: null, timezone: null, proof, threadId: null, scheduledTaskId: null, receiptId: null, createdAt: Date.now(), updatedAt: Date.now() } }] })
      const goal = (await db.readLifeState()).obligations.find(goal => goal.id === 'current-goal')!
      const originalVerification = await verifyLifeGoal({ obligation: goal, readSetting: db.getMetaValue })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'current-goal-fulfilled', changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification: originalVerification }] })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'write-settle', changes: [], mutations: [{ type: 'effect-transition', id: effect.id, expected: 'dispatched', status: 'settled', receipt: { path: output } }] })
      const revision = (await db.readLifeState()).revision
      await runtime.requestRestore(backup.id, backup.manifestHash)
      if (phase === 'before-moved')
        await writeFile(output, 'Changed by the user before restore')
      await db.close()
      await expect(applyPendingLifeRestore(root, (point) => {
        if (point === phase)
          throw new Error('power-loss')
      })).rejects.toThrow('power-loss')
      const restored = await applyPendingLifeRestore(root)
      expect(restored?.backupId).toBe(backup.id)
      expect(await applyPendingLifeRestore(root)).toBeNull()
      expect(await readFile(join(restored!.beforeDirectory, 'SOUL.md'), 'utf8')).toBe('Current local identity')
      expect(await readFile(soul, 'utf8')).toBe('Original local identity')
      expect(await readFile(output, 'utf8')).toBe(phase === 'staged' ? 'Actual external result' : 'Changed by the user before restore')
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await db.readLifeState()).revision).toBeGreaterThanOrEqual(revision)
      const restoredGoal = (await db.readLifeState()).obligations.find(goal => goal.id === 'current-goal')!
      expect(restoredGoal.status).toBe(phase === 'staged' ? 'fulfilled' : 'blocked')
      expect(restoredGoal.verification).toMatchObject({ independent: true, verdict: phase === 'staged' ? 'satisfied' : 'not-satisfied' })
      expect(restoredGoal.receiptId).not.toBe(originalVerification.id)
      expect(restoredGoal.sourceTurnId).toBe('write-file')
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'forged-restore-operation', changes: [], mutations: [{ type: 'obligation-restore-verify', id: restoredGoal.id, expectedGeneration: restoredGoal.generation, expectedRevision: restoredGoal.revision, verification: originalVerification, restoreOperationId: 'another-restore' }] })).rejects.toThrow('exact pending restore operation')
      expect((await db.getLifeEffect(effect.id))?.status).toBe('uncertain')
      expect(JSON.parse((await db.getMetaValue('kill_switch_state_v1'))!).state).toBe('SUSPENDED')
      expect((await db.getLifeIngress('user:write-file'))?.status).toBe('held')
      const verification = await verifyLifeGoal({ obligation: { status: 'verifying', proof } as any, readSetting: db.getMetaValue })
      expect(verification).toMatchObject({ verdict: phase === 'staged' ? 'satisfied' : 'not-satisfied', independent: true })
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).map(fact => fact.value)).toContain('咖啡')
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).map(fact => fact.value)).not.toContain('茶')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('rejects a changed artifact and an identity mismatch without altering the current life', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-backup-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => 5 })
      const backup = await runtime.create()
      const other = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'bob', snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => 5 })
      await expect(other.requestRestore(backup.id, backup.manifestHash)).rejects.toThrow('scope')
      await writeFile(join(root, 'alicizations', 'life-backups', backup.id, 'alicization.db'), 'tampered')
      await expect(runtime.requestRestore(backup.id, backup.manifestHash)).rejects.toThrow('changed')
      expect((await db.readLifeState()).cardId).toBe('alice')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('keeps forgetting effective when a user selects an older backup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-backup-forget-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '旧偏好', confidence: 1 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const runtime = createLifeBackupRuntime({ userDataPath: root, cardId: () => 'alice', snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => 5 })
      const backup = await runtime.create()
      await db.commitLifeState({ cardId: 'alice', operationKey: 'forget', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }, mode: 'forget', reason: 'user-request' }] })
      await expect(runtime.requestRestore(backup.id, backup.manifestHash)).rejects.toThrow('forgotten source')
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).filter(fact => fact.lifecycle === 'active')).toHaveLength(0)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

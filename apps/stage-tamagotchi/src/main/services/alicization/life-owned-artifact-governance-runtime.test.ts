import { copyFile, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeOwnedArtifactGovernanceRuntime } from './life-owned-artifact-governance-runtime'
import { createLifeOwnedArtifactRestore } from './life-owned-artifact-restore'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'life-artifact-withdrawal-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const workspace = join(root, 'notes')
  await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '私人兴趣材料', confidence: 0.95 }], 'rule')
  const source = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
  const project = createLifePersonalProjectRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), workspace: () => workspace, foregroundActive: () => false, now: Date.now, recordExperience: async () => {} })
  expect(await project.run('alice')).toMatchObject({ status: 'completed' })
  const goal = (await db.readLifeState()).obligations[0]
  return { root, db, workspace, source, goal }
}

describe('source withdrawal reaches owned physical artifacts', () => {
  it('restores a verified quarantined document, reconciles a lost receipt without copying twice, and keeps work withdrawn', async () => {
    const { root, db: originalDb, workspace, source, goal } = await fixture()
    let db = originalDb
    try {
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId] })
      await createLifeOwnedArtifactGovernanceRuntime({ read: db.readLifeState, getEffect: db.getLifeEffect, commit: db.commitLifeState, workspace: () => workspace, now: Date.now }).reconcile('alice')
      const current = (await db.readLifeState()).obligations.find(item => item.id === goal.id)!
      const copy = vi.fn(copyFile)
      let loseReceipt = true
      const restore = createLifeOwnedArtifactRestore({ read: () => db.readLifeState(), getEffect: id => db.getLifeEffect(id), commit: async (input) => {
        if (loseReceipt && input.mutations?.some(item => item.type === 'effect-transition' && item.status === 'settled' && item.receipt?.outcome === 'restored'))
          throw new Error('restoration receipt lost')
        return db.commitLifeState(input)
      }, workspace: () => workspace, copy })
      const input = { cardId: 'alice', goalId: current.id, expectedGeneration: current.generation, expectedHash: current.proof.contentHash!, operationId: 'human-restore' }
      await expect(restore({ ...input, expectedGeneration: current.generation - 1 })).rejects.toThrow('generation changed')
      await expect(restore(input)).rejects.toThrow('receipt lost')
      expect(await readFile(current.proof.path!, 'utf8')).toContain('私人兴趣材料')
      loseReceipt = false
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await restore.reconcile('alice')).toMatchObject([{ status: 'restored' }])
      expect(await restore({ ...input, operationId: 'retry-after-restart' })).toEqual({ status: 'restored' })
      expect(copy).toHaveBeenCalledOnce()
      const view = await db.readLifeState()
      expect(view.obligations.find(item => item.id === goal.id)).toMatchObject({ status: current.status, generation: current.generation, invalidationMode: 'forget', invalidatedBy: current.invalidatedBy })
      expect(view.effects.find(effect => effect.actionId === 'restore-owned-artifact')).toMatchObject({ status: 'settled', receipt: { readOnlyReconciliation: true, activitiesRemainWithdrawn: true } })
      await writeFile(current.proof.path!, '后来的人为修改')
      expect(await restore(input)).toEqual({ status: 'held' })
      expect(await readFile(current.proof.path!, 'utf8')).toBe('后来的人为修改')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('preserves a file created after restore preflight using exclusive copy', async () => {
    const { root, db, workspace, source, goal } = await fixture()
    try {
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId] })
      await createLifeOwnedArtifactGovernanceRuntime({ read: db.readLifeState, getEffect: db.getLifeEffect, commit: db.commitLifeState, workspace: () => workspace, now: Date.now }).reconcile('alice')
      const current = (await db.readLifeState()).obligations.find(item => item.id === goal.id)!
      const restore = createLifeOwnedArtifactRestore({ read: db.readLifeState, getEffect: db.getLifeEffect, commit: async (input) => {
        const receipt = await db.commitLifeState(input)
        if (input.mutations?.some(item => item.type === 'effect-prepare' && item.effect.actionId === 'restore-owned-artifact'))
          await writeFile(current.proof.path!, '新建文件不能被覆盖')
        return receipt
      }, workspace: () => workspace })
      await expect(restore({ cardId: 'alice', goalId: current.id, expectedGeneration: current.generation, expectedHash: current.proof.contentHash!, operationId: 'new-file-race' })).rejects.toThrow('EEXIST')
      expect(await readFile(current.proof.path!, 'utf8')).toBe('新建文件不能被覆盖')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('redacts derived task and action material and reconciles a moved file after lost settlement without moving it twice', async () => {
    const { root, db, workspace, source, goal } = await fixture()
    const move = vi.fn(rename)
    try {
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId], reason: 'withdraw-interest' })
      expect(JSON.stringify(await db.getTaskThread(goal.threadId!))).not.toContain('私人兴趣材料')
      expect(JSON.stringify((await db.readLifeState()).effects)).not.toContain('私人兴趣材料')
      expect(JSON.stringify((await db.readLifeState()).ingress)).not.toContain('私人兴趣材料')
      const governance = createLifeOwnedArtifactGovernanceRuntime({ read: db.readLifeState, getEffect: db.getLifeEffect, commit: async (input) => {
        if (input.operationKey.startsWith('settle:artifact-withdrawal:') || input.operationKey.startsWith('uncertain:artifact-withdrawal:'))
          throw new Error('storage-unavailable-after-move')
        return db.commitLifeState(input)
      }, workspace: () => workspace, now: Date.now, move })
      await expect(governance.reconcile('alice')).rejects.toThrow('storage-unavailable')
      expect(move).toHaveBeenCalledOnce()
      await expect(stat(goal.proof.path!)).rejects.toMatchObject({ code: 'ENOENT' })
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await createLifeTurnRuntime({ read: restarted.readLifeState, getIngress: restarted.getLifeIngress, getEffect: restarted.getLifeEffect, commit: restarted.commitLifeState, now: Date.now }).recover('alice')
      const governance = createLifeOwnedArtifactGovernanceRuntime({ read: restarted.readLifeState, getEffect: restarted.getLifeEffect, commit: restarted.commitLifeState, workspace: () => workspace, now: Date.now, move })
      expect(await governance.reconcile('alice')).toMatchObject([{ goalId: goal.id, status: 'quarantined' }])
      expect(move).toHaveBeenCalledOnce()
      const intent = (await restarted.readLifeState()).effects.find(effect => effect.id.startsWith('artifact-withdrawal:'))!
      expect(intent).toMatchObject({ status: 'settled', receipt: { outcome: 'quarantined', readOnlyReconciliation: true } })
      expect(await readFile(String(intent.receipt!.path), 'utf8')).toContain('私人兴趣材料')
    }
    finally { await restarted.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('holds an edited file rather than relocating user edits', async () => {
    const { root, db, workspace, source, goal } = await fixture()
    try {
      await writeFile(goal.proof.path!, '用户新增的内容')
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId] })
      const move = vi.fn(rename)
      const governance = createLifeOwnedArtifactGovernanceRuntime({ read: db.readLifeState, getEffect: db.getLifeEffect, commit: db.commitLifeState, workspace: () => workspace, now: Date.now, move })
      expect(await governance.reconcile('alice')).toMatchObject([{ status: 'held' }])
      expect(move).not.toHaveBeenCalled()
      expect(await readFile(goal.proof.path!, 'utf8')).toBe('用户新增的内容')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

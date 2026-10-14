import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { projectExperienceEpisode } from './life-project-experience'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

async function verifiedProject(db: Awaited<ReturnType<typeof setupAlicizationDb>>, root: string) {
  const notes = join(root, 'notes')
  await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
  const runtime = createLifePersonalProjectRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: notes, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), workspace: () => notes, foregroundActive: () => false, now: Date.now, recordExperience: async () => {} })
  expect((await runtime.run('alice')).status).toBe('completed')
  return (await db.readLifeState()).obligations[0]
}

async function removeFixture(root: string) {
  expect(resolve(root).startsWith(join(resolve(tmpdir()), 'alicization-experience-fence-'))).toBe(true)
  await rm(root, { recursive: true, force: true })
}

describe('verified project experience and source withdrawal at the actual writer', () => {
  it('cannot reinsert a project episode when its source is forgotten during publication', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-experience-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const goal = await verifiedProject(db, root)
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const record = createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: async (events) => {
        await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [fact.factId], reason: 'withdraw-before-memory-commit' })
        return db.appendEpisodicEvents(events)
      } })
      await record(goal)
      expect((await db.listRecentEpisodicEvents(20)).filter(episode => episode.id.startsWith('project-experience:'))).toHaveLength(0)
      expect(await db.getMetaValue(`life:experience:alice:project-experience:${goal.threadId}:${goal.generation}`)).toBeUndefined()
      expect((await db.readLifeState()).obligations[0].invalidatedBy).not.toBeNull()
      await db.appendEpisodicEvents([{ id: 'after-withdrawal', cardId: 'alice', sourceKind: 'execution-result', provenance: 'observed', whatHappened: '下一条有效记录仍可写入。', confidence: 1 }])
      expect((await db.listRecentEpisodicEvents(20)).some(episode => episode.id === 'after-withdrawal')).toBe(true)
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it('recovers a crash between publication and indexing without duplicating the episode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-experience-fence-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const goal = await verifiedProject(db, root)
      const record = createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: async () => {
        throw new Error('crash before cursor')
      }, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents })
      await expect(record(goal)).rejects.toThrow('crash before cursor')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const recovered = createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents })
      await recovered((await db.readLifeState()).obligations[0])
      await recovered((await db.readLifeState()).obligations[0])
      expect((await db.listRecentEpisodicEvents(20)).filter(episode => episode.id.startsWith('project-experience:'))).toHaveLength(1)
      expect(JSON.parse((await db.getMetaValue(`life:experience:alice:project-experience:${goal.threadId}:${goal.generation}`))!)).toMatchObject({ verificationId: goal.verification!.id })
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it.each(['generation', 'proof', 'narrative', 'derivation'] as const)('rejects a forged %s at the actual journal writer without blocking a valid event', async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-experience-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const goal = await verifiedProject(db, root)
      const event = projectExperienceEpisode(goal)!
      if (mode === 'generation')
        event.id = `project-experience:${goal.threadId}:${goal.generation + 1}`
      if (mode === 'proof')
        event.sourceSummary = 'independent-file-proof:unobserved'
      if (mode === 'narrative')
        event.whatHappened = '我已经阅读并研究了网上的材料。'
      if (mode === 'derivation')
        event.derivedFrom = [{ kind: 'task-thread', id: 'foreign-thread' }]
      expect(await db.appendEpisodicEvents([event])).toHaveLength(0)
      expect(await db.listRecentEpisodicEvents(20)).toHaveLength(0)
      const record = createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents })
      await record(goal)
      expect(await db.listRecentEpisodicEvents(20)).toHaveLength(1)
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it('does not publish a stale verification snapshot or cross a card boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-experience-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const goal = await verifiedProject(db, root)
      const append = vi.fn(db.appendEpisodicEvents)
      const record = createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: append })
      await record({ ...goal, verification: { ...goal.verification!, id: 'old-verification' } })
      expect(append).not.toHaveBeenCalled()
      await expect(record({ ...goal, cardId: 'other' })).rejects.toThrow('card boundary')
      expect(append).not.toHaveBeenCalled()
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })
})

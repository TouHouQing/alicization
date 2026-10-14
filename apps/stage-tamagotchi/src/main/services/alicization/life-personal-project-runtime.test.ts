import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('real personal activity through the existing execution adapter', () => {
  it('writes and verifies a fictional creative artifact while holding unavailable or preempted generation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-creative-project-loop-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 4, 12).getTime())
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const workspaceRoot = join(root, 'notes')
    let foreground = false
    let mode: 'unavailable' | 'preempted' | 'complete' = 'unavailable'
    const compose = vi.fn(async () => {
      if (mode === 'unavailable')
        return null
      if (mode === 'preempted')
        foreground = true
      return { title: '一段旋律', body: '这是虚构的夜晚。一段轻柔的旋律沿着窗边慢慢铺开，纸上的句子像小小的音符，停在安静而明亮的留白里。' }
    })
    const runtime = createLifePersonalProjectRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspaceRoot, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), workspace: () => workspaceRoot, foregroundActive: () => foreground, now: Date.now, compose, recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      expect((await runtime.run('alice')).status).toBe('completed')
      expect(compose).not.toHaveBeenCalled()
      clock.mockReturnValue(new Date(2026, 9, 5, 13).getTime())
      expect(await runtime.run('alice')).toMatchObject({ status: 'held', reason: 'creative-provider-unavailable' })
      expect((await db.readLifeState()).obligations).toHaveLength(1)
      mode = 'preempted'
      expect(await runtime.run('alice')).toMatchObject({ status: 'held', reason: 'foreground-priority' })
      expect((await db.readLifeState()).obligations).toHaveLength(1)
      foreground = false
      mode = 'complete'
      expect((await runtime.run('alice')).status).toBe('completed')
      const goal = (await db.readLifeState()).obligations.find(goal => goal.personalActivity === 'creative-writing-v1')!
      expect(goal).toMatchObject({ status: 'fulfilled', verification: { verdict: 'satisfied', independent: true } })
      const artifact = await readFile(goal.proof.path!, 'utf8')
      expect(artifact).toContain('虚构作品，不代表真实经历')
      expect(artifact).toContain('纸上的句子')
      const episode = (await db.listRecentEpisodicEvents(10)).find(episode => episode.turnId === goal.threadId)!
      expect(episode).toMatchObject({ provenance: 'observed', sourceKind: 'execution-result' })
      expect(episode.whatHappened).toContain('作品中的故事不作为真实经历')
      expect(episode.whatHappened).not.toContain('纸上的句子')
      expect((await runtime.run('alice')).status).toBe('held')
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toHaveLength(1)
    }
    finally { await db.close(); clock.mockRestore(); await rm(root, { recursive: true, force: true }) }
  })

  it('creates a grounded artifact, independently verifies it, observes foreground priority and persists its budget after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-project-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let foreground = false
    const workspaceRoot = join(root, 'notes')
    const runtime = createLifePersonalProjectRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspaceRoot, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), workspace: () => workspaceRoot, foregroundActive: () => foreground, now: Date.now, recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
    try {
      await db.upsertMemoryFacts([{ subject: '某位朋友', predicate: 'interest', object: '园艺', confidence: 0.95 }], 'rule')
      expect(await runtime.run('alice')).toMatchObject({ status: 'held', reason: 'no-grounded-interest' })
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      foreground = true
      expect((await runtime.run('alice')).status).toBe('held')
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      foreground = false
      const activity = await runtime.run('alice')
      expect(activity.status, JSON.stringify((await db.readLifeState()).effects)).toBe('completed')
      const view = await db.readLifeState()
      const project = view.obligations[0]
      expect(project).toMatchObject({ kind: 'personal-project', status: 'fulfilled', proof: { kind: 'file' } })
      const artifact = await readFile(project.proof.path!, 'utf8')
      expect(artifact).toContain('音乐')
      expect(artifact).toContain('尚未进行外部阅读或研究')
      expect(view.ingress.some(item => item.source === 'execution')).toBe(true)
      expect((await db.listRecentEpisodicEvents(10))[0]).toMatchObject({ provenance: 'observed', sourceKind: 'execution-result' })
      expect((await runtime.run('alice')).status).toBe('held')
      await writeFile(project.proof.path!, 'tampered')
    }
    finally {
      await db.close()
    }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      expect(JSON.parse((await restarted.readLifeState()).values['life:initiative']).personalProjectAt).toBeGreaterThan(0)
      expect((await restarted.readLifeState()).effects).toMatchObject([{ status: 'settled' }])
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

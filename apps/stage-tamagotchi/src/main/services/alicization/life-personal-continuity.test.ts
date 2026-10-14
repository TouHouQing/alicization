import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { deriveLifePersonalInterests } from './life-personal-continuity'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('self interests from actual choices across days', () => {
  it('carries verified own practice through restart and into real dialogue context, withdrawing it with its evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-own-interest-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 8, 12).getTime())
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const workspace = join(root, 'notes')
    const make = () => createLifePersonalProjectRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, facts: (cardId, factIds) => db.readLifeFactVersions({ cardId, ...(factIds ? { factIds, history: true } : {}) }), upsertTask: db.upsertTaskThread, readTask: db.getTaskThread, workspace: () => workspace, foregroundActive: () => false, now: Date.now, preferCreative: true, origin: 'self-initiated', planSeries: async () => ({ title: '我想练习短篇的留白', steps: ['窗边', '午后', '尾声'] }), compose: async ({ project }) => ({ title: `留白${project?.stepIndex}`, body: '这是一段虚构作品。我试着把一个平常的午后写得更轻一点：窗边的光停在纸上，没有声响，却留下一小片可以慢慢体会的安静。' }), dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '钢琴', confidence: 0.95 }], 'rule')
      const source = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      for (let day = 0; day < 3; day++) {
        clock.mockReturnValue(new Date(2026, 9, 8 + day, 12).getTime())
        const result = await make().run('alice')
        expect(result.status, JSON.stringify({ day, result })).toBe('completed')
        if (day === 0) {
          expect(deriveLifePersonalInterests(await db.readLifeState())[0]).toMatchObject({ subject: 'self:alice', topic: '我想练习短篇的留白', development: 'trying', permanentlyLikes: false })
          await db.close()
          db = await setupAlicizationDb(root, { cardId: 'alice' })
          // A change in the host's taste does not erase her actual creative
          // history or force the same change in her independently chosen plan.
          await db.commitLifeState({ cardId: 'alice', operationKey: 'correct-host-taste', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: source.factId, version: String(source.version) }, mode: 'correction', reason: 'host now prefers different music' }] })
          const corrected = await db.readLifeState()
          expect(deriveLifePersonalInterests(corrected), JSON.stringify({ goals: corrected.obligations.map(goal => ({ id: goal.id, status: goal.status, kind: goal.kind, activity: goal.personalActivity, topic: goal.personalTopic, invalidated: goal.invalidatedBy, authorship: goal.personalAuthorship })), effects: corrected.effects.map(effect => ({ capability: effect.payload.capabilityId, status: effect.status, outcome: effect.receipt?.outcome })) })).toMatchObject([{ topic: '我想练习短篇的留白' }])
        }
      }
      const own = deriveLifePersonalInterests(await db.readLifeState())
      expect(own[0]).toMatchObject({ development: 'repeated-own-practice', permanentlyLikes: false })
      expect(own[0].evidence).toHaveLength(3)
      // Routine effect-window paging must not erase the durable authorship proof.
      expect(deriveLifePersonalInterests({ ...(await db.readLifeState()), effects: [] })[0].evidence).toHaveLength(3)
      expect(await db.readLifeFactVersions({ cardId: 'alice', history: true })).toHaveLength(1)
      const context = await createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now }).context('alice')
      expect(JSON.parse(context.text).personalInterests[0].topic).toBe('我想练习短篇的留白')
      clock.mockReturnValue(new Date(2026, 9, 10, 14).getTime())
      const review = await make().run('alice')
      expect(review.status).toBe('completed')
      const reviewGoal = (await db.readLifeState()).obligations.find(goal => goal.personalActivity === 'practice-review-v1')!
      expect(reviewGoal).toMatchObject({ status: 'fulfilled', personalAuthorship: { effectId: expect.any(String) }, verification: { independent: true } })
      expect(await readFile(reviewGoal.proof.path!, 'utf8')).toContain('练习次数和反馈不代表已经掌握技能')
      expect((await make().run('alice')).status).toBe('held')
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-topic', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: source.factId, version: String(source.version) }, mode: 'forget', reason: 'host withdrew source' }] })
      expect(deriveLifePersonalInterests(await db.readLifeState())).toHaveLength(0)
      expect((await db.readLifeState()).obligations.find(goal => goal.id === reviewGoal.id)?.invalidatedBy).toBeTruthy()
    }
    finally { await db.close(); clock.mockRestore(); await rm(root, { recursive: true, force: true }) }
  })
})

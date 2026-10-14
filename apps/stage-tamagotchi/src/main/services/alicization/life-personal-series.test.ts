import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { extractExplicitLongTermMemoryEvidence } from './explicit-memory-evidence'
import { createLifeAgencyRuntime } from './life-agency-runtime'
import { verifyLifeGoal } from './life-goal-verifier'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

afterEach(() => vi.restoreAllMocks())

const day = 24 * 60 * 60_000
type ComposeInput = Parameters<NonNullable<Parameters<typeof createLifePersonalProjectRuntime>[0]['compose']>>[0]
function createProject(db: Awaited<ReturnType<typeof setupAlicizationDb>>, root: string, preferCreative = false) {
  const workspace = join(root, 'notes')
  const planSeries = vi.fn(async () => ({ title: '窗边的三段旋律', steps: ['起初的音符', '听见变化', '写下回声'] }))
  const compose = vi.fn(async (input: ComposeInput) => ({ title: `第${(input.project?.stepIndex ?? 0) + 1}段`, body: `这是一段虚构作品。${input.project?.stepIndex ? '延续了前一段旋律的回声。' : '第一段旋律慢慢响起。'}窗外的光落在纸上，音符沿着留白轻轻向前走，没有假装发生过任何真实事件。` }))
  const dispatch = vi.fn((input: Parameters<Parameters<typeof createLifePersonalProjectRuntime>[0]['dispatch']>[0]) => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }))
  const runtime = createLifePersonalProjectRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, readTask: db.getTaskThread, readExecutionEvents: threadId => db.listExecutionEvents({ threadId }), dispatch, workspace: () => workspace, foregroundActive: () => false, now: Date.now, planSeries, compose, preferCreative, recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
  return { runtime, planSeries, compose, dispatch }
}

async function removeFixture(root: string) {
  expect(resolve(root).startsWith(join(resolve(tmpdir()), 'alicization-series-'))).toBe(true)
  await rm(root, { recursive: true, force: true })
}

describe('persistent personal creative project with actual verified artifacts', () => {
  it('starts actual creative work from a cleaned conversational preference, preserving its proof and daily budget after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const evidence = extractExplicitLongTermMemoryEvidence({ userText: '我喜欢阴天时听雨声。记住这个小偏好吧。你自己更喜欢什么样的天气？', providerSucceeded: true })!
      expect(evidence).toMatchObject({ kind: 'preference', summary: '用户喜欢阴天时听雨声。' })
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'prefers', object: evidence.summary, confidence: evidence.confidence }], 'rule')
      const fixture = createProject(db, root, true)
      expect((await fixture.runtime.run('alice')).status).toBe('completed')
      expect(fixture.compose).toHaveBeenCalledOnce()
      expect(fixture.compose.mock.calls[0]![0].topic).toContain('雨声')
      const goal = (await db.readLifeState()).obligations.find(goal => goal.personalActivity === 'creative-writing-v1')!
      expect(goal).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
      expect(await readFile(goal.proof.path!, 'utf8')).toContain('虚构作品')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const restarted = createProject(db, root, true)
      expect(await restarted.runtime.run('alice')).toMatchObject({ status: 'held', reason: 'daily-project-budget' })
      expect(restarted.compose).not.toHaveBeenCalled()
      expect((await db.readLifeState()).obligations.find(item => item.id === goal.id)).toMatchObject({ status: 'fulfilled', proof: goal.proof })
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it('keeps the final planned piece attached to its series after a failed write and restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 5, 12).getTime())
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const fixture = createProject(db, root)
      await fixture.runtime.run('alice')
      for (let step = 0; step < 2; step++) {
        clock.mockReturnValue(Date.now() + day + 1000)
        expect((await fixture.runtime.run('alice')).status).toBe('completed')
      }
      const rootId = JSON.parse((await db.readLifeState()).values['life:initiative']).pendingPersonalSeries
      fixture.dispatch.mockImplementationOnce(async () => {
        throw new Error('write interrupted before its result')
      })
      clock.mockReturnValue(Date.now() + day + 1000)
      await expect(fixture.runtime.run('alice')).rejects.toThrow('write interrupted')
      expect(JSON.parse((await db.readLifeState()).values['life:initiative']).pendingPersonalSeries).toBe(rootId)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const restarted = createProject(db, root)
      await restarted.runtime.recover('alice')
      clock.mockReturnValue(Date.now() + day + 1000)
      expect(await restarted.runtime.run('alice')).toMatchObject({ status: 'held', reason: 'project-awaiting-verification' })
      expect(restarted.compose).not.toHaveBeenCalled()
      expect(restarted.dispatch).not.toHaveBeenCalled()
      expect((await db.readLifeState()).effects.some(effect => effect.status === 'uncertain')).toBe(true)
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })
  it('continues the same plan across days and restart using the verified previous piece', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 5, 12).getTime())
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const first = createProject(db, root)
      await first.runtime.run('alice') // Initial reflection note.
      clock.mockReturnValue(Date.now() + day + 1000)
      expect((await first.runtime.run('alice')).status).toBe('completed')
      const rootId = JSON.parse((await db.readLifeState()).values['life:initiative']).pendingPersonalSeries
      const original = (await db.getTaskThread(rootId))!
      expect(first.planSeries).toHaveBeenCalledOnce()
      expect(first.compose.mock.lastCall?.[0].project?.stepIndex).toBe(0)
      await expect(db.upsertTaskThread({ ...original, metadata: { ...original.metadata, personalSeries: { ...original.metadata!.personalSeries as object, plan: { title: 'changed', steps: ['a', 'b'] } } }, expectedUpdatedAt: original.updatedAt })).rejects.toThrow('accepted personal project plan')
      expect((await first.runtime.run('alice')).status).toBe('held')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const restarted = createProject(db, root)
      clock.mockReturnValue(Date.now() + day + 1000)
      expect((await restarted.runtime.run('alice')).status).toBe('completed')
      expect(restarted.planSeries).not.toHaveBeenCalled()
      expect(restarted.compose.mock.lastCall?.[0].project).toMatchObject({ rootThreadId: rootId, stepIndex: 1, plan: { title: '窗边的三段旋律' } })
      expect(restarted.compose.mock.lastCall?.[0].project?.previousPieces[0]).toContain('第一段旋律慢慢响起')
      clock.mockReturnValue(Date.now() + day + 1000)
      expect((await restarted.runtime.run('alice')).status).toBe('completed')
      expect(restarted.compose.mock.lastCall?.[0].project?.stepIndex).toBe(2)
      expect(restarted.compose.mock.lastCall?.[0].project?.previousPieces).toHaveLength(2)
      const view = await db.readLifeState()
      expect(JSON.parse(view.values['life:initiative']).pendingPersonalSeries).toBeNull()
      const pieces = view.obligations.filter(goal => goal.personalActivity === 'creative-writing-v1')
      expect(pieces).toHaveLength(3)
      for (const piece of pieces) {
        expect(piece).toMatchObject({ status: 'fulfilled', verification: { independent: true, verdict: 'satisfied' } })
        expect(await readFile(piece.proof.path!, 'utf8')).toContain('项目计划：')
      }
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it.each([{ tampered: false, verifiedBeforeCrash: false }, { tampered: true, verifiedBeforeCrash: false }, { tampered: false, verifiedBeforeCrash: true }, { tampered: true, verifiedBeforeCrash: true }])('recovers interrupted last-piece authorship with $tampered changed file and $verifiedBeforeCrash prior proof', async ({ tampered, verifiedBeforeCrash }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 5, 12).getTime())
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const fixture = createProject(db, root)
      for (let index = 0; index < 3; index++) {
        expect((await fixture.runtime.run('alice')).status).toBe('completed')
        clock.mockReturnValue(Date.now() + day + 1000)
      }
      const rootId = JSON.parse((await db.readLifeState()).values['life:initiative']).pendingPersonalSeries
      const actualDispatch = fixture.dispatch.getMockImplementation()!
      fixture.dispatch.mockImplementationOnce(async (input) => {
        await actualDispatch(input)
        if (verifiedBeforeCrash) {
          const goal = (await db.readLifeState()).obligations.find(item => item.threadId === input.threadId)!
          const verification = await verifyLifeGoal({ obligation: goal, readSetting: async () => undefined, now: Date.now })
          await db.commitLifeState({ cardId: 'alice', operationKey: 'independent-proof-before-crash', changes: [], mutations: [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }] })
        }
        throw new Error('result lost after persisted adapter completion')
      })
      await expect(fixture.runtime.run('alice')).rejects.toThrow('result lost')
      const view = await db.readLifeState()
      const effect = view.effects.find(item => item.status === 'uncertain')!
      const goal = view.obligations.find(item => item.threadId === effect.turnId)!
      expect(goal.status).toBe(verifiedBeforeCrash ? 'fulfilled' : 'verifying')
      expect(JSON.parse(view.values['life:initiative']).pendingPersonalSeries).toBe(rootId)
      if (tampered)
        await writeFile(goal.proof.path!, 'artifact changed before recovery')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const restarted = createProject(db, root)
      await restarted.runtime.recover('alice')
      const recovered = await db.readLifeState()
      expect(restarted.dispatch).not.toHaveBeenCalled()
      expect(restarted.compose).not.toHaveBeenCalled()
      const current = recovered.effects.find(item => item.id === effect.id)!
      expect(current.status).toBe(tampered ? 'uncertain' : 'settled')
      if (!tampered)
        expect(current.receipt).toMatchObject({ outcome: 'completed', recoveredBy: 'persisted-adapter-result-and-file-proof', executionEventId: expect.any(String), attemptId: expect.any(String) })
      expect(JSON.parse(recovered.values['life:initiative']).pendingPersonalSeries).toBe(tampered ? rootId : null)
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it('holds changed artifacts and removes the persisted plan when its interest source is withdrawn', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 5, 12).getTime())
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const fixture = createProject(db, root)
      await fixture.runtime.run('alice')
      clock.mockReturnValue(Date.now() + day + 1000)
      await fixture.runtime.run('alice')
      const rootId = JSON.parse((await db.readLifeState()).values['life:initiative']).pendingPersonalSeries
      const goal = (await db.readLifeState()).obligations.find(item => item.threadId === rootId)!
      await writeFile(goal.proof.path!, 'changed artifact')
      clock.mockReturnValue(Date.now() + day + 1000)
      expect(await fixture.runtime.run('alice')).toMatchObject({ status: 'held', reason: 'project-artifact-changed' })
      expect(fixture.compose).toHaveBeenCalledOnce()
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [fact.factId], reason: 'withdraw-interest' })
      expect((await db.getTaskThread(rootId))?.metadata?.personalSeries).toBeUndefined()
      expect(await fixture.runtime.run('alice')).toMatchObject({ status: 'held', reason: 'project-source-withdrawn' })
      expect(fixture.compose).toHaveBeenCalledOnce()
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })

  it('admits one due continuation as new evidence without creating a repeated timer loop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-series-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = 1000
    const options = { cardId: 'alice', now, force: false, suspended: false, cpuUsage: 1, fullscreen: false, foreground: null }
    try {
      const view = await db.readLifeState()
      await db.commitLifeState({ cardId: 'alice', operationKey: 'accepted-project-cadence', changes: [{ owner: 'initiative', key: 'life:initiative', value: JSON.stringify({ version: 1, observedAt: now, windowStart: now, cycles: 0, recentEvidence: [], pendingPersonalSeries: 'personal:accepted', nextPersonalProjectAt: 2000 }), expectedValue: view.values['life:initiative'] ?? null }], mutations: [] })
      const agency = createLifeAgencyRuntime({ read: db.readLifeState, commit: db.commitLifeState, foregroundActive: () => false })
      expect((await agency.reserve(options)).allowed).toBe(true)
      expect((await agency.reserve({ ...options, now: 1500 })).allowed).toBe(false)
      now = 2000
      expect((await agency.reserve({ ...options, now })).allowed).toBe(true)
      expect((await agency.reserve({ ...options, now: 2500 })).allowed).toBe(false)
    }
    finally {
      await db.close()
      await removeFixture(root)
    }
  })
})

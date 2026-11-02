import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifePersonalProjectRuntime } from '../life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from '../life-project-experience-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { dispatchTaskThread } from '../task-thread-dispatcher'
import { withActionDispatch } from './action-dispatch-context'
import { withPersonalProjectInvitation } from './personal-project-invitation'
import { createExecutionResourceBroker } from './resource-broker'

function invitation() {
  const broker = createExecutionResourceBroker()
  const lease = broker.acquire({ owner: 'human-turn', resources: ['host:execution'], effectId: 'create-piece', effectCardId: 'alice' })
  const authority = { cardId: 'alice', turnId: 'invite', capabilityId: 'tool.life_create_personal_piece', effectId: 'create-piece', expiresAt: lease.expiresAt, resourceLease: lease }
  const input = { cardId: 'alice', turnId: 'invite', broker, foregroundOwnerCurrent: () => true }
  return { broker, lease, authority, input }
}

describe('current human invitation for a governed personal artifact', () => {
  it('requires a real action context rather than a copied host-invited task label', async () => {
    const { input } = invitation()
    const task = vi.fn()
    await expect(withPersonalProjectInvitation(input, task)).rejects.toThrow('exact current human action')
    expect(task).not.toHaveBeenCalled()
  })

  it.each(['card', 'turn', 'capability', 'effect', 'lease'])('refuses a foreign %s binding before personal dispatch', async (field) => {
    const { input, authority } = invitation()
    const wrong = { ...authority, ...(field === 'card' ? { cardId: 'bob' } : field === 'turn' ? { turnId: 'ended-turn' } : field === 'capability' ? { capabilityId: 'tool.filesystem_write_file' } : field === 'effect' ? { effectId: 'foreign-effect' } : { resourceLease: undefined }) }
    const task = vi.fn()
    await expect(withActionDispatch(async () => wrong, () => withPersonalProjectInvitation(input, task))).rejects.toThrow()
    expect(task).not.toHaveBeenCalled()
  })

  it('rejects an ended foreground or aborted human invitation', async () => {
    const { input, authority } = invitation()
    const task = vi.fn()
    await expect(withActionDispatch(async () => authority, () => withPersonalProjectInvitation({ ...input, foregroundOwnerCurrent: () => false }, task))).rejects.toMatchObject({ name: 'AbortError' })
    const controller = new AbortController()
    controller.abort(new DOMException('Host stopped', 'AbortError'))
    await expect(withActionDispatch(async () => authority, () => withPersonalProjectInvitation({ ...input, signal: controller.signal }, task))).rejects.toMatchObject({ name: 'AbortError' })
    expect(task).not.toHaveBeenCalled()
  })

  it('rechecks the issued parent lease after asynchronous preparation', async () => {
    const { input, authority, broker, lease } = invitation()
    await expect(withActionDispatch(async () => authority, () => withPersonalProjectInvitation(input, async (assertCurrent) => {
      broker.settle(lease, { stopped: true, uncertain: false })
      await assertCurrent()
    }))).rejects.toThrow('stale')
  })

  it('still yields an invited child to a new human turn and waits for actual stop', async () => {
    const { input, authority, broker, lease } = invitation()
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => true })
    const entered = Promise.withResolvers<AbortSignal>()
    const ended = Promise.withResolvers<void>()
    let stopped = false
    const pending = withActionDispatch(async () => authority, () => withPersonalProjectInvitation(input, assertCurrent => registry.run({ cardId: 'alice', threadId: 'personal:cancelled', backgroundInitiative: true, foregroundInvitation: assertCurrent, confirmStopped: async () => stopped }, async (signal) => {
      entered.resolve(signal)
      await ended.promise
      signal.throwIfAborted()
    }))).then(() => null, error => error)
    const signal = await entered.promise
    expect(registry.cancelInitiatives()).toMatchObject({ requested: 1, state: 'stopping' })
    expect(signal.aborted).toBe(true)
    expect(broker.snapshot()).toHaveLength(2)
    stopped = true
    ended.resolve()
    expect(await pending).toMatchObject({ name: 'AbortError' })
    expect(broker.snapshot()).toHaveLength(1)
    broker.settle(lease, { stopped: true, uncertain: false })
    expect(broker.snapshot()).toEqual([])
  })

  it('writes, independently verifies and remembers an invited creative piece under the actual parent action lease', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-invited-personal-closure-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, resourceBroker: broker, now: Date.now })
    const registry = createExecutionInterruptRegistry(broker, { foregroundActive: () => true })
    try {
      await life.admit({ cardId: 'alice', turnId: 'choice', conversationId: 'primary', messages: [{ role: 'user', content: '你自己此刻想写什么故事？' }] }, signal)
      await life.settle({ cardId: 'alice', turnId: 'choice', status: 'completed', committedText: '我想写一只收集颜色的小猫的故事。', personalIntent: { scope: 'present-choice', activity: 'creative-writing-v1', topic: '一只替云朵收集颜色的小猫' } })
      await life.admit({ cardId: 'alice', turnId: 'invite', conversationId: 'primary', messages: [{ role: 'user', content: '好呀，写下来并保存在你自己的作品空间给我看吧。' }] }, signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'invite', actionId: 'create-piece', capabilityId: 'tool.life_create_personal_piece', parameters: {} }, signal)
      await action.authorizeDispatch({})
      const result = await withActionDispatch(action.assertDispatchCurrent, () => withPersonalProjectInvitation({ cardId: 'alice', turnId: 'invite', signal, broker, foregroundOwnerCurrent: () => true }, async (assertCurrent) => {
        const workspace = join(root, 'projects')
        const runtime = createLifePersonalProjectRuntime({
          read: db.readLifeState,
          commit: db.commitLifeState,
          getIngress: db.getLifeIngress,
          getEffect: db.getLifeEffect,
          facts: cardId => db.readLifeFactVersions({ cardId }),
          upsertTask: db.upsertTaskThread,
          foregroundActive: () => false,
          now: Date.now,
          workspace: () => workspace,
          origin: 'host-invited',
          preferCreative: true,
          compose: async () => ({ title: '遗落的颜色', body: '小猫背着一只蓝布袋，沿着雨后的屋檐收集云朵遗落的颜色。夜深了，它把一滴温暖的黄还给窗棂，又在自己的门前留下了一颗小星星。' }),
          dispatch: input => registry.run({ cardId: 'alice', threadId: input.threadId, signal: input.abortSignal, backgroundInitiative: true, foregroundInvitation: assertCurrent }, abortSignal => dispatchTaskThread(db, { ...input, abortSignal, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } })),
          recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }),
        })
        return runtime.run('alice', signal)
      }))
      expect(result.status).toBe('completed')
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
      const view = await db.readLifeState()
      const goal = view.obligations.find(goal => goal.kind === 'personal-project')!
      expect(goal).toMatchObject({ status: 'fulfilled', personalOrigin: 'host-invited', personalTopic: '一只替云朵收集颜色的小猫', verification: { verdict: 'satisfied', independent: true } })
      const bytes = await readFile(goal.proof.path!)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(goal.proof.contentHash)
      expect(bytes.toString()).toContain('虚构作品，不代表真实经历')
      expect(goal.personalAuthorship?.effectId).toBeTruthy()
      expect((await db.listRecentEpisodicEvents(20)).find(episode => episode.id === goal.personalAuthorship?.episodeId)).toMatchObject({ provenance: 'observed', sourceKind: 'execution-result', whatHappened: expect.stringContaining('作品中的故事不作为真实经历') })
      expect(broker.snapshot()).toEqual([])
      expect(registry.isActive()).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

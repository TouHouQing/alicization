import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'

it.each(['before-admission', 'before-context', 'after-preparation'] as const)('refuses an old task attempt at %s without writing its file', async (phase) => {
  const root = await mkdtemp(join(tmpdir(), 'life-responsibility-fence-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, resourceBroker: broker, now: Date.now })
  const parameters = { path: join(root, 'report.txt'), content: '旧 attempt 不得继续写入' }
  try {
    await db.upsertTaskThread({ id: 'responsibility', goal: '保存当前报告', kind: 'codebase-edit', status: 'running', attemptId: 'first-attempt', selectedChannel: 'cli', proposedChannel: 'cli' })
    const original = (await db.readLifeState()).obligations.find(goal => goal.threadId === 'responsibility')!
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'responsibility', actionId: 'save', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, new AbortController().signal)
    const replaceAttempt = async () => {
      const current = (await db.getTaskThread('responsibility'))!
      const paused = await db.upsertTaskThread({ ...current, status: 'paused', expectedUpdatedAt: current.updatedAt })
      const resumed = await db.resumeTaskThread({ threadId: current.id, expectedUpdatedAt: paused.updatedAt, expectedStatus: 'paused', expectedChannel: 'cli', selectedChannel: 'cli', updatedAt: Date.now(), metadata: { task: { effect: 'observe' } }, event: { threadId: current.id, channel: 'cli', kind: 'resume', threadStatus: 'planned', payload: { resumeMode: 'recovery' }, createdAt: Date.now() } })
      expect(resumed.attemptId).not.toBe(current.attemptId)
      expect((await db.readLifeState()).obligations.find(goal => goal.id === original.id)?.generation).toBe(original.generation + 1)
    }
    const write = () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal: new AbortController().signal })
    if (phase === 'before-admission') {
      await replaceAttempt()
      await expect(action.authorizeDispatch(parameters)).rejects.toThrow('responsibility')
    }
    else {
      await action.authorizeDispatch(parameters)
      if (phase === 'before-context') {
        await replaceAttempt()
        await expect(withActionDispatch(action.assertDispatchCurrent, write)).rejects.toThrow('responsibility')
      }
      else {
        await expect(withActionDispatch(action.assertDispatchCurrent, async () => {
          await replaceAttempt()
          return write()
        })).rejects.toThrow('responsibility')
      }
    }
    await expect(stat(parameters.path)).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await db.getLifeEffect(action.id))?.status).toBe('dispatched')
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('keeps the same accepted responsibility usable across unrelated life revisions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-responsibility-current-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const parameters = { path: join(root, 'report.txt'), content: '同一个持续的责任' }
  try {
    await db.upsertTaskThread({ id: 'responsibility', goal: '保存报告', kind: 'codebase-edit', status: 'running', attemptId: 'same-attempt' })
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'responsibility', actionId: 'save', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, new AbortController().signal)
    await action.authorizeDispatch(parameters)
    await db.upsertTaskThread({ id: 'unrelated', goal: '无关的后台责任', kind: 'mixed', status: 'planned' })
    const result = await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal: new AbortController().signal }))
    expect(result.ok).toBe(true)
    expect(await readFile(parameters.path, 'utf8')).toBe(parameters.content)
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('keeps an exact settled receipt reusable within its attempt and rejects it as proof for a new attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-responsibility-cache-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const parameters = { path: join(root, 'report.txt'), content: '已完成的原 attempt' }
  const prepare = () => life.beforeAction({ cardId: 'alice', turnId: 'responsibility', actionId: 'save', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
  try {
    await db.upsertTaskThread({ id: 'responsibility', goal: '保存报告', kind: 'codebase-edit', status: 'running', selectedChannel: 'cli', proposedChannel: 'cli' })
    const action = await prepare()
    await action.authorizeDispatch(parameters)
    const result = await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal }))
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
    expect((await prepare()).cached).toMatchObject({ outcome: 'success' })
    const current = (await db.getTaskThread('responsibility'))!
    const paused = await db.upsertTaskThread({ ...current, status: 'paused', expectedUpdatedAt: current.updatedAt })
    const resumed = await db.resumeTaskThread({ threadId: current.id, expectedUpdatedAt: paused.updatedAt, expectedStatus: 'paused', expectedChannel: 'cli', selectedChannel: 'cli', updatedAt: Date.now(), metadata: { task: { effect: 'observe' } }, event: { threadId: current.id, channel: 'cli', kind: 'resume', threadStatus: 'planned', payload: { resumeMode: 'recovery' }, createdAt: Date.now() } })
    expect(resumed.attemptId).not.toBe(current.attemptId)
    await expect(prepare()).rejects.toThrow('responsibility')
    expect(await readFile(parameters.path, 'utf8')).toBe(parameters.content)
    expect((await db.getLifeEffect(action.id))?.status).toBe('settled')
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('never shares a cached result with another card or a withdrawn source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-responsibility-card-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const parameters = { path: join(root, 'report.txt'), content: '属于原来源的真实结果' }
  const prepare = (cardId = 'alice') => life.beforeAction({ cardId, turnId: 'request', actionId: 'save', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
  try {
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'qa', messages: [{ role: 'user', content: '保存这个报告' }] }, signal)
    const action = await prepare()
    await action.authorizeDispatch(parameters)
    const result = await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal }))
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
    const cached = await prepare()
    expect(cached.cached).toMatchObject({ outcome: 'success' })
    await expect(cached.authorizeDispatch(parameters)).rejects.toThrow('settled action')
    await expect(prepare('bob')).rejects.toThrow('card boundary')
    await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-request', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:request', status: 'held' }] })
    await expect(prepare()).rejects.toThrow('no longer active')
    expect((await db.getLifeEffect(action.id))?.receipt).toMatchObject({ outcome: 'success' })
    expect(await readFile(parameters.path, 'utf8')).toBe(parameters.content)
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
})

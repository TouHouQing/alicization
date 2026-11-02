import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { withFileMutationQueue } from '../../airi/mcp-servers/file-mutation-queue'
import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { assertActionDispatchOperation, withActionDispatch, withMainFilesystemReadDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'

it('prevents a nested read projection from outliving its parent dispatch', async () => {
  const release = Promise.withResolvers<void>()
  let detached: Promise<unknown> | undefined
  let checks = 0
  await withActionDispatch(async () => {
    checks++
    return { capabilityId: 'tool.filesystem_read_file', expiresAt: null }
  }, async () => {
    detached = withMainFilesystemReadDispatch(async () => {
      await release.promise
      return assertActionDispatchOperation(['tool.filesystem_read_file'], { path: 'owned-file' })
    })
  })
  release.resolve()
  await expect(detached).rejects.toThrow('context has already closed')
  expect(checks).toBe(1)
})

it('carries exact authority through actual file creation, rejects a withdrawn writer after a wait, and closes detached callbacks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-dispatch-lifecycle-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  let now = Date.now()
  const broker = createExecutionResourceBroker(() => now)
  const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getEffect: db.getLifeEffect, getIngress: db.getLifeIngress, now: () => now, resourceBroker: broker })
  const signal = new AbortController().signal
  const effects = createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects
  const prepare = async (turnId: string, content = '当前责任的真实文件') => {
    await life.admit({ cardId: 'alice', turnId, conversationId: 'primary', messages: [{ role: 'user', content: 'Save this exact report' }] }, signal)
    const parameters = { path: join(root, `${turnId}.txt`), content }
    const action = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: effects }, signal)
    await action.authorizeDispatch(parameters)
    return { action, parameters, write: () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal }) }
  }
  try {
    const created = await prepare('created', '中文🙂'.repeat(20000))
    const result = await withActionDispatch(created.action.assertDispatchCurrent, created.write)
    expect(result.ok).toBe(true)
    expect(await readFile(created.parameters.path, 'utf8')).toBe(created.parameters.content)
    await life.afterAction({ cardId: 'alice', id: created.action.id, outcome: 'success', output: result, interrupted: false })
    await expect(created.action.assertDispatchCurrent()).rejects.toThrow('ownership changed')

    const withdrawn = await prepare('withdrawn')
    const entered = Promise.withResolvers<void>()
    const resume = Promise.withResolvers<void>()
    const pending = withActionDispatch(withdrawn.action.assertDispatchCurrent, async () => {
      entered.resolve()
      await resume.promise
      return withdrawn.write()
    })
    await entered.promise
    await db.commitLifeState({ cardId: 'alice', operationKey: 'host-withdrew-source', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:withdrawn', status: 'held' }] })
    resume.resolve()
    await expect(pending).rejects.toThrow('ended or withdrawn')
    await expect(stat(withdrawn.parameters.path)).rejects.toMatchObject({ code: 'ENOENT' })

    const expired = await prepare('expired')
    const releaseQueue = Promise.withResolvers<void>()
    const held = withFileMutationQueue(expired.parameters.path, () => releaseQueue.promise)
    const queued = withActionDispatch(expired.action.assertDispatchCurrent, expired.write)
    // No permission extension is granted just because an adapter is waiting.
    await new Promise<void>(resolve => setImmediate(resolve))
    now += 60001
    releaseQueue.resolve()
    await held
    await expect(queued).rejects.toThrow(/lease is stale|lease has expired/u)
    await expect(stat(expired.parameters.path)).rejects.toMatchObject({ code: 'ENOENT' })

    const detached = await prepare('detached')
    const releaseLate = Promise.withResolvers<void>()
    let late!: Promise<unknown>
    await withActionDispatch(detached.action.assertDispatchCurrent, async () => {
      late = releaseLate.promise.then(detached.write)
    })
    releaseLate.resolve()
    await expect(late).rejects.toThrow('already closed')
    await expect(stat(detached.parameters.path)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally {
    await db.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)

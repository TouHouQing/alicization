import { Buffer } from 'node:buffer'
import { readFile, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem, inspectFilesystemWritePrecondition, localFilesystemTools } from '../../airi/mcp-servers/local-filesystem'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { buildMainGatewayTools } from '../main-chat-execution-surface'
import { createFileRecoveryTestFixture } from '../test-support/file-recovery-fixture'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { assertActionDispatchOperation, withActionDispatch, withMainFilesystemMutationDispatch } from './action-dispatch-context'
import { createFileRecoveryVault } from './file-recovery-vault'
import { collectFileVersionOrphans } from './file-version-orphan-cleanup'
import { createHostFileRecoveryControl } from './host-file-recovery-control'

const original = '原文 needle 中文🙂\r\n'
const replacement = 'changed $& $` $\' $$'
const expected = `原文 ${replacement} 中文🙂\r\n`
const operations = ['write_file', 'edit_file', 'patch_file'] as const
type Operation = typeof operations[number]

async function fixture() {
  const f = await createFileRecoveryTestFixture()
  const database = f.db()
  const controller = new AbortController()
  const signal = controller.signal
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: f.broker, fileRecovery: owner => f.versions.forEffect(owner), now: Date.now })
  const registry = createCanonicalToolRegistry()
  const path = join(f.root, 'accepted.txt')
  await writeFile(path, original)
  await life.admit({ cardId: 'alice', turnId: 'edit', conversationId: 'qa', messages: [{ role: 'user', content: '只修改这个测试文件中的指定文字，保留其余内容。' }] }, signal)
  let beforeWrite: ((args: Record<string, unknown>) => Promise<void>) | undefined
  let serial = 0
  const tools = await buildMainGatewayTools({
    toolSurface: 'main-chat',
    toolRegistry: registry,
    context: { cardId: 'alice', turnId: 'edit' },
    executionCapabilityChannels: [],
    buildExecutionRuntimeContext: async () => ({ generatedAt: Date.now(), sensory: { collectedAt: null, running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } }),
    executeTaskThread: vi.fn(),
    getSensorySnapshot: vi.fn(),
    resolveTaskPlanningCapabilities: async () => [],
    scheduleReminderTask: vi.fn(),
    invokeMcpListTools: async () => localFilesystemTools,
    invokeMcpCallTool: async (payload) => {
      if (payload.name === 'filesystem::write_file')
        await beforeWrite?.(payload.arguments ?? {})
      return callLocalFilesystem({ toolName: payload.name.split('::')[1]!, arguments: payload.arguments ?? {}, workspace: f.root, signal: payload.abortSignal, writePrecondition: payload.name === 'filesystem::write_file' ? await inspectFilesystemWritePrecondition(String(payload.arguments?.path)) : undefined })
    },
  })
  const prepare = async (operation: string, parameters: Record<string, unknown>) => {
    const tool = tools.find(tool => tool.function.name === `filesystem_${operation}`)!
    expect(tool).toBeDefined()
    const capabilityId = registry.list().find(manifest => manifest.providerToolName === tool.function.name)!.capabilityId
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'edit', actionId: `${operation}-${++serial}`, capabilityId, parameters, effectContract: registry.resolveActive(capabilityId)!.effects }, signal)
    await action.authorizeDispatch(parameters)
    return { action, dispatch: () => withActionDispatch(action.assertDispatchCurrent, () => tool.execute(parameters, { messages: [], toolCallId: operation, abortSignal: signal })) }
  }
  const execute = async (operation: string, parameters: Record<string, unknown>) => {
    const { action, dispatch } = await prepare(operation, parameters)
    try {
      const result = await dispatch() as Record<string, unknown>
      expect(result.status).toBe('completed')
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
      expect(await database.getLifeEffect(action.id)).toMatchObject({ status: 'settled', payload: { parameters }, receipt: { outcome: 'success' } })
      return { result, id: action.id }
    }
    catch (error) {
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: Boolean((error as { effectMayHaveOccurred?: boolean }).effectMayHaveOccurred) }, interrupted: signal.aborted })
      throw error
    }
  }
  const parameters = (operation: Operation, expectedHash?: unknown) => ({ path, ...(operation === 'write_file' ? { content: expected } : operation === 'edit_file' ? { oldText: 'needle', newText: replacement } : { changes: [{ oldText: 'needle', newText: replacement }] }), ...(expectedHash === undefined ? {} : { expectedHash }) })
  return { ...f, get versions() { return f.versions }, dbHandle: database, life, controller, path, parameters, prepare, execute, beforeWrite: (hook: typeof beforeWrite) => { beforeWrite = hook } }
}

it.each(operations.flatMap(operation => [true, false].map(cached => ({ operation, cached }))))('commits a real $operation with cached=$cached, literal text, original recovery and durable verification', async ({ operation, cached }) => {
  const f = await fixture()
  try {
    const hash = cached ? (await f.execute('read_file', { path: f.path })).result.contentHash : undefined
    const { id } = await f.execute(operation, f.parameters(operation, hash))
    expect(await readFile(f.path, 'utf8')).toBe(expected)
    expect((await f.dbHandle.readLifeState()).obligations).toContainEqual(expect.objectContaining({ id: `file-goal:${id}`, status: 'fulfilled' }))
    const [version] = (await f.versions.list('alice')).entries
    expect(version).toMatchObject({ effectId: id, state: 'recorded' })
    expect((await f.versions.original(version.id, 'alice')).bytes).toEqual(Buffer.from(original))
    await f.reopen()
    expect((await f.db().getLifeEffect(id))?.payload.capabilityId).toBe(`tool.filesystem_${operation}`)
    expect((await f.versions.original(version.id, 'alice')).bytes).toEqual(Buffer.from(original))
  }
  finally { await f.close() }
})

const boundaries = ['content', 'path', 'expectedHash', 'host-edit', 'cancel', 'withdraw'] as const
it.each(operations.flatMap(operation => boundaries.map(boundary => ({ operation, boundary }))))('refuses $operation at $boundary before overwriting file bytes', async ({ operation, boundary }) => {
  const f = await fixture()
  const hostContent = '用户刚刚修改的内容🙂\r\n'
  try {
    const { result } = await f.execute('read_file', { path: f.path })
    const args = f.parameters(operation, result.contentHash)
    f.beforeWrite(async (native) => {
      if (boundary === 'host-edit')
        await writeFile(f.path, hostContent)
      else if (boundary === 'cancel')
        f.controller.abort(new Error('host cancelled mutation'))
      else if (boundary === 'withdraw')
        await f.dbHandle.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-edit', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:edit', status: 'held' }] })
      else
        native[boundary] = boundary === 'path' ? join(f.root, 'unapproved.txt') : 'unapproved'
    })
    await expect(f.execute(operation, args)).rejects.toThrow()
    expect(await readFile(f.path, 'utf8')).toBe(boundary === 'host-edit' ? hostContent : original)
    expect((await f.versions.list('alice')).entries).toHaveLength(0)
    expect((await f.dbHandle.readLifeState()).obligations.some(item => item.status === 'fulfilled')).toBe(false)
  }
  finally { await f.close() }
})

it.each(operations)('restores the exact original bytes after a settled main %s and refuses reuse of its confirmation', async (operation) => {
  const f = await fixture()
  const host = createHostFileRecoveryControl({ database: f.db, versions: () => f.versions, broker: f.broker, otherWritersStopped: () => true, inspectNativeProcess: async () => 'unknown', stopNativeProcess: async () => 'unknown' })
  try {
    await f.execute(operation, f.parameters(operation))
    const [version] = (await f.versions.list('alice')).entries
    const preview = await host.preview('alice', version.id, 17)
    expect(preview.state).toBe('ready')
    expect((await host.restore('alice', version.id, preview.token!, 17)).state).toBe('restored')
    expect(await readFile(f.path)).toEqual(Buffer.from(original))
    await expect(host.restore('alice', version.id, preview.token!, 17)).rejects.toThrow('confirmation')
    expect((await host.list('alice')).entries[0].state).toBe('restored')
  }
  finally { await host.dispose(); await f.close() }
}, 30000)

it('previews a patch without a write or recovery version and applies ordered literal replacements', async () => {
  const f = await fixture()
  try {
    const args = { path: f.path, changes: [{ oldText: 'missing', newText: 'skip' }, { oldText: 'needle', newText: 'new' }, { oldText: 'new', newText: replacement }], ignoreMissing: true }
    const preview = await f.execute('patch_file', { ...args, dryRun: true })
    expect(preview.result).toMatchObject({ dryRun: true, writeApplied: false, appliedChanges: 2, skippedChanges: 1, preview: expected })
    expect(await readFile(f.path, 'utf8')).toBe(original)
    expect((await f.versions.list('alice')).entries).toHaveLength(0)
    expect((await f.dbHandle.readLifeState()).obligations).toHaveLength(0)
    await f.execute('patch_file', args)
    expect(await readFile(f.path, 'utf8')).toBe(expected)
  }
  finally { await f.close() }
})

it.each(['edit_file', 'patch_file'] as const)('keeps a failed %s capture protected from orphan cleanup until its outcome is reconciled', async (operation) => {
  const f = await fixture()
  try {
    const db = f.db()
    f.database({ ...db, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-version-after:'))
        throw new Error('injected after-image journal failure')
      return db.commitLifeState(input, options)
    } })
    await expect(f.execute(operation, f.parameters(operation))).rejects.toThrow('journal failure')
    const effect = (await db.readPendingLifeExecutionEffects()).find(item => item.payload.capabilityId === `tool.filesystem_${operation}`)!
    expect(effect.status).toBe('uncertain')
    const directory = join(dirname(db.dbPath), 'file-recovery')
    const blob = join(directory, `${executionDigest({ cardId: 'alice', effectId: effect.id })}.blob`)
    const old = new Date(Date.now() - 172800000)
    await utimes(blob, old, old)
    const noKey = (): never => { throw new Error('Cleanup must never decrypt') }
    expect(await collectFileVersionOrphans({ database: db, vault: createFileRecoveryVault({ root: directory, seal: noKey, unseal: noKey }), assertCurrent: () => {} })).toEqual({ inspected: 0, removed: 0 })
    expect((await stat(blob)).size).toBeGreaterThan(0)
    expect(await readFile(f.path, 'utf8')).toBe(expected)
  }
  finally { await f.close() }
})

it.each(['edit_file', 'patch_file'] as const)('settles a refused %s before-image capture without changing the business file', async (operation) => {
  const f = await fixture()
  try {
    const db = f.db()
    f.database({ ...db, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-version-before:'))
        throw new Error('injected before-image journal failure')
      return db.commitLifeState(input, options)
    } })
    await expect(f.execute(operation, f.parameters(operation))).rejects.toThrow('journal failure')
    const effect = (await db.readLifeState()).effects.find(item => item.payload.capabilityId === `tool.filesystem_${operation}`)!
    expect(effect).toMatchObject({ status: 'settled', receipt: { outcome: 'failure' } })
    expect(await db.readPendingLifeExecutionEffects()).toEqual([])
    expect(f.broker.snapshot()).toEqual([])
    expect(await readFile(f.path, 'utf8')).toBe(original)
  }
  finally { await f.close() }
})

it('blocks detached mutation scopes after their parent closes and cannot promote a read capability to write', async () => {
  const release = Promise.withResolvers<void>()
  let detached: Promise<unknown> | undefined
  await withActionDispatch(async () => ({ capabilityId: 'tool.filesystem_edit_file', expiresAt: null }), async () => {
    detached = withMainFilesystemMutationDispatch(original, async () => {
      await release.promise
      return assertActionDispatchOperation(['tool.filesystem_write_file'], {})
    })
  })
  release.resolve()
  await expect(detached).rejects.toThrow('already closed')
  await expect(withActionDispatch(async () => ({ capabilityId: 'tool.filesystem_read_file', expiresAt: null }), () => withMainFilesystemMutationDispatch(original, () => assertActionDispatchOperation(['tool.filesystem_write_file'], {})))).rejects.toThrow('capability changed')
})

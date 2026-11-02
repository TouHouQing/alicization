import { Buffer } from 'node:buffer'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createFileRecoveryTestFixture } from '../test-support/file-recovery-fixture'
import { createHostEffectControl } from './host-effect-control'
import { createHostFileRecoveryControl } from './host-file-recovery-control'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

function host(f: Awaited<ReturnType<typeof createFileRecoveryTestFixture>>) {
  let offset = 0
  let nativeState: 'running' | 'stopped' | 'unknown' = 'stopped'
  const inspectNativeProcess = vi.fn(async () => nativeState)
  const stopNativeProcess = vi.fn(async () => 'stopped' as const)
  const control = createHostFileRecoveryControl({ database: f.databasePort, versions: () => f.versions, broker: f.broker, otherWritersStopped: () => true, inspectNativeProcess, stopNativeProcess, now: () => Date.now() + offset })
  return { control, inspectNativeProcess, stopNativeProcess, advance: (value: number) => { offset += value }, native: (value: typeof nativeState) => { nativeState = value } }
}

it('drains interrupted admission before card disposal and never starts a native writer afterward', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  const admission = Promise.withResolvers<void>()
  let entered = false
  try {
    const path = join(f.root, 'admission.txt')
    await writeFile(path, 'before')
    await f.save(path, 'generated')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const database = f.db()
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-recovery-request:')) {
        entered = true
        await admission.promise
      }
      return database.commitLifeState(input, options)
    } })
    const preview = await h.control.preview('alice', versionId, 17)
    const completion = h.control.restore('alice', versionId, preview.token!, 17).catch(error => error)
    await vi.waitFor(() => expect(entered).toBe(true))
    let disposed = false
    const disposal = h.control.dispose().then(() => { disposed = true })
    await new Promise(resolve => setImmediate(resolve))
    expect(disposed).toBe(false)
    admission.resolve()
    expect(await completion).toBeInstanceOf(Error)
    await disposal
    expect(h.control.isActive()).toBe(false)
    expect(await readFile(path, 'utf8')).toBe('generated')
    const [effect] = (await h.control.list('alice')).entries[0].recoveryEffectIds
    expect(effect).toBeUndefined()
    expect((await database.readPendingLifeExecutionEffects()).filter(item => item.payload.capabilityId === 'host.filesystem_restore_version')).toEqual([])
  }
  finally { admission.resolve(); await h.control.dispose(); await f.close() }
})

it.each(['unrelated-clock', 'changed-target'])('rebases only unrelated admission contention: %s', async (race) => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'before')
    await f.save(path, 'generated')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const database = f.db()
    let injected = false
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (!injected && input.operationKey.startsWith('file-recovery-request:')) {
        injected = true
        if (race === 'changed-target')
          await writeFile(path, 'new host content')
        await database.commitLifeState({ cardId: 'alice', operationKey: 'unrelated-test-clock', changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: 'unrelated-test-clock', kind: 'system', source: 'test-clock', sourceKey: 'unrelated', occurredAt: Date.now(), payload: { synthetic: true } } }, { type: 'ingress-settle', id: 'unrelated-test-clock', status: 'settled' }] })
      }
      return database.commitLifeState(input, options)
    } })
    const preview = await h.control.preview('alice', versionId, 17)
    if (race === 'unrelated-clock') {
      expect((await h.control.restore('alice', versionId, preview.token!, 17)).state).toBe('restored')
      expect(await readFile(path, 'utf8')).toBe('before')
    }
    else {
      await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow()
      expect(await readFile(path, 'utf8')).toBe('new host content')
      expect(await database.readPendingLifeExecutionEffects()).toEqual([])
    }
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.control.dispose(); await f.close() }
}, 30000)

it('stops before native input and drains a late startup audit before disposal completes', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  let releaseStartup: () => void = () => {}
  const startup = new Promise<void>((resolve) => { releaseStartup = resolve })
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'before')
    await f.save(path, 'generated')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const database = f.db()
    let startupEntered = false
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-recovery-process:')) {
        startupEntered = true
        await startup
      }
      return database.commitLifeState(input, options)
    } })
    const preview = await h.control.preview('alice', versionId, 17)
    const completed = h.control.restore('alice', versionId, preview.token!, 17).catch(error => error)
    await vi.waitFor(() => expect(startupEntered).toBe(true), { timeout: 10000 })
    const effect = (await database.readPendingLifeExecutionEffects()).find(item => item.payload.capabilityId === 'host.filesystem_restore_version')!
    expect(await h.control.nativeStopped('alice', effect.id)).toBe(false)
    expect(await h.control.stop('alice', effect.id)).toEqual({ state: 'stopping' })
    await vi.waitFor(async () => expect((await database.getLifeEffect(effect.id))?.status).toBe('uncertain'))
    expect(await readFile(path, 'utf8')).toBe('generated')
    expect(h.control.isActive()).toBe(true)
    let disposed = false
    const disposal = h.control.dispose().then(() => { disposed = true })
    await new Promise(resolve => setImmediate(resolve))
    expect(disposed).toBe(false)
    releaseStartup()
    expect(await completed).toBeInstanceOf(Error)
    await disposal
    expect(h.control.isActive()).toBe(false)
    expect(await readFile(path, 'utf8')).toBe('generated')
    expect((await database.getLifeEffect(effect.id))?.status).toBe('uncertain')
    expect(f.broker.snapshot()).toMatchObject([{ effectId: effect.id, uncertain: true }])
  }
  finally { releaseStartup(); await h.control.dispose(); await f.close() }
}, 30000)

it('restores through the actual native helper, cancels the confirmed related work and records only file-version success', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  const write = vi.fn()
  const work = createWorkPlanExecutionRuntime({ getDatabase: f.db, enabled: () => true, canContinue: () => false, broker: f.broker, interrupts: createExecutionInterruptRegistry(f.broker), tools: { 'tool.filesystem_write_file': write }, onError: () => {} })
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'private original')
    const originalEffect = await f.save(path, 'generated')
    const pending = await work.propose({ cardId: 'alice', turnId: 'request', goal: '继续处理报告', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['generated'] } }], steps: [{ id: 'continue', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'generated again' }, dependsOn: [], acceptanceCriterionIds: ['file'] }] })
    await vi.waitFor(() => expect(work.isActive()).toBe(false))
    const versionId = (await f.versions.list('alice')).entries[0].id
    const preview = await h.control.preview('alice', versionId, 17)
    expect(preview).toMatchObject({ state: 'ready', mode: 'restore-original', path, goals: ['继续处理报告'] })
    expect(JSON.stringify(preview)).not.toContain('private original')
    const result = await h.control.restore('alice', versionId, preview.token!, 17)
    expect(result.state).toBe('restored')
    expect(await readFile(path, 'utf8')).toBe('private original')
    expect((await f.db().getLifeEffect(result.effectId))?.receipt).toMatchObject({ outcome: 'success', output: { proofScope: 'file-version-only-no-original-goal-completion', originalEffectId: originalEffect } })
    expect((await f.db().readLifeState()).obligations.find(item => item.threadId === pending.rootThreadId)?.status).toBe('cancelled')
    expect(write).not.toHaveBeenCalled()
    expect((await h.control.list('alice')).entries[0].state).toBe('restored')
    expect((await h.control.preview('alice', versionId, 17)).state).toBe('already-restored')
    await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow('confirmation')
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.control.dispose(); await work.dispose(); await f.close() }
}, 30000)

it('requires a fresh same-window confirmation and preserves subsequent host edits', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'before')
    await f.save(path, 'generated')
    const versionId = (await f.versions.list('alice')).entries[0].id
    let preview = await h.control.preview('alice', versionId, 17)
    await expect(h.control.restore('alice', versionId, preview.token!, 18)).rejects.toThrow('confirmation')
    await expect(h.control.restore('another-card', versionId, preview.token!, 17)).rejects.toThrow('confirmation')
    preview = await h.control.preview('alice', versionId, 17)
    await expect(h.control.restore('alice', versionId, 'wrong-token', 17)).rejects.toThrow('confirmation')
    await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow('confirmation')
    preview = await h.control.preview('alice', versionId, 17)
    h.advance(120001)
    await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow('confirmation')
    preview = await h.control.preview('alice', versionId, 17)
    await writeFile(path, 'host edit that must survive')
    await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow('changed')
    expect(await readFile(path, 'utf8')).toBe('host edit that must survive')
    expect((await h.control.preview('alice', versionId, 17)).state).toBe('file-changed')
    expect(await f.db().readPendingLifeExecutionEffects()).toEqual([])
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.control.dispose(); await f.close() }
})

it('removes a created file only through the recorded creation version and explicit confirmation', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  try {
    const path = join(f.root, 'created.txt')
    await f.save(path, '')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const preview = await h.control.preview('alice', versionId, 17)
    expect(preview).toMatchObject({ state: 'ready', mode: 'remove-created' })
    expect((await h.control.restore('alice', versionId, preview.token!, 17)).state).toBe('restored')
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await h.control.list('alice')).entries[0].state).toBe('restored')
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.control.dispose(); await f.close() }
}, 30000)

it('keeps actual restored bytes unknown when result auditing fails and reuses explicit host effect takeover', async () => {
  const f = await createFileRecoveryTestFixture()
  const h = host(f)
  try {
    const path = join(f.root, 'report.txt')
    await writeFile(path, 'private original')
    await f.save(path, 'generated')
    const versionId = (await f.versions.list('alice')).entries[0].id
    const database = f.db()
    f.database({ ...database, commitLifeState: async (input, options) => {
      if (input.operationKey.startsWith('file-recovery-audit:') && input.operationKey.endsWith(':observed'))
        throw new Error('injected restore result audit unavailable')
      return database.commitLifeState(input, options)
    } })
    const preview = await h.control.preview('alice', versionId, 17)
    await expect(h.control.restore('alice', versionId, preview.token!, 17)).rejects.toThrow('result audit unavailable')
    expect(await readFile(path, 'utf8')).toBe('private original')
    const [entry] = (await h.control.list('alice')).entries
    expect(entry.state).toBe('restore-unknown')
    const effectId = entry.recoveryEffectIds[0]
    expect((await f.db().getLifeEffect(effectId))?.status).toBe('uncertain')
    expect(f.broker.snapshot()).toMatchObject([{ uncertain: true, effectId }])
    // Simulated legacy process inspection is a separate DI boundary. It never
    // turns actual restored bytes into an audited restoration success.
    h.native('running')
    expect(await h.control.nativeStopped('alice', effectId)).toBe(false)
    h.native('stopped')
    expect(await h.control.nativeStopped('alice', effectId)).toBe(true)
    expect(h.inspectNativeProcess).toHaveBeenCalledWith(expect.objectContaining({ pid: expect.any(Number), creationTimeTicks: expect.any(String) }))
    const takeover = createHostEffectControl({ database: f.databasePort, broker: f.broker, writerStopped: () => !h.control.isActive() })
    const confirmation = await takeover({ cardId: 'alice', effectId, action: 'preview' }, 17)
    if (confirmation.state !== 'preview')
      throw new Error('Missing explicit host takeover preview')
    expect(await takeover({ cardId: 'alice', effectId, action: 'takeover', token: confirmation.token, confirmedStopped: true }, 17)).toEqual({ state: 'host-taken-over' })
    expect((await f.db().getLifeEffect(effectId))?.receipt?.outcome).toBe('host-taken-over')
    expect((await f.db().getLifeIngress(`host-takeover-original:${confirmation.token}`))?.payload).toBeTruthy()
    expect((await h.control.list('alice')).entries[0].state).not.toBe('restored')
    expect((await f.versions.original(versionId, 'alice')).bytes).toEqual(Buffer.from('private original'))
    expect(f.broker.snapshot()).toEqual([])
  }
  finally { await h.control.dispose(); await f.close() }
}, 30000)

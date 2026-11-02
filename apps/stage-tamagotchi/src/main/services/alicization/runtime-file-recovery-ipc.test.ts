import type { IpcMainEvent } from 'electron'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { electronLifeFileRecovery } from '../../../shared/life-events'
import { setupAlicizationDb } from './db'
import { createAlicizationRuntimeCardScopeOrchestrator } from './runtime-card-scope-orchestrator'
import { registerLifeInvokeHandlers } from './runtime-invoke-handlers-life'

it('routes stop around its held restore scope, while validating the trusted sender and bounded command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'life-file-recovery-ipc-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const gate = Promise.withResolvers<void>()
  const started = Promise.withResolvers<void>()
  const handlers = new Map<unknown, (input: unknown, metadata: any) => Promise<unknown>>()
  const scope = createAlicizationRuntimeCardScopeOrchestrator({ scopeLifecycleQueueState: { queue: Promise.resolve() }, now: Date.now, getActiveCardId: () => 'alice', normalizeCardId: String, sanitizeText: String, appendRuntimeDebugLine: async () => {}, switchCardScopeInner: async () => {} })
  const effectId = 'file-restore:00000000-0000-4000-8000-000000000001'
  const command = vi.fn<NonNullable<Parameters<typeof registerLifeInvokeHandlers>[0]['fileRecoveryCommand']>>(async (input, surfaceId) => {
    expect(surfaceId).toBe(51)
    if (input.cardId !== 'alice')
      throw new Error('current card')
    if (input.action === 'restore') {
      started.resolve()
      await gate.promise
      return { kind: 'restore', state: 'not-restored', effectId }
    }
    if (input.action === 'stop') {
      gate.resolve()
      return { kind: 'stop', state: 'stopping' }
    }
    throw new Error('Unexpected fixture command')
  })
  registerLifeInvokeHandlers({ fileRecoveryCommand: command, register: (event, handler) => handlers.set(event, handler), withCardScope: scope.withCardScope, read: db.readLifeState, readClosure: db.readLifeClosure, commit: db.commitLifeState, getIngress: db.getLifeIngress, getUserInput: db.getLifeUserInput, copyText: () => {}, readSetting: db.getMetaValue, hasPublishedTurn: db.hasPublishedLifeTurn, getSurface: db.getLifeSurface, surfaceVisible: () => true, rescheduleTimer: async () => {}, cancelExecution: () => {} })
  const metadata = (url = 'file:///app/index.html#/settings/life') => ({ raw: { ipcMainEvent: { sender: { id: 51, isDestroyed: () => false, getURL: () => url } } as unknown as IpcMainEvent } })
  const invoke = handlers.get(electronLifeFileRecovery)!
  let restoration: Promise<unknown> | undefined
  try {
    const stop = { cardId: 'alice', action: 'stop', effectId }
    await expect(invoke(stop, metadata('https://outside.invalid/'))).rejects.toThrow('trusted')
    await expect(invoke({ ...stop, path: 'untrusted' }, metadata())).rejects.toThrow()
    await expect(invoke({ ...stop, effectId: 'some-other-operation' }, metadata())).rejects.toThrow()
    expect(command).not.toHaveBeenCalled()
    restoration = invoke({ cardId: 'alice', action: 'restore', versionId: 'a'.repeat(64), token: '00000000-0000-4000-8000-000000000001', confirmed: true }, metadata())
    await started.promise
    await expect(invoke({ ...stop, cardId: 'bob' }, metadata())).rejects.toThrow('current card')
    await expect(invoke(stop, metadata())).resolves.toEqual({ kind: 'stop', state: 'stopping' })
    await expect(restoration).resolves.toMatchObject({ kind: 'restore', state: 'not-restored' })
  }
  finally { gate.resolve(); await restoration; await db.close(); await rm(root, { recursive: true, force: true }) }
})

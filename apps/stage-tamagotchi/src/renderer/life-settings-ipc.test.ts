import type { InvokeEventa } from '@moeru/eventa'
import type { IpcMain } from 'electron'

import { createHash, randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext as createMainContext } from '@moeru/eventa/adapters/electron/main'
import { createContext as createRendererContext } from '@moeru/eventa/adapters/electron/renderer'
import { afterEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useElectronEventaInvoke } from '../../../../packages/electron-vueuse/src/composables/use-electron-eventa-context'
import { setupAlicizationDb } from '../main/services/alicization/db'
import { recordBrowserDownloadReservation } from '../main/services/alicization/execution/browser-download-reservations'
import { readBrowserDownloadQuarantines } from '../main/services/alicization/execution/browser-download-resource-recovery'
import { createHostDownloadControl } from '../main/services/alicization/execution/host-download-control'
import { createHostEffectControl } from '../main/services/alicization/execution/host-effect-control'
import { createExecutionResourceBroker } from '../main/services/alicization/execution/resource-broker'
import { registerLifeInvokeHandlers } from '../main/services/alicization/runtime-invoke-handlers-life'
import { createDefaultLifeOutreachPolicy } from '../shared/life-contracts'
import { electronLifeExecutionRecovery, electronLifeOutreachPolicy, electronLifeView } from '../shared/life-events'

describe('life settings over the actual Eventa Electron adapters', () => {
  const cleanups: Array<() => Promise<void>> = []
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0))
      await cleanup()
  })

  async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'life-settings-wire-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    cleanups.push(async () => {
      await db.close()
      await rm(root, { recursive: true, force: true })
    })
    const main = new EventEmitter()
    const renderer = new EventEmitter()
    const sender = Object.assign(new EventEmitter(), {
      id: 10,
      isDestroyed: () => false,
      getURL: () => 'file:///app/renderer/index.html#/settings/life',
      send: (channel: string, payload: unknown) => renderer.emit(channel, {}, structuredClone(payload)),
    })
    Object.assign(renderer, { send: (channel: string, payload: unknown) => main.emit(channel, { sender }, structuredClone(payload)) })
    const server = createMainContext(main as IpcMain)
    const client = createRendererContext(renderer as unknown as Parameters<typeof createRendererContext>[0])
    const broker = createExecutionResourceBroker()
    const effects = createHostEffectControl({ database: () => db, broker, writerStopped: () => true })
    const downloads = createHostDownloadControl({ database: () => db, broker, writerStopped: () => true })
    registerLifeInvokeHandlers({
      recoverEffect: (input, surfaceId) => input.action === 'list-downloads' || input.effectId.startsWith('browser-download:') ? downloads(input, surfaceId) : effects(input, surfaceId),
      register: (event, handler) => { defineInvokeHandler(server.context, event as InvokeEventa<unknown, unknown>, (payload, metadata) => handler(payload, metadata ?? {})) },
      withCardScope: async (cardId, task) => {
        if (cardId !== 'alice')
          throw new Error('Wrong card')
        return task()
      },
      read: db.readLifeState,
      readClosure: db.readLifeClosure,
      getIngress: db.getLifeIngress,
      getUserInput: db.getLifeUserInput,
      copyText: () => {},
      commit: db.commitLifeState,
      readSetting: db.getMetaValue,
      hasPublishedTurn: db.hasPublishedLifeTurn,
      getSurface: db.getLifeSurface,
      surfaceVisible: () => true,
      rescheduleTimer: async () => {},
      cancelExecution: () => {},
    })
    return { root, db, broker, read: useElectronEventaInvoke(electronLifeView, client.context), save: useElectronEventaInvoke(electronLifeOutreachPolicy, client.context), recover: useElectronEventaInvoke(electronLifeExecutionRecovery, client.context) }
  }

  it('lists and governs native download ownership through actual clone boundaries without accepting a renderer-supplied path or surface', async () => {
    const { root, db, broker, recover } = await fixture()
    const downloadRoot = join(root, 'downloads')
    const directory = join(downloadRoot, createHash('sha256').update('alice').digest('hex'))
    await mkdir(directory, { recursive: true })
    const id = randomUUID()
    const at = Date.now()
    const reservation = { version: 2 as const, runtimeId: 'old-runtime', id, cardId: 'alice', actionId: 'old-click', observationId: null, directory: join(await realpath(directory), id), requestedUrl: 'https://example.invalid/report', requestHash: 'a'.repeat(64), origin: { kind: 'host-interface' as const }, at, expiresAt: at + 15000 }
    await recordBrowserDownloadReservation(db, reservation, { root: downloadRoot, allowHostInterface: true })
    await mkdir(reservation.directory)
    const path = join(reservation.directory, 'partial.txt')
    await writeFile(path, 'actual partial bytes')
    for (const owner of await readBrowserDownloadQuarantines(db, 'new-runtime'))
      broker.restoreQuarantine({ cardId: 'alice', ...owner })
    const input = { cardId: 'alice', effectId: `browser-download:${id}` }
    expect(await recover({ cardId: 'alice', action: 'list-downloads' })).toEqual({ state: 'download-list', items: [{ effectId: input.effectId, directory: reservation.directory }], next: null })
    await expect(recover({ cardId: 'other-card', action: 'list-downloads' })).rejects.toThrow()
    await expect(recover({ ...input, action: 'preview', path } as never)).rejects.toThrow()
    const preview = await recover({ ...input, action: 'preview' })
    if (preview.state !== 'preview')
      throw new Error('Missing actual native resource confirmation')
    await expect(recover({ ...input, action: 'takeover', token: preview.token, confirmedStopped: true, surfaceId: 10 } as never)).rejects.toThrow()
    expect(await recover({ ...input, action: 'takeover', token: preview.token, confirmedStopped: true })).toEqual({ state: 'host-taken-over' })
    expect(await readFile(path, 'utf8')).toBe('actual partial bytes')
    expect(await readBrowserDownloadQuarantines(db, 'next-runtime')).toEqual([])
    expect((await db.getLifeIngress(`browser-download-resource-release:${id}`))?.payload.independent).toBe(false)
  })

  it('binds recovery confirmation to the main-owned surface over the real clone boundary', async () => {
    const { db, recover } = await fixture()
    await db.commitLifeState({ cardId: 'alice', operationKey: 'legacy-recovery', changes: [], mutations: [
      { type: 'effect-prepare', effect: { id: 'old-effect', operationKey: 'old-effect', kind: 'execute', turnId: null, actionId: 'old-action', generation: 0, payload: { capabilityId: 'external.unknown' } } },
      { type: 'effect-transition', id: 'old-effect', expected: 'prepared', status: 'claimed' },
      { type: 'effect-transition', id: 'old-effect', expected: 'claimed', status: 'dispatched' },
      { type: 'effect-transition', id: 'old-effect', expected: 'dispatched', status: 'uncertain', receipt: { outcome: 'unknown' } },
    ] })
    const input = { cardId: 'alice', effectId: 'old-effect' }
    const preview = await recover({ ...input, action: 'preview' })
    expect(preview.state).toBe('preview')
    if (preview.state !== 'preview')
      throw new Error('Missing confirmation')
    await expect(recover({ ...input, action: 'takeover', token: preview.token, confirmedStopped: false } as never)).rejects.toThrow()
    await expect(recover({ ...input, action: 'takeover', token: preview.token, confirmedStopped: true, surfaceId: 10 } as never)).rejects.toThrow()
    await expect(recover({ ...input, action: 'takeover', token: preview.token, confirmedStopped: true })).resolves.toEqual({ state: 'host-taken-over' })
    expect((await db.getLifeEffect(input.effectId))?.receipt).toMatchObject({ output: { sideEffectState: 'unknown' }, hostTakeover: { independent: false } })
  })

  it('persists a reactive form through real clone boundaries and reports stale saves', async () => {
    const { read, save } = await fixture()
    await expect(read({ cardId: 'alice' })).resolves.toMatchObject({ cardId: 'alice' })
    const original = ref(createDefaultLifeOutreachPolicy())
    const policy = ref({ ...original.value, maximumPerDay: 2 })
    await save({ cardId: 'alice', operationId: 'save', policy: { ...policy.value }, expectedPolicy: { ...original.value } })
    const reopened = await read({ cardId: 'alice' })
    expect(JSON.parse(reopened.values['life:initiative']).outreachPolicy.maximumPerDay).toBe(2)
    await expect(save({ cardId: 'alice', operationId: 'stale', policy: { ...policy.value, maximumPerDay: 4 }, expectedPolicy: { ...original.value } })).rejects.toBeDefined()
    expect(JSON.parse((await read({ cardId: 'alice' })).values['life:initiative']).outreachPolicy.maximumPerDay).toBe(2)
  })

  it('rejects uncloneable form data immediately instead of leaving an unresolved invoke', async () => {
    const { save, read } = await fixture()
    const policy = ref(createDefaultLifeOutreachPolicy())
    await expect(save({ cardId: 'alice', operationId: 'invalid', policy: { ...policy.value }, expectedPolicy: policy.value })).rejects.toThrow(/clone/i)
    expect((await read({ cardId: 'alice' })).values['life:initiative']).toBeUndefined()
  })

  it('forwards an already aborted request without writing its mutation', async () => {
    const { save, read } = await fixture()
    const policy = createDefaultLifeOutreachPolicy()
    const controller = new AbortController()
    controller.abort()
    await expect(save({ cardId: 'alice', operationId: 'aborted', policy, expectedPolicy: policy }, { signal: controller.signal })).rejects.toBeDefined()
    expect((await read({ cardId: 'alice' })).values['life:initiative']).toBeUndefined()
  })
})

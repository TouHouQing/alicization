import type { InvokeEventa } from '@moeru/eventa'
import type { IpcMain } from 'electron'

import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext as createMainContext } from '@moeru/eventa/adapters/electron/main'
import { createContext as createRendererContext } from '@moeru/eventa/adapters/electron/renderer'
import { afterEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useElectronEventaInvoke } from '../../../../packages/electron-vueuse/src/composables/use-electron-eventa-context'
import { setupAlicizationDb } from '../main/services/alicization/db'
import { registerLifeInvokeHandlers } from '../main/services/alicization/runtime-invoke-handlers-life'
import { createDefaultLifeOutreachPolicy } from '../shared/life-contracts'
import { electronLifeOutreachPolicy, electronLifeView } from '../shared/life-events'

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
    registerLifeInvokeHandlers({
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
    return { db, read: useElectronEventaInvoke(electronLifeView, client.context), save: useElectronEventaInvoke(electronLifeOutreachPolicy, client.context) }
  }

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

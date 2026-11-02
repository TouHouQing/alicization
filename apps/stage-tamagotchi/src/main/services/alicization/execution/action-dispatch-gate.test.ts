import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { assertActionDispatchCurrent, withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'

describe('main-owned adapter dispatch permission', () => {
  it.each(['path', 'query', 'maxResults', 'regex'] as const)('refuses mutation of the original approved read object: %s', async (field) => {
    const directory = await mkdtemp(join(tmpdir(), 'dispatch-read-source-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now, resourceBroker: createExecutionResourceBroker() })
    const parameters = { path: directory, query: 'needle', maxResults: 25, regex: false }
    const signal = new AbortController().signal
    try {
      await life.admit({ cardId: 'alice', turnId: 'lookup', conversationId: 'qa', messages: [{ role: 'user', content: 'Read only the accepted search.' }] }, signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'lookup', actionId: 'search', capabilityId: 'tool.filesystem_search_files', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_search_files')!.effects }, signal)
      await action.authorizeDispatch(parameters)
      Object.assign(parameters, { [field]: field === 'maxResults' ? 100 : field === 'regex' ? true : field === 'path' ? join(directory, 'other') : 'different' })
      let dispatched = false
      await expect(withActionDispatch(action.assertDispatchCurrent, async () => {
        dispatched = true
      })).rejects.toThrow('input changed')
      expect(dispatched).toBe(false)
    }
    finally {
      await db.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('rechecks current source, exact input, one-time consumption, cancellation and resource expiry at the adapter boundary', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-dispatch-gate-'))
    const db = await setupAlicizationDb(directory, { cardId: 'alice' })
    let now = 1000
    const broker = createExecutionResourceBroker(() => now)
    const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: () => now, resourceBroker: broker })
    const effects = createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects
    const signal = new AbortController()
    try {
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'qa', messages: [{ role: 'user', content: 'save report' }] }, signal.signal)
      const prepare = (actionId: string) => life.beforeAction({ cardId: 'alice', turnId: 'request', actionId, capabilityId: 'tool.filesystem_write_file', parameters: { path: join(directory, `${actionId}.txt`), content: 'accepted' }, effectContract: effects }, signal.signal)
      const normal = await prepare('normal')
      await normal.authorizeDispatch({ content: 'accepted', path: join(directory, 'normal.txt') })
      expect(await normal.assertDispatchCurrent()).toMatchObject({ expiresAt: 61000 })
      await withActionDispatch(normal.assertDispatchCurrent, async () => {
        await expect(assertActionDispatchCurrent(true, { capabilityId: 'tool.desktop_press_keys', parameters: { shortcut: 'Ctrl+S' } })).rejects.toThrow('capability changed')
      })
      const keyParameters = { shortcut: 'Ctrl+S', repeat: 2 }
      const keyAction = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'native-binding', capabilityId: 'tool.desktop_press_keys', parameters: keyParameters, effectContract: createCanonicalToolRegistry({ platform: 'win32', windowsKeyboardReady: true, windowsKeyboardGoverned: true }).resolveActive('tool.desktop_press_keys')!.effects }, signal.signal)
      await keyAction.authorizeDispatch(keyParameters)
      await withActionDispatch(keyAction.assertDispatchCurrent, async () => {
        await expect(assertActionDispatchCurrent(true, { capabilityId: 'tool.desktop_press_keys', parameters: { ...keyParameters, repeat: 3 } })).rejects.toThrow('input changed')
        await expect(assertActionDispatchCurrent(true, { capabilityId: 'tool.desktop_press_keys', parameters: keyParameters })).resolves.toMatchObject({ capabilityId: 'tool.desktop_press_keys', effectId: keyAction.id })
      })
      expect(await normal.assertDispatchCurrent()).toMatchObject({ expiresAt: 61000 })
      await expect(normal.authorizeDispatch({ content: 'accepted', path: join(directory, 'normal.txt') })).rejects.toThrow('already consumed')
      const changed = await prepare('changed')
      await expect(changed.authorizeDispatch({ path: join(directory, 'changed.txt'), content: 'different' })).rejects.toThrow('input changed')
      const stale = await prepare('stale')
      await stale.authorizeDispatch({ path: join(directory, 'stale.txt'), content: 'accepted' })
      now += 60001
      await expect(stale.assertDispatchCurrent()).rejects.toThrow('lease is stale')
      const withdrawn = await prepare('withdrawn')
      await withdrawn.authorizeDispatch({ path: join(directory, 'withdrawn.txt'), content: 'accepted' })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-source', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:request', status: 'held' }] })
      await expect(withdrawn.assertDispatchCurrent()).rejects.toThrow('ended or withdrawn')
      await life.admit({ cardId: 'alice', turnId: 'cancelled', conversationId: 'qa', messages: [{ role: 'user', content: 'save another report' }] }, signal.signal)
      const cancelled = await life.beforeAction({ cardId: 'alice', turnId: 'cancelled', actionId: 'cancel', capabilityId: 'tool.filesystem_write_file', parameters: { path: join(directory, 'cancel.txt'), content: 'accepted' }, effectContract: effects }, signal.signal)
      signal.abort(new Error('host-stop'))
      await expect(cancelled.authorizeDispatch({ path: join(directory, 'cancel.txt'), content: 'accepted' })).rejects.toThrow('host-stop')
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})

import { link, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createHostExecutionRecovery } from './host-recovery'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'

describe('persisted resource identity at dispatch and restart', () => {
  it.each(['before-dispatch', 'after-interruption'])('refuses redirected directory identity %s even when current bytes match', async (when) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-resource-snapshot-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const signal = new AbortController().signal
    try {
      const original = join(root, 'original')
      const replacement = join(root, 'replacement')
      const alias = join(root, 'directory-link')
      await mkdir(original)
      await mkdir(replacement)
      await writeFile(join(original, 'report.txt'), 'original host content')
      await writeFile(join(replacement, 'report.txt'), 'accepted bytes')
      await link(join(original, 'report.txt'), join(root, 'original-hard-link.txt'))
      await symlink(original, alias, platform === 'win32' ? 'junction' : 'dir')
      const input = { path: join(alias, 'report.txt'), content: 'accepted bytes' }
      const life = () => createLifeTurnRuntime({ resourceBroker: broker, read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life().admit({ cardId: 'alice', turnId: 'host-request', conversationId: 'chat', messages: [{ role: 'user', content: '保存报告' }] }, signal)
      const action = await life().beforeAction({ cardId: 'alice', turnId: 'host-request', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: input, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
      const snapshot = (await db.getLifeEffect(action.id))!.payload.resourceSnapshot
      expect(snapshot).toMatchObject({ version: 1 })
      if (when === 'after-interruption') {
        await action.authorizeDispatch(input)
        await writeFile(input.path, input.content)
        await life().afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { effectMayHaveOccurred: true }, interrupted: true })
      }
      await unlink(alias)
      await symlink(replacement, alias, platform === 'win32' ? 'junction' : 'dir')
      if (when === 'before-dispatch') {
        await expect(action.authorizeDispatch(input)).rejects.toThrow('resource target changed')
        expect(await readFile(join(original, 'report.txt'), 'utf8')).toBe('original host content')
      }
      else {
        await db.close()
        db = await setupAlicizationDb(root, { cardId: 'alice' })
        const restarted = createExecutionResourceBroker()
        await createHostExecutionRecovery({ userDataPath: root, broker: restarted, readCardEffects: () => db.readPendingLifeExecutionEffects() }).restore()
        const effect = (await db.getLifeEffect(action.id))!
        expect(effect.payload.resourceSnapshot).toEqual(snapshot)
        expect(await recoverExecutionEffect({ database: db, broker: restarted, effect, writerStopped: () => true })).toBeNull()
        for (const path of [join(original, 'report.txt'), join(replacement, 'report.txt'), join(root, 'original-hard-link.txt')]) {
          const resources = await executionFileResources(path)
          expect(() => restarted.acquire({ owner: 'another-card', resources })).toThrow('reconciliation')
        }
        expect((await db.getLifeEffect(action.id))!.status).toBe('uncertain')
      }
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps legacy pending writes global and unknown instead of reconstructing an original target from today\'s path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-legacy-resource-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'report.txt')
      await writeFile(path, 'matching bytes')
      await db.commitLifeState({ cardId: 'alice', operationKey: 'legacy', changes: [], mutations: [
        { type: 'effect-prepare', effect: { id: 'legacy', operationKey: 'legacy', kind: 'execute', turnId: null, actionId: null, generation: 0, payload: { capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'matching bytes' } } } },
        { type: 'effect-transition', id: 'legacy', expected: 'prepared', status: 'claimed' },
        { type: 'effect-transition', id: 'legacy', expected: 'claimed', status: 'dispatched' },
        { type: 'effect-transition', id: 'legacy', expected: 'dispatched', status: 'uncertain' },
      ] })
      const broker = createExecutionResourceBroker()
      await createHostExecutionRecovery({ userDataPath: root, broker, readCardEffects: () => db.readPendingLifeExecutionEffects() }).restore()
      expect(broker.snapshot()[0].resources).toEqual(['host:execution'])
      expect(await recoverExecutionEffect({ database: db, broker, effect: (await db.getLifeEffect('legacy'))!, writerStopped: () => true })).toBeNull()
      expect(() => broker.acquire({ owner: 'another-card', resources: ['file-path:unrelated'] })).toThrow('reconciliation')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

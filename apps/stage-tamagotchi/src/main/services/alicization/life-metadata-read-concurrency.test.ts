import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createExecutionResourceBroker } from './execution/resource-broker'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

for (const capabilityId of ['tool.life_list_learned_procedures', 'tool.life_list_execution_verifiers']) {
  for (const uncertain of [false, true]) {
    it(`reads ${capabilityId} during ${uncertain ? 'quarantined' : 'active'} background ownership while preserving computer fences`, async () => {
      const root = await mkdtemp(join(tmpdir(), 'alicization-metadata-read-'))
      const database = await setupAlicizationDb(root, { cardId: 'alice' })
      const broker = createExecutionResourceBroker()
      const background = broker.acquire({ owner: 'background-owned-work', resources: ['host:execution'], coordinationOnly: true })
      if (uncertain)
        broker.settle(background, { stopped: false, uncertain: true })
      const held = broker.snapshot()
      const registry = createCanonicalToolRegistry()
      const life = createLifeTurnRuntime({ resourceBroker: broker, read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      try {
        await life.admit({ cardId: 'alice', turnId: 'foreground-query', conversationId: 'primary', messages: [{ role: 'user', content: 'Show the methods I can currently use.' }] }, signal)
        const action = await life.beforeAction({ cardId: 'alice', turnId: 'foreground-query', actionId: 'list', capabilityId, parameters: {}, effectContract: registry.resolveActive(capabilityId)!.effects }, signal)
        await action.authorizeDispatch({})
        await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: [], interrupted: false })
        expect((await database.getLifeEffect(action.id))?.status).toBe('settled')
        expect(broker.snapshot()).toEqual(held)
        for (const [id, parameters] of [
          ['tool.filesystem_read_file', { path: join(root, 'source.txt') }],
          ['tool.filesystem_write_file', { path: join(root, 'new-file.txt'), content: 'Unapproved competing write' }],
          ['tool.browser_read_page', { format: 'text', maxChars: 2000 }],
        ] as const) {
          await expect(life.beforeAction({ cardId: 'alice', turnId: 'foreground-query', actionId: id, capabilityId: id, parameters, effectContract: registry.resolveActive(id)!.effects }, signal)).rejects.toMatchObject({ code: 'EXECUTION_RESOURCE_BUSY' })
          expect(await database.getLifeEffect(`action:foreground-query:${id}`)).toBeNull()
        }
        await expect(life.beforeAction({ cardId: 'alice', turnId: 'foreground-query', actionId: 'incorrect-effect-contract', capabilityId, parameters: {}, effectContract: registry.resolveActive('tool.filesystem_write_file')!.effects }, signal)).rejects.toMatchObject({ code: 'EXECUTION_RESOURCE_BUSY' })
        expect(broker.snapshot()).toEqual(held)
      }
      finally {
        broker.settle(background, { stopped: true, uncertain: false })
        await database.close()
        await rm(root, { recursive: true, force: true })
      }
    })
  }
}

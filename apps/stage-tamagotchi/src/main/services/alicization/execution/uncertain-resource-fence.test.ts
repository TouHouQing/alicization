import { link, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'

describe('durable resource uncertainty across requests', () => {
  it('rejects a new turn and a hard-link alias after restart while allowing independent observations', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'alicization-uncertain-resource-'))
    let db = await setupAlicizationDb(directory, { cardId: 'alice' })
    const life = () => createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now })
    const registry = createCanonicalToolRegistry()
    const signal = new AbortController().signal
    const path = join(directory, 'report.txt')
    const alias = join(directory, 'report-alias.txt')
    try {
      await writeFile(path, 'before')
      await link(path, alias)
      await life().admit({ cardId: 'alice', turnId: 'old-request', conversationId: 'qa', messages: [{ role: 'user', content: 'write report' }] }, signal)
      const first = await life().beforeAction({ cardId: 'alice', turnId: 'old-request', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: 'after' }, effectContract: registry.resolveActive('tool.filesystem_write_file')!.effects }, signal)
      await writeFile(path, 'after')
      await db.close()
      db = await setupAlicizationDb(directory, { cardId: 'alice' })
      await life().recover('alice')
      await life().admit({ cardId: 'alice', turnId: 'new-request', conversationId: 'qa', messages: [{ role: 'user', content: 'write again' }] }, signal)
      await expect(life().beforeAction({ cardId: 'alice', turnId: 'new-request', actionId: 'different-id', capabilityId: 'tool.filesystem_write_file', parameters: { path: alias, content: 'different bytes' }, effectContract: registry.resolveActive('tool.filesystem_write_file')!.effects }, signal)).rejects.toThrow('uncertain result on this resource')
      expect((await db.getLifeEffect(first.id))?.status).toBe('uncertain')
      const observed = await life().beforeAction({ cardId: 'alice', turnId: 'new-request', actionId: 'read', capabilityId: 'tool.filesystem_read_file', parameters: { path }, effectContract: registry.resolveActive('tool.filesystem_read_file')!.effects }, signal)
      expect(observed.cached).toBeNull()
      const unrelated = await life().beforeAction({ cardId: 'alice', turnId: 'new-request', actionId: 'unrelated', capabilityId: 'tool.filesystem_write_file', parameters: { path: join(directory, 'another.txt'), content: 'independent' }, effectContract: registry.resolveActive('tool.filesystem_write_file')!.effects }, signal)
      expect(unrelated.cached).toBeNull()
    }
    finally { await db.close(); await rm(directory, { recursive: true, force: true }) }
  })
})

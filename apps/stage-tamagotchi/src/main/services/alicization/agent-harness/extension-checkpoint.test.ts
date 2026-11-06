import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { openExtensionCheckpoint } from './extension-checkpoint'

it('recovers the exact pre-execution context and commits result plus entries once across restarts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-extension-checkpoint-'))
  let database = await setupAlicizationDb(root, { cardId: 'alice' })
  const binding = { cardId: 'alice', turnId: 'turn', actionId: 'action', conversationId: 'session', capabilityId: 'extension.sample.sum', extensionId: 'sample', extensionVersion: 'a'.repeat(64), callId: 'call', parametersHash: 'b'.repeat(64) }
  try {
    const prepared = await openExtensionCheckpoint(database, binding, async () => ({ arguments: { a: 7 }, entries: [] }))
    expect(prepared.completed).toBeUndefined()
    await database.close()
    database = await setupAlicizationDb(root, { cardId: 'alice' })
    const prepareAgain = vi.fn(async () => {
      throw new Error('Must not rebuild an already owned invocation context')
    })
    const restored = await openExtensionCheckpoint(database, binding, prepareAgain)
    expect(restored.input).toEqual({ arguments: { a: 7 }, entries: [] })
    expect(prepareAgain).not.toHaveBeenCalled()
    await expect(restored.commit([{ customType: 'oversized', data: 'x'.repeat(8001) }], { result: 7 })).rejects.toThrow('budget')
    expect((await database.readRecentAgentEntries('agent-extension-entry:sample', 32)).entries).toEqual([])
    const entries = [{ customType: 'used', data: { result: 7 } }]
    await restored.commit(entries, { result: 7 })
    await restored.commit(entries, { result: 7 })
    expect((await database.readRecentAgentEntries('agent-extension-entry:sample', 32)).entries).toHaveLength(1)
    const completed = await openExtensionCheckpoint(database, binding, prepareAgain)
    expect(completed.completed).toEqual({ result: 7 })
    await expect(openExtensionCheckpoint(database, { ...binding, parametersHash: 'c'.repeat(64) }, prepareAgain)).rejects.toThrow('identity changed')
    await expect(openExtensionCheckpoint(database, { ...binding, extensionVersion: 'd'.repeat(64) }, prepareAgain)).rejects.toThrow('identity changed')
    await expect(openExtensionCheckpoint(database, { ...binding, cardId: 'bob' }, prepareAgain)).rejects.toThrow('life owner')
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

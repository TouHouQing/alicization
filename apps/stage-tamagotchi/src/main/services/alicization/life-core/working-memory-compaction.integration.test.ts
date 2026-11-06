import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'

it('atomically fences a semantic checkpoint against new dialogue and persona boundaries in SQLite', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-context-cas-'))
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  try {
    const source = createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'home', now: 100 })
    await database.upsertWorkingMemoryCheckpoint(source)
    const compacted = { ...source, audit: { ...source.audit, notes: ['semantic compaction committed'] } }
    expect(await database.replaceWorkingMemoryCheckpoint(source, compacted)).toBe(true)
    expect(await database.replaceWorkingMemoryCheckpoint(source, { ...source, audit: { ...source.audit, notes: ['late worker'] } })).toBe(false)
    const newer = { ...compacted, updatedAt: 101 }
    await database.upsertWorkingMemoryCheckpoint(newer)
    expect(await database.replaceWorkingMemoryCheckpoint(compacted, source)).toBe(false)
    expect((await database.getWorkingMemoryCheckpoint('alice', 'home'))?.updatedAt).toBe(101)
    await expect(database.replaceWorkingMemoryCheckpoint(newer, { ...newer, cardId: 'bob' })).rejects.toThrow('boundary')
    const withSource = { ...newer, recentRawTurns: [normalizeWorkingMemoryTurn({ turnId: 'old:user', role: 'user', text: '需要遗忘的旧经历', createdAt: 10, source: 'conversation-turn', visibility: 'user-visible', importance: 0.9 })] }
    await database.upsertWorkingMemoryCheckpoint(withSource)
    expect(await database.workingMemorySourcesCurrent(withSource)).toBe(true)
    await database.commitLifeState({ cardId: 'alice', operationKey: 'forget-old-context-source', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'life_ingress', id: 'user:old', version: '*' }, mode: 'forget', reason: '用户要求遗忘' }] })
    expect(await database.workingMemorySourcesCurrent(withSource)).toBe(false)
    expect(await database.replaceWorkingMemoryCheckpoint(withSource, { ...withSource, audit: { ...withSource.audit, notes: ['late semantic result'] } })).toBe(false)
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

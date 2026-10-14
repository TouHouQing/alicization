import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'

describe('grounded identity aliases through real memory ingestion', () => {
  it('resolves an explicitly grounded alias, keeps homonyms ambiguous, and withdraws derived facts with the alias source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-entity-alias-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'Nick', predicate: 'interest', object: '摄影', confidence: 0.95 }], 'rule')
      const original = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      expect(original.subject).toEqual({ kind: 'unresolved-name', name: 'Nick' })
      await db.upsertMemoryFacts([{ subject: '张三', predicate: 'alias', object: 'Nick', confidence: 0.95 }], 'rule')
      const source = (await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.predicate === 'alias')!
      const evidence = { cardId: 'alice', kind: 'memory_facts', id: source.factId, version: String(source.version) }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'declare-identity', changes: [], mutations: [{ type: 'entity-register', entity: { id: 'person:photographer', kind: 'person', name: '张三', discriminators: { relationship: 'friend' }, aliases: [{ name: 'Nick', scope: 'card', evidence }] } }] })
      await db.upsertMemoryFacts([{ subject: 'Nick', predicate: 'interest', object: '摄影', confidence: 0.95 }], 'rule')
      const resolved = (await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.factId === original.factId)!
      expect(resolved).toMatchObject({ version: 2, subject: { kind: 'entity', id: 'person:photographer' } })
      expect(resolved.evidence).toContainEqual(evidence)
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'wrong-person-evidence', changes: [], mutations: [{ type: 'entity-register', entity: { id: 'person:another-nick', kind: 'person', name: '王五', discriminators: { relationship: 'coworker' }, aliases: [{ name: 'Nick', scope: 'card', evidence }] } }] })).rejects.toThrow('this person')
      await db.upsertMemoryFacts([{ subject: '王五', predicate: 'alias', object: 'Nick', confidence: 0.95 }], 'rule')
      const secondSource = (await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.predicate === 'alias' && fact.factId !== source.factId)!
      const secondEvidence = { ...evidence, id: secondSource.factId, version: String(secondSource.version) }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'homonym', changes: [], mutations: [{ type: 'entity-register', entity: { id: 'person:another-nick', kind: 'person', name: '王五', discriminators: { relationship: 'coworker' }, aliases: [{ name: 'Nick', scope: 'card', evidence: secondEvidence }] } }] })
      await db.upsertMemoryFacts([{ subject: 'Nick', predicate: 'interest', object: '绘画', confidence: 0.95 }], 'rule')
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.value === '绘画')?.subject).toEqual({ kind: 'unresolved-name', name: 'Nick' })
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId] })
      const immediatelyVisible = await db.readLifeFactVersions({ cardId: 'alice' })
      const withdrawnVersions = await db.readLifeFactVersions({ cardId: 'alice', history: true })
      expect(immediatelyVisible.some(fact => fact.factId === resolved.factId), JSON.stringify(withdrawnVersions)).toBe(false)
      await expect(db.applyMemoryFactCorrections([{ targetFactId: resolved.factId, nextValidationStatus: 'validated' }])).rejects.toThrow('withdrawn')
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'reuse-withdrawn-alias', changes: [], mutations: [{ type: 'entity-register', entity: { id: 'person:stale', kind: 'person', name: 'Nick', discriminators: {}, aliases: [{ name: 'Nick', scope: 'card', evidence }] } }] })).rejects.toThrow('reported identity evidence')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('does not resolve an alias from another relationship scope or a fabricated evidence reference', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-entity-scope-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const entity = { id: 'person:work', kind: 'person' as const, name: '同事', discriminators: { relationship: 'work' }, aliases: [{ name: '小林', scope: 'work', evidence: { cardId: 'alice', kind: 'memory_facts', id: 'fabricated', version: '1' } }] }
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'fabricated', changes: [], mutations: [{ type: 'entity-register', entity }] })).rejects.toThrow('reported identity evidence')
      await db.upsertMemoryFacts([{ subject: '同事', predicate: 'alias', object: '小林', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      entity.aliases[0].evidence.id = fact.factId
      entity.aliases[0].evidence.version = String(fact.version)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'work-only', changes: [], mutations: [{ type: 'entity-register', entity }] })
      await db.upsertMemoryFacts([{ subject: '小林', predicate: 'interest', object: '音乐', confidence: 0.9 }], 'rule')
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.value === '音乐')?.subject).toEqual({ kind: 'unresolved-name', name: '小林' })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

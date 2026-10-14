import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { companionChoicePolicy } from './life-companion-choice'

describe('remembered relationship preferences change actual choices', () => {
  it('respects a work boundary across days and releases it after source withdrawal without preventing her own quiet activities', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-companion-choice-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const now = Date.now()
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'communication-preference', object: '写代码时请安静，不要打扰', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const choose = async (processName: string) => companionChoicePolicy(await db.readLifeFactVersions({ cardId: 'alice' }), 'alice', now + 86400_000, { processName })
      expect(await choose('Code.exe')).toMatchObject({ holdOrdinaryOutreach: true, permitSilentPersonalActivity: true, sourceEvidence: [{ id: fact.factId, version: String(fact.version) }] })
      expect(await choose('music.exe')).toMatchObject({ holdOrdinaryOutreach: false })
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await choose('Code.exe')).toMatchObject({ holdOrdinaryOutreach: true })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-space', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }, mode: 'forget', reason: 'host changed preference' }] })
      expect(await choose('Code.exe')).toMatchObject({ holdOrdinaryOutreach: false, sourceEvidence: [] })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

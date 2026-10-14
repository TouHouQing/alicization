import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { extractLifeFactValidity } from './life-fact-validity'
import { filterLifeRecallFacts } from './life-memory-query'

describe('fact effective time and recorded time', () => {
  it('parses only explicit effective wording and anchors tomorrow to the input date', () => {
    const base = new Date(2026, 9, 5, 23, 59).getTime()
    expect(extractLifeFactValidity(['从明天起，我更喜欢茶。'], base)?.validFrom).toBe(new Date(2026, 9, 6).getTime())
    expect(extractLifeFactValidity(['从2026年11月1日起，我更喜欢茶，到2026年11月3日为止。'], base)).toMatchObject({ validFrom: new Date(2026, 10, 1).getTime(), validTo: new Date(2026, 10, 4).getTime(), precision: 'day' })
    expect(extractLifeFactValidity(['2026年11月1日发生了一些事。'], base)).toBeUndefined()
    expect(extractLifeFactValidity(['从2026年2月30日起喜欢茶'], base)).toBeUndefined()
    expect(extractLifeFactValidity(['从今天起喜欢茶', '从明天起喜欢茶'], base)).toBeUndefined()
  })
  it('does not replace today with a future preference, preserves earlier knowledge, and recalls the valid future interval after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-validity-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 5, 12).getTime())
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '咖啡', confidence: 0.9 }], 'rule')
      const before = Date.now()
      clock.mockReturnValue(before + 1000)
      const validity = extractLifeFactValidity(['从2026年11月1日起，我更喜欢茶，到2026年11月3日为止。'], before)!
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '茶', confidence: 0.9, validity }], 'rule')
      const history = await db.readLifeFactVersions({ cardId: 'alice', history: true })
      const candidates = [...new Set(history.map(fact => fact.factId))].map(id => ({ id, source: 'memory_facts' }))
      const current = filterLifeRecallFacts(candidates, history, { historical: false, now: before + 1000 })
      expect(history.find(fact => fact.factId === current[0].id)?.value).toBe('咖啡')
      const tea = history.find(fact => fact.value === '茶')!
      expect(tea).toMatchObject({ validFrom: validity.validFrom, validTo: validity.validTo, recordedFrom: before + 1000 })
      await db.applyMemoryFactCorrections([{ targetFactId: tea.factId, nextValidationStatus: 'validated' }])
      const validated = (await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.factId === tea.factId)!
      expect(validated).toMatchObject({ validFrom: tea.validFrom, validTo: tea.validTo, evidence: tea.evidence })
      expect(filterLifeRecallFacts(candidates, await db.readLifeFactVersions({ cardId: 'alice', history: true }), { historical: false, now: before + 1000 }).some(item => item.id === tea.factId)).toBe(false)
      expect(filterLifeRecallFacts(candidates, history, { historical: true, now: Date.now(), recordedRange: { from: before, to: before + 1 } }).some(item => item.id === tea.factId)).toBe(false)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const future = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '2026年11月2日我实际喜欢喝咖啡还是茶？' })
      expect(future.evidence.map(item => item.candidate.id), JSON.stringify(future)).toContain(tea.factId)
      expect(future.evidence.some(item => item.candidate.summary.includes('咖啡'))).toBe(false)
      const after = filterLifeRecallFacts(candidates, await db.readLifeFactVersions({ cardId: 'alice', history: true }), { historical: false, now: new Date(2026, 10, 5).getTime() })
      expect(after.some(item => item.id === tea.factId)).toBe(false)
      expect(after).toHaveLength(1)
    }
    finally { await db.close(); clock.mockRestore(); await rm(root, { recursive: true, force: true }) }
  })
})

import { Buffer } from 'node:buffer'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { applyDesktopMemoryPromptBudget } from './desktop-memory-prompt-budget'
import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import { buildWorkingMemoryOwnerContext } from './life-core/working-memory-owner-context'
import { filterLifeRecallFacts } from './life-memory-query'
import { boundLifeRecallBundle } from './life-recall-budget'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { buildAlicizationMainChatMemoryContext } from './main-chat-memory-context'
import { buildAlicizationProviderRequestSnapshot } from './main-chat-stream-runner'
import { createAlicizationMemoryParticipant } from './turn-os/memory-participant'

describe('versioned memory and real ingestion', () => {
  it('restores a withdrawn current source as a fresh version without reviving its earlier responsibilities', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-source-restore-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const source = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [source.factId] })
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toHaveLength(0)
      await db.restoreMemoryWorkbenchTombstone({ cardId: 'alice', tombstoneId: `ltm-tombstone:alice:memory_facts:${source.factId}` })
      const [restored] = await db.readLifeFactVersions({ cardId: 'alice' })
      expect(restored).toMatchObject({ factId: source.factId, version: 2, lifecycle: 'active', value: '音乐' })
      expect(restored.evidence[0].kind).toBe('memory-restore')
      const history = await db.readLifeFactVersions({ cardId: 'alice', history: true })
      expect(history.find(item => item.version === 1)?.lifecycle).toBe('revoked')
      expect((await db.readLifeState()).ingress.find(item => item.source === 'human-memory-governance')?.payload).toMatchObject({ derivedActivitiesRemainWithdrawn: true })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('retrieves an earlier preference through the real query path and pins the actual historical version in the provider context', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-historical-recall-'))
    const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 8, 10, 12).getTime())
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '咖啡', confidence: 0.95 }], 'rule')
      const previous = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      clock.mockReturnValue(new Date(2026, 8, 20, 12).getTime())
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [previous.factId], mode: 'correction', reason: 'superseded-by-user-correction' })
      clock.mockReturnValue(new Date(2026, 9, 1, 12).getTime())
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '茶', confidence: 0.95 }], 'rule')
      clock.mockReturnValue(new Date(2026, 9, 4, 12).getTime())
      const historical = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '上个月我喜欢喝咖啡还是茶？' })
      expect(historical.evidence.map(item => item.candidate.id), JSON.stringify({ historical, versions: await db.readLifeFactVersions({ cardId: 'alice', history: true }) })).toContain(previous.factId)
      expect(historical.evidence.every(item => item.candidate.lifeFact?.perspective === 'historical')).toBe(true)
      expect(historical.evidence.some(item => item.candidate.summary.includes('茶'))).toBe(false)
      const current = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '现在我喜欢喝咖啡还是茶？' })
      expect(current.evidence.some(item => item.candidate.summary.includes('咖啡'))).toBe(false)
      const comparison = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '现在我喜欢什么？以前的偏好是什么？请分清现在和以前。', workingMemoryQueryHints: Array.from({ length: 50 }, (_, index) => `irrelevant-${index}`) })
      expect(comparison.evidence.find(item => item.candidate.summary.includes('咖啡'))?.candidate.lifeFact?.perspective).toBe('historical')
      expect(comparison.evidence.find(item => item.candidate.summary.includes('茶'))?.candidate.lifeFact?.perspective).toBe('current')
      const workingMemory = buildWorkingMemoryOwnerContext(createEmptyWorkingMemorySnapshot({ cardId: 'alice', sessionId: 'session', now: Date.now() }))
      const context = buildAlicizationMainChatMemoryContext({ workingMemory, longTermRecall: historical })
      const comparisonContext = buildAlicizationMainChatMemoryContext({ workingMemory, longTermRecall: comparison })
      const comparisonData = JSON.parse(comparisonContext.providerSystemBlock).data
      expect(comparisonData.longTermRecall.evidence.find((item: { summary: string }) => item.summary.includes('茶')).temporalScope.perspective).toBe('current')
      expect(comparisonData.temporalEvidenceRule).toContain('Current versioned facts take precedence')
      expect(comparisonData.temporalEvidenceRule).toContain('recorded roles')
      const bounded = applyDesktopMemoryPromptBudget([{ role: 'system', content: comparisonContext.providerSystemBlock }, { role: 'user', content: '现在我喜欢什么？以前的偏好是什么？' }], { totalTokens: 300, preserveCurrentRequest: true })
      expect(bounded.messages[0].content).toBe(comparisonContext.providerSystemBlock)
      expect(buildAlicizationProviderRequestSnapshot(bounded.messages).longTermRecall.evidenceIds).toEqual(comparisonContext.availableLongTermEvidenceIds)
      expect(bounded.report.sections.memory.beforeTokens).toBe(bounded.report.sections.memory.afterTokens)
      expect(() => applyDesktopMemoryPromptBudget([bounded.messages[0], bounded.messages[0]])).toThrow('exactly one authoritative context')
      const derived = { ...comparison.evidence[0], candidate: { ...comparison.evidence[0].candidate, id: 'derived-summary', kind: 'consolidation' as const, source: 'memory_consolidations', lifeFact: undefined } }
      const capacity = comparison.evidence.reduce((bytes, item) => bytes + Buffer.byteLength(JSON.stringify(item), 'utf8'), 0)
      const recallBudget = boundLifeRecallBundle({ ...comparison, evidence: [derived, ...comparison.evidence] }, capacity)
      expect(recallBudget.bundle.evidence.map(item => item.candidate.id)).toEqual(comparison.evidence.map(item => item.candidate.id))
      expect(recallBudget.budget.rejected).toContain('memory_consolidations:derived-summary')
      expect(context.longTermRecall?.evidence[0]).toMatchObject({ sourceVersion: String(previous.version), temporalScope: { perspective: 'historical' } })
      expect(JSON.parse(context.providerSystemBlock).data.longTermRecall.evidence[0].temporalScope).toMatchObject({ recordedFrom: previous.recordedFrom, validFrom: null })
      const events: unknown[] = []
      const participant = createAlicizationMemoryParticipant({ scope: { cardId: 'alice', turnId: 'historical', conversationId: 'session', userId: 'local-user' }, appendEvent: async (event) => { events.push(event.payload) } })
      await participant.recordLongTermRecall({ sessionId: 'session', status: 'recalled', confidence: historical.confidence, evidence: context.longTermRecall!.evidence })
      expect(JSON.stringify(events)).toContain('historical')
      expect(JSON.stringify(events)).toContain('sourceVersion')
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      await life.admit({ cardId: 'alice', turnId: 'historical', conversationId: 'session', messages: [{ role: 'user', content: '上个月喜欢什么' }] }, signal)
      await life.recordContextUse({ cardId: 'alice', turnId: 'historical', requestHash: 'actual-history-request', owners: (await db.readLifeState()).owners, evidenceIds: [previous.factId], evidenceRefs: [{ cardId: 'alice', kind: 'memory_facts', id: previous.factId, version: String(previous.version), usage: 'historical' }] }, signal)
      expect((await db.getLifeIngress('context:historical:actual-history-request'))?.payload.evidenceRefs).toEqual([{ cardId: 'alice', kind: 'memory_facts', id: previous.factId, version: String(previous.version), usage: 'historical' }])
      const future = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '2027年9月我喜欢喝咖啡还是茶？' })
      expect(future.evidence.filter(item => item.candidate.source === 'memory_facts')).toHaveLength(0)
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [previous.factId], reason: 'user-forget' })
      // A subsequent correction must never revive a true withdrawal.
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [previous.factId], mode: 'correction' })
      const forgotten = await db.retrieveLongTermMemoryEvidenceReadOnly({ cardId: 'alice', currentUserText: '上个月我喜欢喝咖啡还是茶？' })
      expect(forgotten.evidence.some(item => item.candidate.id === previous.factId)).toBe(false)
      await expect(life.recordContextUse({ cardId: 'alice', turnId: 'historical', requestHash: 'revoked-history-request', owners: (await db.readLifeState()).owners, evidenceIds: [previous.factId], evidenceRefs: [{ cardId: 'alice', kind: 'memory_facts', id: previous.factId, version: String(previous.version), usage: 'historical' }] }, signal)).rejects.toThrow()
    }
    finally { await db.close(); clock.mockRestore(); await rm(root, { recursive: true, force: true }) }
  })

  it('keeps old and current preferences with traceable sources and preserves multiple interests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-life-memory-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '咖啡', confidence: 0.9 }], 'rule')
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '茶', confidence: 0.9 }, { subject: 'user', predicate: 'likes', object: '摄影', confidence: 0.8 }, { subject: 'user', predicate: 'likes', object: '绘画', confidence: 0.8 }], 'rule')
      const versions = await db.readLifeFactVersions({ cardId: 'alice', history: true })
      const drink = versions.filter(item => item.predicate === 'preferred_drink')
      expect(drink).toHaveLength(2)
      expect(drink[0].value).toBe('茶')
      expect(drink[0].recordedTo).toBeNull()
      expect(drink[1].value).toBe('咖啡')
      expect(drink[1].recordedTo).not.toBeNull()
      expect(drink.every(item => item.validFrom === null && item.provenance === 'reported' && item.evidence[0].kind === 'memory-ingest')).toBe(true)
      expect(versions.filter(item => item.predicate === 'likes' && item.recordedTo === null)).toHaveLength(2)
      const candidates = drink.map(item => ({ id: item.factId, source: 'memory_facts' }))
      expect(filterLifeRecallFacts(candidates, versions, { historical: false, now: Date.now() }).map(item => item.id)).toEqual([drink[0].factId])
      expect(filterLifeRecallFacts(candidates, versions, { historical: true, now: Date.now() })).toHaveLength(2)
      await expect(db.readLifeFactVersions({ cardId: 'another' })).rejects.toThrow('card boundary')
      const before = (await db.readLifeState()).revision
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '茶', confidence: 0.95 }], 'rule')
      expect((await db.readLifeFactVersions({ cardId: 'alice', history: true })).filter(item => item.predicate === 'preferred_drink')).toHaveLength(2)
      expect((await db.readLifeState()).revision).toBeGreaterThan(before)
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      expect((await restarted.readLifeFactVersions({ cardId: 'alice' })).find(item => item.predicate === 'preferred_drink')?.value).toBe('茶')
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

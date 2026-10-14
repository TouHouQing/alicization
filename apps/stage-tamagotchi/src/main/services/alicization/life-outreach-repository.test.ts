import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { evaluateLifeOutreach } from './life-outreach-repository'

const policy = { maximumPerDay: 3, minimumIntervalMinutes: 120, quietStartHour: 22, quietEndHour: 8, quietEnabled: true, timezone: 'UTC' }

describe('bounded ordinary initiative', () => {
  it('holds quiet hours, repeated evidence, cooldown and a used daily budget without penalizing relationship trust', () => {
    const noon = Date.UTC(2026, 9, 4, 12)
    expect(evaluateLifeOutreach({ policy, now: Date.UTC(2026, 9, 4, 23), evidenceKey: 'fresh' }).reason).toBe('quiet-hours')
    expect(evaluateLifeOutreach({ policy, now: noon, evidenceKey: 'fresh', lastAt: noon - 60_000 }).reason).toBe('outreach-cooldown')
    expect(evaluateLifeOutreach({ policy, now: noon, evidenceKey: 'seen', recentEvidence: ['seen'] }).reason).toBe('outreach-no-new-evidence')
    expect(evaluateLifeOutreach({ policy, now: noon, evidenceKey: 'fresh', dayKey: '2026-10-04', count: 3 }).reason).toBe('daily-outreach-budget')
  })
  it('reserves publication atomically and persists duplicate evidence across restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-outreach-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'outreach-policy', changes: [], mutations: [{ type: 'outreach-policy', policy: { ...policy, quietEnabled: false } }] })
      await db.appendConversationTurn({ turnId: 'subconscious:one', sessionId: 'conversation', assistantText: '自然主动表达', outreach: { evidenceKey: 'experience-1' } })
      await expect(db.appendConversationTurn({ turnId: 'subconscious:two', sessionId: 'conversation', assistantText: '重复表达', outreach: { evidenceKey: 'experience-1' } })).rejects.toThrow('cooldown')
      expect(await db.hasPublishedLifeTurn('alice', 'subconscious:two')).toBe(false)
      expect(JSON.parse((await db.readLifeState()).values['life:initiative']).outreachCount).toBe(1)
    }
    finally {
      await db.close()
    }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      expect(JSON.parse((await restarted.readLifeState()).values['life:initiative']).outreachEvidence).toEqual(['experience-1'])
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})

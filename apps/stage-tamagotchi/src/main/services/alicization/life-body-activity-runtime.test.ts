import type { AlicizationBodyActivityReceipt } from '@proj-alicization/stage-shared'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { recordLifeBodyActivity } from './life-body-activity-runtime'
import { createLifeDailyActivityRuntime, readLifeDailyRhythm } from './life-daily-activity-runtime'
import { recordLifeDailyExperience } from './life-daily-experience'
import { applyLifeDailyNeedsEffects } from './life-daily-needs'

describe('observed body results settle life activity', () => {
  it('requires owned visible movement and keeps one verified result across restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-body-result-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const options = { read: () => db.readLifeState(), commit: (input: Parameters<typeof db.commitLifeState>[0]) => db.commitLifeState(input), now: () => now }
    const daily = () => createLifeDailyActivityRuntime({ ...options, publish: () => {}, recordExperience: (cardId, activity) => recordLifeDailyExperience({ ...options, getIngress: id => db.getLifeIngress(id), appendEpisodes: db.appendEpisodicEvents }, cardId, activity) })
    const input = () => ({ cardId: 'alice', now, needs: { boredom: 20, fatigue: 15 }, foregroundActive: false, fullscreen: false, suspended: false })
    try {
      const activity = (await daily()(input())).activity!
      const receipt: AlicizationBodyActivityReceipt = { cardId: 'alice', activityId: activity.id, activitySequence: activity.sequence, modelId: 'qa-model', renderer: 'vrm', state: 'started', observedFrames: 0, observedMs: 0, movementRadians: 0, cue: 'stretch', visiblePixels: true, motionCompleted: false, occurredAt: now }
      await recordLifeBodyActivity(options, receipt, 'surface-a', true)
      now += 6000
      const completed = { ...receipt, state: 'completed' as const, motionCompleted: true, observedMs: 5500, observedFrames: 110, movementRadians: 0.8, occurredAt: now }
      await expect(recordLifeBodyActivity(options, completed, 'surface-b', true)).rejects.toThrow('visible, owned')
      await expect(recordLifeBodyActivity(options, completed, 'surface-a', false)).rejects.toThrow('visible, owned')
      await expect(recordLifeBodyActivity(options, { ...completed, movementRadians: 0.01 }, 'surface-a', true)).rejects.toThrow('visible, owned')
      await recordLifeBodyActivity(options, completed, 'surface-a', true)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const ended = await daily()(input())
      expect(ended).toMatchObject({ fatigueRelief: 3, activity: { phase: 'finished', bodyVerified: true } })
      const saved = applyLifeDailyNeedsEffects(input().needs, ended.needsEffects)
      await db.setMetaValue('qa-needs-snapshot', JSON.stringify(saved))
      expect((await daily()({ ...input(), needs: JSON.parse((await db.getMetaValue('qa-needs-snapshot'))!) })).fatigueRelief).toBe(0)
      expect(readLifeDailyRhythm((await db.readLifeState()).values).history).toHaveLength(1)
      const event = (await db.readLifeState()).ingress.find(item => item.source === 'daily-activity' && item.payload.phase === 'finished')!
      expect(event.payload.bodyVerified).toBe(true)
      expect((await db.listRecentEpisodicEvents(10)).filter(item => item.tags.includes('verified-body'))).toHaveLength(1)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('times out an unrendered intent without granting the effect of a completed stretch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-body-hidden-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const now = Date.now()
    const daily = createLifeDailyActivityRuntime({ read: db.readLifeState, commit: db.commitLifeState, publish: () => {} })
    const input = { cardId: 'alice', now, needs: { boredom: 20, fatigue: 15 }, foregroundActive: false, fullscreen: false, suspended: false }
    try {
      await daily(input)
      expect(await daily({ ...input, now: now + 90000 })).toMatchObject({ fatigueRelief: 0, activity: { phase: 'interrupted', reason: 'body-receipt-timeout', bodyVerified: false } })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

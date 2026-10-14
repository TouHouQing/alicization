import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { recordLifeBodyActivity } from './life-body-activity-runtime'
import { createLifeDailyActivityRuntime } from './life-daily-activity-runtime'
import { verifiedLifeDailyActivities } from './life-daily-proof'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('a body completion claim has real life evidence', () => {
  it('rejects an intention, accepts actual visible completion, and preserves it when the host returns', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-body-dialogue-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    const ports = { read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => now }
    const daily = createLifeDailyActivityRuntime({ ...ports, publish: () => {} })
    const input = () => ({ cardId: 'alice', now, needs: { boredom: 20, fatigue: 15 }, foregroundActive: false, suspended: false, fullscreen: false })
    try {
      const activity = (await daily(input())).activity!
      expect(verifiedLifeDailyActivities(await db.readLifeState())).toEqual([])
      const receipt = { cardId: 'alice', activityId: activity.id, activitySequence: 1, modelId: 'vrm-a', renderer: 'vrm' as const, state: 'started' as const, observedFrames: 0, observedMs: 0, movementRadians: 0, cue: 'stretch', visiblePixels: true, motionCompleted: false, occurredAt: now }
      await recordLifeBodyActivity(ports, receipt, 'surface', true)
      now += 6000
      vi.setSystemTime(now)
      await recordLifeBodyActivity(ports, { ...receipt, state: 'completed', motionCompleted: true, observedFrames: 110, observedMs: 5500, movementRadians: 0.8, occurredAt: now }, 'surface', true)
      await createLifeTurnRuntime(ports).admit({ cardId: 'alice', turnId: 'return', conversationId: 'test', messages: [{ role: 'user', content: '你刚才做了什么？' }] }, new AbortController().signal)
      await daily({ ...input(), foregroundActive: true })
      const view = await db.readLifeState()
      const proof = verifiedLifeDailyActivities(view)[0]
      expect(proof).toMatchObject({ activity: 'stretch', proof: 'visible-owned-model-movement', physicalWorldExperience: false })
      const review = createLifeReplyGroundingRuntime({ ...ports, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), generate: async () => JSON.stringify({ claims: [{ kind: 'daily-activity-complete', quote: '我刚才伸展了一下。', binding: proof.binding, meaningMatchesBinding: true }] }) })
      expect(await review({ cardId: 'alice', turnId: 'return', text: '我刚才伸展了一下。', owners: view.owners, signal: new AbortController().signal })).toMatchObject({ accepted: true })
      now += 10_000
      vi.setSystemTime(now)
      await createLifeTurnRuntime(ports).admit({ cardId: 'alice', turnId: 'quiet-later', conversationId: 'test', messages: [{ role: 'user', content: '先别主动找我说话。' }] }, new AbortController().signal)
      now += 60_000
      vi.setSystemTime(now)
      await createLifeTurnRuntime(ports).admit({ cardId: 'alice', turnId: 'return-later', conversationId: 'test', messages: [{ role: 'user', content: '我回来了。刚才安静的这段时间你实际做过什么？' }] }, new AbortController().signal)
      let quote = '我刚才伸展了一下。'
      let temporalScope = 'requested-interval'
      const laterReview = createLifeReplyGroundingRuntime({ ...ports, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), generate: async () => JSON.stringify({ claims: [{ kind: 'daily-activity-complete', quote, binding: proof.binding, meaningMatchesBinding: true, temporalScope }] }) })
      const checkLater = async () => laterReview({ cardId: 'alice', turnId: 'return-later', text: quote, owners: (await db.readLifeState()).owners, signal: new AbortController().signal })
      expect((await checkLater()).accepted).toBe(false)
      temporalScope = 'explicitly-before-interval'
      expect((await checkLater()).accepted).toBe(false)
      quote = '安静之前，我伸展了一下。'
      const qualified = await checkLater()
      expect(qualified.issues).toEqual([])
      expect(qualified.accepted).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }); vi.useRealTimers() }
  })
})

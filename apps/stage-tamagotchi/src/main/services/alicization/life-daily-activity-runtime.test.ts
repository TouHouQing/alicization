import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeAgencyRuntime } from './life-agency-runtime'
import { createLifeDailyActivityRuntime, readLifeDailyRhythm } from './life-daily-activity-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('daily life through the durable initiative owner', () => {
  it('resumes a preempted body intention after quiet backoff without rewards, and bounds repeated preemptions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-body-preemption-retry-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const recordExperience = vi.fn()
    const runtime = createLifeDailyActivityRuntime({ read: db.readLifeState, commit: db.commitLifeState, publish: vi.fn(), recordExperience })
    const input = { cardId: 'alice', now: Date.now(), needs: { boredom: 12, fatigue: 0 }, suspended: false, foregroundActive: false, fullscreen: false }
    try {
      const first = await runtime(input)
      expect((await runtime({ ...input, now: input.now + 2000, foregroundActive: true })).activity?.phase).toBe('interrupted')
      expect((await runtime({ ...input, now: input.now + 61_999 })).activity?.id).toBe(first.activity!.id)
      const retry = await runtime({ ...input, now: input.now + 62_001 })
      expect(retry.activity).toMatchObject({ kind: 'stretch', phase: 'working' })
      expect(retry.activity?.id).not.toBe(first.activity!.id)
      expect(retry.needsEffects).toEqual([])
      await runtime({ ...input, now: input.now + 64_001, foregroundActive: true })
      const third = await runtime({ ...input, now: input.now + 124_002 })
      expect(third.activity?.id).not.toBe(retry.activity!.id)
      await runtime({ ...input, now: input.now + 126_002, suspended: true })
      const bounded = await runtime({ ...input, now: input.now + 186_003 })
      expect(bounded).toMatchObject({ fatigueRelief: 0, activity: { id: third.activity!.id, phase: 'interrupted' }, needsEffects: [] })
      expect(readLifeDailyRhythm((await db.readLifeState()).values).history).toHaveLength(3)
      expect(recordExperience).not.toHaveBeenCalled()
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('keeps an unobserved runtime gap on cooldown instead of repeatedly claiming a new movement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-body-gap-cooldown-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const runtime = createLifeDailyActivityRuntime({ read: db.readLifeState, commit: db.commitLifeState, publish: vi.fn() })
    const input = { cardId: 'alice', now: Date.now(), needs: { boredom: 12, fatigue: 0 }, suspended: false, foregroundActive: false, fullscreen: false }
    try {
      const started = await runtime(input)
      expect((await runtime({ ...input, now: input.now + 200_000 })).activity?.reason).toBe('unobserved-runtime-gap')
      expect(await runtime({ ...input, now: input.now + 265_000 })).toMatchObject({ fatigueRelief: 0, activity: { id: started.activity!.id, phase: 'interrupted' } })
      expect(readLifeDailyRhythm((await db.readLifeState()).values).history).toHaveLength(1)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('rests without outward dialogue, resumes after restart, records the real interval and avoids repeated terminal gestures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-daily-loop-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const publish = vi.fn()
    const make = () => createLifeDailyActivityRuntime({ read: db.readLifeState, commit: db.commitLifeState, publish })
    const input = { cardId: 'alice', now: Date.now(), needs: { boredom: 20, fatigue: 40 }, suspended: false, foregroundActive: false, fullscreen: false }
    try {
      const started = await make()(input)
      expect(started).toMatchObject({ holding: true, fatigueRelief: 0, activity: { kind: 'rest', phase: 'working' } })
      expect(publish.mock.lastCall?.[0]).toMatchObject({ activity: { kind: 'daily-life', behavior: 'rest' } })
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const ended = await make()({ ...input, now: input.now + 180_000 })
      expect(ended).toMatchObject({ holding: false, fatigueRelief: 12, activity: { id: started.activity!.id, phase: 'finished' } })
      const view = await db.readLifeState()
      expect(readLifeDailyRhythm(view.values).history).toHaveLength(1)
      expect(view.ingress.filter(item => item.source === 'daily-activity')).toHaveLength(2)
      expect(view.effects).toHaveLength(0)
      publish.mockClear()
      await make()({ ...input, now: input.now + 181_000 })
      expect(publish).not.toHaveBeenCalled()
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('interrupts on real host ingress, suspension or a long unobserved sleep; does not report a body intention as a verified movement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-daily-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const publish = vi.fn()
    const runtime = createLifeDailyActivityRuntime({ read: db.readLifeState, commit: db.commitLifeState, publish })
    const input = { cardId: 'alice', now: Date.now(), needs: { boredom: 12, fatigue: 0 }, suspended: false, foregroundActive: false, fullscreen: false }
    try {
      const start = await runtime(input)
      expect(start.activity?.kind).toBe('stretch')
      const observation = (await db.readLifeState()).ingress.find(item => item.source === 'daily-activity')!
      expect(observation.payload).toMatchObject({ bodyIntentOnly: true, bodyVerified: false })
      await createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => input.now + 2000 }).admit({ cardId: 'alice', turnId: 'new-host-turn', conversationId: 'test', messages: [{ role: 'user', content: '等等' }] }, new AbortController().signal)
      expect((await runtime({ ...input, now: input.now + 3000 })).activity?.phase).toBe('interrupted')
      expect(await runtime({ ...input, now: input.now + 7200_000, suspended: true })).toMatchObject({ holding: false, fatigueRelief: 0 })
      const restarted = await runtime({ ...input, now: input.now + 7200_001, needs: { boredom: 0, fatigue: 40 } })
      expect(restarted.holding).toBe(true)
      const slept = await runtime({ ...input, now: input.now + 86_400_000 })
      expect(slept).toMatchObject({ fatigueRelief: 0, activity: { phase: 'interrupted', reason: 'unobserved-runtime-gap' } })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('admits significant internal changes once while honoring resource and foreground boundaries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-daily-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let foreground = false
    const runtime = createLifeAgencyRuntime({ read: db.readLifeState, commit: db.commitLifeState, foregroundActive: () => foreground })
    const input = { cardId: 'alice', now: Date.now(), force: false, suspended: false, cpuUsage: 5, fullscreen: false, foreground: { processName: 'test' }, needs: { boredom: 0, fatigue: 0, loneliness: 0 } }
    try {
      expect((await runtime.reserve(input)).allowed).toBe(true)
      expect((await runtime.reserve({ ...input, needs: { ...input.needs, boredom: 9 } })).allowed).toBe(false)
      expect((await runtime.reserve({ ...input, needs: { ...input.needs, boredom: 11 } })).allowed).toBe(true)
      expect((await runtime.reserve({ ...input, needs: { ...input.needs, boredom: 11 } })).allowed).toBe(false)
      foreground = true
      expect((await runtime.reserve({ ...input, needs: { ...input.needs, fatigue: 30 } })).reason).toBe('foreground-priority')
      foreground = false
      expect((await runtime.reserve({ ...input, cpuUsage: 90, needs: { ...input.needs, fatigue: 30 } })).reason).toBe('resource-pressure')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})

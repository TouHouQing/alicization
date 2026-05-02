import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeVisualPresenceState } from './runtime-visual-presence-state'

function createVisualPresenceState(updatedAt: number): AlicizationVisualPresenceStateSnapshot {
  return {
    watchMode: 'symbiotic-vision',
    currentScene: null,
    attention: null,
    workingMemoryEpisodes: [],
    privateThought: null,
    captureState: {
      permission: 'unknown',
      lastGroundedAt: null,
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 1_000,
    updatedAt,
    worldModel: null,
    autobiographicalSelf: { relationshipDoctrine: 'Repair before closeness.' } as any,
    reflectionLedger: { entries: [], latestEntryId: null } as any,
    motiveEngine: { dominantDrive: 'care' } as any,
    habitPolicy: { blocksDirectSpeakWhenBusy: true } as any,
  } as unknown as AlicizationVisualPresenceStateSnapshot
}

describe('runtime visual presence state', () => {
  it('persists visual presence and mind heads for the active card without using card scope switches', async () => {
    const meta = new Map<string, string>()
    const upsertMindHead = vi.fn(async (cardId: string, key: string, value: unknown) => {
      meta.set(`mind:${cardId}:${key}`, JSON.stringify(value))
    })
    const emitVisualPresenceState = vi.fn()
    const runtime = createAlicizationRuntimeVisualPresenceState({
      now: () => 5_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (_cardId, task) => await task(),
      alicizationDb: {
        getMetaValue: async key => meta.get(key),
        setMetaValue: async (key, value) => {
          meta.set(key, value)
        },
        upsertMindHead,
      },
      perceptionStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      visualPresenceCapturePersistMetaByCard: new Map(),
      createDefaultPerceptionState: (now) => ({ lastObservedAt: now } as any),
      normalizePerceptionState: raw => raw as any,
      createDefaultVisualPresenceState: createVisualPresenceState,
      normalizeVisualPresenceState: raw => raw as AlicizationVisualPresenceStateSnapshot,
      buildVisualPresenceCapturePersistFingerprint: state => `fp:${state.updatedAt}`,
      emitVisualPresenceState,
      perceptionMetaKey: 'perception_state_v1',
      visualPresenceMetaKey: 'visual_presence_state_v1',
    })

    const state = createVisualPresenceState(4_800)
    await runtime.persistVisualPresenceState('default', state)

    expect(meta.get('visual_presence_state_v1')).toBe(JSON.stringify(state))
    expect(upsertMindHead).toHaveBeenCalledTimes(4)
    expect(emitVisualPresenceState).toHaveBeenCalledWith('default', state)
  })

  it('restores cross-card perception and visual presence through scoped reads', async () => {
    const scopedMeta = new Map<string, Map<string, string>>([
      ['other-card', new Map([
        ['perception_state_v1', JSON.stringify({ observed: 'other-card' })],
        ['visual_presence_state_v1', JSON.stringify(createVisualPresenceState(8_000))],
      ])],
    ])
    let activeScope = 'default'
    const runtime = createAlicizationRuntimeVisualPresenceState({
      now: () => 9_000,
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      getActiveCardId: () => 'default',
      withCardScope: async (cardId, task) => {
        const previous = activeScope
        activeScope = String(cardId)
        try {
          return await task()
        }
        finally {
          activeScope = previous
        }
      },
      alicizationDb: {
        getMetaValue: async key => scopedMeta.get(activeScope)?.get(key),
        setMetaValue: async () => {},
        upsertMindHead: async () => {},
      },
      perceptionStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      visualPresenceCapturePersistMetaByCard: new Map(),
      createDefaultPerceptionState: (now) => ({ lastObservedAt: now } as any),
      normalizePerceptionState: raw => raw as any,
      createDefaultVisualPresenceState: createVisualPresenceState,
      normalizeVisualPresenceState: raw => raw as AlicizationVisualPresenceStateSnapshot,
      buildVisualPresenceCapturePersistFingerprint: state => `fp:${state.updatedAt}`,
      emitVisualPresenceState: () => {},
      perceptionMetaKey: 'perception_state_v1',
      visualPresenceMetaKey: 'visual_presence_state_v1',
    })

    const perception = await runtime.ensurePerceptionState('other-card')
    const visualPresence = await runtime.ensureVisualPresenceState('other-card')

    expect(perception).toEqual({ observed: 'other-card' })
    expect(visualPresence.updatedAt).toBe(8_000)
  })
})

import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationBodyKernel } from './body-kernel'
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
  it('derives quiet co-vision presence for sustained focus without forcing speech', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 1000 })
    const result = kernel.reduce({
      sustainedFocusMs: 180000,
      watchMode: 'symbiotic-vision',
      shouldSpeak: false,
      activeConversation: false,
      relationshipPressure: 0.42,
    })

    expect(result.currentBodyState).toBe('accompanying')
    expect(result.continuityMode).toBe('quiet-accompaniment')
    expect(result.currentInwardPreoccupation).toContain('focus')
  })

  it('suppresses quiet co-vision while a conversation is active', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 2_000 })
    const result = kernel.reduce({
      sustainedFocusMs: 180_000,
      watchMode: 'symbiotic-vision',
      shouldSpeak: false,
      activeConversation: true,
      relationshipPressure: 0.42,
    })

    expect(result.currentBodyState).toBe('idle')
    expect(result.continuityMode).toBe('active-dialogue')
    expect(result.currentInwardPreoccupation).toBeNull()
  })

  it('softens quiet co-vision when relationship pressure is too low', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 2_000 })
    const result = kernel.reduce({
      sustainedFocusMs: 180_000,
      watchMode: 'symbiotic-vision',
      shouldSpeak: false,
      activeConversation: false,
      relationshipPressure: 0.08,
    })

    expect(result.currentBodyState).toBe('idle')
    expect(result.continuityMode).toBe('ambient-covision')
  })

  it('applies authority onto a visual presence state without disturbing other fields', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 9_000 })
    const previousState = createVisualPresenceState(4_800)
    previousState.currentScene = {
      scenario: 'coding',
      workloadKind: 'focused-work',
      contentKind: 'editor',
      summary: 'Editing runtime authority flow.',
      confidence: 0.9,
      source: 'screen-semantic-summary',
      target: null,
      beganAt: 0,
    } as any
    previousState.privateThought = {
      shouldSpeak: false,
    } as any
    previousState.relationshipModel = {
      receptivity: 0.4,
      sharedAttentionTrust: 0.6,
      reciprocityExpectation: 0.5,
    } as any

    const nextState = kernel.applyToVisualPresenceState({
      now: 180_000,
      previousState,
      candidateState: {
        ...previousState,
        watchMode: 'symbiotic-vision',
        currentScene: previousState.currentScene,
        privateThought: previousState.privateThought,
        updatedAt: 8_500,
      },
      activeConversation: false,
    })

    expect(nextState.currentBodyState).toBe('accompanying')
    expect(nextState.continuityMode).toBe('quiet-accompaniment')
    expect(nextState.quietLineMs).toBe(180_000)
    expect(nextState.updatedAt).toBe(180_000)
    expect(nextState.watchMode).toBe(previousState.watchMode)
    expect(nextState.captureState).toEqual(previousState.captureState)
  })

  it('does not inherit long focus from a stale previous scene when candidate scene is fresh', () => {
    const kernel = createAlicizationBodyKernel({ now: () => 9_000 })
    const previousState = createVisualPresenceState(4_800)
    previousState.currentScene = {
      scenario: 'coding',
      workloadKind: 'focused-work',
      contentKind: 'editor',
      summary: 'Long-running old scene.',
      confidence: 0.9,
      source: 'screen-semantic-summary',
      target: null,
      beganAt: 0,
    } as any
    previousState.privateThought = {
      shouldSpeak: false,
    } as any
    previousState.relationshipModel = {
      receptivity: 0.4,
      sharedAttentionTrust: 0.6,
      reciprocityExpectation: 0.5,
    } as any

    const nextState = kernel.applyToVisualPresenceState({
      now: 180_000,
      previousState,
      candidateState: {
        ...previousState,
        currentScene: {
          ...previousState.currentScene,
          beganAt: 179_500,
        } as any,
        privateThought: previousState.privateThought,
        updatedAt: 8_500,
      },
      activeConversation: false,
    })

    expect(nextState.currentBodyState).toBe('idle')
    expect(nextState.continuityMode).toBe('ambient-covision')
    expect(nextState.quietLineMs).toBe(500)
  })

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

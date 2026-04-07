import type { AlicizationDigitalLifeSpineDigest } from '../../stores/alicization-bridge'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { clearAlicizationBridge, setAlicizationBridge } from '../../stores/alicization-bridge'
import { useStageEmbodimentVisualPresence } from './use-stage-embodiment-visual-presence'

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: {
        collectedAt: Date.now(),
        time: { iso: '', local: '', timezone: 'UTC' },
        cpu: { usagePercent: 0, windowMs: 1000 },
        memory: { freeMB: 0, totalMB: 0, usagePercent: 0 },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: null,
      running: true,
    }),
    ...overrides,
  } as any
}

function createVisualPresenceState(updatedAt: number) {
  return {
    watchMode: 'invited-inspection' as const,
    currentScene: {
      workloadKind: 'coding' as const,
      contentKind: 'diff' as const,
      scenario: 'coding' as const,
      source: 'invited-grounding' as const,
      confidence: 0.84,
      beganAt: updatedAt - 8_000,
      lastSeenAt: updatedAt - 300,
    },
    attention: null,
    workingMemoryEpisodes: [],
    privateThought: {
      stance: 'observe' as const,
      confidence: 0.72,
      rationaleTags: ['inspection'],
      thoughtText: 'Stay with the current diff.',
      shouldSpeak: true,
      suggestedStyle: 'silent-observe' as const,
      embodiedPresence: 'attentive' as const,
      expiresAt: updatedAt + 4_000,
      emotionalTension: 'focused-flow' as const,
    },
    captureState: {
      permission: 'granted' as const,
      lastGroundedAt: updatedAt - 120,
      sourceName: 'display-1',
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 1_400,
    updatedAt,
  }
}

function createDigitalLifeSpineDigest(updatedAt = Date.now()) {
  return {
    version: 'digital-life-spine-digest-v1' as const,
    runtime: {
      watchMode: 'symbiotic-vision' as const,
      sceneScenario: 'coding' as const,
      sceneSummary: 'inspect the current diff',
      activeThreadId: 'thread-1',
      activeThreadTitle: 'current diff',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive' as const,
      selectedAction: 'wait',
      updatedAt,
    },
    architecture: {
      operatingMode: 'speaking' as const,
      dominantSystem: 'dialogue' as const,
      supportingSystems: ['perception'] as const,
      governingFocus: 'guide the current diff',
      summary: 'dialogue leads while perception stays warm',
    },
    continuitySignal: {
      label: 'digital-life-line' as const,
      summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
      signature: 'spine-1',
      createdAt: updatedAt,
      watchMode: 'symbiotic-vision' as const,
      sceneScenario: 'coding' as const,
      activeThreadId: 'thread-1',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive' as const,
    },
    proactive: {
      selectedAction: 'wait',
      preferredStyle: 'silent-observe' as const,
      confidence: 0.7,
      shouldSpeak: false,
      activeThreadId: 'thread-1',
      activeThreadTitle: 'current diff',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive' as const,
    },
    memory: {
      summary: 'stay with the current diff',
      recentEpisodeSummary: 'inspecting the current line',
      recentEpisodeCount: 1,
      focusBeliefStatement: 'the current diff needs attention',
      focusBeliefConfidence: 0.72,
      leadingGoalSummary: 'guide the current diff',
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: 0.2,
      recallMode: 'working',
      recallSeed: 'current-diff',
      thoughtThreadSummary: 'tracking the active thread',
    },
  } satisfies AlicizationDigitalLifeSpineDigest
}

async function flushTasks() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

describe('stage embodiment visual presence', () => {
  afterEach(() => {
    clearAlicizationBridge()
    vi.restoreAllMocks()
  })

  it('applies pushed visual presence snapshots immediately', async () => {
    let emitSnapshot: ((state: ReturnType<typeof createVisualPresenceState> | null) => void) | undefined
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getVisualPresenceState,
      onVisualPresenceState: (listener) => {
        emitSnapshot = listener
        return () => {
          emitSnapshot = undefined
        }
      },
    }))

    const scope = effectScope()
    const embodimentVisualPresence = scope.run(() => useStageEmbodimentVisualPresence())!
    await flushTasks()

    expect(getVisualPresenceState).toHaveBeenCalledTimes(1)
    expect(embodimentVisualPresence.state.value).toBeNull()

    const pushedState = createVisualPresenceState(4_200)
    emitSnapshot?.(pushedState)
    await flushTasks()

    expect(embodimentVisualPresence.state.value).toEqual(pushedState)
    scope.stop()
  })

  it('falls back to refresh on presence pulse when snapshot push is unavailable', async () => {
    let emitPulse: (() => void) | undefined
    const initialState = createVisualPresenceState(1_200)
    const refreshedState = createVisualPresenceState(2_600)
    const getVisualPresenceState = vi.fn()
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(refreshedState)

    setAlicizationBridge(createAlicizationBridgeStub({
      getVisualPresenceState,
      onVisualPresencePulse: (listener) => {
        emitPulse = () => listener({
          watchMode: 'invited-inspection',
          embodiedPresence: 'attentive',
          scenario: 'coding',
          stance: 'observe',
          confidence: 0.8,
          reasonTags: ['inspection'],
          expiresAt: Date.now() + 1_000,
        })
        return () => {
          emitPulse = undefined
        }
      },
    }))

    const scope = effectScope()
    const embodimentVisualPresence = scope.run(() => useStageEmbodimentVisualPresence())!
    await flushTasks()

    expect(getVisualPresenceState).toHaveBeenCalledTimes(1)
    expect(embodimentVisualPresence.state.value).toEqual(initialState)

    emitPulse?.()
    await flushTasks()

    expect(getVisualPresenceState).toHaveBeenCalledTimes(2)
    expect(embodimentVisualPresence.state.value).toEqual(refreshedState)
    scope.stop()
  })

  it('applies transient digital life spine digests as immediate visual presence overlays', async () => {
    const scope = effectScope()
    const embodimentVisualPresence = scope.run(() => useStageEmbodimentVisualPresence())!
    await flushTasks()

    const digest = createDigitalLifeSpineDigest(4_200)
    const transient = embodimentVisualPresence.applyTransientDigitalLifeSpine(digest)
    await flushTasks()

    expect(embodimentVisualPresence.digitalLifeSpineDigest.value).toEqual(digest)
    expect(transient).toMatchObject({
      watchMode: 'symbiotic-vision',
      currentScene: expect.objectContaining({
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      }),
      privateThought: expect.objectContaining({
        stance: 'accompany',
        embodiedPresence: 'attentive',
        runtimeThreadId: 'thread-1',
        emotionalTension: 'focused-flow',
      }),
    })
    expect(embodimentVisualPresence.state.value).toEqual(transient)
    scope.stop()
  })
})

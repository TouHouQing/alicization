import type { AlicizationSoulSnapshot } from '../../../shared/eventa'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDefaultProactiveLoopState } from './proactive-feedback'
import { createAlicizationChatPerceptionAugmentRuntime } from './runtime-chat-perception-augment'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

vi.mock('./alicization-runtime-architecture', () => ({
  deriveAlicizationRuntimeSnapshot: vi.fn(() => null),
}))

vi.mock('./attention-anchor', () => ({
  getActiveAttentionAnchor: vi.fn(() => null),
  getActivePerceptionSceneResidue: vi.fn(() => null),
}))

vi.mock('./attention-model', () => ({
  updateVisualAttentionModel: vi.fn(() => null),
}))

vi.mock('./digital-life-spine', () => ({
  commitAlicizationDigitalLifeSpine: vi.fn((input: any) => ({
    nextState: input.previousState,
    current: {
      architecture: null,
      runtimeSurface: null,
    },
  })),
}))

vi.mock('./mind-continuity', () => ({
  buildMindContinuityRecallSeed: vi.fn(() => ''),
}))

vi.mock('./proactive-layered-context', () => ({
  buildProactiveLayeredContext: vi.fn(() => ({
    workload: { kind: 'unknown' },
    content: { kind: 'unknown' },
    localTime: { isLateNight: false },
    relationship: {
      fatigue: 0,
      lateNightActiveMinutes: 0,
    },
  })),
  inferScenarioFromContext: vi.fn(() => 'general'),
}))

vi.mock('./runtime-chat-prompt-blocks', () => ({
  buildChatInspectionContractSystemBlock: vi.fn(() => ''),
  buildChatPerceptionSystemBlock: vi.fn(() => ''),
}))

vi.mock('./runtime-perception-helpers', () => ({
  resolveInspectionGroundingContinuity: vi.fn(() => ({
    groundedThisTurn: false,
    source: 'none',
    overlapScore: 0,
  })),
  shouldSuppressWeakGenericBrowserInspectionAnchor: vi.fn(() => false),
  shouldUsePerceptionResidueAsLiveSceneSummary: vi.fn(() => false),
}))

vi.mock('./visual-heartbeat', () => ({
  buildVisualHeartbeat: vi.fn(() => ({
    watchMode: 'recovering',
    scene: null,
    recentTransition: null,
    nextSuggestedProbeMs: 60_000,
  })),
}))

function createSoulSnapshot() {
  return {
    frontmatter: {
      host_attitude: 'trusted',
      personality: {},
    },
  } as unknown as AlicizationSoulSnapshot
}

describe('runtime chat perception augment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts independent cold life-context reads concurrently before awaiting any one source', async () => {
    let releaseProactive!: () => void
    const proactiveGate = new Promise<void>((resolve) => {
      releaseProactive = resolve
    })
    const ensureProactiveLoopState = vi.fn(async () => {
      await proactiveGate
      return createDefaultProactiveLoopState(10_000)
    })
    const ensureSubconsciousState = vi.fn(async () => ({
      boredom: 0,
      loneliness: 0,
      fatigue: 0,
      lastInteractionAt: 10_000,
      lastTickAt: 10_000,
      lastSavedAt: 10_000,
      lastDreamedAt: 0,
      updatedAt: 10_000,
    }))
    const bootstrap = vi.fn(async () => createSoulSnapshot())
    const listPendingScheduledTaskCount = vi.fn(async () => 0)
    const listHumanlikeMemoryRecallEvents = vi.fn(async () => [])
    const visualPresenceState = createDefaultVisualPresenceState(10_000)

    const runtime = createAlicizationChatPerceptionAugmentRuntime({
      sensoryRuntime: {
        prepareInteractivePerceptionPrelude: vi.fn(async input => ({
          now: 10_000,
          perceptionState: {
            attentionAnchor: null,
            lastNonSelfForegroundTarget: null,
            recentObservations: [],
            invitedInspection: null,
            recentSceneResidue: null,
            updatedAt: 10_000,
          },
          visualPresenceState,
          messages: input.messages,
          sensorySnapshot: {
            sample: null,
            stale: false,
            ageMs: 0,
            nextTickAt: null,
            running: true,
          },
          inspectionIntent: {
            inspectionState: 'dialogue-first',
          },
          inspectionRequested: false,
          genericScreenInspection: false,
          currentForeground: null,
          chatScreenSemanticSummary: null,
          auditAction: 'perception-context-prepared',
          auditPayload: {},
          captureGovernance: {
            allowResidueAsLiveScene: false,
            nextCaptureState: visualPresenceState.captureState,
            auditPayload: {
              captureDegradedReasons: [],
            },
            capture: null,
            fallbackReason: null,
          },
        })),
      },
      ensureProactiveLoopState,
      ensureSubconsciousState,
      getSoulSnapshot: () => null,
      bootstrap,
      listPendingScheduledTaskCount,
      buildDigitalLifeMindState: vi.fn(async () => ({})),
      persistVisualPresenceState: vi.fn(async () => {}),
      visualPresenceCapturePersistDebounceWindowMs: 0,
      buildVisualPresenceCapturePersistFingerprint: vi.fn(() => 'fingerprint'),
      appendAuditLog: vi.fn(async () => {}),
      listHumanlikeMemoryRecallEvents,
    })

    const augmentation = runtime.augmentMainChatMessagesWithPerception({
      cardId: 'default',
      turnId: 'turn-cold-start',
      userText: '你好',
      messages: [{ role: 'user', content: '你好' }],
    })

    await vi.waitFor(() => {
      expect(ensureProactiveLoopState).toHaveBeenCalledOnce()
    })
    expect(ensureSubconsciousState).toHaveBeenCalledOnce()
    expect(bootstrap).toHaveBeenCalledOnce()
    expect(listPendingScheduledTaskCount).toHaveBeenCalledOnce()
    expect(listHumanlikeMemoryRecallEvents).toHaveBeenCalled()

    releaseProactive()
    await expect(augmentation).resolves.toMatchObject({
      messages: [{ role: 'user', content: '你好' }],
      capture: {
        inspectionRequested: false,
        groundedThisTurn: false,
      },
    })
  })
})

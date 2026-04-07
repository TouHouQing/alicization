import type { NativeImage } from 'electron'

import type {
  AlicizationSensoryCacheSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { DesktopCaptureAccessResult, SubconsciousCardState } from './runtime-soul'
import type { AlicizationResolvedInspectionIntent } from './sensory-runtime'

import { describe, expect, it, vi } from 'vitest'

import {

  createAlicizationSensoryRuntime,
} from './sensory-runtime'

function createPerceptionState(): AlicizationPerceptionState {
  return {
    attentionAnchor: null,
    lastNonSelfForegroundTarget: null,
    recentObservations: [],
    invitedInspection: null,
    recentSceneResidue: null,
    updatedAt: 0,
  }
}

function createSceneResidue(): AlicizationPerceptionSceneResidue {
  return {
    observedAt: 123,
    source: 'invited-inspection',
    workloadKind: 'coding',
    contentKind: 'error',
    summary: 'editor error focus',
    confidence: 0.8,
    focusTarget: {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'src/runtime.ts',
    },
    focusSource: 'capture-source',
    captureSourceName: 'Editor B',
    captureStrategy: 'window-title',
  }
}

function createSource(id: string, name: string, thumbnail: NativeImage): DesktopCaptureAccessResult['sources'][number] {
  return {
    id,
    name,
    thumbnail,
    appIcon: null,
    display_id: '',
  } as unknown as DesktopCaptureAccessResult['sources'][number]
}

function createSensoryRuntimeHarness() {
  const clearDesktopCaptureAccessCache = vi.fn()
  const buildChatInspectionGroundingParts = vi.fn(input => [{ type: 'text' as const, text: `grounded:${input.candidateSourceName}` }])
  const firstThumbnail = {} as NativeImage
  const secondThumbnail = {} as NativeImage
  const buildCompressedNativeImageDataUrl = vi.fn(({ image }: { image: NativeImage }) => {
    return image === secondThumbnail ? 'data:image/jpeg;base64,second' : ''
  })
  const buildDialogueIngressContext = vi.fn(() => ({
    context: {
      workload: { kind: 'unknown', confidence: 0, source: 'sensory-bus', matchedLabels: [] },
      content: { kind: 'unknown', confidence: 0, source: 'sensory-bus', matchedLabels: [] },
      localTime: { hour: 12, minute: 0, weekday: 1, isLateNight: false },
      relationship: {
        hostAttitude: '',
        boredom: 0,
        loneliness: 0,
        fatigue: 0,
        minutesSinceLastUserTurn: 0,
        reminderBacklog: 0,
        lateNightActiveMinutes: 0,
        recentProactiveOutcomes: [],
      },
    } as unknown as AlicizationProactiveLayeredContext,
    currentScene: null,
    worldModel: null,
  }))
  const buildDialogueTurnSemantics = vi.fn(() => ({
    subjectPreference: 'visible-scene',
    reasonTags: [],
  } as unknown as AlicizationDialogueTurnSemantics))
  const buildDialogueIngressGovernor = vi.fn(() => ({
    inspectionEligible: true,
  }))
  const buildInspectionSceneResidue = vi.fn(() => createSceneResidue())
  const buildScreenSemanticSceneResidue = vi.fn(() => createSceneResidue())
  const describePerceptionTarget = vi.fn((target?: { title?: string } | null) => target?.title ?? 'none')
  const detectInvitedInspectionIntent = vi.fn(() => ({ active: false }))
  const appendContentPartsToLatestUserMessage = vi.fn(messages => messages)
  const ensurePerceptionState = vi.fn(async () => createPerceptionState())
  const ensureProactiveLoopState = vi.fn(async () => ({
    globalCooldownUntil: 0,
    scenarioBias: {},
    consecutiveIgnored: {},
    lateNightActivityStartedAt: null,
    lateNightActivityLastActiveAt: null,
    pendingOutcomes: [],
    recentOutcomes: [],
    updatedAt: 0,
  } as unknown as AlicizationProactiveLoopState))
  const ensureSubconsciousState = vi.fn(async () => ({
    updatedAt: 0,
    lastDreamedAt: 0,
  } as unknown as SubconsciousCardState))
  const ensureVisualPresenceState = vi.fn(async () => ({
    watchMode: 'recovering',
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
    nextSuggestedProbeMs: 0,
    updatedAt: 0,
  } as unknown as AlicizationVisualPresenceStateSnapshot))
  const extractInspectionHintTerms = vi.fn(() => ['error'])
  const generateScreenSemanticSummaryFromImage = vi.fn(async () => ({
    summary: null,
    unavailableReason: 'screen-semantic-weak-summary',
  }))
  const getActiveAttentionAnchor = vi.fn(() => null)
  const getSensorySnapshot = vi.fn(() => ({
    sample: {
      foregroundWindow: null,
      collectedAt: 0,
    },
    stale: false,
    ageMs: 0,
    nextTickAt: null,
    running: true,
    capture: null,
  } as unknown as AlicizationSensoryCacheSnapshot))
  const inferAlicizationInspectionIntent = vi.fn(() => ({
    active: false,
    confidence: 0,
    reasonCodes: [],
  }))
  const hasImageTransportContent = vi.fn(() => false)
  const isGenericScreenInspectionRequest = vi.fn(() => false)
  const isWeakAlicizationScreenSurfaceCue = vi.fn(() => false)
  const isWeakAlicizationScreenSurfaceTarget = vi.fn(() => false)
  const isWeakGenericBrowserFocusTarget = vi.fn(() => false)
  const listPendingScheduledTaskCount = vi.fn(async () => 0)
  const persistPerceptionState = vi.fn(async () => {})
  const purgeWeakGenericBrowserInspectionState = vi.fn(({ state }: { state: AlicizationPerceptionState }) => state)
  const readLatestAssistantMessageText = vi.fn(() => '')
  const rememberPerceptionObservation = vi.fn(async () => createPerceptionState())
  const rememberSceneResidue = vi.fn(async () => createPerceptionState())
  const resolveForegroundDecisionTarget = vi.fn(input => input.snapshotForeground ?? input.probedForeground ?? input.attentionAnchor)
  const resolveHostAttitude = vi.fn(async () => '')
  const resolveInspectionIntentForChatTurn = vi.fn(() => ({
    active: false,
    confidence: 0,
    reasonCodes: [],
    releaseCarry: false,
    inspectionState: 'dialogue-first',
    groundingGate: null,
    turnOwnershipHint: null,
    ingress: null,
    ownershipTransition: null,
  } as unknown as AlicizationResolvedInspectionIntent))
  const resolveSenderCaptureSnapshot = vi.fn(() => null)
  const sampleSubconsciousInterruptionContext = vi.fn(async () => null)
  const shouldSuppressWeakGenericBrowserInspectionAnchor = vi.fn(() => false)

  const rankedCandidates = [
    {
      source: createSource('source-1', 'Editor A', firstThumbnail),
      strategy: 'window-title' as const,
      focusTarget: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'Editor A',
        source: 'capture-source' as const,
        confidence: 0.7,
      },
    },
    {
      source: createSource('source-2', 'Editor B', secondThumbnail),
      strategy: 'window-title' as const,
      focusTarget: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'Editor B',
        source: 'capture-source' as const,
        confidence: 0.82,
      },
    },
  ]

  const rankScreenSemanticCaptureCandidates = vi.fn(() => rankedCandidates)
  const resolveDesktopCaptureAccess = vi.fn(async () => ({
    permissionStatus: 'granted',
    sources: rankedCandidates.map(candidate => candidate.source),
  }))

  const runtime = createAlicizationSensoryRuntime({
    appendContentPartsToLatestUserMessage,
    buildChatInspectionGroundingParts,
    buildCompressedNativeImageDataUrl,
    buildDialogueIngressContext,
    buildDialogueIngressGovernor,
    buildDialogueTurnSemantics,
    buildInspectionSceneResidue,
    buildScreenSemanticSceneResidue,
    clearDesktopCaptureAccessCache,
    describePerceptionTarget,
    detectInvitedInspectionIntent,
    ensurePerceptionState,
    ensureProactiveLoopState,
    ensureSubconsciousState,
    ensureVisualPresenceState,
    extractInspectionHintTerms,
    generateScreenSemanticSummaryFromImage,
    getActiveAttentionAnchor,
    getSensorySnapshot,
    hasImageTransportContent,
    inferAlicizationInspectionIntent,
    inspectionGroundingImageJpegQuality: 76,
    inspectionGroundingImageMaxHeight: 540,
    inspectionGroundingImageMaxWidth: 960,
    isGenericScreenInspectionRequest,
    isWeakAlicizationScreenSurfaceCue,
    isWeakAlicizationScreenSurfaceTarget,
    isWeakGenericBrowserFocusTarget,
    listPendingScheduledTaskCount,
    persistPerceptionState,
    purgeWeakGenericBrowserInspectionState,
    rankScreenSemanticCaptureCandidates,
    readLatestAssistantMessageText,
    rememberPerceptionObservation,
    rememberSceneResidue,
    resolveDesktopCaptureAccess,
    resolveForegroundDecisionTarget,
    resolveHostAttitude,
    resolveInspectionIntentForChatTurn,
    resolveSenderCaptureSnapshot,
    sampleSubconsciousInterruptionContext,
    shouldSuppressWeakGenericBrowserInspectionAnchor,
  })

  return {
    buildDialogueIngressContext,
    buildDialogueIngressGovernor,
    buildInspectionSceneResidue,
    buildChatInspectionGroundingParts,
    clearDesktopCaptureAccessCache,
    detectInvitedInspectionIntent,
    inferAlicizationInspectionIntent,
    resolveDesktopCaptureAccess,
    runtime,
  }
}

describe('sensory runtime', () => {
  it('short-circuits message-history inspection detection when there are no inspection cues', () => {
    const harness = createSensoryRuntimeHarness()
    harness.detectInvitedInspectionIntent.mockReturnValue({ active: false })
    harness.inferAlicizationInspectionIntent.mockReturnValue({
      active: false,
      confidence: 0,
      reasonCodes: [],
    })

    expect(harness.runtime.resolveInspectionIntentFromMessageHistory({
      userText: '你好',
      messages: [{ role: 'user', content: '你好' }],
    })).toBe(false)
    expect(harness.buildDialogueIngressContext).not.toBeCalled()
    expect(harness.buildDialogueIngressGovernor).not.toBeCalled()
  })

  it('clears capture cache and falls through to the next candidate with a usable thumbnail', async () => {
    const harness = createSensoryRuntimeHarness()

    const result = await harness.runtime.resolveChatVisualGrounding({
      cardId: 'default',
      now: 10_000,
      userText: '看看这个报错窗口',
      perceptionState: createPerceptionState(),
      currentForeground: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'Editor B',
      },
    })

    expect(harness.clearDesktopCaptureAccessCache).toBeCalledTimes(1)
    expect(harness.resolveDesktopCaptureAccess).toBeCalledWith({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1280, height: 720 },
    })
    expect(harness.buildChatInspectionGroundingParts).toBeCalledWith(expect.objectContaining({
      candidateSourceName: 'Editor B',
    }))
    expect(harness.buildInspectionSceneResidue).toBeCalledWith(expect.objectContaining({
      captureSourceName: 'Editor B',
    }))
    expect(result.auditAction).toBe('inspection-grounded')
    expect(result.auditPayload).toEqual(expect.objectContaining({
      candidateSource: 'Editor A',
      captureSource: 'Editor B',
    }))
    expect(result.additionalUserParts).toEqual([{ type: 'text', text: 'grounded:Editor B' }])
    expect(result.observationTarget).toEqual(expect.objectContaining({
      title: 'Editor B',
    }))
    expect(result.sceneResidue).toEqual(expect.objectContaining({
      captureSourceName: 'Editor B',
    }))
  })
})

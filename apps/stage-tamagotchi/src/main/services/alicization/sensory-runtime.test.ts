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

import { boundLifeProviderRequest } from './life-provider-budget'
import { createAlicizationInspectionIntentRuntime } from './runtime-inspection-intent'
import {

  createAlicizationSensoryRuntime,
} from './sensory-runtime'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

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
    signalProfile: {
      explicitSceneDirective: false,
      contextualContinuationDirective: false,
      focusAnchored: false,
      lexicalOnlyCue: false,
      actionable: false,
      decisive: false,
    },
  }))
  const hasImageTransportContent = vi.fn(() => false)
  const isGenericScreenInspectionRequest = vi.fn(() => false)
  const isWeakAlicizationScreenSurfaceCue = vi.fn(() => false)
  const isWeakAlicizationScreenSurfaceTarget = vi.fn(() => false)
  const isWeakGenericBrowserFocusTarget = vi.fn(() => false)
  const listPendingScheduledTaskCount = vi.fn(async () => 0)
  const persistPerceptionState = vi.fn(async () => {})
  const queuePerceptionStateMutation = vi.fn(async (_cardId: string, mutate: (current: AlicizationPerceptionState) => AlicizationPerceptionState | Promise<AlicizationPerceptionState>) => {
    return await mutate(createPerceptionState())
  })
  const purgeWeakGenericBrowserInspectionState = vi.fn(({ state }: { state: AlicizationPerceptionState }) => state)
  const readLatestAssistantMessageText = vi.fn(() => '')
  const rememberPerceptionObservation = vi.fn(async () => createPerceptionState())
  const rememberSceneResidue = vi.fn(async () => createPerceptionState())
  const resolveForegroundDecisionTarget = vi.fn(input => input.snapshotForeground ?? input.probedForeground ?? input.attentionAnchor)
  const resolveHostAttitude = vi.fn(async () => '')
  const resolveInspectionIntentForChatTurn = vi.fn<Parameters<typeof createAlicizationSensoryRuntime>[0]['resolveInspectionIntentForChatTurn']>(() => ({
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
    queuePerceptionStateMutation,
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
    ensurePerceptionState,
    ensureVisualPresenceState,
    inferAlicizationInspectionIntent,
    resolveDesktopCaptureAccess,
    resolveInspectionIntentForChatTurn,
    rememberPerceptionObservation,
    runtime,
  }
}

describe('sensory runtime', () => {
  it('keeps fictional writing exact and within budget without calling screen capture after a shared view', async () => {
    const harness = createSensoryRuntimeHarness()
    const now = Date.now()
    const state = createPerceptionState()
    state.invitedInspection = { requestedAt: now - 1000, activeUntil: now + 5000, hintText: '看看雨天窗边的画作' }
    state.recentSceneResidue = { ...createSceneResidue(), observedAt: now, summary: '雨天窗边的光、纸张、颜料和雨声。' }
    const visual = createDefaultVisualPresenceState(now)
    visual.watchMode = 'invited-inspection'
    harness.ensurePerceptionState.mockResolvedValue(state)
    harness.ensureVisualPresenceState.mockResolvedValue(visual)
    harness.rememberPerceptionObservation.mockResolvedValue(state)
    const inspector = createAlicizationInspectionIntentRuntime({ normalizeOrganicRecallText: raw => String(raw).trim(), readLatestAssistantMessageText: () => '我在看着画纸。', readTransportContentAsText: content => typeof content === 'string' ? content : '' })
    harness.resolveInspectionIntentForChatTurn.mockImplementation(input => inspector.resolveInspectionIntentForChatTurn(input))
    const userText = '请写一篇八百字的雨天绘画散文，细致描述窗边的光、纸张、颜料和雨声。'
    const messages = [{ role: 'user' as const, content: userText }]
    const prepared = await harness.runtime.prepareInteractivePerceptionPrelude({ cardId: 'default', userText, messages })
    expect(prepared.inspectionRequested).toBe(false)
    expect(prepared.inspectionIntent.releaseCarry).toBe(true)
    expect(prepared.messages).toEqual(messages)
    expect(harness.resolveDesktopCaptureAccess).not.toHaveBeenCalled()
    expect(harness.buildChatInspectionGroundingParts).not.toHaveBeenCalled()
    expect(boundLifeProviderRequest([{ role: 'system', content: 'The same stable identity.' }, ...prepared.messages], [], { contextTokens: 2048, outputReserve: 512, safetyReserve: 256 }).messages.at(-1)?.content).toBe(userText)
  })
  it('cannot inherit desktop capture permission from structured workflow data', () => {
    const harness = createSensoryRuntimeHarness()
    const text = '执行参数：{"capabilityId":"tool.browser_read_page","question":"看看桌面上的报告？"}'
    expect(harness.runtime.resolveInspectionIntentFromMessageHistory({ userText: text, messages: [{ role: 'user', content: '看看屏幕' }, { role: 'user', content: text }] })).toBe(false)
    expect(harness.inferAlicizationInspectionIntent).not.toHaveBeenCalled()
    expect(harness.resolveDesktopCaptureAccess).not.toHaveBeenCalled()
  })

  it('restores perception and visual presence state concurrently for a chat turn', async () => {
    const harness = createSensoryRuntimeHarness()
    let releasePerception!: () => void
    const perceptionGate = new Promise<void>((resolve) => {
      releasePerception = resolve
    })
    harness.ensurePerceptionState.mockImplementation(async () => {
      await perceptionGate
      return createPerceptionState()
    })

    const preparation = harness.runtime.prepareInteractivePerceptionPrelude({
      cardId: 'default',
      userText: '你好',
      messages: [{ role: 'user', content: '你好' }],
    })

    await vi.waitFor(() => {
      expect(harness.ensurePerceptionState).toHaveBeenCalledOnce()
    })
    try {
      expect(harness.ensureVisualPresenceState).toHaveBeenCalledOnce()
    }
    finally {
      releasePerception()
    }

    await expect(preparation).resolves.toMatchObject({
      inspectionRequested: false,
      messages: [{ role: 'user', content: '你好' }],
    })
  })

  it('short-circuits message-history inspection detection when there are no inspection cues', () => {
    const harness = createSensoryRuntimeHarness()
    harness.detectInvitedInspectionIntent.mockReturnValue({ active: false })
    harness.inferAlicizationInspectionIntent.mockReturnValue({
      active: false,
      confidence: 0,
      reasonCodes: [],
      signalProfile: {
        explicitSceneDirective: false,
        contextualContinuationDirective: false,
        focusAnchored: false,
        lexicalOnlyCue: false,
        actionable: false,
        decisive: false,
      },
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

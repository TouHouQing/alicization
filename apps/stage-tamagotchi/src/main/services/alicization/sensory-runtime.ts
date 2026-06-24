import type { CommonContentPart, Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationSensoryCacheSnapshot,
  AlicizationSensoryCaptureSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionSceneResidue, AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationDialogueIngressGovernor } from './dialogue-ingress-governor'
import type { AlicizationDialogueTurnOwnershipHint } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationInspectionGroundingGateDecision } from './inspection-grounding-gate'
import type { AlicizationInspectionTurnState } from './inspection-turn-state-machine'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationScreenSemanticSummary } from './proactive-screen-semantic'
import type { DesktopCaptureAccessResult, SubconsciousCardState } from './runtime-soul'
import type { AlicizationRuntimeCaptureGovernance } from './sensory-capture'

import {
  activateInvitedInspection,
  releaseInvitedInspection,
} from './attention-anchor'
import {

  deriveRuntimeCaptureGovernance,
} from './sensory-capture'

interface AlicizationInspectionFocusTarget {
  appName?: string
  confidence?: number
  processName?: string
  source?: AlicizationPerceptionSceneResidue['focusSource']
  title?: string
}

interface AlicizationInspectionCaptureCandidate {
  focusTarget?: AlicizationInspectionFocusTarget | null
  source: {
    id: string
    name: string
    thumbnail: NativeImage
  }
  strategy: NonNullable<AlicizationPerceptionSceneResidue['captureStrategy']>
}

interface AlicizationInspectionGroundingPartsInput {
  candidateSourceName: string
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
  focusTarget?: AlicizationInspectionFocusTarget | null
  imageDataUrl: string
  now: number
  perceptionState: AlicizationPerceptionState
  staleHistoryRisk?: boolean
  userText: string
}

interface AlicizationGeneratedScreenSemanticSummaryResult {
  summary: AlicizationScreenSemanticSummary | null
  unavailableReason?: string
}

export interface AlicizationChatVisualGroundingResult {
  additionalUserParts: CommonContentPart[]
  auditAction: string
  auditPayload: Record<string, unknown>
  observationTarget?: {
    appName?: string
    processName?: string
    title?: string
  }
  sceneResidue: AlicizationPerceptionSceneResidue | null
  screenSemanticSummary: AlicizationScreenSemanticSummary | null
}

export interface AlicizationResolvedInspectionIntent {
  active: boolean
  confidence: number
  reasonCodes: string[]
  releaseCarry: boolean
  inspectionState: AlicizationInspectionTurnState
  groundingGate: AlicizationInspectionGroundingGateDecision | null
  turnOwnershipHint: AlicizationDialogueTurnOwnershipHint | null
  ingress: AlicizationDialogueIngressGovernor | null
  ownershipTransition: {
    ownerBefore: AlicizationDialogueAnswerSubject
    ownerAfter: AlicizationDialogueAnswerSubject
    screenModeBefore: AlicizationDialogueScreenReferenceMode
    screenModeAfter: AlicizationDialogueScreenReferenceMode
    inspectionStateBefore: AlicizationInspectionTurnState
    inspectionStateAfter: AlicizationInspectionTurnState
    releaseCause: string | null
  } | null
}

export interface AlicizationPreparedInteractivePerceptionPrelude {
  messages: Message[]
  now: number
  perceptionState: AlicizationPerceptionState
  visualPresenceState: AlicizationVisualPresenceStateSnapshot
  sensorySnapshot: AlicizationSensoryCacheSnapshot
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  } | null
  inspectionIntent: AlicizationResolvedInspectionIntent
  inspectionRequested: boolean
  inspectionRoutingSuppressed: boolean
  genericScreenInspection: boolean
  auditAction: string
  auditPayload: Record<string, unknown>
  chatScreenSemanticSummary: AlicizationScreenSemanticSummary | null
  captureGovernance: AlicizationRuntimeCaptureGovernance
}

interface AlicizationInspectionIntentFromHistoryInput {
  messages: Array<{ content?: unknown, role?: string }>
  userText: string
}

interface AlicizationSensoryRuntimeOptions {
  appendContentPartsToLatestUserMessage: (messages: Message[], extraParts: CommonContentPart[]) => Message[]
  buildChatInspectionGroundingParts: (input: AlicizationInspectionGroundingPartsInput) => CommonContentPart[]
  buildCompressedNativeImageDataUrl: (input: {
    image: NativeImage
    jpegQuality: number
    maxHeight: number
    maxWidth: number
  }) => string
  buildDialogueIngressContext: (input: {
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    now: number
    perceptionState: null
    visualPresenceState: null
  }) => {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel']
  }
  buildDialogueIngressGovernor: (input: {
    baseInspectionIntentActive: boolean
    inspectionContinuityActive: boolean
    semanticInspectionIntentActive: boolean
    semanticInspectionIntentConfidence: number
    semanticInspectionReasonCodes: string[]
    semantics: AlicizationDialogueTurnSemantics
    sharedAttentionActive: boolean
  }) => {
    inspectionEligible: boolean
  }
  buildDialogueTurnSemantics: (input: {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    inspectionRequested: boolean
    previousAssistantText: string
    userText: string
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel']
  }) => AlicizationDialogueTurnSemantics
  buildInspectionSceneResidue: (input: {
    captureSourceName: string
    captureStrategy: AlicizationPerceptionSceneResidue['captureStrategy']
    focusTarget?: AlicizationInspectionFocusTarget | null
    now: number
    userText: string
  }) => AlicizationPerceptionSceneResidue | null
  buildScreenSemanticSceneResidue: (input: {
    focusTarget?: AlicizationInspectionFocusTarget | null
    now: number
    summary: AlicizationScreenSemanticSummary
  }) => AlicizationPerceptionSceneResidue
  clearDesktopCaptureAccessCache: () => void
  describePerceptionTarget: (target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) => string
  detectInvitedInspectionIntent: (message: string) => {
    active: boolean
  }
  ensurePerceptionState: (cardId: string) => Promise<AlicizationPerceptionState>
  queuePerceptionStateMutation: (
    cardId: string,
    mutate: (current: AlicizationPerceptionState) => AlicizationPerceptionState | Promise<AlicizationPerceptionState>,
  ) => Promise<AlicizationPerceptionState>
  ensureProactiveLoopState: (cardId: string) => Promise<AlicizationProactiveLoopState>
  ensureSubconsciousState: (cardId: string) => Promise<SubconsciousCardState>
  ensureVisualPresenceState: (cardId: string) => Promise<AlicizationVisualPresenceStateSnapshot>
  extractInspectionHintTerms: (message: string) => string[]
  generateScreenSemanticSummaryFromImage: (input: {
    cardId: string
    focusTarget?: AlicizationInspectionFocusTarget | null
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    imageDataUrl: string
    now: number
    source: {
      id: string
      name: string
      strategy: 'app-name' | 'process-name' | 'screen-fallback' | 'window-title'
    }
  }) => Promise<AlicizationGeneratedScreenSemanticSummaryResult>
  getSensorySnapshot: () => AlicizationSensoryCacheSnapshot
  getActiveAttentionAnchor: (state: AlicizationPerceptionState, now: number) => {
    appName?: string
    processName?: string
    title?: string
  } | null
  inferAlicizationInspectionIntent: (input: {
    message: string
    recentMessages: Array<{ content?: unknown, role?: string }>
  }) => {
    active: boolean
    confidence: number
    reasonCodes: string[]
    signalProfile?: {
      decisive?: boolean
    }
  }
  inspectionGroundingImageJpegQuality: number
  inspectionGroundingImageMaxHeight: number
  inspectionGroundingImageMaxWidth: number
  isWeakAlicizationScreenSurfaceCue: (value?: string | null) => boolean
  isWeakAlicizationScreenSurfaceTarget: (input?: {
    appName?: string
    processName?: string
    title?: string
  } | null) => boolean
  isGenericScreenInspectionRequest: (message: string) => boolean
  isWeakGenericBrowserFocusTarget: (input: {
    captureStrategy?: AlicizationPerceptionSceneResidue['captureStrategy']
    focusTarget?: AlicizationInspectionFocusTarget | null
    userText?: string
  }) => boolean
  hasImageTransportContent: (content: unknown) => boolean
  listPendingScheduledTaskCount: (limit: number) => Promise<number>
  persistPerceptionState: (cardId: string, state: AlicizationPerceptionState) => Promise<void>
  purgeWeakGenericBrowserInspectionState: (input: {
    now: number
    state: AlicizationPerceptionState
  }) => AlicizationPerceptionState
  rankScreenSemanticCaptureCandidates: (input: {
    attentionAnchor?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    avoidSourcePattern?: RegExp
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    hintTerms: string[]
    recentObservations: AlicizationPerceptionState['recentObservations']
    sources: DesktopCaptureAccessResult['sources']
  }) => AlicizationInspectionCaptureCandidate[]
  readLatestAssistantMessageText: (messages: Array<{ content?: unknown, role?: string }>) => string
  rememberPerceptionObservation: (input: {
    cardId: string
    now: number
    source: 'chat-start' | 'sensory-snapshot' | 'subconscious-tick'
    target?: {
      appName?: string
      processName?: string
      title?: string
    } | null
  }) => Promise<AlicizationPerceptionState>
  rememberSceneResidue: (input: {
    cardId: string
    now: number
    residue: AlicizationPerceptionSceneResidue
  }) => Promise<AlicizationPerceptionState>
  resolveDesktopCaptureAccess: (input: {
    thumbnailSize: {
      height: number
      width: number
    }
    types: Array<'screen' | 'window'>
  }) => Promise<DesktopCaptureAccessResult>
  resolveForegroundDecisionTarget: (input: {
    snapshotForeground?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    probedForeground?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    attentionAnchor?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    hintTerms?: string[]
    allowAttentionAnchorFallback?: boolean
  }) => {
    appName?: string
    processName?: string
    title?: string
  } | undefined
  resolveHostAttitude: () => Promise<string>
  resolveInspectionIntentForChatTurn: (input: {
    now: number
    userText: string
    messages: Array<{ role?: string, content?: unknown }>
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    } | null
  }) => AlicizationResolvedInspectionIntent
  resolveSenderCaptureSnapshot: (senderWebContentsId?: number | null) => AlicizationSensoryCaptureSnapshot | null
  sampleSubconsciousInterruptionContext: () => Promise<{
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    } | null
  } | null>
  shouldSuppressWeakGenericBrowserInspectionAnchor: (input: {
    now: number
    userText: string
    state: AlicizationPerceptionState
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    groundingUnavailableReason?: string
  }) => boolean
}

export function createAlicizationSensoryRuntime(options: AlicizationSensoryRuntimeOptions) {
  function resolveInspectionIntentFromMessageHistory(input: AlicizationInspectionIntentFromHistoryInput) {
    const baseIntent = options.detectInvitedInspectionIntent(input.userText)
    const semanticIntent = options.inferAlicizationInspectionIntent({
      message: input.userText,
      recentMessages: input.messages.slice(0, -1),
    })
    const semanticPremarkEligible = semanticIntent.signalProfile?.decisive ?? semanticIntent.active
    if (!baseIntent.active && !semanticIntent.active)
      return false

    const ingressContext = options.buildDialogueIngressContext({
      now: Date.now(),
      perceptionState: null,
      visualPresenceState: null,
    })
    const ingressSemantics = options.buildDialogueTurnSemantics({
      userText: input.userText,
      previousAssistantText: options.readLatestAssistantMessageText(input.messages),
      context: ingressContext.context,
      currentScene: ingressContext.currentScene,
      worldModel: ingressContext.worldModel,
      inspectionRequested: baseIntent.active || (semanticIntent.active && semanticPremarkEligible),
    })
    const ingressGovernor = options.buildDialogueIngressGovernor({
      semantics: ingressSemantics,
      baseInspectionIntentActive: baseIntent.active,
      semanticInspectionIntentActive: semanticIntent.active,
      semanticInspectionIntentConfidence: semanticIntent.confidence,
      semanticInspectionReasonCodes: semanticIntent.reasonCodes,
      inspectionContinuityActive: false,
      sharedAttentionActive: false,
    })
    return ingressGovernor.inspectionEligible
  }

  async function resolveChatVisualGrounding(input: {
    cardId: string
    currentForeground?: {
      appName?: string
      processName?: string
      title?: string
    }
    now: number
    perceptionState: AlicizationPerceptionState
    userText: string
  }): Promise<AlicizationChatVisualGroundingResult> {
    // NOTICE: Desktop capture access caching is only safe within the same grounding burst.
    // Follow-up inspection turns must re-probe current sources instead of reusing the
    // previous turn's thumbnails, or shared-attention continuity will attach stale frames.
    options.clearDesktopCaptureAccessCache()
    const captureAccess = await options.resolveDesktopCaptureAccess({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1280, height: 720 },
    })

    if (captureAccess.sources.length === 0) {
      return {
        additionalUserParts: [],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: captureAccess.unavailableReason ?? 'screen-capture-sources-empty',
          permissionStatus: captureAccess.permissionStatus,
          probeError: captureAccess.probeError,
          probeStrategy: captureAccess.probeStrategy,
          probeAttempts: captureAccess.probeAttempts,
        },
        sceneResidue: null,
        screenSemanticSummary: null,
      }
    }

    const anchor = options.getActiveAttentionAnchor(input.perceptionState, input.now)
    const candidates = options.rankScreenSemanticCaptureCandidates({
      foregroundWindow: input.currentForeground,
      attentionAnchor: anchor,
      recentObservations: input.perceptionState.recentObservations,
      hintTerms: options.extractInspectionHintTerms(input.userText),
      avoidSourcePattern: /\b(?:alicization|codex)\b/i,
      sources: captureAccess.sources,
    })
    const candidate = candidates[0] ?? null
    if (!candidate) {
      return {
        additionalUserParts: [],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: 'candidate-not-found',
          attentionAnchor: options.describePerceptionTarget(anchor),
          permissionStatus: captureAccess.permissionStatus,
        },
        sceneResidue: null,
        screenSemanticSummary: null,
      }
    }

    const candidateAttempts: Array<{
      id: string
      source: string
      strategy: AlicizationPerceptionSceneResidue['captureStrategy']
      thumbnailReady: boolean
    }> = []
    let resolvedCandidate = candidate
    let imageDataUrl = ''

    for (const rankedCandidate of candidates) {
      const candidateImageDataUrl = options.buildCompressedNativeImageDataUrl({
        image: rankedCandidate.source.thumbnail,
        maxWidth: options.inspectionGroundingImageMaxWidth,
        maxHeight: options.inspectionGroundingImageMaxHeight,
        jpegQuality: options.inspectionGroundingImageJpegQuality,
      })
      candidateAttempts.push({
        source: rankedCandidate.source.name,
        id: rankedCandidate.source.id,
        strategy: rankedCandidate.strategy,
        thumbnailReady: Boolean(candidateImageDataUrl),
      })
      if (!candidateImageDataUrl)
        continue
      resolvedCandidate = rankedCandidate
      imageDataUrl = candidateImageDataUrl
      break
    }

    if (!imageDataUrl) {
      return {
        additionalUserParts: [],
        auditAction: 'inspection-grounding-skipped',
        auditPayload: {
          reason: 'thumbnail-empty',
          candidateSource: candidate.source.name,
          captureSource: candidate.source.name,
          focusTarget: options.describePerceptionTarget(candidate.focusTarget),
          permissionStatus: captureAccess.permissionStatus,
          candidateAttempts,
        },
        sceneResidue: null,
        screenSemanticSummary: null,
      }
    }

    const staleHistoryRisk = options.isWeakGenericBrowserFocusTarget({
      focusTarget: resolvedCandidate.focusTarget,
      captureStrategy: resolvedCandidate.strategy,
      userText: input.userText,
    })
    const effectiveFocusTarget = staleHistoryRisk
      ? null
      : resolvedCandidate.focusTarget

    const rawObservationTarget = staleHistoryRisk
      ? null
      : effectiveFocusTarget
        ? {
            appName: effectiveFocusTarget.appName ?? anchor?.appName ?? input.currentForeground?.appName,
            processName: effectiveFocusTarget.processName ?? anchor?.processName ?? input.currentForeground?.processName,
            title: effectiveFocusTarget.title ?? anchor?.title ?? input.currentForeground?.title ?? resolvedCandidate.source.name,
          }
        : {
            appName: anchor?.appName ?? input.currentForeground?.appName,
            processName: anchor?.processName ?? input.currentForeground?.processName,
            title: resolvedCandidate.source.name || anchor?.title || input.currentForeground?.title,
          }
    const weakScreenFallbackObservation = Boolean(
      rawObservationTarget
      && resolvedCandidate.strategy === 'screen-fallback'
      && options.isWeakAlicizationScreenSurfaceCue(resolvedCandidate.source.name)
      && options.isWeakAlicizationScreenSurfaceTarget(rawObservationTarget),
    )
    const groundedObservationTarget = weakScreenFallbackObservation
      ? null
      : rawObservationTarget
    const semanticResult = await options.generateScreenSemanticSummaryFromImage({
      cardId: input.cardId,
      now: input.now,
      imageDataUrl,
      foregroundWindow: input.currentForeground,
      source: {
        id: resolvedCandidate.source.id,
        name: resolvedCandidate.source.name,
        strategy: resolvedCandidate.strategy ?? 'screen-fallback',
      },
      focusTarget: effectiveFocusTarget,
    })
    const screenSemanticSummary = semanticResult.summary
    const shouldSkipWeakFallbackResidue = Boolean(
      !screenSemanticSummary
      && resolvedCandidate.strategy === 'screen-fallback'
      && options.isWeakAlicizationScreenSurfaceCue(resolvedCandidate.source.name)
      && options.isWeakAlicizationScreenSurfaceTarget(effectiveFocusTarget ?? rawObservationTarget),
    )
    const sceneResidue = screenSemanticSummary
      ? options.buildScreenSemanticSceneResidue({
          now: input.now,
          summary: screenSemanticSummary,
          focusTarget: effectiveFocusTarget,
        })
      : shouldSkipWeakFallbackResidue
        ? null
        : options.buildInspectionSceneResidue({
            now: input.now,
            userText: input.userText,
            focusTarget: effectiveFocusTarget,
            captureSourceName: resolvedCandidate.source.name,
            captureStrategy: resolvedCandidate.strategy,
          })

    return {
      additionalUserParts: options.buildChatInspectionGroundingParts({
        imageDataUrl,
        candidateSourceName: resolvedCandidate.source.name,
        focusTarget: effectiveFocusTarget,
        perceptionState: input.perceptionState,
        currentForeground: input.currentForeground,
        userText: input.userText,
        now: input.now,
        staleHistoryRisk,
      }),
      observationTarget: groundedObservationTarget ?? undefined,
      sceneResidue,
      screenSemanticSummary: screenSemanticSummary ?? null,
      auditAction: 'inspection-grounded',
      auditPayload: {
        candidateSource: candidate.source.name,
        captureSource: resolvedCandidate.source.name,
        candidateId: candidate.source.id,
        captureId: resolvedCandidate.source.id,
        strategy: resolvedCandidate.strategy,
        focusTarget: options.describePerceptionTarget(effectiveFocusTarget),
        focusSource: effectiveFocusTarget?.source ?? 'none',
        focusSuppressed: staleHistoryRisk ? 'weak-generic-browser-screen-fallback' : null,
        observationTargetSuppressed: weakScreenFallbackObservation ? 'weak-screen-shell-fallback' : null,
        attentionAnchor: options.describePerceptionTarget(anchor),
        permissionStatus: captureAccess.permissionStatus,
        probeStrategy: captureAccess.probeStrategy,
        probeAttempts: captureAccess.probeAttempts,
        imageDataChars: imageDataUrl.length,
        permissionProbeMismatch: Boolean(captureAccess.permissionStatus && captureAccess.permissionStatus !== 'granted'),
        captureRecoveredFromRetry: Boolean(captureAccess.recoveredFromRetry),
        candidateAttempts,
        screenSemanticSummary: screenSemanticSummary
          ? {
              workload: screenSemanticSummary.workload,
              content: screenSemanticSummary.content,
            }
          : null,
        screenSemanticUnavailableReason: screenSemanticSummary
          ? null
          : semanticResult.unavailableReason,
      },
    }
  }

  async function prepareInteractivePerceptionPrelude(input: {
    cardId: string
    userText: string
    messages: Message[]
    senderWebContentsId?: number | null
    skipInspectionGrounding?: boolean
  }): Promise<AlicizationPreparedInteractivePerceptionPrelude> {
    const now = Date.now()
    let perceptionState = await options.ensurePerceptionState(input.cardId)
    const visualPresenceState = await options.ensureVisualPresenceState(input.cardId)
    const sensorySnapshot = options.getSensorySnapshot()
    const senderCaptureSnapshot = options.resolveSenderCaptureSnapshot(input.senderWebContentsId)

    if (sensorySnapshot?.sample?.foregroundWindow) {
      perceptionState = await options.rememberPerceptionObservation({
        cardId: input.cardId,
        now: Number(sensorySnapshot.sample.collectedAt || now),
        target: sensorySnapshot.sample.foregroundWindow,
        source: 'sensory-snapshot',
      })
    }

    const inspectionIntent = options.resolveInspectionIntentForChatTurn({
      now,
      userText: input.userText,
      messages: input.messages,
      perceptionState,
      visualPresenceState,
      currentForeground: sensorySnapshot?.sample?.foregroundWindow,
    })
    const inspectionRoutingSuppressed = input.skipInspectionGrounding === true
    const inspectionRequested = inspectionIntent.active && !inspectionRoutingSuppressed
    if (!inspectionRequested && (inspectionIntent.releaseCarry || inspectionRoutingSuppressed)) {
      perceptionState = await options.queuePerceptionStateMutation(input.cardId, current => releaseInvitedInspection({
        state: current,
        now,
        clearSceneResidue: true,
      }))
    }

    const genericScreenInspection = inspectionRequested && options.isGenericScreenInspectionRequest(input.userText)
    let currentForeground = sensorySnapshot?.sample?.foregroundWindow
    if (inspectionRequested) {
      const interruptionContext = await options.sampleSubconsciousInterruptionContext().catch(() => null)
      currentForeground = options.resolveForegroundDecisionTarget({
        snapshotForeground: currentForeground,
        probedForeground: interruptionContext?.foregroundWindow,
        attentionAnchor: options.getActiveAttentionAnchor(perceptionState, now),
        hintTerms: options.extractInspectionHintTerms(input.userText),
        allowAttentionAnchorFallback: true,
      }) ?? currentForeground
      if (currentForeground) {
        perceptionState = await options.rememberPerceptionObservation({
          cardId: input.cardId,
          now,
          target: currentForeground,
          source: 'chat-start',
        })
      }
      perceptionState = await options.queuePerceptionStateMutation(input.cardId, current => activateInvitedInspection({
        state: current,
        now,
        hintText: input.userText,
      }))
    }

    let messages = input.messages
    let chatScreenSemanticSummary: AlicizationScreenSemanticSummary | null = null
    let auditAction = inspectionRequested ? 'inspection-grounding-skipped' : 'perception-context-prepared'
    let auditPayload: Record<string, unknown> = {
      inspectionRequested,
      inspectionSuppressedByExecutorRouting: inspectionRoutingSuppressed,
      inspectionState: inspectionIntent.inspectionState,
      inspectionIntentConfidence: inspectionIntent.confidence,
      inspectionIntentReasonCodes: inspectionRoutingSuppressed
        ? [...inspectionIntent.reasonCodes, 'executor-routing-intent']
        : inspectionIntent.reasonCodes,
      inspectionCarryReleased: inspectionIntent.releaseCarry,
      owner_before: inspectionIntent.ownershipTransition?.ownerBefore ?? null,
      owner_after: inspectionIntent.ownershipTransition?.ownerAfter ?? null,
      screen_mode_before: inspectionIntent.ownershipTransition?.screenModeBefore ?? null,
      screen_mode_after: inspectionIntent.ownershipTransition?.screenModeAfter ?? null,
      inspection_state_before: inspectionIntent.ownershipTransition?.inspectionStateBefore ?? null,
      inspection_state_after: inspectionIntent.ownershipTransition?.inspectionStateAfter ?? null,
      release_cause: inspectionIntent.ownershipTransition?.releaseCause ?? null,
      inspectionGroundingGate: inspectionIntent.groundingGate
        ? {
            inspectionRequested: inspectionIntent.groundingGate.inspectionRequested,
            inspectionState: inspectionIntent.groundingGate.inspectionState,
            releaseCarry: inspectionIntent.groundingGate.releaseCarry,
            confidence: inspectionIntent.groundingGate.confidence,
            reasonTags: inspectionIntent.groundingGate.reasonTags,
          }
        : null,
      turnOwnershipHint: inspectionIntent.turnOwnershipHint
        ? {
            subject: inspectionIntent.turnOwnershipHint.subject,
            screenReferenceMode: inspectionIntent.turnOwnershipHint.screenReferenceMode,
            confidence: inspectionIntent.turnOwnershipHint.confidence,
            reasonTags: inspectionIntent.turnOwnershipHint.reasonTags,
          }
        : null,
      turnIngress: inspectionIntent.ingress
        ? {
            owner: inspectionIntent.ingress.turnOwner,
            inspectionEligible: inspectionIntent.ingress.inspectionEligible,
            screenReferenceMode: inspectionIntent.ingress.screenReferenceMode,
            confidence: inspectionIntent.ingress.confidence,
            reasonTags: inspectionIntent.ingress.reasonTags,
            summary: inspectionIntent.ingress.summary,
          }
        : null,
      attentionAnchor: options.describePerceptionTarget(options.getActiveAttentionAnchor(perceptionState, now)),
      captureSenderWebContentsId: input.senderWebContentsId ?? null,
    }
    if (inspectionRoutingSuppressed) {
      auditAction = 'inspection-grounding-skipped'
      auditPayload = {
        ...auditPayload,
        reason: 'executor-routing-intent',
      }
    }

    const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')
    const latestUserHasImage = options.hasImageTransportContent(latestUserMessage?.content)
    if (inspectionRequested && !latestUserHasImage) {
      const grounding = await resolveChatVisualGrounding({
        now,
        userText: input.userText,
        cardId: input.cardId,
        perceptionState,
        currentForeground,
      })
      if (grounding.additionalUserParts.length > 0)
        messages = options.appendContentPartsToLatestUserMessage(messages, grounding.additionalUserParts)
      if (grounding.observationTarget) {
        currentForeground = grounding.observationTarget
        perceptionState = await options.rememberPerceptionObservation({
          cardId: input.cardId,
          now,
          target: grounding.observationTarget,
          source: 'chat-start',
        })
      }
      if (grounding.sceneResidue) {
        perceptionState = await options.rememberSceneResidue({
          cardId: input.cardId,
          now,
          residue: grounding.sceneResidue,
        })
      }
      if (grounding.screenSemanticSummary)
        chatScreenSemanticSummary = grounding.screenSemanticSummary
      auditAction = grounding.auditAction
      auditPayload = {
        ...auditPayload,
        ...grounding.auditPayload,
      }
      if (grounding.additionalUserParts.length === 0 && options.shouldSuppressWeakGenericBrowserInspectionAnchor({
        now,
        userText: input.userText,
        state: perceptionState,
        currentForeground: currentForeground ?? undefined,
        groundingUnavailableReason: typeof grounding.auditPayload.reason === 'string' ? grounding.auditPayload.reason : undefined,
      })) {
        perceptionState = await options.queuePerceptionStateMutation(input.cardId, current => options.purgeWeakGenericBrowserInspectionState({
          now,
          state: current,
        }))
      }
    }
    else if (inspectionRequested && latestUserHasImage) {
      auditAction = 'inspection-grounding-skipped'
      auditPayload = {
        ...auditPayload,
        reason: 'user-already-attached-image',
      }
    }

    const captureGovernance = deriveRuntimeCaptureGovernance({
      capture: senderCaptureSnapshot,
      inspectionRequested,
      groundedThisTurn: auditAction === 'inspection-grounded',
      previousCaptureState: visualPresenceState.captureState,
      captureSourceName: typeof auditPayload.captureSource === 'string' ? auditPayload.captureSource : null,
      now,
    })
    if (
      inspectionRequested
      && auditAction !== 'inspection-grounded'
      && typeof auditPayload.reason !== 'string'
      && captureGovernance.fallbackReason
    ) {
      auditPayload = {
        ...auditPayload,
        reason: captureGovernance.fallbackReason,
      }
    }
    auditPayload = {
      ...auditPayload,
      ...captureGovernance.auditPayload,
    }

    return {
      messages,
      now,
      perceptionState,
      visualPresenceState,
      sensorySnapshot,
      currentForeground,
      inspectionIntent,
      inspectionRequested,
      inspectionRoutingSuppressed,
      genericScreenInspection,
      auditAction,
      auditPayload,
      chatScreenSemanticSummary,
      captureGovernance,
    }
  }

  return {
    prepareInteractivePerceptionPrelude,
    resolveChatVisualGrounding,
    resolveInspectionIntentFromMessageHistory,
  }
}

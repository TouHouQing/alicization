import type { Buffer } from 'node:buffer'

import type { Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationConversationTurnInput,
  AlicizationDigitalLifeEnvelope,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredPayload,
  AlicizationEmotion,
  AlicizationMemoryProvenance,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnGovernance,
  AlicizationProactiveMetadata,
  AlicizationProactiveStaticReasonCode,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import {
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  normalizeAlicizationEmbodimentScript,
  deriveAlicizationMindParticipationFromSpine,
  buildMindGovernedFallbackSurface,
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
  isWeakAlicizationScreenSurfaceCue,
  normalizeExecutionFirstGovernance,
  normalizeAlicizationNormalVisibleReplyAuthority,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  replyViolatesExecutionFirstSurface,
  replyLeaksGovernedMindSurface,
  replyLooksOrganicDirectAnswer,
  replyLooksCoherentSceneAnswer,
  replyLooksThinGovernedShell,
  resolveAlicizationDialogueEmbodiment,
  sanitizeCharacterPerformanceManifest,
  shouldDeferGovernedMindLocalRepair,
  shouldForceGovernedMindSurface,
  shouldPreserveDialogueFirstVisibleReply,
  translateGovernedMindFallback as translateGovernedMindFallbackShared,
} from '@proj-alicization/stage-shared'
import { buildAlicizationRuntimeEmbodimentSeed } from './embodiment/runtime-embodiment-seed'
import { coerceAlicizationGovernanceForMindFallback } from './governed-mind-fallback-compat'
import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { normalizeClaimEvidenceLedger } from './claim-evidence-ledger'
import { normalizeDialogueActKernel } from './dialogue-act-kernel'
import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { renderAlicizationMindSurface } from './mind-surface-renderer'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { normalizeMindTurnFrame } from './mind-turn-frame'
import { sanitizeBriefText, uniqueCarryAnchors } from './runtime-realtime'
import { clamp01, sanitizeText } from './runtime-soul'
import { resolveAlicizationRuntimeMindTurnStructuredFormat } from './runtime-structured-format'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'
import {
  analyzeDialogueFirstVisibleReply,
  analyzeUnsupportedTechnicalSpecificity,
  clauseMentionsCue,
  collectAllowedTechnicalSpecificityCues,
  dialogueFirstProcessOnlyReplyPattern,
  dialogueFirstRoleplayPrefacePattern,
  dialogueFirstStaleCarryClausePattern,
  extractForeignTechnicalReplyCues,
  normalizeGovernedAnchorText,
  repairDialogueFirstVisibleReply,
  replyIncludesAnchorCue,
  replyLooksProcessOnlyRepairShell,
  splitDialogueReplyClauses,
  technicalSpecificityCueMatches,
  uniqueTechnicalSpecificityCues,
} from './visible-reply/dialogue-first-contamination'
import { resolveAlicizationVisibleReplyGovernanceAuditAuthority } from './visible-reply/governance-audit'
import {
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from './proactive-opening-guidance'

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

function buildRuntimeGovernanceEmbodimentSpeechSegment(
  segment: AlicizationDialogueSpeechTimeline['segments'][number],
) {
  const pauseClass = trimmedPauseClass(segment.text)
  const phraseBoundary = pauseClass === 'comma' || pauseClass === 'enumeration'
    ? 'soft' as const
    : pauseClass === 'full-stop' || pauseClass === 'question' || pauseClass === 'exclaim'
      ? 'hard' as const
      : 'none' as const
  const contour = pauseClass === 'question'
    ? 'rising' as const
    : pauseClass === 'comma' || pauseClass === 'full-stop' || pauseClass === 'exclaim'
      ? 'falling' as const
      : 'flat' as const
  return {
    id: segment.id,
    index: segment.index,
    text: segment.text,
    interruptPolicy: segment.interruptMode === 'hard-interrupt' ? 'hard-stop' as const : 'soft-settle' as const,
    preRollMs: segment.actionWindow === 'segment-start'
      ? 40
      : segment.actionWindow === 'cadence-peak'
        ? 20
        : 0,
    settleMs: Math.max(
      120,
      segment.emotionHoldMs ?? 0,
      segment.facialHoldMs ?? 0,
      segment.actionHoldMs ?? 0,
    ),
    prosody: {
      language: 'zh-CN' as const,
      pauseClass,
      phraseBoundary,
      contour,
      emphasisWord: null,
      emphasisStrength: Number(Math.max(0, Math.min(1, segment.prosodyWeight ?? 0.5)).toFixed(2)),
      tempoShift: 0,
    },
  }
}

function trimmedPauseClass(text: string) {
  const trimmed = text.trim()
  if (trimmed.endsWith('？') || trimmed.endsWith('?'))
    return 'question' as const
  if (trimmed.endsWith('！') || trimmed.endsWith('!'))
    return 'exclaim' as const
  if (trimmed.endsWith('。') || trimmed.endsWith('.'))
    return 'full-stop' as const
  if (trimmed.endsWith('，') || trimmed.endsWith(','))
    return 'comma' as const
  if (trimmed.endsWith('、'))
    return 'enumeration' as const
  return 'none' as const
}

export function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error != null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'finish'
    || eventType === 'error'
}

export function buildCompressedNativeImageDataUrl(input: {
  image: NativeImage
  maxWidth: number
  maxHeight: number
  jpegQuality: number
}) {
  const maybeImage = input.image as NativeImage & {
    isEmpty?: () => boolean
    getSize?: () => { width: number, height: number }
    resize?: (options: { width: number, height: number, quality?: string }) => NativeImage
    toJPEG?: (quality: number) => Buffer
    toDataURL?: () => string
  }
  if (typeof maybeImage.isEmpty !== 'function'
    || typeof maybeImage.getSize !== 'function'
    || typeof maybeImage.resize !== 'function'
    || typeof maybeImage.toJPEG !== 'function') {
    return typeof maybeImage.toDataURL === 'function'
      ? maybeImage.toDataURL()
      : ''
  }

  if (maybeImage.isEmpty())
    return ''

  const originalSize = maybeImage.getSize()
  const widthRatio = input.maxWidth > 0 ? input.maxWidth / Math.max(1, originalSize.width) : 1
  const heightRatio = input.maxHeight > 0 ? input.maxHeight / Math.max(1, originalSize.height) : 1
  const scale = Math.min(1, widthRatio, heightRatio)
  const targetWidth = Math.max(1, Math.round(originalSize.width * scale))
  const targetHeight = Math.max(1, Math.round(originalSize.height * scale))
  const resized = scale < 1
    ? maybeImage.resize({
        width: targetWidth,
        height: targetHeight,
        quality: 'better',
      })
    : maybeImage

  const jpeg = resized.toJPEG(input.jpegQuality)
  if (!jpeg || jpeg.length === 0)
    return ''

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

export function messageContainsVisualInput(messages: Message[]) {
  return messages.some(message =>
    Array.isArray(message.content)
    && message.content.some((part: any) => part?.type === 'image_url'),
  )
}

export function latestUserMessageContainsVisualInput(messages: Message[]) {
  const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')
  if (!latestUserMessage || !Array.isArray(latestUserMessage.content))
    return false
  return latestUserMessage.content.some((part: any) => part?.type === 'image_url')
}

export function readStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function sanitizePerformanceManifest(raw: unknown): CharacterPerformanceCapabilitiesManifest | null {
  return sanitizeCharacterPerformanceManifest(raw)
}

export function parsePerformanceManifestFromMeta(raw: string | undefined): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw)
    return null

  try {
    return sanitizePerformanceManifest(JSON.parse(raw))
  }
  catch {
    return null
  }
}

export function buildDefaultDialoguePerformancePayload(
  baseEmotion: AlicizationEmotion,
  overrides?: Partial<Pick<AlicizationDialoguePerformancePayload, 'facialCue' | 'actionCue' | 'delivery' | 'emphasis'>>,
) {
  const defaults: Record<AlicizationEmotion, { delivery: AlicizationDialoguePerformancePayload['delivery'], emphasis: 0 | 1 | 2 }> = {
    neutral: { delivery: 'calm', emphasis: 0 },
    happy: { delivery: 'energetic', emphasis: 1 },
    sad: { delivery: 'gentle', emphasis: 0 },
    angry: { delivery: 'firm', emphasis: 2 },
    concerned: { delivery: 'gentle', emphasis: 1 },
    tired: { delivery: 'calm', emphasis: 0 },
    apologetic: { delivery: 'hesitant', emphasis: 0 },
    surprised: { delivery: 'energetic', emphasis: 2 },
    thinking: { delivery: 'hesitant', emphasis: 0 },
  }
  const fallback = defaults[baseEmotion] ?? defaults.neutral

  return normalizeAlicizationPerformancePayload({
    baseEmotion,
    facialCue: overrides?.facialCue ?? null,
    actionCue: overrides?.actionCue ?? null,
    delivery: overrides?.delivery ?? fallback.delivery,
    emphasis: overrides?.emphasis ?? fallback.emphasis,
  }, baseEmotion)
}

export function alignDialoguePerformanceEmotion(
  performance: unknown,
  emotion: AlicizationEmotion,
): AlicizationDialoguePerformancePayload {
  const normalized = normalizeAlicizationPerformancePayload(performance, emotion)
  return {
    ...normalized,
    baseEmotion: emotion,
    emotion,
  }
}

function areDialoguePerformancesEqual(
  left: AlicizationDialoguePerformancePayload,
  right: AlicizationDialoguePerformancePayload,
) {
  return left.baseEmotion === right.baseEmotion
    && left.delivery === right.delivery
    && left.emphasis === right.emphasis
    && (left.actionCue ?? null) === (right.actionCue ?? null)
    && (left.facialCue ?? null) === (right.facialCue ?? null)
}

function resolveResidentFallbackDialoguePerformance(
  performance: AlicizationDialoguePerformancePayload,
  residentPerformance?: AlicizationDialoguePerformancePayload | null,
) {
  const candidate = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
  if (!residentPerformance)
    return candidate

  const resident = normalizeAlicizationPerformancePayload(
    residentPerformance,
    residentPerformance.baseEmotion,
  )
  const candidateSparse = !candidate.actionCue || !candidate.facialCue
  const candidateNeutralBaseline = candidate.baseEmotion === 'neutral'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  if (!candidateSparse && !candidateNeutralBaseline)
    return candidate

  const mergedEmotion = candidateNeutralBaseline
    ? resident.baseEmotion
    : candidate.baseEmotion

  return normalizeAlicizationPerformancePayload({
    baseEmotion: mergedEmotion,
    emotion: mergedEmotion,
    facialCue: candidate.facialCue ?? resident.facialCue ?? null,
    actionCue: candidate.actionCue ?? resident.actionCue ?? null,
    delivery: candidateNeutralBaseline ? resident.delivery : candidate.delivery,
    emphasis: candidateNeutralBaseline ? resident.emphasis : candidate.emphasis,
  }, mergedEmotion)
}

function applyDialoguePerformanceSeedToEmbodiment(
  embodiment: AlicizationDialogueEmbodimentEnvelope,
  seededPerformance: AlicizationDialoguePerformancePayload,
): AlicizationDialogueEmbodimentEnvelope {
  const normalizedSeeded = normalizeAlicizationPerformancePayload(
    seededPerformance,
    seededPerformance.baseEmotion,
  )
  if (
    embodiment.emotion === normalizedSeeded.baseEmotion
    && areDialoguePerformancesEqual(embodiment.performance, normalizedSeeded)
  ) {
    return embodiment
  }

  return {
    ...embodiment,
    emotion: normalizedSeeded.baseEmotion,
    performance: {
      ...normalizedSeeded,
      baseEmotion: normalizedSeeded.baseEmotion,
      emotion: normalizedSeeded.baseEmotion,
    },
  }
}

function mergeAuthoritativeDigitalLifeFace(
  provided: AlicizationDigitalLifeEnvelope['face'],
  authoritative: AlicizationDigitalLifeEnvelope['face'],
) {
  return {
    ...provided,
    emotion: authoritative.emotion,
    facialCue: authoritative.facialCue,
    expressionMode: authoritative.expressionMode,
    rendererHints: provided.rendererHints ?? authoritative.rendererHints,
  }
}

function mergeAuthoritativeDigitalLifeAction(
  provided: AlicizationDigitalLifeEnvelope['action'],
  authoritative: AlicizationDigitalLifeEnvelope['action'],
) {
  return {
    ...provided,
    actionCue: authoritative.actionCue,
    actionMode: authoritative.actionMode,
    rendererHints: provided.rendererHints ?? authoritative.rendererHints,
  }
}

function reconcileProvidedDigitalLifeWithAuthority(input: {
  provided: AlicizationDigitalLifeEnvelope
  authoritative: AlicizationDigitalLifeEnvelope
}): AlicizationDigitalLifeEnvelope {
  const authoritativeFrames = input.authoritative.frames
  const providedFrames = input.provided.frames
  const providedFrameById = new Map(providedFrames.map(frame => [frame.id, frame] as const))

  return {
    ...input.provided,
    version: input.authoritative.version,
    variationToken: input.authoritative.variationToken,
    emotion: input.authoritative.emotion,
    mode: input.authoritative.mode,
    postureHint: input.authoritative.postureHint,
    performance: input.authoritative.performance,
    speechStyle: input.authoritative.speechStyle,
    rendererHints: input.provided.rendererHints ?? input.authoritative.rendererHints,
    face: mergeAuthoritativeDigitalLifeFace(input.provided.face, input.authoritative.face),
    action: mergeAuthoritativeDigitalLifeAction(input.provided.action, input.authoritative.action),
    frames: authoritativeFrames.map((authoritativeFrame, index) => {
      const providedFrame = providedFrameById.get(authoritativeFrame.id) ?? providedFrames[index]
      if (!providedFrame)
        return authoritativeFrame

      return {
        ...providedFrame,
        id: authoritativeFrame.id,
        index: authoritativeFrame.index,
        startOffset: authoritativeFrame.startOffset,
        endOffset: authoritativeFrame.endOffset,
        text: authoritativeFrame.text,
        mode: authoritativeFrame.mode,
        interruptPolicy: authoritativeFrame.interruptPolicy,
        settleMode: authoritativeFrame.settleMode,
        face: mergeAuthoritativeDigitalLifeFace(providedFrame.face, authoritativeFrame.face),
        action: mergeAuthoritativeDigitalLifeAction(providedFrame.action, authoritativeFrame.action),
      }
    }),
  }
}

export interface AlicizationChatStreamEmbodimentMeta {
  governance: AlicizationMindTurnGovernance | null
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript']
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDialogueStructuredPayload['digitalLife']
}

function resolveEmbodimentScriptRendererTarget(
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
) {
  return performanceManifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
}

function buildRuntimeGovernanceEmbodimentScript(input: {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentMode: 'dialogue' | 'idle-recovering'
}) {
  if (!input.speechTimeline)
    return null

  return normalizeAlicizationEmbodimentScript({
    version: 'embodiment-script-v1',
    decisionTraceId: input.decisionTraceId ?? null,
    turnId: input.turnId,
    rendererTarget: resolveEmbodimentScriptRendererTarget(input.performanceManifest),
    replyText: input.replyText,
    state: {
      baseEmotion: input.performance.baseEmotion,
      delivery: input.performance.delivery,
      emphasis: input.performance.emphasis,
      residentMode: input.residentMode,
    },
    speechPlan: {
      segments: input.speechTimeline.segments.map(segment => ({
        id: segment.id,
        index: segment.index,
        text: segment.text,
        interruptPolicy: segment.interruptMode === 'hard-interrupt' ? 'hard-stop' : 'soft-settle',
        preRollMs: segment.actionWindow === 'segment-start'
          ? 40
          : segment.actionWindow === 'cadence-peak'
            ? 20
            : 0,
        settleMs: Math.max(
          120,
          segment.emotionHoldMs ?? 0,
          segment.facialHoldMs ?? 0,
          segment.actionHoldMs ?? 0,
        ),
      })),
      interruptPolicy: input.speechTimeline.segments.some(segment => segment.interruptMode === 'hard-interrupt')
        ? 'hard-stop'
        : 'soft-settle',
      preRollMs: input.speechTimeline.segments.some(segment => segment.actionWindow === 'segment-start') ? 40 : 0,
      settleMs: input.speechTimeline.segments.reduce((max, segment) => {
        return Math.max(max, segment.emotionHoldMs ?? 0, segment.facialHoldMs ?? 0, segment.actionHoldMs ?? 0)
      }, 120),
    },
    facePlan: {
      preUtteranceCue: null,
      postUtteranceCue: null,
      speakingCues: input.speechTimeline.segments.map(segment => buildAlicizationEmbodimentFaceCue({
        segment: buildRuntimeGovernanceEmbodimentSpeechSegment(segment),
        timelineSegment: segment,
        fallbackEmotion: input.performance.baseEmotion,
        fallbackFacialCue: input.performance.facialCue ?? null,
        fallbackIntensity: 0.5,
      })),
    },
    motionPlan: {
      idleBase: input.performance.actionCue ?? 'idle_settle',
      actionBursts: input.speechTimeline.segments.map(segment => buildAlicizationEmbodimentMotionBurst({
        segment: buildRuntimeGovernanceEmbodimentSpeechSegment(segment),
        timelineSegment: segment,
        fallbackActionCue: input.performance.actionCue ?? null,
        fallbackIntensity: 0,
      })),
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: input.performanceManifest?.supportsVisemeLipSync === true ? 'energy-phoneme-hybrid' : 'energy-only',
      visemeHints: input.performanceManifest?.supportsVisemeLipSync === true
        ? input.speechTimeline.segments.flatMap(segment => buildAlicizationEmbodimentLipSyncHints({
            segment: buildRuntimeGovernanceEmbodimentSpeechSegment(segment),
            timelineSegment: segment,
          }))
        : undefined,
    },
  })
}

export function buildAlicizationChatStreamEmbodimentMeta(input: {
  governance?: unknown
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  reply?: string
  thought?: string
  turnId?: string
}): AlicizationChatStreamEmbodimentMeta {
  const governance = normalizeMindTurnGovernance(input.governance)
  if (!governance) {
    return {
      governance: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
    }
  }

  const reply = readStringValue(input.reply).trim()
  const thought = readStringValue(input.thought).trim()
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    governance,
    performanceManifest: input.performanceManifest,
    reply,
    thought,
    turnId: input.turnId,
  })
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    resolvedEmbodiment.performance,
    input.residentPerformance?.performance,
  )
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  const speechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    performanceManifest: input.performanceManifest,
  })
  const embodimentScript = buildRuntimeGovernanceEmbodimentScript({
    decisionTraceId: governance.decisionTraceId ?? null,
    turnId: input.turnId ?? 'unknown-turn',
    replyText: reply,
    performance: embodiment.performance,
    speechTimeline,
    performanceManifest: input.performanceManifest,
    residentMode: 'dialogue',
  })

  return {
    governance,
    embodiment,
    embodimentScript,
    speechTimeline,
    digitalLife: buildAlicizationDigitalLifeEnvelope({
      embodiment,
      speechTimeline,
      digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine),
      performanceManifest: input.performanceManifest,
    }),
  }
}

export function normalizeProactiveMetadata(raw: unknown): AlicizationProactiveMetadata | undefined {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  if (!candidate)
    return undefined
  const scenario = typeof candidate?.scenario === 'string'
    && ['coding', 'media', 'late-night-care', 'general'].includes(candidate.scenario)
    ? candidate.scenario as AlicizationProactiveMetadata['scenario']
    : null
  const style = typeof candidate?.style === 'string'
    && ['silent-observe', 'light-nudge', 'gentle-care', 'firm-warning'].includes(candidate.style)
    ? candidate.style as AlicizationProactiveMetadata['style']
    : null
  const urgency = typeof candidate?.urgency === 'string'
    && ['low', 'medium', 'high'].includes(candidate.urgency)
    ? candidate.urgency as AlicizationProactiveMetadata['urgency']
    : null
  if (!scenario || !style || !urgency)
    return undefined

  const rawReasonCodes = Array.isArray(candidate.reasonCodes) ? candidate.reasonCodes : []
  const staticReasonCodes = new Set<AlicizationProactiveStaticReasonCode>([
    'busy-host',
    'fullscreen-host',
    'kill-switch-suspended',
    'global-cooldown-active',
    'attention-anchor-active',
    'recent-observation-memory',
    'invited-inspection-active',
    'scenario-bias-raised',
    'recent-ignored-penalty',
    'recent-dismiss-penalty',
    'recent-positive-feedback',
    'cadence-opening-ready',
    'cadence-initiative-trust',
    'cadence-pressure-rising',
    'coding-focus',
    'media-playback',
    'late-night-activity',
    'late-night-fatigue',
    'high-loneliness',
    'high-boredom',
    'user-idle',
    'foreground-error',
    'foreground-diff',
    'reminder-backlog',
    'afterglow-opening',
    'durability-pulse',
    'durability-process-gone',
    'durability-anr-likely',
    'private-thought-observe-only',
    'private-thought-uncertain',
    'belief-tentative',
    'belief-contradicted',
    'inquiry-open',
    'relationship-guarded',
    'relationship-attuned',
    'relationship-correction-sensitive',
    'living-world-open-loop',
    'governor-withhold',
    'governor-repair',
    'governor-care',
    'thought-thread-ripe',
    'thought-thread-waiting',
    'watch-mode-symbiotic',
    'watch-mode-invited-inspection',
    'watch-mode-recovering',
    'runtime-dialogue-ready',
    'runtime-observe-dominant',
    'runtime-control-ready',
    'runtime-continuity-pressure',
    'runtime-companionship-pressure',
    'continuity-internal-only',
    'continuity-after-payoff',
    'continuity-next-open-window',
    'continuity-execution-callback',
    'relationship-cadence-residue',
    'relationship-residue-delay-warmth',
    'relationship-residue-protect-rest',
  ])
  const reasonCodes = rawReasonCodes
    .filter((reasonCode): reasonCode is AlicizationProactiveMetadata['reasonCodes'][number] => {
      if (typeof reasonCode !== 'string')
        return false
      if (staticReasonCodes.has(reasonCode as AlicizationProactiveStaticReasonCode))
        return true
      if (/^learning:(record|reflect|verify|revise|internalize|hold)$/u.test(reasonCode))
        return true
      if (reasonCode.startsWith('learning-focus:')) {
        const focus = readStringValue(reasonCode.slice('learning-focus:'.length)).trim()
        return focus.length > 0
      }
      return false
    })

  const confidence = Number(candidate.confidence)
  const cooldownMs = Number(candidate.cooldownMs)
  const feedbackWindowMs = Number(candidate.feedbackWindowMs)
  const policyVersion = readStringValue(candidate.policyVersion).trim()
  const openingGuidance = readStringValue(candidate.openingGuidance).trim()
  if (!policyVersion || !Number.isFinite(confidence) || !Number.isFinite(cooldownMs) || !Number.isFinite(feedbackWindowMs))
    return undefined

  return {
    shouldInterrupt: candidate.shouldInterrupt === true,
    confidence: Number(clamp01(confidence).toFixed(2)),
    reasonCodes,
    urgency,
    style,
    cooldownMs: Math.max(1_000, Math.floor(cooldownMs)),
    scenario,
    policyVersion,
    feedbackWindowMs: Math.max(1_000, Math.floor(feedbackWindowMs)),
    openingGuidance: openingGuidance || null,
  }
}

export const mindTurnSpineMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const

export function hasMindTurnSpine(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false
  return mindTurnSpineMarkers.every(marker => normalized.includes(marker))
}

export function normalizeMindTurnGovernance(raw: unknown): AlicizationMindTurnGovernance | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const turnMode = readStringValue(candidate.turnMode).trim()
  const truthState = readStringValue(candidate.truthState).trim()
  const personaKernelMode = readStringValue(candidate.personaKernelMode).trim()
  const openingStyle = readStringValue(candidate.openingStyle).trim()
  const relationshipPosture = readStringValue(candidate.relationshipPosture).trim()
  const repairState = readStringValue(candidate.repairState).trim()
  if (
    ![
      'grounded-inspection',
      'screen-repair',
      'guide-current-knot',
      'care',
      'accompany',
      'answer',
    ].includes(turnMode)
    || !['live-grounded', 'live-observed', 'dialogue-grounded', 'remembered', 'imagined', 'uncertain'].includes(truthState)
    || !['full', 'backgrounded', 'muted'].includes(personaKernelMode)
    || ![
      'direct-observation',
      'direct-correction',
      'direct-answer',
      'gentle-care',
      'light-accompaniment',
    ].includes(openingStyle)
    || !['restrained', 'warm', 'tender'].includes(relationshipPosture)
    || !['none', 'stale-anchor', 'need-reground'].includes(repairState)
  ) {
    return null
  }

  const answerAct = readStringValue(candidate.answerAct).trim()
  const evidenceMode = readStringValue(candidate.evidenceMode).trim()
  const visibleReplyAuthority = readStringValue(candidate.visibleReplyAuthority).trim()
  const mindMode = readStringValue(candidate.mindMode).trim()
  const embodiedPresence = readStringValue(candidate.embodiedPresence).trim()
  const emotionalTension = readStringValue(candidate.emotionalTension).trim()
  const answerSubject = readStringValue(candidate.answerSubject).trim()
  const screenReferenceMode = readStringValue(candidate.screenReferenceMode).trim()
  const maxSentences = Number(candidate.maxSentences)
  const mustDo = Array.isArray(candidate.mustDo)
    ? candidate.mustDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const mustNotDo = Array.isArray(candidate.mustNotDo)
    ? candidate.mustNotDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const dialogueActKernel = normalizeDialogueActKernel(candidate.dialogueActKernel)
  const mindTurnFrame = normalizeMindTurnFrame(candidate.mindTurnFrame)
  const claimEvidence = normalizeClaimEvidenceLedger(candidate.claimEvidence)
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(candidate.decisionTraceId)

  return {
    decisionTraceId: decisionTraceId || null,
    turnMode: turnMode as AlicizationMindTurnGovernance['turnMode'],
    truthState: truthState as AlicizationMindTurnGovernance['truthState'],
    visibleReplyAuthority: visibleReplyAuthority
      ? normalizeAlicizationNormalVisibleReplyAuthority(visibleReplyAuthority as any, 'llm-mind')
      : null,
    groundedThisTurn: candidate.groundedThisTurn === true,
    personaKernelMode: personaKernelMode as AlicizationMindTurnGovernance['personaKernelMode'],
    openingStyle: openingStyle as AlicizationMindTurnGovernance['openingStyle'],
    relationshipPosture: relationshipPosture as AlicizationMindTurnGovernance['relationshipPosture'],
    answerSubject: [
      'alicization-self',
      'relationship',
      'host-state',
      'task-knot',
      'visible-scene',
      'general',
    ].includes(answerSubject)
      ? answerSubject as AlicizationMindTurnGovernance['answerSubject']
      : null,
    screenReferenceMode: [
      'required',
      'helpful',
      'incidental',
      'avoid',
    ].includes(screenReferenceMode)
      ? screenReferenceMode as AlicizationMindTurnGovernance['screenReferenceMode']
      : null,
    answerAct: [
      'answer',
      'guide',
      'ask-reground',
      'correct-stale-anchor',
      'care',
      'defer',
    ].includes(answerAct)
      ? answerAct as AlicizationMindTurnGovernance['answerAct']
      : null,
    evidenceMode: [
      'live-grounded',
      'live-observed',
      'coarse-held',
      'dialogue-grounded',
      'continuity-carry',
      'repair-first',
    ].includes(evidenceMode)
      ? evidenceMode as AlicizationMindTurnGovernance['evidenceMode']
      : null,
    repairState: repairState as AlicizationMindTurnGovernance['repairState'],
    liveSurface: sanitizeBriefText(readStringValue(candidate.liveSurface), 220) || null,
    focusAnchor: sanitizeBriefText(readStringValue(candidate.focusAnchor), 220) || null,
    answerIntent: sanitizeBriefText(readStringValue(candidate.answerIntent), 220) || null,
    openingMove: sanitizeBriefText(readStringValue(candidate.openingMove), 220) || null,
    carriedThread: sanitizeBriefText(readStringValue(candidate.carriedThread), 220) || null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    labelCarryAsMemory: candidate.labelCarryAsMemory === true,
    shouldAskForGrounding: candidate.shouldAskForGrounding === true,
    shouldAcknowledgeRepair: candidate.shouldAcknowledgeRepair === true,
    maxSentences: Number.isFinite(maxSentences)
      ? Math.max(1, Math.min(4, Math.floor(maxSentences)))
      : 2,
    mindMode: [
      'orienting',
      'tracking',
      'repairing',
      'accompanying',
      'guarding',
      'resting',
    ].includes(mindMode)
      ? mindMode as AlicizationMindTurnGovernance['mindMode']
      : null,
    embodiedPresence: [
      'none',
      'glance',
      'attentive',
      'hesitant',
      'concerned',
    ].includes(embodiedPresence)
      ? embodiedPresence as AlicizationMindTurnGovernance['embodiedPresence']
      : undefined,
    emotionalTension: [
      'tense-debug',
      'focused-flow',
      'soft-covision',
      'late-night-drain',
      'restless-switching',
      'calm-browse',
    ].includes(emotionalTension)
      ? emotionalTension as AlicizationMindTurnGovernance['emotionalTension']
      : undefined,
    dialogueActKernel,
    mindTurnFrame,
    claimEvidence,
    mustDo,
    mustNotDo,
  }
}

export function sanitizeMindThoughtToken(raw: string | null | undefined, fallback: string) {
  const normalized = sanitizeBriefText(raw ?? '', 64).toLowerCase().replace(/\s+/g, '-')
  return normalized || fallback
}

export function resolveMindGovernanceObligation(governance: AlicizationMindTurnGovernance) {
  switch (governance.answerAct ?? governance.mindTurnFrame?.obligation.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

export function resolveMindGovernanceTruth(governance: AlicizationMindTurnGovernance) {
  if (governance.groundedThisTurn === true)
    return 'grounded'

  switch (governance.mindTurnFrame?.world.truthState ?? governance.truthState) {
    case 'live-grounded':
    case 'dialogue-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

export function resolveMindGovernanceTone(governance: AlicizationMindTurnGovernance) {
  switch (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
  }
}

export function resolveMindGovernanceEmotion(governance: AlicizationMindTurnGovernance, rawEmotion: string) {
  const normalized = normalizeAlicizationEmotion(rawEmotion).emotion
  if (governance.repairState === 'stale-anchor')
    return 'apologetic' as const
  if (governance.repairState === 'need-reground')
    return 'thinking' as const
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned' as const
  if (
    governance.answerAct === 'guide'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
  ) {
    return normalized === 'neutral' ? 'thinking' : normalized
  }
  if (normalized !== 'neutral')
    return normalized
  return (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) === 'tender'
    ? 'concerned'
    : 'neutral'
}

export function buildGovernedMindThought(governance: AlicizationMindTurnGovernance, payload: AlicizationConversationTurnInput) {
  const focus = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.mindTurnFrame?.memory.carriedThread
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface)
    || governance.answerIntent
    || governance.carriedThread
    || payload.userText,
    'current-user-turn',
  )
  const move = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.obligation.openingMove
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.openingMove
    || governance.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface),
    'stabilize-and-answer',
  )
  return [
    `obligation=${resolveMindGovernanceObligation(governance)}`,
    `truth=${resolveMindGovernanceTruth(governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveMindGovernanceTone(governance)}`,
  ].join('; ')
}

export function readMindThoughtMarker(thought: string, marker: 'obligation=' | 'truth=' | 'tone=') {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = thought.match(new RegExp(`${escapedMarker}\\s*([^;\\n]+)`, 'i'))
  return match?.[1]?.trim().toLowerCase() ?? ''
}

export function thoughtConflictsWithMindGovernance(thought: string, governance: AlicizationMindTurnGovernance) {
  if (!hasMindTurnSpine(thought))
    return true

  return readMindThoughtMarker(thought, 'obligation=') !== resolveMindGovernanceObligation(governance)
    || readMindThoughtMarker(thought, 'truth=') !== resolveMindGovernanceTruth(governance)
    || (
      (governance.relationshipPosture === 'restrained' || governance.repairState !== 'none')
      && readMindThoughtMarker(thought, 'tone=') !== resolveMindGovernanceTone(governance)
    )
}

export {
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
}

export const translateGovernedMindFallback = translateGovernedMindFallbackShared

export type DialogueScriptFamily = 'none' | 'mixed' | 'cjk' | 'cyrillic' | 'latin'

export function countScriptCharacters(raw: string, pattern: RegExp) {
  return raw.match(pattern)?.length ?? 0
}

export function inferDominantDialogueScript(raw: unknown): DialogueScriptFamily {
  const normalized = sanitizeBriefText(readStringValue(raw), 1_200)
  if (!normalized)
    return 'none'

  const cjkCount = countScriptCharacters(normalized, /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/gu)
  const cyrillicCount = countScriptCharacters(normalized, /[\u0400-\u04FF]/gu)
  const latinCount = countScriptCharacters(normalized, /[A-Z]/gi)
  const total = cjkCount + cyrillicCount + latinCount
  if (total < 6)
    return 'none'

  const ranked = [
    { family: 'cjk', count: cjkCount },
    { family: 'cyrillic', count: cyrillicCount },
    { family: 'latin', count: latinCount },
  ].sort((left, right) => right.count - left.count)
  const primary = ranked[0]
  const secondary = ranked[1]
  if (!primary || primary.count === 0)
    return 'none'
  if (primary.count / total < 0.56)
    return 'mixed'
  if (secondary && secondary.count > 0 && (primary.count / secondary.count) < 1.35)
    return 'mixed'
  return primary.family as DialogueScriptFamily
}

export function countLatinWordTokens(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

export function replyScriptMismatchesUserTurn(input: {
  userText?: string
  reply: string
}) {
  const userText = sanitizeBriefText(input.userText ?? '', 480)
  const reply = sanitizeBriefText(input.reply, 1_400)
  if (!userText || !reply)
    return false

  const userScript = inferDominantDialogueScript(userText)
  const replyScript = inferDominantDialogueScript(reply)
  if (userScript === 'none' || userScript === 'mixed')
    return false
  if (replyScript === 'none' || replyScript === 'mixed')
    return false
  if (userScript === replyScript)
    return false

  const replyLength = [...reply].length
  if (replyLength < 18)
    return false

  const userLatinWords = countLatinWordTokens(userText)
  const replyLatinWords = countLatinWordTokens(reply)

  if (userScript === 'cjk' && replyScript === 'latin')
    return replyLatinWords >= 6 && userLatinWords <= 6
  if (userScript === 'cyrillic' && replyScript === 'latin')
    return replyLatinWords >= 6
  if (userScript === 'latin' && (replyScript === 'cjk' || replyScript === 'cyrillic'))
    return countLatinWordTokens(userText) >= 4

  return true
}

export {
  analyzeDialogueFirstVisibleReply,
  analyzeUnsupportedTechnicalSpecificity,
  clauseMentionsCue,
  collectAllowedTechnicalSpecificityCues,
  dialogueFirstProcessOnlyReplyPattern,
  dialogueFirstRoleplayPrefacePattern,
  dialogueFirstStaleCarryClausePattern,
  extractForeignTechnicalReplyCues,
  normalizeGovernedAnchorText,
  repairDialogueFirstVisibleReply,
  replyIncludesAnchorCue,
  replyLooksProcessOnlyRepairShell,
  splitDialogueReplyClauses,
  technicalSpecificityCueMatches,
  uniqueTechnicalSpecificityCues,
}

export function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

function summarizeMindTurnEventDigitalLifeSpine(raw: unknown) {
  const spine = normalizeAlicizationDigitalLifeSpineDigest(raw)
  if (!spine)
    return null

  return {
    version: spine.version,
    runtime: {
      watchMode: spine.runtime.watchMode,
      sceneScenario: spine.runtime.sceneScenario,
      activeThreadId: spine.runtime.activeThreadId,
      dominantMode: spine.runtime.dominantMode,
      answerIntent: spine.runtime.answerIntent,
      selectedAction: spine.runtime.selectedAction,
      updatedAt: spine.runtime.updatedAt,
    },
    architecture: spine.architecture
      ? {
          operatingMode: spine.architecture.operatingMode,
          dominantSystem: spine.architecture.dominantSystem,
          supportingSystems: spine.architecture.supportingSystems,
        }
      : null,
    proactive: spine.proactive
      ? {
          selectedAction: spine.proactive.selectedAction,
          preferredStyle: spine.proactive.preferredStyle,
          confidence: spine.proactive.confidence,
          shouldSpeak: spine.proactive.shouldSpeak,
          dominantConcernKind: spine.proactive.dominantConcernKind,
          leadingGoalId: spine.proactive.leadingGoalId,
        }
      : null,
    memory: spine.memory
      ? {
          recallMode: spine.memory.recallMode,
          recallSeed: excerptGovernedReply(spine.memory.recallSeed, 64),
          leadingGoalSummary: excerptGovernedReply(spine.memory.leadingGoalSummary, 120),
          thoughtThreadSummary: excerptGovernedReply(spine.memory.thoughtThreadSummary, 120),
        }
      : null,
    continuitySignal: spine.continuitySignal
      ? {
          signature: excerptGovernedReply(spine.continuitySignal.signature, 120),
          watchMode: spine.continuitySignal.watchMode,
          sceneScenario: spine.continuitySignal.sceneScenario,
          dominantMode: spine.continuitySignal.dominantMode,
          answerIntent: spine.continuitySignal.answerIntent,
        }
      : null,
  }
}

export interface AlicizationGovernanceAnchorAuditCandidate {
  role: 'focus' | 'visible-surface' | 'scene' | 'opening-claim' | 'answer-intent' | 'project' | 'thread' | 'carry'
  text: string
}

export function collectGovernanceAnchorAuditCandidates(governance: AlicizationMindTurnGovernance): AlicizationGovernanceAnchorAuditCandidate[] {
  const candidates: Array<{ role: AlicizationGovernanceAnchorAuditCandidate['role'], text: unknown }> = [
    { role: 'focus', text: governance.focusAnchor },
    { role: 'focus', text: governance.mindTurnFrame?.focusAnchor },
    { role: 'visible-surface', text: governance.liveSurface },
    { role: 'visible-surface', text: governance.mindTurnFrame?.world.visibleSurface },
    { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
    { role: 'opening-claim', text: governance.dialogueActKernel?.openingClaim ?? governance.mindTurnFrame?.obligation.openingClaim },
    { role: 'answer-intent', text: governance.answerIntent },
    { role: 'answer-intent', text: governance.mindTurnFrame?.obligation.answerIntent },
    { role: 'project', text: governance.dialogueActKernel?.activeProject },
    { role: 'thread', text: governance.mindTurnFrame?.memory.carriedThread },
    { role: 'carry', text: governance.carriedThread },
  ]

  const result: AlicizationGovernanceAnchorAuditCandidate[] = []
  for (const candidate of candidates) {
    const normalized = sanitizeDialogueAnchorText(candidate.text, 220)
    if (!normalized)
      continue
    if (result.some(item => item.role === candidate.role && item.text === normalized))
      continue
    result.push({
      role: candidate.role,
      text: normalized,
    })
  }
  return result
}

export function summarizeGovernanceAnchorAuditCandidates(candidates: AlicizationGovernanceAnchorAuditCandidate[]) {
  return candidates.map(candidate => `${candidate.role}:${candidate.text}`)
}

export function replyUsesWeakGroundedSceneCue(reply: string, governance: AlicizationMindTurnGovernance) {
  if (governance.screenReferenceMode === 'avoid')
    return false

  const answerSubject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  const screenCentricTurn = answerSubject === 'task-knot'
    || answerSubject === 'visible-scene'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
  if (!screenCentricTurn)
    return false

  const weakShellMentionedInReply = /\b(?:screen\s*\d+|display\s*\d*|window\s*\d*|workspace|desktop|current screen|current view|entire screen)\b/iu.test(reply)

  const weakCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.liveSurface,
    governance.mindTurnFrame?.focusAnchor,
    governance.mindTurnFrame?.world.visibleSurface,
    governance.mindTurnFrame?.obligation.openingClaim,
    governance.mindTurnFrame?.obligation.answerIntent,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.activeProject,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.dialogueActKernel?.mustSay[0],
  ]
    .map(candidate => sanitizeBriefText(readStringValue(candidate), 220))
    .filter(Boolean)
    .filter(candidate => isWeakAlicizationScreenSurfaceCue(candidate))

  const weakCueMentioned = weakCandidates.some(candidate => replyIncludesAnchorCue(reply, candidate))
  if (governance.groundedThisTurn === true)
    return weakShellMentionedInReply || weakCueMentioned

  const truthState = governance.mindTurnFrame?.world.truthState ?? governance.truthState
  const uncertainTruth = truthState === 'uncertain' || truthState === 'remembered' || truthState === 'imagined'
  return uncertainTruth && (weakShellMentionedInReply || weakCueMentioned)
}

export function reconcileMindGovernanceAnchors(governance: AlicizationMindTurnGovernance, userText?: string) {
  const anchorCandidatesBefore = collectGovernanceAnchorAuditCandidates(governance)
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: anchorCandidatesBefore,
  })
  const dominantAnchor = coherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeDialogueAnchorText(value, 220) || null
    if (!normalized)
      return null
    if (!dominantAnchor || !coherence.sceneAuthority)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? null : normalized
  }
  const dialogueFirstTurn = governance.screenReferenceMode === 'avoid'

  const nextFocusAnchor = keepCoherent(dominantAnchor ?? governance.focusAnchor)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.mindTurnFrame?.world.visibleSurface)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.liveSurface)
    ?? sanitizeDialogueAnchorText(userText, 220)
    ?? null
  const nextAnswerIntent = keepCoherent(governance.mindTurnFrame?.obligation.answerIntent)
    ?? keepCoherent(governance.answerIntent)
    ?? nextFocusAnchor
  const nextCarriedThread = keepCoherent(governance.mindTurnFrame?.memory.carriedThread)
    ?? keepCoherent(governance.carriedThread)

  const nextMindTurnFrame = governance.mindTurnFrame
    ? {
        ...governance.mindTurnFrame,
        focusAnchor: nextFocusAnchor,
        memory: {
          ...governance.mindTurnFrame.memory,
          carriedThread: nextCarriedThread,
        },
        obligation: {
          ...governance.mindTurnFrame.obligation,
          answerIntent: nextAnswerIntent,
        },
        narrative: [
          ...governance.mindTurnFrame.narrative,
          ...coherence.reasonTags.filter(tag => !governance.mindTurnFrame?.narrative.includes(tag)),
        ].slice(0, 10),
      }
    : governance.mindTurnFrame

  const changed = nextFocusAnchor !== (governance.focusAnchor ?? null)
    || nextAnswerIntent !== (governance.answerIntent ?? null)
    || nextCarriedThread !== (governance.carriedThread ?? null)
    || nextMindTurnFrame?.focusAnchor !== governance.mindTurnFrame?.focusAnchor
    || nextMindTurnFrame?.memory.carriedThread !== governance.mindTurnFrame?.memory.carriedThread
    || nextMindTurnFrame?.obligation.answerIntent !== governance.mindTurnFrame?.obligation.answerIntent

  const nextGovernance = {
    ...governance,
    focusAnchor: nextFocusAnchor,
    answerIntent: nextAnswerIntent,
    carriedThread: nextCarriedThread,
    mindTurnFrame: nextMindTurnFrame,
    mustDo: [
      ...governance.mustDo,
      ...coherence.reasonTags
        .map(tag => `anchor:${tag}`)
        .filter(tag => !governance.mustDo.includes(tag)),
    ].slice(0, 8),
  } satisfies AlicizationMindTurnGovernance
  const anchorCandidatesAfter = collectGovernanceAnchorAuditCandidates(nextGovernance)

  return {
    governance: nextGovernance,
    coherence,
    changed,
    anchorCandidatesBefore,
    anchorCandidatesAfter,
  }
}

export function detectReplyConflictingAnchors(
  reply: string,
  governance: AlicizationMindTurnGovernance,
  preferredDominant?: string | null,
) {
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: [
      { role: 'focus', text: governance.focusAnchor },
      { role: 'answer-intent', text: governance.answerIntent },
      { role: 'carry', text: governance.carriedThread },
      { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'visible-surface', text: governance.liveSurface },
    ],
  })
  const dominantAnchor = sanitizeBriefText(readStringValue(preferredDominant ?? coherence.dominant), 220) || null
  if (!dominantAnchor)
    return { hasConflict: false, reason: '', coherence }

  const conflictingCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.carriedThread,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.liveSurface,
  ]
    .map((candidate) => {
      const normalized = typeof candidate === 'string' ? sanitizeBriefText(candidate, 220) : ''
      return normalized || null
    })
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => anchorsMateriallyConflict(candidate, dominantAnchor))
    .filter((candidate, index, items) => items.findIndex(item => item === candidate) === index)

  if (conflictingCandidates.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      coherence,
      dominantAnchor,
      conflictingCandidates: [] as string[],
      mentionedConflicts: [] as string[],
    }
  }

  const mentionsDominant = replyIncludesAnchorCue(reply, dominantAnchor)
  const mentionedConflicts = conflictingCandidates.filter(candidate => replyIncludesAnchorCue(reply, candidate))
  const hasConflict = mentionedConflicts.length > 0
    && (mentionsDominant || coherence.sceneAuthority || governance.groundedThisTurn === true)

  return {
    hasConflict,
    reason: hasConflict
      ? (coherence.sceneAuthority || governance.groundedThisTurn === true
          ? 'reply-split-brain-scene-thread'
          : 'reply-conflicting-anchors')
      : '',
    coherence,
    dominantAnchor,
    conflictingCandidates,
    mentionedConflicts,
  }
}

export function resolveGovernanceTurnOwner(governance?: AlicizationMindTurnGovernance | null) {
  if (!governance)
    return null
  if (governance.screenReferenceMode === 'avoid')
    return 'dialogue'

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  if (
    subject === 'task-knot'
    || subject === 'visible-scene'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'guide-current-knot'
  ) {
    return 'screen'
  }

  return 'dialogue'
}

export function isExplicitGovernanceRepairTurn(governance: AlicizationMindTurnGovernance) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
}

export function resolveGovernedFallbackPatternId(governance: AlicizationMindTurnGovernance, replyOverridden: boolean) {
  if (!replyOverridden)
    return 'none'
  if (governance.repairState === 'stale-anchor')
    return 'repair-stale-anchor'
  if (governance.repairState === 'need-reground')
    return 'repair-need-reground'
  if (governance.turnMode === 'guide-current-knot')
    return 'guide-current-knot'
  if (governance.turnMode === 'grounded-inspection')
    return 'grounded-inspection'
  if (governance.turnMode === 'care')
    return 'care'
  if (governance.turnMode === 'accompany')
    return 'accompany'
  return 'answer'
}

function buildGovernedVisibleReplyRewriteRequest(input: {
  shouldOverrideVisibleReply: boolean
  reasons: string[]
  coherentGovernance: AlicizationMindTurnGovernance
  fallbackPatternId: string
  openingGuidanceHoldDetail?: string | null
  renderedOverrideReply?: string | null
  governedSurfaceReply?: string | null
  candidateReply: string
  unsupportedCues: string[]
  conflictingCandidates: string[]
  droppedClauses: string[]
}) {
  if (!input.shouldOverrideVisibleReply)
    return null

  const mustPreserve = uniqueCarryAnchors([
    input.coherentGovernance.answerIntent ?? '',
    input.coherentGovernance.focusAnchor ?? '',
    input.coherentGovernance.dialogueActKernel?.openingClaim ?? '',
    input.coherentGovernance.mindTurnFrame?.obligation.openingClaim ?? '',
  ], 6)
  const mustDrop = uniqueCarryAnchors([
    ...input.unsupportedCues,
    ...input.conflictingCandidates,
    ...input.droppedClauses,
    input.renderedOverrideReply ?? '',
    input.governedSurfaceReply ?? '',
  ].filter(item => item && input.candidateReply.includes(item)), 10)
  if (input.reasons.some(reason => reason.startsWith('opening-guidance-')))
    mustDrop.push('same-her opening drift')
  const memoryTruthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.coherentGovernance.answerSubject ?? input.coherentGovernance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.coherentGovernance.screenReferenceMode ?? null,
    truthState: input.coherentGovernance.truthState,
    turnMode: input.coherentGovernance.turnMode,
    repairState: input.coherentGovernance.repairState,
    evidenceMode: input.coherentGovernance.evidenceMode ?? input.coherentGovernance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.coherentGovernance.labelCarryAsMemory,
    suppressAssociativeRecall: input.coherentGovernance.suppressAssociativeRecall,
    claimEvidenceLedger: input.coherentGovernance.claimEvidence ?? null,
  }).mode

  return {
    required: true,
    authority: 'llm-second-pass-rewrite' as const,
    reasonCodes: uniqueCarryAnchors(input.reasons, 12),
    mustPreserve,
    mustDrop,
    openingGuidanceHoldDetail: input.openingGuidanceHoldDetail ?? null,
    surfaceContract: input.coherentGovernance.answerIntent ?? input.coherentGovernance.openingMove ?? null,
    memoryTruthDiscipline,
    fallbackPatternId: input.fallbackPatternId,
  }
}

export function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    dialogueFirstLocalRepairMode?: 'compat-visible' | 'rewrite-request-only'
    visibleReplyOverrideMode?: 'compat-visible' | 'rewrite-request-only'
  },
) {
  const dialogueFirstLocalRepairMode = options?.dialogueFirstLocalRepairMode ?? 'compat-visible'
  const visibleReplyOverrideMode = options?.visibleReplyOverrideMode ?? 'rewrite-request-only'
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (input.origin === 'subconscious-proactive' || !governance)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = readStringValue(structuredPayload.reply).trim()
    || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  if (!reply)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const thought = readStringValue(structuredPayload.thought).trim()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: structuredPayload.format,
    contractFailed: structuredPayload.contractFailed === true,
    hasGovernance: true,
    origin: input.origin,
  })
  const format = formatResolution.format
  const parsePath = readStringValue(structuredPayload.parsePath).trim().toLowerCase()
  const dialogueActKernel = normalizeDialogueActKernel(
    structuredPayload.dialogueActKernel ?? governance.dialogueActKernel,
  )
  const ownerBefore = resolveGovernanceTurnOwner(governance)
  const resolvedGovernance = dialogueActKernel
    ? {
        ...governance,
        dialogueActKernel,
      }
    : governance
  const tracedGovernance = {
    ...resolvedGovernance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(resolvedGovernance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const governedAnchorRepair = reconcileMindGovernanceAnchors(tracedGovernance, input.userText)
  const anchorCoherentGovernance = {
    ...governedAnchorRepair.governance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(governedAnchorRepair.governance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const executionFirstGovernance = normalizeExecutionFirstGovernance({
    governance: coerceAlicizationGovernanceForMindFallback(anchorCoherentGovernance),
    userText: input.userText,
  })
  const coherentGovernance = (executionFirstGovernance.governance ?? anchorCoherentGovernance) as AlicizationMindTurnGovernance
  const fallbackGovernance = coerceAlicizationGovernanceForMindFallback(coherentGovernance)
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const thoughtConflict = thoughtConflictsWithMindGovernance(thought, coherentGovernance)
  const initialGovernedSurface = buildMindGovernedFallbackSurface({
    governance: fallbackGovernance,
    userText: input.userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
  })
  const strictGovernance = shouldForceGovernedMindSurface(coherentGovernance, input.userText)
  const initialDialogueFirstVisibleReply = analyzeDialogueFirstVisibleReply({
    reply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const preserveDialogueFirstVisibleReply = shouldPreserveDialogueFirstVisibleReply(coherentGovernance)
  const dialogueFirstRepairEvidence = preserveDialogueFirstVisibleReply
    ? repairDialogueFirstVisibleReply({
        reply,
        userText: input.userText,
        governance: coherentGovernance,
        analysis: initialDialogueFirstVisibleReply,
      })
    : {
        applied: false,
        reply,
        analysis: initialDialogueFirstVisibleReply,
        reason: null as string | null,
        droppedClauses: [] as string[],
      }
  const useDialogueFirstRepairAsVisibleCandidate = dialogueFirstLocalRepairMode === 'compat-visible'
  const candidateReply = useDialogueFirstRepairAsVisibleCandidate && dialogueFirstRepairEvidence.applied
    ? dialogueFirstRepairEvidence.reply
    : reply
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(candidateReply, coherentGovernance, input.userText)
  const executionSurfaceViolation = replyViolatesExecutionFirstSurface({
    reply: candidateReply,
    governance: coherentGovernance,
    userText: input.userText,
  })
  const weakGroundedSceneCue = replyUsesWeakGroundedSceneCue(candidateReply, coherentGovernance)
  const unsupportedTechnicalSpecificity = analyzeUnsupportedTechnicalSpecificity({
    reply: candidateReply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const openingGuidanceViolationReason = coherentGovernance.openingMove
    ? resolveAlicizationOpeningGuidanceViolationReason({
        reply: candidateReply,
        openingGuidance: coherentGovernance.openingMove,
      })
    : null
  const openingGuidanceHoldDetail = openingGuidanceViolationReason
    ? resolveAlicizationOpeningGuidanceHoldDetail({
        reply: candidateReply,
        openingGuidance: coherentGovernance.openingMove ?? '',
        openingGuidanceViolationReason,
      })
    : null
  const conflictingAnchors = detectReplyConflictingAnchors(
    candidateReply,
    coherentGovernance,
    governedAnchorRepair.coherence.dominant ?? coherentGovernance.focusAnchor,
  )
  const scriptMismatch = replyScriptMismatchesUserTurn({
    userText: input.userText,
    reply: candidateReply,
  })
  const dialogueFirstVisibleReply = useDialogueFirstRepairAsVisibleCandidate
    ? dialogueFirstRepairEvidence.analysis
    : initialDialogueFirstVisibleReply
  const dialogueFirstOverrideRequired = Boolean(
    preserveDialogueFirstVisibleReply
    && dialogueFirstVisibleReply.contaminated,
  )
  const governedSurface = dialogueFirstOverrideRequired
    ? buildMindGovernedFallbackSurface({
        governance: fallbackGovernance,
        userText: input.userText,
        translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
        forceDialogueAnswerFallback: true,
      })
    : initialGovernedSurface
  const dispatchOnlyVisibleOverride = governedSurface?.visibleReplyMode === 'dispatch-only'
  const thinGovernedShell = governedSurface
    ? replyLooksThinGovernedShell(candidateReply, governedSurface.reply, fallbackGovernance, governedSurface.thinShellCue)
    : false
  const coherentSceneReply = replyLooksCoherentSceneAnswer({
    reply: candidateReply,
    governance: fallbackGovernance,
    userText: input.userText,
  })
  const organicDirectReply = replyLooksOrganicDirectAnswer({
    reply: candidateReply,
    governance: fallbackGovernance,
    userText: input.userText,
    thinShellCue: governedSurface?.thinShellCue,
  })
  const hasMindThought = hasMindTurnSpine(thought)
  const missingMindThought = !hasMindThought
  const invalidFormat = format !== 'mind-turn-v1'
  const invalidParsePath = !['json', 'repair-json'].includes(parsePath)
  const contractFailed = structuredPayload.contractFailed === true
  const reasons = [
    contractFailed ? 'structured-contract-failed' : '',
    invalidFormat ? 'structured-format-repaired' : '',
    invalidParsePath ? 'structured-parsepath-repaired' : '',
    missingMindThought ? 'thought-missing-mind-spine' : '',
    thoughtConflict ? 'thought-governance-mismatch' : '',
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    executionFirstGovernance.applied ? 'execution-first-governance-override' : '',
    dispatchOnlyVisibleOverride ? 'execution-first-dispatch-hidden' : '',
    dialogueFirstRepairEvidence.applied
      ? (useDialogueFirstRepairAsVisibleCandidate
          ? 'dialogue-first-visible-reply-soft-repaired'
          : 'dialogue-first-visible-reply-rewrite-evidence')
      : '',
    strictGovernance ? 'strict-governance-surface' : '',
    executionSurfaceViolation ? 'execution-first-visible-reply-violation' : '',
    leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
    weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
    unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
    openingGuidanceViolationReason
      ? openingGuidanceViolationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance-')
      : '',
    scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
    conflictingAnchors.reason,
    dialogueFirstVisibleReply.contaminated && !(
      useDialogueFirstRepairAsVisibleCandidate
      && dialogueFirstRepairEvidence.applied
    ) ? 'dialogue-first-visible-reply-contaminated' : '',
    thinGovernedShell ? 'reply-thin-governed-shell' : '',
    shouldDeferGovernedMindLocalRepair(coherentGovernance) && !(
      useDialogueFirstRepairAsVisibleCandidate
      && dialogueFirstRepairEvidence.applied
    ) ? 'dialogue-first-repair-deferred' : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)

  const hardOverrideRequired = Boolean(
    executionSurfaceViolation
    || leakedGovernedSurface
    || (
      weakGroundedSceneCue
      || unsupportedTechnicalSpecificity.shouldOverride
      || Boolean(openingGuidanceViolationReason)
      || scriptMismatch
      || conflictingAnchors.hasConflict
      || dialogueFirstOverrideRequired
    ),
  )
  const thinShellOverrideRequired = Boolean(
    thinGovernedShell
    && !preserveDialogueFirstVisibleReply,
  )
  const strictOverrideRequired = strictGovernance
  const explicitRepairTurn = isExplicitGovernanceRepairTurn(coherentGovernance)
  const strictRepairReplySuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && !thinShellOverrideRequired
    && explicitRepairTurn
    && (coherentSceneReply || organicDirectReply),
  )
  const softStrictOverrideSuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && (!explicitRepairTurn || strictRepairReplySuppressed),
  )
  if (softStrictOverrideSuppressed)
    reasons.push('soft-strict-governance-suppressed')
  if (strictRepairReplySuppressed)
    reasons.push(coherentSceneReply
      ? 'strict-repair-scene-reply-preserved'
      : 'strict-repair-organic-reply-preserved')
  const overrideCandidateNeeded = Boolean(
    hardOverrideRequired
    || thinShellOverrideRequired
    || (strictOverrideRequired && !softStrictOverrideSuppressed),
  )
  const renderedOverrideSurface = overrideCandidateNeeded
    ? renderAlicizationMindSurface({
        governance: coherentGovernance,
        userText: input.userText,
        moves: [],
        forceDialogueAnswerFallback: dialogueFirstOverrideRequired,
      })
    : null
  const shouldOverrideVisibleReply = Boolean(
    overrideCandidateNeeded
    && (
      dispatchOnlyVisibleOverride
      || Boolean(renderedOverrideSurface?.reply)
      || Boolean(governedSurface?.reply)
    ),
  )
  const replyKeptDespiteMismatch = Boolean(
    !shouldOverrideVisibleReply
    && (
      thoughtConflict
      || governedAnchorRepair.changed
      || dialogueFirstVisibleReply.contaminated
      || unsupportedTechnicalSpecificity.unsupportedCues.length > 0
      || conflictingAnchors.hasConflict
    ),
  )
  if (replyKeptDespiteMismatch)
    reasons.push('reply-kept-despite-mismatch')
  const overrideClass = shouldOverrideVisibleReply
    ? (hardOverrideRequired ? 'hard-override' : 'soft-override')
    : 'none'
  const fallbackPatternId = resolveGovernedFallbackPatternId(coherentGovernance, shouldOverrideVisibleReply)
  const visibleReplyRewriteRequest = buildGovernedVisibleReplyRewriteRequest({
    shouldOverrideVisibleReply,
    reasons,
    coherentGovernance,
    fallbackPatternId,
    openingGuidanceHoldDetail,
    renderedOverrideReply: renderedOverrideSurface?.reply ?? null,
    governedSurfaceReply: governedSurface?.reply ?? null,
    candidateReply,
    unsupportedCues: unsupportedTechnicalSpecificity.unsupportedCues,
    conflictingCandidates: conflictingAnchors.conflictingCandidates ?? [],
    droppedClauses: dialogueFirstRepairEvidence.droppedClauses ?? [],
  })
  const visibleReplyAuditAuthority = resolveAlicizationVisibleReplyGovernanceAuditAuthority({
    shouldOverrideVisibleReply,
    governance: coherentGovernance,
  })
  const hardFallbackReason = shouldOverrideVisibleReply && hardOverrideRequired
    ? [
        executionSurfaceViolation ? 'execution-first-visible-reply-violation' : '',
        leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
        weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
        unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
        scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
        conflictingAnchors.reason,
        dialogueFirstOverrideRequired ? 'dialogue-first-visible-reply-contaminated' : '',
      ].find(Boolean) ?? 'hard-governance-fallback'
    : null
  const compatVisibleOverrideReply = shouldOverrideVisibleReply && !dispatchOnlyVisibleOverride
    ? sanitizeBriefText(renderedOverrideSurface?.reply ?? governedSurface?.reply ?? '', 2_000)
    : ''
  const finalReply = shouldOverrideVisibleReply
    ? (visibleReplyOverrideMode === 'compat-visible' ? compatVisibleOverrideReply : '')
    : candidateReply
  const finalThought = shouldOverrideVisibleReply
    ? renderedOverrideSurface?.thought ?? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
    : (missingMindThought || thoughtConflict)
        ? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
        : thought
  const finalEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    shouldOverrideVisibleReply && renderedOverrideSurface
      ? renderedOverrideSurface.emotion
      : normalizedEmotion,
  )
  const finalPerformance = shouldOverrideVisibleReply && renderedOverrideSurface
    ? alignDialoguePerformanceEmotion(
        structuredPayload.performance ?? renderedOverrideSurface.performance,
        finalEmotion,
      )
    : alignDialoguePerformanceEmotion(structuredPayload.performance, finalEmotion)
  const finalParsePath = (
    shouldOverrideVisibleReply
    || contractFailed
    || invalidFormat
    || invalidParsePath
    || missingMindThought
    || thoughtConflict
  )
    ? 'repair-json'
    : parsePath
  const normalizedAssistantText = shouldOverrideVisibleReply
    ? finalReply
    : (finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000))
  const tookOver = Boolean(
    shouldOverrideVisibleReply
    || structuredPayload.governance == null
    || finalThought !== thought
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || finalParsePath !== parsePath
    || invalidFormat
    || contractFailed
    || readStringValue(input.assistantText).trim() !== normalizedAssistantText
    || JSON.stringify(structuredPayload.performance ?? null) !== JSON.stringify(finalPerformance)
  )
  const finalEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: finalEmotion,
    candidatePerformance: finalPerformance,
    governance: coherentGovernance,
    performanceManifest,
    reply: finalReply,
    thought: finalThought,
    turnId: input.turnId,
  })
  const finalSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply: finalReply,
    candidateEmotion: finalEmotion,
    candidatePerformance: finalPerformance,
    embodiment: finalEmbodiment,
    performanceManifest,
  })
  const finalDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const finalDigitalLife = buildAlicizationDigitalLifeEnvelope({
    embodiment: finalEmbodiment,
    digitalLifeSpine: finalDigitalLifeSpine,
    speechTimeline: finalSpeechTimeline,
    performanceManifest,
  })
  const finalEmbodimentSeed = buildAlicizationRuntimeEmbodimentSeed({
    decisionTraceId: coherentGovernance.decisionTraceId ?? null,
    turnId: input.turnId ?? 'unknown-turn',
    reply: finalReply,
    performance: finalPerformance,
    embodiment: finalEmbodiment,
    speechTimeline: finalSpeechTimeline,
    digitalLife: finalDigitalLife,
    digitalLifeSpine: finalDigitalLifeSpine,
  })
  const finalEmbodimentScript = buildRuntimeGovernanceEmbodimentScript({
    decisionTraceId: finalEmbodimentSeed.decisionTraceId ?? null,
    turnId: finalEmbodimentSeed.turnId,
    replyText: finalEmbodimentSeed.replyText,
    performance: finalPerformance,
    speechTimeline: finalSpeechTimeline,
    performanceManifest,
    residentMode: finalDigitalLife?.mode === 'recovering' ? 'idle-recovering' : 'dialogue',
  })

  return {
    payload: {
      ...input,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...structuredPayload,
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        visibleReplyAuthority: shouldOverrideVisibleReply
          ? 'llm-second-pass-rewrite'
          : (coherentGovernance.visibleReplyAuthority ?? 'llm-mind'),
        visibleReplyRewriteRequest,
        performance: finalPerformance,
        embodiment: finalEmbodiment,
        embodimentScript: finalEmbodimentScript,
        speechTimeline: finalSpeechTimeline,
        digitalLife: finalDigitalLife,
        format: 'mind-turn-v1',
        formatLane: 'normal',
        legacyInputFormat: formatResolution.legacyInputFormat,
        dialogueActKernel,
        parsePath: finalParsePath,
        contractFailed: false,
        governance: coherentGovernance,
      },
    },
    governance: coherentGovernance,
    tookOver,
    replyOverridden: shouldOverrideVisibleReply,
    overrideClass,
    fallbackPatternId,
    reasons,
    audit: {
      owner_before: ownerBefore,
      owner_after: resolveGovernanceTurnOwner(coherentGovernance),
      decision_trace_id_before: governance.decisionTraceId ?? null,
      decision_trace_id_after: coherentGovernance.decisionTraceId ?? null,
      subject_before: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null,
      subject_after: coherentGovernance.answerSubject ?? coherentGovernance.mindTurnFrame?.relation.subject ?? null,
      screen_mode_before: governance.screenReferenceMode ?? null,
      screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      truth_state_before: governance.truthState,
      truth_state_after: coherentGovernance.truthState,
      repair_state_before: governance.repairState,
      repair_state_after: coherentGovernance.repairState,
      focus_anchor_before: governance.focusAnchor ?? null,
      focus_anchor_after: coherentGovernance.focusAnchor ?? null,
      live_surface_before: governance.liveSurface ?? null,
      live_surface_after: coherentGovernance.liveSurface ?? null,
      answer_intent_before: governance.answerIntent ?? null,
      answer_intent_after: coherentGovernance.answerIntent ?? null,
      carried_thread_before: governance.carriedThread ?? null,
      carried_thread_after: coherentGovernance.carriedThread ?? null,
      execution_bound_turn: executionFirstGovernance.executionBound,
      execution_first_override_applied: executionFirstGovernance.applied,
      execution_explicit_demand: executionFirstGovernance.explicitExecutionDemand,
      execution_signal_score: executionFirstGovernance.signalScore,
      execution_dispatch_channels: executionFirstGovernance.mentionedDispatchChannels,
      execution_dispatch_hidden: dispatchOnlyVisibleOverride && shouldOverrideVisibleReply,
      execution_reason_codes: executionFirstGovernance.reasonCodes,
      execution_turn_mode_before: anchorCoherentGovernance.turnMode,
      execution_turn_mode_after: coherentGovernance.turnMode,
      execution_answer_act_before: anchorCoherentGovernance.answerAct ?? null,
      execution_answer_act_after: coherentGovernance.answerAct ?? null,
      execution_screen_mode_before: anchorCoherentGovernance.screenReferenceMode ?? null,
      execution_screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      dominant_anchor: conflictingAnchors.dominantAnchor ?? null,
      conflicting_anchor_candidates: conflictingAnchors.conflictingCandidates,
      mentioned_conflicting_anchors: conflictingAnchors.mentionedConflicts,
      dialogue_focus_overlap: Number(dialogueFirstVisibleReply.overlapRatio.toFixed(2)),
      roleplay_preface: dialogueFirstVisibleReply.roleplayPreface,
      stale_carry_reference: dialogueFirstVisibleReply.staleCarryReference,
      scene_cue_mentions: dialogueFirstVisibleReply.sceneCueMentions,
      foreign_technical_cues: dialogueFirstVisibleReply.foreignTechnicalCues,
      dialogue_truth_discipline_mode: dialogueFirstVisibleReply.truthDisciplineMode,
      execution_surface_violation: executionSurfaceViolation,
      reply_specificity_cues: unsupportedTechnicalSpecificity.replyCues,
      allowed_specificity_cues: unsupportedTechnicalSpecificity.allowedCues,
      unsupported_specificity_cues: unsupportedTechnicalSpecificity.unsupportedCues,
      specificity_truth_discipline_mode: unsupportedTechnicalSpecificity.truthDisciplineMode,
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      local_repair_candidate_blocked: dialogueFirstRepairEvidence.applied && !useDialogueFirstRepairAsVisibleCandidate,
      local_repair_candidate_reason: dialogueFirstRepairEvidence.reason,
      local_repair_candidate_reply_excerpt: dialogueFirstRepairEvidence.applied
        ? excerptGovernedReply(dialogueFirstRepairEvidence.reply)
        : null,
      local_repair_candidate_dropped_clauses: dialogueFirstRepairEvidence.droppedClauses,
      soft_repair_applied: dialogueFirstRepairEvidence.applied && useDialogueFirstRepairAsVisibleCandidate,
      soft_repair_reason: dialogueFirstRepairEvidence.reason,
      soft_repair_dropped_clauses: dialogueFirstRepairEvidence.droppedClauses,
      visible_reply_override_mode: visibleReplyOverrideMode,
      visible_reply_local_compat_realized: shouldOverrideVisibleReply && visibleReplyOverrideMode === 'compat-visible' && Boolean(finalReply),
      hard_fallback_reason: hardFallbackReason,
      fallback_template_key: shouldOverrideVisibleReply ? fallbackPatternId : null,
      visible_reply_authority: visibleReplyAuditAuthority.visibleReplyAuthority,
      visible_reply_realization_authority: visibleReplyAuditAuthority.visibleReplyRealizationAuthority,
      visible_reply_rewrite_request: visibleReplyRewriteRequest,
      opening_guidance_hold_detail: openingGuidanceHoldDetail,
      reply_kept_despite_mismatch: replyKeptDespiteMismatch,
      organic_direct_reply: organicDirectReply,
    },
  }
}

export interface AlicizationMindTraceMemorySnapshot {
  shouldRecall: boolean
  surfacePolicy: 'internal-only' | 'gist-first' | 'answer-anchoring' | 'procedural-carry' | 'relationship-continuity'
  confidence: number
  whyNow: string
  inwardLine: string
  visibleLine?: string | null
  ambiguityPosture?: 'settled' | 'approximate' | 'ambiguous'
  whyWithheld?: string | null
  shouldStayInward?: boolean
  restraintSurfaceMode?: 'inward-only' | 'stable-core-only' | 'provenance-labeled' | 'free' | null
  restraintProvenanceMode?: 'none' | 'memory' | 'dream-residue' | 'inferred-pattern' | 'reconstructed-memory' | 'mixed-memory' | null
  shouldOnlySurfaceStableCore?: boolean
  shouldLabelProvenance?: boolean
  shouldLabelHypothesis?: boolean
  shouldSuppressSpecificity?: boolean
  shouldDelayUntilAfterPayoff?: boolean
  memoryControlSummary?: string | null
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  relationshipPosture?: string | null
  openingGuidance?: string | null
  personalityCurrentRegime?: string | null
  personalityRepairPosture?: string | null
  recollectionIntentMode?: string | null
  recollectionIntentTemporalFocus?: string | null
  speechShouldSurface?: boolean | null
  speechSurfaceMode?: string | null
  speechPlacement?: string | null
  knowledgeValidationCount?: number | null
  knowledgeContradictionCount?: number | null
  stronglyValidatedProcedureCount?: number | null
  contradictionHeavyFactCount?: number | null
  selectedEras: Array<{
    id: string
    facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | 'window'
    summary: string
  }>
  selectedPeriods: Array<{
    id: string
    kind: 'window' | 'consolidation'
    summary: string
  }>
  selectedEpisodes: Array<{
    id: string
    summary: string
    provenance: AlicizationMemoryProvenance
    reconsolidatedFromTraceId?: string | null
  }>
  conflictSeverity?: 'none' | 'low' | 'medium' | 'high'
  conflictVariants?: Array<{
    id: string
    summary: string
    provenance: AlicizationMemoryProvenance
    reason?: string | null
  }>
  stableCore?: string[]
  unsafeDetails?: string[]
  selectedProcedures: Array<{
    id: string
    label: string
    approach: string
  }>
  selectedBundles: Array<{
    id: string
    summary: string
    rationale: string
    confidence: number
    relationshipLine?: string | null
  }>
  selectedChains: Array<{
    id: string
    kind: 'task-procedure-relationship-stance' | 'period-event-lesson-posture'
    summary: string
    rationale: string
    confidence: number
    currentStance?: string | null
    answerPosture?: string | null
  }>
  selectedRelationshipLines: string[]
  followUpAffordance?: {
    summary: string
    whyNow: string
    intrusionRisk: 'low' | 'medium' | 'high'
    payoffDependency: 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
    preferredTiming: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'
  } | null
  searchTrace?: {
    firstHop: {
      focus: 'era' | 'procedure' | 'relationship-line' | 'conversation-turn' | 'episode'
      summary: string
      targetIds: string[]
    }
    secondHop: {
      action: 'hold' | 'expand-era' | 'expand-procedure' | 'expand-relationship-line' | 'expand-conversation' | 'narrow-to-stable-core'
      evidenceGap: 'none' | 'need-period-anchor' | 'need-episode-detail' | 'need-procedure-detail' | 'need-relationship-meaning' | 'need-conversation-evidence' | 'need-disambiguation'
      summary: string
      targetIds: string[]
    }
    thirdHop: {
      ambiguityPosture: 'settled' | 'approximate' | 'ambiguous'
      summary: string
    }
  } | null
}

function sanitizeMindTraceTelemetryText(raw: unknown, maxChars = 180) {
  return sanitizeText(raw).slice(0, maxChars)
}

function extractMindTraceTokens(raw: string) {
  const normalized = sanitizeMindTraceTelemetryText(raw, 220).toLowerCase()
  if (!normalized)
    return [] as string[]

  const tokens = normalized.match(/[\p{Script=Han}]{1,6}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  return [...new Set(tokens.filter(token => token.length >= 2))].slice(0, 24)
}

function measureMindTraceCueOverlap(reply: string, cue: string) {
  const normalizedReply = sanitizeMindTraceTelemetryText(reply, 320).toLowerCase()
  const normalizedCue = sanitizeMindTraceTelemetryText(cue, 180).toLowerCase()
  if (!normalizedReply || !normalizedCue)
    return 0
  if (normalizedReply.includes(normalizedCue))
    return 1

  const cueTokens = extractMindTraceTokens(normalizedCue)
  if (cueTokens.length === 0)
    return 0
  const matchedTokenCount = cueTokens.filter(token => normalizedReply.includes(token)).length
  return matchedTokenCount / cueTokens.length
}

function summarizeRecallAttributionPayload(snapshot: AlicizationMindTraceMemorySnapshot) {
  return {
    shouldRecall: snapshot.shouldRecall,
    surfacePolicy: snapshot.surfacePolicy,
    confidence: Number(clamp01(snapshot.confidence).toFixed(2)),
    whyNow: sanitizeMindTraceTelemetryText(snapshot.whyNow, 240) || null,
    inwardLine: sanitizeMindTraceTelemetryText(snapshot.inwardLine, 220) || null,
    visibleLine: sanitizeMindTraceTelemetryText(snapshot.visibleLine, 220) || null,
    whyWithheld: sanitizeMindTraceTelemetryText(snapshot.whyWithheld, 220) || null,
    shouldStayInward: snapshot.shouldStayInward ?? false,
    restraintSurfaceMode: sanitizeMindTraceTelemetryText(snapshot.restraintSurfaceMode, 64) || null,
    restraintProvenanceMode: sanitizeMindTraceTelemetryText(snapshot.restraintProvenanceMode, 64) || null,
    shouldOnlySurfaceStableCore: snapshot.shouldOnlySurfaceStableCore ?? false,
    shouldLabelProvenance: snapshot.shouldLabelProvenance ?? false,
    shouldLabelHypothesis: snapshot.shouldLabelHypothesis ?? false,
    shouldSuppressSpecificity: snapshot.shouldSuppressSpecificity ?? false,
    shouldDelayUntilAfterPayoff: snapshot.shouldDelayUntilAfterPayoff ?? false,
    memoryControlSummary: sanitizeMindTraceTelemetryText(snapshot.memoryControlSummary, 240) || null,
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
      openingGuidance: sanitizeMindTraceTelemetryText(snapshot.openingGuidance, 220) || null,
      currentRegime: sanitizeMindTraceTelemetryText(snapshot.personalityCurrentRegime, 64) || null,
      repairPosture: sanitizeMindTraceTelemetryText(snapshot.personalityRepairPosture, 64) || null,
    },
    recollectionIntentMode: sanitizeMindTraceTelemetryText(snapshot.recollectionIntentMode, 64) || null,
    recollectionIntentTemporalFocus: sanitizeMindTraceTelemetryText(snapshot.recollectionIntentTemporalFocus, 64) || null,
    speechShouldSurface: snapshot.speechShouldSurface ?? null,
    speechSurfaceMode: sanitizeMindTraceTelemetryText(snapshot.speechSurfaceMode, 64) || null,
    speechPlacement: sanitizeMindTraceTelemetryText(snapshot.speechPlacement, 64) || null,
    selectedEras: snapshot.selectedEras.map(item => ({
      id: item.id,
      facet: item.facet,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
    })),
    selectedPeriods: snapshot.selectedPeriods.map(item => ({
      id: item.id,
      kind: item.kind,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
    })),
    selectedEpisodes: snapshot.selectedEpisodes.map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      provenance: item.provenance,
      reconsolidatedFromTraceId: sanitizeMindTraceTelemetryText(item.reconsolidatedFromTraceId, 120) || null,
    })),
    conflictSeverity: snapshot.conflictSeverity ?? 'none',
    conflictVariants: (snapshot.conflictVariants ?? []).map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      provenance: item.provenance,
      reason: sanitizeMindTraceTelemetryText(item.reason, 180) || null,
    })),
    stableCore: (snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    unsafeDetails: (snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    selectedProcedures: snapshot.selectedProcedures.map(item => ({
      id: item.id,
      label: sanitizeMindTraceTelemetryText(item.label, 140),
      approach: sanitizeMindTraceTelemetryText(item.approach, 180),
    })),
    selectedBundles: snapshot.selectedBundles.map(item => ({
      id: item.id,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      rationale: sanitizeMindTraceTelemetryText(item.rationale, 200),
      confidence: Number(clamp01(item.confidence).toFixed(2)),
      relationshipLine: sanitizeMindTraceTelemetryText(item.relationshipLine, 160) || null,
    })),
    selectedChains: snapshot.selectedChains.map(item => ({
      id: item.id,
      kind: item.kind,
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      rationale: sanitizeMindTraceTelemetryText(item.rationale, 200),
      confidence: Number(clamp01(item.confidence).toFixed(2)),
      currentStance: sanitizeMindTraceTelemetryText(item.currentStance, 180) || null,
      answerPosture: sanitizeMindTraceTelemetryText(item.answerPosture, 180) || null,
    })),
    selectedRelationshipLines: snapshot.selectedRelationshipLines
      .map(line => sanitizeMindTraceTelemetryText(line, 180))
      .filter(Boolean),
    followUpAffordance: snapshot.followUpAffordance
      ? {
          summary: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.summary, 220),
          whyNow: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.whyNow, 220),
          intrusionRisk: snapshot.followUpAffordance.intrusionRisk,
          payoffDependency: snapshot.followUpAffordance.payoffDependency,
          preferredTiming: snapshot.followUpAffordance.preferredTiming,
        }
      : null,
  }
}

function summarizeReplyMemoryCoherencePayload(input: {
  reply: string
  snapshot: AlicizationMindTraceMemorySnapshot
}) {
  const cues = [
    ...input.snapshot.selectedPeriods.map(item => ({ kind: 'period', text: item.summary })),
    ...input.snapshot.selectedEpisodes.map(item => ({ kind: 'episode', text: item.summary })),
    ...input.snapshot.selectedProcedures.flatMap(item => ([
      { kind: 'procedure', text: item.label },
      { kind: 'procedure', text: item.approach },
    ])),
    ...input.snapshot.selectedBundles.flatMap(item => ([
      { kind: 'bundle', text: item.summary },
      { kind: 'bundle', text: item.relationshipLine ?? '' },
    ])),
    ...input.snapshot.selectedChains.flatMap(item => ([
      { kind: 'chain', text: item.summary },
      { kind: 'chain', text: item.currentStance ?? '' },
      { kind: 'chain', text: item.answerPosture ?? '' },
    ])),
    ...input.snapshot.selectedRelationshipLines.map(line => ({ kind: 'relationship', text: line })),
  ]
    .map(item => ({
      kind: item.kind,
      text: sanitizeMindTraceTelemetryText(item.text, 180),
    }))
    .filter(item => item.text.length > 0)

  const cueMatches = cues
    .map(item => ({
      kind: item.kind,
      cue: item.text,
      overlap: measureMindTraceCueOverlap(input.reply, item.text),
    }))
    .filter(item => item.overlap >= 0.45)
    .sort((left, right) => right.overlap - left.overlap)

  const visibleLeadOverlap = input.snapshot.visibleLine
    ? measureMindTraceCueOverlap(input.reply, input.snapshot.visibleLine)
    : 0
  const strongestCueOverlap = cueMatches[0]?.overlap ?? 0
  const explicitSurfaceExpected = input.snapshot.shouldRecall
    && input.snapshot.surfacePolicy !== 'internal-only'
    && input.snapshot.speechShouldSurface !== false
    && input.snapshot.speechPlacement !== 'internal-only'
  const coherenceState = !input.snapshot.shouldRecall
    ? 'not-applicable'
    : strongestCueOverlap >= 0.45 || visibleLeadOverlap >= 0.45
      ? 'integrated'
      : explicitSurfaceExpected
        ? 'missed'
        : 'inward-only'

  return {
    shouldRecall: input.snapshot.shouldRecall,
    surfacePolicy: input.snapshot.surfacePolicy,
    confidence: Number(clamp01(input.snapshot.confidence).toFixed(2)),
    recollectionIntentMode: sanitizeMindTraceTelemetryText(input.snapshot.recollectionIntentMode, 64) || null,
    recollectionIntentTemporalFocus: sanitizeMindTraceTelemetryText(input.snapshot.recollectionIntentTemporalFocus, 64) || null,
    speechShouldSurface: input.snapshot.speechShouldSurface ?? null,
    speechSurfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.speechSurfaceMode, 64) || null,
    speechPlacement: sanitizeMindTraceTelemetryText(input.snapshot.speechPlacement, 64) || null,
    coherenceState,
    explicitSurfaceExpected,
    explicitSurfaceObserved: strongestCueOverlap >= 0.45 || visibleLeadOverlap >= 0.45,
    strongestCueOverlap: Number(strongestCueOverlap.toFixed(2)),
    visibleLeadOverlap: Number(visibleLeadOverlap.toFixed(2)),
    whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
    followUpSummary: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.summary, 220) || null,
    followUpWhyNow: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.whyNow, 220) || null,
    followUpPreferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
    followUpIntrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
    matchedCueKinds: [...new Set(cueMatches.map(item => item.kind))],
    matchedCues: cueMatches.slice(0, 6).map(item => ({
      kind: item.kind,
      cue: item.cue,
      overlap: Number(item.overlap.toFixed(2)),
    })),
    replyExcerpt: excerptGovernedReply(input.reply),
    visibleLead: sanitizeMindTraceTelemetryText(input.snapshot.visibleLine, 180) || null,
  }
}

function summarizeMemoryDeliberationJudgedPayload(snapshot: AlicizationMindTraceMemorySnapshot) {
  return {
    shouldRecall: snapshot.shouldRecall,
    surfacePolicy: snapshot.surfacePolicy,
    confidence: Number(clamp01(snapshot.confidence).toFixed(2)),
    whyNow: sanitizeMindTraceTelemetryText(snapshot.whyNow, 240) || null,
    whyWithheld: sanitizeMindTraceTelemetryText(snapshot.whyWithheld, 220) || null,
    ambiguityPosture: snapshot.ambiguityPosture ?? 'settled',
    conflictSeverity: snapshot.conflictSeverity ?? 'none',
    restraint: {
      shouldStayInward: snapshot.shouldStayInward ?? false,
      surfaceMode: sanitizeMindTraceTelemetryText(snapshot.restraintSurfaceMode, 64) || null,
      provenanceMode: sanitizeMindTraceTelemetryText(snapshot.restraintProvenanceMode, 64) || null,
      shouldOnlySurfaceStableCore: snapshot.shouldOnlySurfaceStableCore ?? false,
      shouldLabelProvenance: snapshot.shouldLabelProvenance ?? false,
      shouldLabelHypothesis: snapshot.shouldLabelHypothesis ?? false,
      shouldSuppressSpecificity: snapshot.shouldSuppressSpecificity ?? false,
      shouldDelayUntilAfterPayoff: snapshot.shouldDelayUntilAfterPayoff ?? false,
    },
    stableCore: (snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    unsafeDetails: (snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
    followUpAffordance: snapshot.followUpAffordance
      ? {
          summary: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.summary, 220) || null,
          whyNow: sanitizeMindTraceTelemetryText(snapshot.followUpAffordance.whyNow, 220) || null,
          intrusionRisk: snapshot.followUpAffordance.intrusionRisk,
          payoffDependency: snapshot.followUpAffordance.payoffDependency,
          preferredTiming: snapshot.followUpAffordance.preferredTiming,
        }
      : null,
    searchTrace: snapshot.searchTrace
      ? {
          firstHopFocus: snapshot.searchTrace.firstHop.focus,
          secondHopAction: snapshot.searchTrace.secondHop.action,
          evidenceGap: snapshot.searchTrace.secondHop.evidenceGap,
          thirdHopAmbiguity: snapshot.searchTrace.thirdHop.ambiguityPosture,
        }
      : null,
    memoryControlSummary: sanitizeMindTraceTelemetryText(snapshot.memoryControlSummary, 240) || null,
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
      openingGuidance: sanitizeMindTraceTelemetryText(snapshot.openingGuidance, 220) || null,
      currentRegime: sanitizeMindTraceTelemetryText(snapshot.personalityCurrentRegime, 64) || null,
      repairPosture: sanitizeMindTraceTelemetryText(snapshot.personalityRepairPosture, 64) || null,
    },
  }
}

function shouldEmitWrongThreadSuppression(snapshot: AlicizationMindTraceMemorySnapshot) {
  return snapshot.ambiguityPosture === 'ambiguous'
    || snapshot.searchTrace?.secondHop.evidenceGap === 'need-disambiguation'
    || (snapshot.conflictVariants ?? []).some(item => String(item.id ?? '').startsWith('cluster:'))
}

function buildMemoryDeliberationTraceEvents(input: {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive'
  snapshot: AlicizationMindTraceMemorySnapshot
  createdAt: number
}) {
  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    origin: input.origin,
    kind: 'memory-deliberation-judged',
    payload: summarizeMemoryDeliberationJudgedPayload(input.snapshot),
    createdAt: input.createdAt,
  }]

  if (input.snapshot.whyWithheld || input.snapshot.shouldStayInward || input.snapshot.restraintSurfaceMode === 'inward-only') {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-recall-withheld',
      payload: {
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        shouldStayInward: input.snapshot.shouldStayInward ?? false,
        surfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.restraintSurfaceMode, 64) || null,
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        intrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
        preferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
        activeClosenessContext: sanitizeMindTraceTelemetryText(input.snapshot.activeClosenessContext, 64) || null,
        activeClosenessRung: sanitizeMindTraceTelemetryText(input.snapshot.activeClosenessRung, 64) || null,
        relationshipPosture: sanitizeMindTraceTelemetryText(input.snapshot.relationshipPosture, 64) || null,
      },
      createdAt: input.createdAt,
    })
  }

  if (input.snapshot.shouldOnlySurfaceStableCore || (input.snapshot.unsafeDetails?.length ?? 0) > 0) {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-stable-core-surfaced',
      payload: {
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        surfaceMode: sanitizeMindTraceTelemetryText(input.snapshot.restraintSurfaceMode, 64) || null,
        shouldOnlySurfaceStableCore: input.snapshot.shouldOnlySurfaceStableCore ?? false,
      },
      createdAt: input.createdAt,
    })
  }

  if (input.snapshot.shouldDelayUntilAfterPayoff || input.snapshot.followUpAffordance?.preferredTiming === 'after-payoff') {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-followup-deferred',
      payload: {
        summary: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.summary, 220) || null,
        whyNow: sanitizeMindTraceTelemetryText(input.snapshot.followUpAffordance?.whyNow, 220) || null,
        payoffDependency: input.snapshot.followUpAffordance?.payoffDependency ?? null,
        preferredTiming: input.snapshot.followUpAffordance?.preferredTiming ?? null,
        intrusionRisk: input.snapshot.followUpAffordance?.intrusionRisk ?? null,
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
      },
      createdAt: input.createdAt,
    })
  }

  if (shouldEmitWrongThreadSuppression(input.snapshot)) {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-wrong-thread-suppressed',
      payload: {
        ambiguityPosture: input.snapshot.ambiguityPosture ?? 'settled',
        conflictSeverity: input.snapshot.conflictSeverity ?? 'none',
        evidenceGap: input.snapshot.searchTrace?.secondHop.evidenceGap ?? null,
        whyWithheld: sanitizeMindTraceTelemetryText(input.snapshot.whyWithheld, 220) || null,
        stableCore: (input.snapshot.stableCore ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        unsafeDetails: (input.snapshot.unsafeDetails ?? []).map(item => sanitizeMindTraceTelemetryText(item, 180)).filter(Boolean),
        conflictVariants: (input.snapshot.conflictVariants ?? []).map(item => ({
          id: item.id,
          summary: sanitizeMindTraceTelemetryText(item.summary, 180),
          reason: sanitizeMindTraceTelemetryText(item.reason, 180) || null,
          provenance: item.provenance,
        })),
      },
      createdAt: input.createdAt,
    })
  }

  return events
}

export function buildMindTurnTraceEvents(input: {
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  createdAt: number
  dialoguePayload?: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null
  memoryTrace?: AlicizationMindTraceMemorySnapshot | null
}): AlicizationMindTurnEventInput[] {
  const governance = input.governedTurn.governance
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(governance?.decisionTraceId)
  if (!decisionTraceId)
    return []

  const structured = input.payload.structured && typeof input.payload.structured === 'object'
    ? input.payload.structured as Record<string, unknown>
    : {}
  const persistedDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(structured.digitalLifeSpine)
  const participation = deriveAlicizationMindParticipationFromSpine(
    normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine),
  )
  const turnId = sanitizeText(input.payload.turnId) || null
  const sessionId = sanitizeText(input.payload.sessionId) || null
  const origin = input.payload.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'governance-normalized',
    payload: {
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      repairState: governance?.repairState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      tookOver: input.governedTurn.tookOver,
      replyOverridden: input.governedTurn.replyOverridden,
      overrideClass: input.governedTurn.overrideClass ?? 'none',
      fallbackPatternId: input.governedTurn.fallbackPatternId ?? 'none',
      reasons: input.governedTurn.reasons,
      digitalLifeSpine: persistedDigitalLifeSpine,
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      participation,
    },
    createdAt: input.createdAt,
  }]

  if (input.memoryTrace) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'recall-attribution',
      payload: summarizeRecallAttributionPayload(input.memoryTrace),
      createdAt: input.createdAt,
    })
    events.push(...buildMemoryDeliberationTraceEvents({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      snapshot: input.memoryTrace,
      createdAt: input.createdAt,
    }))
  }

  if (input.governedTurn.tookOver && input.governedTurn.audit) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'takeover-audit',
      payload: input.governedTurn.audit,
      createdAt: input.createdAt,
    })
  }

  events.push({
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'persistence-written',
    payload: {
      format: readStringValue(structured.format).trim().toLowerCase() || null,
      formatLane: readStringValue(structured.formatLane).trim().toLowerCase() || null,
      legacyInputFormat: readStringValue(structured.legacyInputFormat).trim().toLowerCase() || null,
      parsePath: readStringValue(structured.parsePath).trim().toLowerCase() || null,
      emotion: readStringValue(structured.emotion).trim().toLowerCase() || null,
      rawEmotion: readStringValue(structured.rawEmotion).trim().toLowerCase() || null,
      replyExcerpt: excerptGovernedReply(readStringValue(structured.reply).trim()),
      assistantExcerpt: excerptGovernedReply(readStringValue(input.payload.assistantText).trim()),
      digitalLifeSpine: persistedDigitalLifeSpine,
      derivedMindStateBundle: structured.derivedMindStateBundle && typeof structured.derivedMindStateBundle === 'object'
        ? structured.derivedMindStateBundle
        : null,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
    },
    createdAt: input.createdAt,
  })

  const persistedReply = readStringValue(structured.reply).trim() || readStringValue(input.payload.assistantText).trim()
  if (input.memoryTrace && persistedReply) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'reply-memory-coherence',
      payload: summarizeReplyMemoryCoherencePayload({
        reply: persistedReply,
        snapshot: input.memoryTrace,
      }),
      createdAt: input.createdAt,
    })
  }

  if (input.dialoguePayload) {
    const dialogueDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
      ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).digitalLifeSpine,
    ) ?? persistedDigitalLifeSpine
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'dialogue-emitted',
      payload: {
        origin: input.dialoguePayload.origin,
        isFallback: input.dialoguePayload.isFallback,
        format: input.dialoguePayload.structured.format,
        formatLane: input.dialoguePayload.structured.formatLane ?? null,
        legacyInputFormat: input.dialoguePayload.structured.legacyInputFormat ?? null,
        emotion: input.dialoguePayload.structured.emotion,
        rawEmotion: input.dialoguePayload.structured.rawEmotion,
        embodimentVariationToken: input.dialoguePayload.structured.embodiment?.variationToken ?? null,
        embodimentPostureHint: input.dialoguePayload.structured.embodiment?.postureHint ?? null,
        speechTimelineSegments: input.dialoguePayload.structured.speechTimeline?.segments.length ?? 0,
        visibleReply: {
          expectedAuthority: readStringValue(((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.visibleReplyAuthority).trim() || null,
          actualAuthority: null,
          providerMindExecuted: true,
        },
        performance: {
          baseEmotion: input.dialoguePayload.structured.performance.baseEmotion,
          facialCue: input.dialoguePayload.structured.performance.facialCue ?? null,
          actionCue: input.dialoguePayload.structured.performance.actionCue ?? null,
          delivery: input.dialoguePayload.structured.performance.delivery,
          emphasis: input.dialoguePayload.structured.performance.emphasis,
        },
        digitalLife: input.dialoguePayload.structured.digitalLife
          ? {
              emotion: input.dialoguePayload.structured.digitalLife.emotion,
              mode: input.dialoguePayload.structured.digitalLife.mode,
              performance: {
                baseEmotion: input.dialoguePayload.structured.digitalLife.performance.baseEmotion,
                facialCue: input.dialoguePayload.structured.digitalLife.performance.facialCue ?? null,
                actionCue: input.dialoguePayload.structured.digitalLife.performance.actionCue ?? null,
              },
              face: {
                emotion: input.dialoguePayload.structured.digitalLife.face.emotion,
                facialCue: input.dialoguePayload.structured.digitalLife.face.facialCue ?? null,
              },
              action: {
                actionCue: input.dialoguePayload.structured.digitalLife.action.actionCue ?? null,
                actionMode: input.dialoguePayload.structured.digitalLife.action.actionMode,
              },
            }
          : null,
        embodimentScript: input.dialoguePayload.structured.embodimentScript
          ? {
              rendererTarget: input.dialoguePayload.structured.embodimentScript.rendererTarget,
              state: {
                baseEmotion: input.dialoguePayload.structured.embodimentScript.state.baseEmotion,
                delivery: input.dialoguePayload.structured.embodimentScript.state.delivery,
                emphasis: input.dialoguePayload.structured.embodimentScript.state.emphasis,
              },
              speechPlan: {
                segmentCount: input.dialoguePayload.structured.embodimentScript.speechPlan.segments.length,
                interruptPolicy: input.dialoguePayload.structured.embodimentScript.speechPlan.interruptPolicy,
              },
            }
          : null,
        digitalLifeSpine: dialogueDigitalLifeSpine,
        derivedMindStateBundle: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.derivedMindStateBundle
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.derivedMindStateBundle === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).derivedMindStateBundle
          : null,
        memoryStageReplay: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryStageReplay
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryStageReplay === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).memoryStageReplay
          : null,
        memoryResolutionLedger: ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryResolutionLedger
          && typeof ((input.dialoguePayload.structured as unknown) as Record<string, unknown>)?.memoryResolutionLedger === 'object'
          ? ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).memoryResolutionLedger
          : null,
        createdAt: input.dialoguePayload.createdAt,
      },
      createdAt: input.dialoguePayload.createdAt,
    })
  }

  return events
}

export function normalizeDialogueRespondedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  },
): Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null {
  const normalizedSessionId = input.sessionId?.trim()
  if (!normalizedSessionId)
    return null

  const structuredPayload = input.structured && typeof input.structured === 'object' ? input.structured : {}
  const thought = readStringValue((structuredPayload as Record<string, unknown>).thought).trim()
  const rawEmotion = readStringValue((structuredPayload as Record<string, unknown>).emotion).trim().toLowerCase()
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
    || input.assistantText?.trim()
    || ''
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const explicitLegacyInputFormat = (() => {
    const rawLegacyInputFormat = readStringValue((structuredPayload as Record<string, unknown>).legacyInputFormat).trim().toLowerCase()
    return rawLegacyInputFormat === 'epoch1-v1' || rawLegacyInputFormat === 'fallback-v1'
      ? rawLegacyInputFormat
      : null
  })()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: (structuredPayload as Record<string, unknown>).format,
    contractFailed,
    hasGovernance: Boolean(governance),
    origin: input.origin,
  })
  const format = formatResolution.format
  const visibleReplyAuthority = readStringValue((structuredPayload as Record<string, unknown>).visibleReplyAuthority).trim()
  const proactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const dialogueActKernel = normalizeDialogueActKernel(
    (structuredPayload as Record<string, unknown>).dialogueActKernel ?? governance?.dialogueActKernel,
  )
  const normalizedEmotionResult = normalizeAlicizationEmotion(rawEmotion)
  const normalizedPerformance = normalizeAlicizationPerformancePayload(
    (structuredPayload as Record<string, unknown>).performance,
    normalizedEmotionResult.emotion,
  )
  const clampedPerformance = clampAlicizationPerformancePayloadToManifest(
    normalizedPerformance,
    performanceManifest,
    normalizedEmotionResult.emotion,
  )
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    clampedPerformance.performance,
    options?.residentPerformance?.performance,
  )
  const residentSeeded = !areDialoguePerformancesEqual(
    clampedPerformance.performance,
    residentSeededPerformance,
  )
  const createdAt = input.createdAt ?? Date.now()
  const turnId = input.turnId?.trim() || `turn:${normalizedSessionId}:${createdAt}`
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: residentSeededPerformance.baseEmotion,
    candidatePerformance: residentSeededPerformance,
    governance,
    performanceManifest,
    reply,
    thought,
    turnId,
  })
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  const speechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    performanceManifest,
  })
  const normalizedDigitalLife = normalizeAlicizationDigitalLifeEnvelope(
    (structuredPayload as Record<string, unknown>).digitalLife,
    embodiment.emotion,
  )
  const digitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const authoritativeDigitalLife = buildAlicizationDigitalLifeEnvelope({
    embodiment,
    digitalLifeSpine,
    speechTimeline,
    performanceManifest,
  })
  const digitalLife = normalizedDigitalLife && !residentSeeded
    ? authoritativeDigitalLife
      ? reconcileProvidedDigitalLifeWithAuthority({
          provided: normalizedDigitalLife,
          authoritative: authoritativeDigitalLife,
        })
      : normalizedDigitalLife
    : authoritativeDigitalLife
  const embodimentScript = buildRuntimeGovernanceEmbodimentScript({
    decisionTraceId: governance?.decisionTraceId ?? null,
    turnId,
    replyText: reply,
    performance: embodiment.performance,
    speechTimeline,
    performanceManifest,
    residentMode: digitalLife?.mode === 'recovering' ? 'idle-recovering' : 'dialogue',
  })
  const isFallback = contractFailed || !['json', 'repair-json'].includes(parsePath)
  const origin = input.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  return {
    turnId,
    sessionId: normalizedSessionId,
    origin,
    structured: {
      thought,
      emotion: embodiment.emotion,
      reply,
      visibleReplyAuthority: visibleReplyAuthority
        ? normalizeAlicizationNormalVisibleReplyAuthority(visibleReplyAuthority as any, 'llm-mind')
        : governance?.visibleReplyAuthority ?? null,
      performance: embodiment.performance,
      embodiment,
      embodimentScript,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      format,
      formatLane: formatResolution.lane,
      legacyInputFormat: explicitLegacyInputFormat ?? formatResolution.legacyInputFormat,
      proactive,
      dialogueActKernel,
      governance,
      policyLocked: policyLocked || undefined,
      rawEmotion: normalizedEmotionResult.downgraded
        ? normalizedEmotionResult.rawEmotion
        : clampedPerformance.downgradedBaseEmotion,
    },
    isFallback,
    createdAt,
  }
}

export interface AlicizationRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
}

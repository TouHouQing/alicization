import type { Buffer } from 'node:buffer'

import type { Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationConversationTurnInput,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredPayload,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentContinuityLedgerSnapshot,
  AlicizationEmotion,
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMemoryProvenance,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnGovernance,
  AlicizationProactiveMetadata,
  AlicizationProactiveStaticReasonCode,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { AlicizationVisibleReplyRealizationArtifact } from './visible-reply/facade'

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
  deriveAlicizationMindParticipationFromSpine,
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationEmbodimentScript,
  normalizeAlicizationMemoryResolutionLedger,
  normalizeAlicizationNormalVisibleReplyAuthority,
  normalizeAlicizationOrganicMemoryStageReplay,
  normalizeAlicizationRuntimeDigest,
  normalizeExecutionFirstGovernance,
  resolveAlicizationDialogueEmbodiment,
  sanitizeCharacterPerformanceManifest,
  translateGovernedMindFallback as translateGovernedMindFallbackShared,
} from '@proj-alicization/stage-shared'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import { normalizeClaimEvidenceLedger } from './claim-evidence-ledger'
import { normalizeDialogueActKernel } from './dialogue-act-kernel'
import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { coordinateAlicizationRuntimeEmbodiment } from './embodiment/runtime-embodiment-coordinator'
import { buildAlicizationRuntimeEmbodimentSeed } from './embodiment/runtime-embodiment-seed'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { normalizeMindTurnFrame } from './mind-turn-frame'
import { sanitizeBriefText } from './runtime-realtime'
import { clamp01, sanitizeText } from './runtime-soul'
import {
  resolveAlicizationAutonomousDialogueFamilyClassification,
  resolveAlicizationAutonomousDialogueOrigin,
  resolveAlicizationRuntimeMindTurnStructuredFormat,
} from './runtime-structured-format'
import {
  normalizeAlicizationVisibleReplyValidationStatus,
} from './visible-reply/facade'

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

type AlicizationGovernanceCurrentConsciousFrameInput = {
  reasonTags?: readonly string[] | null
} | null

function coerceGovernanceCurrentConsciousFrame(
  input: AlicizationGovernanceCurrentConsciousFrameInput | AlicizationCurrentConsciousFrameSnapshot | null | undefined,
) {
  if (!input || typeof input !== 'object')
    return null

  const candidate = input

  if (
    typeof (candidate as AlicizationCurrentConsciousFrameSnapshot).consciousNeed === 'string'
    && typeof (candidate as AlicizationCurrentConsciousFrameSnapshot).consciousTension === 'string'
    && typeof (candidate as AlicizationCurrentConsciousFrameSnapshot).speakingIntention === 'string'
    && typeof (candidate as AlicizationCurrentConsciousFrameSnapshot).updatedAt === 'number'
  ) {
    const snapshot = candidate as AlicizationCurrentConsciousFrameSnapshot
    return {
      subject: snapshot.subject,
      centerOfGravity: snapshot.centerOfGravity,
      truthDiscipline: snapshot.truthDiscipline,
      consciousNeed: snapshot.consciousNeed,
      consciousNeedSource: snapshot.consciousNeedSource,
      consciousTension: snapshot.consciousTension,
      speakingIntention: snapshot.speakingIntention,
      focusAnchor: snapshot.focusAnchor,
      focusAnchorSource: snapshot.focusAnchorSource,
      withheldImpulse: snapshot.withheldImpulse,
      shouldWithholdSpecificity: snapshot.shouldWithholdSpecificity,
      shouldSelfRevise: snapshot.shouldSelfRevise,
      confidence: snapshot.confidence,
      reasonTags: snapshot.reasonTags,
      updatedAt: snapshot.updatedAt,
    } as AlicizationCurrentConsciousFrameSnapshot
  }

  const reasonTags = Array.isArray(candidate.reasonTags)
    ? candidate.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  if (reasonTags.length === 0)
    return null

  return {
    subject: 'general',
    centerOfGravity: 'answer',
    truthDiscipline: 'dialogue-first',
    consciousNeed: '',
    consciousTension: '',
    speakingIntention: '',
    focusAnchor: null,
    withheldImpulse: null,
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0,
    reasonTags,
    updatedAt: 0,
  } satisfies AlicizationCurrentConsciousFrameSnapshot
}

function normalizeGovernanceDigitalLifeSpineDigest(
  raw: unknown,
): AlicizationDialogueStructuredPayload['digitalLifeSpine'] {
  return normalizeAlicizationDigitalLifeSpineDigest(raw)
}

function normalizeGovernanceDigitalLifeEnvelope(
  raw: unknown,
  fallbackEmotion?: AlicizationEmotion | null,
): AlicizationDialogueStructuredPayload['digitalLife'] {
  return normalizeAlicizationDigitalLifeEnvelope(raw, fallbackEmotion ?? undefined) as AlicizationDialogueStructuredPayload['digitalLife']
}

function resolveGovernanceStructuredDigitalLifeAuthority(input: {
  digitalLife: unknown
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript'] | null | undefined
  fallbackEmotion?: AlicizationEmotion | null
}): AlicizationDialogueStructuredPayload['digitalLife'] {
  const topLevelDigitalLife = normalizeGovernanceDigitalLifeEnvelope(
    input.digitalLife,
    input.fallbackEmotion,
  )
  if (topLevelDigitalLife)
    return topLevelDigitalLife

  return normalizeGovernanceDigitalLifeEnvelope(
    input.embodimentScript?.digitalLife ?? null,
    input.fallbackEmotion,
  )
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
  const candidateEmbodimentSparseBaseline = !candidate.actionCue
    && !candidate.facialCue
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  const candidateMeasuredReturnSparseBaseline = !candidate.actionCue
    && !candidate.facialCue
    && candidate.delivery === 'calm'
    && candidate.emphasis === 1
  const candidateMeasuredReturnCueShellBaseline = candidate.baseEmotion === 'thinking'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
    && candidate.actionCue === 'leave-room'
    && (
      candidate.facialCue == null
      || candidate.facialCue === 'soften'
      || candidate.facialCue === 'soft-gaze'
    )
  const candidateNeutralBaseline = candidate.baseEmotion === 'neutral'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  if (!candidateSparse && !candidateNeutralBaseline && !candidateMeasuredReturnCueShellBaseline)
    return candidate

  const mergedEmotion = candidateNeutralBaseline
    ? resident.baseEmotion
    : candidate.baseEmotion

  return normalizeAlicizationPerformancePayload({
    baseEmotion: mergedEmotion,
    emotion: mergedEmotion,
    facialCue: candidate.facialCue ?? resident.facialCue ?? null,
    actionCue: candidate.actionCue ?? resident.actionCue ?? null,
    delivery: candidateNeutralBaseline || candidateEmbodimentSparseBaseline || (
      candidateMeasuredReturnSparseBaseline
      && resident.delivery === 'gentle'
    ) || (
      candidateMeasuredReturnCueShellBaseline
      && resident.delivery === 'gentle'
    )
      ? resident.delivery
      : candidate.delivery,
    emphasis: candidateNeutralBaseline || candidateEmbodimentSparseBaseline || (
      candidateMeasuredReturnSparseBaseline
      && resident.delivery === 'gentle'
    ) || (
      candidateMeasuredReturnCueShellBaseline
      && resident.delivery === 'gentle'
    )
      ? resident.emphasis
      : candidate.emphasis,
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

  const preserveConcernedEmbodiment
    = embodiment.emotion === 'concerned'
      && embodiment.performance.baseEmotion === 'concerned'
      && embodiment.performance.delivery === 'gentle'
      && normalizedSeeded.baseEmotion === 'thinking'
      && normalizedSeeded.delivery === 'gentle'

  if (preserveConcernedEmbodiment) {
    return {
      ...embodiment,
      emotion: 'concerned',
      performance: {
        ...normalizedSeeded,
        baseEmotion: 'concerned',
        emotion: 'concerned',
      },
    }
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
  const providedRendererHints = provided.rendererHints
  const authoritativeRendererHints = authoritative.rendererHints
  const hasConcreteProvidedResidentHints = Boolean(
    providedRendererHints?.residentMode
    || providedRendererHints?.preferredBlinkCadence
    || providedRendererHints?.preferredGazeMode,
  )

  return {
    ...provided,
    emotion: authoritative.emotion,
    facialCue: authoritative.facialCue,
    expressionMode: authoritative.expressionMode,
    rendererHints: hasConcreteProvidedResidentHints
      ? providedRendererHints
      : {
          ...providedRendererHints,
          ...authoritativeRendererHints,
          preferredExpressionAliases: providedRendererHints?.preferredExpressionAliases ?? authoritativeRendererHints?.preferredExpressionAliases,
          preferredMotionAliases: providedRendererHints?.preferredMotionAliases ?? authoritativeRendererHints?.preferredMotionAliases,
        },
  }
}

function mergeAuthoritativeDigitalLifeAction(
  provided: AlicizationDigitalLifeEnvelope['action'],
  authoritative: AlicizationDigitalLifeEnvelope['action'],
) {
  const providedRendererHints = provided.rendererHints
  const authoritativeRendererHints = authoritative.rendererHints
  const hasConcreteProvidedResidentHints = Boolean(
    providedRendererHints?.residentMode
    || providedRendererHints?.preferredBlinkCadence
    || providedRendererHints?.preferredGazeMode,
  )

  return {
    ...provided,
    actionCue: authoritative.actionCue,
    actionMode: authoritative.actionMode,
    rendererHints: hasConcreteProvidedResidentHints
      ? providedRendererHints
      : {
          ...providedRendererHints,
          ...authoritativeRendererHints,
          preferredExpressionAliases: providedRendererHints?.preferredExpressionAliases ?? authoritativeRendererHints?.preferredExpressionAliases,
          preferredMotionAliases: providedRendererHints?.preferredMotionAliases ?? authoritativeRendererHints?.preferredMotionAliases,
        },
  }
}

function reconcileProvidedDigitalLifeWithAuthority(input: {
  provided: AlicizationDigitalLifeEnvelope
  authoritative: AlicizationDigitalLifeEnvelope
}): AlicizationDigitalLifeEnvelope {
  const authoritativeFrames = input.authoritative.frames
  const providedFrames = input.provided.frames
  const authoritativeFrameById = new Map(authoritativeFrames.map(frame => [frame.id, frame] as const))
  const normalizeFrameText = (text: string) => text.trim()

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
    frames: providedFrames.map((providedFrame, index) => {
      const authoritativeFrame = authoritativeFrameById.get(providedFrame.id)
        ?? (() => {
          const candidate = authoritativeFrames[index]
          if (!candidate)
            return null

          const providedText = normalizeFrameText(providedFrame.text)
          const candidateText = normalizeFrameText(candidate.text)
          return providedText !== ''
            && candidateText !== ''
            && providedText === candidateText
            ? candidate
            : null
        })()
      if (!authoritativeFrame)
        return providedFrame

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

function alignSpeechTimelineToDigitalLifeFrames(input: {
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}) {
  if (!input.speechTimeline || !input.digitalLife?.frames.length)
    return input.speechTimeline

  const nonEmptyFrames = input.digitalLife.frames.filter(frame => frame.text.trim().length > 0)
  if (!nonEmptyFrames.length)
    return input.speechTimeline

  return {
    ...input.speechTimeline,
    segments: input.speechTimeline.segments.map((segment, index) => {
      const alignedFrame = nonEmptyFrames[index]
      if (!alignedFrame)
        return segment

      return {
        ...segment,
        id: alignedFrame.id,
        index: alignedFrame.index,
        startOffset: alignedFrame.startOffset,
        endOffset: alignedFrame.endOffset,
        text: alignedFrame.text,
      }
    }),
  } satisfies AlicizationDialogueSpeechTimeline
}

export interface AlicizationChatStreamEmbodimentMeta {
  governance: AlicizationMindTurnGovernance | null
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript: AlicizationDialogueStructuredPayload['embodimentScript']
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDialogueStructuredPayload['digitalLife']
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine'] | null
}

function resolveEmbodimentScriptRendererTarget(
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
) {
  return performanceManifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
}

export function buildRuntimeGovernanceEmbodimentScript(input: {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentMode: 'dialogue' | 'idle-recovering'
}) {
  if (!input.speechTimeline)
    return null

  const speechSegments = input.speechTimeline.segments.map(segment =>
    buildRuntimeGovernanceEmbodimentSpeechSegment(segment))

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
      segments: speechSegments,
      interruptPolicy: input.speechTimeline.segments.some(segment => segment.interruptMode === 'hard-interrupt')
        ? 'hard-stop'
        : 'soft-settle',
      preRollMs: input.speechTimeline.segments.some(segment => segment.actionWindow === 'segment-start') ? 40 : 0,
      settleMs: speechSegments.reduce((max, segment) => Math.max(max, segment.settleMs), 120),
    },
    facePlan: {
      preUtteranceCue: null,
      postUtteranceCue: null,
      speakingCues: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentFaceCue({
        segment: speechSegments[index]!,
        timelineSegment: segment,
        fallbackEmotion: input.performance.baseEmotion,
        fallbackFacialCue: input.performance.facialCue ?? null,
        fallbackIntensity: 0.5,
      })),
    },
    motionPlan: {
      idleBase: input.performance.actionCue ?? 'idle_settle',
      actionBursts: input.speechTimeline.segments.map((segment, index) => buildAlicizationEmbodimentMotionBurst({
        segment: speechSegments[index]!,
        timelineSegment: segment,
        fallbackActionCue: input.performance.actionCue ?? null,
        fallbackIntensity: 0,
      })),
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: input.performanceManifest?.supportsVisemeLipSync === true ? 'energy-phoneme-hybrid' : 'energy-only',
      visemeHints: input.performanceManifest?.supportsVisemeLipSync === true
        ? input.speechTimeline.segments.flatMap((segment, index) => buildAlicizationEmbodimentLipSyncHints({
            segment: speechSegments[index]!,
            timelineSegment: segment,
          }))
        : undefined,
    },
  })
}

export function buildAlicizationChatStreamEmbodimentMeta(input: {
  governance?: unknown
  digitalLifeSpine?: AlicizationDialogueStructuredPayload['digitalLifeSpine']
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  explicitPerformance?: AlicizationDialoguePerformancePayload | null
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
      digitalLifeSpine: null,
    }
  }

  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(input.currentConsciousFrame)
  const reply = readStringValue(input.reply).trim()
  const thought = readStringValue(input.thought).trim()
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    governance,
    performanceManifest: input.performanceManifest,
    reply,
    thought,
    turnId: input.turnId,
  })
  const explicitPerformance = input.explicitPerformance
    ? normalizeAlicizationPerformancePayload(
        input.explicitPerformance,
        input.explicitPerformance.baseEmotion,
      )
    : null
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    explicitPerformance ?? resolvedEmbodiment.performance,
    input.residentPerformance?.performance,
  )
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  const seededSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    digitalLifeSpine: input.digitalLifeSpine,
    performanceManifest: input.performanceManifest,
  })
  const emittedDigitalLifeSpine = normalizeGovernanceDigitalLifeSpineDigest(input.digitalLifeSpine)
  const authority = coordinateAlicizationRuntimeEmbodiment({
    seed: buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: governance.decisionTraceId ?? null,
      turnId: input.turnId ?? 'unknown-turn',
      reply,
      performance: embodiment.performance,
      embodiment,
      speechTimeline: seededSpeechTimeline,
      digitalLife: null,
      digitalLifeSpine: (emittedDigitalLifeSpine ?? null) as NonNullable<Parameters<typeof buildAlicizationRuntimeEmbodimentSeed>[0]>['digitalLifeSpine'],
      affectiveResidue: input.affectiveResidue ?? null,
      currentConsciousFrame: normalizedCurrentConsciousFrame,
    }),
    manifest: input.performanceManifest,
    residentPerformance: input.residentPerformance ?? null,
  })
  const emittedEmbodiment = authority.embodiment as AlicizationDialogueEmbodimentEnvelope | null
  const emittedEmbodimentScript = authority.embodimentScript as AlicizationDialogueStructuredPayload['embodimentScript']
  const emittedDigitalLife = (authority.digitalLife
    ? {
        ...authority.digitalLife,
        spine: emittedDigitalLifeSpine ?? null,
      }
    : authority.digitalLife) as AlicizationDialogueStructuredPayload['digitalLife']
  const emittedSpeechTimeline = authority.speechTimeline

  const digitalLife = emittedDigitalLife
    ? {
        ...emittedDigitalLife,
        spine: emittedDigitalLifeSpine ?? null,
      }
    : emittedDigitalLife

  return {
    governance,
    embodiment: emittedEmbodiment,
    embodimentScript: emittedEmbodimentScript,
    speechTimeline: emittedSpeechTimeline,
    digitalLife,
    digitalLifeSpine: emittedDigitalLifeSpine,
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
      if (/^learning:(?:record|reflect|verify|revise|internalize|hold)$/u.test(reasonCode))
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
  }
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
  return 'neutral'
}

export {
  formatGovernedMindMessage,
  governedMindFallbackLocale,
  governedMindFallbackMessageFallbacks,
  inferGovernedMindFallbackLocaleForUserText,
}

export const translateGovernedMindFallback = translateGovernedMindFallbackShared

export function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

function summarizeMindTurnEventDigitalLifeSpine(raw: unknown, memoryClosureTrace?: unknown) {
  const rawRecord = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  const rawMemory = rawRecord?.memory && typeof rawRecord.memory === 'object' && !Array.isArray(rawRecord.memory)
    ? rawRecord.memory as Record<string, unknown>
    : null
  const spineInput = memoryClosureTrace && rawRecord
    ? {
        ...rawRecord,
        memory: {
          ...rawMemory,
          memoryClosureTrace,
        },
      }
    : raw
  const spine = normalizeAlicizationDigitalLifeSpineDigest(spineInput)
  if (!spine)
    return null

  const personStateProjection = spine.memory?.personStateProjection ?? null
  const memoryClosureTraceSummary = spine.memory?.memoryClosureTrace
    ? {
        authority: spine.memory.memoryClosureTrace.authority,
        whySurface: spine.memory.memoryClosureTrace.whySurface,
        surfacePolicy: spine.memory.memoryClosureTrace.surfacePolicy,
        nextInfluence: spine.memory.memoryClosureTrace.nextInfluence,
        closureState: spine.memory.memoryClosureTrace.closureState,
        selectedCandidateIds: spine.memory.memoryClosureTrace.selectedCandidateIds,
        memoryIdentity: spine.memory.memoryClosureTrace.memoryIdentity ?? null,
        reasonTags: spine.memory.memoryClosureTrace.reasonTags,
      }
    : null
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
          memoryClosureTrace: memoryClosureTraceSummary,
          personStateProjection: personStateProjection
            ? {
                selfContinuityAuthority: personStateProjection.selfContinuityAuthority
                  ? {
                      sourceTags: Array.from(new Set((Array.isArray(personStateProjection.selfContinuityAuthority.sourceTags)
                        ? personStateProjection.selfContinuityAuthority.sourceTags
                        : []))).slice(0, 8),
                      selfLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.selfLine, 120),
                      relationshipLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.relationshipLine, 120),
                      motiveLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.motiveLine, 120),
                      habitLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.habitLine, 120),
                      inwardLine: excerptGovernedReply(personStateProjection.selfContinuityAuthority.inwardLine, 120),
                      authoritySummary: excerptGovernedReply(personStateProjection.selfContinuityAuthority.authoritySummary, 160),
                    }
                  : null,
                activeClosenessContext: personStateProjection.activeClosenessContext,
                activeClosenessRung: personStateProjection.activeClosenessRung,
                relationshipPosture: personStateProjection.relationshipPosture,
                preferredProactiveStyle: personStateProjection.preferredProactiveStyle,
              }
            : null,
        }
      : null,
    outcomeLearning: spine.outcomeLearning
      ? {
          summary: excerptGovernedReply(spine.outcomeLearning.summary, 180),
          latestInflection: excerptGovernedReply(spine.outcomeLearning.latestInflection, 160),
          nextLearningAction: spine.outcomeLearning.nextLearningAction,
        }
      : null,
    embodiment: spine.embodiment
      ? {
          autobiographicalSelf: spine.embodiment.autobiographicalSelf
            ? {
                relationshipDoctrine: excerptGovernedReply(spine.embodiment.autobiographicalSelf.relationshipDoctrine, 180),
              }
            : null,
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

function readStructuredVisibleReplyRealization(
  structuredPayload: Record<string, unknown>,
): AlicizationConversationTurnInput['visibleReplyRealization'] | undefined {
  const raw = structuredPayload.visibleReplyRealization
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return undefined

  const candidate = raw as Record<string, unknown>
  if (candidate.version === 'visible-reply-realization-v1')
    return candidate as unknown as AlicizationConversationTurnInput['visibleReplyRealization']

  const hasLegacyVisibleReplyShape = (
    typeof candidate.visibleText === 'string'
    || typeof candidate.expectedAuthority === 'string'
    || typeof candidate.actualAuthority === 'string'
    || typeof candidate.mode === 'string'
    || typeof candidate.reason === 'string'
    || typeof candidate.providerMindExecuted === 'boolean'
    || Array.isArray(candidate.blockedReasons)
  )
  return hasLegacyVisibleReplyShape
    ? candidate as unknown as AlicizationConversationTurnInput['visibleReplyRealization']
    : undefined
}

function sanitizeVisibleReplyCriticSummary(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const status = candidate.status === 'pass'
    ? 'pass' as const
    : candidate.status === 'blocked'
      ? 'blocked' as const
      : null
  if (!status)
    return null

  return {
    version: 'visible-reply-critic-public-summary-v1' as const,
    status,
    providerMindRequired: candidate.providerMindRequired === true,
    reasonCodes: Array.isArray(candidate.reasonCodes)
      ? candidate.reasonCodes.filter((reason): reason is string => typeof reason === 'string')
      : [],
  }
}

function sanitizeVisibleReplyClosureSummary(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const status = candidate.status === 'approved'
    ? 'approved' as const
    : candidate.status === 'blocked'
      ? 'blocked' as const
      : null
  if (!status)
    return null
  const normalizeCriticStatus = (value: unknown) =>
    value === 'pass'
      ? 'pass' as const
      : value === 'blocked'
        ? 'blocked' as const
        : null

  return {
    version: 'visible-reply-closure-public-summary-v1' as const,
    status,
    reasonCodes: Array.isArray(candidate.reasonCodes)
      ? candidate.reasonCodes.filter((reason): reason is string => typeof reason === 'string')
      : [],
    initialCriticStatus: normalizeCriticStatus(candidate.initialCriticStatus),
    finalCriticStatus: normalizeCriticStatus(candidate.finalCriticStatus),
  }
}

function sanitizeVisibleReplyRealizationForProviderReply(
  raw: AlicizationConversationTurnInput['visibleReplyRealization'] | null | undefined,
  providerReply: string,
): AlicizationConversationTurnInput['visibleReplyRealization'] {
  if (!raw)
    return undefined

  const actualAuthority = raw.actualAuthority === 'llm-mind'
    || raw.actualAuthority === 'local-deterministic-fallback'
    || raw.actualAuthority === 'non-human-authored-blocked'
    ? raw.actualAuthority
    : null
  const mode = raw.mode === 'provider-stream'
    || raw.mode === 'provider-one-shot'
    || raw.mode === 'local-fallback'
    ? raw.mode
    : null
  const visibleReplyValidationStatus = raw.visibleReplyValidationStatus === 'approved'
    || raw.visibleReplyValidationStatus === 'blocked'
    || raw.visibleReplyValidationStatus === 'unknown'
    ? raw.visibleReplyValidationStatus
    : 'unknown'
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority,
    providerMindExecuted: raw.providerMindExecuted === true,
    mode,
    visibleText: providerReply || null,
    visibleReplyValidationStatus,
    nonHumanAuthoredStatus: typeof raw.nonHumanAuthoredStatus === 'string'
      ? raw.nonHumanAuthoredStatus
      : null,
    blockedReasons: Array.isArray(raw.blockedReasons)
      ? raw.blockedReasons.filter((reason): reason is string => typeof reason === 'string')
      : [],
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    critic: sanitizeVisibleReplyCriticSummary(raw.critic),
    closure: sanitizeVisibleReplyClosureSummary(raw.closure),
  }
}

function resolveProviderVisibleReplyAuthorityFailure(input: {
  turn: AlicizationConversationTurnInput
  structuredPayload: Record<string, unknown>
  visibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization']
}) {
  const structuredAuthority = readStringValue(input.structuredPayload.visibleReplyAuthority).trim()
  if (structuredAuthority && structuredAuthority !== 'llm-mind')
    return 'structured-visible-reply-authority-invalid'

  const execution = input.turn.visibleReplyExecution
  if (
    execution
    && (
      execution.providerMindExecuted !== true
      || execution.actualVisibleReplyAuthority !== 'llm-mind'
    )
  ) {
    return 'visible-reply-execution-invalid'
  }

  const realization = input.visibleReplyRealization
  if (
    realization
    && (
      realization.providerMindExecuted !== true
      || realization.actualAuthority !== 'llm-mind'
    )
  ) {
    return 'visible-reply-realization-authority-invalid'
  }

  return null
}

function blockVisibleReplyRealization(
  raw: AlicizationConversationTurnInput['visibleReplyRealization'],
  providerReply: string,
  reasons: string[],
): AlicizationConversationTurnInput['visibleReplyRealization'] {
  if (!raw)
    return undefined

  const sanitized = sanitizeVisibleReplyRealizationForProviderReply(raw, providerReply)
  if (!sanitized)
    return undefined

  return {
    ...sanitized,
    actualAuthority: 'non-human-authored-blocked',
    visibleText: providerReply || null,
    nonHumanAuthoredStatus: 'non-human-authored-blocked',
    blockedReasons: Array.from(new Set([
      ...(Array.isArray(raw.blockedReasons) ? raw.blockedReasons : []),
      ...reasons,
    ])),
  }
}

export function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  },
) {
  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(options?.currentConsciousFrame)
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const providerReply = readStringValue(structuredPayload.reply).trim()
  const rawVisibleReplyRealization
    = input.visibleReplyRealization ?? readStructuredVisibleReplyRealization(structuredPayload)
  const sanitizedVisibleReplyRealization = sanitizeVisibleReplyRealizationForProviderReply(
    rawVisibleReplyRealization,
    providerReply,
  )
  const visibleReplyAuthorityFailure = resolveProviderVisibleReplyAuthorityFailure({
    turn: input,
    structuredPayload,
    visibleReplyRealization: rawVisibleReplyRealization,
  })
  const sanitizedPayload = {
    ...input,
    visibleReplyRealization: sanitizedVisibleReplyRealization,
    structured: {
      ...structuredPayload,
      visibleReplyRealization: sanitizedVisibleReplyRealization,
    },
  }
  const structuredRuntimeDigest = normalizeAlicizationRuntimeDigest(
    structuredPayload.runtimeDigest,
  ) as AlicizationRuntimeDigest | null
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    rawFormat: structuredPayload.format,
    origin: input.origin,
  })
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (autonomousDialogueFamily.isAutonomous) {
    if (!governance)
      return { payload: sanitizedPayload, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

    const tracedGovernance = {
      ...governance,
      decisionTraceId: ensureMindGovernanceDecisionTraceId(governance.decisionTraceId),
    } satisfies AlicizationMindTurnGovernance
    return {
      payload: {
        ...sanitizedPayload,
        governance: tracedGovernance,
        structured: {
          ...(sanitizedPayload.structured as Record<string, unknown>),
          governance: tracedGovernance,
        },
      },
      governance: tracedGovernance,
      tookOver: false,
      replyOverridden: false,
      reasons: [] as string[],
      audit: null as Record<string, unknown> | null,
    }
  }
  if (!governance)
    return { payload: sanitizedPayload, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = providerReply
  const thought = readStringValue(structuredPayload.thought).trim()
  const rawFormat = readStringValue(structuredPayload.format).trim()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: structuredPayload.format,
    contractFailed: structuredPayload.contractFailed === true,
    hasGovernance: true,
    origin: input.origin,
  })
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
    governance: anchorCoherentGovernance,
    userText: input.userText,
  })
  const coherentGovernance = (executionFirstGovernance.governance ?? anchorCoherentGovernance) as AlicizationMindTurnGovernance
  const invalidFormat = rawFormat !== 'mind-turn-v1'
  const invalidParsePath = parsePath !== 'json'
  const contractFailed = structuredPayload.contractFailed === true
  const missingProviderReply = !reply
  if (
    contractFailed
    || invalidFormat
    || invalidParsePath
    || missingProviderReply
    || visibleReplyAuthorityFailure
  ) {
    const reasons = [
      contractFailed ? 'structured-contract-failed' : '',
      invalidFormat ? 'structured-format-invalid' : '',
      invalidParsePath ? 'structured-parsepath-invalid' : '',
      missingProviderReply ? 'structured-reply-missing' : '',
      visibleReplyAuthorityFailure ?? '',
    ].filter(Boolean)
    const blockedVisibleReplyRealization = blockVisibleReplyRealization(
      sanitizedVisibleReplyRealization,
      readStringValue(structuredPayload.reply),
      reasons,
    )
    return {
      payload: {
        ...sanitizedPayload,
        visibleReplyRealization: blockedVisibleReplyRealization,
        governance: coherentGovernance,
        structured: {
          ...(sanitizedPayload.structured as Record<string, unknown>),
          reply: readStringValue(structuredPayload.reply),
          visibleReplyAuthority: 'non-human-authored-blocked',
          visibleReplyRealization: blockedVisibleReplyRealization,
          format: rawFormat || structuredPayload.format,
          parsePath: parsePath || structuredPayload.parsePath,
          contractFailed: true,
          governance: coherentGovernance,
        },
      },
      governance: coherentGovernance,
      tookOver: false,
      replyOverridden: false,
      reasons,
      audit: {
        owner_before: ownerBefore,
        owner_after: resolveGovernanceTurnOwner(coherentGovernance),
        contract_failed: true,
      },
    }
  }
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const candidateReply = reply
  const reasons = [
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    executionFirstGovernance.applied ? 'execution-first-governance-normalized' : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)
  const overrideClass = 'none'
  const fallbackPatternId = 'none'
  const finalReply = candidateReply
  const finalThought = thought
  const finalEmotion = resolveMindGovernanceEmotion(coherentGovernance, normalizedEmotion)
  const finalDigitalLifeSpine = normalizeGovernanceDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const finalPerformance = alignDialoguePerformanceEmotion(structuredPayload.performance, finalEmotion)
  const finalRendererNativePerformance = finalPerformance
  const finalParsePath = parsePath
  const normalizedAssistantText = finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  const tookOver = Boolean(
    structuredPayload.governance == null
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || readStringValue(input.assistantText).trim() !== normalizedAssistantText
    || JSON.stringify(structuredPayload.performance ?? null) !== JSON.stringify(finalRendererNativePerformance),
  )
  const finalEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: finalEmotion,
    candidatePerformance: finalRendererNativePerformance,
    governance: coherentGovernance,
    performanceManifest,
    reply: finalReply,
    thought: finalThought,
    turnId: input.turnId,
  })
  const finalSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply: finalReply,
    candidateEmotion: finalEmotion,
    candidatePerformance: finalRendererNativePerformance,
    embodiment: finalEmbodiment,
    digitalLifeSpine: finalDigitalLifeSpine,
    performanceManifest,
  })
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
    performance: finalRendererNativePerformance,
    embodiment: finalEmbodiment,
    speechTimeline: finalSpeechTimeline,
    digitalLife: finalDigitalLife as AlicizationDigitalLifeEnvelope | null,
    digitalLifeSpine: finalDigitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
    affectiveResidue:
      structuredRuntimeDigest?.affectiveResidue
      ?? structuredRuntimeDigest?.derivedMindStateBundle?.affectiveResidue
      ?? null,
    currentConsciousFrame: normalizedCurrentConsciousFrame,
  })
  const finalEmbodimentAuthority = coordinateAlicizationRuntimeEmbodiment({
    seed: finalEmbodimentSeed,
    manifest: performanceManifest,
    residentPerformance: null,
  })
  const finalEmbodimentScript = finalEmbodimentAuthority.embodimentScript
  const normalizedFinalDigitalLife = finalEmbodimentAuthority.digitalLife ?? finalDigitalLife
  const normalizedProactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const finalProactive = normalizedProactive

  return {
    payload: {
      ...sanitizedPayload,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...(sanitizedPayload.structured as Record<string, unknown>),
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        visibleReplyAuthority: 'llm-mind',
        performance: finalEmbodimentAuthority.embodiment?.performance ?? finalRendererNativePerformance,
        embodiment: finalEmbodimentAuthority.embodiment ?? finalEmbodiment,
        embodimentScript: finalEmbodimentScript,
        speechTimeline: finalEmbodimentAuthority.speechTimeline ?? finalSpeechTimeline,
        digitalLife: normalizedFinalDigitalLife,
        digitalLifeSpine: finalDigitalLifeSpine,
        proactive: finalProactive,
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
    replyOverridden: false,
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
      execution_reason_codes: executionFirstGovernance.reasonCodes,
      execution_turn_mode_before: anchorCoherentGovernance.turnMode,
      execution_turn_mode_after: coherentGovernance.turnMode,
      execution_answer_act_before: anchorCoherentGovernance.answerAct ?? null,
      execution_answer_act_after: coherentGovernance.answerAct ?? null,
      execution_screen_mode_before: anchorCoherentGovernance.screenReferenceMode ?? null,
      execution_screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      visible_reply_authority: 'llm-mind-structured',
      visible_reply_realization_authority: 'llm-mind',
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
  withheldReasons?: string[]
  shouldStayInward?: boolean
  restraintSurfaceMode?: 'inward-only' | 'stable-core-only' | 'provenance-labeled' | 'free' | null
  restraintProvenanceMode?: 'none' | 'memory' | 'dream-residue' | 'inferred-pattern' | 'reconstructed-memory' | 'mixed-memory' | null
  shouldOnlySurfaceStableCore?: boolean
  shouldLabelProvenance?: boolean
  shouldLabelHypothesis?: boolean
  shouldSuppressSpecificity?: boolean
  shouldDelayUntilAfterPayoff?: boolean
  memoryControl?: {
    memoryPressure: 'low' | 'medium' | 'high'
    certaintyFloor: 'firm' | 'approximate' | 'fragmentary'
    relationshipVector: 'neutral' | 'threaded' | 'procedural' | 'relational'
    conflictBurden: 'none' | 'low' | 'medium' | 'high'
    provenancePosture: string
    detailAssertionBudget: 'open' | 'guarded' | 'minimal'
    surfacePermission: 'inward-only' | 'soft-surface' | 'explicit-surface'
    retrospectiveDepth: 'fragment' | 'thread' | 'period'
    labelUncertainty: boolean
  } | null
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  relationshipPosture?: string | null
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
  selectedSituations?: Array<{
    id: string
    kind: string
    summary: string
    evidenceSummary?: string | null
    statusReason?: string | null
    sourceKinds?: string[]
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

function sanitizeMindTraceReasonCodes(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return [...new Set(raw
    .map(item => sanitizeMindTraceTelemetryText(item, 64))
    .filter(Boolean))]
    .slice(0, 12)
}

function summarizeMindTraceMemoryControl(
  control: AlicizationMindTraceMemorySnapshot['memoryControl'],
) {
  if (!control)
    return null
  return {
    memoryPressure: control.memoryPressure,
    certaintyFloor: control.certaintyFloor,
    relationshipVector: control.relationshipVector,
    conflictBurden: control.conflictBurden,
    provenancePosture: sanitizeMindTraceTelemetryText(control.provenancePosture, 64),
    detailAssertionBudget: control.detailAssertionBudget,
    surfacePermission: control.surfacePermission,
    retrospectiveDepth: control.retrospectiveDepth,
    labelUncertainty: control.labelUncertainty,
  }
}

function extractMindTraceTokens(raw: string) {
  const normalized = sanitizeMindTraceTelemetryText(raw, 220).toLowerCase()
  if (!normalized)
    return [] as string[]

  const tokens = normalized.match(/\p{Script=Han}{1,6}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
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
    withheldReasons: sanitizeMindTraceReasonCodes(snapshot.withheldReasons),
    shouldStayInward: snapshot.shouldStayInward ?? false,
    restraintSurfaceMode: sanitizeMindTraceTelemetryText(snapshot.restraintSurfaceMode, 64) || null,
    restraintProvenanceMode: sanitizeMindTraceTelemetryText(snapshot.restraintProvenanceMode, 64) || null,
    shouldOnlySurfaceStableCore: snapshot.shouldOnlySurfaceStableCore ?? false,
    shouldLabelProvenance: snapshot.shouldLabelProvenance ?? false,
    shouldLabelHypothesis: snapshot.shouldLabelHypothesis ?? false,
    shouldSuppressSpecificity: snapshot.shouldSuppressSpecificity ?? false,
    shouldDelayUntilAfterPayoff: snapshot.shouldDelayUntilAfterPayoff ?? false,
    memoryControl: summarizeMindTraceMemoryControl(snapshot.memoryControl),
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
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
    selectedSituations: (snapshot.selectedSituations ?? []).map(item => ({
      id: sanitizeMindTraceTelemetryText(item.id, 180),
      kind: sanitizeMindTraceTelemetryText(item.kind, 64),
      summary: sanitizeMindTraceTelemetryText(item.summary, 180),
      evidenceSummary: sanitizeMindTraceTelemetryText(item.evidenceSummary, 520) || null,
      statusReason: sanitizeMindTraceTelemetryText(item.statusReason, 200) || null,
      sourceKinds: (item.sourceKinds ?? [])
        .map(kind => sanitizeMindTraceTelemetryText(kind, 64))
        .filter(Boolean)
        .slice(0, 8),
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
    ...(input.snapshot.selectedSituations ?? []).flatMap(item => ([
      { kind: 'situation', text: item.summary },
      { kind: 'situation', text: item.evidenceSummary ?? '' },
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
    withheldReasons: sanitizeMindTraceReasonCodes(input.snapshot.withheldReasons),
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
  }
}

function summarizeMemoryDeliberationJudgedPayload(snapshot: AlicizationMindTraceMemorySnapshot) {
  return {
    shouldRecall: snapshot.shouldRecall,
    surfacePolicy: snapshot.surfacePolicy,
    confidence: Number(clamp01(snapshot.confidence).toFixed(2)),
    whyNow: sanitizeMindTraceTelemetryText(snapshot.whyNow, 240) || null,
    withheldReasons: sanitizeMindTraceReasonCodes(snapshot.withheldReasons),
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
    memoryControl: summarizeMindTraceMemoryControl(snapshot.memoryControl),
    personState: {
      activeClosenessContext: sanitizeMindTraceTelemetryText(snapshot.activeClosenessContext, 64) || null,
      activeClosenessRung: sanitizeMindTraceTelemetryText(snapshot.activeClosenessRung, 64) || null,
      relationshipPosture: sanitizeMindTraceTelemetryText(snapshot.relationshipPosture, 64) || null,
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

  if ((input.snapshot.withheldReasons?.length ?? 0) > 0 || input.snapshot.shouldStayInward || input.snapshot.restraintSurfaceMode === 'inward-only') {
    events.push({
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: input.origin,
      kind: 'memory-recall-withheld',
      payload: {
        withheldReasons: sanitizeMindTraceReasonCodes(input.snapshot.withheldReasons),
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
        withheldReasons: sanitizeMindTraceReasonCodes(input.snapshot.withheldReasons),
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
        withheldReasons: sanitizeMindTraceReasonCodes(input.snapshot.withheldReasons),
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
        withheldReasons: sanitizeMindTraceReasonCodes(input.snapshot.withheldReasons),
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

function readMindTurnEventEmbodimentAuthorityFields(input: {
  structured: Record<string, unknown>
  digitalLifeSpine: ReturnType<typeof summarizeMindTurnEventDigitalLifeSpine> | null
  visibleReply?: {
    expectedAuthority?: unknown
    actualAuthority?: unknown
    providerMindExecuted?: unknown
  } | null
}) {
  const digitalLife = input.structured.digitalLife && typeof input.structured.digitalLife === 'object'
    ? input.structured.digitalLife as AlicizationDialogueStructuredPayload['digitalLife']
    : null
  const digitalLifeRecord = digitalLife
    ? ((digitalLife as unknown) as Record<string, unknown>)
    : null
  const digitalLifeFace = digitalLife?.face
    ? ((digitalLife.face as unknown) as Record<string, unknown>)
    : null
  const digitalLifeVoice = digitalLife?.voice
    ? ((digitalLife.voice as unknown) as Record<string, unknown>)
    : null
  const digitalLifeMotion = digitalLifeRecord?.motion && typeof digitalLifeRecord.motion === 'object'
    ? digitalLifeRecord.motion as Record<string, unknown>
    : null
  const digitalLifeLipSync = digitalLife?.lipSync
    ? ((digitalLife.lipSync as unknown) as Record<string, unknown>)
    : null
  const digitalLifeBodyContinuity = digitalLifeRecord?.bodyContinuity && typeof digitalLifeRecord.bodyContinuity === 'object'
    ? digitalLifeRecord.bodyContinuity as Record<string, unknown>
    : null
  const digitalLifeAction = digitalLifeRecord?.action && typeof digitalLifeRecord.action === 'object'
    ? digitalLifeRecord.action as Record<string, unknown>
    : null
  const digitalLifePerformance = digitalLife?.performance
    ? ((digitalLife.performance as unknown) as Record<string, unknown>)
    : null
  const embodimentScript = input.structured.embodimentScript && typeof input.structured.embodimentScript === 'object'
    ? input.structured.embodimentScript as AlicizationDialogueStructuredPayload['embodimentScript']
    : null
  const embodimentScriptState = embodimentScript?.state
    ? ((embodimentScript.state as unknown) as Record<string, unknown>)
    : null
  const embodimentScriptSpeechPlan = embodimentScript?.speechPlan
    ? ((embodimentScript.speechPlan as unknown) as Record<string, unknown>)
    : null
  const residentMode = embodimentScript?.state.residentMode ?? null
  const spineMemory = input.digitalLifeSpine?.memory
    ? ((input.digitalLifeSpine.memory as unknown) as Record<string, unknown>)
    : null
  const spinePersonState = spineMemory?.personStateProjection && typeof spineMemory.personStateProjection === 'object'
    ? spineMemory.personStateProjection as Record<string, unknown>
    : null
  const spineSelfContinuity = spinePersonState?.selfContinuityAuthority && typeof spinePersonState.selfContinuityAuthority === 'object'
    ? spinePersonState.selfContinuityAuthority as Record<string, unknown>
    : null
  const spineOutcomeLearning = input.digitalLifeSpine?.outcomeLearning
    ? ((input.digitalLifeSpine.outcomeLearning as unknown) as Record<string, unknown>)
    : null
  const spineEmbodiment = input.digitalLifeSpine?.embodiment
    ? ((input.digitalLifeSpine.embodiment as unknown) as Record<string, unknown>)
    : null
  const spineAutobiographicalSelf = spineEmbodiment?.autobiographicalSelf && typeof spineEmbodiment.autobiographicalSelf === 'object'
    ? spineEmbodiment.autobiographicalSelf as Record<string, unknown>
    : null
  const bodyLine = digitalLifeBodyContinuity?.bodyLine
    ?? spineSelfContinuity?.inwardLine
    ?? spineSelfContinuity?.relationshipLine
    ?? spineSelfContinuity?.selfLine
    ?? spineSelfContinuity?.authoritySummary
    ?? spineOutcomeLearning?.latestInflection
    ?? spineAutobiographicalSelf?.relationshipDoctrine
    ?? null
  const visibleReply = input.visibleReply ?? null

  return {
    ...(digitalLife
      ? {
          digitalLife: {
            emotion: digitalLife.emotion,
            mode: digitalLife.mode,
            performance: digitalLifePerformance
              ? {
                  baseEmotion: digitalLifePerformance.baseEmotion ?? null,
                  facialCue: digitalLifePerformance.facialCue ?? null,
                  actionCue: digitalLifePerformance.actionCue ?? null,
                }
              : null,
            face: {
              residentMode: digitalLifeFace?.residentMode ?? residentMode,
              emotion: digitalLife.face.emotion,
              facialCue: digitalLife.face.facialCue ?? null,
            },
            voice: {
              residentMode: digitalLifeVoice?.residentMode ?? residentMode,
            },
            motion: {
              residentMode: digitalLifeMotion?.residentMode ?? residentMode,
            },
            lipSync: {
              residentMode: digitalLifeLipSync?.residentMode ?? residentMode,
            },
            bodyContinuity: {
              bodyLine,
            },
            action: {
              actionCue: digitalLifeAction?.actionCue ?? null,
              actionMode: digitalLifeAction?.actionMode ?? null,
            },
          },
        }
      : {}),
    ...(embodimentScript
      ? {
          embodimentScript: {
            rendererTarget: embodimentScript.rendererTarget,
            state: {
              baseEmotion: embodimentScriptState?.baseEmotion ?? null,
              delivery: embodimentScriptState?.delivery ?? null,
              emphasis: embodimentScriptState?.emphasis ?? null,
              residentMode: embodimentScriptState?.residentMode ?? null,
            },
            speechPlan: {
              segmentCount: Array.isArray(embodimentScript.speechPlan?.segments)
                ? embodimentScript.speechPlan.segments.length
                : embodimentScriptSpeechPlan?.segmentCount ?? null,
              interruptPolicy: embodimentScriptSpeechPlan?.interruptPolicy ?? null,
            },
          },
        }
      : {}),
    ...(visibleReply
      ? {
          visibleReply: {
            expectedAuthority: readStringValue(visibleReply.expectedAuthority).trim() || null,
            actualAuthority: readStringValue(visibleReply.actualAuthority).trim() || null,
            providerMindExecuted: typeof visibleReply.providerMindExecuted === 'boolean'
              ? visibleReply.providerMindExecuted
              : null,
          },
        }
      : {}),
  }
}

function readMindTurnTraceRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readMindTurnTraceText(raw: unknown, maxChars = 260) {
  const value = sanitizeBriefText(readStringValue(raw), maxChars)
  if (/^[\p{L}_][\p{L}\p{N}_-]*\s*=/u.test(value))
    return ''
  return value
}

function readMindTurnTraceTextList(raw: unknown, maxItems = 12) {
  return Array.isArray(raw)
    ? raw
        .map(item => readMindTurnTraceText(item, 160))
        .filter(Boolean)
        .slice(0, maxItems)
    : []
}

function joinMindTurnTraceText(values: unknown[], maxChars = 360) {
  return sanitizeBriefText(
    values
      .map(value => readMindTurnTraceText(value, maxChars))
      .filter(Boolean)
      .join(' '),
    maxChars,
  )
}

function normalizeMemoryClosureLearningAction(
  raw: unknown,
): AlicizationLearningExecutionStateSnapshot['nextLearningAction'] {
  const value = readMindTurnTraceText(raw, 64)
  return value === 'record'
    || value === 'reflect'
    || value === 'verify'
    || value === 'revise'
    || value === 'internalize'
    || value === 'hold'
    ? value
    : null
}

const memoryClosureEmbodimentLanes = ['body', 'voice', 'face', 'motion', 'lipsync'] as const

function buildMemoryClosureTraceDerivedMindStateBundle(input: {
  structured: Record<string, unknown>
  digitalLifeSpine: ReturnType<typeof summarizeMindTurnEventDigitalLifeSpine> | null
  dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null
  createdAt: number
  turnId: string | null
}) {
  const explicit = normalizeAlicizationDerivedMindStateBundle(
    input.structured.derivedMindStateBundle,
  )
  const memoryClosureTrace = readMindTurnTraceRecord(
    input.digitalLifeSpine?.memory?.memoryClosureTrace,
  ) ?? readMindTurnTraceRecord(input.structured.memoryClosureTrace)
  if (!memoryClosureTrace)
    return explicit

  const nextInfluence = readMindTurnTraceRecord(memoryClosureTrace.nextInfluence)
  const emotionInfluence = readMindTurnTraceRecord(nextInfluence?.emotion)
  const initiativeInfluence = readMindTurnTraceRecord(nextInfluence?.initiative)
  const executionInfluence = readMindTurnTraceRecord(nextInfluence?.execution)
  const embodimentInfluence = readMindTurnTraceRecord(nextInfluence?.embodiment)
  if (!emotionInfluence && !initiativeInfluence && !executionInfluence && !embodimentInfluence)
    return explicit

  const behaviorModeTokens = new Set([
    initiativeInfluence?.restraint,
    initiativeInfluence?.pressure,
    initiativeInfluence?.mode,
    embodimentInfluence?.preferredVoiceMode,
    embodimentInfluence?.preferredLipsyncMode,
    embodimentInfluence?.preferredGazeMode,
  ].map(value => readMindTurnTraceText(value, 80)).filter(Boolean))
  const reasonTags = [...new Set([
    ...readMindTurnTraceTextList(memoryClosureTrace.reasonTags, 12)
      .filter(tag => !behaviorModeTokens.has(tag)),
    'memory-closure-trace',
  ])]
  const selectedCandidateIds = readMindTurnTraceTextList(
    memoryClosureTrace.selectedCandidateIds,
    8,
  )
  const explicitMemoryIdentity = readMindTurnTraceRecord(memoryClosureTrace.memoryIdentity)
  const identityCandidateIds = readMindTurnTraceTextList(
    explicitMemoryIdentity?.selectedCandidateIds,
    8,
  )
  const memoryIdentity = {
    selectedCandidateIds: identityCandidateIds.length > 0
      ? identityCandidateIds
      : selectedCandidateIds,
    continuityKey: readMindTurnTraceText(explicitMemoryIdentity?.continuityKey, 160)
      || selectedCandidateIds[0]
      || null,
    reasonTags: readMindTurnTraceTextList(explicitMemoryIdentity?.reasonTags, 8),
  }
  const hasMemoryIdentity = Boolean(
    memoryIdentity.continuityKey
    || memoryIdentity.selectedCandidateIds.length > 0
    || memoryIdentity.reasonTags.length > 0,
  )
  const authority = readMindTurnTraceText(memoryClosureTrace.authority, 80) || null
  const buildCausality = <
    T extends 'emotion' | 'initiative' | 'execution' | 'embodiment',
  >(affectedLane: T,
    summary: string,
  ) => ({
    causalSource: 'memory-closure-trace' as const,
    affectedLane,
    causedByMemoryClosure: true,
    traceAuthority: authority,
    reasonTags,
    memoryIdentity: hasMemoryIdentity ? memoryIdentity : null,
    summary: summary || null,
  })

  const initiativeSummary = joinMindTurnTraceText([
    initiativeInfluence?.reason,
    initiativeInfluence?.preferredTiming,
  ])
  const emotionSummary = joinMindTurnTraceText([
    emotionInfluence?.reason,
    emotionInfluence?.afterglow,
    emotionInfluence?.residue,
    initiativeSummary,
  ])
  const executionFocuses = readMindTurnTraceTextList(
    executionInfluence?.activeLearningFocuses,
    12,
  )
  const executionSummary = joinMindTurnTraceText([
    executionInfluence?.carry,
    executionInfluence?.reason,
    executionInfluence?.summary,
    executionInfluence?.nextLearningAction,
    executionFocuses.join(' '),
  ])
  const embodimentSummary = joinMindTurnTraceText([
    embodimentInfluence?.reason,
    embodimentInfluence?.cadence,
  ])

  const emotionalTransitionLedger: AlicizationEmotionalTransitionLedgerSnapshot | null
    = explicit?.emotionalTransitionLedger
      ? {
          ...explicit.emotionalTransitionLedger,
          initiativeSuppression: {
            ...explicit.emotionalTransitionLedger.initiativeSuppression,
            memoryClosureCausality:
              explicit.emotionalTransitionLedger.initiativeSuppression.memoryClosureCausality
              ?? (initiativeInfluence
                ? buildCausality('initiative', initiativeSummary)
                : null),
          },
          memoryClosureCausality:
            explicit.emotionalTransitionLedger.memoryClosureCausality
            ?? (emotionSummary || initiativeSummary
              ? buildCausality('emotion', emotionSummary || initiativeSummary)
              : null),
        }
      : emotionSummary || initiativeSummary
        ? {
            version: 'emotional-transition-ledger-v1',
            createdAt: input.createdAt,
            turnId: input.turnId,
            previousEmotion: null,
            nextEmotion: explicit?.emotionalKernel?.dominantEmotion ?? 'hesitant-curiosity',
            transitionKind: 'stable',
            axisDeltas: {
              valence: 0,
              arousal: 0,
              guardedness: 0,
              closenessDrive: 0,
              repairNeed: 0,
              initiativePressure: 0,
            },
            changedAxes: [],
            sourceTags: reasonTags,
            decayPolicy: {
              mode: 'decay-normally',
              carryTtlMs: 1_800_000,
              reason: emotionSummary || initiativeSummary,
            },
            memoryWriteback: {
              shouldWrite: true,
              lane: 'emotional-continuity',
              reason: emotionSummary || initiativeSummary,
            },
            initiativeSuppression: {
              shouldSuppress: false,
              mode: 'none',
              reason: initiativeSummary,
              memoryClosureCausality: initiativeInfluence
                ? buildCausality('initiative', initiativeSummary)
                : null,
            },
            embodimentDrive: {
              shouldDrive: false,
              tone: null,
              reason: embodimentSummary,
            },
            traceSummary: emotionSummary || initiativeSummary,
            replayLine: emotionSummary || initiativeSummary,
            memoryClosureCausality: buildCausality(
              'emotion',
              emotionSummary || initiativeSummary,
            ),
          }
        : explicit?.emotionalTransitionLedger ?? null

  const embodimentContinuityLedger: AlicizationEmbodimentContinuityLedgerSnapshot | null
    = explicit?.embodimentContinuityLedger
      ?? (embodimentSummary
        ? {
            version: 'embodiment-continuity-ledger-v1',
            createdAt: input.createdAt,
            turnId: input.turnId,
            lanes: Object.fromEntries(memoryClosureEmbodimentLanes.map(lane => [
              lane,
              {
                status: 'carrying-continuity',
                summary: embodimentSummary || null,
              },
            ])) as NonNullable<AlicizationEmbodimentContinuityLedgerSnapshot['lanes']>,
            carryingLanes: [...memoryClosureEmbodimentLanes],
            droppedLanes: [],
            rejoinedLanes: [...memoryClosureEmbodimentLanes],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: true,
              lane: 'cross-modal-continuity',
              reason: embodimentSummary,
            },
            traceSummary: embodimentSummary,
            replayLine: embodimentSummary,
            sourceTags: reasonTags,
            memoryClosureCausality: buildCausality(
              'embodiment',
              embodimentSummary,
            ),
          }
        : null)

  const learningExecutionState: AlicizationLearningExecutionStateSnapshot | null
    = executionInfluence && executionSummary
      ? {
          currentTaskId: explicit?.learningExecutionState?.currentTaskId ?? null,
          currentStatus: explicit?.learningExecutionState?.currentStatus ?? null,
          currentAttemptCount: explicit?.learningExecutionState?.currentAttemptCount ?? 0,
          currentMaxAttempts: explicit?.learningExecutionState?.currentMaxAttempts ?? 0,
          currentNextRetryAt: explicit?.learningExecutionState?.currentNextRetryAt ?? null,
          currentBlockedReason: explicit?.learningExecutionState?.currentBlockedReason ?? null,
          currentFailureKind: explicit?.learningExecutionState?.currentFailureKind ?? null,
          nextLearningAction: normalizeMemoryClosureLearningAction(
            executionInfluence.nextLearningAction,
          ) ?? explicit?.learningExecutionState?.nextLearningAction ?? null,
          shouldRecord: executionInfluence.shouldRecord === true
            || explicit?.learningExecutionState?.shouldRecord === true,
          shouldReflect: executionInfluence.shouldReflect === true
            || explicit?.learningExecutionState?.shouldReflect === true,
          shouldVerify: executionInfluence.shouldVerify === true
            || explicit?.learningExecutionState?.shouldVerify === true,
          shouldRevise: executionInfluence.shouldRevise === true
            || explicit?.learningExecutionState?.shouldRevise === true,
          shouldInternalize: executionInfluence.shouldInternalize === true
            || explicit?.learningExecutionState?.shouldInternalize === true,
          activeLearningFocuses: [...new Set([
            ...executionFocuses,
            ...(explicit?.learningExecutionState?.activeLearningFocuses ?? []),
          ])].slice(0, 12),
          queuedTaskCount: explicit?.learningExecutionState?.queuedTaskCount ?? 0,
          runningTaskCount: explicit?.learningExecutionState?.runningTaskCount ?? 0,
          blockedTaskCount: explicit?.learningExecutionState?.blockedTaskCount ?? 0,
          recentTaskIds: explicit?.learningExecutionState?.recentTaskIds ?? [],
          lastCompletedTaskId: explicit?.learningExecutionState?.lastCompletedTaskId ?? null,
          lastCompletedAction: explicit?.learningExecutionState?.lastCompletedAction ?? null,
          lastCompletedSummary: explicit?.learningExecutionState?.lastCompletedSummary ?? null,
          lastFailureTaskId: explicit?.learningExecutionState?.lastFailureTaskId ?? null,
          lastFailureKind: explicit?.learningExecutionState?.lastFailureKind ?? null,
          lastFailureReason: explicit?.learningExecutionState?.lastFailureReason ?? null,
          lastFailureNextRetryAt: explicit?.learningExecutionState?.lastFailureNextRetryAt ?? null,
          updatedAt: explicit?.learningExecutionState?.updatedAt ?? input.createdAt,
          memoryClosureCausality: buildCausality('execution', executionSummary),
        }
      : explicit?.learningExecutionState ?? null

  if (!emotionalTransitionLedger && !embodimentContinuityLedger && !learningExecutionState)
    return explicit

  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: explicit?.source ?? 'main-runtime',
    producedAt: explicit?.producedAt ?? input.createdAt,
    visualPresenceState: explicit?.visualPresenceState ?? null,
    structured: explicit?.structured ?? null,
    hostPersonModel: explicit?.hostPersonModel ?? null,
    personStateProjection: explicit?.personStateProjection ?? null,
    knowledgeEvidence: explicit?.knowledgeEvidence ?? null,
    claimEvidenceGraphs: explicit?.claimEvidenceGraphs ?? null,
    activeSelfRevision: explicit?.activeSelfRevision ?? null,
    emotionalKernel: explicit?.emotionalKernel ?? null,
    emotionalTransitionLedger,
    embodimentContinuityLedger,
    selfEvolution: explicit?.selfEvolution ?? null,
    affectiveResidue: explicit?.affectiveResidue ?? null,
    learningExecutionState,
    recallLatencyPolicy: explicit?.recallLatencyPolicy ?? null,
    recollectionIntent: explicit?.recollectionIntent ?? null,
    recollectionPlan: explicit?.recollectionPlan ?? null,
    recollectionSpeechPlan: explicit?.recollectionSpeechPlan ?? null,
    memoryDeliberation: explicit?.memoryDeliberation ?? null,
    dialogueRhythm: explicit?.dialogueRhythm ?? null,
    summary: explicit?.summary ?? joinMindTurnTraceText([
      emotionSummary,
      initiativeSummary,
      executionSummary,
      embodimentSummary,
    ], 480),
  } satisfies AlicizationDerivedMindStateBundle)
}

export function buildMindTurnTraceEvents(input: {
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  createdAt: number
  dialoguePayload?: AlicizationNormalizedDialogueRespondedPayload | null
  memoryTrace?: AlicizationMindTraceMemorySnapshot | null
}): AlicizationMindTurnEventInput[] {
  const governance = input.governedTurn.governance
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(governance?.decisionTraceId)
  if (!decisionTraceId)
    return []

  const structured = input.payload.structured && typeof input.payload.structured === 'object'
    ? input.payload.structured as Record<string, unknown>
    : {}
  const fallbackMemoryClosureTrace = null
  const persistedDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
    structured.digitalLifeSpine,
    structured.memoryClosureTrace ?? fallbackMemoryClosureTrace,
  )
  const participation = deriveAlicizationMindParticipationFromSpine(
    normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine),
  )
  const visibleReplyAuthority = input.payload.visibleReplyExecution
    ? {
        expectedAuthority: input.payload.visibleReplyExecution.expectedVisibleReplyAuthority,
        actualAuthority: input.payload.visibleReplyExecution.actualVisibleReplyAuthority,
        providerMindExecuted: input.payload.visibleReplyExecution.providerMindExecuted,
      }
    : input.payload.visibleReplyRealization
      ? {
          expectedAuthority: input.payload.visibleReplyRealization.expectedAuthority,
          actualAuthority: input.payload.visibleReplyRealization.actualAuthority,
          providerMindExecuted: input.payload.visibleReplyRealization.providerMindExecuted,
        }
      : null
  const persistedEmbodimentAuthority = readMindTurnEventEmbodimentAuthorityFields({
    structured,
    digitalLifeSpine: persistedDigitalLifeSpine,
    visibleReply: visibleReplyAuthority,
  })
  const persistedDerivedMindStateBundle = buildMemoryClosureTraceDerivedMindStateBundle({
    structured: fallbackMemoryClosureTrace
      ? {
          ...structured,
          memoryClosureTrace: structured.memoryClosureTrace ?? fallbackMemoryClosureTrace,
        }
      : structured,
    digitalLifeSpine: persistedDigitalLifeSpine,
    dialoguePayload: input.dialoguePayload,
    createdAt: input.createdAt,
    turnId: sanitizeText(input.payload.turnId) || null,
  })
  const turnId = sanitizeText(input.payload.turnId) || null
  const sessionId = sanitizeText(input.payload.sessionId) || null
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId,
    rawFormat: structured.format,
    origin: input.payload.origin,
  })
  const origin = autonomousDialogueFamily.isAutonomous
    ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
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
      derivedMindStateBundle: persistedDerivedMindStateBundle,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      ...persistedEmbodimentAuthority,
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
      derivedMindStateBundle: persistedDerivedMindStateBundle,
      memoryStageReplay: structured.memoryStageReplay && typeof structured.memoryStageReplay === 'object'
        ? structured.memoryStageReplay
        : null,
      memoryResolutionLedger: structured.memoryResolutionLedger && typeof structured.memoryResolutionLedger === 'object'
        ? structured.memoryResolutionLedger
        : null,
      ...persistedEmbodimentAuthority,
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
    const dialogueStructured = input.dialoguePayload.structured as unknown as Record<string, unknown>
    const dialogueFallbackMemoryClosureTrace = readMindTurnTraceRecord(dialogueStructured.memoryClosureTrace)
      ? null
      : fallbackMemoryClosureTrace
    const dialogueDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
      dialogueStructured.digitalLifeSpine,
      dialogueStructured.memoryClosureTrace ?? structured.memoryClosureTrace ?? dialogueFallbackMemoryClosureTrace,
    ) ?? persistedDigitalLifeSpine
    const dialogueDigitalLife = input.dialoguePayload.structured.digitalLife
    const dialogueDigitalLifeRecord = dialogueDigitalLife
      ? ((dialogueDigitalLife as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeFace = dialogueDigitalLife?.face
      ? ((dialogueDigitalLife.face as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeVoice = dialogueDigitalLife?.voice
      ? ((dialogueDigitalLife.voice as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeMotion = dialogueDigitalLifeRecord?.motion
      && typeof dialogueDigitalLifeRecord.motion === 'object'
      ? (dialogueDigitalLifeRecord.motion as Record<string, unknown>)
      : null
    const dialogueDigitalLifeLipSync = dialogueDigitalLife?.lipSync
      ? ((dialogueDigitalLife.lipSync as unknown) as Record<string, unknown>)
      : null
    const dialogueDigitalLifeBodyContinuity = dialogueDigitalLifeRecord?.bodyContinuity
      && typeof dialogueDigitalLifeRecord.bodyContinuity === 'object'
      ? (dialogueDigitalLifeRecord.bodyContinuity as Record<string, unknown>)
      : null
    const dialogueSpineMemory = dialogueDigitalLifeSpine?.memory
      ? ((dialogueDigitalLifeSpine.memory as unknown) as Record<string, unknown>)
      : null
    const dialogueSpinePersonState = dialogueSpineMemory?.personStateProjection
      && typeof dialogueSpineMemory.personStateProjection === 'object'
      ? (dialogueSpineMemory.personStateProjection as Record<string, unknown>)
      : null
    const dialogueSpineSelfContinuity = dialogueSpinePersonState?.selfContinuityAuthority
      && typeof dialogueSpinePersonState.selfContinuityAuthority === 'object'
      ? (dialogueSpinePersonState.selfContinuityAuthority as Record<string, unknown>)
      : null
    const dialogueSpineOutcomeLearning = dialogueDigitalLifeSpine?.outcomeLearning
      ? ((dialogueDigitalLifeSpine.outcomeLearning as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineEmbodiment = dialogueDigitalLifeSpine?.embodiment
      ? ((dialogueDigitalLifeSpine.embodiment as unknown) as Record<string, unknown>)
      : null
    const dialogueSpineAutobiographicalSelf = dialogueSpineEmbodiment?.autobiographicalSelf
      && typeof dialogueSpineEmbodiment.autobiographicalSelf === 'object'
      ? (dialogueSpineEmbodiment.autobiographicalSelf as Record<string, unknown>)
      : null
    const dialogueEmbodimentResidentMode = input.dialoguePayload.structured.embodimentScript?.state.residentMode ?? null
    const dialogueBodyLine = dialogueDigitalLifeBodyContinuity?.bodyLine
      ?? dialogueSpineSelfContinuity?.inwardLine
      ?? dialogueSpineSelfContinuity?.relationshipLine
      ?? dialogueSpineSelfContinuity?.selfLine
      ?? dialogueSpineSelfContinuity?.authoritySummary
      ?? dialogueSpineOutcomeLearning?.latestInflection
      ?? dialogueSpineAutobiographicalSelf?.relationshipDoctrine
      ?? null
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
        digitalLife: dialogueDigitalLife
          ? {
              emotion: dialogueDigitalLife.emotion,
              mode: dialogueDigitalLife.mode,
              performance: {
                baseEmotion: dialogueDigitalLife.performance.baseEmotion,
                facialCue: dialogueDigitalLife.performance.facialCue ?? null,
                actionCue: dialogueDigitalLife.performance.actionCue ?? null,
              },
              face: {
                residentMode: dialogueDigitalLifeFace?.residentMode ?? dialogueEmbodimentResidentMode,
                emotion: dialogueDigitalLife.face.emotion,
                facialCue: dialogueDigitalLife.face.facialCue ?? null,
              },
              voice: {
                residentMode: dialogueDigitalLifeVoice?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              motion: {
                residentMode: dialogueDigitalLifeMotion?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              lipSync: {
                residentMode: dialogueDigitalLifeLipSync?.residentMode ?? dialogueEmbodimentResidentMode,
              },
              bodyContinuity: {
                bodyLine: dialogueBodyLine,
              },
              action: {
                actionCue: dialogueDigitalLife.action.actionCue ?? null,
                actionMode: dialogueDigitalLife.action.actionMode,
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
                residentMode: input.dialoguePayload.structured.embodimentScript.state.residentMode ?? null,
              },
              speechPlan: {
                segmentCount: input.dialoguePayload.structured.embodimentScript.speechPlan.segments.length,
                interruptPolicy: input.dialoguePayload.structured.embodimentScript.speechPlan.interruptPolicy,
              },
            }
          : null,
        digitalLifeSpine: dialogueDigitalLifeSpine,
        derivedMindStateBundle: buildMemoryClosureTraceDerivedMindStateBundle({
          structured: dialogueFallbackMemoryClosureTrace
            ? {
                ...dialogueStructured,
                memoryClosureTrace: dialogueStructured.memoryClosureTrace ?? dialogueFallbackMemoryClosureTrace,
              }
            : dialogueStructured,
          digitalLifeSpine: dialogueDigitalLifeSpine,
          dialoguePayload: input.dialoguePayload,
          createdAt: input.dialoguePayload.createdAt,
          turnId,
        }) ?? persistedDerivedMindStateBundle,
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

export type AlicizationNormalizedDialogueRespondedPayload
  = Omit<AlicizationDialogueRespondedPayload, 'cardId'>
    & Pick<AlicizationConversationTurnInput, 'visibleReplyRealization'>

export function normalizeDialogueRespondedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    residentPerformance?: AlicizationResidentPerformanceSnapshot | null
    currentConsciousFrame?: AlicizationGovernanceCurrentConsciousFrameInput
  },
): AlicizationNormalizedDialogueRespondedPayload | null {
  const normalizedSessionId = input.sessionId?.trim()
  if (!normalizedSessionId)
    return null

  const normalizedResidentPerformance = options?.residentPerformance ?? null
  const normalizedCurrentConsciousFrame = coerceGovernanceCurrentConsciousFrame(
    options?.currentConsciousFrame,
  )
  const structuredPayload = input.structured && typeof input.structured === 'object' ? input.structured : {}
  const structuredEmbodimentScript = normalizeAlicizationEmbodimentScript(
    (structuredPayload as Record<string, unknown>).embodimentScript,
  )
  const thought = readStringValue((structuredPayload as Record<string, unknown>).thought).trim()
  const rawEmotion = readStringValue((structuredPayload as Record<string, unknown>).emotion).trim().toLowerCase()
  const structuredVisibleReplyRealization = readStructuredVisibleReplyRealization(structuredPayload)
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
  const rawFormat = readStringValue((structuredPayload as Record<string, unknown>).format).trim().toLowerCase()
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: input.turnId,
    rawFormat,
    origin: input.origin,
  })
  const rawVisibleReplyRealization = input.visibleReplyRealization ?? structuredVisibleReplyRealization
  const visibleReplyAuthorityFailure = resolveProviderVisibleReplyAuthorityFailure({
    turn: input,
    structuredPayload: structuredPayload as Record<string, unknown>,
    visibleReplyRealization: rawVisibleReplyRealization,
  })
  const providerContractFailed
    = !autonomousDialogueFamily.isAutonomous
      && (
        contractFailed
        || rawFormat !== 'mind-turn-v1'
        || parsePath !== 'json'
        || !reply
        || visibleReplyAuthorityFailure !== null
      )
  const explicitLegacyInputFormat = (() => {
    const rawLegacyInputFormat = readStringValue((structuredPayload as Record<string, unknown>).legacyInputFormat).trim().toLowerCase()
    return rawLegacyInputFormat === 'epoch1-v1' || rawLegacyInputFormat === 'fallback-v1'
      ? rawLegacyInputFormat
      : null
  })()
  const formatResolution = resolveAlicizationRuntimeMindTurnStructuredFormat({
    rawFormat: (structuredPayload as Record<string, unknown>).format,
    contractFailed: contractFailed || providerContractFailed,
    hasGovernance: Boolean(governance),
    origin: input.origin,
  })
  const format = providerContractFailed
    ? 'fallback-v1'
    : formatResolution.format
  const visibleReplyAuthority = readStringValue((structuredPayload as Record<string, unknown>).visibleReplyAuthority).trim()
  const proactive = normalizeProactiveMetadata(
    (structuredPayload as Record<string, unknown>).proactive,
  )
  const dialogueActKernel = normalizeDialogueActKernel(
    (structuredPayload as Record<string, unknown>).dialogueActKernel ?? governance?.dialogueActKernel,
  )
  const runtimeDigest = normalizeAlicizationRuntimeDigest(
    (structuredPayload as Record<string, unknown>).runtimeDigest,
  ) as AlicizationRuntimeDigest | null
  const explicitDerivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(
    (structuredPayload as Record<string, unknown>).derivedMindStateBundle,
  )
  const memoryStageReplay = normalizeAlicizationOrganicMemoryStageReplay(
    (structuredPayload as Record<string, unknown>).memoryStageReplay,
  )
  const memoryResolutionLedger = normalizeAlicizationMemoryResolutionLedger(
    (structuredPayload as Record<string, unknown>).memoryResolutionLedger,
  )
  const unsanitizedVisibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization'] = (() => {
    const raw = rawVisibleReplyRealization
    if (!raw)
      return undefined
    const rawActualAuthority = raw.actualAuthority === 'llm-mind'
      || raw.actualAuthority === 'local-deterministic-fallback'
      || raw.actualAuthority === 'non-human-authored-blocked'
      ? raw.actualAuthority
      : null
    const actualAuthority = providerContractFailed
      ? 'non-human-authored-blocked'
      : rawActualAuthority
    const critic = sanitizeVisibleReplyCriticSummary(raw.critic)
    const closure = sanitizeVisibleReplyClosureSummary(raw.closure)
    return {
      version: 'visible-reply-realization-v1',
      expectedAuthority:
        raw.expectedAuthority === 'llm-mind'
          ? raw.expectedAuthority
          : 'llm-mind',
      actualAuthority,
      providerMindExecuted: raw.providerMindExecuted === true,
      mode: raw.mode ?? 'provider-stream',
      visibleText: reply || null,
      visibleReplyValidationStatus: normalizeAlicizationVisibleReplyValidationStatus(
        raw.visibleReplyValidationStatus,
      ),
      blockedReasons: Array.from(new Set([
        ...(Array.isArray(raw.blockedReasons)
          ? raw.blockedReasons.filter((reason): reason is string => typeof reason === 'string')
          : []),
        ...(providerContractFailed
          ? [visibleReplyAuthorityFailure ?? 'provider-structured-contract-invalid']
          : []),
      ])),
      nonHumanAuthoredStatus: providerContractFailed
        ? 'non-human-authored-blocked'
        : typeof raw.nonHumanAuthoredStatus === 'string'
          ? raw.nonHumanAuthoredStatus
          : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      critic,
      closure,
    } satisfies AlicizationVisibleReplyRealizationArtifact
  })()
  const visibleReplyRealization: AlicizationConversationTurnInput['visibleReplyRealization'] = (() => {
    if (!unsanitizedVisibleReplyRealization)
      return undefined

    return unsanitizedVisibleReplyRealization
  })()
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
    normalizedResidentPerformance?.performance,
  )
  const createdAt = input.createdAt ?? Date.now()
  const turnId = input.turnId?.trim() || `turn:${normalizedSessionId}:${createdAt}`
  const rawDigitalLifeSpine = normalizeGovernanceDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const digitalLifeSpine = rawDigitalLifeSpine
  const concernAwareCandidateEmotion = residentSeededPerformance.baseEmotion
  const residentSeeded = !areDialoguePerformancesEqual(
    clampedPerformance.performance,
    residentSeededPerformance,
  )
  const emotionAlignedResidentSeededPerformance = concernAwareCandidateEmotion === residentSeededPerformance.baseEmotion
    ? residentSeededPerformance
    : normalizeAlicizationPerformancePayload({
        ...residentSeededPerformance,
        baseEmotion: concernAwareCandidateEmotion,
        emotion: concernAwareCandidateEmotion,
      }, concernAwareCandidateEmotion)
  const rendererNativeResidentSeededPerformance = emotionAlignedResidentSeededPerformance
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: concernAwareCandidateEmotion,
    candidatePerformance: rendererNativeResidentSeededPerformance,
    governance,
    performanceManifest,
    reply,
    thought,
    turnId,
  })
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    rendererNativeResidentSeededPerformance,
  )
  const normalizedDigitalLife = resolveGovernanceStructuredDigitalLifeAuthority({
    digitalLife: (structuredPayload as Record<string, unknown>).digitalLife,
    embodimentScript: structuredEmbodimentScript,
    fallbackEmotion: embodiment.emotion,
  })
  const normalizedProvidedSpeechTimeline = normalizedDigitalLife?.frames.length
    ? buildAlicizationDialogueSpeechTimeline({
        reply,
        candidateEmotion: embodiment.emotion,
        candidatePerformance: embodiment.performance,
        embodiment,
        digitalLifeSpine: digitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
        performanceManifest,
      })
    : null
  const authority = coordinateAlicizationRuntimeEmbodiment({
    seed: buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: governance?.decisionTraceId ?? null,
      turnId,
      reply,
      performance: embodiment.performance,
      embodiment,
      speechTimeline: normalizedProvidedSpeechTimeline,
      digitalLife: normalizedDigitalLife as AlicizationDigitalLifeEnvelope | null,
      digitalLifeSpine: digitalLifeSpine as AlicizationDigitalLifeSpineDigest | null,
      affectiveResidue:
        runtimeDigest?.affectiveResidue
        ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      currentConsciousFrame: normalizedCurrentConsciousFrame,
    }),
    manifest: performanceManifest,
    residentPerformance: normalizedResidentPerformance,
  })
  const authoritativeDigitalLife = authority.digitalLife
  const digitalLife: AlicizationDialogueStructuredPayload['digitalLife'] = normalizedDigitalLife && !residentSeeded
    ? authoritativeDigitalLife
      ? reconcileProvidedDigitalLifeWithAuthority({
          provided: normalizedDigitalLife,
          authoritative: authoritativeDigitalLife,
        })
      : normalizedDigitalLife
    : authoritativeDigitalLife
  const embodimentScript = authority.embodimentScript
    ? digitalLife?.mode === authority.digitalLife?.mode
      ? authority.embodimentScript
      : normalizeAlicizationEmbodimentScript({
          ...authority.embodimentScript,
          state: {
            ...authority.embodimentScript.state,
            residentMode: digitalLife?.mode === 'recovering' ? 'idle-recovering' : authority.embodimentScript.state.residentMode,
          },
        })
    : null
  const alignedSpeechTimeline = alignSpeechTimelineToDigitalLifeFrames({
    speechTimeline: authority.speechTimeline,
    digitalLife,
  })
  const isFallback = autonomousDialogueFamily.isAutonomous
    ? contractFailed || parsePath !== 'json'
    : providerContractFailed
  const origin = autonomousDialogueFamily.isAutonomous
    ? autonomousDialogueFamily.canonicalOrigin ?? resolveAlicizationAutonomousDialogueOrigin('proactive')
    : 'user-turn'
  const derivedMindStateBundle = buildMemoryClosureTraceDerivedMindStateBundle({
    structured: {
      ...(structuredPayload as Record<string, unknown>),
      ...(explicitDerivedMindStateBundle ? { derivedMindStateBundle: explicitDerivedMindStateBundle } : {}),
    },
    digitalLifeSpine: summarizeMindTurnEventDigitalLifeSpine(
      digitalLifeSpine,
      (structuredPayload as Record<string, unknown>).memoryClosureTrace,
    ),
    createdAt,
    turnId,
  })

  const structured: AlicizationDialogueStructuredPayload = {
    thought,
    emotion: embodiment.emotion,
    reply,
    visibleReplyAuthority: providerContractFailed
      ? 'non-human-authored-blocked'
      : visibleReplyAuthority === 'local-deterministic-fallback'
        || visibleReplyAuthority === 'non-human-authored-blocked'
        ? visibleReplyAuthority
        : 'llm-mind',
    performance: authority.embodiment?.performance ?? embodiment.performance,
    embodiment: authority.embodiment ?? embodiment,
    embodimentScript,
    speechTimeline: alignedSpeechTimeline,
    digitalLife,
    digitalLifeSpine: digitalLifeSpine ?? null,
    format,
    formatLane: formatResolution.lane,
    legacyInputFormat: explicitLegacyInputFormat ?? formatResolution.legacyInputFormat,
    proactive,
    dialogueActKernel,
    governance,
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryStageReplay ? { memoryStageReplay } : {}),
    ...(memoryResolutionLedger ? { memoryResolutionLedger } : {}),
    ...(runtimeDigest ? { runtimeDigest } : {}),
    policyLocked: policyLocked || undefined,
    rawEmotion: normalizedEmotionResult.downgraded
      ? normalizedEmotionResult.rawEmotion
      : clampedPerformance.downgradedBaseEmotion,
  }

  return {
    turnId,
    sessionId: normalizedSessionId,
    origin,
    userText: input.userText?.trim() || undefined,
    assistantText: input.assistantText?.trim() || undefined,
    structured,
    ...(visibleReplyRealization ? { visibleReplyRealization } : {}),
    isFallback,
    createdAt,
  }
}

export interface AlicizationRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
}

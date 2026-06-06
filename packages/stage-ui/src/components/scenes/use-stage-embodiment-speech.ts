import type { Live2DLipSync, Live2DLipSyncOptions } from '@proj-alicization/model-driver-lipsync'
import type { Profile } from '@proj-alicization/model-driver-lipsync/shared/wlipsync'
import type { PlaybackItem, PlaybackManagerOptions, TextSegment } from '@proj-alicization/pipelines-audio'
import type {
  AlicizationDialogueEmbodimentRendererHints,
  AlicizationDialogueSpeechRendererSettleHints,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueSpeechTimelineSegment,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeFrame,
  AlicizationDigitalLifeMode,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentLipSyncVisemeHint,
  AlicizationEmbodimentScriptV1,
  AlicizationEmbodimentSpeechPlan,
  AlicizationEmotion,
  StageEmbodimentSpeechPlaybackEvent,
  StageEmbodimentSpeechPlaybackState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'
import type {
  EmbodimentPlaybackDriverTelemetry,
  EmbodimentPlaybackTelemetry,
} from '../../services/embodiment/playback-reconciler'
import type { StageModelRenderer } from '../../stores/settings'

import { createLive2DLipSync } from '@proj-alicization/model-driver-lipsync'
import { wlipsyncProfile } from '@proj-alicization/model-driver-lipsync/shared/wlipsync'
import {
  alignAlicizationDialogueSpeechTimelineSegment,
  createIdleStageEmbodimentSpeechArticulationState,
  createIdleStageEmbodimentSpeechDynamicsState,
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
  deriveAlicizationDigitalLifeMotorPlan,
  deriveStageEmbodimentSpeechArticulationState,
  deriveStageEmbodimentSpeechDynamicsState,
  deriveStageEmbodimentSpeechRenderState,
  estimateStageEmbodimentSpeechPlaybackDurationMs,
  hasAlicizationSoftenedSameHerCarry,
  normalizeAlicizationDialogueSpeechTimeline,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationEmotion,
  resolveAlicizationDialogueSpeechTimelineConsumedOffset,
  resolveProjectClosureSpeechEmbodimentBiasFromCue,
  resolveStageEmbodimentSpeechStopLingerMs,
} from '@proj-alicization/stage-shared'
import { computed, getCurrentInstance, onUnmounted, readonly, ref, watch } from 'vue'

import { playBrowserSpeechAudio } from '../../libs/speech-audio-playback'
import {
  cloneEmbodimentPlaybackTelemetry,
  reconcileEmbodimentPlayback,
  resolveEmbodimentPlaybackDriverAuthority,
  resolveEmbodimentPlaybackProsodyAuthority,
} from '../../services/embodiment/playback-reconciler'
import { buildAlicizationEmbodimentSpeechPlan } from '../../services/embodiment/speech-planner'
import { resolveLive2DFaceDriverState } from './drivers/live2d-face-driver'
import { resolveLive2DLipSyncDriverState } from './drivers/live2d-lipsync-driver'
import { resolveLive2DMotionDriverState } from './drivers/live2d-motion-driver'
import { shouldRunLive2dLipSyncLoop } from './runtime'

const defaultLive2dLipSyncOptions: Live2DLipSyncOptions = {
  mouthUpdateIntervalMs: 50,
  mouthLerpWindowMs: 50,
}

type SpeechPlaybackListener = (event: StageEmbodimentSpeechPlaybackEvent) => void

interface SpeechPlaybackDescriptor {
  intentId: string | null | undefined
  streamId: string | null | undefined
  segmentId: string | null | undefined
  ownerId?: string | null
  text: string
  special: string | null | undefined
  cue?: AlicizationDialogueSpeechTimelineSegment | null | undefined
  continuityHoldMs?: number | null | undefined
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null | undefined
  metadata?: Record<string, unknown> | null | undefined
  playbackDurationMs?: number | null | undefined
}

interface SpeechTimelineAlignmentState {
  consumedOffset: number
  consumedText: string
  signature: string
  timeline: AlicizationDialogueSpeechTimeline | null
}

interface SpeechPlanAlignmentState {
  consumedSegmentIndex: number
  plan: AlicizationEmbodimentSpeechPlan | null
  signature: string
}

interface StageEmbodimentSpeechDriverPhaseMetadata {
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
}

interface SyntheticSpeechState {
  active: boolean
  startedAt: number
  deadlineAt: number
  cadenceHz: number
  baselineEnergy: number
  amplitudeEnergy: number
  phaseOffset: number
}

function readMotorGazeStability(motor: AlicizationDigitalLifeFrame['motor'] | null | undefined) {
  if (!motor)
    return null
  return Number.isFinite((motor as { gazeStability?: unknown }).gazeStability)
    ? Number((motor as { gazeStability?: number }).gazeStability)
    : Number.isFinite(motor.gaze?.stability)
      ? Number(motor.gaze.stability)
      : null
}

function readMotorBreathAmplitude(motor: AlicizationDigitalLifeFrame['motor'] | null | undefined) {
  if (!motor)
    return null
  return Number.isFinite((motor as { breathAmplitude?: unknown }).breathAmplitude)
    ? Number((motor as { breathAmplitude?: number }).breathAmplitude)
    : Number.isFinite(motor.breath?.amplitude)
      ? Number(motor.breath.amplitude)
      : null
}

function resolveDigitalLifeLipSyncMode(
  mode: AlicizationEmbodimentScriptV1['lipsyncPlan']['mode'] | AlicizationDigitalLifeFrame['lipSync']['mode'],
) {
  if (mode === 'energy-phoneme-hybrid')
    return 'hybrid' as const
  if (mode === 'energy-only')
    return 'energy' as const
  return mode
}

function resolveTimelineInterruptModeFromPolicy(
  interruptPolicy: AlicizationEmbodimentSpeechPlan['segments'][number]['interruptPolicy'] | null | undefined,
): AlicizationDialogueSpeechTimelineSegment['interruptMode'] {
  return interruptPolicy === 'hard-stop'
    ? 'hard-interrupt'
    : 'soft-interrupt'
}

function resolveProjectedDigitalLifeMode(input: {
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null
  emotion: AlicizationEmotion
  text: string
}) {
  if (input.residentMode === 'repair-before-closeness')
    return 'thinking' as const
  if (input.residentMode === 'measured-return')
    return input.text.trim() ? 'speaking' as const : 'thinking' as const
  if (input.emotion === 'thinking' && !input.text.trim())
    return 'thinking' as const
  return 'acting' as const
}

function normalizeEmbodimentResidentMode(
  residentMode: unknown,
): AlicizationEmbodimentScriptV1['state']['residentMode'] | null {
  return residentMode === 'dialogue'
    || residentMode === 'quiet-companionship'
    || residentMode === 'measured-return'
    || residentMode === 'repair-before-closeness'
    || residentMode === 'idle-recovering'
    ? residentMode
    : null
}

function resolveRestrainedResidentModeFromRendererHints(
  rendererHints: { residentMode?: string | null | undefined } | null | undefined,
) {
  const residentMode = normalizeEmbodimentResidentMode(rendererHints?.residentMode?.trim())
  return residentMode === 'repair-before-closeness' || residentMode === 'measured-return'
    ? residentMode
    : null
}

function resolveEffectiveSpeechResidentMode(input: {
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
  rendererHints: { residentMode?: string | null | undefined } | null | undefined
}) {
  const residentMode = input.residentMode ?? null
  if (residentMode === 'repair-before-closeness' || residentMode === 'measured-return')
    return residentMode

  return resolveRestrainedResidentModeFromRendererHints(input.rendererHints)
}

function resolveEffectiveSpeechResidentModeFromCueOrFrame(input: {
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}) {
  return resolveEffectiveSpeechResidentMode({
    residentMode: input.residentMode,
    rendererHints: input.cue?.rendererHints
      ?? input.digitalLifeFrame?.face.rendererHints
      ?? input.digitalLifeFrame?.action.rendererHints
      ?? null,
  })
}

function shouldForceRestrainedStopTailBodySuppression(input: {
  scriptResidentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | 'measured-return' | 'repair-before-closeness' | null | undefined
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
}) {
  const scriptResidentMode = input.scriptResidentMode ?? null
  if (scriptResidentMode === 'measured-return' || scriptResidentMode === 'repair-before-closeness')
    return false

  const residentMode = input.residentMode ?? null
  if (residentMode !== 'repair-before-closeness')
    return false

  const cueResidentMode = resolveRestrainedResidentModeFromRendererHints(input.cue?.rendererHints ?? null)
  const faceResidentMode = resolveRestrainedResidentModeFromRendererHints(input.digitalLifeFrame?.face.rendererHints ?? null)
  const actionResidentMode = resolveRestrainedResidentModeFromRendererHints(input.digitalLifeFrame?.action.rendererHints ?? null)
  const residentModeConfirmed = cueResidentMode === residentMode
    || faceResidentMode === residentMode
    || actionResidentMode === residentMode
  if (!residentModeConfirmed)
    return false

  const settleMode = input.digitalLifeFrame?.settleMode ?? input.cue?.settleMode ?? null
  return settleMode === 'hold'
}

export interface UseStageEmbodimentSpeechOptions {
  audioContext: AudioContext
  digitalLifeSpineDigest?: Readonly<Ref<AlicizationDigitalLifeSpineDigest | null | undefined>>
  mouthOpenSize: Ref<number>
  paused: Ref<boolean>
  speechStylePitch?: Ref<number>
  speechStyleRate?: Ref<number>
  stageModelRenderer: Ref<StageModelRenderer>
  live2dLipSyncOptions?: Live2DLipSyncOptions
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback
  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min
  return Math.min(max, Math.max(min, value))
}

function roundHundredths(value: number, fallback = 0) {
  return Number(clampUnit(value, fallback).toFixed(2))
}

function normalizeAlignmentText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function countPattern(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

function sanitizeSpineToken(raw: unknown, maxChars = 96) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function cloneSpeechMetadata(metadata: Record<string, unknown> | null | undefined) {
  return metadata ? { ...metadata } : null
}

function resolveDigitalLifeEmotion(input: {
  emotion: unknown
  baseEmotion?: unknown
  fallback?: unknown
}) {
  return normalizeAlicizationEmotion(
    input.emotion ?? input.baseEmotion ?? input.fallback ?? 'neutral',
  ).emotion
}

function updateStableSignature(hash: number, raw: unknown) {
  const text = raw == null
    ? '∅'
    : typeof raw === 'string'
      ? raw
      : typeof raw === 'number' || typeof raw === 'boolean'
        ? String(raw)
        : JSON.stringify(raw)

  let nextHash = hash >>> 0
  for (let index = 0; index < text.length; index += 1) {
    nextHash ^= text.charCodeAt(index)
    nextHash = Math.imul(nextHash, 16777619) >>> 0
  }

  nextHash ^= 124
  return Math.imul(nextHash, 16777619) >>> 0
}

function finalizeStableSignature(hash: number) {
  return hash.toString(36)
}

const embodimentDebugStorageKey = 'devtools/embodiment-debug'

function isEmbodimentDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(embodimentDebugStorageKey) === 'true'
  }
  catch {
    return false
  }
}

function logSpeechEmbodimentDebug(event: string, payload?: Record<string, unknown>) {
  if (!isEmbodimentDebugEnabled())
    return

  console.info('[stage-embodiment][speech]', {
    event,
    ...payload,
  })
}

function resolveBrowserSpeechAudioDurationMs(audio: BrowserSpeechAudioSource | null | undefined) {
  if (!audio)
    return null

  if (audio.kind === 'buffer')
    return Math.round(audio.audio.duration * 1000)

  return null
}

function isDurableMeasuredReturnFrame(frame: AlicizationDigitalLifeFrame | null | undefined) {
  const faceHints = frame?.face.rendererHints
  const actionHints = frame?.action.rendererHints
  return (
    (
      faceHints?.residentMode === 'measured-return'
      && (
        (
          faceHints.preferredGazeMode === 'steady'
          && faceHints.preferredBlinkCadence === 'quiet'
        )
        || (
          faceHints.preferredGazeMode === 'soften'
          && faceHints.preferredBlinkCadence === 'linger'
        )
      )
    )
    || (
      actionHints?.residentMode === 'measured-return'
      && (
        (
          actionHints.preferredGazeMode === 'steady'
          && actionHints.preferredBlinkCadence === 'quiet'
        )
        || (
          actionHints.preferredGazeMode === 'soften'
          && actionHints.preferredBlinkCadence === 'linger'
        )
      )
    )
  )
}

function isStrongDurableMeasuredReturnFrame(frame: AlicizationDigitalLifeFrame | null | undefined) {
  const faceHints = frame?.face.rendererHints
  const actionHints = frame?.action.rendererHints
  return (
    (
      faceHints?.residentMode === 'measured-return'
      && faceHints.preferredGazeMode === 'steady'
      && faceHints.preferredBlinkCadence === 'quiet'
    )
    || (
      actionHints?.residentMode === 'measured-return'
      && actionHints.preferredGazeMode === 'steady'
      && actionHints.preferredBlinkCadence === 'quiet'
    )
  )
}

function isDurableMeasuredReturnCue(
  cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
) {
  const hints = cue?.rendererHints
  return (
    hints?.residentMode === 'measured-return'
    && (
      (
        hints.preferredGazeMode === 'steady'
        && hints.preferredBlinkCadence === 'quiet'
      )
      || (
        hints.preferredGazeMode === 'soften'
        && hints.preferredBlinkCadence === 'linger'
      )
    )
  )
}

function isStrongDurableMeasuredReturnCue(
  cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
) {
  const hints = cue?.rendererHints
  return (
    hints?.residentMode === 'measured-return'
    && hints.preferredGazeMode === 'steady'
    && hints.preferredBlinkCadence === 'quiet'
  )
}

function isRepairBeforeClosenessFrame(frame: AlicizationDigitalLifeFrame | null | undefined) {
  const faceHints = frame?.face.rendererHints
  const actionHints = frame?.action.rendererHints
  return faceHints?.residentMode === 'repair-before-closeness'
    || actionHints?.residentMode === 'repair-before-closeness'
    || frame?.settleMode === 'hold'
}

function isRepairBeforeClosenessCue(
  cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
) {
  const hints = cue?.rendererHints
  return hints?.residentMode === 'repair-before-closeness'
}

function buildDigitalLifeEnvelopeFromFrames(input: {
  variationToken: string
  emotion: AlicizationDialogueSpeechTimeline['emotion'] | null | undefined
  frames: AlicizationDigitalLifeFrame[]
}) {
  const frames = input.frames
  if (frames.length === 0)
    return null

  const lastFrame = frames.at(-1)
  if (!lastFrame)
    return null

  return normalizeAlicizationDigitalLifeEnvelope({
    version: 'digital-life-v1',
    variationToken: input.variationToken,
    emotion: input.emotion ?? lastFrame.face.emotion,
    mode: lastFrame.mode,
    postureHint: lastFrame.mode === 'recovering'
      ? 'concerned'
      : lastFrame.mode === 'thinking'
        ? 'inspection'
        : 'attentive',
    performance: {
      baseEmotion: input.emotion ?? lastFrame.face.emotion,
      emotion: lastFrame.face.emotion,
      facialCue: lastFrame.face.facialCue,
      actionCue: lastFrame.action.actionCue,
      delivery: lastFrame.mode === 'recovering'
        ? 'gentle'
        : lastFrame.action.actionCue
          ? 'firm'
          : 'calm',
      emphasis: lastFrame.action.intensity >= 0.55 ? 2 : lastFrame.action.intensity > 0 ? 1 : 0,
    },
    speechStyle: {
      pitchDelta: lastFrame.voice.pitchDelta,
      rateMultiplier: lastFrame.voice.rateMultiplier,
    },
    voice: { ...lastFrame.voice },
    lipSync: { ...lastFrame.lipSync },
    face: {
      ...lastFrame.face,
      rendererHints: lastFrame.face.rendererHints ?? null,
    },
    action: {
      ...lastFrame.action,
      rendererHints: lastFrame.action.rendererHints ?? null,
    },
    motor: lastFrame.motor,
    frames,
  })
}

function resolveSpineFallbackMode(digest: AlicizationDigitalLifeSpineDigest): AlicizationDigitalLifeMode {
  if (digest.runtime.watchMode === 'recovering')
    return 'recovering'

  switch (digest.architecture?.operatingMode) {
    case 'acting':
      return 'acting'
    case 'thinking':
    case 'remembering':
    case 'observing':
      return 'thinking'
    default:
      return 'speaking'
  }
}

function resolveSpineFallbackEmotion(
  digest: AlicizationDigitalLifeSpineDigest,
  cue: AlicizationDialogueSpeechTimelineSegment | null,
) {
  if (cue?.emotion)
    return cue.emotion

  const selectedAction = sanitizeSpineToken(
    digest.proactive?.selectedAction ?? digest.runtime.selectedAction ?? '',
    32,
  ).toLowerCase()
  if (selectedAction === 'warn')
    return 'concerned' as const

  const preferredPresence = sanitizeSpineToken(
    digest.proactive?.preferredPresence ?? digest.runtime.preferredPresence ?? '',
    32,
  ).toLowerCase()
  if (preferredPresence === 'concerned')
    return 'concerned' as const
  if (preferredPresence === 'hesitant')
    return 'thinking' as const

  return resolveSpineFallbackMode(digest) === 'recovering'
    ? 'tired'
    : 'thinking'
}

function resolveSpineFallbackActionCue(
  digest: AlicizationDigitalLifeSpineDigest,
  cue: AlicizationDialogueSpeechTimelineSegment | null,
) {
  if (cue?.actionCue)
    return cue.actionCue

  const selectedAction = sanitizeSpineToken(
    digest.proactive?.selectedAction ?? digest.runtime.selectedAction ?? '',
    32,
  ).toLowerCase()
  switch (selectedAction) {
    case 'warn':
      return 'inspect_focus'
    case 'hover':
    case 'recheck':
      return 'observe_focus'
    case 'speak':
    case 'whisper':
      return 'idle_gentle_nod'
    default:
      return resolveSpineFallbackMode(digest) === 'recovering'
        ? 'idle_settle'
        : 'observe_focus'
  }
}

function hasSoftenedSameHerRendererCarry(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return hasAlicizationSoftenedSameHerCarry(rendererHints)
}

function resolveAudibleSameHerPreviewRestraint(
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  return hasSoftenedSameHerRendererCarry(rendererHints)
    ? {
        voiceEnergyScale: 0.9,
        voiceCadenceScale: 0.92,
        lipSyncVisemeScale: 0.92,
        lipSyncEnergyScale: 0.9,
        mouthScale: 0.94,
        faceIntensityScale: 0.93,
        actionIntensityScale: 0.88,
        settleMode: 'linger' as const,
      }
    : null
}

function resolveSpineFallbackVoiceRestraint(
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined,
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null | undefined,
) {
  if (residentMode === 'repair-before-closeness') {
    return {
      pitchDeltaOffset: -2,
      rateMultiplierOffset: -0.04,
      energyOffset: -0.12,
      cadenceOffset: -0.1,
    }
  }

  if (residentMode === 'measured-return') {
    return {
      pitchDeltaOffset: -1,
      rateMultiplierOffset: -0.02,
      energyOffset: -0.06,
      cadenceOffset: -0.05,
    }
  }

  if (hasSoftenedSameHerRendererCarry(rendererHints)) {
    return {
      pitchDeltaOffset: -1,
      rateMultiplierOffset: -0.015,
      energyOffset: -0.04,
      cadenceOffset: -0.035,
    }
  }

  return {
    pitchDeltaOffset: 0,
    rateMultiplierOffset: 0,
    energyOffset: 0,
    cadenceOffset: 0,
  }
}

function clampRestrainedPreviewActionCue(
  actionCue: string | null | undefined,
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined,
) {
  const normalized = actionCue?.trim() || null
  if (!normalized)
    return null

  if (residentMode === 'repair-before-closeness')
    return 'idle_settle'

  return normalized
}

function estimateSyntheticSegmentDurationMs(input: {
  text: string
  reason?: TextSegment['reason']
  styleRate?: number
}) {
  const normalized = input.text.trim()
  if (!normalized)
    return 180

  const characterCount = Array.from(normalized).length
  const punctuationCount = countPattern(normalized, /[，,。.!！？?;；:：]/g)
  const ellipsisCount = countPattern(normalized, /…|\.{3,}/g)
  const styleRate = clampRange(input.styleRate ?? 1, 0.7, 1.6)
  const reasonBoost = input.reason === 'flush'
    ? 140
    : input.reason === 'hard'
      ? 90
      : input.reason === 'boost'
        ? 60
        : 0

  const baseline = characterCount * 66 + punctuationCount * 44 + ellipsisCount * 88 + 180 + reasonBoost
  return Math.round(clampRange(baseline / styleRate, 240, 2_600))
}

function deriveSyntheticSpeechShape(segment: TextSegment) {
  const text = segment.text
  const exclamation = countPattern(text, /[!！]/g)
  const question = countPattern(text, /[?？]/g)
  const ellipsis = countPattern(text, /…|\.{3,}/g)
  const emphasis = clampUnit(
    exclamation * 0.24
    + question * 0.16
    + ellipsis * 0.12
    + (segment.special ? 0.08 : 0),
  )

  return {
    cadenceHz: clampRange(2.1 + emphasis * 1.9, 1.7, 4.4),
    baselineEnergy: clampRange(0.2 + emphasis * 0.15, 0.12, 0.45),
    amplitudeEnergy: clampRange(0.42 + emphasis * 0.32, 0.28, 0.8),
  }
}

function createIdleSyntheticSpeechState(): SyntheticSpeechState {
  return {
    active: false,
    startedAt: 0,
    deadlineAt: 0,
    cadenceHz: 2.4,
    baselineEnergy: 0.22,
    amplitudeEnergy: 0.52,
    phaseOffset: 0,
  }
}

function createIdleSpeechTimelineAlignmentState(): SpeechTimelineAlignmentState {
  return {
    consumedOffset: 0,
    consumedText: '',
    signature: '',
    timeline: null,
  }
}

function createIdleSpeechPlanAlignmentState(): SpeechPlanAlignmentState {
  return {
    consumedSegmentIndex: 0,
    plan: null,
    signature: '',
  }
}

function cloneSpeechTimelineCue(
  cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
): AlicizationDialogueSpeechTimelineSegment | null {
  return cue
    ? {
        ...cue,
      }
    : null
}

function normalizeSpeechMetadataRecord(metadata: Record<string, unknown> | null | undefined) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : null
}

function resolveProjectClosureSpeechEmbodimentBiasFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
) {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  const projectState = normalizedMetadata?.projectState
    && typeof normalizedMetadata.projectState === 'object'
    && !Array.isArray(normalizedMetadata.projectState)
    ? normalizedMetadata.projectState as Record<string, unknown>
    : null
  const preDialogueAwareness = normalizedMetadata?.preDialogueAwareness
    && typeof normalizedMetadata.preDialogueAwareness === 'object'
    && !Array.isArray(normalizedMetadata.preDialogueAwareness)
    ? normalizedMetadata.preDialogueAwareness as Record<string, unknown>
    : null

  const emotionalClosureCues = [
    projectState?.emotionalClosureCue,
    preDialogueAwareness?.emotionalClosureCue,
  ]

  for (const cue of emotionalClosureCues) {
    const bias = resolveProjectClosureSpeechEmbodimentBiasFromCue(
      typeof cue === 'string' ? cue : null,
    )
    if (bias)
      return bias
  }

  return null
}

function resolveProjectClosureSpeechResidentModeFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
) {
  return normalizeEmbodimentResidentMode(
    resolveProjectClosureSpeechEmbodimentBiasFromMetadata(metadata)?.residentMode ?? null,
  )
}

function resolveProjectClosureRendererHintsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AlicizationDialogueEmbodimentRendererHints | null {
  const projectClosureBias = resolveProjectClosureSpeechEmbodimentBiasFromMetadata(metadata)
  if (!projectClosureBias)
    return null

  const preferredExpressionAliases = projectClosureBias.residentMode === 'repair-before-closeness'
    ? ['RecoverSoft']
    : projectClosureBias.residentMode === 'measured-return'
      ? ['CalmInspect']
      : undefined
  const preferredMotionAliases = projectClosureBias.residentMode === 'repair-before-closeness'
    ? ['StillnessGuard']
    : projectClosureBias.residentMode === 'measured-return'
      ? ['ObserveSoft']
      : undefined

  return {
    residentMode: projectClosureBias.residentMode,
    preferredExpressionAliases,
    preferredMotionAliases,
    preferredBlinkCadence: projectClosureBias.preferredBlinkCadence,
    preferredGazeMode: projectClosureBias.preferredGazeMode,
  }
}

function resolveEmbodimentScriptFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): AlicizationEmbodimentScriptV1 | null {
  const candidate = normalizeSpeechMetadataRecord(metadata)?.embodimentScript
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const script = candidate as AlicizationEmbodimentScriptV1
  return script.version === 'embodiment-script-v1' ? script : null
}

function resolveEmbodimentPlaybackMetadataFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): EmbodimentPlaybackTelemetry | null {
  const candidate = normalizeSpeechMetadataRecord(metadata)?.embodimentPlayback
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const typedCandidate = candidate as EmbodimentPlaybackTelemetry
  return cloneEmbodimentPlaybackTelemetry(typedCandidate)
}

function resolveSpeechDriverPhaseMetadata(
  metadata: Record<string, unknown> | null | undefined,
): StageEmbodimentSpeechDriverPhaseMetadata | null {
  const candidate = normalizeSpeechMetadataRecord(metadata)?.embodimentDriverPhase
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const idleCuePhase = (candidate as StageEmbodimentSpeechDriverPhaseMetadata).idleCuePhase
  if (idleCuePhase !== 'pre-utterance' && idleCuePhase !== 'post-utterance')
    return null

  return { idleCuePhase }
}

function resolvePlaybackTelemetryCue(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  metadata: Record<string, unknown> | null | undefined
  segmentId: string | null | undefined
  special?: string | null | undefined
  text: string
}) {
  const script = resolveEmbodimentScriptFromMetadata(input.metadata)
  const authoritativeSegmentId = resolvePlaybackDriverSegmentId({
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    metadata: input.metadata,
    script,
    segmentId: input.segmentId,
    text: input.text,
  })
  const projectedCue = createStageEmbodimentSpeechPlaybackItem({
    intentId: null,
    streamId: null,
    segmentId: authoritativeSegmentId,
    ownerId: null,
    text: input.text,
    special: input.special,
    continuityHoldMs: 0,
    playbackDurationMs: null,
    metadata: input.metadata,
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
  }).cue
  const seededPlaybackCue = resolveEmbodimentPlaybackMetadataFromMetadata(input.metadata)?.cue ?? null
  if (!projectedCue)
    return seededPlaybackCue

  const rendererSettle = projectedCue.rendererSettle ?? input.cue?.rendererSettle ?? seededPlaybackCue?.rendererSettle ?? null
  const effectiveRendererHints = projectedCue.rendererHints ?? input.cue?.rendererHints ?? seededPlaybackCue?.rendererHints ?? null
  const effectiveResidentMode = resolveEffectiveSpeechResidentMode({
    residentMode: script?.state.residentMode ?? null,
    rendererHints: effectiveRendererHints,
  })
  const hesitantMeasuredReturnVrmCue = Boolean(
    script?.rendererTarget === 'vrm'
    && effectiveResidentMode === 'measured-return'
    && script.state.delivery === 'hesitant',
  )
  const softenedSameHerVrmCue = Boolean(
    script?.rendererTarget === 'vrm'
    && hasSoftenedSameHerRendererCarry(effectiveRendererHints)
    && (
      effectiveRendererHints?.preferredBlinkCadence === 'linger'
      || effectiveRendererHints?.preferredBlinkCadence === 'quiet'
      || effectiveRendererHints?.preferredGazeMode === 'soften'
      || effectiveRendererHints?.preferredGazeMode === 'steady'
    ),
  )

  return {
    ...projectedCue,
    rendererHints: effectiveRendererHints,
    rendererSettle: rendererSettle
      ? {
          ...rendererSettle,
          vrmActionFadeMs: hesitantMeasuredReturnVrmCue
            ? Math.max(rendererSettle.vrmActionFadeMs ?? 0, 300)
            : softenedSameHerVrmCue
              ? Math.max(rendererSettle.vrmActionFadeMs ?? 0, 220)
              : rendererSettle.vrmActionFadeMs,
          vrmExpressionBlendMs: hesitantMeasuredReturnVrmCue
            ? Math.max(rendererSettle.vrmExpressionBlendMs ?? 0, 360)
            : softenedSameHerVrmCue
              ? Math.max(rendererSettle.vrmExpressionBlendMs ?? 0, 320)
              : rendererSettle.vrmExpressionBlendMs,
        }
      : rendererSettle,
  }
}

function resolveActivePlaybackVisemeHints(
  item: {
    metadata?: Record<string, unknown> | null | undefined
    segmentId?: string | null | undefined
  } | null | undefined,
) {
  const playbackMetadata = resolveEmbodimentPlaybackMetadataFromMetadata(item?.metadata)
  const visemeHints = playbackMetadata?.drivers.lipsync?.visemeHints ?? []
  const segmentId = playbackMetadata?.drivers.lipsync?.segmentId?.trim()
    || playbackMetadata?.driverAuthority?.segmentId?.trim()
    || item?.segmentId?.trim()
  if (!segmentId)
    return [...visemeHints]

  return visemeHints.filter(hint => hint.segmentId === segmentId)
}

function resolveAuthoritativeHintStrength(hints: AlicizationEmbodimentLipSyncVisemeHint[]) {
  return hints.reduce((peak, hint) => {
    if (hint.source !== 'prosody-authority')
      return peak

    return Math.max(peak, clampUnit(hint.weight) * clampUnit(hint.confidence))
  }, 0)
}

function resolvePlaybackDriverSegmentId(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  metadata?: Record<string, unknown> | null | undefined
  script: AlicizationEmbodimentScriptV1 | null
  segmentId: string | null | undefined
  text: string
}) {
  const script = input.script
  const directSegmentId = input.segmentId?.trim() || null
  if (!script)
    return directSegmentId

  const playbackMetadata = resolveEmbodimentPlaybackMetadataFromMetadata(input.metadata)
  const byIdCandidates = [
    playbackMetadata?.driverAuthority?.segmentId?.trim() || null,
    playbackMetadata?.prosodyAuthority?.segmentId?.trim() || null,
    input.digitalLifeFrame?.id?.trim() || null,
    input.cue?.id?.trim() || null,
    directSegmentId,
  ].filter((value): value is string => Boolean(value))

  for (const candidate of byIdCandidates) {
    const matchedSegment = script.speechPlan.segments.find(segment => segment.id === candidate)
    if (matchedSegment)
      return matchedSegment.id
  }

  const normalizedAuthorityText = normalizeAlignmentText(input.cue?.text ?? input.text)
  if (!normalizedAuthorityText)
    return directSegmentId

  const matchedByText = script.speechPlan.segments.find(segment => normalizeAlignmentText(segment.text) === normalizedAuthorityText)
  return matchedByText?.id ?? directSegmentId
}

function resolvePlaybackDriverMetadata(input: {
  continuityHoldMs?: number | null
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
  metadata?: Record<string, unknown> | null | undefined
  script: AlicizationEmbodimentScriptV1 | null
  segmentId: string | null | undefined
  playbackPhase: 'idle' | 'playing'
  suppressBodyDriver?: boolean
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  text: string
}): EmbodimentPlaybackDriverTelemetry {
  const segmentId = resolvePlaybackDriverSegmentId({
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    metadata: input.metadata,
    script: input.script,
    segmentId: input.segmentId,
    text: input.text,
  })

  return {
    body: input.suppressBodyDriver
      ? null
      : input.digitalLifeFrame?.motor
        ? {
            frameMode: input.digitalLifeFrame.mode ?? null,
            stillness: Number.isFinite(input.digitalLifeFrame.motor.stillness) ? Number(input.digitalLifeFrame.motor.stillness) : null,
            gazeStability: readMotorGazeStability(input.digitalLifeFrame.motor),
            breathAmplitude: readMotorBreathAmplitude(input.digitalLifeFrame.motor),
            expressivity: Number.isFinite(input.digitalLifeFrame.motor.expressivity) ? Number(input.digitalLifeFrame.motor.expressivity) : null,
            segmentId,
          }
        : null,
    face: resolveLive2DFaceDriverState({
      idleCuePhase: input.idleCuePhase,
      script: input.script,
      segmentId,
      playbackPhase: input.playbackPhase,
    }),
    lipsync: resolveLive2DLipSyncDriverState({
      script: input.script,
      segmentId,
      playbackPhase: input.playbackPhase,
      continuityHoldMs: input.digitalLifeFrame?.lipSync.continuityHoldMs
        ?? input.continuityHoldMs
        ?? input.cue?.emotionHoldMs
        ?? null,
    }),
    motion: resolveLive2DMotionDriverState({
      idleCuePhase: input.idleCuePhase,
      preserveActionBurstOnIdle: input.playbackPhase === 'idle'
        && shouldSuppressRendererOnlyRejoinBodyDriverFromFrame({
          digitalLifeFrame: input.digitalLifeFrame ?? null,
          residentMode: input.script?.state.residentMode ?? null,
        }),
      script: input.script,
      segmentId,
      playbackPhase: input.playbackPhase,
    }),
  }
}

function removeBodyDriverFromPlaybackMetadata(
  drivers: EmbodimentPlaybackDriverTelemetry,
): EmbodimentPlaybackDriverTelemetry {
  return {
    ...drivers,
    body: null,
  }
}

function shouldSuppressRendererOnlyRejoinBodyDriverFromFrame(input: {
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  const frame = input.digitalLifeFrame ?? null
  const residentMode = input.residentMode ?? null
  if (!frame)
    return false

  const softenedSameHerRendererCarry = hasSoftenedSameHerRendererCarry(
    frame.face.rendererHints ?? frame.action.rendererHints ?? null,
  )
  if (
    residentMode !== 'repair-before-closeness'
    && residentMode !== 'measured-return'
    && !softenedSameHerRendererCarry
  ) {
    return false
  }

  const rendererAlreadyRejoined = frame.lipSync.continuityHoldMs >= 180
    && frame.lipSync.mouthScale >= 0.78
    && frame.settleMode === 'hold'
  const bodyIsStillWeak = frame.mode === 'recovering'
    || frame.face.expressionMode === 'recover'
    || frame.motor.expressivity <= 0.18
    || (readMotorGazeStability(frame.motor) ?? 1) <= 0.42

  return rendererAlreadyRejoined && bodyIsStillWeak
}

function enrichSpeechMetadataWithDrivers(input: {
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
  metadata: Record<string, unknown> | null | undefined
  script: AlicizationEmbodimentScriptV1 | null
  segmentId: string | null | undefined
  playbackPhase: 'idle' | 'playing'
  suppressBodyDriver?: boolean
  special?: string | null | undefined
  text: string
}) {
  const metadata = cloneSpeechMetadata(input.metadata)
  if (!input.script)
    return metadata

  const seededPlaybackCue = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)?.cue ?? null
  const projectedCueCandidate = resolvePlaybackTelemetryCue({
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    metadata,
    segmentId: input.segmentId,
    special: input.special,
    text: input.text,
  })
  const projectedCue = projectedCueCandidate
    ? {
        ...projectedCueCandidate,
        rendererHints: projectedCueCandidate.rendererHints ?? seededPlaybackCue?.rendererHints ?? null,
        rendererSettle: projectedCueCandidate.rendererSettle ?? seededPlaybackCue?.rendererSettle ?? null,
      }
    : seededPlaybackCue

  const nextPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(metadata) ?? {
    actualDurationMs: 0,
    driftMs: 0,
    plannedDurationMs: 0,
    settleMs: Math.max(0, Math.round(input.script.speechPlan.settleMs ?? 0)),
    stopReason: null,
    rendererTarget: input.script.rendererTarget,
    cue: projectedCue,
    drivers: {
      body: null,
      face: null,
      lipsync: null,
      motion: null,
    },
  }

  nextPlayback.cue = projectedCue

  nextPlayback.drivers = resolvePlaybackDriverMetadata({
    continuityHoldMs: input.digitalLifeFrame?.lipSync.continuityHoldMs,
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    idleCuePhase: input.idleCuePhase,
    metadata,
    script: input.script,
    segmentId: input.segmentId,
    playbackPhase: input.playbackPhase,
    suppressBodyDriver: input.suppressBodyDriver,
    text: input.text,
  })
  const shouldSuppressBodyDriverFromFrame = !input.suppressBodyDriver && shouldSuppressRendererOnlyRejoinBodyDriverFromFrame({
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    residentMode: input.script.state.residentMode,
  })
  if (shouldSuppressBodyDriverFromFrame)
    nextPlayback.drivers = removeBodyDriverFromPlaybackMetadata(nextPlayback.drivers)
  const initialDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: nextPlayback.drivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
  })
  const seededAuthority = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)?.driverAuthority ?? null
  const seededRendererOnlyRejoin = Boolean(
    seededAuthority
    && !seededAuthority.bodySegmentMatched
    && seededAuthority.lipsyncSegmentMatched,
  )
  const suppressionAuthority = seededRendererOnlyRejoin && initialDriverAuthority
    ? {
        ...initialDriverAuthority,
        bodySegmentMatched: false,
        matchedDrivers: initialDriverAuthority.matchedDrivers.filter(driver => driver !== 'body'),
      }
    : initialDriverAuthority
  if (!shouldSuppressBodyDriverFromFrame && !input.suppressBodyDriver && shouldSuppressRendererOnlyRejoinBodyDriver({
    driverAuthority: suppressionAuthority,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    metadata,
    residentMode: input.script.state.residentMode,
  })) {
    nextPlayback.drivers = removeBodyDriverFromPlaybackMetadata(nextPlayback.drivers)
  }
  nextPlayback.prosodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
    cue: projectedCue,
    driverAuthority: suppressionAuthority,
    drivers: nextPlayback.drivers,
  })
  nextPlayback.driverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: nextPlayback.drivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
    prosodyAuthority: nextPlayback.prosodyAuthority,
  })

  const restrainedRendererOnlyRejoin = shouldRestrainRendererOnlyRejoin({
    drivers: nextPlayback.drivers,
    driverAuthority: nextPlayback.driverAuthority,
    metadata,
    residentMode: input.script.state.residentMode,
  })
  if (restrainedRendererOnlyRejoin) {
    nextPlayback.drivers = removeBodyDriverFromPlaybackMetadata(nextPlayback.drivers)
    nextPlayback.driverAuthority = applyRestrainedRendererOnlyRejoinAuthority({
      driverAuthority: resolveEmbodimentPlaybackDriverAuthority({
        drivers: nextPlayback.drivers,
        rendererTarget: input.script.rendererTarget,
        segmentId: input.segmentId,
        prosodyAuthority: nextPlayback.prosodyAuthority,
      }),
    })
  }

  return {
    ...metadata,
    embodimentDriverPhase: input.idleCuePhase
      ? { idleCuePhase: input.idleCuePhase }
      : undefined,
    embodimentPlayback: nextPlayback,
  } satisfies Record<string, unknown>
}

function resolveSpeechMetadataIdleCuePhase(
  metadata: Record<string, unknown> | null | undefined,
) {
  return resolveSpeechDriverPhaseMetadata(metadata)?.idleCuePhase
}

function resolveHesitantMeasuredReturnVrmRendererSettle(input: {
  rendererSettle: AlicizationDialogueSpeechRendererSettleHints | null | undefined
  rendererHints: AlicizationDialogueEmbodimentRendererHints | null | undefined
  script: AlicizationEmbodimentScriptV1
}) {
  const rendererSettle = input.rendererSettle
    ? {
        live2dFacialReleaseMs: input.rendererSettle.live2dFacialReleaseMs,
        live2dMotionFollowThroughMs: input.rendererSettle.live2dMotionFollowThroughMs,
        vrmActionFadeMs: input.rendererSettle.vrmActionFadeMs,
        vrmExpressionBlendMs: input.rendererSettle.vrmExpressionBlendMs,
      }
    : null
  if (!rendererSettle)
    return rendererSettle

  const effectiveResidentMode = resolveEffectiveSpeechResidentMode({
    residentMode: input.script.state.residentMode,
    rendererHints: input.rendererHints,
  })
  const hesitantMeasuredReturnVrm = input.script.rendererTarget === 'vrm'
    && effectiveResidentMode === 'measured-return'
    && input.script.state.delivery === 'hesitant'
    && (
      input.rendererHints?.preferredBlinkCadence === 'linger'
      || input.rendererHints?.preferredGazeMode === 'soften'
    )
  const softenedSameHerVrm = input.script.rendererTarget === 'vrm'
    && hasSoftenedSameHerRendererCarry(input.rendererHints)
    && (
      input.rendererHints?.preferredBlinkCadence === 'linger'
      || input.rendererHints?.preferredBlinkCadence === 'quiet'
      || input.rendererHints?.preferredGazeMode === 'soften'
      || input.rendererHints?.preferredGazeMode === 'steady'
    )

  if (!hesitantMeasuredReturnVrm && !softenedSameHerVrm)
    return rendererSettle

  return {
    ...rendererSettle,
    vrmActionFadeMs: Math.max(
      rendererSettle.vrmActionFadeMs ?? 0,
      hesitantMeasuredReturnVrm ? 300 : 220,
    ),
    vrmExpressionBlendMs: Math.max(
      rendererSettle.vrmExpressionBlendMs ?? 0,
      hesitantMeasuredReturnVrm ? 360 : 320,
    ),
  } satisfies AlicizationDialogueSpeechRendererSettleHints
}

function applyHesitantMeasuredReturnVrmPreviewCue(input: {
  cue: AlicizationDialogueSpeechTimelineSegment | null
  script: AlicizationEmbodimentScriptV1 | null
}) {
  if (!input.cue || !input.script)
    return input.cue

  const rendererSettle = resolveHesitantMeasuredReturnVrmRendererSettle({
    rendererSettle: input.cue.rendererSettle ?? null,
    rendererHints: input.cue.rendererHints ?? null,
    script: input.script,
  })
  if (!rendererSettle)
    return input.cue

  return {
    ...input.cue,
    rendererSettle,
  } satisfies AlicizationDialogueSpeechTimelineSegment
}

function resolveProjectedAuthorityCueFromMetadata(input: {
  descriptor: SpeechPlaybackDescriptor
  cue: AlicizationDialogueSpeechTimelineSegment | null
}) {
  const script = resolveEmbodimentScriptFromMetadata(input.descriptor.metadata)
  if (!script)
    return null

  const segmentId = resolvePlaybackDriverSegmentId({
    cue: input.cue,
    digitalLifeFrame: null,
    metadata: input.descriptor.metadata,
    script,
    segmentId: input.descriptor.segmentId,
    text: input.descriptor.text,
  })
  const speechSegment = segmentId
    ? script.speechPlan.segments.find(segment => segment.id === segmentId)
    : undefined
  const faceCue = segmentId
    ? script.facePlan.speakingCues.find(segment => segment.segmentId === segmentId)
    : undefined
  const motionCue = segmentId
    ? script.motionPlan.actionBursts.find(segment => segment.segmentId === segmentId)
    : undefined
  const residentMode = resolveEffectiveSpeechResidentMode({
    residentMode: script.state.residentMode,
    rendererHints: speechSegment?.rendererHints ?? input.cue?.rendererHints ?? null,
  })

  const fallbackSettleMode = residentMode === 'measured-return'
    ? 'linger' as const
    : residentMode === 'repair-before-closeness'
      ? 'hold' as const
      : 'release' as const
  const metadataCue = speechSegment
    ? {
      id: speechSegment.id,
      index: speechSegment.index,
      startOffset: Number.isFinite(Number(input.cue?.startOffset)) ? Math.max(0, Number(input.cue?.startOffset)) : 0,
      endOffset: Number.isFinite(Number(input.cue?.endOffset))
        ? Math.max(
            Number.isFinite(Number(input.cue?.startOffset)) ? Math.max(0, Number(input.cue?.startOffset)) : 0,
            Number(input.cue?.endOffset),
          )
        : Math.max(1, Array.from(input.descriptor.text).length),
      text: input.descriptor.text,
      emotion: faceCue?.emotion ?? input.cue?.emotion ?? script.state.baseEmotion,
      gestureWeight: motionCue?.intensity ?? input.cue?.gestureWeight ?? 0,
      facialWeight: faceCue?.intensity ?? input.cue?.facialWeight ?? 0,
      prosodyWeight: input.cue?.prosodyWeight ?? 0,
      beatWeight: input.cue?.beatWeight ?? 0,
      mouthWeight: input.cue?.mouthWeight ?? faceCue?.intensity ?? 0,
      headWeight: input.cue?.headWeight ?? motionCue?.intensity ?? 0,
      facialHoldMs: faceCue?.holdMs ?? speechSegment.settleMs,
      actionHoldMs: motionCue?.holdMs ?? speechSegment.settleMs,
      emotionHoldMs: faceCue?.holdMs ?? speechSegment.settleMs,
      settleMode: input.cue?.settleMode ?? fallbackSettleMode,
      rendererSettle: resolveHesitantMeasuredReturnVrmRendererSettle({
        rendererSettle: speechSegment.rendererSettle ?? input.cue?.rendererSettle ?? null,
        rendererHints: speechSegment.rendererHints ?? input.cue?.rendererHints ?? null,
        script,
      }),
      rendererHints: speechSegment.rendererHints ?? input.cue?.rendererHints ?? null,
      actionCue: motionCue?.actionCue ?? input.cue?.actionCue ?? null,
      facialCue: faceCue?.facialCue ?? input.cue?.facialCue ?? null,
      actionWindow: input.cue?.actionWindow ?? 'none',
      interruptMode: resolveTimelineInterruptModeFromPolicy(speechSegment.interruptPolicy),
    } satisfies AlicizationDialogueSpeechTimelineSegment
    : input.cue

  return resolvePlaybackTelemetryCue({
    cue: metadataCue,
    digitalLifeFrame: null,
    metadata: input.descriptor.metadata,
    segmentId,
    special: input.descriptor.special,
    text: input.descriptor.text,
  })
}

function shouldRestrainRendererOnlyRejoin(input: {
  drivers: EmbodimentPlaybackDriverTelemetry
  driverAuthority: ReturnType<typeof resolveEmbodimentPlaybackDriverAuthority> | null
  metadata?: Record<string, unknown> | null | undefined
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  const residentMode = input.residentMode ?? null
  if (residentMode !== 'repair-before-closeness' && residentMode !== 'measured-return')
    return false

  const authority = input.driverAuthority
  if (!authority)
    return false

  const seededAuthority = resolveEmbodimentPlaybackMetadataFromMetadata(input.metadata)?.driverAuthority ?? null
  const seededRendererOnlyRejoin = Boolean(
    seededAuthority
    && !seededAuthority.bodySegmentMatched
    && seededAuthority.lipsyncSegmentMatched,
  )
  const body = input.drivers.body
  const weakBodyCarry = !body
    || body.frameMode === 'recovering'
    || (typeof body.expressivity === 'number' && body.expressivity <= 0.18)
    || (typeof body.gazeStability === 'number' && body.gazeStability <= 0.42)

  return (weakBodyCarry || seededRendererOnlyRejoin)
    && !authority.bodySegmentMatched
    && authority.lipsyncSegmentMatched
    && (
      authority.faceSegmentMatched
      || authority.motionSegmentMatched
      || authority.matchedDrivers.includes('lipsync')
    )
}

function applyRestrainedRendererOnlyRejoinCue(input: {
  cue: AlicizationDialogueSpeechTimelineSegment | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  if (!input.cue)
    return input.cue

  const residentMode = input.residentMode ?? null
  return {
    ...input.cue,
    facialCue: residentMode === 'repair-before-closeness' ? 'soft-gaze' : input.cue.facialCue,
    actionCue: null,
    settleMode: 'hold' as const,
    rendererHints: {
      ...input.cue.rendererHints,
      residentMode: residentMode ?? undefined,
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    },
  } satisfies AlicizationDialogueSpeechTimelineSegment
}

function applyRestrainedRendererOnlyRejoinFrame(input: {
  frame: AlicizationDigitalLifeFrame | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  if (!input.frame)
    return input.frame

  const repairBeforeCloseness = input.residentMode === 'repair-before-closeness'

  return {
    ...input.frame,
    settleMode: 'hold',
    voice: {
      ...input.frame.voice,
      energy: Number(clampRange(
        repairBeforeCloseness ? input.frame.voice.energy * 0.8125 : input.frame.voice.energy * 0.82,
        0.16,
        repairBeforeCloseness ? 0.26 : 0.48,
      ).toFixed(2)),
      cadence: Number(clampRange(
        repairBeforeCloseness ? input.frame.voice.cadence * 0.8928571429 : input.frame.voice.cadence * 0.88,
        0.16,
        repairBeforeCloseness ? 0.25 : 0.52,
      ).toFixed(2)),
    },
    lipSync: {
      ...input.frame.lipSync,
      visemeBias: Number(clampRange(
        repairBeforeCloseness ? input.frame.lipSync.visemeBias * 0.8333333333 : input.frame.lipSync.visemeBias * 0.84,
        0.18,
        repairBeforeCloseness ? 0.35 : 0.58,
      ).toFixed(2)),
      energyBias: Number(clampRange(
        repairBeforeCloseness ? input.frame.lipSync.energyBias * 0.8125 : input.frame.lipSync.energyBias * 0.82,
        0.14,
        repairBeforeCloseness ? 0.26 : 0.46,
      ).toFixed(2)),
      mouthScale: Number(clampRange(
        repairBeforeCloseness ? input.frame.lipSync.mouthScale * 0.9186046512 : input.frame.lipSync.mouthScale * 0.92,
        0.4,
        repairBeforeCloseness ? 0.79 : 1.1,
      ).toFixed(2)),
      continuityHoldMs: Math.max(input.frame.lipSync.continuityHoldMs, input.frame.face.holdMs),
    },
    face: {
      ...input.frame.face,
      facialCue: repairBeforeCloseness ? 'soft-gaze' : input.frame.face.facialCue,
      expressionMode: 'hold',
      intensity: Number(clampRange(
        repairBeforeCloseness ? input.frame.face.intensity * 0.8684210526 : input.frame.face.intensity * 0.88,
        0.18,
        repairBeforeCloseness ? 0.33 : 0.52,
      ).toFixed(2)),
      rendererHints: {
        ...input.frame.face.rendererHints,
        residentMode: input.residentMode ?? undefined,
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      },
    },
    action: {
      ...input.frame.action,
      actionCue: repairBeforeCloseness ? 'idle_settle' : null,
      actionMode: repairBeforeCloseness ? 'hold' : 'none',
      intensity: repairBeforeCloseness
        ? Number(clampRange(input.frame.action.intensity * 0.75, 0.06, 0.18).toFixed(2))
        : 0,
      rendererHints: {
        ...input.frame.action.rendererHints,
        residentMode: input.residentMode ?? undefined,
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      },
    },
  } satisfies AlicizationDigitalLifeFrame
}

function applyAudibleSameHerRendererOnlyRejoinFrame(
  frame: AlicizationDigitalLifeFrame | null,
) {
  if (!frame)
    return frame

  const rendererHints = frame.face.rendererHints ?? frame.action.rendererHints ?? null

  return {
    ...frame,
    settleMode: frame.settleMode === 'hold' ? 'hold' : 'linger',
    voice: {
      ...frame.voice,
      energy: Number(clampRange(frame.voice.energy * 0.9, 0.16, 0.38).toFixed(2)),
      cadence: Number(clampRange(frame.voice.cadence * 0.92, 0.16, 0.32).toFixed(2)),
    },
    lipSync: {
      ...frame.lipSync,
      visemeBias: Number(clampRange(frame.lipSync.visemeBias * 0.92, 0.18, 0.5).toFixed(2)),
      energyBias: Number(clampRange(frame.lipSync.energyBias * 0.9, 0.14, 0.38).toFixed(2)),
      mouthScale: Number(clampRange(frame.lipSync.mouthScale * 0.94, 0.4, 0.94).toFixed(2)),
      continuityHoldMs: Math.max(inputContinuityHoldMs(frame), frame.face.holdMs),
    },
    face: {
      ...frame.face,
      intensity: Number(clampRange(frame.face.intensity * 0.93, 0.18, 0.46).toFixed(2)),
      rendererHints: {
        ...rendererHints ?? frame.face.rendererHints,
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      },
    },
    action: {
      ...frame.action,
      intensity: frame.action.actionCue
        ? Number(clampRange(frame.action.intensity * 0.88, 0, 0.2).toFixed(2))
        : 0,
      rendererHints: {
        ...rendererHints ?? frame.action.rendererHints,
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
      },
    },
  } satisfies AlicizationDigitalLifeFrame
}

function inputContinuityHoldMs(frame: AlicizationDigitalLifeFrame) {
  return frame.lipSync.continuityHoldMs
}

function normalizeRendererOnlyRejoinFrame(input: {
  frame: AlicizationDigitalLifeFrame | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  const frame = input.frame
  if (!frame)
    return frame

  const bodyIsStillWeak = frame.mode === 'recovering'
    || frame.face.expressionMode === 'recover'
    || frame.motor.expressivity <= 0.18
    || (readMotorGazeStability(frame.motor) ?? 1) <= 0.42

  const rendererAlreadyRejoined = frame.lipSync.continuityHoldMs >= 180
    && frame.lipSync.mouthScale >= 0.78
    && frame.settleMode === 'hold'

  const repairBeforeCloseness = input.residentMode === 'repair-before-closeness'
  const softenedSameHerRendererCarry = hasSoftenedSameHerRendererCarry(
    frame.face.rendererHints ?? frame.action.rendererHints ?? null,
  )
  const alreadyRestrainedRendererOnlyRejoin = repairBeforeCloseness
    && frame.face.facialCue === 'soft-gaze'
    && frame.face.expressionMode === 'hold'
    && frame.action.actionCue === 'idle_settle'
    && frame.action.actionMode === 'hold'
    && frame.voice.energy <= 0.26
    && frame.voice.cadence <= 0.25
    && frame.lipSync.visemeBias <= 0.35
    && frame.lipSync.energyBias <= 0.26
    && frame.lipSync.mouthScale <= 0.79
    && frame.face.intensity <= 0.33
    && frame.action.intensity <= 0.09

  if (!bodyIsStillWeak || !rendererAlreadyRejoined)
    return frame

  if (alreadyRestrainedRendererOnlyRejoin)
    return frame

  if (softenedSameHerRendererCarry)
    return applyAudibleSameHerRendererOnlyRejoinFrame(frame)

  return applyRestrainedRendererOnlyRejoinFrame(input)
}

function resolveDescriptorScriptDigitalLifeFrame(
  descriptor: SpeechPlaybackDescriptor,
  cue: AlicizationDialogueSpeechTimelineSegment | null,
) {
  const script = resolveEmbodimentScriptFromMetadata(descriptor.metadata)
  const metadataResidentMode = resolveProjectClosureSpeechResidentModeFromMetadata(
    descriptor.metadata,
  )
  const residentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
    residentMode: script?.state.residentMode ?? metadataResidentMode,
    cue,
    digitalLifeFrame: descriptor.digitalLifeFrame ?? null,
  })
  const directFrame = descriptor.digitalLifeFrame
    ? normalizeRendererOnlyRejoinFrame({
        frame: descriptor.digitalLifeFrame,
        residentMode,
      })
    : null
  if (directFrame)
    return directFrame

  if (!script)
    return null

  const scriptFrames = normalizeAlicizationDigitalLifeEnvelope(
    descriptor.metadata?.digitalLife ?? null,
  )?.frames ?? []
  if (scriptFrames.length === 0)
    return null

  const normalizedText = normalizeAlignmentText(descriptor.text)
  const matchedFrame = scriptFrames.find((frame) => {
    const frameId = frame.id?.trim() || null
    if (descriptor.segmentId?.trim() && frameId === descriptor.segmentId.trim())
      return true
    if (cue?.id?.trim() && frameId === cue.id.trim())
      return true
    return normalizeAlignmentText(frame.text) === normalizedText
  }) ?? null

  return matchedFrame
    ? normalizeRendererOnlyRejoinFrame({
        frame: matchedFrame,
        residentMode,
      })
    : null
}

function resolveRendererOnlyRejoinStopFrame(input: {
  cue: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame: AlicizationDigitalLifeFrame | null | undefined
  metadata: Record<string, unknown> | null | undefined
  segmentId: string | null | undefined
  text: string
}) {
  const frame = input.digitalLifeFrame ?? null
  const script = resolveEmbodimentScriptFromMetadata(input.metadata)
  if (!frame || !script)
    return null
  const residentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
    residentMode: script.state.residentMode,
    cue: input.cue,
    digitalLifeFrame: frame,
  })
  const shouldForceBodySuppression = shouldForceRestrainedStopTailBodySuppression({
    scriptResidentMode: script.state.residentMode,
    residentMode,
    cue: input.cue,
    digitalLifeFrame: frame,
  })
  const drivers = shouldForceBodySuppression
    ? removeBodyDriverFromPlaybackMetadata(resolvePlaybackDriverMetadata({
        cue: input.cue,
        digitalLifeFrame: frame,
        metadata: input.metadata,
        script,
        segmentId: input.segmentId,
        playbackPhase: 'idle',
        text: input.text,
      }))
    : resolvePlaybackDriverMetadata({
        cue: input.cue,
        digitalLifeFrame: frame,
        metadata: input.metadata,
        script,
        segmentId: input.segmentId,
        playbackPhase: 'idle',
        text: input.text,
      })
  const initialDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers,
    rendererTarget: script.rendererTarget,
    segmentId: input.segmentId,
  })
  const prosodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
    cue: input.cue,
    driverAuthority: initialDriverAuthority,
    drivers,
  })
  const driverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers,
    rendererTarget: script.rendererTarget,
    segmentId: input.segmentId,
    prosodyAuthority,
  })

  if (!shouldRestrainRendererOnlyRejoin({
    drivers,
    driverAuthority,
    metadata: input.metadata,
    residentMode,
  })) {
    return null
  }

  return applyRestrainedRendererOnlyRejoinFrame({
    frame,
    residentMode,
  })
}

function resolveRestrainedRendererOnlyRejoinDrivers(input: {
  cue: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame: AlicizationDigitalLifeFrame | null | undefined
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
  metadata: Record<string, unknown> | null | undefined
  script: AlicizationEmbodimentScriptV1
  segmentId: string | null | undefined
  text: string
}) {
  const baseDrivers = resolvePlaybackDriverMetadata({
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    idleCuePhase: input.idleCuePhase,
    metadata: input.metadata,
    script: input.script,
    segmentId: input.segmentId,
    playbackPhase: 'idle',
    text: input.text,
  })
  const initialDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: baseDrivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
  })
  const prosodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
    cue: input.cue,
    driverAuthority: initialDriverAuthority,
    drivers: baseDrivers,
  })
  const driverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: baseDrivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
    prosodyAuthority,
  })
  const residentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
    residentMode: input.script.state.residentMode,
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
  })
  const restrainedRendererOnlyRejoin = shouldRestrainRendererOnlyRejoin({
    drivers: baseDrivers,
    driverAuthority,
    metadata: input.metadata,
    residentMode,
  })

  if (!restrainedRendererOnlyRejoin)
    return { drivers: baseDrivers, driverAuthority, prosodyAuthority, restrainedRendererOnlyRejoin }

  const restrainedFrame = applyRestrainedRendererOnlyRejoinFrame({
    frame: input.digitalLifeFrame ?? null,
    residentMode,
  })
  const restrainedDrivers = resolvePlaybackDriverMetadata({
    cue: input.cue,
    digitalLifeFrame: restrainedFrame,
    idleCuePhase: input.idleCuePhase,
    metadata: input.metadata,
    script: input.script,
    segmentId: input.segmentId,
    playbackPhase: 'idle',
    text: input.text,
  })
  const restrainedInitialDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: restrainedDrivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
  })
  const restrainedProsodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
    cue: input.cue,
    driverAuthority: restrainedInitialDriverAuthority,
    drivers: restrainedDrivers,
  })
  const restrainedDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers: restrainedDrivers,
    rendererTarget: input.script.rendererTarget,
    segmentId: input.segmentId,
    prosodyAuthority: restrainedProsodyAuthority,
  })

  return {
    drivers: restrainedDrivers,
    driverAuthority: restrainedDriverAuthority,
    prosodyAuthority: restrainedProsodyAuthority,
    restrainedRendererOnlyRejoin,
  }
}

function applyRestrainedRendererOnlyRejoinPlaybackMetadata(input: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const playback = resolveEmbodimentPlaybackMetadataFromMetadata(input.metadata)
  if (!playback)
    return input.metadata

  const drivers = removeBodyDriverFromPlaybackMetadata(playback.drivers)
  const prosodyAuthority = playback.prosodyAuthority ?? playback.driverAuthority?.prosodyAuthority ?? null
  const driverAuthority = applyRestrainedRendererOnlyRejoinAuthority({
    driverAuthority: resolveEmbodimentPlaybackDriverAuthority({
      drivers,
      rendererTarget: playback.rendererTarget ?? null,
      segmentId: playback.driverAuthority?.segmentId ?? prosodyAuthority?.segmentId ?? null,
      prosodyAuthority,
    }),
  })

  return {
    ...input.metadata,
    embodimentPlayback: {
      ...playback,
      drivers,
      driverAuthority,
      prosodyAuthority,
    },
  } satisfies Record<string, unknown>
}

function createRestrainedRendererOnlyRejoinStopItem(input: {
  continuityHoldMs: number
  cue: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame: AlicizationDigitalLifeFrame
  item: SpeechPlaybackDescriptor
  metadata: Record<string, unknown> | null | undefined
}) {
  const script = resolveEmbodimentScriptFromMetadata(input.metadata)
  const rebuiltMetadata = enrichSpeechMetadataWithDrivers({
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    idleCuePhase: 'post-utterance',
    metadata: input.metadata,
    script,
    segmentId: input.item.segmentId,
    playbackPhase: 'idle',
    suppressBodyDriver: true,
    special: input.item.special,
    text: input.item.text,
  })
  const metadata = applyRestrainedRendererOnlyRejoinPlaybackMetadata({
    metadata: rebuiltMetadata,
  })

  const playbackItem = createStageEmbodimentSpeechPlaybackItem({
    ...input.item,
    continuityHoldMs: input.continuityHoldMs,
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    metadata,
    playbackDurationMs: input.item.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
      text: input.item.text,
      special: input.item.special,
      metadata,
      digitalLifeFrame: input.digitalLifeFrame,
    }),
  })

  const restrainedPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)

  return {
    ...playbackItem,
    metadata: metadata
      ? {
          ...metadata,
          embodimentPlayback: restrainedPlayback,
        }
      : null,
  }
}

function createRestrainedRendererOnlyRejoinStartItem(input: {
  continuityHoldMs: number | null | undefined
  cue: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame: AlicizationDigitalLifeFrame
  item: SpeechPlaybackDescriptor
  metadata: Record<string, unknown> | null | undefined
  playbackDurationMs: number
}) {
  const metadata = applyRestrainedRendererOnlyRejoinPlaybackMetadata({
    metadata: enrichSpeechMetadataWithDrivers({
      cue: input.cue,
      digitalLifeFrame: input.digitalLifeFrame,
      metadata: input.metadata,
      script: resolveEmbodimentScriptFromMetadata(input.metadata),
      segmentId: input.item.segmentId,
      playbackPhase: 'playing',
      suppressBodyDriver: true,
      special: input.item.special,
      text: input.item.text,
    }),
  })
  const playbackItem = createStageEmbodimentSpeechPlaybackItem({
    ...input.item,
    continuityHoldMs: input.continuityHoldMs,
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    metadata,
    playbackDurationMs: input.playbackDurationMs,
  })
  const restrainedPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)

  return {
    ...playbackItem,
    metadata: metadata
      ? {
          ...metadata,
          embodimentPlayback: restrainedPlayback,
        }
      : null,
  }
}

function enforceRestrainedRendererOnlyRejoinPlaybackMetadata(input: {
  item: ReturnType<typeof createStageEmbodimentSpeechPlaybackItem>
}) {
  const metadata = applyRestrainedRendererOnlyRejoinPlaybackMetadata({
    metadata: input.item.metadata,
  })
  const restrainedPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)

  return {
    ...input.item,
    metadata: metadata
      ? {
          ...metadata,
          embodimentPlayback: restrainedPlayback,
        }
      : null,
  }
}

function shouldPreserveRestrainedRendererOnlyRejoinPlaybackItem(
  item: StageEmbodimentSpeechPlaybackState['item'],
) {
  const playback = resolveEmbodimentPlaybackMetadataFromMetadata(item?.metadata)
  if (!item || !playback?.driverAuthority)
    return false

  const softenedSameHerRendererCarry = hasSoftenedSameHerRendererCarry(
    item.digitalLifeFrame?.face.rendererHints
    ?? item.digitalLifeFrame?.action.rendererHints
    ?? item.cue?.rendererHints
    ?? playback.cue?.rendererHints
    ?? null,
  )

  return !playback.driverAuthority.bodySegmentMatched
    && playback.driverAuthority.lipsyncSegmentMatched
    && (
      item.digitalLifeFrame?.settleMode === 'hold'
      || (softenedSameHerRendererCarry && item.digitalLifeFrame?.settleMode === 'linger')
    )
}

function hasRestrainedRendererOnlyRejoinContinuity(
  playback: ReturnType<typeof resolveEmbodimentPlaybackMetadataFromMetadata> | null | undefined,
) {
  const authority = playback?.driverAuthority
  if (!authority)
    return false

  return !authority.bodySegmentMatched
    && authority.lipsyncSegmentMatched
    && (
      authority.faceSegmentMatched
      || authority.motionSegmentMatched
      || authority.matchedDrivers.includes('lipsync')
    )
}

function shouldSuppressRendererOnlyRejoinBodyDriver(input: {
  driverAuthority?: ReturnType<typeof resolveEmbodimentPlaybackDriverAuthority> | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  metadata?: Record<string, unknown> | null | undefined
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode'] | null | undefined
}) {
  const seededAuthority = resolveEmbodimentPlaybackMetadataFromMetadata(input.metadata)?.driverAuthority ?? null
  if (
    seededAuthority
    && !seededAuthority.bodySegmentMatched
    && seededAuthority.lipsyncSegmentMatched
  ) {
    return true
  }

  return shouldRestrainRendererOnlyRejoin({
    drivers: {
      body: input.digitalLifeFrame?.motor
        ? {
            frameMode: input.digitalLifeFrame.mode ?? null,
            stillness: Number.isFinite(input.digitalLifeFrame.motor.stillness) ? Number(input.digitalLifeFrame.motor.stillness) : null,
            gazeStability: readMotorGazeStability(input.digitalLifeFrame.motor),
            breathAmplitude: readMotorBreathAmplitude(input.digitalLifeFrame.motor),
            expressivity: Number.isFinite(input.digitalLifeFrame.motor.expressivity) ? Number(input.digitalLifeFrame.motor.expressivity) : null,
            segmentId: input.digitalLifeFrame.id ?? null,
          }
        : null,
      face: null,
      lipsync: null,
      motion: null,
    },
    driverAuthority: input.driverAuthority ?? null,
    metadata: input.metadata,
    residentMode: input.residentMode,
  })
}

function applyRestrainedRendererOnlyRejoinAuthority(input: {
  driverAuthority: ReturnType<typeof resolveEmbodimentPlaybackDriverAuthority> | null
}) {
  const authority = input.driverAuthority
  if (!authority)
    return authority

  return {
    ...authority,
    matchedDrivers: authority.matchedDrivers.filter(driver => driver !== 'body'),
    bodySegmentMatched: false,
  }
}

function enrichSpeechMetadataWithReconciliation(input: {
  actualDurationMs: number
  cue?: AlicizationDialogueSpeechTimelineSegment | null
  digitalLifeFrame?: AlicizationDigitalLifeFrame | null
  metadata: Record<string, unknown> | null | undefined
  plannedDurationMs: number
  segmentId: string | null | undefined
  special?: string | null | undefined
  stopReason: string
  text: string
}) {
  const script = resolveEmbodimentScriptFromMetadata(input.metadata)
  const metadataWithDrivers = enrichSpeechMetadataWithDrivers({
    cue: input.cue,
    digitalLifeFrame: input.digitalLifeFrame,
    idleCuePhase: 'post-utterance',
    metadata: input.metadata,
    script,
    segmentId: input.segmentId,
    playbackPhase: 'idle',
    special: input.special,
    text: input.text,
  })
  if (!script)
    return metadataWithDrivers

  const {
    drivers,
    driverAuthority,
    restrainedRendererOnlyRejoin,
  } = resolveRestrainedRendererOnlyRejoinDrivers({
    idleCuePhase: 'post-utterance',
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
    metadata: metadataWithDrivers,
    script,
    segmentId: input.segmentId,
    text: input.text,
  })
  const residentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
    residentMode: script.state.residentMode,
    cue: input.cue ?? null,
    digitalLifeFrame: input.digitalLifeFrame ?? null,
  })
  const restrainedPlaybackFrame = restrainedRendererOnlyRejoin
    ? applyRestrainedRendererOnlyRejoinFrame({
        frame: input.digitalLifeFrame ?? null,
        residentMode,
      })
    : input.digitalLifeFrame ?? null
  const reconciledCue = resolvePlaybackTelemetryCue({
    cue: input.cue,
    digitalLifeFrame: restrainedPlaybackFrame,
    metadata: metadataWithDrivers,
    segmentId: input.segmentId,
    special: input.special,
    text: input.text,
  })
  const normalizedProsodyAuthority = resolveEmbodimentPlaybackProsodyAuthority({
    cue: reconciledCue,
    driverAuthority,
    drivers,
  })
  const normalizedDriverAuthority = resolveEmbodimentPlaybackDriverAuthority({
    drivers,
    rendererTarget: script.rendererTarget,
    segmentId: input.segmentId,
    prosodyAuthority: normalizedProsodyAuthority,
  })
  const finalizedDrivers = restrainedRendererOnlyRejoin
    ? removeBodyDriverFromPlaybackMetadata(drivers)
    : drivers
  const finalizedDriverAuthority = restrainedRendererOnlyRejoin
    ? applyRestrainedRendererOnlyRejoinAuthority({
        driverAuthority: resolveEmbodimentPlaybackDriverAuthority({
          drivers: finalizedDrivers,
          rendererTarget: script.rendererTarget,
          segmentId: input.segmentId,
          prosodyAuthority: normalizedProsodyAuthority,
        }),
      })
    : normalizedDriverAuthority
  const normalizedCue = restrainedRendererOnlyRejoin
    ? applyRestrainedRendererOnlyRejoinCue({
        cue: reconciledCue,
        residentMode,
      })
    : reconciledCue

  return {
    ...metadataWithDrivers,
    embodimentPlayback: {
      ...reconcileEmbodimentPlayback({
        actualDurationMs: input.actualDurationMs,
        plannedDurationMs: input.plannedDurationMs,
        script,
        stopReason: input.stopReason,
      }),
      rendererTarget: script.rendererTarget,
      cue: normalizedCue,
      drivers: finalizedDrivers,
      driverAuthority: finalizedDriverAuthority,
      prosodyAuthority: normalizedProsodyAuthority,
    },
  } satisfies Record<string, unknown>
}

function createSpeechPlanSignature(plan: AlicizationEmbodimentSpeechPlan | null | undefined) {
  let hash = 2166136261
  hash = updateStableSignature(hash, plan?.interruptPolicy ?? null)
  hash = updateStableSignature(hash, plan?.preRollMs ?? null)
  hash = updateStableSignature(hash, plan?.settleMs ?? null)

  plan?.segments.forEach((segment) => {
    hash = updateStableSignature(hash, segment.id)
    hash = updateStableSignature(hash, segment.index)
    hash = updateStableSignature(hash, segment.text)
    hash = updateStableSignature(hash, segment.interruptPolicy)
    hash = updateStableSignature(hash, segment.preRollMs)
    hash = updateStableSignature(hash, segment.settleMs)
  })

  return finalizeStableSignature(hash)
}

export function useStageEmbodimentSpeech(options: UseStageEmbodimentSpeechOptions) {
  const audioAnalyser = ref<AnalyserNode>()
  const currentAudioSource = ref<AudioNode>()
  const queuedSpeechSegments = ref<Array<ReturnType<typeof createStageEmbodimentSpeechPlaybackItem>>>([])
  const upcomingSpeechSegment = computed(() => queuedSpeechSegments.value[0] ?? null)
  const speechPlaybackState = ref<StageEmbodimentSpeechPlaybackState>(createIdleStageEmbodimentSpeechPlaybackState())
  const speechRenderState = ref<StageEmbodimentSpeechRenderState>(createIdleStageEmbodimentSpeechRenderState())
  const listeners = new Set<SpeechPlaybackListener>()

  const lipSyncNode = ref<AudioNode>()
  const live2dLipSync = ref<Live2DLipSync>()
  const lipSyncStarted = ref(false)
  const speechSignalsLoopId = ref<number>()
  const live2dLipSyncOptions = options.live2dLipSyncOptions ?? defaultLive2dLipSyncOptions
  let analyserSamples: Uint8Array<ArrayBuffer> | undefined
  let speechRenderRevision = 0
  let syntheticSpeech = createIdleSyntheticSpeechState()
  let speechTimelineAlignment = createIdleSpeechTimelineAlignmentState()
  const speechPlanAlignment = createIdleSpeechPlanAlignmentState()
  let speechArticulationState = createIdleStageEmbodimentSpeechArticulationState()
  let speechArticulationStartedAt: number | null = null
  let speechStopTailMouthOpen = 0
  let speechStopTailStartedAt: number | null = null
  let speechStopTailDurationMs = 0
  let digitalLifeEnvelopeSignature = ''
  let authoritativeDigitalLifeEnvelope: AlicizationDigitalLifeEnvelope | null = null
  const digitalLifeFramesBySegmentId = new Map<string, AlicizationDigitalLifeFrame>()
  const recentDigitalLifeFramesBySegmentId = new Map<string, AlicizationDigitalLifeFrame>()
  let speechStopLingerTimer: ReturnType<typeof setTimeout> | undefined
  const previewCueCache = new Map<string, AlicizationDialogueSpeechTimelineSegment>()
  let lastSpeechSignalsTickAt = 0
  let lastSpeechSignalsTraceAt = 0
  let setupLive2dLipSyncPromise: Promise<void> | null = null
  let pendingLipSyncPrewarmTimer: ReturnType<typeof setTimeout> | undefined

  function clearSpeechStopLinger() {
    if (!speechStopLingerTimer)
      return

    clearTimeout(speechStopLingerTimer)
    speechStopLingerTimer = undefined
  }

  function finalizeSpeechStopLinger() {
    speechStopLingerTimer = undefined
    speechStopTailMouthOpen = 0
    speechStopTailStartedAt = null
    speechStopTailDurationMs = 0
    setEmbodimentMouthOpenSize(0, false)
    speechRenderRevision += 1
    syncSpeechRenderState(null)
  }

  function scheduleSpeechStopLinger(item: SpeechPlaybackDescriptor, stopReason: string | null) {
    clearSpeechStopLinger()
    const authoritativeItem = speechPlaybackState.value.item

    const lingerMs = resolveStageEmbodimentSpeechStopLingerMs({
      item: authoritativeItem ?? createStageEmbodimentSpeechPlaybackItem({
        ...item,
        continuityHoldMs: item.continuityHoldMs,
      }),
      stopReason,
    })

    if (lingerMs <= 0) {
      finalizeSpeechStopLinger()
      return
    }

    speechStopTailStartedAt = performance.now()
    speechStopTailDurationMs = lingerMs
    speechStopLingerTimer = setTimeout(() => {
      finalizeSpeechStopLinger()
    }, lingerMs)
  }

  function clonePlaybackState(): StageEmbodimentSpeechPlaybackState {
    return {
      ...speechPlaybackState.value,
      dynamics: { ...speechPlaybackState.value.dynamics },
      item: speechPlaybackState.value.item
        ? {
            ...speechPlaybackState.value.item,
            metadata: cloneSpeechMetadata(speechPlaybackState.value.item.metadata),
            cue: speechPlaybackState.value.item.cue ? { ...speechPlaybackState.value.item.cue } : null,
          }
        : null,
    }
  }

  function deriveSpeechArticulation(now: number) {
    const item = speechPlaybackState.value.item
    if (speechPlaybackState.value.phase !== 'playing' || !item) {
      speechArticulationState = createIdleStageEmbodimentSpeechArticulationState()
      return
    }

    if (speechArticulationStartedAt == null)
      speechArticulationStartedAt = now

    const baseArticulation = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: item.text,
      special: item.special,
      metadata: item.metadata,
      playbackDurationMs: item.playbackDurationMs,
      startedAt: speechArticulationStartedAt,
      now,
      mouthOpenRatio: speechPlaybackState.value.mouthOpenSize / 100,
      dynamics: speechPlaybackState.value.dynamics,
      digitalLifeFrame: item.digitalLifeFrame,
    })
    speechArticulationState = overlayLive2dAudioArticulation(
      baseArticulation,
      speechPlaybackState.value.dynamics.speechEnergy,
    )
  }

  function resetSpeechArticulation() {
    speechArticulationStartedAt = null
    speechArticulationState = createIdleStageEmbodimentSpeechArticulationState()
  }

  function beginSpeechArticulation(now: number) {
    speechArticulationStartedAt = now
  }

  function resolveProjectedSpeechArticulation(now: number, speechEnergy: number) {
    const item = speechPlaybackState.value.item
    if (speechPlaybackState.value.phase !== 'playing' || !item) {
      return createIdleStageEmbodimentSpeechArticulationState()
    }

    const startedAt = speechArticulationStartedAt
      ?? speechPlaybackState.value.startedAt
      ?? now

    const baseArticulation = deriveStageEmbodimentSpeechArticulationState({
      active: true,
      text: item.text,
      special: item.special,
      metadata: item.metadata,
      playbackDurationMs: item.playbackDurationMs,
      startedAt,
      now,
      mouthOpenRatio: speechPlaybackState.value.mouthOpenSize / 100,
      dynamics: {
        ...speechPlaybackState.value.dynamics,
        speechEnergy,
      },
      digitalLifeFrame: item.digitalLifeFrame,
    })

    return overlayLive2dAudioArticulation(baseArticulation, speechEnergy)
  }

  function overlayLive2dAudioArticulation(
    baseArticulation: ReturnType<typeof createIdleStageEmbodimentSpeechArticulationState>,
    speechEnergy: number,
  ) {
    if (
      options.stageModelRenderer.value !== 'live2d'
      || !live2dLipSync.value
      || !shouldRunLive2dLipSyncLoop({
        stageModelRenderer: options.stageModelRenderer.value,
        paused: options.paused.value,
      })
    ) {
      return baseArticulation
    }

    const hintMap = {
      A: 0,
      E: 0,
      I: 0,
      O: 0,
      U: 0,
      closed: 0,
    }
    const activeVisemeHints = resolveActivePlaybackVisemeHints(speechPlaybackState.value.item)
    const authoritativeHintStrength = resolveAuthoritativeHintStrength(activeVisemeHints)
    for (const hint of activeVisemeHints) {
      hintMap[hint.viseme] = Math.max(hintMap[hint.viseme], clampUnit(hint.weight))
    }

    const rawVisemes = live2dLipSync.value.getVowelWeights?.()
    const audioVisemes = {
      A: clampUnit(rawVisemes?.A ?? 0),
      E: clampUnit(rawVisemes?.E ?? 0),
      I: clampUnit(rawVisemes?.I ?? 0),
      O: clampUnit(rawVisemes?.O ?? 0),
      U: clampUnit(rawVisemes?.U ?? 0),
    }
    const audioPeak = Math.max(
      audioVisemes.A,
      audioVisemes.E,
      audioVisemes.I,
      audioVisemes.O,
      audioVisemes.U,
    )
    const hintedVisemes = {
      A: hintMap.A,
      E: hintMap.E,
      I: hintMap.I,
      O: hintMap.O,
      U: hintMap.U,
    }
    const hintedPeak = Math.max(
      hintedVisemes.A,
      hintedVisemes.E,
      hintedVisemes.I,
      hintedVisemes.O,
      hintedVisemes.U,
    )
    const hintedClosure = hintMap.closed
    const hintStrength = Math.max(hintedPeak, hintedClosure)
    if (audioPeak <= 0.01 && hintStrength <= 0.01)
      return baseArticulation

    const lipSyncProfile = speechPlaybackState.value.item?.digitalLifeFrame?.lipSync
    const visemeBias = clampRange(lipSyncProfile?.visemeBias ?? 0.58, 0.16, 1)
    const energyBias = clampRange(lipSyncProfile?.energyBias ?? 0.42, 0.12, 1)
    const durableMeasuredReturnTail = (
      baseArticulation.progress >= 0.72
      && speechPlaybackState.value.item?.digitalLifeFrame?.mode === 'recovering'
      && speechPlaybackState.value.item?.digitalLifeFrame?.settleMode === 'linger'
      && (
        isDurableMeasuredReturnFrame(speechPlaybackState.value.item?.digitalLifeFrame)
        || isDurableMeasuredReturnCue(speechPlaybackState.value.item?.cue)
      )
    )
    const repairBeforeClosenessTail = (
      baseArticulation.progress >= 0.72
      && speechPlaybackState.value.item?.digitalLifeFrame?.mode === 'recovering'
      && (
        isRepairBeforeClosenessFrame(speechPlaybackState.value.item?.digitalLifeFrame)
        || isRepairBeforeClosenessCue(speechPlaybackState.value.item?.cue)
      )
    )
    const strongDurableMeasuredReturnTail = durableMeasuredReturnTail && (
      isStrongDurableMeasuredReturnFrame(speechPlaybackState.value.item?.digitalLifeFrame)
      || isStrongDurableMeasuredReturnCue(speechPlaybackState.value.item?.cue)
    )
    const durableTailOpenBias = strongDurableMeasuredReturnTail
      ? 0.72
      : durableMeasuredReturnTail
        ? 0.86
        : repairBeforeClosenessTail
          ? 0.8
          : 1
    const durableTailClosureBias = strongDurableMeasuredReturnTail
      ? 1.18
      : durableMeasuredReturnTail
        ? 1.08
        : repairBeforeClosenessTail
          ? 1.12
          : 1
    const durableTailClosureCarry = strongDurableMeasuredReturnTail
      ? clampUnit(Math.max(
          baseArticulation.lipClosure,
          baseArticulation.visemes.closed,
        ) * 1.08 + 0.12)
      : durableMeasuredReturnTail
        ? clampUnit(Math.max(
            baseArticulation.lipClosure,
            baseArticulation.visemes.closed,
          ) * 1.02 + 0.06)
        : repairBeforeClosenessTail
          ? clampUnit(Math.max(
              baseArticulation.lipClosure,
              baseArticulation.visemes.closed,
            ) * 1.04 + 0.08)
          : 0
    const effectiveVisemeBias = clampRange(
      (
        visemeBias + hintStrength * 0.24 + authoritativeHintStrength * 0.22
      ) * (
        strongDurableMeasuredReturnTail
          ? 0.72
          : durableMeasuredReturnTail
            ? 0.84
            : repairBeforeClosenessTail
              ? 0.76
              : 1
      ),
      authoritativeHintStrength > 0
        ? Math.max(
            visemeBias * (
              strongDurableMeasuredReturnTail
                ? 0.72
                : durableMeasuredReturnTail
                  ? 0.84
                  : repairBeforeClosenessTail
                    ? 0.76
                    : 1
            ),
            strongDurableMeasuredReturnTail
              ? 0.62
              : durableMeasuredReturnTail
                ? 0.74
                : repairBeforeClosenessTail
                  ? 0.68
                  : 0.86,
          )
        : visemeBias * (
          strongDurableMeasuredReturnTail
            ? 0.72
            : durableMeasuredReturnTail
              ? 0.84
              : repairBeforeClosenessTail
                ? 0.76
                : 1
        ),
      1,
    )
    const effectiveEnergyBias = clampRange(
      energyBias
      + hintedClosure * 0.18
      + authoritativeHintStrength * 0.16
      + (
        strongDurableMeasuredReturnTail
          ? 0.12
          : durableMeasuredReturnTail
            ? 0.06
            : repairBeforeClosenessTail
              ? 0.08
              : 0
      ),
      authoritativeHintStrength > 0
        ? Math.max(
            energyBias + (
              strongDurableMeasuredReturnTail
                ? 0.12
                : durableMeasuredReturnTail
                  ? 0.06
                  : repairBeforeClosenessTail
                    ? 0.08
                    : 0
            ),
            strongDurableMeasuredReturnTail
              ? 0.72
              : durableMeasuredReturnTail
                ? 0.66
                : repairBeforeClosenessTail
                  ? 0.68
                  : 0.72,
          )
        : energyBias + (
          strongDurableMeasuredReturnTail
            ? 0.12
            : durableMeasuredReturnTail
              ? 0.06
              : repairBeforeClosenessTail
                ? 0.08
                : 0
        ),
      1,
    )
    const voice = baseArticulation.voice
    const audioRound = clampUnit(
      audioVisemes.U * 0.92 * durableTailOpenBias
      + audioVisemes.O * 0.68 * durableTailOpenBias
      + (voice?.roundBias ?? 0) * 0.18,
    )
    const audioSpread = clampUnit(
      audioVisemes.I * 0.9 * durableTailOpenBias
      + audioVisemes.E * 0.66 * durableTailOpenBias
      + (voice?.spreadBias ?? 0) * 0.18,
    )
    const audioJaw = clampUnit(
      audioVisemes.A * 0.88 * durableTailOpenBias
      + audioVisemes.O * 0.42 * durableTailOpenBias
      + speechEnergy * 0.22 * durableTailOpenBias
      + (voice?.jawBias ?? 0) * 0.12,
    )
    const hintedRound = clampUnit(
      hintedVisemes.U * 0.94 * durableTailOpenBias
      + hintedVisemes.O * 0.72 * durableTailOpenBias
      + (voice?.roundBias ?? 0) * 0.18,
    )
    const hintedSpread = clampUnit(
      hintedVisemes.I * 0.92 * durableTailOpenBias
      + hintedVisemes.E * 0.68 * durableTailOpenBias
      + (voice?.spreadBias ?? 0) * 0.18,
    )
    const hintedJaw = clampUnit(
      hintedVisemes.A * 0.76 * durableTailOpenBias
      + hintedVisemes.O * 0.34 * durableTailOpenBias
      + speechEnergy * 0.16 * durableTailOpenBias
      + (voice?.jawBias ?? 0) * 0.1,
    )
    const roundTarget = clampUnit(Math.max(
      audioRound,
      hintedRound * (0.64 + hintStrength * 0.36),
    ))
    const spreadTarget = clampUnit(Math.max(
      audioSpread,
      hintedSpread * (0.64 + hintStrength * 0.36),
    ))
    const jawTarget = clampUnit(Math.max(
      audioJaw,
      hintedJaw * (0.6 + hintStrength * 0.32),
    ))
    const opennessTarget = clampUnit(
      Math.max(
        baseArticulation.openness,
        audioPeak * (0.68 + speechEnergy * 0.18) * durableTailOpenBias,
        jawTarget * 0.9,
        hintedPeak * (0.52 + speechEnergy * 0.18) * durableTailOpenBias,
      ) * (1 - baseArticulation.lipClosure * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.28 : 0.18)),
    )
    const closureTarget = clampUnit(
      Math.max(
        baseArticulation.lipClosure * (1 - audioPeak * 0.76),
        baseArticulation.visemes.closed * (1 - audioPeak * 0.72),
        (1 - audioPeak) * 0.16 * energyBias,
        hintedClosure * (0.28 + hintStrength * 0.36) * durableTailClosureBias,
        durableTailClosureCarry,
      ),
    )

    return {
      ...baseArticulation,
      openness: roundHundredths(
        baseArticulation.openness + (opennessTarget - baseArticulation.openness) * effectiveVisemeBias,
        baseArticulation.openness,
      ),
      jawOpen: roundHundredths(
        baseArticulation.jawOpen + (jawTarget - baseArticulation.jawOpen) * Math.max(effectiveVisemeBias, effectiveEnergyBias),
        baseArticulation.jawOpen,
      ),
      lipClosure: roundHundredths(
        Math.max(
          baseArticulation.lipClosure + (closureTarget - baseArticulation.lipClosure) * effectiveEnergyBias,
          strongDurableMeasuredReturnTail
            ? clampUnit(Math.max(
                durableTailClosureCarry,
                baseArticulation.lipClosure + 0.1,
              ))
            : durableMeasuredReturnTail
              ? clampUnit(Math.max(
                  durableTailClosureCarry,
                  baseArticulation.lipClosure + 0.04,
                ))
              : repairBeforeClosenessTail
                ? clampUnit(Math.max(
                    durableTailClosureCarry,
                    baseArticulation.lipClosure + 0.06,
                  ))
                : 0,
        ),
        baseArticulation.lipClosure,
      ),
      lipSpread: roundHundredths(
        baseArticulation.lipSpread + (spreadTarget - baseArticulation.lipSpread) * effectiveVisemeBias,
        baseArticulation.lipSpread,
      ),
      lipRound: roundHundredths(
        baseArticulation.lipRound + (roundTarget - baseArticulation.lipRound) * effectiveVisemeBias,
        baseArticulation.lipRound,
      ),
      visemes: {
        A: roundHundredths(Math.max(
          baseArticulation.visemes.A * (1 - effectiveVisemeBias * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.58 : 0.42)),
          audioVisemes.A * visemeBias * durableTailOpenBias,
          hintedVisemes.A * effectiveVisemeBias * durableTailOpenBias,
        )),
        E: roundHundredths(Math.max(
          baseArticulation.visemes.E * (1 - effectiveVisemeBias * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.58 : 0.42)),
          audioVisemes.E * visemeBias * durableTailOpenBias,
          hintedVisemes.E * effectiveVisemeBias * durableTailOpenBias,
        )),
        I: roundHundredths(Math.max(
          baseArticulation.visemes.I * (1 - effectiveVisemeBias * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.58 : 0.42)),
          audioVisemes.I * visemeBias * durableTailOpenBias,
          hintedVisemes.I * effectiveVisemeBias * durableTailOpenBias,
        )),
        O: roundHundredths(Math.max(
          baseArticulation.visemes.O * (1 - effectiveVisemeBias * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.58 : 0.42)),
          audioVisemes.O * visemeBias * durableTailOpenBias,
          hintedVisemes.O * effectiveVisemeBias * durableTailOpenBias,
        )),
        U: roundHundredths(Math.max(
          baseArticulation.visemes.U * (1 - effectiveVisemeBias * (durableMeasuredReturnTail || repairBeforeClosenessTail ? 0.58 : 0.42)),
          audioVisemes.U * visemeBias * durableTailOpenBias,
          hintedVisemes.U * effectiveVisemeBias * durableTailOpenBias,
        )),
        closed: roundHundredths(Math.max(
          closureTarget,
          hintedClosure * (0.36 + hintStrength * 0.28 + authoritativeHintStrength * 0.2),
          strongDurableMeasuredReturnTail
            ? clampUnit(Math.max(durableTailClosureCarry, baseArticulation.visemes.closed + 0.08))
            : durableMeasuredReturnTail
              ? clampUnit(Math.max(durableTailClosureCarry, baseArticulation.visemes.closed + 0.03))
              : repairBeforeClosenessTail
                ? clampUnit(Math.max(durableTailClosureCarry, baseArticulation.visemes.closed + 0.05))
                : 0,
        )),
      },
    }
  }

  function emitPlaybackEvent(type: StageEmbodimentSpeechPlaybackEvent['type']) {
    speechRenderRevision += 1
    deriveSpeechArticulation(performance.now())
    speechRenderState.value = deriveStageEmbodimentSpeechRenderState({
      articulation: speechArticulationState,
      state: clonePlaybackState(),
      lastEventType: type,
      revision: speechRenderRevision,
    })
    const event = {
      type,
      state: clonePlaybackState(),
    } satisfies StageEmbodimentSpeechPlaybackEvent

    for (const listener of listeners)
      listener(event)
  }

  function onPlaybackEvent(listener: SpeechPlaybackListener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function commitPlaybackState(patch: Partial<StageEmbodimentSpeechPlaybackState>) {
    speechPlaybackState.value = {
      ...speechPlaybackState.value,
      ...patch,
    }
  }

  function syncSpeechRenderState(lastEventType: StageEmbodimentSpeechPlaybackEvent['type'] | null = null) {
    deriveSpeechArticulation(performance.now())
    speechRenderState.value = deriveStageEmbodimentSpeechRenderState({
      articulation: speechArticulationState,
      state: clonePlaybackState(),
      lastEventType,
      revision: speechRenderRevision,
    })
  }

  function resetSpeechTimelineAlignment() {
    previewCueCache.clear()
    speechTimelineAlignment = createIdleSpeechTimelineAlignmentState()
  }

  function rememberPreviewCue(
    segmentId: string | null | undefined,
    cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
  ) {
    const normalizedSegmentId = segmentId?.trim()
    const clonedCue = cloneSpeechTimelineCue(cue)
    if (!normalizedSegmentId || !clonedCue)
      return

    previewCueCache.set(normalizedSegmentId, clonedCue)
    if (previewCueCache.size <= 128)
      return

    const oldestKey = previewCueCache.keys().next().value
    if (oldestKey)
      previewCueCache.delete(oldestKey)
  }

  function resolvePreviewCue(segmentId: string | null | undefined) {
    const normalizedSegmentId = segmentId?.trim()
    if (!normalizedSegmentId)
      return null

    return cloneSpeechTimelineCue(previewCueCache.get(normalizedSegmentId))
  }

  function discardPreviewSpeechSegment(segmentId: string | null | undefined) {
    const normalizedSegmentId = segmentId?.trim()
    if (!normalizedSegmentId)
      return

    previewCueCache.delete(normalizedSegmentId)
    clearUpcomingSpeechSegment(normalizedSegmentId)
  }

  function clearUpcomingSpeechSegment(segmentId?: string | null) {
    if (!segmentId) {
      queuedSpeechSegments.value = []
      return
    }

    queuedSpeechSegments.value = queuedSpeechSegments.value
      .filter(item => item.segmentId !== segmentId)
  }

  function resolveTelemetrySourceMetadata() {
    return speechPlaybackState.value.item?.metadata
      ?? upcomingSpeechSegment.value?.metadata
      ?? queuedSpeechSegments.value[0]?.metadata
      ?? null
  }

  function rememberSpokenText(text: string, nextConsumedOffset?: number) {
    const normalizedText = normalizeAlignmentText(text)
    if (!normalizedText)
      return

    speechTimelineAlignment.consumedText = normalizeAlignmentText([
      speechTimelineAlignment.consumedText,
      normalizedText,
    ].filter(Boolean).join(' '))

    if (Number.isFinite(nextConsumedOffset)) {
      speechTimelineAlignment.consumedOffset = Math.max(0, Number(nextConsumedOffset))
      return
    }

    if (speechTimelineAlignment.timeline) {
      speechTimelineAlignment.consumedOffset = resolveAlicizationDialogueSpeechTimelineConsumedOffset({
        timeline: speechTimelineAlignment.timeline,
        consumedText: speechTimelineAlignment.consumedText,
      })
    }
  }

  function createTimelineSignature(timeline: AlicizationDialogueSpeechTimeline | null) {
    if (!timeline)
      return ''

    let hash = 2166136261
    hash = updateStableSignature(hash, timeline.version)
    hash = updateStableSignature(hash, timeline.variationToken)
    hash = updateStableSignature(hash, timeline.reply)
    hash = updateStableSignature(hash, timeline.segments.length)

    timeline.segments.forEach((segment) => {
      hash = updateStableSignature(hash, segment.id)
      hash = updateStableSignature(hash, segment.index)
      hash = updateStableSignature(hash, segment.text)
      hash = updateStableSignature(hash, segment.emotion ?? null)
      hash = updateStableSignature(hash, segment.facialCue ?? null)
      hash = updateStableSignature(hash, segment.actionCue ?? null)
      hash = updateStableSignature(hash, segment.settleMode ?? null)
      hash = updateStableSignature(hash, segment.actionWindow)
      hash = updateStableSignature(hash, segment.interruptMode)
      hash = updateStableSignature(hash, segment.facialHoldMs ?? null)
      hash = updateStableSignature(hash, segment.actionHoldMs ?? null)
      hash = updateStableSignature(hash, segment.emotionHoldMs ?? null)
      hash = updateStableSignature(hash, segment.rendererHints?.preferredExpressionAliases?.length ?? 0)
      segment.rendererHints?.preferredExpressionAliases?.forEach((alias) => {
        hash = updateStableSignature(hash, alias)
      })
      hash = updateStableSignature(hash, segment.rendererHints?.preferredMotionAliases?.length ?? 0)
      segment.rendererHints?.preferredMotionAliases?.forEach((alias) => {
        hash = updateStableSignature(hash, alias)
      })
    })

    return finalizeStableSignature(hash)
  }

  function createDigitalLifeSignature(envelope: AlicizationDigitalLifeEnvelope | null) {
    if (!envelope)
      return ''

    let hash = 2166136261
    hash = updateStableSignature(hash, envelope.version)
    hash = updateStableSignature(hash, envelope.variationToken)
    hash = updateStableSignature(hash, envelope.mode)
    hash = updateStableSignature(hash, envelope.frames.length)

    envelope.frames.forEach((frame) => {
      hash = updateStableSignature(hash, frame.id)
      hash = updateStableSignature(hash, frame.index)
      hash = updateStableSignature(hash, frame.mode)
      hash = updateStableSignature(hash, frame.text)
      hash = updateStableSignature(hash, frame.face.emotion)
      hash = updateStableSignature(hash, frame.face.facialCue ?? null)
      hash = updateStableSignature(hash, frame.face.expressionMode)
      hash = updateStableSignature(hash, frame.face.holdMs)
      hash = updateStableSignature(hash, frame.face.rendererHints?.preferredExpressionAliases?.length ?? 0)
      frame.face.rendererHints?.preferredExpressionAliases?.forEach((alias) => {
        hash = updateStableSignature(hash, alias)
      })
      hash = updateStableSignature(hash, frame.action.actionCue ?? null)
      hash = updateStableSignature(hash, frame.action.actionMode)
      hash = updateStableSignature(hash, frame.action.holdMs)
      hash = updateStableSignature(hash, frame.action.rendererHints?.preferredMotionAliases?.length ?? 0)
      frame.action.rendererHints?.preferredMotionAliases?.forEach((alias) => {
        hash = updateStableSignature(hash, alias)
      })
      hash = updateStableSignature(hash, frame.lipSync.mode)
      hash = updateStableSignature(hash, frame.lipSync.mouthScale)
      hash = updateStableSignature(hash, frame.lipSync.continuityHoldMs)
      hash = updateStableSignature(hash, frame.motor.stillness)
      hash = updateStableSignature(hash, frame.motor.expressivity)
      hash = updateStableSignature(hash, frame.motor.gaze.focus)
      hash = updateStableSignature(hash, frame.motor.gaze.stability)
      hash = updateStableSignature(hash, frame.motor.gaze.azimuth)
      hash = updateStableSignature(hash, frame.motor.gaze.elevation)
      hash = updateStableSignature(hash, frame.motor.head.yaw)
      hash = updateStableSignature(hash, frame.motor.head.pitch)
      hash = updateStableSignature(hash, frame.motor.head.roll)
      hash = updateStableSignature(hash, frame.motor.head.nod)
      hash = updateStableSignature(hash, frame.motor.breath.amplitude)
      hash = updateStableSignature(hash, frame.motor.breath.pace)
      hash = updateStableSignature(hash, frame.motor.facial.eyeOpenness)
      hash = updateStableSignature(hash, frame.motor.facial.browLift)
      hash = updateStableSignature(hash, frame.motor.facial.browTension)
      hash = updateStableSignature(hash, frame.motor.facial.cheekLift)
      hash = updateStableSignature(hash, frame.motor.facial.mouthSpread)
      hash = updateStableSignature(hash, frame.motor.facial.mouthRound)
      hash = updateStableSignature(hash, frame.motor.facial.jawOpenBias)
      hash = updateStableSignature(hash, frame.motor.body.sway)
      hash = updateStableSignature(hash, frame.motor.body.lean)
      hash = updateStableSignature(hash, frame.motor.body.openness)
      hash = updateStableSignature(hash, frame.motor.body.settle)
    })

    return finalizeStableSignature(hash)
  }

  function primeSpeechTimeline(rawTimeline: AlicizationDialogueSpeechTimeline | null | undefined) {
    const startedAt = performance.now()
    const timeline = normalizeAlicizationDialogueSpeechTimeline(rawTimeline)
    const signature = createTimelineSignature(timeline)
    if (signature === speechTimelineAlignment.signature) {
      logSpeechEmbodimentDebug('speech-timeline-prime-skipped', {
        variationToken: timeline?.variationToken ?? null,
        segments: timeline?.segments.length ?? 0,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      })
      return
    }

    speechTimelineAlignment.timeline = timeline
    speechTimelineAlignment.signature = signature
    speechTimelineAlignment.consumedOffset = resolveAlicizationDialogueSpeechTimelineConsumedOffset({
      timeline,
      consumedText: speechTimelineAlignment.consumedText,
    })
    logSpeechEmbodimentDebug('speech-timeline-primed', {
      variationToken: timeline?.variationToken ?? null,
      segments: timeline?.segments.length ?? 0,
      consumedOffset: speechTimelineAlignment.consumedOffset,
      signature,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      lastSegmentId: timeline?.segments.at(-1)?.id ?? null,
    })

    const frameBackedDigitalLife = buildDigitalLifeEnvelopeFromFrames({
      variationToken: timeline?.variationToken ?? '',
      emotion: timeline?.emotion,
      frames: [
        ...(digitalLifeFramesBySegmentId.size > 0
          ? digitalLifeFramesBySegmentId.values()
          : recentDigitalLifeFramesBySegmentId.values()),
      ],
    })
    const planDigitalLife = authoritativeDigitalLifeEnvelope
      && authoritativeDigitalLifeEnvelope.variationToken === (timeline?.variationToken ?? '')
      ? authoritativeDigitalLifeEnvelope
      : frameBackedDigitalLife

    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: timeline?.variationToken ?? 'speech-timeline',
      replyText: timeline?.reply ?? '',
      speechTimeline: timeline,
      digitalLife: planDigitalLife,
    })
    speechPlanAlignment.plan = plan
    speechPlanAlignment.signature = createSpeechPlanSignature(plan)
    speechPlanAlignment.consumedSegmentIndex = 0
  }

  function resetDigitalLifeEnvelope() {
    digitalLifeEnvelopeSignature = ''
    authoritativeDigitalLifeEnvelope = null
  }

  function clearDigitalLifeFramesCache() {
    digitalLifeFramesBySegmentId.clear()
    recentDigitalLifeFramesBySegmentId.clear()
  }

  function primeDigitalLifeEnvelope(rawDigitalLife: AlicizationDigitalLifeEnvelope | null | undefined) {
    const startedAt = performance.now()
    const envelope = normalizeAlicizationDigitalLifeEnvelope(rawDigitalLife)
    const signature = createDigitalLifeSignature(envelope)
    if (signature === digitalLifeEnvelopeSignature) {
      logSpeechEmbodimentDebug('digital-life-prime-skipped', {
        variationToken: envelope?.variationToken ?? null,
        mode: envelope?.mode ?? null,
        frames: envelope?.frames.length ?? 0,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      })
      return
    }

    digitalLifeEnvelopeSignature = signature
    authoritativeDigitalLifeEnvelope = envelope
    digitalLifeFramesBySegmentId.clear()
    if (envelope?.frames.length)
      recentDigitalLifeFramesBySegmentId.clear()
    envelope?.frames.forEach((frame) => {
      digitalLifeFramesBySegmentId.set(frame.id, frame)
      recentDigitalLifeFramesBySegmentId.set(frame.id, frame)
    })

    let replayProjection = false
    if (speechPlaybackState.value.item) {
      const currentItem = speechPlaybackState.value.item
      commitPlaybackState({
        item: shouldPreserveRestrainedRendererOnlyRejoinPlaybackItem(currentItem)
          ? {
              ...currentItem,
              metadata: cloneSpeechMetadata(currentItem.metadata),
              cue: currentItem.cue ? { ...currentItem.cue } : null,
            }
          : createStageEmbodimentSpeechPlaybackItem({
              intentId: currentItem.intentId,
              streamId: currentItem.streamId,
              segmentId: currentItem.segmentId,
              ownerId: currentItem.ownerId,
              text: currentItem.text,
              special: currentItem.special,
              continuityHoldMs: currentItem.continuityHoldMs,
              playbackDurationMs: currentItem.playbackDurationMs,
              metadata: currentItem.metadata,
              cue: currentItem.cue,
              digitalLifeFrame: resolveDigitalLifeFrame(currentItem, currentItem.cue) ?? currentItem.digitalLifeFrame,
            }),
      })
      replayProjection = true
    }

    if (queuedSpeechSegments.value.length > 0) {
      previewCueCache.clear()
      queuedSpeechSegments.value = queuedSpeechSegments.value.map((item) => {
        const nextItem = createStageEmbodimentSpeechPlaybackItem({
          intentId: item.intentId,
          streamId: item.streamId,
          segmentId: item.segmentId,
          ownerId: item.ownerId,
          text: item.text,
          special: item.special,
          continuityHoldMs: item.continuityHoldMs,
          playbackDurationMs: item.playbackDurationMs,
          metadata: item.metadata,
          cue: item.cue,
          digitalLifeFrame: resolveDigitalLifeFrame(item, item.cue) ?? item.digitalLifeFrame,
        })
        rememberPreviewCue(item.segmentId, nextItem.cue)
        return nextItem
      })
      replayProjection = true
    }

    if (replayProjection) {
      speechRenderRevision += 1
      syncSpeechRenderState(null)
    }

    logSpeechEmbodimentDebug('digital-life-primed', {
      variationToken: envelope?.variationToken ?? null,
      mode: envelope?.mode ?? null,
      frames: envelope?.frames.length ?? 0,
      signature,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      lastFrameId: envelope?.frames.at(-1)?.id ?? null,
      replayProjection,
    })
  }

  function resolveDigitalLifeFrame(
    descriptor: SpeechPlaybackDescriptor,
    cue: AlicizationDialogueSpeechTimelineSegment | null,
    resolveOptions?: {
      allowScriptSynthesis?: boolean
      preferDescriptorDigitalLifeFrame?: boolean
    },
  ) {
    const cueId = cue?.id?.trim()
    if (cueId) {
      const frame = digitalLifeFramesBySegmentId.get(cueId) ?? recentDigitalLifeFramesBySegmentId.get(cueId)
      if (frame)
        return frame
    }

    const segmentId = descriptor.segmentId?.trim()
    if (segmentId) {
      const frame = digitalLifeFramesBySegmentId.get(segmentId) ?? recentDigitalLifeFramesBySegmentId.get(segmentId)
      if (frame)
        return frame
    }

    const script = resolveEmbodimentScriptFromMetadata(descriptor.metadata)
    if (resolveOptions?.preferDescriptorDigitalLifeFrame && descriptor.digitalLifeFrame) {
      return normalizeRendererOnlyRejoinFrame({
        frame: descriptor.digitalLifeFrame,
        residentMode: script?.state.residentMode
          ?? resolveProjectClosureSpeechResidentModeFromMetadata(descriptor.metadata)
          ?? null,
      })
    }

    const authorityCue = resolveProjectedAuthorityCueFromMetadata({
      descriptor,
      cue,
    })
    if (resolveOptions?.allowScriptSynthesis && script && authorityCue) {
      const text = descriptor.text.trim()
      const startOffset = Number.isFinite(Number(authorityCue.startOffset))
        ? Math.max(0, Number(authorityCue.startOffset))
        : 0
      const endOffset = Number.isFinite(Number(authorityCue.endOffset))
        ? Math.max(startOffset, Number(authorityCue.endOffset))
        : startOffset + Math.max(1, Array.from(text).length)
      const residentMode = resolveEffectiveSpeechResidentMode({
        residentMode: script.state.residentMode,
        rendererHints: authorityCue.rendererHints ?? null,
      })
      const audibleSameHerPreviewRestraint = resolveAudibleSameHerPreviewRestraint(
        authorityCue.rendererHints ?? null,
      )
      const delivery = script.state.delivery ?? 'calm'
      const emphasis = script.state.emphasis ?? 0
      const facialCue = authorityCue.facialCue ?? null
      const actionCue = clampRestrainedPreviewActionCue(authorityCue.actionCue ?? null, residentMode)
      const emotion = resolveDigitalLifeEmotion({
        emotion: authorityCue.emotion,
        baseEmotion: authorityCue.emotion,
        fallback: script.state.baseEmotion,
      })
      const voice = {
        pitchDelta: 0,
        rateMultiplier: 1,
        energy: clampUnit(
          (0.36 + (authorityCue.prosodyWeight ?? 0) * 0.4)
          * (audibleSameHerPreviewRestraint?.voiceEnergyScale ?? 1),
          0.68,
        ),
        cadence: clampUnit(
          (0.32 + (authorityCue.beatWeight ?? 0) * 0.44)
          * (audibleSameHerPreviewRestraint?.voiceCadenceScale ?? 1),
          0.64,
        ),
      }
      const lipSync = {
        mode: text ? resolveDigitalLifeLipSyncMode(script.lipsyncPlan.mode) : 'closed' as const,
        visemeBias: clampUnit(
          (0.34 + (authorityCue.mouthWeight ?? authorityCue.facialWeight ?? 0) * 0.48)
          * (audibleSameHerPreviewRestraint?.lipSyncVisemeScale ?? 1),
          0.82,
        ),
        energyBias: clampUnit(
          (0.28 + (authorityCue.prosodyWeight ?? 0) * 0.42)
          * (audibleSameHerPreviewRestraint?.lipSyncEnergyScale ?? 1),
          0.76,
        ),
        mouthScale: Number(clampRange(
          (0.82 + (authorityCue.mouthWeight ?? 0) * 0.3)
          * (audibleSameHerPreviewRestraint?.mouthScale ?? 1),
          0.4,
          1.35,
        ).toFixed(2)),
        continuityHoldMs: Math.round(clampRange(
          authorityCue.emotionHoldMs ?? authorityCue.facialHoldMs ?? 180,
          60,
          480,
        )),
      }
      const face = {
        emotion,
        facialCue,
        expressionMode: residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
          ? 'hold' as const
          : 'blend' as const,
        intensity: clampUnit(
          (authorityCue.facialWeight ?? 0.42)
          * (audibleSameHerPreviewRestraint?.faceIntensityScale ?? 1),
          0.72,
        ),
        holdMs: Math.round(clampRange(authorityCue.facialHoldMs ?? authorityCue.emotionHoldMs ?? 220, 80, 960)),
        rendererHints: authorityCue.rendererHints ?? null,
      }
      const action = {
        actionCue,
        actionMode: actionCue
          ? residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
            ? 'hold' as const
            : 'pulse' as const
          : 'none' as const,
        intensity: actionCue
          ? clampUnit(
              (authorityCue.gestureWeight ?? 0.3)
              * (audibleSameHerPreviewRestraint?.actionIntensityScale ?? 1),
              0.62,
            )
          : 0,
        holdMs: Math.round(clampRange(authorityCue.actionHoldMs ?? 180, 70, 720)),
        rendererHints: authorityCue.rendererHints ?? null,
      }
      const motor = deriveAlicizationDigitalLifeMotorPlan({
        action,
        emotion,
        face,
        lipSync,
        digitalLifeSpine: null,
        performance: {
          baseEmotion: emotion,
          emotion,
          facialCue,
          actionCue,
          delivery,
          emphasis,
        },
        postureHint: authorityCue.emotion === 'thinking' ? 'inspection' : 'attentive',
        segmentWeights: {
          beat: authorityCue.beatWeight,
          facial: authorityCue.facialWeight,
          gesture: authorityCue.gestureWeight,
          head: authorityCue.headWeight,
          mouth: authorityCue.mouthWeight,
        },
        voice,
      })

      return normalizeRendererOnlyRejoinFrame({
        frame: {
          id: authorityCue.id?.trim() || segmentId || `script:${sanitizeSpineToken(descriptor.intentId ?? '', 48) || 'segment'}:${startOffset}`,
          index: Number.isFinite(Number(authorityCue.index)) ? Math.max(0, Number(authorityCue.index)) : 0,
          startOffset,
          endOffset,
          text,
          mode: resolveProjectedDigitalLifeMode({
            residentMode,
            emotion,
            text,
          }),
          interruptPolicy: authorityCue.interruptMode ?? 'continue',
          settleMode: authorityCue.settleMode
            ?? audibleSameHerPreviewRestraint?.settleMode
            ?? (residentMode === 'measured-return' ? 'linger' : residentMode === 'repair-before-closeness' ? 'hold' : 'release'),
          voice,
          lipSync,
          face,
          action,
          motor,
        } satisfies AlicizationDigitalLifeFrame,
        residentMode,
      })
    }

    const digest = options.digitalLifeSpineDigest?.value
    if (digest) {
      const text = descriptor.text.trim()
      const startOffset = Number.isFinite(Number(cue?.startOffset))
        ? Math.max(0, Number(cue?.startOffset))
        : 0
      const endOffset = Number.isFinite(Number(cue?.endOffset))
        ? Math.max(startOffset, Number(cue?.endOffset))
        : startOffset + Math.max(1, Array.from(text).length)
      const spineFallbackMode = resolveSpineFallbackMode(digest)
      const confidence = clampUnit(digest.proactive?.confidence ?? 0.62, 0.62)
      const emotion = authorityCue?.emotion
        ?? resolveSpineFallbackEmotion(digest, cue)
      const metadataClosureRendererHints = resolveProjectClosureRendererHintsFromMetadata(
        descriptor.metadata,
      )
      const effectiveRendererHints = authorityCue?.rendererHints
        ?? cue?.rendererHints
        ?? metadataClosureRendererHints
      const residentMode = resolveEmbodimentScriptFromMetadata(descriptor.metadata)?.state.residentMode
        ?? resolveRestrainedResidentModeFromRendererHints(metadataClosureRendererHints)
        ?? null
      const mode = residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
        ? resolveProjectedDigitalLifeMode({
            residentMode,
            emotion,
            text,
          })
        : spineFallbackMode
      const fallbackActionCue = authorityCue?.actionCue
        ?? cue?.actionCue
        ?? (
          residentMode === 'measured-return'
            ? null
            : resolveSpineFallbackActionCue(digest, cue)
        )
      const actionCue = clampRestrainedPreviewActionCue(
        fallbackActionCue,
        residentMode,
      )
      const voiceRestraint = resolveSpineFallbackVoiceRestraint(
        residentMode,
        effectiveRendererHints,
      )
      const facialCue = authorityCue?.facialCue
        ?? cue?.facialCue
        ?? (
          mode === 'recovering'
          || residentMode === 'measured-return'
          || residentMode === 'repair-before-closeness'
            ? 'soft-gaze'
            : 'focus'
        )
      const voice = {
        pitchDelta: Math.round(clampRange(
          (mode === 'recovering' ? -3 : mode === 'acting' ? 3 : 0)
          + voiceRestraint.pitchDeltaOffset,
          -12,
          12,
        )),
        rateMultiplier: Number(clampRange(
          (mode === 'recovering' ? 0.94 : mode === 'acting' ? 1.08 : 1)
          + voiceRestraint.rateMultiplierOffset,
          0.72,
          1.24,
        ).toFixed(2)),
        energy: clampUnit(
          0.42
          + confidence * 0.22
          + ((authorityCue?.prosodyWeight ?? cue?.prosodyWeight) ?? 0) * 0.18
          + voiceRestraint.energyOffset,
          0.58,
        ),
        cadence: clampUnit(
          0.38
          + confidence * 0.18
          + ((authorityCue?.beatWeight ?? cue?.beatWeight) ?? 0) * 0.22
          + voiceRestraint.cadenceOffset,
          0.54,
        ),
      }
      const lipSync = {
        mode: text ? 'hybrid' as const : 'closed' as const,
        visemeBias: clampUnit(0.5 + confidence * 0.18, 0.62),
        energyBias: clampUnit(0.32 + confidence * 0.22, 0.48),
        mouthScale: Number(clampRange(0.82 + confidence * 0.24 + ((authorityCue?.mouthWeight ?? cue?.mouthWeight) ?? 0) * 0.12, 0.4, 1.35).toFixed(2)),
        continuityHoldMs: Math.round(clampRange(authorityCue?.emotionHoldMs ?? authorityCue?.facialHoldMs ?? cue?.emotionHoldMs ?? cue?.facialHoldMs ?? 180, 60, 480)),
      }
      const face = {
        emotion,
        facialCue,
        expressionMode: mode === 'recovering'
          ? 'recover' as const
          : residentMode === 'measured-return' || residentMode === 'repair-before-closeness'
            ? 'hold' as const
            : 'blend' as const,
        intensity: clampUnit(
          residentMode === 'repair-before-closeness'
            ? 0.38 + confidence * 0.14 + ((authorityCue?.facialWeight ?? cue?.facialWeight) ?? 0) * 0.18
            : 0.46 + confidence * 0.18 + ((authorityCue?.facialWeight ?? cue?.facialWeight) ?? 0) * 0.22,
          0.62,
        ),
        holdMs: Math.round(clampRange(authorityCue?.facialHoldMs ?? cue?.facialHoldMs ?? 220, 80, 960)),
        rendererHints: effectiveRendererHints,
      }
      const action = {
        actionCue,
        actionMode: actionCue
          ? residentMode === 'repair-before-closeness'
            ? 'hold' as const
            : 'pulse' as const
          : 'none' as const,
        intensity: actionCue
          ? clampUnit(
              residentMode === 'repair-before-closeness'
                ? 0.18 + confidence * 0.12 + ((authorityCue?.gestureWeight ?? cue?.gestureWeight) ?? 0) * 0.18
                : 0.26 + confidence * 0.18 + ((authorityCue?.gestureWeight ?? cue?.gestureWeight) ?? 0) * 0.3,
              0.44,
            )
          : 0,
        holdMs: Math.round(clampRange(authorityCue?.actionHoldMs ?? cue?.actionHoldMs ?? 180, 70, 720)),
        rendererHints: effectiveRendererHints,
      }
      const motor = deriveAlicizationDigitalLifeMotorPlan({
        action,
        emotion,
        face,
        lipSync,
        digitalLifeSpine: digest,
        performance: {
          baseEmotion: emotion,
          emotion,
          facialCue,
          actionCue,
          delivery: mode === 'recovering' ? 'gentle' : mode === 'acting' ? 'firm' : 'calm',
          emphasis: mode === 'acting' ? 2 : 1,
        },
        postureHint: (authorityCue?.emotion ?? cue?.emotion) === 'thinking' ? 'inspection' : mode === 'recovering' ? 'concerned' : 'attentive',
        segmentWeights: {
          beat: authorityCue?.beatWeight ?? cue?.beatWeight,
          facial: authorityCue?.facialWeight ?? cue?.facialWeight,
          gesture: authorityCue?.gestureWeight ?? cue?.gestureWeight,
          head: authorityCue?.headWeight ?? cue?.headWeight,
          mouth: authorityCue?.mouthWeight ?? cue?.mouthWeight,
        },
        voice,
      })

      return {
        id: cue?.id?.trim()
          || segmentId
          || `spine:${sanitizeSpineToken(descriptor.intentId ?? '', 48) || 'segment'}:${startOffset}`,
        index: Number.isFinite(Number(cue?.index))
          ? Math.max(0, Number(cue?.index))
          : 0,
        startOffset,
        endOffset,
        text,
        mode,
        interruptPolicy: authorityCue?.interruptMode ?? cue?.interruptMode ?? 'continue',
        settleMode: authorityCue?.settleMode
          ?? cue?.settleMode
          ?? (
            mode === 'recovering'
              ? 'linger'
              : residentMode === 'measured-return'
                ? 'linger'
                : residentMode === 'repair-before-closeness'
                  ? 'hold'
                  : 'release'
          ),
        voice,
        lipSync,
        face,
        action,
        motor,
      } satisfies AlicizationDigitalLifeFrame
    }

    if (descriptor.digitalLifeFrame) {
      return normalizeRendererOnlyRejoinFrame({
        frame: descriptor.digitalLifeFrame,
        residentMode: script?.state.residentMode ?? null,
      })
    }

    return null
  }

  function isSamePlaybackItem(
    item: StageEmbodimentSpeechPlaybackState['item'],
    descriptor: SpeechPlaybackDescriptor,
  ) {
    if (!item)
      return false

    return item.intentId === (descriptor.intentId ?? null)
      && item.streamId === (descriptor.streamId ?? null)
      && item.segmentId === (descriptor.segmentId ?? null)
      && item.ownerId === (descriptor.ownerId ?? null)
      && item.text === descriptor.text
      && item.special === (descriptor.special ?? null)
      && item.continuityHoldMs === Math.round(Math.max(0, Number(descriptor.continuityHoldMs ?? 0)))
  }

  function projectPlaybackItem(
    descriptor: SpeechPlaybackDescriptor,
    options?: {
      alignTimeline?: boolean
      advanceTimeline?: boolean
      preferDescriptorCue?: boolean
      preferDescriptorDigitalLifeFrame?: boolean
      resolvedDigitalLifeFrame?: AlicizationDigitalLifeFrame | null
    },
  ) {
    const alignTimeline = options?.alignTimeline !== false
    const advanceTimeline = options?.advanceTimeline !== false
    const currentItem = speechPlaybackState.value.item
    const existingCue = isSamePlaybackItem(currentItem, descriptor)
      ? currentItem?.cue ?? null
      : null

    let cue = cloneSpeechTimelineCue(existingCue)
      ?? (options?.preferDescriptorCue ? cloneSpeechTimelineCue(descriptor.cue) : null)
      ?? resolvePreviewCue(descriptor.segmentId)
    let nextConsumedOffset = cue
      ? Math.max(speechTimelineAlignment.consumedOffset, cue.endOffset)
      : speechTimelineAlignment.consumedOffset
    if (!cue && alignTimeline && speechTimelineAlignment.timeline) {
      const aligned = alignAlicizationDialogueSpeechTimelineSegment({
        timeline: speechTimelineAlignment.timeline,
        consumedOffset: speechTimelineAlignment.consumedOffset,
        consumedText: speechTimelineAlignment.consumedText,
        segmentText: descriptor.text,
      })
      cue = cloneSpeechTimelineCue(aligned.segment)
      nextConsumedOffset = aligned.nextConsumedOffset
    }

    if (advanceTimeline)
      rememberSpokenText(descriptor.text, nextConsumedOffset)

    const digitalLifeFrame = options?.resolvedDigitalLifeFrame === undefined
      ? resolveDigitalLifeFrame(descriptor, cue, {
          allowScriptSynthesis: true,
          preferDescriptorDigitalLifeFrame: options?.preferDescriptorDigitalLifeFrame === true,
        })
      : options.resolvedDigitalLifeFrame
    const idleCuePhase = resolveSpeechMetadataIdleCuePhase(descriptor.metadata)
    const playbackPhase = idleCuePhase
      ? 'idle'
      : descriptor.playbackDurationMs == null && !advanceTimeline ? 'idle' : 'playing'
    const effectiveResidentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
      residentMode: resolveEmbodimentScriptFromMetadata(descriptor.metadata)?.state.residentMode ?? null,
      cue,
      digitalLifeFrame,
    })
    const suppressRendererOnlyRejoinBodyDriver = shouldSuppressRendererOnlyRejoinBodyDriverFromFrame({
      digitalLifeFrame,
      residentMode: effectiveResidentMode,
    })
    const enrichedMetadata = enrichSpeechMetadataWithDrivers({
      cue,
      digitalLifeFrame,
      idleCuePhase,
      metadata: descriptor.metadata,
      script: resolveEmbodimentScriptFromMetadata(descriptor.metadata),
      segmentId: descriptor.segmentId,
      playbackPhase,
      suppressBodyDriver: suppressRendererOnlyRejoinBodyDriver,
      special: descriptor.special,
      text: descriptor.text,
    })
    return createStageEmbodimentSpeechPlaybackItem({
      ...descriptor,
      continuityHoldMs: descriptor.continuityHoldMs,
      playbackDurationMs: descriptor.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
        text: descriptor.text,
        special: descriptor.special,
        metadata: enrichedMetadata,
        digitalLifeFrame,
      }),
      cue,
      digitalLifeFrame,
      metadata: enrichedMetadata,
    })
  }

  function resolvePreviewConsumedText(index: number) {
    return normalizeAlignmentText([
      speechTimelineAlignment.consumedText,
      ...queuedSpeechSegments.value
        .slice(0, Math.max(0, index))
        .map(item => item.text),
    ].filter(Boolean).join(' '))
  }

  function resolveActiveSpeechPlan(
    metadata: Record<string, unknown> | null | undefined,
  ) {
    return resolveEmbodimentScriptFromMetadata(metadata)?.speechPlan ?? speechPlanAlignment.plan
  }

  function resolveSpeechPlanSegment(input: {
    metadata: Record<string, unknown> | null | undefined
    segmentId: string | null | undefined
    text: string
    queueIndex?: number
  }) {
    const plan = resolveActiveSpeechPlan(input.metadata)
    if (!plan)
      return null

    if (input.segmentId) {
      const directMatch = plan.segments.find(segment => segment.id === input.segmentId)
      if (directMatch)
        return directMatch
    }

    if (typeof input.queueIndex === 'number') {
      const indexedMatch = plan.segments[input.queueIndex]
      if (indexedMatch)
        return indexedMatch
    }

    const normalizedText = normalizeAlignmentText(input.text)
    if (!normalizedText)
      return null

    return plan.segments.find(segment => normalizeAlignmentText(segment.text) === normalizedText) ?? null
  }

  function resolveSpeechPlanContinuityHoldMs(
    descriptor: SpeechPlaybackDescriptor,
    queueIndex?: number,
  ) {
    const script = resolveEmbodimentScriptFromMetadata(descriptor.metadata)
    const directSegmentId = descriptor.segmentId?.trim() || null
    const authoritySegmentId = script
      ? resolvePlaybackDriverSegmentId({
          cue: descriptor.cue ?? null,
          digitalLifeFrame: descriptor.digitalLifeFrame ?? null,
          metadata: descriptor.metadata,
          script,
          segmentId: descriptor.segmentId,
          text: descriptor.text,
        })
      : descriptor.digitalLifeFrame?.id?.trim()
        || descriptor.cue?.id?.trim()
        || directSegmentId

    const segment = resolveSpeechPlanSegment({
      metadata: descriptor.metadata,
      segmentId: authoritySegmentId ?? directSegmentId,
      text: descriptor.text,
      queueIndex,
    })

    return segment
      ? Math.max(descriptor.continuityHoldMs ?? 0, segment.settleMs)
      : descriptor.continuityHoldMs ?? null
  }

  function projectPreviewPlaybackItem(
    descriptor: SpeechPlaybackDescriptor,
    index: number,
  ) {
    const script = resolveEmbodimentScriptFromMetadata(descriptor.metadata)
    let cue = cloneSpeechTimelineCue(descriptor.cue)
    if (speechTimelineAlignment.timeline) {
      const previewConsumedText = resolvePreviewConsumedText(index)
      const previewConsumedOffset = resolveAlicizationDialogueSpeechTimelineConsumedOffset({
        timeline: speechTimelineAlignment.timeline,
        consumedText: previewConsumedText,
      })
      cue = alignAlicizationDialogueSpeechTimelineSegment({
        timeline: speechTimelineAlignment.timeline,
        consumedOffset: previewConsumedOffset,
        consumedText: previewConsumedText,
        segmentText: descriptor.text,
      }).segment
    }

    const digitalLifeFrame = resolveDescriptorScriptDigitalLifeFrame(descriptor, cue)
      ?? resolveDigitalLifeFrame(descriptor, cue, {
        allowScriptSynthesis: true,
        preferDescriptorDigitalLifeFrame: true,
      })
    const authorityCue = cue && digitalLifeFrame
      ? {
          ...cue,
          emotion: digitalLifeFrame.face.emotion,
          facialCue: digitalLifeFrame.face.facialCue,
          actionCue: digitalLifeFrame.action.actionCue,
          interruptMode: digitalLifeFrame.interruptPolicy,
          settleMode: digitalLifeFrame.settleMode,
          facialHoldMs: digitalLifeFrame.face.holdMs,
          actionHoldMs: digitalLifeFrame.action.holdMs,
          emotionHoldMs: Math.max(
            digitalLifeFrame.face.holdMs,
            digitalLifeFrame.lipSync.continuityHoldMs,
          ),
          rendererSettle: cue.rendererSettle
            ?? resolvePlaybackTelemetryCue({
              cue,
              digitalLifeFrame,
              metadata: descriptor.metadata,
              segmentId: descriptor.segmentId,
              special: descriptor.special,
              text: descriptor.text,
            })?.rendererSettle
            ?? null,
        }
      : cue
    const enrichedMetadata = enrichSpeechMetadataWithDrivers({
      cue: authorityCue,
      digitalLifeFrame,
      metadata: descriptor.metadata,
      script: resolveEmbodimentScriptFromMetadata(descriptor.metadata),
      segmentId: descriptor.segmentId,
      playbackPhase: 'idle',
      special: descriptor.special,
      text: descriptor.text,
    })
    const previewItem = createStageEmbodimentSpeechPlaybackItem({
      ...descriptor,
      continuityHoldMs: resolveSpeechPlanContinuityHoldMs(descriptor, index) ?? descriptor.continuityHoldMs,
      metadata: enrichedMetadata,
      playbackDurationMs: descriptor.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
        text: descriptor.text,
        special: descriptor.special,
        metadata: enrichedMetadata,
        digitalLifeFrame,
      }),
      cue: cloneSpeechTimelineCue(authorityCue),
      digitalLifeFrame,
    })
    const finalizedPreviewItem = {
      ...previewItem,
      cue: applyHesitantMeasuredReturnVrmPreviewCue({
        cue: previewItem.cue,
        script,
      }),
    }
    rememberPreviewCue(descriptor.segmentId, finalizedPreviewItem.cue)
    return finalizedPreviewItem
  }

  function previewSpeechSegment(descriptor: SpeechPlaybackDescriptor) {
    const text = descriptor.text.trim()
    if (!text) {
      discardPreviewSpeechSegment(descriptor.segmentId ?? null)
      return null
    }

    const existingIndex = descriptor.segmentId
      ? queuedSpeechSegments.value.findIndex(item => item.segmentId === descriptor.segmentId)
      : -1
    const targetIndex = existingIndex >= 0 ? existingIndex : queuedSpeechSegments.value.length
    const descriptorScriptDigitalLifeFrame = resolveDescriptorScriptDigitalLifeFrame(descriptor, descriptor.cue ?? null)
    const previewItem = projectPlaybackItem({
      ...descriptor,
      text,
      continuityHoldMs: resolveSpeechPlanContinuityHoldMs({
        ...descriptor,
        text,
      }, targetIndex) ?? descriptor.continuityHoldMs,
      digitalLifeFrame: descriptorScriptDigitalLifeFrame ?? descriptor.digitalLifeFrame,
    }, {
      advanceTimeline: false,
      alignTimeline: false,
      preferDescriptorDigitalLifeFrame: Boolean(descriptorScriptDigitalLifeFrame ?? descriptor.digitalLifeFrame),
      resolvedDigitalLifeFrame: descriptorScriptDigitalLifeFrame ?? undefined,
    })
    const alignedPreviewItem = projectPreviewPlaybackItem(previewItem, targetIndex)

    if (existingIndex >= 0) {
      queuedSpeechSegments.value = queuedSpeechSegments.value.map((item, index) => {
        return index === existingIndex ? alignedPreviewItem : item
      })
      logSpeechEmbodimentDebug('preview-segment-updated', {
        intentId: alignedPreviewItem.intentId,
        streamId: alignedPreviewItem.streamId,
        segmentId: alignedPreviewItem.segmentId,
        cueId: alignedPreviewItem.cue?.id ?? null,
        digitalLifeFrameId: alignedPreviewItem.digitalLifeFrame?.id ?? null,
        queueDepth: queuedSpeechSegments.value.length,
        text: alignedPreviewItem.text.slice(0, 96),
      })
      return alignedPreviewItem
    }

    queuedSpeechSegments.value = [
      ...queuedSpeechSegments.value,
      alignedPreviewItem,
    ]
    logSpeechEmbodimentDebug('preview-segment-enqueued', {
      intentId: alignedPreviewItem.intentId,
      streamId: alignedPreviewItem.streamId,
      segmentId: alignedPreviewItem.segmentId,
      cueId: alignedPreviewItem.cue?.id ?? null,
      digitalLifeFrameId: alignedPreviewItem.digitalLifeFrame?.id ?? null,
      queueDepth: queuedSpeechSegments.value.length,
      text: alignedPreviewItem.text.slice(0, 96),
    })
    return alignedPreviewItem
  }

  function stopSyntheticSpeechPlayback(reason: string | null, endedAt: number) {
    const currentItem = speechPlaybackState.value.item
    if (!currentItem || speechPlaybackState.value.currentAudioSource)
      return
    markPlaybackStop(currentItem, endedAt, reason)
  }

  function readSyntheticSpeechEnergy(now: number) {
    if (!syntheticSpeech.active)
      return null

    if (speechPlaybackState.value.phase !== 'playing' || speechPlaybackState.value.currentAudioSource) {
      syntheticSpeech = createIdleSyntheticSpeechState()
      return null
    }

    if (now >= syntheticSpeech.deadlineAt) {
      stopSyntheticSpeechPlayback('synthetic-segment-complete', now)
      syntheticSpeech = createIdleSyntheticSpeechState()
      return 0
    }

    const elapsed = Math.max(0, now - syntheticSpeech.startedAt)
    const remaining = Math.max(0, syntheticSpeech.deadlineAt - now)
    const attack = clampUnit(elapsed / 120)
    const release = clampUnit(remaining / 220)
    const envelope = Math.min(attack, release)
    const primaryWave = 0.5 + 0.5 * Math.sin((elapsed / 1000) * syntheticSpeech.cadenceHz * Math.PI * 2 + syntheticSpeech.phaseOffset)
    const secondaryWave = 0.5 + 0.5 * Math.sin((elapsed / 1000) * (syntheticSpeech.cadenceHz * 2.3) * Math.PI * 2 + syntheticSpeech.phaseOffset * 1.7)
    const pulse = clampUnit(primaryWave * 0.72 + secondaryWave * 0.28)

    return clampUnit(
      (syntheticSpeech.baselineEnergy + syntheticSpeech.amplitudeEnergy * pulse) * envelope,
    )
  }

  function readSpeechEnergy(now: number) {
    const syntheticEnergy = readSyntheticSpeechEnergy(now)
    if (syntheticEnergy != null)
      return syntheticEnergy

    const analyser = audioAnalyser.value
    if (!analyser)
      return 0

    analyserSamples ??= new Uint8Array(new ArrayBuffer(analyser.fftSize))
    analyser.getByteTimeDomainData(analyserSamples)

    let sum = 0
    for (let index = 0; index < analyserSamples.length; index += 1) {
      const normalized = (analyserSamples[index] - 128) / 128
      sum += normalized * normalized
    }

    return Math.max(0, Math.min(1, Math.sqrt(sum / analyserSamples.length) * 4.2))
  }

  function setEmbodimentMouthOpenSize(value: number, emit: boolean = true) {
    const nextValue = Math.max(0, Math.min(100, value))
    if (options.mouthOpenSize.value === nextValue && speechPlaybackState.value.mouthOpenSize === nextValue)
      return

    options.mouthOpenSize.value = nextValue
    commitPlaybackState({ mouthOpenSize: nextValue })
    syncSpeechRenderState(emit ? 'mouth-update' : speechRenderState.value.lastEventType)

    if (emit)
      emitPlaybackEvent('mouth-update')
  }

  function updateSpeechDynamics(now: number, speechEnergy: number) {
    const nextDynamics = deriveStageEmbodimentSpeechDynamicsState({
      phase: speechPlaybackState.value.phase,
      item: speechPlaybackState.value.item,
      mouthOpenSize: speechPlaybackState.value.mouthOpenSize,
      now,
      speechEnergy,
      startedAt: speechPlaybackState.value.startedAt,
      stylePitch: options.speechStylePitch?.value,
      styleRate: options.speechStyleRate?.value,
    })
    const previousDynamics = speechPlaybackState.value.dynamics
    const changed = previousDynamics.speechEnergy !== nextDynamics.speechEnergy
      || previousDynamics.prosodyIntensity !== nextDynamics.prosodyIntensity
      || previousDynamics.emphasisLevel !== nextDynamics.emphasisLevel
      || previousDynamics.cadencePulse !== nextDynamics.cadencePulse

    if (!changed)
      return

    commitPlaybackState({ dynamics: nextDynamics })
    syncSpeechRenderState('dynamics-update')
    emitPlaybackEvent('dynamics-update')
  }

  function resolvePlaybackMouthOpenSize(input: {
    now: number
    speechEnergy: number
  }) {
    if (speechPlaybackState.value.phase !== 'playing') {
      if (
        options.stageModelRenderer.value === 'live2d'
        && speechStopTailMouthOpen > 0
        && speechStopTailStartedAt != null
        && speechStopTailDurationMs > 0
      ) {
        const elapsed = Math.max(0, input.now - speechStopTailStartedAt)
        const progress = clampUnit(elapsed / speechStopTailDurationMs)
        const easedTail = speechStopTailMouthOpen * (1 - progress) ** 1.35
        const continuityFloor = speechStopTailMouthOpen * Math.max(0, 0.28 - progress * 0.18)
        return Math.max(0, Math.round(Math.max(easedTail, continuityFloor)))
      }

      return 0
    }

    const digitalLifeLipSync = speechPlaybackState.value.item?.digitalLifeFrame?.lipSync
    if (digitalLifeLipSync?.mode === 'closed')
      return 0

    const mouthScale = clampRange(digitalLifeLipSync?.mouthScale ?? 1, 0.4, 1.35)
    const jawOpenBias = clampUnit(speechPlaybackState.value.item?.digitalLifeFrame?.motor.facial.jawOpenBias ?? 0.26, 0.26)
    const jawScale = 0.84 + jawOpenBias * 0.36
    const dynamics = speechPlaybackState.value.dynamics
    const articulation = resolveProjectedSpeechArticulation(input.now, input.speechEnergy)
    const articulationClosure = clampUnit(Math.max(
      articulation.lipClosure,
      articulation.visemes.closed,
    ))
    const articulationOpenness = clampUnit(Math.max(
      articulation.openness,
      articulation.jawOpen * 0.86,
    ))
    const articulationDrivenOpen = articulation.active
      ? articulationOpenness
      * 100
      * mouthScale
      * (0.82 + articulation.jawOpen * 0.26)
      * jawScale
      * (1 - articulationClosure * 0.58)
      : 0
    const prosodyDrivenOpen = input.speechEnergy
      * (54 + dynamics.emphasisLevel * 28)
      * mouthScale
      * jawScale
    const cueDrivenOpen = clampUnit(
      speechPlaybackState.value.item?.cue?.mouthWeight
      ?? dynamics.prosodyIntensity,
      dynamics.prosodyIntensity,
    ) * (16 + dynamics.prosodyIntensity * 12)

    let live2dDrivenOpen = 0
    if (shouldRunLive2dLipSyncLoop({
      stageModelRenderer: options.stageModelRenderer.value,
      paused: options.paused.value,
    }) && live2dLipSync.value) {
      live2dDrivenOpen = live2dLipSync.value.getMouthOpen() * 100 * mouthScale * jawScale
    }

    const resolved = Math.min(100, Math.max(
      live2dDrivenOpen,
      prosodyDrivenOpen * 0.88,
      articulationDrivenOpen,
      cueDrivenOpen,
    ))

    if (
      live2dDrivenOpen < 2
      && Math.max(prosodyDrivenOpen, articulationDrivenOpen) >= 10
      && input.now - lastSpeechSignalsTraceAt >= 180
    ) {
      lastSpeechSignalsTraceAt = input.now
      logSpeechEmbodimentDebug('live2d-lipsync-fallback', {
        segmentId: speechPlaybackState.value.item?.segmentId ?? null,
        live2dDrivenOpen: Number(live2dDrivenOpen.toFixed(2)),
        prosodyDrivenOpen: Number(prosodyDrivenOpen.toFixed(2)),
        articulationDrivenOpen: Number(articulationDrivenOpen.toFixed(2)),
        articulationClosure: Number(articulationClosure.toFixed(2)),
        speechEnergy: Number(input.speechEnergy.toFixed(2)),
      })
    }

    return resolved
  }

  function clearCurrentAudioSource(source?: AudioNode) {
    if (source && currentAudioSource.value !== source)
      return

    currentAudioSource.value = undefined
    if (!speechPlaybackState.value.currentAudioSource)
      return

    commitPlaybackState({
      currentAudioSource: null,
    })
  }

  function markPlaybackStart(item: SpeechPlaybackDescriptor, startedAt: number) {
    clearSpeechStopLinger()
    syntheticSpeech = createIdleSyntheticSpeechState()
    lastSpeechSignalsTickAt = 0
    const previewSeed = item.segmentId
      ? queuedSpeechSegments.value.find(segment => segment.segmentId === item.segmentId) ?? null
      : null
    const continuityHoldMs = resolveSpeechPlanContinuityHoldMs(item)
    const projectedItem = projectPlaybackItem({
      ...item,
      cue: previewSeed?.cue ?? item.cue,
      continuityHoldMs,
      digitalLifeFrame: previewSeed?.digitalLifeFrame ?? item.digitalLifeFrame,
      metadata: item.metadata,
      playbackDurationMs: item.playbackDurationMs ?? previewSeed?.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
        text: item.text,
        special: item.special,
        metadata: item.metadata,
      }),
    }, {
      preferDescriptorCue: true,
      preferDescriptorDigitalLifeFrame: true,
      resolvedDigitalLifeFrame: previewSeed?.digitalLifeFrame,
    })
    clearUpcomingSpeechSegment(item.segmentId ?? null)
    beginSpeechArticulation(performance.now())
    const metadata = enrichSpeechMetadataWithDrivers({
      cue: projectedItem.cue,
      digitalLifeFrame: projectedItem.digitalLifeFrame,
      metadata: projectedItem.metadata,
      script: resolveEmbodimentScriptFromMetadata(projectedItem.metadata),
      segmentId: item.segmentId,
      playbackPhase: 'playing',
      special: item.special,
      text: item.text,
    })
    const playbackDurationMs = item.playbackDurationMs ?? previewSeed?.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
      text: item.text,
      special: item.special,
      metadata,
    })
    const previewSeedPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(previewSeed?.metadata)
    const projectedPlayback = resolveEmbodimentPlaybackMetadataFromMetadata(projectedItem.metadata)
    const effectiveResidentMode = resolveEffectiveSpeechResidentModeFromCueOrFrame({
      residentMode: resolveEmbodimentScriptFromMetadata(projectedItem.metadata)?.state.residentMode ?? null,
      cue: projectedItem.cue,
      digitalLifeFrame: projectedItem.digitalLifeFrame,
    })
    const shouldCreateRestrainedRendererOnlyRejoinStartItem = hasRestrainedRendererOnlyRejoinContinuity(previewSeedPlayback)
      || hasRestrainedRendererOnlyRejoinContinuity(projectedPlayback)
      || shouldSuppressRendererOnlyRejoinBodyDriver({
        digitalLifeFrame: projectedItem.digitalLifeFrame,
        metadata,
        residentMode: effectiveResidentMode,
      })
    const committedPlaybackItem = shouldCreateRestrainedRendererOnlyRejoinStartItem && projectedItem.digitalLifeFrame
      ? createRestrainedRendererOnlyRejoinStartItem({
          continuityHoldMs,
          cue: projectedItem.cue ?? null,
          digitalLifeFrame: projectedItem.digitalLifeFrame,
          item,
          metadata: previewSeedPlayback && hasRestrainedRendererOnlyRejoinContinuity(previewSeedPlayback)
            ? previewSeed?.metadata ?? metadata
            : metadata,
          playbackDurationMs,
        })
      : projectPlaybackItem({
          ...item,
          continuityHoldMs,
          cue: projectedItem.cue,
          digitalLifeFrame: projectedItem.digitalLifeFrame,
          metadata,
          playbackDurationMs,
        }, {
          preferDescriptorCue: true,
          preferDescriptorDigitalLifeFrame: true,
          resolvedDigitalLifeFrame: projectedItem.digitalLifeFrame,
        })
    const normalizedCommittedPlaybackItem = shouldPreserveRestrainedRendererOnlyRejoinPlaybackItem(committedPlaybackItem)
      ? enforceRestrainedRendererOnlyRejoinPlaybackMetadata({
          item: committedPlaybackItem,
        })
      : committedPlaybackItem
    commitPlaybackState({
      phase: 'playing',
      item: normalizedCommittedPlaybackItem,
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
      startedAt,
      endedAt: null,
      stopReason: null,
    })
    logSpeechEmbodimentDebug('playback-start', {
      intentId: item.intentId ?? null,
      streamId: item.streamId ?? null,
      segmentId: item.segmentId ?? null,
      playbackDurationMs: item.playbackDurationMs ?? null,
      text: item.text.slice(0, 96),
    })
    const segment = resolveSpeechPlanSegment({
      metadata: item.metadata,
      segmentId: item.segmentId,
      text: item.text,
    })
    if (segment)
      speechPlanAlignment.consumedSegmentIndex = Math.max(speechPlanAlignment.consumedSegmentIndex, segment.index + 1)
    emitPlaybackEvent('playback-start')
    startSpeechSignalsLoop()
  }

  function markPlaybackStop(item: SpeechPlaybackDescriptor, endedAt: number, stopReason: string | null) {
    syntheticSpeech = createIdleSyntheticSpeechState()
    stopSpeechSignalsLoop()
    clearCurrentAudioSource()
    const authoritativeSeed = speechPlaybackState.value.item
    const durableMeasuredReturnTail = (
      speechPlaybackState.value.item?.digitalLifeFrame
      && isDurableMeasuredReturnFrame(speechPlaybackState.value.item.digitalLifeFrame)
    ) || isDurableMeasuredReturnCue(speechPlaybackState.value.item?.cue)
    const repairBeforeClosenessTail = (
      speechPlaybackState.value.item?.digitalLifeFrame
      && isRepairBeforeClosenessFrame(speechPlaybackState.value.item.digitalLifeFrame)
    ) || isRepairBeforeClosenessCue(speechPlaybackState.value.item?.cue)
    const strongDurableMeasuredReturnTail = (
      speechPlaybackState.value.item?.digitalLifeFrame
      && isStrongDurableMeasuredReturnFrame(speechPlaybackState.value.item.digitalLifeFrame)
    ) || isStrongDurableMeasuredReturnCue(speechPlaybackState.value.item?.cue)
    const trailingMouthOpen = durableMeasuredReturnTail
      ? Math.max(
          strongDurableMeasuredReturnTail ? 6 : 4,
          Math.round(clampRange(
            speechPlaybackState.value.mouthOpenSize * (strongDurableMeasuredReturnTail ? 0.34 : 0.26),
            0,
            100,
          )),
        )
      : repairBeforeClosenessTail
        ? Math.max(
            5,
            Math.round(clampRange(
              speechPlaybackState.value.mouthOpenSize * 0.3,
              0,
              100,
            )),
          )
        : 0
    speechStopTailMouthOpen = trailingMouthOpen
    resetSpeechArticulation()
    setEmbodimentMouthOpenSize(trailingMouthOpen, false)
    const metadata = enrichSpeechMetadataWithReconciliation({
      actualDurationMs: speechPlaybackState.value.startedAt == null
        ? item.playbackDurationMs ?? 0
        : Math.max(0, endedAt - speechPlaybackState.value.startedAt),
      cue: speechPlaybackState.value.item?.cue ?? null,
      digitalLifeFrame: speechPlaybackState.value.item?.digitalLifeFrame ?? null,
      metadata: item.metadata,
      plannedDurationMs: item.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
        text: item.text,
        special: item.special,
        metadata: item.metadata,
      }),
      segmentId: item.segmentId,
      special: item.special,
      stopReason: stopReason ?? 'ended',
      text: item.text,
    })
    const playbackReconciliation = resolveEmbodimentPlaybackMetadataFromMetadata(metadata)
    const continuityHoldMs = Math.max(
      resolveSpeechPlanContinuityHoldMs(item) ?? 0,
      playbackReconciliation?.settleMs ?? 0,
    )
    const finalCue = authoritativeSeed?.cue ?? item.cue
    const preservedRendererOnlyRejoinFrame = resolveRendererOnlyRejoinStopFrame({
      cue: finalCue ?? null,
      digitalLifeFrame: authoritativeSeed?.digitalLifeFrame,
      metadata,
      segmentId: item.segmentId,
      text: item.text,
    })
    const finalMetadata = preservedRendererOnlyRejoinFrame
      ? applyRestrainedRendererOnlyRejoinPlaybackMetadata({
          metadata,
        })
      : metadata
    const finalDigitalLifeFrame = resolveDigitalLifeFrame({
      ...item,
      cue: finalCue ?? null,
      digitalLifeFrame: preservedRendererOnlyRejoinFrame ?? authoritativeSeed?.digitalLifeFrame ?? item.digitalLifeFrame,
      metadata: finalMetadata,
      continuityHoldMs,
      playbackDurationMs: item.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
        text: item.text,
        special: item.special,
        metadata: finalMetadata,
      }),
    }, finalCue ?? null, {
      allowScriptSynthesis: true,
      preferDescriptorDigitalLifeFrame: true,
    }) ?? preservedRendererOnlyRejoinFrame ?? authoritativeSeed?.digitalLifeFrame ?? item.digitalLifeFrame
    const finalPlaybackItem = preservedRendererOnlyRejoinFrame
      ? createRestrainedRendererOnlyRejoinStopItem({
          continuityHoldMs,
          cue: finalCue ?? null,
          digitalLifeFrame: preservedRendererOnlyRejoinFrame,
          item,
          metadata: finalMetadata,
        })
      : projectPlaybackItem({
          ...item,
          continuityHoldMs,
          cue: finalCue ?? null,
          digitalLifeFrame: finalDigitalLifeFrame,
          metadata: finalMetadata,
          playbackDurationMs: item.playbackDurationMs ?? estimateStageEmbodimentSpeechPlaybackDurationMs({
            text: item.text,
            special: item.special,
            metadata: finalMetadata,
          }),
        }, {
          advanceTimeline: false,
          preferDescriptorCue: true,
          preferDescriptorDigitalLifeFrame: true,
          resolvedDigitalLifeFrame: finalDigitalLifeFrame,
        })
    commitPlaybackState({
      phase: 'idle',
      item: finalPlaybackItem,
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
      endedAt,
      startedAt: speechPlaybackState.value.startedAt,
      stopReason,
    })
    logSpeechEmbodimentDebug('playback-stop', {
      intentId: item.intentId ?? null,
      streamId: item.streamId ?? null,
      segmentId: item.segmentId ?? null,
      driftMs: playbackReconciliation?.driftMs ?? null,
      settleMs: playbackReconciliation?.settleMs ?? null,
      stopReason,
      endedAt,
    })
    emitPlaybackEvent('playback-stop')
    scheduleSpeechStopLinger(item, stopReason)
  }

  function bindCurrentAudioSource(item: SpeechPlaybackDescriptor, source: AudioNode) {
    clearSpeechStopLinger()
    syntheticSpeech = createIdleSyntheticSpeechState()
    currentAudioSource.value = source
    const metadata = enrichSpeechMetadataWithDrivers({
      cue: speechPlaybackState.value.item?.cue ?? null,
      digitalLifeFrame: speechPlaybackState.value.item?.digitalLifeFrame ?? null,
      metadata: item.metadata,
      script: resolveEmbodimentScriptFromMetadata(item.metadata),
      segmentId: item.segmentId,
      playbackPhase: 'playing',
      special: item.special,
      text: item.text,
    })
    const currentPlaybackItem = speechPlaybackState.value.item
    const preserveRestrainedRendererOnlyRejoin = shouldPreserveRestrainedRendererOnlyRejoinPlaybackItem(currentPlaybackItem)
    commitPlaybackState({
      phase: 'playing',
      item: preserveRestrainedRendererOnlyRejoin && currentPlaybackItem
        ? {
            ...currentPlaybackItem,
            metadata: cloneSpeechMetadata(currentPlaybackItem.metadata),
            cue: currentPlaybackItem.cue ? { ...currentPlaybackItem.cue } : null,
          }
        : projectPlaybackItem({
            ...item,
            metadata,
            playbackDurationMs: item.playbackDurationMs,
          }, { advanceTimeline: false }),
      currentAudioSource: source,
    })
    logSpeechEmbodimentDebug('audio-source-bound', {
      intentId: item.intentId ?? null,
      streamId: item.streamId ?? null,
      segmentId: item.segmentId ?? null,
      playbackDurationMs: item.playbackDurationMs ?? null,
    })
    emitPlaybackEvent('audio-source-bound')
  }

  async function playAudioSource(
    item: Parameters<PlaybackManagerOptions<BrowserSpeechAudioSource>['play']>[0],
    signal: AbortSignal,
  ): Promise<void> {
    if (!item.audio)
      return

    if (options.audioContext.state === 'suspended') {
      try {
        await options.audioContext.resume()
      }
      catch {
        return
      }
    }

    let boundNode: AudioNode | undefined
    return playBrowserSpeechAudio({
      audio: item.audio,
      audioContext: options.audioContext,
      signal,
      analyserNode: audioAnalyser.value,
      observerNodes: [lipSyncNode.value],
      onAudioNodeBound(node) {
        boundNode = node
        bindCurrentAudioSource({
          ...item,
          metadata: item.metadata,
          playbackDurationMs: resolveBrowserSpeechAudioDurationMs(item.audio),
        }, node)
      },
    }).finally(() => {
      clearCurrentAudioSource(boundNode)
    })
  }

  function bindPlaybackManager(playbackManager: {
    onStart: (listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, startedAt: number }) => void) => void
    onEnd: (listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, endedAt: number }) => void) => void
    onInterrupt: (listener: (event: { item: PlaybackItem<BrowserSpeechAudioSource>, reason: string, interruptedAt: number }) => void) => void
  }) {
    playbackManager.onStart(({ item, startedAt }) => {
      markPlaybackStart({
        ...item,
        metadata: item.metadata,
        playbackDurationMs: resolveBrowserSpeechAudioDurationMs(item.audio),
      }, startedAt)
    })
    playbackManager.onEnd(({ item, endedAt }) => {
      markPlaybackStop({
        ...item,
        metadata: item.metadata,
        playbackDurationMs: resolveBrowserSpeechAudioDurationMs(item.audio),
      }, endedAt, null)
    })
    playbackManager.onInterrupt(({ item, interruptedAt, reason }) => {
      markPlaybackStop({
        ...item,
        metadata: item.metadata,
        playbackDurationMs: resolveBrowserSpeechAudioDurationMs(item.audio),
      }, interruptedAt, reason)
    })
  }

  function startSpeechSignalsLoop() {
    if (speechSignalsLoopId.value)
      return

    const tick = () => {
      if (speechPlaybackState.value.phase !== 'playing') {
        stopSpeechSignalsLoop()
        return
      }

      const now = performance.now()
      if (lastSpeechSignalsTickAt > 0 && now - lastSpeechSignalsTickAt >= 80) {
        logSpeechEmbodimentDebug('speech-loop-frame-gap', {
          dtMs: Math.round(now - lastSpeechSignalsTickAt),
          segmentId: speechPlaybackState.value.item?.segmentId ?? null,
        })
      }
      lastSpeechSignalsTickAt = now
      const speechEnergy = readSpeechEnergy(now)
      if (speechPlaybackState.value.phase !== 'playing') {
        stopSpeechSignalsLoop()
        return
      }
      setEmbodimentMouthOpenSize(resolvePlaybackMouthOpenSize({
        now,
        speechEnergy,
      }))
      updateSpeechDynamics(now, speechEnergy)

      speechSignalsLoopId.value = requestAnimationFrame(tick)
    }

    speechSignalsLoopId.value = requestAnimationFrame(tick)
  }

  function stopSpeechSignalsLoop() {
    if (speechSignalsLoopId.value) {
      cancelAnimationFrame(speechSignalsLoopId.value)
      speechSignalsLoopId.value = undefined
    }
    lastSpeechSignalsTickAt = 0
  }

  function resetLive2dLipSync() {
    try {
      lipSyncNode.value?.disconnect()
    }
    catch {}

    lipSyncNode.value = undefined
    live2dLipSync.value = undefined
    lipSyncStarted.value = false
  }

  function syncLive2dLipSyncLoop() {
    if (shouldRunLive2dLipSyncLoop({
      stageModelRenderer: options.stageModelRenderer.value,
      paused: options.paused.value,
    }) && lipSyncStarted.value) {
      return
    }

    if (speechPlaybackState.value.phase === 'playing') {
      const now = performance.now()
      const speechEnergy = readSpeechEnergy(now)
      setEmbodimentMouthOpenSize(resolvePlaybackMouthOpenSize({
        now,
        speechEnergy,
      }))
      updateSpeechDynamics(now, speechEnergy)
      return
    }

    setEmbodimentMouthOpenSize(speechStopTailMouthOpen, false)
  }

  async function setupLive2dLipSync(reason: string) {
    if (options.stageModelRenderer.value !== 'live2d') {
      resetLive2dLipSync()
      return
    }

    if (lipSyncStarted.value)
      return

    try {
      logSpeechEmbodimentDebug('lipsync-setup-start', {
        reason,
      })
      const lipSync = await createLive2DLipSync(
        options.audioContext,
        wlipsyncProfile as Profile,
        live2dLipSyncOptions,
      )
      if (!lipSync) {
        resetLive2dLipSync()
        logSpeechEmbodimentDebug('lipsync-setup-skipped', {
          reason,
          cause: 'driver-unavailable',
        })
        return
      }
      live2dLipSync.value = lipSync
      lipSyncNode.value = lipSync.node ?? undefined
      await options.audioContext.resume()
      lipSyncStarted.value = true
      logSpeechEmbodimentDebug('lipsync-setup-ready', {
        reason,
      })
      syncLive2dLipSyncLoop()
    }
    catch (error) {
      resetLive2dLipSync()
      console.error('Failed to setup Live2D lip sync', error)
    }
  }

  function prewarmLive2dLipSync(reason: string) {
    if (options.stageModelRenderer.value !== 'live2d') {
      resetLive2dLipSync()
      return Promise.resolve()
    }

    if (lipSyncStarted.value)
      return Promise.resolve()

    if (!setupLive2dLipSyncPromise) {
      setupLive2dLipSyncPromise = setupLive2dLipSync(reason).finally(() => {
        setupLive2dLipSyncPromise = null
      })
    }

    return setupLive2dLipSyncPromise
  }

  function clearScheduledLive2dLipSyncPrewarm() {
    if (!pendingLipSyncPrewarmTimer)
      return

    clearTimeout(pendingLipSyncPrewarmTimer)
    pendingLipSyncPrewarmTimer = undefined
  }

  function scheduleLive2dLipSyncPrewarm(reason: string) {
    clearScheduledLive2dLipSyncPrewarm()
    pendingLipSyncPrewarmTimer = setTimeout(() => {
      pendingLipSyncPrewarmTimer = undefined
      void prewarmLive2dLipSync(reason)
    }, 0)
  }

  function setupAnalyser() {
    if (!audioAnalyser.value) {
      audioAnalyser.value = options.audioContext.createAnalyser()
      audioAnalyser.value.fftSize = 2048
    }
  }

  async function prepareForNextMessage() {
    const startedAt = performance.now()
    clearSpeechStopLinger()
    clearUpcomingSpeechSegment()
    resetSpeechArticulation()
    resetSpeechTimelineAlignment()
    resetDigitalLifeEnvelope()
    setupAnalyser()
    clearScheduledLive2dLipSyncPrewarm()
    logSpeechEmbodimentDebug('prepare-next-message', {
      renderer: options.stageModelRenderer.value,
      lipSyncStarted: lipSyncStarted.value,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
    })
    scheduleLive2dLipSyncPrewarm('prepare-next-message')
  }

  function applySyntheticSpeechSegment(segment: TextSegment) {
    if (speechPlaybackState.value.currentAudioSource)
      return

    const text = segment.text.trim()
    if (!text)
      return

    const now = performance.now()
    const shape = deriveSyntheticSpeechShape(segment)
    const durationMs = estimateSyntheticSegmentDurationMs({
      text,
      reason: segment.reason,
      styleRate: options.speechStyleRate?.value,
    })
    const previousDeadline = syntheticSpeech.active
      ? Math.max(now, syntheticSpeech.deadlineAt)
      : now
    const startedAt = syntheticSpeech.active
      ? syntheticSpeech.startedAt
      : now
    const deadlineAt = previousDeadline + durationMs
    syntheticSpeech = {
      active: true,
      startedAt,
      deadlineAt,
      cadenceHz: clampRange((syntheticSpeech.active ? syntheticSpeech.cadenceHz : shape.cadenceHz) * 0.38 + shape.cadenceHz * 0.62, 1.7, 4.4),
      baselineEnergy: clampRange((syntheticSpeech.active ? syntheticSpeech.baselineEnergy : shape.baselineEnergy) * 0.42 + shape.baselineEnergy * 0.58, 0.12, 0.45),
      amplitudeEnergy: clampRange((syntheticSpeech.active ? syntheticSpeech.amplitudeEnergy : shape.amplitudeEnergy) * 0.35 + shape.amplitudeEnergy * 0.65, 0.28, 0.8),
      phaseOffset: syntheticSpeech.active ? syntheticSpeech.phaseOffset : Math.random() * Math.PI * 2,
    }

    const playbackMetadata = enrichSpeechMetadataWithDrivers({
      cue: null,
      digitalLifeFrame: null,
      metadata: cloneSpeechMetadata(segment.metadata),
      script: resolveEmbodimentScriptFromMetadata(segment.metadata),
      segmentId: segment.segmentId,
      playbackPhase: 'playing',
      special: segment.special,
      text,
    })
    const playbackItem = createStageEmbodimentSpeechPlaybackItem({
      streamId: segment.streamId,
      intentId: segment.intentId,
      segmentId: segment.segmentId,
      text,
      special: segment.special,
      continuityHoldMs: segment.continuityHoldMs,
      playbackDurationMs: durationMs,
      metadata: playbackMetadata,
      cue: null,
      digitalLifeFrame: resolveDigitalLifeFrame({
        streamId: segment.streamId,
        intentId: segment.intentId,
        segmentId: segment.segmentId,
        text,
        special: segment.special,
        continuityHoldMs: segment.continuityHoldMs,
        metadata: playbackMetadata,
        playbackDurationMs: durationMs,
      }, null),
    })
    if (speechPlaybackState.value.phase !== 'playing') {
      markPlaybackStart(playbackItem, now)
    }
    else {
      const projectedPlaybackItem = projectPlaybackItem(playbackItem)
      commitPlaybackState({
        phase: 'playing',
        item: projectedPlaybackItem,
        endedAt: null,
        stopReason: null,
      })
      emitPlaybackEvent('dynamics-update')
    }

    startSpeechSignalsLoop()
  }

  watch([options.stageModelRenderer, options.paused], ([renderer]) => {
    if (renderer !== 'live2d') {
      clearScheduledLive2dLipSyncPrewarm()
      resetLive2dLipSync()
      return
    }

    setupAnalyser()
    scheduleLive2dLipSyncPrewarm('renderer-watch')
    syncLive2dLipSyncLoop()
  }, { immediate: true })

  function dispose() {
    clearSpeechStopLinger()
    clearScheduledLive2dLipSyncPrewarm()
    clearUpcomingSpeechSegment()
    syntheticSpeech = createIdleSyntheticSpeechState()
    resetSpeechArticulation()
    resetSpeechTimelineAlignment()
    resetDigitalLifeEnvelope()
    listeners.clear()
    stopSpeechSignalsLoop()
    resetLive2dLipSync()
    clearCurrentAudioSource()
    clearDigitalLifeFramesCache()
    commitPlaybackState({
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
    })
    setEmbodimentMouthOpenSize(0, false)
    speechRenderRevision += 1
    syncSpeechRenderState(null)
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      dispose()
    })
  }

  return {
    audioAnalyser: readonly(audioAnalyser),
    bindPlaybackManager,
    currentAudioSource: computed(() => speechPlaybackState.value.currentAudioSource ?? undefined),
    dispose,
    discardPreviewSpeechSegment,
    nowSpeaking: computed(() => speechRenderState.value.active),
    onPlaybackEvent,
    playAudioSource,
    prepareForNextMessage,
    previewSpeechSegment,
    primeDigitalLifeEnvelope,
    primeSpeechTimeline,
    applySyntheticSpeechSegment,
    playbackTelemetry: computed(() => resolveEmbodimentPlaybackMetadataFromMetadata(resolveTelemetrySourceMetadata())),
    speechPlayback: readonly(speechPlaybackState),
    speechRenderState: readonly(speechRenderState),
    upcomingSpeechSegment: readonly(upcomingSpeechSegment),
  }
}

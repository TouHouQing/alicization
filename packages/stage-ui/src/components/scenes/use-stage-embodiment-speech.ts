import type { Live2DLipSync, Live2DLipSyncOptions } from '@proj-alicization/model-driver-lipsync'
import type { Profile } from '@proj-alicization/model-driver-lipsync/shared/wlipsync'
import type { PlaybackItem, PlaybackManagerOptions, TextSegment } from '@proj-alicization/pipelines-audio'
import type {
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueSpeechTimelineSegment,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeFrame,
  AlicizationDigitalLifeMode,
  AlicizationDigitalLifeSpineDigest,
  StageEmbodimentSpeechPlaybackEvent,
  StageEmbodimentSpeechPlaybackState,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type { BrowserSpeechAudioSource } from '../../libs/speech-audio-playback'
import type { StageModelRenderer } from '../../stores/settings'

import { createLive2DLipSync } from '@proj-alicization/model-driver-lipsync'
import { wlipsyncProfile } from '@proj-alicization/model-driver-lipsync/shared/wlipsync'
import {
  alignAlicizationDialogueSpeechTimelineSegment,
  createIdleStageEmbodimentSpeechDynamicsState,
  createIdleStageEmbodimentSpeechPlaybackState,
  createIdleStageEmbodimentSpeechRenderState,
  createStageEmbodimentSpeechPlaybackItem,
  deriveStageEmbodimentSpeechDynamicsState,
  deriveStageEmbodimentSpeechRenderState,
  normalizeAlicizationDialogueSpeechTimeline,
  normalizeAlicizationDigitalLifeEnvelope,
  resolveAlicizationDialogueSpeechTimelineConsumedOffset,
  resolveStageEmbodimentSpeechStopLingerMs,
} from '@proj-alicization/stage-shared'
import { computed, onUnmounted, readonly, ref, watch } from 'vue'

import { playBrowserSpeechAudio } from '../../libs/speech-audio-playback'
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
  continuityHoldMs?: number | null | undefined
}

interface SpeechTimelineAlignmentState {
  consumedOffset: number
  consumedText: string
  signature: string
  timeline: AlicizationDialogueSpeechTimeline | null
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

function cloneSpeechTimelineCue(
  cue: AlicizationDialogueSpeechTimelineSegment | null | undefined,
): AlicizationDialogueSpeechTimelineSegment | null {
  return cue
    ? {
        ...cue,
      }
    : null
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
  let digitalLifeEnvelope: AlicizationDigitalLifeEnvelope | null = null
  const digitalLifeFramesBySegmentId = new Map<string, AlicizationDigitalLifeFrame>()
  let speechStopLingerTimer: ReturnType<typeof setTimeout> | undefined
  const previewCueCache = new Map<string, AlicizationDialogueSpeechTimelineSegment>()

  function clearSpeechStopLinger() {
    if (!speechStopLingerTimer)
      return

    clearTimeout(speechStopLingerTimer)
    speechStopLingerTimer = undefined
  }

  function finalizeSpeechStopLinger() {
    speechStopLingerTimer = undefined
    speechRenderRevision += 1
    syncSpeechRenderState(null)
  }

  function scheduleSpeechStopLinger(item: SpeechPlaybackDescriptor, stopReason: string | null) {
    clearSpeechStopLinger()

    const lingerMs = resolveStageEmbodimentSpeechStopLingerMs({
      item: createStageEmbodimentSpeechPlaybackItem({
        ...item,
        continuityHoldMs: item.continuityHoldMs,
      }),
      stopReason,
    })

    if (lingerMs <= 0) {
      finalizeSpeechStopLinger()
      return
    }

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
            cue: speechPlaybackState.value.item.cue ? { ...speechPlaybackState.value.item.cue } : null,
          }
        : null,
    }
  }

  function emitPlaybackEvent(type: StageEmbodimentSpeechPlaybackEvent['type']) {
    speechRenderRevision += 1
    speechRenderState.value = deriveStageEmbodimentSpeechRenderState({
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
    speechRenderState.value = deriveStageEmbodimentSpeechRenderState({
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
    return JSON.stringify([
      timeline.version,
      timeline.variationToken,
      timeline.reply,
      timeline.segments.length,
    ])
  }

  function createDigitalLifeSignature(envelope: AlicizationDigitalLifeEnvelope | null) {
    if (!envelope)
      return ''

    return JSON.stringify([
      envelope.version,
      envelope.variationToken,
      envelope.mode,
      envelope.frames.length,
    ])
  }

  function primeSpeechTimeline(rawTimeline: AlicizationDialogueSpeechTimeline | null | undefined) {
    const timeline = normalizeAlicizationDialogueSpeechTimeline(rawTimeline)
    const signature = createTimelineSignature(timeline)
    if (signature === speechTimelineAlignment.signature)
      return

    speechTimelineAlignment.timeline = timeline
    speechTimelineAlignment.signature = signature
    speechTimelineAlignment.consumedOffset = resolveAlicizationDialogueSpeechTimelineConsumedOffset({
      timeline,
      consumedText: speechTimelineAlignment.consumedText,
    })
  }

  function resetDigitalLifeEnvelope() {
    digitalLifeEnvelope = null
    digitalLifeFramesBySegmentId.clear()
  }

  function primeDigitalLifeEnvelope(rawDigitalLife: AlicizationDigitalLifeEnvelope | null | undefined) {
    const envelope = normalizeAlicizationDigitalLifeEnvelope(rawDigitalLife)
    const signature = createDigitalLifeSignature(envelope)
    if (signature === createDigitalLifeSignature(digitalLifeEnvelope))
      return

    digitalLifeEnvelope = envelope
    digitalLifeFramesBySegmentId.clear()
    envelope?.frames.forEach((frame) => {
      digitalLifeFramesBySegmentId.set(frame.id, frame)
    })
  }

  function resolveDigitalLifeFrame(
    descriptor: SpeechPlaybackDescriptor,
    cue: AlicizationDialogueSpeechTimelineSegment | null,
  ) {
    const cueId = cue?.id?.trim()
    if (cueId) {
      const frame = digitalLifeFramesBySegmentId.get(cueId)
      if (frame)
        return frame
    }

    const segmentId = descriptor.segmentId?.trim()
    if (segmentId) {
      const frame = digitalLifeFramesBySegmentId.get(segmentId)
      if (frame)
        return frame
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
      const mode = resolveSpineFallbackMode(digest)
      const confidence = clampUnit(digest.proactive?.confidence ?? 0.62, 0.62)
      const emotion = resolveSpineFallbackEmotion(digest, cue)
      const actionCue = resolveSpineFallbackActionCue(digest, cue)
      const facialCue = cue?.facialCue
        ?? (mode === 'recovering' ? 'soft-gaze' : 'focus')

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
        interruptPolicy: cue?.interruptMode ?? 'continue',
        settleMode: cue?.settleMode ?? (mode === 'recovering' ? 'linger' : 'release'),
        voice: {
          pitchDelta: mode === 'recovering' ? -3 : mode === 'acting' ? 3 : 0,
          rateMultiplier: mode === 'recovering' ? 0.94 : mode === 'acting' ? 1.08 : 1,
          energy: clampUnit(0.42 + confidence * 0.22 + (cue?.prosodyWeight ?? 0) * 0.18, 0.58),
          cadence: clampUnit(0.38 + confidence * 0.18 + (cue?.beatWeight ?? 0) * 0.22, 0.54),
        },
        lipSync: {
          mode: text ? 'hybrid' as const : 'closed' as const,
          visemeBias: clampUnit(0.5 + confidence * 0.18, 0.62),
          energyBias: clampUnit(0.32 + confidence * 0.22, 0.48),
          mouthScale: Number(clampRange(0.82 + confidence * 0.24 + (cue?.mouthWeight ?? 0) * 0.12, 0.4, 1.35).toFixed(2)),
          continuityHoldMs: Math.round(clampRange(cue?.emotionHoldMs ?? cue?.facialHoldMs ?? 180, 60, 480)),
        },
        face: {
          emotion,
          facialCue,
          expressionMode: mode === 'recovering' ? 'recover' : 'blend',
          intensity: clampUnit(0.46 + confidence * 0.18 + (cue?.facialWeight ?? 0) * 0.22, 0.62),
          holdMs: Math.round(clampRange(cue?.facialHoldMs ?? 220, 80, 960)),
          rendererHints: cue?.rendererHints ?? null,
        },
        action: {
          actionCue,
          actionMode: actionCue ? 'pulse' : 'none',
          intensity: actionCue
            ? clampUnit(0.26 + confidence * 0.18 + (cue?.gestureWeight ?? 0) * 0.3, 0.44)
            : 0,
          holdMs: Math.round(clampRange(cue?.actionHoldMs ?? 180, 70, 720)),
          rendererHints: cue?.rendererHints ?? null,
        },
      } satisfies AlicizationDigitalLifeFrame
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
    },
  ) {
    const alignTimeline = options?.alignTimeline !== false
    const advanceTimeline = options?.advanceTimeline !== false
    const currentItem = speechPlaybackState.value.item
    const existingCue = isSamePlaybackItem(currentItem, descriptor)
      ? currentItem?.cue ?? null
      : null

    let cue = cloneSpeechTimelineCue(existingCue) ?? resolvePreviewCue(descriptor.segmentId)
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

    return createStageEmbodimentSpeechPlaybackItem({
      ...descriptor,
      continuityHoldMs: descriptor.continuityHoldMs,
      cue,
      digitalLifeFrame: resolveDigitalLifeFrame(descriptor, cue),
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

  function projectPreviewPlaybackItem(
    descriptor: SpeechPlaybackDescriptor,
    index: number,
  ) {
    let cue = null
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

    const previewItem = createStageEmbodimentSpeechPlaybackItem({
      ...descriptor,
      continuityHoldMs: descriptor.continuityHoldMs,
      cue: cloneSpeechTimelineCue(cue),
      digitalLifeFrame: resolveDigitalLifeFrame(descriptor, cue),
    })
    rememberPreviewCue(descriptor.segmentId, previewItem.cue)
    return previewItem
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
    const previewItem = projectPlaybackItem({
      ...descriptor,
      text,
    }, {
      advanceTimeline: false,
      alignTimeline: false,
    })
    const alignedPreviewItem = projectPreviewPlaybackItem(previewItem, targetIndex)

    if (existingIndex >= 0) {
      queuedSpeechSegments.value = queuedSpeechSegments.value.map((item, index) => {
        return index === existingIndex ? alignedPreviewItem : item
      })
      return alignedPreviewItem
    }

    queuedSpeechSegments.value = [
      ...queuedSpeechSegments.value,
      alignedPreviewItem,
    ]
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

  function resolvePlaybackMouthOpenSize(speechEnergy: number) {
    if (speechPlaybackState.value.phase !== 'playing')
      return 0

    const digitalLifeLipSync = speechPlaybackState.value.item?.digitalLifeFrame?.lipSync
    if (digitalLifeLipSync?.mode === 'closed')
      return 0

    const mouthScale = clampRange(digitalLifeLipSync?.mouthScale ?? 1, 0.4, 1.35)

    if (shouldRunLive2dLipSyncLoop({
      stageModelRenderer: options.stageModelRenderer.value,
      paused: options.paused.value,
    }) && live2dLipSync.value) {
      return Math.min(100, live2dLipSync.value.getMouthOpen() * mouthScale)
    }

    const emphasisLevel = speechPlaybackState.value.dynamics.emphasisLevel
    return Math.min(100, speechEnergy * (54 + emphasisLevel * 28) * mouthScale)
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
    clearUpcomingSpeechSegment(item.segmentId ?? null)
    commitPlaybackState({
      phase: 'playing',
      item: projectPlaybackItem(item),
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
      startedAt,
      endedAt: null,
      stopReason: null,
    })
    emitPlaybackEvent('playback-start')
    startSpeechSignalsLoop()
  }

  function markPlaybackStop(item: SpeechPlaybackDescriptor, endedAt: number, stopReason: string | null) {
    syntheticSpeech = createIdleSyntheticSpeechState()
    stopSpeechSignalsLoop()
    clearCurrentAudioSource()
    setEmbodimentMouthOpenSize(0, false)
    commitPlaybackState({
      phase: 'idle',
      item: projectPlaybackItem(item, { advanceTimeline: false }),
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
      endedAt,
      startedAt: speechPlaybackState.value.startedAt,
      stopReason,
    })
    emitPlaybackEvent('playback-stop')
    scheduleSpeechStopLinger(item, stopReason)
  }

  function bindCurrentAudioSource(item: SpeechPlaybackDescriptor, source: AudioNode) {
    clearSpeechStopLinger()
    syntheticSpeech = createIdleSyntheticSpeechState()
    currentAudioSource.value = source
    commitPlaybackState({
      phase: 'playing',
      item: projectPlaybackItem(item, { advanceTimeline: false }),
      currentAudioSource: source,
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
        bindCurrentAudioSource(item, node)
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
      markPlaybackStart(item, startedAt)
    })
    playbackManager.onEnd(({ item, endedAt }) => {
      markPlaybackStop(item, endedAt, null)
    })
    playbackManager.onInterrupt(({ item, interruptedAt, reason }) => {
      markPlaybackStop(item, interruptedAt, reason)
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
      const speechEnergy = readSpeechEnergy(now)
      if (speechPlaybackState.value.phase !== 'playing') {
        stopSpeechSignalsLoop()
        return
      }
      setEmbodimentMouthOpenSize(resolvePlaybackMouthOpenSize(speechEnergy))
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
      const speechEnergy = readSpeechEnergy(performance.now())
      setEmbodimentMouthOpenSize(resolvePlaybackMouthOpenSize(speechEnergy))
      updateSpeechDynamics(performance.now(), speechEnergy)
      return
    }

    setEmbodimentMouthOpenSize(0, false)
  }

  async function setupLive2dLipSync() {
    if (options.stageModelRenderer.value !== 'live2d') {
      resetLive2dLipSync()
      return
    }

    if (lipSyncStarted.value)
      return

    try {
      const lipSync = await createLive2DLipSync(
        options.audioContext,
        wlipsyncProfile as Profile,
        live2dLipSyncOptions,
      )
      live2dLipSync.value = lipSync
      lipSyncNode.value = lipSync.node
      await options.audioContext.resume()
      lipSyncStarted.value = true
      syncLive2dLipSyncLoop()
    }
    catch (error) {
      resetLive2dLipSync()
      console.error('Failed to setup Live2D lip sync', error)
    }
  }

  function setupAnalyser() {
    if (!audioAnalyser.value) {
      audioAnalyser.value = options.audioContext.createAnalyser()
      audioAnalyser.value.fftSize = 2048
    }
  }

  async function prepareForNextMessage() {
    clearSpeechStopLinger()
    clearUpcomingSpeechSegment()
    resetSpeechTimelineAlignment()
    resetDigitalLifeEnvelope()
    setupAnalyser()
    await setupLive2dLipSync()
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

    const playbackItem = createStageEmbodimentSpeechPlaybackItem({
      streamId: segment.streamId,
      intentId: segment.intentId,
      segmentId: segment.segmentId,
      text,
      special: segment.special,
      continuityHoldMs: segment.continuityHoldMs,
      cue: null,
      digitalLifeFrame: resolveDigitalLifeFrame({
        streamId: segment.streamId,
        intentId: segment.intentId,
        segmentId: segment.segmentId,
        text,
        special: segment.special,
        continuityHoldMs: segment.continuityHoldMs,
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
      resetLive2dLipSync()
      return
    }

    syncLive2dLipSyncLoop()
  }, { immediate: true })

  function dispose() {
    clearSpeechStopLinger()
    clearUpcomingSpeechSegment()
    syntheticSpeech = createIdleSyntheticSpeechState()
    resetSpeechTimelineAlignment()
    resetDigitalLifeEnvelope()
    listeners.clear()
    stopSpeechSignalsLoop()
    resetLive2dLipSync()
    clearCurrentAudioSource()
    commitPlaybackState({
      dynamics: createIdleStageEmbodimentSpeechDynamicsState(),
    })
    setEmbodimentMouthOpenSize(0, false)
    speechRenderRevision += 1
    syncSpeechRenderState(null)
  }

  onUnmounted(() => {
    dispose()
  })

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
    speechPlayback: readonly(speechPlaybackState),
    speechRenderState: readonly(speechRenderState),
    upcomingSpeechSegment: readonly(upcomingSpeechSegment),
  }
}

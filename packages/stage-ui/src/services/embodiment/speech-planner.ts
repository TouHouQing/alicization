import type {
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentSpeechPlan,
  AlicizationEmbodimentSpeechSegment,
  AlicizationSpeechProsodyIntent,
} from '@proj-alicization/stage-shared'

interface BuildAlicizationEmbodimentSpeechPlanInput {
  turnId: string
  replyText: string
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
}

function clampNonNegativeInteger(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(0, Math.round(value))
}

function clampUnit(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(0, Math.min(1, value))
}

function clampSignedUnit(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(-1, Math.min(1, value))
}

function roundProsodyUnit(value: number) {
  return Number(clampUnit(value).toFixed(2))
}

function roundTempoShift(value: number) {
  return Number(clampSignedUnit(value).toFixed(2))
}

const chineseCommaPunctuation = /[，,]$/
const chineseEnumerationPunctuation = /、$/
const chineseFullStopPunctuation = /[。.]$/
const chineseQuestionPunctuation = /[？?]$/
const chineseExclaimPunctuation = /[！!]$/
const chineseEllipsisPunctuation = /(?:…|⋯|\.{3})$/
const trailingPausePunctuation = /[，,、。．.？！!?…⋯]+$/u

function classifyPauseClass(text: string): AlicizationSpeechProsodyIntent['pauseClass'] {
  const trimmed = text.trim()
  if (!trimmed)
    return 'none'
  if (chineseEllipsisPunctuation.test(trimmed))
    return 'ellipsis'
  if (chineseQuestionPunctuation.test(trimmed))
    return 'question'
  if (chineseExclaimPunctuation.test(trimmed))
    return 'exclaim'
  if (chineseFullStopPunctuation.test(trimmed))
    return 'full-stop'
  if (chineseEnumerationPunctuation.test(trimmed))
    return 'enumeration'
  if (chineseCommaPunctuation.test(trimmed))
    return 'comma'
  return 'none'
}

function resolvePhraseBoundary(pauseClass: AlicizationSpeechProsodyIntent['pauseClass']): AlicizationSpeechProsodyIntent['phraseBoundary'] {
  switch (pauseClass) {
    case 'comma':
    case 'enumeration':
    case 'ellipsis':
      return 'soft'
    case 'full-stop':
    case 'question':
    case 'exclaim':
      return 'hard'
    case 'none':
    default:
      return 'none'
  }
}

function resolveContour(pauseClass: AlicizationSpeechProsodyIntent['pauseClass']): AlicizationSpeechProsodyIntent['contour'] {
  switch (pauseClass) {
    case 'question':
      return 'rising'
    case 'ellipsis':
      return 'dip-rise'
    case 'comma':
    case 'full-stop':
    case 'exclaim':
      return 'falling'
    case 'enumeration':
    case 'none':
    default:
      return 'flat'
  }
}

function extractEmphasisWord(text: string) {
  const trimmed = text
    .trim()
    .replace(trailingPausePunctuation, '')
    .trim()
  if (!trimmed)
    return null

  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
  const wordLikes = [...segmenter.segment(trimmed)]
    .filter(segment => segment.isWordLike)
    .map(segment => segment.segment.trim())
    .filter(Boolean)
  if (wordLikes.length > 0) {
    const recentWord = [...wordLikes]
      .reverse()
      .find(word => Array.from(word).length > 1)
    return recentWord ?? wordLikes.at(-1) ?? null
  }

  const characters = Array.from(trimmed)
  return characters.slice(Math.max(0, characters.length - 2)).join('') || null
}

function deriveSegmentProsody(input: {
  text: string
  prosodyWeight?: number
  beatWeight?: number
}): AlicizationSpeechProsodyIntent {
  const pauseClass = classifyPauseClass(input.text)
  const phraseBoundary = resolvePhraseBoundary(pauseClass)
  const contour = resolveContour(pauseClass)
  const emphasisStrength = roundProsodyUnit(
    0.18
    + clampUnit(input.prosodyWeight ?? 0.5, 0.5) * 0.5
    + clampUnit(input.beatWeight ?? 0.4, 0.4) * 0.16,
  )

  let tempoShift = (clampUnit(input.prosodyWeight ?? 0.5, 0.5) - 0.5) * 0.12
  if (pauseClass === 'comma' || pauseClass === 'enumeration' || pauseClass === 'full-stop' || pauseClass === 'ellipsis')
    tempoShift -= 0.08
  else if (pauseClass === 'question')
    tempoShift += 0.04
  else if (pauseClass === 'exclaim')
    tempoShift += 0.02

  return {
    language: 'zh-CN',
    pauseClass,
    phraseBoundary,
    contour,
    emphasisWord: extractEmphasisWord(input.text),
    emphasisStrength,
    tempoShift: roundTempoShift(tempoShift),
  }
}

function createNeutralFallbackProsody(text: string): AlicizationSpeechProsodyIntent {
  return {
    language: 'zh-CN',
    pauseClass: 'none',
    phraseBoundary: 'none',
    contour: 'flat',
    emphasisWord: extractEmphasisWord(text),
    emphasisStrength: 0.49,
    tempoShift: 0,
  }
}

function applyResidentProsodyBias(input: {
  frame: AlicizationDigitalLifeEnvelope['frames'][number] | null
  prosody: AlicizationSpeechProsodyIntent
  segment: AlicizationDialogueSpeechTimeline['segments'][number]
}) {
  const residentMode = input.segment.rendererHints?.residentMode
    ?? input.frame?.face.rendererHints?.residentMode
    ?? input.frame?.action.rendererHints?.residentMode
    ?? null
  const preferredBlinkCadence = input.segment.rendererHints?.preferredBlinkCadence
    ?? input.frame?.face.rendererHints?.preferredBlinkCadence
    ?? input.frame?.action.rendererHints?.preferredBlinkCadence
    ?? null
  const preferredGazeMode = input.segment.rendererHints?.preferredGazeMode
    ?? input.frame?.face.rendererHints?.preferredGazeMode
    ?? input.frame?.action.rendererHints?.preferredGazeMode
    ?? null
  const preferredPauseMode = input.segment.rendererHints?.preferredPauseMode
    ?? input.frame?.face.rendererHints?.preferredPauseMode
    ?? input.frame?.action.rendererHints?.preferredPauseMode
    ?? null
  const preferredVoiceMode = input.segment.rendererHints?.preferredVoiceMode
    ?? input.frame?.face.rendererHints?.preferredVoiceMode
    ?? input.frame?.action.rendererHints?.preferredVoiceMode
    ?? null
  const preferredPacingMode = input.segment.rendererHints?.preferredPacingMode
    ?? input.frame?.face.rendererHints?.preferredPacingMode
    ?? input.frame?.action.rendererHints?.preferredPacingMode
    ?? null

  const isMeasuredReturn = residentMode === 'measured-return'
  const isRepairBeforeCloseness = residentMode === 'repair-before-closeness'
  const isQuietCompanionship = residentMode === 'quiet-companionship'
    || residentMode === 'quiet-accompaniment'
  const isSameThreadContinuation = residentMode === 'same-thread-continuation'
  const hasSofteningWindow = (
    preferredBlinkCadence === 'linger'
    || preferredBlinkCadence === 'quiet'
    || preferredGazeMode === 'soften'
    || preferredGazeMode === 'steady'
  )
  const isSofterResidentReturn = hasSofteningWindow && (
    isMeasuredReturn
    || isRepairBeforeCloseness
    || isQuietCompanionship
    || isSameThreadContinuation
  )

  if (!isSofterResidentReturn)
    return input.prosody

  const voiceModeEmphasisBias = preferredVoiceMode === 'lower-pressure'
    ? 0.94
    : preferredVoiceMode === 'even'
      ? 0.98
      : 1
  const pacingModeEmphasisBias = preferredPacingMode === 'slower'
    ? 0.96
    : preferredPacingMode === 'natural'
      ? 0.99
      : 1
  const voiceModeTempoBias = preferredVoiceMode === 'lower-pressure'
    ? 0.03
    : preferredVoiceMode === 'even'
      ? 0.01
      : 0
  const pacingModeTempoBias = preferredPacingMode === 'slower'
    ? 0.04
    : preferredPacingMode === 'natural'
      ? 0.01
      : 0

  return {
    ...input.prosody,
    emphasisStrength: roundProsodyUnit(
      input.prosody.emphasisStrength
      * (isRepairBeforeCloseness
        ? 0.84
        : isMeasuredReturn
          ? 0.9
          : isQuietCompanionship
            ? 0.94
            : isSameThreadContinuation ? 0.92 : 0.9)
          * voiceModeEmphasisBias
          * pacingModeEmphasisBias,
    ),
    tempoShift: roundTempoShift(
      input.prosody.tempoShift
      - (isRepairBeforeCloseness
        ? 0.06
        : isMeasuredReturn
          ? 0.04
          : isQuietCompanionship
            ? 0.02
            : isSameThreadContinuation ? 0.03 : 0.04)
          - (preferredPauseMode === 'longer' ? 0.04 : 0)
          - voiceModeTempoBias
          - pacingModeTempoBias,
    ),
  }
}

function resolveInterruptPolicy(
  interruptMode: AlicizationDialogueSpeechTimeline['segments'][number]['interruptMode'] | undefined,
): AlicizationEmbodimentSpeechSegment['interruptPolicy'] {
  return interruptMode === 'continue' || interruptMode === 'soft-interrupt'
    ? 'soft-settle'
    : 'hard-stop'
}

function resolveSegmentSettleMs(input: {
  timelineSettleMs: number
  frameSettleMs: number
  candidateHoldMs: number
  candidateSettleMode: AlicizationDialogueSpeechTimeline['segments'][number]['settleMode'] | undefined
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPacingMode?: 'slower' | 'natural' | null
}) {
  const baseSettleMs = Math.max(
    input.timelineSettleMs,
    input.frameSettleMs,
    input.candidateHoldMs,
    120,
  )
  const preferredPauseModeExtra = input.preferredPauseMode === 'longer' ? 36 : 0
  const preferredVoiceModeExtra = input.preferredVoiceMode === 'lower-pressure'
    ? 14
    : input.preferredVoiceMode === 'even'
      ? 6
      : 0
  const preferredPacingModeExtra = input.preferredPacingMode === 'slower'
    ? 16
    : input.preferredPacingMode === 'natural'
      ? 8
      : 0

  switch (input.candidateSettleMode) {
    case 'hold':
      return clampNonNegativeInteger(
        baseSettleMs + 40 + preferredPauseModeExtra + preferredVoiceModeExtra + preferredPacingModeExtra,
        160,
      )
    case 'linger':
      return clampNonNegativeInteger(
        baseSettleMs + 120 + preferredPauseModeExtra + preferredVoiceModeExtra + preferredPacingModeExtra,
        220,
      )
    case 'release':
    default:
      return clampNonNegativeInteger(
        baseSettleMs + preferredPauseModeExtra + preferredVoiceModeExtra + preferredPacingModeExtra,
        140,
      )
  }
}

function buildSpeechPlanSegment(input: {
  segment: AlicizationDialogueSpeechTimeline['segments'][number]
  frame: AlicizationDigitalLifeEnvelope['frames'][number] | null
  timelineSettleMs: number
}) {
  const interruptPolicy = resolveInterruptPolicy(input.segment.interruptMode)
  const candidateHoldMs = Math.max(
    input.segment.actionHoldMs ?? 0,
    input.segment.emotionHoldMs ?? 0,
    input.segment.facialHoldMs ?? 0,
  )
  const frameSettleMs = Math.max(
    input.frame?.lipSync.continuityHoldMs ?? 0,
    input.frame?.face.holdMs ?? 0,
    input.frame?.action.holdMs ?? 0,
  )
  const preferredPauseMode = input.segment.rendererHints?.preferredPauseMode
    ?? input.frame?.face.rendererHints?.preferredPauseMode
    ?? input.frame?.action.rendererHints?.preferredPauseMode
    ?? null
  const preferredVoiceMode = input.segment.rendererHints?.preferredVoiceMode
    ?? input.frame?.face.rendererHints?.preferredVoiceMode
    ?? input.frame?.action.rendererHints?.preferredVoiceMode
    ?? null
  const preferredPacingMode = input.segment.rendererHints?.preferredPacingMode
    ?? input.frame?.face.rendererHints?.preferredPacingMode
    ?? input.frame?.action.rendererHints?.preferredPacingMode
    ?? null

  return {
    id: input.segment.id,
    index: input.segment.index,
    text: input.segment.text,
    interruptPolicy,
    prosody: applyResidentProsodyBias({
      frame: input.frame,
      segment: input.segment,
      prosody: deriveSegmentProsody({
        text: input.segment.text,
        prosodyWeight: input.segment.prosodyWeight,
        beatWeight: input.segment.beatWeight,
      }),
    }),
    preRollMs: clampNonNegativeInteger(
      input.segment.actionWindow === 'segment-start'
        ? 40
        : input.segment.actionWindow === 'cadence-peak'
          ? 20
          : 0,
    ),
    rendererSettle: input.segment.rendererSettle ?? null,
    rendererHints: input.segment.rendererHints ?? null,
    settleMs: resolveSegmentSettleMs({
      timelineSettleMs: input.timelineSettleMs,
      frameSettleMs,
      candidateHoldMs,
      candidateSettleMode: input.segment.settleMode,
      preferredPauseMode,
      preferredVoiceMode,
      preferredPacingMode,
    }),
  } satisfies AlicizationEmbodimentSpeechSegment
}

export function buildAlicizationEmbodimentSpeechPlan(
  input: BuildAlicizationEmbodimentSpeechPlanInput,
): AlicizationEmbodimentSpeechPlan {
  const fallbackText = input.replyText.trim() || input.speechTimeline?.reply.trim() || input.turnId
  const timelineSegments = input.speechTimeline?.segments ?? []
  const frameById = new Map((input.digitalLife?.frames ?? []).map(frame => [frame.id, frame] as const))
  const timelineSettleMs = Math.max(
    input.digitalLife?.frames.reduce((max, frame) => {
      return Math.max(max, frame.lipSync.continuityHoldMs, frame.face.holdMs, frame.action.holdMs)
    }, 0) ?? 0,
    160,
  )

  const segments = timelineSegments.length > 0
    ? timelineSegments.map(segment => buildSpeechPlanSegment({
        segment,
        frame: frameById.get(segment.id) ?? null,
        timelineSettleMs,
      }))
    : [{
      id: `${input.turnId}-segment-0`,
      index: 0,
      text: fallbackText,
      interruptPolicy: 'hard-stop',
      prosody: createNeutralFallbackProsody(fallbackText),
      preRollMs: 0,
      settleMs: timelineSettleMs,
    } satisfies AlicizationEmbodimentSpeechSegment]

  const interruptPolicy = segments.some(segment => segment.interruptPolicy === 'hard-stop')
    ? 'hard-stop'
    : 'soft-settle'
  const preRollMs = segments.reduce((max, segment) => Math.max(max, segment.preRollMs), 0)
  const settleMs = segments.reduce((max, segment) => Math.max(max, segment.settleMs), timelineSettleMs)

  return {
    segments,
    interruptPolicy,
    preRollMs,
    settleMs,
  }
}

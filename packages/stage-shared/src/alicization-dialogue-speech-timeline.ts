import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueEmbodimentRendererHints,
} from './alicization-dialogue-embodiment'
import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
  CharacterPerformanceCapabilitiesManifest,
} from './alicization-performance-contracts'
import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'

import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from './alicization-performance-contracts'
import {
  resolveStageEmbodimentCueCandidates,
  resolveStageEmbodimentLive2DExpressionAliases,
  resolveStageEmbodimentLive2DMotionAliases,
  resolveStageEmbodimentVrmBaseExpressionCandidates,
} from './stage-embodiment-profile'

export type AlicizationDialogueSpeechActionWindow = 'none' | 'segment-start' | 'cadence-peak'
export type AlicizationDialogueSpeechInterruptMode = 'continue' | 'soft-interrupt' | 'hard-interrupt'
export type AlicizationDialogueSpeechSettleMode = 'release' | 'hold' | 'linger'

export interface AlicizationDialogueSpeechRendererSettleHints {
  live2dFacialReleaseMs?: number
  live2dMotionFollowThroughMs?: number
  vrmActionFadeMs?: number
  vrmExpressionBlendMs?: number
}

export interface AlicizationDialogueSpeechTimelineSegment {
  id: string
  index: number
  startOffset: number
  endOffset: number
  text: string
  emotion?: AlicizationEmotion
  gestureWeight: number
  facialWeight: number
  prosodyWeight: number
  beatWeight: number
  mouthWeight?: number
  headWeight?: number
  personaStyleSummary?: string | null
  facialHoldMs?: number
  actionHoldMs?: number
  emotionHoldMs?: number
  settleMode?: AlicizationDialogueSpeechSettleMode
  rendererSettle?: AlicizationDialogueSpeechRendererSettleHints | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  actionCue: string | null
  facialCue: string | null
  actionWindow: AlicizationDialogueSpeechActionWindow
  interruptMode: AlicizationDialogueSpeechInterruptMode
}

export interface AlicizationDialogueSpeechTimeline {
  version: 'speech-timeline-v1'
  variationToken: string | null
  reply: string
  emotion: AlicizationEmotion
  segments: AlicizationDialogueSpeechTimelineSegment[]
}

export interface BuildAlicizationDialogueSpeechTimelineInput {
  reply: string
  candidateEmotion?: string | null
  candidatePerformance?: AlicizationDialoguePerformancePayload | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}

interface StringChunk {
  text: string
}

interface PersonaSpeechTimingBias {
  observeFirst: boolean
  directReconnect: boolean
}

interface PersonaSpeechStyleBias {
  gesture: number
  prosody: number
  beat: number
  mouth: number
  head: number
}

interface ProjectClosureSpeechEmbodimentBias {
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet'
  preferredGazeMode?: 'steady' | 'soften' | 'drift'
  preferredPauseMode?: 'longer' | 'natural'
  preferredLipsyncMode?: 'restrained' | 'matched'
  preferredVoiceMode?: 'lower-pressure' | 'even'
  preferredPacingMode?: 'slower' | 'natural'
  residentMode?: string
}

const keptPunctuations = new Set(['?', '？', '!', '！'])
const hardPunctuations = new Set(['.', '。', '?', '？', '!', '！', '…', '⋯', '～', '~', '\n', '\t', '\r'])
const softPunctuations = new Set([',', '，', '、', '–', '—', ':', '：', ';', '；', '《', '》', '「', '」'])

function clamp01(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number, fallback: number = min) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function dedupeCuePool(values: Array<string | null | undefined>) {
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (typeof value !== 'string')
      continue

    const normalized = value.trim()
    if (!normalized || seen.has(normalized))
      continue

    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

function filterCompanionshipResidentModeAliases(input: {
  aliases: string[]
  kind: 'expression' | 'motion'
  residentMode: unknown
}) {
  if (
    input.residentMode !== 'measured-return'
    && input.residentMode !== 'repair-before-closeness'
    && input.residentMode !== 'quiet-companionship'
  ) {
    return input.aliases
  }

  const warmExpressionPattern = /smile|joy|cheer|bright|grin|happy/iu
  const warmMotionPattern = /happy|joy|cheer|smile|wave|excited|raise|sway_relaxed/iu

  return input.aliases.filter((alias) => {
    if (typeof alias !== 'string')
      return false
    if (input.kind === 'expression')
      return !warmExpressionPattern.test(alias)
    return !warmMotionPattern.test(alias)
  })
}

function normalizeRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return dedupeCuePool(raw.map((value) => {
    return typeof value === 'string' ? value : null
  }))
}

function normalizeRendererHintReasonTags(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return dedupeCuePool(raw.map((value) => {
    return typeof value === 'string' ? value : null
  }))
}

function normalizeSegmentRendererHints(raw: unknown): AlicizationDialogueEmbodimentRendererHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const preferredExpressionAliases = normalizeRendererHintAliases(candidate.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRendererHintAliases(candidate.preferredMotionAliases)
  const reasonTags = normalizeRendererHintReasonTags(candidate.reasonTags)
  const preferredGazeMode = candidate.preferredGazeMode === 'steady'
    || candidate.preferredGazeMode === 'soften'
    || candidate.preferredGazeMode === 'drift'
    ? candidate.preferredGazeMode
    : undefined
  const preferredBlinkCadence = candidate.preferredBlinkCadence === 'normal'
    || candidate.preferredBlinkCadence === 'linger'
    || candidate.preferredBlinkCadence === 'quiet'
    ? candidate.preferredBlinkCadence
    : undefined
  const preferredPauseMode = candidate.preferredPauseMode === 'longer'
    || candidate.preferredPauseMode === 'natural'
    ? candidate.preferredPauseMode
    : undefined
  const preferredLipsyncMode = candidate.preferredLipsyncMode === 'restrained'
    || candidate.preferredLipsyncMode === 'matched'
    ? candidate.preferredLipsyncMode
    : undefined
  const preferredVoiceMode = candidate.preferredVoiceMode === 'lower-pressure'
    || candidate.preferredVoiceMode === 'even'
    ? candidate.preferredVoiceMode
    : undefined
  const preferredPacingMode = candidate.preferredPacingMode === 'slower'
    || candidate.preferredPacingMode === 'natural'
    ? candidate.preferredPacingMode
    : undefined
  const residentMode = typeof candidate.residentMode === 'string' && candidate.residentMode.trim()
    ? candidate.residentMode.trim()
    : undefined
  const signature = typeof candidate.signature === 'string' && candidate.signature.trim()
    ? candidate.signature.trim()
    : undefined
  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
    && !preferredGazeMode
    && !preferredBlinkCadence
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
    && !residentMode
    && reasonTags.length === 0
    && !signature
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredGazeMode,
    preferredLipsyncMode,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    preferredPacingMode,
    preferredPauseMode,
    preferredVoiceMode,
    residentMode,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    signature,
  }
}

function normalizeRendererSettleHints(raw: unknown): AlicizationDialogueSpeechRendererSettleHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const live2dFacialReleaseMs = Math.round(clampRange(
    Number(candidate.live2dFacialReleaseMs),
    80,
    1600,
    320,
  ))
  const vrmExpressionBlendMs = Math.round(clampRange(
    Number(candidate.vrmExpressionBlendMs),
    60,
    960,
    240,
  ))
  const vrmActionFadeMs = Math.round(clampRange(
    Number(candidate.vrmActionFadeMs),
    80,
    1200,
    220,
  ))
  const live2dMotionFollowThroughMs = Math.round(clampRange(
    Number(candidate.live2dMotionFollowThroughMs),
    0,
    1200,
    220,
  ))

  return {
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  }
}

function normalizeVariationToken(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim().slice(0, 256)
  return normalized || null
}

function normalizeAlignmentText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function hashStableSeed(text: string) {
  let hash = 0
  for (let index = 0; index < text.length; index += 1)
    hash = (hash * 33 + text.charCodeAt(index)) >>> 0
  return hash
}

function countPattern(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

function countWordLikes(text: string) {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
  const words = [...segmenter.segment(text)].filter(word => word.isWordLike).length
  if (words > 0)
    return words

  const compact = normalizeAlignmentText(text).replace(/\s+/g, '')
  if (!compact)
    return 0

  return Math.max(1, Math.ceil(Array.from(compact).length / 2))
}

function splitReplyIntoSpeechChunks(reply: string) {
  const normalizedReply = normalizeAlignmentText(reply)
  if (!normalizedReply)
    return [] as StringChunk[]

  const chunks: StringChunk[] = []
  const minimumWords = 4
  const maximumWords = 12
  const boost = 2

  let yieldCount = 0
  let buffer = ''
  let chunk = ''
  let chunkWordsCount = 0
  let previousValue: string | undefined

  const values = Array.from(normalizedReply)

  function flushChunk(text: string) {
    const normalized = normalizeAlignmentText(text)
    if (!normalized)
      return

    chunks.push({ text: normalized })
    chunk = ''
    chunkWordsCount = 0
    yieldCount += 1
  }

  for (let index = 0; index < values.length; index += 1) {
    let value = values[index] ?? ''
    const hard = hardPunctuations.has(value)
    const soft = softPunctuations.has(value)

    if (hard || soft) {
      if (value === '.' || value === ',') {
        const nextValue = values[index + 1]
        if (previousValue && /\d/.test(previousValue) && nextValue && /\d/.test(nextValue)) {
          buffer += value
          previousValue = value
          continue
        }
        if (value === '.' && values[index + 1] === '.' && values[index + 2] === '.') {
          value = '…'
          index += 2
        }
      }

      if (!buffer) {
        previousValue = value
        continue
      }

      const words = countWordLikes(buffer)
      if (chunkWordsCount > minimumWords && chunkWordsCount + words > maximumWords) {
        flushChunk(keptPunctuations.has(value) ? `${chunk.trim()}${value}` : chunk.trim())
      }

      chunk += `${buffer}${value}`
      chunkWordsCount += words
      buffer = ''

      if (hard || chunkWordsCount > maximumWords || yieldCount < boost)
        flushChunk(chunk)

      previousValue = value
      continue
    }

    buffer += value
    previousValue = value
  }

  if (chunk || buffer)
    flushChunk(`${chunk}${buffer}`)

  return chunks
}

function resolveDeliveryIntensity(delivery: AlicizationPerformanceDelivery) {
  switch (delivery) {
    case 'energetic':
      return { gesture: 0.82, facial: 0.76, prosody: 0.84, beat: 0.82 }
    case 'firm':
      return { gesture: 0.74, facial: 0.68, prosody: 0.72, beat: 0.76 }
    case 'gentle':
      return { gesture: 0.5, facial: 0.72, prosody: 0.6, beat: 0.48 }
    case 'hesitant':
      return { gesture: 0.42, facial: 0.56, prosody: 0.52, beat: 0.44 }
    case 'teasing':
      return { gesture: 0.66, facial: 0.78, prosody: 0.74, beat: 0.68 }
    case 'calm':
    default:
      return { gesture: 0.56, facial: 0.62, prosody: 0.58, beat: 0.52 }
  }
}

function resolveEmotionFacialBias(emotion: AlicizationEmotion) {
  switch (emotion) {
    case 'happy':
    case 'surprised':
      return 0.16
    case 'concerned':
    case 'apologetic':
      return 0.12
    case 'thinking':
      return 0.08
    case 'angry':
      return 0.1
    case 'sad':
    case 'tired':
      return -0.04
    case 'neutral':
    default:
      return 0
  }
}

function resolveEmotionMouthBias(emotion: AlicizationEmotion) {
  switch (emotion) {
    case 'happy':
    case 'surprised':
      return 0.08
    case 'angry':
      return 0.05
    case 'thinking':
      return -0.02
    case 'sad':
    case 'tired':
      return -0.08
    case 'concerned':
    case 'apologetic':
      return -0.05
    case 'neutral':
    default:
      return 0
  }
}

function resolveDeliveryMotionBias(delivery: AlicizationPerformanceDelivery) {
  switch (delivery) {
    case 'energetic':
      return 0.1
    case 'firm':
      return 0.08
    case 'teasing':
      return 0.05
    case 'gentle':
      return -0.02
    case 'hesitant':
      return -0.06
    case 'calm':
    default:
      return 0
  }
}

function resolveSegmentExcitation(text: string) {
  const normalized = normalizeAlignmentText(text)
  if (!normalized)
    return 0

  const uppercaseLetters = countPattern(normalized, /[A-Z]/g)
  const latinLetters = countPattern(normalized, /[A-Z]/gi)
  const uppercaseRatio = latinLetters > 0 ? uppercaseLetters / latinLetters : 0

  return clamp01(
    countPattern(normalized, /[!！]/g) * 0.26
    + countPattern(normalized, /[?？]/g) * 0.18
    + countPattern(normalized, /…|\.{3,}/g) * 0.1
    + countPattern(normalized, /[~～]/g) * 0.08
    + uppercaseRatio * 0.24,
  )
}

function resolveManifestEmotionHints(
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null | undefined,
  emotion: AlicizationEmotion,
) {
  const hints = performanceManifest?.embodimentHints?.[emotion]
  if (!hints || typeof hints !== 'object')
    return null

  return hints
}

function resolvePersonaSpeechTimingBias(digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null): PersonaSpeechTimingBias {
  const personaBias = digitalLifeSpine?.proactive?.personaBias ?? null
  return {
    observeFirst: personaBias?.initiativeStyle === 'observant'
      || personaBias?.silenceReconnect === 'hold'
      || personaBias?.preferredProactiveStyle === 'silent-observe',
    directReconnect: personaBias?.initiativeStyle === 'high-participation'
      || personaBias?.silenceReconnect === 'direct-approach',
  }
}

function resolvePersonaSpeechStyleBias(personaBias: PersonaSpeechTimingBias): PersonaSpeechStyleBias {
  if (personaBias.observeFirst) {
    return {
      gesture: -0.05,
      prosody: -0.07,
      beat: -0.06,
      mouth: -0.04,
      head: 0.08,
    }
  }

  if (personaBias.directReconnect) {
    return {
      gesture: 0.04,
      prosody: 0.07,
      beat: 0.07,
      mouth: 0.05,
      head: -0.05,
    }
  }

  return {
    gesture: 0,
    prosody: 0,
    beat: 0,
    mouth: 0,
    head: 0,
  }
}

function resolvePersonaSpeechStyleSummary(personaBias: PersonaSpeechTimingBias, styleBias: PersonaSpeechStyleBias) {
  if (personaBias.observeFirst) {
    return `observe-first | prosody=${styleBias.prosody.toFixed(2)} beat=${styleBias.beat.toFixed(2)} mouth=${styleBias.mouth.toFixed(2)} head=+${styleBias.head.toFixed(2)}`
  }

  if (personaBias.directReconnect) {
    return `direct-reconnect | prosody=+${styleBias.prosody.toFixed(2)} beat=+${styleBias.beat.toFixed(2)} mouth=+${styleBias.mouth.toFixed(2)} head=${styleBias.head.toFixed(2)}`
  }

  return null
}

export function resolveProjectClosureSpeechEmbodimentBias(
  projectState?: AlicizationRuntimeProjectStateDigest | null,
): ProjectClosureSpeechEmbodimentBias | null {
  const continuityCadence = typeof projectState?.continuityCadence === 'string'
    ? projectState.continuityCadence.trim().toLowerCase()
    : ''
  const explicitResidentMode = continuityCadence === 'repair-before-closeness'
    ? 'repair-before-closeness'
    : continuityCadence === 'measured-return'
      ? 'measured-return'
      : continuityCadence === 'rest-protective'
        ? 'quiet-companionship'
        : undefined
  const explicitBlinkCadence = projectState?.preferredBlinkCadence === 'normal'
    || projectState?.preferredBlinkCadence === 'linger'
    || projectState?.preferredBlinkCadence === 'quiet'
    ? projectState.preferredBlinkCadence
    : undefined
  const explicitGazeMode = projectState?.preferredGazeMode === 'steady'
    || projectState?.preferredGazeMode === 'soften'
    || projectState?.preferredGazeMode === 'drift'
    ? projectState.preferredGazeMode
    : undefined
  const explicitPauseMode = projectState?.preferredPauseMode === 'longer'
    || projectState?.preferredPauseMode === 'natural'
    ? projectState.preferredPauseMode
    : undefined
  const explicitLipsyncMode = projectState?.preferredLipsyncMode === 'restrained'
    || projectState?.preferredLipsyncMode === 'matched'
    ? projectState.preferredLipsyncMode
    : undefined
  const explicitVoiceMode = projectState?.preferredVoiceMode === 'lower-pressure'
    || projectState?.preferredVoiceMode === 'even'
    ? projectState.preferredVoiceMode
    : undefined
  const explicitPacingMode = projectState?.preferredPacingMode === 'slower'
    || projectState?.preferredPacingMode === 'natural'
    ? projectState.preferredPacingMode
    : undefined
  const residentMode = explicitResidentMode
  const fallbackBlinkCadence = residentMode === 'repair-before-closeness'
    ? 'quiet'
    : residentMode === 'measured-return' || residentMode === 'quiet-companionship'
      ? 'linger'
      : undefined
  const fallbackGazeMode = residentMode === 'repair-before-closeness'
    || residentMode === 'measured-return'
    || residentMode === 'quiet-companionship'
    ? 'soften'
    : undefined
  const preferredBlinkCadence = explicitBlinkCadence ?? fallbackBlinkCadence
  const preferredGazeMode = explicitGazeMode ?? fallbackGazeMode
  const preferredPauseMode = explicitPauseMode
  const preferredLipsyncMode = explicitLipsyncMode

  if (
    !residentMode
    && !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !explicitVoiceMode
    && !explicitPacingMode
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode: explicitVoiceMode,
    preferredPacingMode: explicitPacingMode,
    residentMode,
  }
}

function resolveSegmentEmotion(input: {
  delivery: AlicizationPerformanceDelivery
  text: string
  turnEmotion: AlicizationEmotion
}) {
  const text = normalizeAlignmentText(input.text)
  if (!text)
    return input.turnEmotion

  const normalizedText = text.toLowerCase()
  const apologySignal = /抱歉|对不起|不好意思|sorry|apolog/i.test(text)
  const careSignal = /别急|慢慢|休息|没关系|小心|注意|care|rest|take it easy/i.test(text)
  const questionSignal = /[?？]/.test(text)
    || /吗|呢|要不要|是否|怎么|why|how|what|should we|do you/i.test(normalizedText)
  const directiveSignal = /必须|马上|立刻|现在就|stop|must|need to|don't|do not/i.test(normalizedText)
  const strongExcitation = countPattern(text, /[!！]/g) >= 2
    || /太好了|真棒|awesome|great|wow|amazing/i.test(normalizedText)

  if (apologySignal)
    return 'apologetic'
  if (careSignal)
    return 'concerned'
  if (questionSignal) {
    if (input.turnEmotion === 'concerned' || input.turnEmotion === 'apologetic')
      return 'concerned'
    return 'thinking'
  }
  if (directiveSignal && (input.turnEmotion === 'angry' || input.delivery === 'firm'))
    return 'angry'
  if (strongExcitation) {
    if (input.turnEmotion === 'happy')
      return 'happy'
    if (input.turnEmotion === 'surprised')
      return 'surprised'
    if (input.delivery === 'energetic')
      return 'happy'
  }

  return input.turnEmotion
}

function resolveSegmentRendererHints(input: {
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  projectState?: AlicizationRuntimeProjectStateDigest | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  segmentEmotion: AlicizationEmotion
  turnEmotion: AlicizationEmotion
}) {
  const manifestHints = resolveManifestEmotionHints(input.performanceManifest, input.segmentEmotion)
  const useTurnEnvelopeAliases = input.segmentEmotion === input.turnEmotion
  const projectClosureBias = resolveProjectClosureSpeechEmbodimentBias(input.projectState)
  const envelopeRendererHints = normalizeSegmentRendererHints(input.embodiment?.rendererHints)
  const residentMode = envelopeRendererHints?.residentMode ?? projectClosureBias?.residentMode ?? null
  const companionshipExpressionAliases = residentMode === 'repair-before-closeness'
    ? ['RecoverSoft']
    : residentMode === 'measured-return'
      ? ['CalmInspect']
      : residentMode === 'quiet-companionship'
        ? ['ObserveSoft']
        : []
  const companionshipMotionAliases = residentMode === 'repair-before-closeness'
    ? ['StillnessGuard']
    : residentMode === 'measured-return'
      ? ['ObserveSoft']
      : residentMode === 'quiet-companionship'
        ? ['StillnessGuard']
        : []
  const preferredBlinkCadence = projectClosureBias?.preferredBlinkCadence === 'quiet'
    ? 'quiet'
    : envelopeRendererHints?.preferredBlinkCadence ?? projectClosureBias?.preferredBlinkCadence
  const preferredGazeMode = envelopeRendererHints?.preferredGazeMode ?? projectClosureBias?.preferredGazeMode
  const preferredPauseMode = envelopeRendererHints?.preferredPauseMode ?? projectClosureBias?.preferredPauseMode
  const preferredLipsyncMode = envelopeRendererHints?.preferredLipsyncMode ?? projectClosureBias?.preferredLipsyncMode
  const preferredVoiceMode = envelopeRendererHints?.preferredVoiceMode ?? projectClosureBias?.preferredVoiceMode
  const preferredPacingMode = envelopeRendererHints?.preferredPacingMode ?? projectClosureBias?.preferredPacingMode
  const preferredExpressionAliases = filterCompanionshipResidentModeAliases({
    aliases: dedupeCuePool([
      ...(useTurnEnvelopeAliases ? envelopeRendererHints?.preferredExpressionAliases ?? [] : []),
      ...companionshipExpressionAliases,
      ...(manifestHints?.preferredExpressionAliases ?? []),
      ...resolveStageEmbodimentLive2DExpressionAliases(input.segmentEmotion),
      ...resolveStageEmbodimentVrmBaseExpressionCandidates(input.segmentEmotion),
    ]),
    kind: 'expression',
    residentMode,
  })
  const preferredMotionAliases = filterCompanionshipResidentModeAliases({
    aliases: dedupeCuePool([
      ...(useTurnEnvelopeAliases ? envelopeRendererHints?.preferredMotionAliases ?? [] : []),
      ...companionshipMotionAliases,
      ...(manifestHints?.preferredMotionAliases ?? []),
      ...resolveStageEmbodimentLive2DMotionAliases(input.segmentEmotion),
    ]),
    kind: 'motion',
    residentMode,
  })
  if (preferredExpressionAliases.length === 0 && preferredMotionAliases.length === 0) {
    return residentMode
      || preferredBlinkCadence
      || preferredGazeMode
      || preferredPauseMode
      || preferredLipsyncMode
      || preferredVoiceMode
      || preferredPacingMode
      ? {
        preferredBlinkCadence,
        preferredGazeMode,
        preferredPauseMode,
        preferredLipsyncMode,
        preferredVoiceMode,
        preferredPacingMode,
        residentMode: typeof residentMode === 'string' ? residentMode : undefined,
      } satisfies AlicizationDialogueEmbodimentRendererHints
      : null
  }

  return {
    preferredBlinkCadence,
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    residentMode: typeof residentMode === 'string' ? residentMode : undefined,
  } satisfies AlicizationDialogueEmbodimentRendererHints
}

function resolveSegmentCueCandidates(input: {
  delivery: AlicizationPerformanceDelivery
  emotion: AlicizationEmotion
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}) {
  const profileCueCandidates = resolveStageEmbodimentCueCandidates({
    delivery: input.delivery,
    emotion: input.emotion,
  })
  const manifestHints = resolveManifestEmotionHints(input.performanceManifest, input.emotion)

  return {
    facialCueCandidates: dedupeCuePool([
      ...(manifestHints?.preferredFacialCues ?? []),
      ...profileCueCandidates.facialCueCandidates,
    ]),
    actionCueCandidates: dedupeCuePool([
      ...(manifestHints?.preferredActionCues ?? []),
      ...profileCueCandidates.actionCueCandidates,
    ]),
  }
}

function resolveSegmentPhraseTailWeight(input: {
  segmentCount: number
  segmentIndex: number
  text: string
}) {
  const text = normalizeAlignmentText(input.text)
  const exclamation = countPattern(text, /[!！]/g)
  const question = countPattern(text, /[?？]/g)
  const ellipsis = countPattern(text, /[…~～]|\.{3,}/g)
  const commas = countPattern(text, /[,，、;；:：]/g)
  const terminal = input.segmentIndex === input.segmentCount - 1 ? 0.16 : 0

  return clamp01(
    exclamation * 0.24
    + question * 0.18
    + ellipsis * 0.22
    + commas * 0.08
    + terminal,
  )
}

function resolveSegmentMicroDynamics(input: {
  beatWeight: number
  delivery: AlicizationPerformanceDelivery
  emotion: AlicizationEmotion
  facialWeight: number
  gestureWeight: number
  personaStyleBias: PersonaSpeechStyleBias
  prosodyWeight: number
  segmentCount: number
  segmentIndex: number
  text: string
}) {
  const phraseTailWeight = resolveSegmentPhraseTailWeight({
    segmentCount: input.segmentCount,
    segmentIndex: input.segmentIndex,
    text: input.text,
  })
  const mouthWeight = clampRange(
    input.prosodyWeight * 0.58
    + input.beatWeight * 0.14
    + phraseTailWeight * 0.18
    + resolveEmotionMouthBias(input.emotion),
    0.16,
    1,
    0.56,
  )
  const headWeight = clampRange(
    input.gestureWeight * 0.62
    + input.beatWeight * 0.24
    + phraseTailWeight * 0.1
    + resolveDeliveryMotionBias(input.delivery)
    + input.personaStyleBias.head,
    0.12,
    1,
    0.5,
  )
  const facialHoldMs = Math.round(clampRange(
    180
    + input.facialWeight * 210
    + phraseTailWeight * 220
    + (input.segmentIndex === input.segmentCount - 1 ? 60 : 0),
    90,
    920,
    260,
  ))
  const actionHoldMs = Math.round(clampRange(
    120
    + input.gestureWeight * 150
    + input.beatWeight * 110
    + phraseTailWeight * 130,
    70,
    720,
    180,
  ))

  return {
    mouthWeight: Number(clampRange(
      mouthWeight + input.personaStyleBias.mouth,
      0.16,
      1,
      0.56,
    ).toFixed(2)),
    headWeight: Number(headWeight.toFixed(2)),
    facialHoldMs,
    actionHoldMs,
  }
}

function resolveSegmentSettleMode(input: {
  delivery: AlicizationPerformanceDelivery
  emotion: AlicizationEmotion
  personaBias: PersonaSpeechTimingBias
  segmentCount: number
  segmentIndex: number
  text: string
}) {
  const phraseTailWeight = resolveSegmentPhraseTailWeight({
    segmentCount: input.segmentCount,
    segmentIndex: input.segmentIndex,
    text: input.text,
  })
  const lastSegment = input.segmentIndex === input.segmentCount - 1
  const questionSignal = /[?？]/.test(input.text)
  const ellipsisSignal = /[…~～]|\.{3,}/.test(input.text)

  if (!ellipsisSignal && !questionSignal) {
    if (input.personaBias.observeFirst)
      return 'hold' as const
    if (input.personaBias.directReconnect)
      return 'release' as const
  }

  if (lastSegment || phraseTailWeight >= 0.48 || ellipsisSignal)
    return 'linger' as const

  if (
    questionSignal
    || input.emotion === 'thinking'
    || input.emotion === 'concerned'
    || input.emotion === 'apologetic'
    || input.delivery === 'gentle'
    || input.delivery === 'hesitant'
  ) {
    return 'hold' as const
  }

  return 'release' as const
}

function resolveSegmentEmotionHoldMs(input: {
  delivery: AlicizationPerformanceDelivery
  facialWeight: number
  gestureWeight: number
  personaBias: PersonaSpeechTimingBias
  segmentCount: number
  segmentIndex: number
  settleMode: AlicizationDialogueSpeechSettleMode
  text: string
}) {
  const phraseTailWeight = resolveSegmentPhraseTailWeight({
    segmentCount: input.segmentCount,
    segmentIndex: input.segmentIndex,
    text: input.text,
  })
  const settleBias = input.settleMode === 'linger'
    ? 220
    : input.settleMode === 'hold'
      ? 120
      : 40
  const deliveryBias = input.delivery === 'gentle' || input.delivery === 'hesitant'
    ? 70
    : input.delivery === 'energetic'
      ? -20
      : 0
  const personaBias = input.personaBias.observeFirst
    ? 60
    : input.personaBias.directReconnect
      ? -40
      : 0

  return Math.round(clampRange(
    110
    + input.facialWeight * 180
    + input.gestureWeight * 90
    + phraseTailWeight * 260
    + settleBias
    + deliveryBias,
    80,
    960,
    220,
  ) + personaBias)
}

function resolveSegmentRendererSettleHints(input: {
  delivery: AlicizationPerformanceDelivery
  personaBias: PersonaSpeechTimingBias
  residentMode?: string | null
  segmentCount: number
  segmentIndex: number
  settleMode: AlicizationDialogueSpeechSettleMode
  text: string
}) {
  const phraseTailWeight = resolveSegmentPhraseTailWeight({
    segmentCount: input.segmentCount,
    segmentIndex: input.segmentIndex,
    text: input.text,
  })
  const settleBlendBase = input.settleMode === 'linger'
    ? 360
    : input.settleMode === 'hold'
      ? 260
      : 180
  const settleMotionBase = input.settleMode === 'linger'
    ? 520
    : input.settleMode === 'hold'
      ? 300
      : 120
  const settleFacialReleaseBase = input.settleMode === 'linger'
    ? 440
    : input.settleMode === 'hold'
      ? 280
      : 160
  const settleActionFadeBase = input.settleMode === 'linger'
    ? 280
    : input.settleMode === 'hold'
      ? 220
      : 160
  const deliveryBlendBias = input.delivery === 'gentle' || input.delivery === 'hesitant'
    ? 40
    : input.delivery === 'energetic'
      ? -20
      : 0
  const deliveryMotionBias = input.delivery === 'energetic'
    ? 60
    : input.delivery === 'gentle' || input.delivery === 'hesitant'
      ? 40
      : 0
  const deliveryFacialReleaseBias = input.delivery === 'gentle' || input.delivery === 'hesitant'
    ? 90
    : input.delivery === 'energetic'
      ? -40
      : 0
  const deliveryActionFadeBias = input.delivery === 'energetic'
    ? -20
    : input.delivery === 'gentle' || input.delivery === 'hesitant'
      ? 40
      : 0
  const personaFacialReleaseBias = input.personaBias.observeFirst
    ? 60
    : input.personaBias.directReconnect
      ? -40
      : 0
  const companionshipFacialReleaseBias = input.residentMode === 'measured-return'
    ? 120
    : input.residentMode === 'repair-before-closeness'
      ? 40
      : input.residentMode === 'quiet-companionship'
        ? 60
        : 0
  const companionshipExpressionBlendBias = input.residentMode === 'measured-return'
    ? 90
    : input.residentMode === 'repair-before-closeness'
      ? 40
      : input.residentMode === 'quiet-companionship'
        ? 55
        : 0
  const companionshipActionFadeBias = input.residentMode === 'measured-return'
    ? 50
    : input.residentMode === 'repair-before-closeness'
      ? 20
      : input.residentMode === 'quiet-companionship'
        ? 25
        : 0
  const personaMotionBias = input.personaBias.observeFirst
    ? 40
    : input.personaBias.directReconnect
      ? -30
      : 0

  return {
    live2dFacialReleaseMs: Math.round(clampRange(
      settleFacialReleaseBase
      + phraseTailWeight * 260
      + deliveryFacialReleaseBias
      + personaFacialReleaseBias
      + companionshipFacialReleaseBias,
      80,
      1600,
      320,
    )),
    vrmExpressionBlendMs: Math.round(clampRange(
      settleBlendBase + phraseTailWeight * 180 + deliveryBlendBias + companionshipExpressionBlendBias,
      60,
      960,
      240,
    )),
    vrmActionFadeMs: Math.round(clampRange(
      settleActionFadeBase + phraseTailWeight * 160 + deliveryActionFadeBias + companionshipActionFadeBias,
      80,
      1200,
      220,
    )),
    live2dMotionFollowThroughMs: Math.round(clampRange(
      settleMotionBase + phraseTailWeight * 220 + deliveryMotionBias + personaMotionBias,
      0,
      1200,
      220,
    )),
  } satisfies AlicizationDialogueSpeechRendererSettleHints
}

function buildSegmentCuePool(input: {
  explicitCue?: string | null
  candidates: string[]
}) {
  return dedupeCuePool([
    input.explicitCue ?? null,
    ...input.candidates,
  ])
}

function isDurableCompanionshipActionCue(actionCue: string) {
  return actionCue === 'observe_focus' || actionCue === 'steady_focus'
}

function shouldPreserveExplicitActionCueAcrossSegments(input: {
  explicitCue?: string | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}) {
  const explicitCue = typeof input.explicitCue === 'string' ? input.explicitCue.trim() : ''
  if (!explicitCue)
    return false

  const rendererTarget = input.performanceManifest?.renderer === 'vrm' ? 'vrm' : 'live2d'
  const residentMode = input.embodiment?.rendererHints?.residentMode ?? null
  const companionshipCarry = residentMode === 'measured-return'
    || residentMode === 'repair-before-closeness'
    || residentMode === 'quiet-companionship'
  if (!companionshipCarry)
    return false

  if (rendererTarget !== 'vrm')
    return isDurableCompanionshipActionCue(explicitCue)

  return true
}

function resolvePreservedSegmentActionCue(input: {
  explicitCue?: string | null
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
}) {
  return shouldPreserveExplicitActionCueAcrossSegments(input)
    ? (input.explicitCue?.trim() ?? null)
    : null
}

function resolveSegmentCueAnchorIndex(input: {
  candidateCount: number
  excitation: number
  segmentCount: number
  segmentIndex: number
}) {
  if (input.candidateCount <= 1 || input.segmentCount <= 1)
    return 0

  if (input.segmentIndex === 0)
    return 0

  let anchorIndex = input.segmentIndex % input.candidateCount
  if (input.excitation >= 0.52 && input.candidateCount > 1)
    anchorIndex = Math.min(input.candidateCount - 1, anchorIndex + 1)
  if (
    input.segmentIndex === input.segmentCount - 1
    && input.excitation < 0.28
    && input.candidateCount > 2
  ) {
    anchorIndex = Math.max(anchorIndex, 2)
  }

  return Math.min(input.candidateCount - 1, Math.max(0, anchorIndex))
}

function selectSegmentCue(input: {
  channel: 'action' | 'facial'
  candidates: string[]
  excitation: number
  previousCue?: string | null
  segmentCount: number
  segmentIndex: number
  text: string
  variationToken: string
}) {
  if (input.candidates.length === 0)
    return null

  if (input.candidates.length === 1)
    return input.candidates[0] ?? null

  const anchorIndex = resolveSegmentCueAnchorIndex({
    candidateCount: input.candidates.length,
    excitation: input.excitation,
    segmentCount: input.segmentCount,
    segmentIndex: input.segmentIndex,
  })
  const seedIndex = hashStableSeed(
    `${input.channel}:${input.variationToken}:${input.segmentIndex}:${input.text}`,
  ) % input.candidates.length
  const preferenceOrder = dedupeCuePool([
    input.candidates[anchorIndex] ?? null,
    input.candidates[(anchorIndex + seedIndex) % input.candidates.length] ?? null,
    input.candidates[seedIndex] ?? null,
    ...input.candidates,
  ])

  const previousCue = typeof input.previousCue === 'string'
    ? input.previousCue.trim()
    : ''
  const nextCue = preferenceOrder.find(candidate =>
    candidate !== previousCue || input.candidates.length <= 1,
  )
  return nextCue ?? input.candidates[0] ?? null
}

function resolveActionWindow(input: {
  actionCue: string | null
  beatWeight: number
  gestureWeight: number
}) {
  if (!input.actionCue)
    return 'none' as const
  if (input.beatWeight >= 0.58)
    return 'cadence-peak' as const
  if (input.gestureWeight >= 0.4)
    return 'segment-start' as const
  return 'none' as const
}

function resolveInterruptMode(input: {
  beatWeight: number
  emphasis: number
}) {
  if (input.emphasis >= 2 || input.beatWeight >= 0.74)
    return 'hard-interrupt' as const
  if (input.beatWeight >= 0.48)
    return 'soft-interrupt' as const
  return 'continue' as const
}

export function buildAlicizationDialogueSpeechTimeline(
  input: BuildAlicizationDialogueSpeechTimelineInput,
): AlicizationDialogueSpeechTimeline | null {
  const reply = normalizeAlignmentText(input.reply)
  if (!reply)
    return null

  const embodiment = input.embodiment ?? null
  const emotion = normalizeAlicizationEmotion(
    embodiment?.emotion ?? input.candidateEmotion ?? 'neutral',
  ).emotion
  const performance = normalizeAlicizationPerformancePayload(
    embodiment?.performance ?? input.candidatePerformance,
    emotion,
  )
  const chunks = splitReplyIntoSpeechChunks(reply)
  if (chunks.length === 0)
    return null

  const deliveryIntensity = resolveDeliveryIntensity(performance.delivery)
  const personaTimingBias = resolvePersonaSpeechTimingBias(input.digitalLifeSpine)
  const personaStyleBias = resolvePersonaSpeechStyleBias(personaTimingBias)
  const personaStyleSummary = resolvePersonaSpeechStyleSummary(personaTimingBias, personaStyleBias)
  const variationToken = normalizeVariationToken(embodiment?.variationToken) ?? reply
  const segments: AlicizationDialogueSpeechTimelineSegment[] = []
  let searchOffset = 0
  let previousFacialCue: string | null = null
  let previousActionCue: string | null = null

  for (const [index, chunk] of chunks.entries()) {
    const text = normalizeAlignmentText(chunk.text)
    if (!text)
      continue

    const startOffset = reply.indexOf(text, searchOffset)
    const safeStartOffset = startOffset >= 0 ? startOffset : searchOffset
    const endOffset = Math.min(reply.length, safeStartOffset + text.length)
    searchOffset = endOffset

    const excitation = resolveSegmentExcitation(text)
    const segmentEmotion = resolveSegmentEmotion({
      delivery: performance.delivery,
      text,
      turnEmotion: emotion,
    })
    const segmentCueCandidates = resolveSegmentCueCandidates({
      delivery: performance.delivery,
      emotion: segmentEmotion,
      performanceManifest: input.performanceManifest,
    })
    const facialCuePool = buildSegmentCuePool({
      explicitCue: performance.facialCue,
      candidates: segmentCueCandidates.facialCueCandidates,
    })
    const actionCuePool = buildSegmentCuePool({
      explicitCue: performance.actionCue,
      candidates: segmentCueCandidates.actionCueCandidates,
    })
    const rendererHints = resolveSegmentRendererHints({
      embodiment,
      digitalLifeSpine: input.digitalLifeSpine,
      projectState: input.projectState,
      performanceManifest: input.performanceManifest,
      segmentEmotion,
      turnEmotion: emotion,
    })
    const facialBias = resolveEmotionFacialBias(segmentEmotion)
    const settleMode = resolveSegmentSettleMode({
      delivery: performance.delivery,
      emotion: segmentEmotion,
      personaBias: personaTimingBias,
      segmentCount: chunks.length,
      segmentIndex: index,
      text,
    })
    const segmentProgress = chunks.length <= 1 ? 1 : index / (chunks.length - 1)
    const emphasisBoost = performance.emphasis === 2
      ? 0.16
      : performance.emphasis === 1
        ? 0.08
        : 0
    const endBias = index === chunks.length - 1 ? 0.05 : 0

    const gestureWeight = clampRange(
      deliveryIntensity.gesture + personaStyleBias.gesture + excitation * 0.24 + emphasisBoost + endBias * 0.5,
      0.1,
      1,
      0.48,
    )
    const facialWeight = clampRange(
      deliveryIntensity.facial + excitation * 0.12 + facialBias + segmentProgress * 0.03,
      0.12,
      1,
      0.54,
    )
    const prosodyWeight = clampRange(
      deliveryIntensity.prosody + personaStyleBias.prosody + excitation * 0.18 + emphasisBoost * 0.8 + endBias,
      0.12,
      1,
      0.56,
    )
    const beatWeight = clampRange(
      deliveryIntensity.beat + personaStyleBias.beat + excitation * 0.26 + emphasisBoost + (index === 0 ? 0.04 : 0),
      0.08,
      1,
      0.52,
    )
    const facialCue = selectSegmentCue({
      channel: 'facial',
      candidates: facialCuePool,
      excitation,
      previousCue: previousFacialCue,
      segmentCount: chunks.length,
      segmentIndex: index,
      text,
      variationToken,
    })
    const preservedActionCue = resolvePreservedSegmentActionCue({
      explicitCue: performance.actionCue,
      embodiment,
      performanceManifest: input.performanceManifest,
    })
    const actionCue: string | null = preservedActionCue || selectSegmentCue({
      channel: 'action',
      candidates: actionCuePool,
      excitation,
      previousCue: previousActionCue,
      segmentCount: chunks.length,
      segmentIndex: index,
      text,
      variationToken,
    })
    const microDynamics = resolveSegmentMicroDynamics({
      beatWeight,
      delivery: performance.delivery,
      emotion: segmentEmotion,
      facialWeight,
      gestureWeight,
      personaStyleBias,
      prosodyWeight,
      segmentCount: chunks.length,
      segmentIndex: index,
      text,
    })
    const emotionHoldMs = resolveSegmentEmotionHoldMs({
      delivery: performance.delivery,
      facialWeight,
      gestureWeight,
      personaBias: personaTimingBias,
      segmentCount: chunks.length,
      segmentIndex: index,
      settleMode,
      text,
    })
    const rendererSettle = resolveSegmentRendererSettleHints({
      delivery: performance.delivery,
      personaBias: personaTimingBias,
      residentMode: rendererHints?.residentMode ?? null,
      segmentCount: chunks.length,
      segmentIndex: index,
      settleMode,
      text,
    })

    previousFacialCue = facialCue
    previousActionCue = actionCue

    segments.push({
      id: `${normalizeVariationToken(embodiment?.variationToken) ?? 'speech'}:${index}`,
      index,
      startOffset: safeStartOffset,
      endOffset,
      text,
      emotion: segmentEmotion,
      gestureWeight: Number(gestureWeight.toFixed(2)),
      facialWeight: Number(facialWeight.toFixed(2)),
      prosodyWeight: Number(prosodyWeight.toFixed(2)),
      beatWeight: Number(beatWeight.toFixed(2)),
      mouthWeight: microDynamics.mouthWeight,
      headWeight: microDynamics.headWeight,
      personaStyleSummary,
      facialHoldMs: microDynamics.facialHoldMs,
      actionHoldMs: microDynamics.actionHoldMs,
      emotionHoldMs,
      settleMode,
      rendererSettle,
      rendererHints,
      actionCue,
      facialCue,
      actionWindow: resolveActionWindow({
        actionCue,
        beatWeight,
        gestureWeight,
      }),
      interruptMode: resolveInterruptMode({
        beatWeight,
        emphasis: performance.emphasis,
      }),
    })
  }

  if (segments.length === 0)
    return null

  return {
    version: 'speech-timeline-v1',
    variationToken: normalizeVariationToken(embodiment?.variationToken),
    reply,
    emotion,
    segments,
  }
}

export function normalizeAlicizationDialogueSpeechTimeline(
  raw: unknown,
): AlicizationDialogueSpeechTimeline | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const reply = normalizeAlignmentText(typeof candidate.reply === 'string' ? candidate.reply : '')
  if (!reply)
    return null

  const emotion = normalizeAlicizationEmotion(candidate.emotion ?? 'neutral').emotion
  const rawSegments = Array.isArray(candidate.segments) ? candidate.segments : []
  const segments = rawSegments
    .map((segment, index): AlicizationDialogueSpeechTimelineSegment | null => {
      const item = segment && typeof segment === 'object' && !Array.isArray(segment)
        ? segment as Record<string, unknown>
        : null
      if (!item)
        return null

      const text = normalizeAlignmentText(typeof item.text === 'string' ? item.text : '')
      if (!text)
        return null

      const startOffset = clampRange(Number(item.startOffset), 0, reply.length, 0)
      const endOffset = clampRange(Number(item.endOffset), startOffset, reply.length, startOffset + text.length)
      const actionWindow: AlicizationDialogueSpeechActionWindow
        = item.actionWindow === 'segment-start' || item.actionWindow === 'cadence-peak'
          ? item.actionWindow
          : 'none'
      const interruptMode: AlicizationDialogueSpeechInterruptMode
        = item.interruptMode === 'soft-interrupt' || item.interruptMode === 'hard-interrupt'
          ? item.interruptMode
          : 'continue'
      const settleMode: AlicizationDialogueSpeechSettleMode
        = item.settleMode === 'hold' || item.settleMode === 'linger'
          ? item.settleMode
          : 'release'
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `speech:${index}`,
        index: Math.max(0, Math.floor(Number(item.index) || index)),
        startOffset,
        endOffset,
        text,
        emotion: normalizeAlicizationEmotion(item.emotion ?? emotion).emotion,
        gestureWeight: Number(clamp01(Number(item.gestureWeight), 0.48).toFixed(2)),
        facialWeight: Number(clamp01(Number(item.facialWeight), 0.56).toFixed(2)),
        prosodyWeight: Number(clamp01(Number(item.prosodyWeight), 0.56).toFixed(2)),
        beatWeight: Number(clamp01(Number(item.beatWeight), 0.52).toFixed(2)),
        mouthWeight: Number(clamp01(Number(item.mouthWeight), 0.56).toFixed(2)),
        headWeight: Number(clamp01(Number(item.headWeight), 0.5).toFixed(2)),
        personaStyleSummary: typeof item.personaStyleSummary === 'string' && item.personaStyleSummary.trim()
          ? item.personaStyleSummary.trim().slice(0, 240)
          : null,
        facialHoldMs: Math.round(clampRange(Number(item.facialHoldMs), 90, 920, 260)),
        actionHoldMs: Math.round(clampRange(Number(item.actionHoldMs), 70, 720, 180)),
        emotionHoldMs: Math.round(clampRange(Number(item.emotionHoldMs), 80, 960, 220)),
        settleMode,
        rendererSettle: normalizeRendererSettleHints(item.rendererSettle),
        rendererHints: normalizeSegmentRendererHints(item.rendererHints),
        actionCue: typeof item.actionCue === 'string' && item.actionCue.trim() ? item.actionCue.trim() : null,
        facialCue: typeof item.facialCue === 'string' && item.facialCue.trim() ? item.facialCue.trim() : null,
        actionWindow,
        interruptMode,
      }
    })
    .filter((segment): segment is AlicizationDialogueSpeechTimelineSegment => segment !== null)
    .sort((left, right) => left.index - right.index || left.startOffset - right.startOffset)

  if (segments.length === 0)
    return null

  return {
    version: candidate.version === 'speech-timeline-v1' ? 'speech-timeline-v1' : 'speech-timeline-v1',
    variationToken: normalizeVariationToken(candidate.variationToken),
    reply,
    emotion,
    segments,
  }
}

export function resolveAlicizationDialogueSpeechTimelineConsumedOffset(input: {
  timeline: AlicizationDialogueSpeechTimeline | null | undefined
  consumedText?: string | null
}) {
  const timeline = input.timeline
  if (!timeline)
    return 0

  const consumedText = normalizeAlignmentText(input.consumedText ?? '')
  if (!consumedText)
    return 0

  const reply = normalizeAlignmentText(timeline.reply)
  if (!reply)
    return 0

  if (reply.startsWith(consumedText))
    return consumedText.length

  const foundAt = reply.indexOf(consumedText)
  if (foundAt >= 0)
    return foundAt + consumedText.length

  return clampRange(consumedText.length, 0, reply.length, 0)
}

export function alignAlicizationDialogueSpeechTimelineSegment(input: {
  timeline: AlicizationDialogueSpeechTimeline | null | undefined
  consumedOffset?: number | null
  consumedText?: string | null
  segmentText: string
}) {
  const timeline = input.timeline
  if (!timeline) {
    return {
      nextConsumedOffset: 0,
      segment: null as AlicizationDialogueSpeechTimelineSegment | null,
    }
  }

  const segmentText = normalizeAlignmentText(input.segmentText)
  if (!segmentText) {
    return {
      nextConsumedOffset: clampRange(Number(input.consumedOffset), 0, timeline.reply.length, 0),
      segment: null as AlicizationDialogueSpeechTimelineSegment | null,
    }
  }

  const reply = normalizeAlignmentText(timeline.reply)
  const baselineOffset = Number.isFinite(input.consumedOffset)
    ? clampRange(Number(input.consumedOffset), 0, reply.length, 0)
    : resolveAlicizationDialogueSpeechTimelineConsumedOffset({
        timeline,
        consumedText: input.consumedText,
      })

  const searchStart = Math.max(0, baselineOffset - Math.min(16, segmentText.length))
  const exactStart = reply.indexOf(segmentText, searchStart)
  const safeStart = exactStart >= 0 ? exactStart : baselineOffset
  const safeEnd = Math.min(reply.length, safeStart + segmentText.length)

  let bestSegment: AlicizationDialogueSpeechTimelineSegment | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const segment of timeline.segments) {
    const overlap = Math.max(0, Math.min(safeEnd, segment.endOffset) - Math.max(safeStart, segment.startOffset))
    const distance = Math.abs(segment.startOffset - safeStart)
    const score = overlap * 6 - distance * 0.08 - Math.abs(segment.index - timeline.segments[0]!.index) * 0.001

    if (overlap <= 0 && distance > Math.max(segmentText.length, 18))
      continue

    if (score > bestScore) {
      bestScore = score
      bestSegment = segment
    }
  }

  if (!bestSegment) {
    bestSegment = timeline.segments.find(segment => segment.endOffset > baselineOffset) ?? null
  }

  return {
    nextConsumedOffset: safeEnd,
    segment: bestSegment,
  }
}

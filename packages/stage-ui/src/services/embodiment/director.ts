import type {
  AlicizationEmbodimentScriptRendererTarget,
  AlicizationEmbodimentScriptV1,
  AlicizationEmbodimentSpeechSegment,
  AlicizationEmbodimentLipSyncVisemeHint,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'

import { adaptAlicizationEmbodimentPerformanceToRenderer } from './renderer-capability-adapter'
import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

interface AlicizationEmbodimentSeedLike {
  decisionTraceId?: string | null
  turnId: string
  replyText: string
  performance: AlicizationDialoguePerformancePayload
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null
}

export interface BuildAlicizationEmbodimentScriptInput {
  seed: AlicizationEmbodimentSeedLike
  manifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererTarget: AlicizationEmbodimentScriptRendererTarget
}

function resolveResidentMode(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  digitalLife: AlicizationEmbodimentSeedLike['digitalLife']
}) {
  if (input.digitalLife?.mode === 'recovering')
    return 'idle-recovering' as const

  const residentSource = input.residentPerformance?.source
  if (residentSource === 'browser-fallback' || residentSource === 'main-runtime')
    return 'quiet-companionship' as const

  return 'dialogue' as const
}

function resolveMicroExpressionTimingCues(input: {
  baseEmotion: AlicizationDialoguePerformancePayload['baseEmotion']
  delivery: AlicizationDialoguePerformancePayload['delivery']
  emphasis: AlicizationDialoguePerformancePayload['emphasis']
}) {
  if (input.delivery === 'energetic' || input.delivery === 'teasing') {
    return {
      preUtteranceCue: input.emphasis >= 2 ? 'steady-inhale' : 'soft-breath',
      postUtteranceCue: 'settle-smile',
    }
  }

  if (input.delivery === 'gentle') {
    if (input.baseEmotion === 'thinking') {
      return {
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: input.emphasis >= 2 ? 'eyes-soften' : 'soft-release',
      }
    }

    return {
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: input.emphasis >= 2 ? 'eyes-soften' : 'settle-smile',
    }
  }

  if (input.baseEmotion === 'thinking' || input.delivery === 'hesitant') {
    return {
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
    }
  }

  if (input.baseEmotion === 'concerned' || input.baseEmotion === 'apologetic' || input.baseEmotion === 'tired') {
    return {
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'eyes-soften',
    }
  }

  return {
    preUtteranceCue: null,
    postUtteranceCue: null,
  }
}

function resolveFallbackFaceIntensity(emphasis: AlicizationDialoguePerformancePayload['emphasis']) {
  return emphasis >= 2 ? 0.8 : emphasis === 1 ? 0.6 : 0.4
}

function resolveFallbackActionIntensity(emphasis: AlicizationDialoguePerformancePayload['emphasis']) {
  return emphasis >= 2 ? 0.7 : emphasis === 1 ? 0.5 : 0.3
}

function clampUnit(value: number, fallback = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.max(0, Math.min(1, value))
}

function roundHintWeight(value: number) {
  return Number(clampUnit(value).toFixed(2))
}

function resolveClosedVisemeWeight(segment: AlicizationEmbodimentSpeechSegment) {
  const prosody = segment.prosody
  const emphasis = prosody?.emphasisStrength ?? 0.5
  const prosodyWeight = emphasis * 0.22

  switch (prosody?.pauseClass) {
    case 'full-stop':
    case 'question':
    case 'exclaim':
      return roundHintWeight(0.58 + prosodyWeight)
    case 'ellipsis':
      return roundHintWeight(0.48 + prosodyWeight)
    case 'comma':
      return roundHintWeight(0.36 + prosodyWeight)
    case 'enumeration':
      return roundHintWeight(0.32 + prosodyWeight)
    case 'none':
    default:
      return roundHintWeight(0.28 + prosodyWeight)
  }
}

function resolveContourViseme(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.contour) {
    case 'rising':
      return 'I' as const
    case 'dip-rise':
      return 'U' as const
    case 'falling':
      return 'O' as const
    case 'flat':
    default:
      return 'E' as const
  }
}

function resolveSecondaryViseme(segment: AlicizationEmbodimentSpeechSegment) {
  const text = segment.text.trim()
  if (!text)
    return 'A' as const

  if (segment.prosody?.pauseClass === 'comma' || segment.prosody?.pauseClass === 'enumeration')
    return 'E' as const

  // Chinese-first fallback bucket stays coarse until phoneme-grade authority exists.
  const lastCharacter = Array.from(text.replace(/[，,。．.？！!?…⋯、]+$/u, '')).at(-1)
  if (!lastCharacter)
    return 'A' as const

  if (/[\u4e00-\u9fff]/u.test(lastCharacter))
    return 'A' as const

  return 'O' as const
}

function resolveVisemeConfidence(timelineSegment: NonNullable<AlicizationDialogueSpeechTimeline['segments'][number]> | null | undefined) {
  if (!timelineSegment)
    return null

  const hasExplicitEmphasisCues = timelineSegment.emotion !== undefined || timelineSegment.facialCue !== undefined || timelineSegment.actionCue !== undefined
  return hasExplicitEmphasisCues ? 0.94 : 0.9
}

function resolveTimelineBackedCueConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasExplicitCue = Boolean(timelineSegment.facialCue || timelineSegment.actionCue)
  const hasHoldWindow = Number.isFinite(timelineSegment.facialHoldMs) || Number.isFinite(timelineSegment.actionHoldMs)
  return hasExplicitCue || hasHoldWindow ? 0.94 : 0.88
}

function resolveTimelineProjectionConfidence(
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null | undefined,
) {
  if (!timelineSegment)
    return 0

  const hasActionWindow = timelineSegment.actionWindow !== 'none'
  const hasHoldWindow = Number.isFinite(timelineSegment.actionHoldMs)
  return hasActionWindow || hasHoldWindow ? 0.88 : 0.82
}

function resolveSegmentPreUtteranceCue(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.pauseClass) {
    case 'question':
    case 'exclaim':
    case 'full-stop':
      return 'steady-inhale' as const
    case 'comma':
    case 'enumeration':
    case 'ellipsis':
      return 'steady-inhale' as const
    case 'none':
    default:
      return null
  }
}

function resolveSegmentPostUtteranceCue(segment: AlicizationEmbodimentSpeechSegment) {
  switch (segment.prosody?.pauseClass) {
    case 'question':
      return 'eyes-soften' as const
    case 'exclaim':
      return 'settle-smile' as const
    case 'full-stop':
    case 'ellipsis':
      return 'soft-release' as const
    case 'comma':
    case 'enumeration':
      return 'soft-release' as const
    case 'none':
    default:
      return null
  }
}

function buildAlicizationEmbodimentLipSyncHints(
  segment: AlicizationEmbodimentSpeechSegment,
  timelineSegment: AlicizationDialogueSpeechTimeline['segments'][number] | null,
): AlicizationEmbodimentLipSyncVisemeHint[] {
  const closedWeight = resolveClosedVisemeWeight(segment)
  const contourViseme = resolveContourViseme(segment)
  const secondaryViseme = resolveSecondaryViseme(segment)
  const prosody = segment.prosody
  const emphasis = prosody?.emphasisStrength ?? 0.5
  const openWeight = roundHintWeight(Math.max(0.08, Math.min(0.62, 0.18 + emphasis * 0.24)))
  const contourWeight = roundHintWeight(Math.max(0.12, Math.min(0.54, 0.2 + emphasis * 0.18)))
  const confidence = resolveVisemeConfidence(timelineSegment)
  if (confidence === null)
    return []

  return [
    {
      segmentId: segment.id,
      viseme: 'closed',
      weight: closedWeight,
      source: 'prosody-authority',
      confidence,
    },
    {
      segmentId: segment.id,
      viseme: contourViseme,
      weight: contourWeight,
      source: 'prosody-authority',
      confidence,
    },
    {
      segmentId: segment.id,
      viseme: secondaryViseme,
      weight: openWeight,
      source: 'prosody-authority',
      confidence,
    },
  ]
}

export function buildAlicizationEmbodimentScript(
  input: BuildAlicizationEmbodimentScriptInput,
): AlicizationEmbodimentScriptV1 {
  const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
    performance: input.seed.performance,
    manifest: input.manifest,
    residentPerformance: input.residentPerformance,
    continuity: input.seed.embodiment
      ? {
          previousActionCue: input.seed.embodiment.performance.actionCue,
          previousFacialCue: input.seed.embodiment.performance.facialCue,
          variationToken: input.seed.embodiment.variationToken,
        }
      : undefined,
  })
  const speechPlan = buildAlicizationEmbodimentSpeechPlan({
    turnId: input.seed.turnId,
    replyText: input.seed.replyText,
    speechTimeline: input.seed.speechTimeline,
    digitalLife: input.seed.digitalLife,
  })
  const microExpressionTiming = resolveMicroExpressionTimingCues({
    baseEmotion: adapted.performance.baseEmotion,
    delivery: adapted.performance.delivery,
    emphasis: adapted.performance.emphasis,
  })
  const timelineSegmentById = new Map(
    (input.seed.speechTimeline?.segments ?? []).map(segment => [segment.id, segment] as const),
  )
  const fallbackFaceIntensity = resolveFallbackFaceIntensity(adapted.performance.emphasis)
  const fallbackActionIntensity = resolveFallbackActionIntensity(adapted.performance.emphasis)
  const speakingCues = speechPlan.segments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    return {
      segmentId: segment.id,
      emotion: timelineSegment?.emotion ?? adapted.performance.baseEmotion,
      facialCue: timelineSegment?.facialCue ?? adapted.performance.facialCue ?? null,
      intensity: timelineSegment?.facialWeight ?? fallbackFaceIntensity,
      holdMs: Math.max(0, timelineSegment?.facialHoldMs ?? segment.settleMs),
      preUtteranceCue: resolveSegmentPreUtteranceCue(segment),
      postUtteranceCue: resolveSegmentPostUtteranceCue(segment),
      source: timelineSegment ? 'prosody-authority' as const : 'timeline-projection' as const,
      confidence: timelineSegment ? resolveTimelineBackedCueConfidence(timelineSegment) : 0.72,
    }
  })
  const actionBursts = speechPlan.segments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    return {
      segmentId: segment.id,
      actionCue: timelineSegment?.actionCue ?? adapted.performance.actionCue ?? null,
      intensity: timelineSegment?.gestureWeight ?? fallbackActionIntensity,
      holdMs: Math.max(0, timelineSegment?.actionHoldMs ?? segment.settleMs),
      source: timelineSegment ? 'timeline-projection' as const : 'digital-life-projection' as const,
      confidence: timelineSegment ? resolveTimelineProjectionConfidence(timelineSegment) : 0.72,
    }
  })
  const visemeHints = input.manifest?.supportsVisemeLipSync === true && input.seed.speechTimeline?.segments.length
    ? speechPlan.segments.flatMap(segment => buildAlicizationEmbodimentLipSyncHints(segment, timelineSegmentById.get(segment.id) ?? null))
    : undefined

  return {
    version: 'embodiment-script-v1',
    decisionTraceId: input.seed.decisionTraceId ?? null,
    turnId: input.seed.turnId,
    rendererTarget: input.rendererTarget,
    replyText: input.seed.replyText,
    state: {
      baseEmotion: adapted.performance.baseEmotion,
      delivery: adapted.performance.delivery,
      emphasis: adapted.performance.emphasis,
      residentMode: resolveResidentMode({
        residentPerformance: input.residentPerformance,
        digitalLife: input.seed.digitalLife,
      }),
    },
    speechPlan,
    facePlan: {
      preUtteranceCue: microExpressionTiming.preUtteranceCue,
      postUtteranceCue: microExpressionTiming.postUtteranceCue,
      speakingCues,
    },
    motionPlan: {
      idleBase: adapted.performance.actionCue ?? 'idle_settle',
      actionBursts,
      attentionMode: input.manifest?.supportsLookAt === false ? 'ambient' : 'attentive',
    },
    lipsyncPlan: {
      mode: input.manifest?.supportsVisemeLipSync === true
        ? 'energy-phoneme-hybrid'
        : 'energy-only',
      ...(visemeHints ? { visemeHints } : {}),
    },
  }
}

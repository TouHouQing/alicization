import type {
  AlicizationEmbodimentScriptRendererTarget,
  AlicizationEmbodimentScriptV1,
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

import {
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
} from '@proj-alicization/stage-shared'

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
    return buildAlicizationEmbodimentFaceCue({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackEmotion: adapted.performance.baseEmotion,
      fallbackFacialCue: adapted.performance.facialCue ?? null,
      fallbackIntensity: fallbackFaceIntensity,
    })
  })
  const actionBursts = speechPlan.segments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    return buildAlicizationEmbodimentMotionBurst({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackActionCue: adapted.performance.actionCue ?? null,
      fallbackIntensity: fallbackActionIntensity,
    })
  })
  const visemeHints = input.manifest?.supportsVisemeLipSync === true && input.seed.speechTimeline?.segments.length
    ? speechPlan.segments.flatMap(segment => buildAlicizationEmbodimentLipSyncHints({
        segment,
        timelineSegment: timelineSegmentById.get(segment.id) ?? null,
      }))
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

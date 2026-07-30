import type {
  AlicizationEmbodimentScriptRendererTarget,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
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

function residentPerformanceForExecution(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return residentPerformance
    ? {
        ...residentPerformance,
        reasonTags: [],
        signature: '',
      }
    : null
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

function isQuietCompanionshipResidentAuthority(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  performance: AlicizationDialoguePerformancePayload
}) {
  return input.residentPerformance?.source === 'main-runtime'
    && input.residentPerformance?.stance === 'accompany'
    && input.residentPerformance?.embodiedPresence === 'attentive'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.performance.delivery === 'gentle'
    && input.performance.baseEmotion === 'thinking'
}

function isRestProtectiveQuietCompanionshipResidentAuthority(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  performance: AlicizationDialoguePerformancePayload
}) {
  return (input.residentPerformance?.source === 'main-runtime' || input.residentPerformance?.source === 'browser-fallback')
    && input.residentPerformance?.stance === 'care'
    && input.residentPerformance?.embodiedPresence === 'concerned'
    && input.residentPerformance?.emotionalTension === 'late-night-drain'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.performance.delivery === 'gentle'
    && (
      input.performance.baseEmotion === 'concerned'
      || input.performance.baseEmotion === 'tired'
      || input.performance.baseEmotion === 'thinking'
    )
}

function resolveQuietCompanionshipMotionBaseline(input: {
  restProtective: boolean
}) {
  if (input.restProtective)
    return 'idle_settle'

  return 'steady_focus'
}

function resolveMicroExpressionTimingCues(input: {
  baseEmotion: AlicizationDialoguePerformancePayload['baseEmotion']
  delivery: AlicizationDialoguePerformancePayload['delivery']
  emphasis: AlicizationDialoguePerformancePayload['emphasis']
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
}) {
  const personaBias = input.digitalLifeSpine?.proactive?.personaBias ?? null
  const personaObserveBias = personaBias?.initiativeStyle === 'observant'
    || personaBias?.silenceReconnect === 'hold'
    || personaBias?.preferredProactiveStyle === 'silent-observe'
  const personaDirectBias = personaBias?.initiativeStyle === 'high-participation'
    || personaBias?.silenceReconnect === 'direct-approach'

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
        postUtteranceCue: input.emphasis >= 2
          ? 'eyes-soften'
          : personaDirectBias
            ? 'settle-smile'
            : 'soft-release',
      }
    }

    return {
      preUtteranceCue: personaObserveBias ? 'steady-inhale' : 'soft-breath',
      postUtteranceCue: input.emphasis >= 2
        ? 'eyes-soften'
        : personaObserveBias
          ? 'soft-release'
          : 'settle-smile',
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
  const executionResidentPerformance = residentPerformanceForExecution(input.residentPerformance)
  const adapted = adaptAlicizationEmbodimentPerformanceToRenderer({
    performance: input.seed.performance,
    manifest: input.manifest,
    residentPerformance: executionResidentPerformance,
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
  const restProtectiveQuietCompanionshipResidentAuthority
    = isRestProtectiveQuietCompanionshipResidentAuthority({
      residentPerformance: executionResidentPerformance,
      performance: adapted.performance,
    })
  const quietCompanionshipResidentAuthority
    = isQuietCompanionshipResidentAuthority({
      residentPerformance: executionResidentPerformance,
      performance: adapted.performance,
    })
    || restProtectiveQuietCompanionshipResidentAuthority
  const quietCompanionshipMotionBaseline = resolveQuietCompanionshipMotionBaseline({
    restProtective: restProtectiveQuietCompanionshipResidentAuthority,
  })
  const microExpressionTiming = resolveMicroExpressionTimingCues({
    baseEmotion: adapted.performance.baseEmotion,
    delivery: adapted.performance.delivery,
    emphasis: adapted.performance.emphasis,
    digitalLifeSpine: input.seed.digitalLifeSpine,
  })
  const speechPlanSegments = speechPlan.segments
  const timelineSegmentById = new Map(
    (input.seed.speechTimeline?.segments ?? []).map(segment => [segment.id, segment] as const),
  )
  const fallbackFaceIntensity = resolveFallbackFaceIntensity(adapted.performance.emphasis)
  const fallbackActionIntensity = resolveFallbackActionIntensity(adapted.performance.emphasis)
  const speakingCues = speechPlanSegments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    return buildAlicizationEmbodimentFaceCue({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackEmotion: adapted.performance.baseEmotion,
      fallbackFacialCue: adapted.performance.facialCue ?? null,
      fallbackIntensity: fallbackFaceIntensity,
    })
  })
  const actionBursts = speechPlanSegments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    const burst = buildAlicizationEmbodimentMotionBurst({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackActionCue: adapted.performance.actionCue ?? null,
      fallbackIntensity: fallbackActionIntensity,
    })
    return {
      ...burst,
      actionCue: quietCompanionshipResidentAuthority
        ? restProtectiveQuietCompanionshipResidentAuthority
        && (
          burst.actionCue === 'steady_focus'
          || burst.actionCue === 'observe_focus'
          || burst.actionCue === 'companion_settle_nod'
          || burst.actionCue === 'idle_gentle_nod'
        )
          ? quietCompanionshipMotionBaseline
          : burst.actionCue === 'observe_focus'
            ? quietCompanionshipMotionBaseline
            : (
                burst.actionCue === 'companion_settle_nod'
                || burst.actionCue === 'idle_gentle_nod'
              )
                ? quietCompanionshipMotionBaseline
                : burst.actionCue
        : burst.actionCue,
    }
  })
  const visemeHints = input.manifest?.supportsVisemeLipSync === true && input.seed.speechTimeline?.segments.length
    ? speechPlanSegments.flatMap(segment => buildAlicizationEmbodimentLipSyncHints({
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
    speechPlan: {
      ...speechPlan,
      segments: speechPlanSegments,
      interruptPolicy: quietCompanionshipResidentAuthority
        ? 'soft-settle'
        : speechPlan.interruptPolicy,
    },
    facePlan: {
      preUtteranceCue: quietCompanionshipResidentAuthority
        ? 'soft-breath'
        : microExpressionTiming.preUtteranceCue,
      postUtteranceCue: quietCompanionshipResidentAuthority
        ? 'soft-release'
        : microExpressionTiming.postUtteranceCue,
      speakingCues,
    },
    motionPlan: {
      idleBase: quietCompanionshipResidentAuthority
        ? quietCompanionshipMotionBaseline
        : adapted.performance.actionCue ?? 'idle_settle',
      actionBursts,
      attentionMode: input.manifest?.supportsLookAt === false || quietCompanionshipResidentAuthority
        ? 'ambient'
        : 'attentive',
    },
    lipsyncPlan: {
      mode: input.manifest?.supportsVisemeLipSync === true
        ? 'energy-phoneme-hybrid'
        : 'energy-only',
      ...(visemeHints ? { visemeHints } : {}),
    },
  }
}

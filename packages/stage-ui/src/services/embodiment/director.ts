import type {
  AlicizationEmbodimentScriptRendererTarget,
  AlicizationEmbodimentScriptV1,
  AlicizationEmbodimentSpeechPlan,
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

type SpeechRendererHints = AlicizationEmbodimentSpeechPlan['segments'][number]['rendererHints']
type RestrainedResidentMode = 'measured-return' | 'repair-before-closeness'

function resolveRestrainedCallbackResidentMode(
  rendererHints: SpeechRendererHints,
): RestrainedResidentMode | null {
  if (rendererHints?.residentMode === 'repair-before-closeness')
    return 'repair-before-closeness'
  if (rendererHints?.residentMode === 'measured-return')
    return 'measured-return'
  return null
}

function resolveScriptRestrainedResidentMode(
  speechPlan: AlicizationEmbodimentSpeechPlan,
): RestrainedResidentMode | null {
  const residentModes = speechPlan.segments
    .map(segment => resolveRestrainedCallbackResidentMode(segment.rendererHints))

  if (residentModes.includes('repair-before-closeness'))
    return 'repair-before-closeness'
  if (residentModes.includes('measured-return'))
    return 'measured-return'
  return null
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
  restrainedResidentMode: RestrainedResidentMode | null
}) {
  if (input.digitalLife?.mode === 'recovering')
    return 'idle-recovering' as const

  if (input.restrainedResidentMode)
    return input.restrainedResidentMode

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

function resolveRestrainedCallbackMotionBaseline(input: {
  rendererHints: SpeechRendererHints
  residentMode: RestrainedResidentMode | null
  restProtective: boolean
}) {
  if (input.restProtective || input.residentMode === 'repair-before-closeness')
    return 'idle_settle'

  if (input.residentMode !== 'measured-return')
    return null

  if (
    input.rendererHints?.preferredMotionAliases?.includes('steady_focus')
    || input.rendererHints?.preferredGazeMode === 'steady'
  ) {
    return 'steady_focus'
  }

  return 'observe_focus'
}

function mergeSpeechSegmentRendererHints(input: {
  rendererHints: SpeechRendererHints
}) {
  const residentMode = resolveRestrainedCallbackResidentMode(input.rendererHints)
  if (!residentMode) {
    return input.rendererHints ?? null
  }

  if (residentMode === 'repair-before-closeness') {
    return {
      ...input.rendererHints,
      preferredBlinkCadence: input.rendererHints?.preferredBlinkCadence ?? 'quiet' as const,
      preferredGazeMode: input.rendererHints?.preferredGazeMode ?? 'soften' as const,
      preferredExpressionAliases: input.rendererHints?.preferredExpressionAliases ?? ['soft-gaze'],
      preferredMotionAliases: input.rendererHints?.preferredMotionAliases ?? ['idle_settle'],
      residentMode: 'repair-before-closeness',
    }
  }

  return {
    ...input.rendererHints,
    preferredBlinkCadence: input.rendererHints?.preferredBlinkCadence ?? 'linger' as const,
    preferredGazeMode: input.rendererHints?.preferredGazeMode ?? 'soften' as const,
    residentMode: 'measured-return',
  }
}

function projectSpeechSegmentRendererSettle(input: {
  rendererHints: SpeechRendererHints
  rendererSettle: AlicizationEmbodimentSpeechPlan['segments'][number]['rendererSettle']
}) {
  const residentMode = resolveRestrainedCallbackResidentMode(input.rendererHints)
  if (!residentMode)
    return input.rendererSettle ?? null

  const baseFacialReleaseMs = Math.max(
    input.rendererSettle?.live2dFacialReleaseMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 420
      : residentMode === 'measured-return'
        ? 340
        : 0,
  )
  const baseMotionFollowThroughMs = Math.max(
    input.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 520
      : residentMode === 'measured-return'
        ? 420
        : 0,
  )
  const baseVrmActionFadeMs = Math.max(
    input.rendererSettle?.vrmActionFadeMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 300
      : residentMode === 'measured-return'
        ? 280
        : 0,
  )
  const baseVrmExpressionBlendMs = Math.max(
    input.rendererSettle?.vrmExpressionBlendMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 380
      : residentMode === 'measured-return'
        ? 360
        : 0,
  )

  if (
    baseFacialReleaseMs <= 0
    && baseMotionFollowThroughMs <= 0
    && baseVrmActionFadeMs <= 0
    && baseVrmExpressionBlendMs <= 0
  ) {
    return input.rendererSettle ?? null
  }

  return {
    ...input.rendererSettle,
    live2dFacialReleaseMs: baseFacialReleaseMs > 0 ? baseFacialReleaseMs : input.rendererSettle?.live2dFacialReleaseMs,
    live2dMotionFollowThroughMs: baseMotionFollowThroughMs > 0 ? baseMotionFollowThroughMs : input.rendererSettle?.live2dMotionFollowThroughMs,
    vrmActionFadeMs: baseVrmActionFadeMs > 0 ? baseVrmActionFadeMs : input.rendererSettle?.vrmActionFadeMs,
    vrmExpressionBlendMs: baseVrmExpressionBlendMs > 0 ? baseVrmExpressionBlendMs : input.rendererSettle?.vrmExpressionBlendMs,
  }
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
  const restrainedCallbackResidentMode = resolveScriptRestrainedResidentMode(speechPlan)
  const structuredRendererHints = speechPlan.segments.find(segment =>
    resolveRestrainedCallbackResidentMode(segment.rendererHints) === restrainedCallbackResidentMode,
  )?.rendererHints ?? null
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
  const restrainedCallbackMotionBaseline = resolveRestrainedCallbackMotionBaseline({
    rendererHints: structuredRendererHints,
    residentMode: restrainedCallbackResidentMode,
    restProtective: restProtectiveQuietCompanionshipResidentAuthority,
  })
  const microExpressionTiming = resolveMicroExpressionTimingCues({
    baseEmotion: adapted.performance.baseEmotion,
    delivery: adapted.performance.delivery,
    emphasis: adapted.performance.emphasis,
    digitalLifeSpine: input.seed.digitalLifeSpine,
  })
  const speechPlanSegments = speechPlan.segments.map(segment => ({
    ...segment,
    rendererHints: mergeSpeechSegmentRendererHints({
      rendererHints: segment.rendererHints ?? null,
    }),
    rendererSettle: projectSpeechSegmentRendererSettle({
      rendererHints: segment.rendererHints ?? null,
      rendererSettle: segment.rendererSettle ?? null,
    }),
  }))
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
    const segmentResidentMode = resolveRestrainedCallbackResidentMode(segment.rendererHints)
    const segmentMotionBaseline = resolveRestrainedCallbackMotionBaseline({
      rendererHints: segment.rendererHints,
      residentMode: segmentResidentMode,
      restProtective: restProtectiveQuietCompanionshipResidentAuthority,
    })
    return {
      ...burst,
      actionCue: quietCompanionshipResidentAuthority
        ? segmentResidentMode === 'repair-before-closeness'
          ? (segmentMotionBaseline ?? 'idle_settle')
          : (
              restProtectiveQuietCompanionshipResidentAuthority
              && (
                burst.actionCue === 'steady_focus'
                || burst.actionCue === 'observe_focus'
                || burst.actionCue === 'companion_settle_nod'
                || burst.actionCue === 'idle_gentle_nod'
              )
                ? (segmentMotionBaseline ?? 'idle_settle')
                : burst.actionCue === 'observe_focus'
                  ? (segmentMotionBaseline ?? 'steady_focus')
                  : (
                      burst.actionCue === 'companion_settle_nod'
                      || burst.actionCue === 'idle_gentle_nod'
                    )
                      ? (segmentMotionBaseline ?? 'steady_focus')
                      : burst.actionCue
            )
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
        restrainedResidentMode: restrainedCallbackResidentMode,
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
        ? restrainedCallbackResidentMode
          ? 'steady-inhale'
          : 'soft-breath'
        : microExpressionTiming.preUtteranceCue,
      postUtteranceCue: quietCompanionshipResidentAuthority
        ? restrainedCallbackResidentMode
          ? 'eyes-soften'
          : 'soft-release'
        : microExpressionTiming.postUtteranceCue,
      speakingCues,
    },
    motionPlan: {
      idleBase: quietCompanionshipResidentAuthority
        ? (restrainedCallbackMotionBaseline ?? 'steady_focus')
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

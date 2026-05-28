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

function shouldAlignQuietCompanionshipMotionToResident(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  performance: AlicizationDialoguePerformancePayload
}) {
  return input.residentPerformance?.source === 'main-runtime'
    && input.residentPerformance?.stance === 'accompany'
    && input.residentPerformance?.embodiedPresence === 'attentive'
    && input.residentPerformance?.performance?.delivery === 'gentle'
    && input.residentPerformance?.performance?.actionCue === 'steady_focus'
    && input.performance.delivery === 'gentle'
    && input.performance.actionCue === 'steady_focus'
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

function sanitizeCadenceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).toLowerCase()
}

function includesCadenceNeedle(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function resolveManifestationHoldBias(digitalLifeSpine: AlicizationDigitalLifeSpineDigest | null | undefined) {
  const personaBias = digitalLifeSpine?.proactive?.personaBias ?? null
  const manifestationCadenceSummary = sanitizeCadenceText(personaBias?.manifestationCadenceSummary, 220)
  const relationshipDoctrine = sanitizeCadenceText(digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine, 220)
  const outcomeSummary = sanitizeCadenceText(digitalLifeSpine?.outcomeLearning?.summary, 220)
  const latestInflection = sanitizeCadenceText(digitalLifeSpine?.outcomeLearning?.latestInflection, 220)

  const observeFirstCadence = includesCadenceNeedle(manifestationCadenceSummary, [
    'observe-first',
    'stay slower',
    'slower until the opening softens',
  ])
  const lowerPressureTiming = includesCadenceNeedle(
    `${relationshipDoctrine} ${outcomeSummary} ${latestInflection}`,
    [
      'lower-pressure',
      'pressure stayed low',
      'return stayed slower',
      'slower return',
      'keep more room',
      'repair should settle before closeness expands',
    ],
  )

  if (!observeFirstCadence && !lowerPressureTiming)
    return 1

  const learningMomentum = Math.max(
    0,
    Math.min(
      1,
      Math.max(
        Number(digitalLifeSpine?.outcomeLearning?.evolutionMomentum ?? 0),
        Number(digitalLifeSpine?.outcomeLearning?.learningReadiness ?? 0),
      ),
    ),
  )
  const baseBias = 1.08
    + (observeFirstCadence ? 0.08 : 0)
    + (lowerPressureTiming ? 0.1 : 0)
    + Math.min(0.08, learningMomentum * 0.08)

  return Math.min(1.32, baseBias)
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
  const quietCompanionshipResidentAuthority = isQuietCompanionshipResidentAuthority({
    residentPerformance: input.residentPerformance,
    performance: adapted.performance,
  })
  const microExpressionTiming = resolveMicroExpressionTimingCues({
    baseEmotion: adapted.performance.baseEmotion,
    delivery: adapted.performance.delivery,
    emphasis: adapted.performance.emphasis,
    digitalLifeSpine: input.seed.digitalLifeSpine,
  })
  const timelineSegmentById = new Map(
    (input.seed.speechTimeline?.segments ?? []).map(segment => [segment.id, segment] as const),
  )
  const fallbackFaceIntensity = resolveFallbackFaceIntensity(adapted.performance.emphasis)
  const fallbackActionIntensity = resolveFallbackActionIntensity(adapted.performance.emphasis)
  const manifestationHoldBias = resolveManifestationHoldBias(input.seed.digitalLifeSpine)
  const speakingCues = speechPlan.segments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    const cue = buildAlicizationEmbodimentFaceCue({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackEmotion: adapted.performance.baseEmotion,
      fallbackFacialCue: adapted.performance.facialCue ?? null,
      fallbackIntensity: fallbackFaceIntensity,
    })
    return {
      ...cue,
      holdMs: Math.round(cue.holdMs * manifestationHoldBias),
    }
  })
  const actionBursts = speechPlan.segments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    const burst = buildAlicizationEmbodimentMotionBurst({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackActionCue: adapted.performance.actionCue ?? null,
      fallbackIntensity: fallbackActionIntensity,
    })
    return {
      ...burst,
      actionCue: shouldAlignQuietCompanionshipMotionToResident({
        residentPerformance: input.residentPerformance,
        performance: adapted.performance,
      }) && burst.actionCue === 'observe_focus'
        ? 'steady_focus'
        : burst.actionCue,
      holdMs: Math.round(burst.holdMs * manifestationHoldBias),
    }
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
    speechPlan: {
      ...speechPlan,
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
        ? 'steady_focus'
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

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
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
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

function normalizeResidentReasonTag(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : ''
}

function hasResidentReasonTag(
  residentReasonTags: readonly string[] | string[] | null | undefined,
  expectedTag: string,
) {
  const normalizedExpectedTag = normalizeResidentReasonTag(expectedTag)
  return (residentReasonTags ?? []).some(reasonTag =>
    normalizeResidentReasonTag(reasonTag) === normalizedExpectedTag,
  )
}

function hasStillVoicedResidentContinuity(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasAlicizationStillVoicedSameHerCarry({
    signature: residentPerformance?.signature ?? null,
    reasonTags: residentPerformance?.reasonTags ?? [],
  })
}

function hasQuieterResidentContinuity(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasAlicizationQuieterSameHerCarry({
    signature: residentPerformance?.signature ?? null,
    reasonTags: residentPerformance?.reasonTags ?? [],
  })
}

function hasAudibleSameHerResidentContinuity(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasAlicizationAudibleSameHerCarry({
    signature: residentPerformance?.signature ?? null,
    reasonTags: residentPerformance?.reasonTags ?? [],
  })
}

function hasBodyVoiceOnlyResidentContinuity(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: residentPerformance?.signature ?? null,
    reasonTags: residentPerformance?.reasonTags ?? [],
  })
}

function hasSoftenedMeasuredReturnResidentContinuity(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasBodyVoiceOnlyResidentContinuity(residentPerformance)
    || hasStillVoicedResidentContinuity(residentPerformance)
    || hasQuieterResidentContinuity(residentPerformance)
}

function resolveResidentMode(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  digitalLife: AlicizationEmbodimentSeedLike['digitalLife']
}) {
  if (input.digitalLife?.mode === 'recovering')
    return 'idle-recovering' as const

  const restrainedCallbackResidentMode = resolveRestrainedCallbackResidentMode(input.residentPerformance)
  if (restrainedCallbackResidentMode)
    return restrainedCallbackResidentMode

  const residentSource = input.residentPerformance?.source
  if (residentSource === 'browser-fallback' || residentSource === 'main-runtime')
    return 'quiet-companionship' as const

  return 'dialogue' as const
}

function resolveRestrainedCallbackResidentMode(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  const residentReasonTags = residentPerformance?.reasonTags ?? []
  if (hasResidentReasonTag(residentReasonTags, 'repair-before-closeness'))
    return 'repair-before-closeness' as const
  if (
    hasResidentReasonTag(residentReasonTags, 'measured-return')
    || hasSoftenedMeasuredReturnResidentContinuity(residentPerformance)
  ) {
    return 'measured-return' as const
  }
  return null
}

function hasDurableRelationshipRhythm(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  return hasResidentReasonTag(residentPerformance?.reasonTags, 'durable-relationship-rhythm')
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
  const residentReasonTags = input.residentPerformance?.reasonTags ?? []
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
    && (
      hasResidentReasonTag(residentReasonTags, 'rest-protective')
      || hasResidentReasonTag(residentReasonTags, 'rest-protective-companionship')
    )
}

function resolveRestrainedCallbackMotionBaseline(input: {
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  performance: AlicizationDialoguePerformancePayload
}) {
  if (isRestProtectiveQuietCompanionshipResidentAuthority(input))
    return 'idle_settle'

  if (!isQuietCompanionshipResidentAuthority(input))
    return null

  const residentMode = resolveRestrainedCallbackResidentMode(input.residentPerformance)
  const residentReasonTags = input.residentPerformance?.reasonTags ?? []
  if (residentMode === 'repair-before-closeness')
    return 'idle_settle'
  if (residentMode === 'measured-return') {
    return hasDurableRelationshipRhythm(input.residentPerformance)
      ? 'steady_focus'
      : 'observe_focus'
  }
  if (
    hasResidentReasonTag(residentReasonTags, 'subconscious-proactive')
    && hasResidentReasonTag(residentReasonTags, 'silent-observe')
    && hasResidentReasonTag(residentReasonTags, 'continuity:quiet-accompaniment')
    && (
      hasResidentReasonTag(residentReasonTags, 'measured-return')
      || hasSoftenedMeasuredReturnResidentContinuity(input.residentPerformance)
      || hasResidentReasonTag(residentReasonTags, 'repair-before-closeness')
      || hasResidentReasonTag(residentReasonTags, 'continuity-next-open-window')
      || hasResidentReasonTag(residentReasonTags, 'lower-pressure')
    )
  ) {
    return 'steady_focus'
  }
  return null
}

function shouldPreserveQuietCompanionshipObserveBurst(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  const residentReasonTags = residentPerformance?.reasonTags ?? []
  if (hasResidentReasonTag(residentReasonTags, 'repair-before-closeness'))
    return false

  return hasResidentReasonTag(residentReasonTags, 'subconscious-proactive')
    && hasResidentReasonTag(residentReasonTags, 'silent-observe')
    && hasResidentReasonTag(residentReasonTags, 'continuity:quiet-accompaniment')
    && (
      hasResidentReasonTag(residentReasonTags, 'continuity-next-open-window')
      || hasResidentReasonTag(residentReasonTags, 'lower-pressure')
    )
}

function hasAudibleBodyMeasuredReturnCarry(
  residentPerformance: AlicizationResidentPerformanceSnapshot | null,
) {
  const residentReasonTags = residentPerformance?.reasonTags ?? []
  const audibleSameHerContinuity = hasAudibleSameHerResidentContinuity(residentPerformance)
  const softenedMeasuredReturnContinuity = hasSoftenedMeasuredReturnResidentContinuity(residentPerformance)
  return (
    hasResidentReasonTag(residentReasonTags, 'measured-return')
    || softenedMeasuredReturnContinuity
    || audibleSameHerContinuity
  )
  && hasResidentReasonTag(residentReasonTags, 'continuity:quiet-accompaniment')
  && hasResidentReasonTag(residentReasonTags, 'silent-observe')
  && (
    hasResidentReasonTag(residentReasonTags, 'continuity-next-open-window')
    || softenedMeasuredReturnContinuity
    || audibleSameHerContinuity
    || hasResidentReasonTag(residentReasonTags, 'lower-pressure')
  )
}

function softenFaceCueForAudibleBodyMeasuredReturnCarry(input: {
  cue: ReturnType<typeof buildAlicizationEmbodimentFaceCue>
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
}) {
  if (!hasAudibleBodyMeasuredReturnCarry(input.residentPerformance))
    return input.cue

  return {
    ...input.cue,
    preUtteranceCue: input.cue.preUtteranceCue ?? 'steady-inhale',
    postUtteranceCue: input.cue.postUtteranceCue === 'settle-smile'
      || input.cue.postUtteranceCue === 'soft-release'
      ? 'eyes-soften'
      : (input.cue.postUtteranceCue ?? 'eyes-soften'),
  }
}

function mergeSpeechSegmentRendererHints(input: {
  residentMode: ReturnType<typeof resolveRestrainedCallbackResidentMode>
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererHints: AlicizationEmbodimentSpeechPlan['segments'][number]['rendererHints']
}) {
  const hasSoftenedContinuity = hasSoftenedMeasuredReturnResidentContinuity(input.residentPerformance)
  if (!input.residentMode) {
    return input.rendererHints ?? null
  }

  if (
    input.residentMode === 'measured-return'
    && !hasDurableRelationshipRhythm(input.residentPerformance)
    && !hasSoftenedContinuity
  ) {
    return input.rendererHints ?? null
  }

  if (input.residentMode === 'repair-before-closeness') {
    return {
      ...input.rendererHints,
      preferredBlinkCadence: input.rendererHints?.preferredBlinkCadence ?? 'quiet' as const,
      preferredGazeMode: input.rendererHints?.preferredGazeMode ?? 'soften' as const,
      preferredExpressionAliases: input.rendererHints?.preferredExpressionAliases ?? ['soft-gaze'],
      preferredMotionAliases: input.rendererHints?.preferredMotionAliases ?? ['idle_settle'],
      residentMode: 'repair-before-closeness',
      signature: input.rendererHints?.signature ?? input.residentPerformance?.signature ?? undefined,
      reasonTags: input.rendererHints?.reasonTags ?? input.residentPerformance?.reasonTags ?? undefined,
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
  residentMode: ReturnType<typeof resolveRestrainedCallbackResidentMode>
  residentPerformance: AlicizationResidentPerformanceSnapshot | null
  rendererSettle: AlicizationEmbodimentSpeechPlan['segments'][number]['rendererSettle']
}) {
  const residentMode = input.residentMode
  if (!residentMode)
    return input.rendererSettle ?? null

  const baseFacialReleaseMs = Math.max(
    input.rendererSettle?.live2dFacialReleaseMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 420
      : residentMode === 'measured-return'
        ? hasAudibleBodyMeasuredReturnCarry(input.residentPerformance)
          ? 360
          : 340
        : 0,
  )
  const baseMotionFollowThroughMs = Math.max(
    input.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 520
      : residentMode === 'measured-return'
        ? hasAudibleBodyMeasuredReturnCarry(input.residentPerformance)
          ? 380
          : 420
        : 0,
  )
  const baseVrmActionFadeMs = Math.max(
    input.rendererSettle?.vrmActionFadeMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 300
      : residentMode === 'measured-return'
        ? hasAudibleBodyMeasuredReturnCarry(input.residentPerformance)
          ? 260
          : 280
        : 0,
  )
  const baseVrmExpressionBlendMs = Math.max(
    input.rendererSettle?.vrmExpressionBlendMs ?? 0,
    residentMode === 'repair-before-closeness'
      ? 380
      : residentMode === 'measured-return'
        ? hasAudibleBodyMeasuredReturnCarry(input.residentPerformance)
          ? 340
          : 360
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
  const restProtectiveQuietCompanionshipResidentAuthority
    = isRestProtectiveQuietCompanionshipResidentAuthority({
      residentPerformance: input.residentPerformance,
      performance: adapted.performance,
    })
  const quietCompanionshipResidentAuthority
    = isQuietCompanionshipResidentAuthority({
      residentPerformance: input.residentPerformance,
      performance: adapted.performance,
    })
    || restProtectiveQuietCompanionshipResidentAuthority
  const restrainedCallbackMotionBaseline = resolveRestrainedCallbackMotionBaseline({
    residentPerformance: input.residentPerformance,
    performance: adapted.performance,
  })
  const restrainedCallbackResidentMode = resolveRestrainedCallbackResidentMode(input.residentPerformance)
  const microExpressionTiming = resolveMicroExpressionTimingCues({
    baseEmotion: adapted.performance.baseEmotion,
    delivery: adapted.performance.delivery,
    emphasis: adapted.performance.emphasis,
    digitalLifeSpine: input.seed.digitalLifeSpine,
  })
  const audibleBodyMeasuredReturnCarry = hasAudibleBodyMeasuredReturnCarry(input.residentPerformance)
  const speechPlanSegments = speechPlan.segments.map(segment => ({
    ...segment,
    rendererHints: mergeSpeechSegmentRendererHints({
      residentMode: restrainedCallbackResidentMode,
      residentPerformance: input.residentPerformance,
      rendererHints: segment.rendererHints ?? null,
    }),
    rendererSettle: projectSpeechSegmentRendererSettle({
      residentMode: restrainedCallbackResidentMode,
      residentPerformance: input.residentPerformance,
      rendererSettle: segment.rendererSettle ?? null,
    }),
  }))
  const timelineSegmentById = new Map(
    (input.seed.speechTimeline?.segments ?? []).map(segment => [segment.id, segment] as const),
  )
  const fallbackFaceIntensity = resolveFallbackFaceIntensity(adapted.performance.emphasis)
  const fallbackActionIntensity = resolveFallbackActionIntensity(adapted.performance.emphasis)
  const manifestationHoldBias = resolveManifestationHoldBias(input.seed.digitalLifeSpine)
  const speakingCues = speechPlanSegments.map((segment) => {
    const timelineSegment = timelineSegmentById.get(segment.id)
    const cue = buildAlicizationEmbodimentFaceCue({
      segment,
      timelineSegment: timelineSegment ?? null,
      fallbackEmotion: adapted.performance.baseEmotion,
      fallbackFacialCue: adapted.performance.facialCue ?? null,
      fallbackIntensity: fallbackFaceIntensity,
    })
    const softenedCue = softenFaceCueForAudibleBodyMeasuredReturnCarry({
      cue,
      residentPerformance: input.residentPerformance,
    })
    return {
      ...softenedCue,
      holdMs: Math.round(softenedCue.holdMs * manifestationHoldBias),
    }
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
        ? (
            restProtectiveQuietCompanionshipResidentAuthority
            && (
              burst.actionCue === 'steady_focus'
              || burst.actionCue === 'observe_focus'
              || burst.actionCue === 'companion_settle_nod'
              || burst.actionCue === 'idle_gentle_nod'
            )
              ? (restrainedCallbackMotionBaseline ?? 'idle_settle')
              : burst.actionCue === 'observe_focus'
                ? shouldPreserveQuietCompanionshipObserveBurst(input.residentPerformance)
                  ? burst.actionCue
                  : (restrainedCallbackMotionBaseline ?? 'steady_focus')
                : (
                    burst.actionCue === 'companion_settle_nod'
                    || burst.actionCue === 'idle_gentle_nod'
                  )
                    ? (restrainedCallbackMotionBaseline ?? 'steady_focus')
                    : burst.actionCue
          )
        : burst.actionCue,
      holdMs: Math.round(burst.holdMs * manifestationHoldBias),
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
        ? audibleBodyMeasuredReturnCarry
          ? 'steady-inhale'
          : 'soft-breath'
        : microExpressionTiming.preUtteranceCue,
      postUtteranceCue: quietCompanionshipResidentAuthority
        ? audibleBodyMeasuredReturnCarry
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

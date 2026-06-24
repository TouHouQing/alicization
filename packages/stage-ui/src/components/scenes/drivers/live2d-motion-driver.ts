import type {
  AlicizationEmbodimentMotionBurst,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationBodyVoiceOnlySameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationSoftenedSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
  normalizeAlicizationRendererHintTokens,
} from '@proj-alicization/stage-shared'

import {
  resolveLive2DDriverRendererHints,
  resolveLive2DDriverResidentMode,
} from './live2d-companionship-resident-mode'

export interface ResolveLive2DMotionDriverStateInput {
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
  playbackPhase: 'idle' | 'playing'
  script: AlicizationEmbodimentScriptV1 | null | undefined
  segmentId?: string | null
  preserveActionBurstOnIdle?: boolean
}

export interface Live2DMotionDriverState {
  idleBase: string
  attentionMode: AlicizationEmbodimentScriptV1['motionPlan']['attentionMode']
  actionCue: string | null
  intensity: number
  holdMs: number
  source: AlicizationEmbodimentMotionBurst['source'] | null
  confidence: number
  segmentId: string | null
}

function resolveActionBurst(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
): AlicizationEmbodimentMotionBurst | null {
  if (segmentId) {
    const matchedBurst = script.motionPlan.actionBursts.find(burst => burst.segmentId === segmentId)
    if (matchedBurst)
      return matchedBurst
  }

  return script.motionPlan.actionBursts[0] ?? null
}

function clampRestrainedCallbackActionCue(input: {
  actionCue: string | null
  cueKind: 'action-burst' | 'idle-base'
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  reasonTags?: readonly string[] | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode']
  signature?: string | null
}) {
  if (!input.actionCue)
    return null
  const normalizedReasonTags = normalizeAlicizationRendererHintTokens(input.reasonTags)
  const hasSofteningWindow = (
    input.preferredBlinkCadence === 'linger'
    || input.preferredBlinkCadence === 'quiet'
    || input.preferredGazeMode === 'soften'
    || input.preferredGazeMode === 'steady'
  )
  const sameHerSoftenedReturn = (
    hasSofteningWindow
  ) && hasAlicizationSoftenedSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerAudibleReturn = (
    hasSofteningWindow
  ) && hasAlicizationAudibleSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerBodyVoiceOnlyReturn = (
    hasSofteningWindow
  ) && hasAlicizationBodyVoiceOnlySameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerStillVoicedReturn = (
    hasSofteningWindow
  ) && hasAlicizationStillVoicedSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerQuieterLane = hasSofteningWindow && hasAlicizationQuieterSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  const sameHerBodyVoiceOnlyLane = sameHerBodyVoiceOnlyReturn
    || (sameHerAudibleReturn && normalizedReasonTags.includes('embodiment:body+voice_only'))
  const sameHerAudibleRejoinLane = sameHerAudibleReturn
    && input.residentMode === 'same-thread-continuation'
  const sameHerStillVoicedLane = sameHerStillVoicedReturn
    && input.residentMode === 'same-thread-continuation'
  if (input.residentMode === 'repair-before-closeness') {
    return 'idle_settle'
  }
  if (
    input.residentMode === 'measured-return'
    && input.actionCue === 'steady_focus'
    && !sameHerSoftenedReturn
    && (input.preferredGazeMode !== 'steady' || input.preferredBlinkCadence !== 'quiet')
    && (input.preferredGazeMode !== 'soften' || input.preferredBlinkCadence !== 'linger')
  ) {
    return 'observe_focus'
  }
  if (
    (sameHerAudibleRejoinLane || sameHerBodyVoiceOnlyLane || sameHerQuieterLane || sameHerStillVoicedLane)
    && input.cueKind === 'action-burst'
    && (input.actionCue === 'steady_focus' || input.actionCue === 'observe_focus')
  ) {
    return null
  }
  if (
    sameHerSoftenedReturn
    && input.actionCue === 'steady_focus'
    && input.residentMode !== 'measured-return'
  ) {
    return 'observe_focus'
  }
  return input.actionCue
}

export function resolveLive2DMotionDriverState(
  input: ResolveLive2DMotionDriverStateInput,
): Live2DMotionDriverState | null {
  const script = input.script
  if (!script)
    return null

  const residentMode = resolveLive2DDriverResidentMode(script, input.segmentId)
  const activeSegmentHints = resolveLive2DDriverRendererHints(script, input.segmentId)
  // Idle preview keeps same-her motion on the restrained living line until playback actually reopens the burst.
  const actionBurst = input.playbackPhase === 'playing'
    || input.idleCuePhase === 'post-utterance'
    || input.preserveActionBurstOnIdle === true
    ? resolveActionBurst(script, input.segmentId)
    : null

  return {
    idleBase: clampRestrainedCallbackActionCue({
      actionCue: script.motionPlan.idleBase,
      cueKind: 'idle-base',
      preferredBlinkCadence: activeSegmentHints?.preferredBlinkCadence ?? null,
      preferredGazeMode: activeSegmentHints?.preferredGazeMode ?? null,
      reasonTags: activeSegmentHints?.reasonTags ?? null,
      residentMode,
      signature: activeSegmentHints?.signature ?? null,
    }) ?? script.motionPlan.idleBase,
    attentionMode: script.motionPlan.attentionMode,
    actionCue: clampRestrainedCallbackActionCue({
      actionCue: actionBurst?.actionCue ?? null,
      cueKind: 'action-burst',
      preferredBlinkCadence: resolveLive2DDriverRendererHints(script, actionBurst?.segmentId ?? input.segmentId)?.preferredBlinkCadence ?? null,
      preferredGazeMode: resolveLive2DDriverRendererHints(script, actionBurst?.segmentId ?? input.segmentId)?.preferredGazeMode ?? null,
      reasonTags: resolveLive2DDriverRendererHints(script, actionBurst?.segmentId ?? input.segmentId)?.reasonTags ?? null,
      residentMode,
      signature: resolveLive2DDriverRendererHints(script, actionBurst?.segmentId ?? input.segmentId)?.signature ?? null,
    }),
    intensity: actionBurst?.intensity ?? 0,
    holdMs: actionBurst?.holdMs ?? 0,
    source: actionBurst?.source ?? null,
    confidence: actionBurst?.confidence ?? 0,
    segmentId: actionBurst?.segmentId ?? input.segmentId?.trim() ?? null,
  }
}

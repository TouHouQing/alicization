import type {
  AlicizationEmbodimentMotionBurst,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

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

export function resolveLive2DMotionDriverState(
  input: ResolveLive2DMotionDriverStateInput,
): Live2DMotionDriverState | null {
  const script = input.script
  if (!script)
    return null

  const actionBurst = input.playbackPhase === 'playing'
    || input.idleCuePhase === 'post-utterance'
    || input.preserveActionBurstOnIdle === true
    ? resolveActionBurst(script, input.segmentId)
    : null

  return {
    idleBase: script.motionPlan.idleBase,
    attentionMode: script.motionPlan.attentionMode,
    actionCue: actionBurst?.actionCue ?? null,
    intensity: actionBurst?.intensity ?? 0,
    holdMs: actionBurst?.holdMs ?? 0,
    source: actionBurst?.source ?? null,
    confidence: actionBurst?.confidence ?? 0,
    segmentId: actionBurst?.segmentId ?? input.segmentId?.trim() ?? null,
  }
}

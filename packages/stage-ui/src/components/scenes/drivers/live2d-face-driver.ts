import type {
  AlicizationEmbodimentFaceCue,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

export interface ResolveLive2DFaceDriverStateInput {
  idleCuePhase?: 'pre-utterance' | 'post-utterance'
  playbackPhase: 'idle' | 'playing'
  script: AlicizationEmbodimentScriptV1 | null | undefined
  segmentId?: string | null
}

export interface Live2DFaceDriverState {
  emotion: AlicizationEmbodimentScriptV1['state']['baseEmotion']
  facialCue: string | null
  intensity: number
  holdMs: number
  source: AlicizationEmbodimentFaceCue['source'] | null
  confidence: number
  preUtteranceCue: string | null
  postUtteranceCue: string | null
  segmentId: string | null
}

function resolveSpeakingCue(
  script: AlicizationEmbodimentScriptV1,
  segmentId: string | null | undefined,
): AlicizationEmbodimentFaceCue | null {
  if (segmentId) {
    const matchedCue = script.facePlan.speakingCues.find(cue => cue.segmentId === segmentId)
    if (matchedCue)
      return matchedCue
  }

  return script.facePlan.speakingCues[0] ?? null
}

export function resolveLive2DFaceDriverState(
  input: ResolveLive2DFaceDriverStateInput,
): Live2DFaceDriverState | null {
  const script = input.script
  if (!script)
    return null

  const speakingCue = resolveSpeakingCue(script, input.segmentId)
  const idleCuePhase = input.idleCuePhase ?? 'pre-utterance'
  const playbackFacialCue = input.playbackPhase === 'playing'
    ? speakingCue?.facialCue ?? null
    : idleCuePhase === 'post-utterance'
      ? speakingCue?.postUtteranceCue
      ?? script.facePlan.postUtteranceCue
      ?? speakingCue?.facialCue
      ?? null
      : speakingCue?.preUtteranceCue
        ?? script.facePlan.preUtteranceCue
        ?? speakingCue?.facialCue
        ?? null

  return {
    emotion: speakingCue?.emotion ?? script.state.baseEmotion,
    facialCue: playbackFacialCue,
    intensity: speakingCue?.intensity ?? 0,
    holdMs: Math.max(0, speakingCue?.holdMs ?? 0),
    source: speakingCue?.source ?? null,
    confidence: speakingCue?.confidence ?? 0,
    preUtteranceCue: script.facePlan.preUtteranceCue ?? null,
    postUtteranceCue: script.facePlan.postUtteranceCue ?? null,
    segmentId: speakingCue?.segmentId ?? input.segmentId?.trim() ?? null,
  }
}

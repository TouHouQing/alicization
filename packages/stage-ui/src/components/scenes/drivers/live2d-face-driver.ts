import type {
  AlicizationEmbodimentFaceCue,
  AlicizationEmbodimentScriptV1,
} from '@proj-alicization/stage-shared'

import {
  hasAlicizationSoftenedSameHerCarry,
} from '@proj-alicization/stage-shared'

import {
  resolveLive2DDriverRendererHints,
  resolveLive2DDriverResidentMode,
} from './live2d-companionship-resident-mode'

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

function clampRestrainedCallbackFacialCue(input: {
  facialCue: string | null
  preferredExpressionAliases?: readonly string[] | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  reasonTags?: readonly string[] | null
  residentMode: AlicizationEmbodimentScriptV1['state']['residentMode']
  signature?: string | null
}) {
  if (!input.facialCue)
    return null
  const normalizedAliases = (input.preferredExpressionAliases ?? [])
    .map(alias => alias.trim().toLowerCase())
    .filter(Boolean)
  const sameHerSoftenedReturn = (
    input.preferredBlinkCadence === 'linger'
    || input.preferredBlinkCadence === 'quiet'
    || input.preferredGazeMode === 'soften'
    || input.preferredGazeMode === 'steady'
  ) && hasAlicizationSoftenedSameHerCarry({
    signature: input.signature,
    reasonTags: input.reasonTags,
  })
  if (input.residentMode === 'repair-before-closeness' && input.facialCue === 'settle-smile') {
    return normalizedAliases.find(alias => alias.includes('soft-release') || alias.includes('recover-soft'))
      ?? 'soft-release'
  }
  if (input.residentMode === 'measured-return' && input.facialCue === 'settle-smile') {
    return sameHerSoftenedReturn
      ? normalizedAliases.find(alias => alias.includes('relaxed') || alias.includes('soft-gaze') || alias.includes('calm'))
      ?? 'soft-gaze'
      : normalizedAliases.find(alias => alias.includes('eyes-soften') || alias.includes('calm') || alias.includes('soft-gaze'))
        ?? 'eyes-soften'
  }
  if (sameHerSoftenedReturn && input.facialCue === 'settle-smile') {
    return normalizedAliases.find(alias => alias.includes('relaxed') || alias.includes('soft-gaze') || alias.includes('calm'))
      ?? 'soft-gaze'
  }
  return input.facialCue
}

export function resolveLive2DFaceDriverState(
  input: ResolveLive2DFaceDriverStateInput,
): Live2DFaceDriverState | null {
  const script = input.script
  if (!script)
    return null

  const speakingCue = resolveSpeakingCue(script, input.segmentId)
  const residentMode = resolveLive2DDriverResidentMode(script, input.segmentId)
  const activeSegmentHints = resolveLive2DDriverRendererHints(script, input.segmentId)
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
    facialCue: clampRestrainedCallbackFacialCue({
      facialCue: playbackFacialCue,
      preferredBlinkCadence: activeSegmentHints?.preferredBlinkCadence ?? null,
      preferredGazeMode: activeSegmentHints?.preferredGazeMode ?? null,
      preferredExpressionAliases: activeSegmentHints?.preferredExpressionAliases ?? null,
      reasonTags: activeSegmentHints?.reasonTags ?? null,
      residentMode,
      signature: activeSegmentHints?.signature ?? null,
    }),
    intensity: speakingCue?.intensity ?? 0,
    holdMs: Math.max(0, speakingCue?.holdMs ?? 0),
    source: speakingCue?.source ?? null,
    confidence: speakingCue?.confidence ?? 0,
    preUtteranceCue: clampRestrainedCallbackFacialCue({
      facialCue: script.facePlan.preUtteranceCue ?? null,
      preferredBlinkCadence: activeSegmentHints?.preferredBlinkCadence ?? null,
      preferredGazeMode: activeSegmentHints?.preferredGazeMode ?? null,
      preferredExpressionAliases: activeSegmentHints?.preferredExpressionAliases ?? null,
      reasonTags: activeSegmentHints?.reasonTags ?? null,
      residentMode,
      signature: activeSegmentHints?.signature ?? null,
    }),
    postUtteranceCue: clampRestrainedCallbackFacialCue({
      facialCue: script.facePlan.postUtteranceCue ?? null,
      preferredBlinkCadence: activeSegmentHints?.preferredBlinkCadence ?? null,
      preferredGazeMode: activeSegmentHints?.preferredGazeMode ?? null,
      preferredExpressionAliases: activeSegmentHints?.preferredExpressionAliases ?? null,
      reasonTags: activeSegmentHints?.reasonTags ?? null,
      residentMode,
      signature: activeSegmentHints?.signature ?? null,
    }),
    segmentId: speakingCue?.segmentId ?? input.segmentId?.trim() ?? null,
  }
}

import type { AlicizationDialogueEmbodimentEnvelope } from '../../stores/alicization-bridge'

export interface StageRuntimeEmbodimentCueState {
  segmentExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  segmentMotionAliasesByEmotion: Partial<Record<string, string[]>>
  turnExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  turnMotionAliasesByEmotion: Partial<Record<string, string[]>>
}

export interface StageRuntimeEmbodimentActiveCueInput {
  emotion?: string | null
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints']
  rendererSettle?: {
    live2dMotionFollowThroughMs?: number
  } | null
}

export function normalizeRuntimeAliasList(rawAliases: readonly string[] | null | undefined) {
  return [...new Set(
    (rawAliases ?? [])
      .map(alias => alias.trim())
      .filter(Boolean),
  )]
}

export function mergePreferredAliases(
  runtimeAliases: readonly string[] | null | undefined,
  configuredAliases: readonly string[] | null | undefined,
) {
  return normalizeRuntimeAliasList([
    ...(runtimeAliases ?? []),
    ...(configuredAliases ?? []),
  ])
}

export function createEmptyStageRuntimeEmbodimentCueState(): StageRuntimeEmbodimentCueState {
  return {
    segmentExpressionAliasesByEmotion: {},
    segmentMotionAliasesByEmotion: {},
    turnExpressionAliasesByEmotion: {},
    turnMotionAliasesByEmotion: {},
  }
}

export function applyRuntimeEmbodimentEnvelopeCueState(
  state: StageRuntimeEmbodimentCueState,
  embodiment: AlicizationDialogueEmbodimentEnvelope | null | undefined,
) {
  const emotion = typeof embodiment?.emotion === 'string' ? embodiment.emotion.trim() : ''
  if (!emotion) {
    state.turnExpressionAliasesByEmotion = {}
    state.turnMotionAliasesByEmotion = {}
    return state
  }

  const preferredExpressionAliases = normalizeRuntimeAliasList(embodiment?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRuntimeAliasList(embodiment?.rendererHints?.preferredMotionAliases)

  state.turnExpressionAliasesByEmotion = preferredExpressionAliases.length > 0
    ? { [emotion]: preferredExpressionAliases }
    : {}
  state.turnMotionAliasesByEmotion = preferredMotionAliases.length > 0
    ? { [emotion]: preferredMotionAliases }
    : {}
  return state
}

export function clearRuntimeSegmentEmbodimentCueState(state: StageRuntimeEmbodimentCueState) {
  state.segmentExpressionAliasesByEmotion = {}
  state.segmentMotionAliasesByEmotion = {}
  return state
}

export function applyRuntimeEmbodimentActiveCueState(
  state: StageRuntimeEmbodimentCueState,
  cue: StageRuntimeEmbodimentActiveCueInput | null | undefined,
) {
  const emotion = typeof cue?.emotion === 'string' ? cue.emotion.trim() : ''
  if (!emotion) {
    clearRuntimeSegmentEmbodimentCueState(state)
    return {
      followThroughMs: 0,
      state,
    }
  }

  const preferredExpressionAliases = normalizeRuntimeAliasList(cue?.rendererHints?.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRuntimeAliasList(cue?.rendererHints?.preferredMotionAliases)
  state.segmentExpressionAliasesByEmotion = preferredExpressionAliases.length > 0
    ? { [emotion]: preferredExpressionAliases }
    : {}
  state.segmentMotionAliasesByEmotion = preferredMotionAliases.length > 0
    ? { [emotion]: preferredMotionAliases }
    : {}

  return {
    followThroughMs: Math.max(
      0,
      Math.round(Number(cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)),
    ),
    state,
  }
}

export function resolvePreferredExpressionAliasesFromRuntimeState(
  state: StageRuntimeEmbodimentCueState,
  emotion: string,
  configuredAliases: readonly string[] | null | undefined,
) {
  return mergePreferredAliases(
    state.segmentExpressionAliasesByEmotion[emotion],
    mergePreferredAliases(
      state.turnExpressionAliasesByEmotion[emotion],
      configuredAliases,
    ),
  )
}

export function resolvePreferredMotionAliasesFromRuntimeState(
  state: StageRuntimeEmbodimentCueState,
  emotion: string,
  configuredAliases: readonly string[] | null | undefined,
) {
  return mergePreferredAliases(
    state.segmentMotionAliasesByEmotion[emotion],
    mergePreferredAliases(
      state.turnMotionAliasesByEmotion[emotion],
      configuredAliases,
    ),
  )
}

export function resolvePreferredVrmExpressionAliasesFromRuntimeState(
  state: StageRuntimeEmbodimentCueState,
  emotion: string,
  configuredAliases: readonly string[] | null | undefined,
) {
  return resolvePreferredExpressionAliasesFromRuntimeState(
    state,
    emotion,
    configuredAliases,
  )
}

export function resolveLive2DSegmentMotionCueSelection(input: {
  state: StageRuntimeEmbodimentCueState
  cue: StageRuntimeEmbodimentActiveCueInput | null | undefined
  configuredAliases: readonly string[] | null | undefined
}) {
  const emotion = typeof input.cue?.emotion === 'string' ? input.cue.emotion.trim() : ''
  return {
    emotion,
    followThroughMs: Math.max(
      0,
      Math.round(Number(input.cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0)),
    ),
    preferredMotionAliases: emotion
      ? resolvePreferredMotionAliasesFromRuntimeState(
          input.state,
          emotion,
          input.configuredAliases,
        )
      : [],
  }
}

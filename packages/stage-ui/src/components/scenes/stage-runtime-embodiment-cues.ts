import type { AlicizationDialogueEmbodimentEnvelope } from '../../stores/alicization-bridge'

export interface StageRuntimeEmbodimentCueState {
  segmentExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  segmentMotionAliasesByEmotion: Partial<Record<string, string[]>>
  turnExpressionAliasesByEmotion: Partial<Record<string, string[]>>
  turnMotionAliasesByEmotion: Partial<Record<string, string[]>>
}

export interface StageRuntimeEmbodimentActiveCueInput {
  id?: string | null
  emotion?: string | null
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints']
  rendererSettle?: {
    live2dMotionFollowThroughMs?: number
    vrmActionFadeMs?: number
    vrmExpressionBlendMs?: number
  } | null
}

function uniqueMotionAliasOrder(values: readonly string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized)
      continue
    const dedupeKey = normalized.toLowerCase()
    if (seen.has(dedupeKey))
      continue
    seen.add(dedupeKey)
    result.push(normalized)
  }

  return result
}

function normalizeFollowThroughMs(rawMs: number | null | undefined) {
  return Math.max(0, Math.round(Number(rawMs ?? 0)))
}

function resolvePersonaSettleBiasMs(
  rendererHints: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined,
  bodySegmentMatched?: boolean | null | undefined,
  faceSegmentMatched?: boolean | null | undefined,
  motionSegmentMatched?: boolean | null | undefined,
  lipsyncSegmentMatched?: boolean | null | undefined,
) {
  const residentMode = typeof rendererHints?.residentMode === 'string' ? rendererHints.residentMode.trim() : ''
  const preferredGazeMode = typeof rendererHints?.preferredGazeMode === 'string' ? rendererHints.preferredGazeMode.trim() : ''
  const preferredBlinkCadence = typeof rendererHints?.preferredBlinkCadence === 'string' ? rendererHints.preferredBlinkCadence.trim() : ''
  const preferredPauseMode = typeof rendererHints?.preferredPauseMode === 'string' ? rendererHints.preferredPauseMode.trim() : ''
  const preferredLipsyncMode = typeof rendererHints?.preferredLipsyncMode === 'string' ? rendererHints.preferredLipsyncMode.trim() : ''
  const preferredVoiceMode = typeof rendererHints?.preferredVoiceMode === 'string' ? rendererHints.preferredVoiceMode.trim() : ''
  const preferredPacingMode = typeof rendererHints?.preferredPacingMode === 'string' ? rendererHints.preferredPacingMode.trim() : ''

  const durableMeasuredReturn = residentMode === 'measured-return'
    && (preferredGazeMode === 'steady' || preferredGazeMode === 'soften')
    && (preferredBlinkCadence === 'quiet' || preferredBlinkCadence === 'linger')
  const rendererOnlyRejoin = bodySegmentMatched === false
  const audibleLineAhead = bodySegmentMatched === true
    && lipsyncSegmentMatched === true
    && (faceSegmentMatched === false || motionSegmentMatched === false)
  const rendererOnlyRejoinBiasMs = residentMode === 'repair-before-closeness'
    ? 100
    : residentMode === 'measured-return'
      ? 60
      : 0
  const audibleLineAheadBiasMs = residentMode === 'repair-before-closeness'
    ? 120
    : residentMode === 'measured-return'
      ? 80
      : 0

  if (residentMode === 'repair-before-closeness') {
    return 180
      + (preferredPauseMode === 'longer' ? 24 : 0)
      + (preferredLipsyncMode === 'restrained' ? 20 : 0)
      + (preferredVoiceMode === 'lower-pressure' ? 16 : 0)
      + (preferredPacingMode === 'slower' ? 18 : 0)
      + (rendererOnlyRejoin ? rendererOnlyRejoinBiasMs : 0)
      + (audibleLineAhead ? audibleLineAheadBiasMs : 0)
  }
  if (durableMeasuredReturn) {
    return 120
      + (preferredPauseMode === 'longer' ? 22 : 0)
      + (preferredLipsyncMode === 'restrained' ? 18 : 0)
      + (preferredVoiceMode === 'lower-pressure' ? 14 : 0)
      + (preferredPacingMode === 'slower' ? 16 : 0)
      + (rendererOnlyRejoin ? rendererOnlyRejoinBiasMs : 0)
      + (audibleLineAhead ? audibleLineAheadBiasMs : 0)
  }
  if (residentMode === 'measured-return' || residentMode === 'quiet-companionship') {
    return 80
      + (preferredPauseMode === 'longer' ? 18 : 0)
      + (preferredLipsyncMode === 'restrained' ? 14 : 0)
      + (preferredVoiceMode === 'lower-pressure' ? 10 : 0)
      + (preferredPacingMode === 'slower' ? 12 : 0)
      + (rendererOnlyRejoin && residentMode === 'measured-return' ? rendererOnlyRejoinBiasMs : 0)
      + (audibleLineAhead && residentMode === 'measured-return' ? audibleLineAheadBiasMs : 0)
  }

  return 0
}

export function resolveRendererSettleMsWithPersonaBias(input: {
  baseMs: number | null | undefined
  bodySegmentMatched?: boolean | null | undefined
  faceSegmentMatched?: boolean | null | undefined
  motionSegmentMatched?: boolean | null | undefined
  lipsyncSegmentMatched?: boolean | null | undefined
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined
}) {
  const baseMs = normalizeFollowThroughMs(input.baseMs)
  if (baseMs <= 0)
    return 0

  return baseMs + resolvePersonaSettleBiasMs(
    input.rendererHints,
    input.bodySegmentMatched,
    input.faceSegmentMatched,
    input.motionSegmentMatched,
    input.lipsyncSegmentMatched,
  )
}

function resolveFollowThroughMsWithPersonaBias(
  cue: StageRuntimeEmbodimentActiveCueInput | null | undefined,
) {
  return resolveRendererSettleMsWithPersonaBias({
    baseMs: cue?.rendererSettle?.live2dMotionFollowThroughMs,
    rendererHints: cue?.rendererHints,
  })
}

export function resolveActiveCueWatchKey(
  cue: StageRuntimeEmbodimentActiveCueInput | null | undefined,
) {
  return JSON.stringify([
    cue?.id ?? null,
    cue?.emotion ?? null,
    cue?.rendererHints?.preferredExpressionAliases?.join('|') ?? '',
    cue?.rendererHints?.preferredMotionAliases?.join('|') ?? '',
    cue?.rendererHints?.residentMode ?? null,
    cue?.rendererHints?.preferredBlinkCadence ?? null,
    cue?.rendererHints?.preferredGazeMode ?? null,
    cue?.rendererHints?.preferredPauseMode ?? null,
    cue?.rendererHints?.preferredLipsyncMode ?? null,
    cue?.rendererHints?.preferredVoiceMode ?? null,
    cue?.rendererHints?.preferredPacingMode ?? null,
    cue?.rendererSettle?.live2dMotionFollowThroughMs ?? 0,
    cue?.rendererSettle?.vrmActionFadeMs ?? 0,
    cue?.rendererSettle?.vrmExpressionBlendMs ?? 0,
  ])
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
    followThroughMs: resolveFollowThroughMsWithPersonaBias(
      cue,
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
  return uniqueMotionAliasOrder(
    mergePreferredAliases(
      state.segmentMotionAliasesByEmotion[emotion],
      mergePreferredAliases(
        state.turnMotionAliasesByEmotion[emotion],
        configuredAliases,
      ),
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
  const preferredMotionAliases = emotion
    ? resolvePreferredMotionAliasesFromRuntimeState(
        input.state,
        emotion,
        input.configuredAliases,
      )
    : []
  return {
    emotion,
    followThroughMs: resolveFollowThroughMsWithPersonaBias(
      input.cue,
    ),
    preferredMotionAliases,
  }
}

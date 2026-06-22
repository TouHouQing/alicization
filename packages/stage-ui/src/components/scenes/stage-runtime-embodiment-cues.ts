import type { AlicizationDialogueEmbodimentEnvelope } from '../../stores/alicization-bridge'

import { hasAlicizationSoftenedSameHerCarry } from '@proj-alicization/stage-shared'

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
    const signature = normalized.toLowerCase()
    if (seen.has(signature))
      continue
    seen.add(signature)
    result.push(normalized)
  }

  return result
}

function normalizeFollowThroughMs(rawMs: number | null | undefined) {
  return Math.max(0, Math.round(Number(rawMs ?? 0)))
}

function hasSoftenedSameHerResidentCarry(
  rendererHints: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined,
) {
  const preferredGazeMode = typeof rendererHints?.preferredGazeMode === 'string'
    ? rendererHints.preferredGazeMode.trim()
    : ''
  const preferredBlinkCadence = typeof rendererHints?.preferredBlinkCadence === 'string'
    ? rendererHints.preferredBlinkCadence.trim()
    : ''
  const softenedCadence = preferredGazeMode === 'steady'
    || preferredGazeMode === 'soften'
    || preferredBlinkCadence === 'quiet'
    || preferredBlinkCadence === 'linger'
  if (!softenedCadence)
    return false

  return hasAlicizationSoftenedSameHerCarry({
    signature: rendererHints?.signature,
    reasonTags: rendererHints?.reasonTags,
  })
}

function resolvePersonaSettleBiasMs(
  rendererHints: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined,
  preferredExpressionAliases: readonly string[],
  preferredMotionAliases: readonly string[],
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
  const sameHerSoftenedReturn = hasSoftenedSameHerResidentCarry(rendererHints)
  const shouldSkipAliasSettleBias = sameHerSoftenedReturn
    && residentMode !== 'repair-before-closeness'
    && residentMode !== 'measured-return'
    && residentMode !== 'quiet-companionship'
  const aliases = new Set(
    [...preferredExpressionAliases, ...preferredMotionAliases]
      .map(alias => alias.trim().toLowerCase())
      .filter(Boolean),
  )

  if (!shouldSkipAliasSettleBias) {
    if (aliases.has('recover-soft') || aliases.has('recover_soft') || aliases.has('stillness_guard'))
      return 180
    if (aliases.has('calm_inspect') || aliases.has('calminspect') || aliases.has('observe_focus'))
      return 120
    if (aliases.has('soft-gaze') || aliases.has('soft_gaze') || aliases.has('observesoft'))
      return 80
  }

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
    return (sameHerSoftenedReturn ? 220 : 180)
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
  preferredExpressionAliases: readonly string[]
  preferredMotionAliases: readonly string[]
}) {
  const baseMs = normalizeFollowThroughMs(input.baseMs)
  if (baseMs <= 0)
    return 0

  return baseMs + resolvePersonaSettleBiasMs(
    input.rendererHints,
    input.preferredExpressionAliases,
    input.preferredMotionAliases,
    input.bodySegmentMatched,
    input.faceSegmentMatched,
    input.motionSegmentMatched,
    input.lipsyncSegmentMatched,
  )
}

function resolveFollowThroughMsWithPersonaBias(
  cue: StageRuntimeEmbodimentActiveCueInput | null | undefined,
  preferredExpressionAliases: readonly string[],
  preferredMotionAliases: readonly string[],
) {
  return resolveRendererSettleMsWithPersonaBias({
    baseMs: cue?.rendererSettle?.live2dMotionFollowThroughMs,
    rendererHints: cue?.rendererHints,
    preferredExpressionAliases,
    preferredMotionAliases,
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
    cue?.rendererHints?.signature ?? null,
    cue?.rendererHints?.reasonTags?.join('|') ?? '',
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

function preferSofterSameHerMotionAliases(input: {
  aliases: readonly string[]
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined
}) {
  const residentMode = typeof input.rendererHints?.residentMode === 'string'
    ? input.rendererHints.residentMode.trim().toLowerCase()
    : ''
  const sameHerSoftenedReturn = hasSoftenedSameHerResidentCarry(input.rendererHints)
  const shouldPreferSofterRejoin = residentMode === 'measured-return'
    || residentMode === 'quiet-companionship'
    || residentMode === 'repair-before-closeness'
    || sameHerSoftenedReturn
  if (!shouldPreferSofterRejoin)
    return uniqueMotionAliasOrder(input.aliases)

  const softerAliases = input.aliases.filter((alias) => {
    const signature = alias.trim().toLowerCase()
    return signature === 'observesoft'
      || signature === 'observe_soft'
      || signature === 'steadyfocus'
      || signature === 'steady_focus'
      || signature === 'idlesettle'
      || signature === 'idle_settle'
      || signature === 'stillnessguard'
      || signature === 'stillness_guard'
  })
  const remainingAliases = input.aliases.filter(alias => !softerAliases.includes(alias))
  return uniqueMotionAliasOrder([
    ...softerAliases,
    ...remainingAliases,
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
      preferredExpressionAliases,
      preferredMotionAliases,
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
  rendererHints?: AlicizationDialogueEmbodimentEnvelope['rendererHints'] | null | undefined,
) {
  return preferSofterSameHerMotionAliases({
    aliases: mergePreferredAliases(
      state.segmentMotionAliasesByEmotion[emotion],
      mergePreferredAliases(
        state.turnMotionAliasesByEmotion[emotion],
        configuredAliases,
      ),
    ),
    rendererHints,
  })
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
        input.cue?.rendererHints,
      )
    : []
  return {
    emotion,
    followThroughMs: resolveFollowThroughMsWithPersonaBias(
      input.cue,
      input.state.segmentExpressionAliasesByEmotion[emotion] ?? input.state.turnExpressionAliasesByEmotion[emotion] ?? [],
      preferredMotionAliases,
    ),
    preferredMotionAliases,
  }
}

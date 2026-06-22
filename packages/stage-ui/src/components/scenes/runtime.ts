import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentScriptV1,
} from '../../stores/alicization-bridge'
import type { StageModelRenderer } from '../../stores/settings'

import { normalizeAlicizationDigitalLifeEnvelope } from '../../stores/alicization-bridge'

export interface Live2DLipSyncLoopParams {
  paused: boolean
  stageModelRenderer: StageModelRenderer
}

export function shouldRunLive2dLipSyncLoop(params: Live2DLipSyncLoopParams) {
  return params.stageModelRenderer === 'live2d' && !params.paused
}

export interface Live2DEmotionMotionOverrideGuardParams {
  runtimeSegmentMotionActive: boolean
  runtimeSegmentMotionFollowThroughMs: number
  stageModelRenderer: StageModelRenderer
}

export function shouldDeferLive2DEmotionMotionOverride(params: Live2DEmotionMotionOverrideGuardParams) {
  return params.stageModelRenderer === 'live2d'
    && params.runtimeSegmentMotionActive
    && Number.isFinite(params.runtimeSegmentMotionFollowThroughMs)
    && params.runtimeSegmentMotionFollowThroughMs > 0
}

export interface StageEmbodimentMetaAuthorityInput {
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript?: AlicizationEmbodimentScriptV1 | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
}

type StageEmbodimentRendererHints = NonNullable<AlicizationDialogueEmbodimentEnvelope['rendererHints']>

function normalizeRendererHintAliasList(rawAliases: readonly string[] | null | undefined) {
  return [...new Set(
    (rawAliases ?? [])
      .map(alias => alias.trim())
      .filter(Boolean),
  )]
}

function mergeRendererHintAliases(
  aliasGroups: ReadonlyArray<readonly string[] | null | undefined>,
) {
  return normalizeRendererHintAliasList(aliasGroups.flatMap(group => group ?? []))
}

function mergeRendererHintReasonTags(
  reasonTagGroups: ReadonlyArray<readonly string[] | null | undefined>,
) {
  return [...new Set(
    reasonTagGroups
      .flatMap(group => group ?? [])
      .map(reasonTag => reasonTag.trim())
      .filter(Boolean),
  )]
}

function mergeStageEmbodimentRendererHints(
  hints: Array<StageEmbodimentRendererHints | null | undefined>,
): StageEmbodimentRendererHints | null {
  const preferredExpressionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredExpressionAliases),
  )
  const preferredMotionAliases = mergeRendererHintAliases(
    hints.map(item => item?.preferredMotionAliases),
  )
  const reasonTags = mergeRendererHintReasonTags(
    hints.map(item => item?.reasonTags),
  )
  const signature = hints.find(item => typeof item?.signature === 'string' && item.signature.trim())
    ?.signature
    ?.trim()
  const preferredGazeMode = hints.find(item =>
    item?.preferredGazeMode === 'steady'
    || item?.preferredGazeMode === 'soften'
    || item?.preferredGazeMode === 'drift',
  )?.preferredGazeMode
  const preferredBlinkCadence = hints.find(item =>
    item?.preferredBlinkCadence === 'normal'
    || item?.preferredBlinkCadence === 'linger'
    || item?.preferredBlinkCadence === 'quiet',
  )?.preferredBlinkCadence
  const residentMode = hints.find(item => typeof item?.residentMode === 'string' && item.residentMode.trim())
    ?.residentMode
    ?.trim()

  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
    && reasonTags.length === 0
    && !signature
    && !preferredGazeMode
    && !preferredBlinkCadence
    && !residentMode
  ) {
    return null
  }

  return {
    preferredBlinkCadence,
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredGazeMode,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    residentMode: residentMode || undefined,
    signature: signature || undefined,
  }
}

export function resolveStageEmbodimentMetaAuthority(input: StageEmbodimentMetaAuthorityInput) {
  const authoritativeDigitalLife = input.digitalLife
    ?? normalizeAlicizationDigitalLifeEnvelope(input.embodimentScript?.digitalLife ?? null)
    ?? input.embodimentScript?.digitalLife
    ?? null
  const authoritativeVoice = authoritativeDigitalLife?.frames?.[0]?.voice
    ?? authoritativeDigitalLife?.voice
    ?? null
  const variationToken = authoritativeDigitalLife?.variationToken?.trim()
    || input.speechTimeline?.variationToken?.trim()
    || input.embodiment?.variationToken?.trim()
    || null
  const rendererHints = mergeStageEmbodimentRendererHints([
    input.speechTimeline?.segments?.[0]?.rendererHints ?? null,
    input.embodimentScript?.speechPlan.segments?.[0]?.rendererHints ?? null,
    input.embodimentScript?.state.rendererHints ?? null,
    authoritativeDigitalLife?.rendererHints ?? null,
    input.embodiment?.rendererHints ?? null,
  ])

  return {
    digitalLife: authoritativeDigitalLife ?? null,
    rendererHints,
    speechStyle: authoritativeDigitalLife?.speechStyle
      ?? input.embodiment?.speechStyle
      ?? null,
    variationToken,
    voice: authoritativeVoice,
  }
}

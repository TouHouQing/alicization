import type {
  AlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationResidentPerformanceSnapshot,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeSpineDigest,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'
import type { StageEmbodimentPerformanceContinuityState } from './stage-embodiment-performance-plan'
import type { StageEmbodimentAttentionPresenceState } from './use-stage-embodiment-attention'

import { deriveAlicizationResidentPerformanceSnapshot } from '@proj-alicization/stage-shared'

import { normalizeAlicizationPerformancePayload } from '../../stores/alicization-bridge'
import { buildAlicizationVisualPresenceStateFromSpineDigest } from '../../stores/alicization-visual-presence-spine'
import { buildStageEmbodimentPerformancePlan } from './stage-embodiment-performance-plan'
import { resolveResidentFacialCueBias } from './stage-resident-expression-aliases'

export interface ResolveStageEmbodimentResidentPerformanceInput {
  activePresence: StageEmbodimentAttentionPresenceState | null
  continuity?: StageEmbodimentPerformanceContinuityState
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null | undefined
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  presencePosture: StageEmbodimentPresencePostureState | null | undefined
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined
}

export interface StageEmbodimentResidentPerformanceResolution {
  performance: AlicizationDialoguePerformancePayload
  variationToken: string
}

interface SilentPresenceAuthorityFields {
  continuityMode: 'ambient-covision' | 'quiet-accompaniment' | 'active-dialogue' | 'protective-watch' | 'rest-withdrawal' | null
  currentBodyState: AlicizationPersistentPresenceAuthoritySnapshot['currentBodyState'] | null
  quietLineMs: number
}

function resolveRelationshipTimingNextLearningAction(
  action: string | null | undefined,
): 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold' | null {
  return action === 'record'
    || action === 'reflect'
    || action === 'verify'
    || action === 'revise'
    || action === 'internalize'
    || action === 'hold'
    ? action
    : null
}

function clamp01(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function sanitizeTokenText(raw: unknown, maxChars = 96) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function resolveSilentPresenceAuthority(
  visualPresenceState: AlicizationVisualPresenceStateSnapshot | null | undefined,
): SilentPresenceAuthorityFields {
  const currentBodyState = visualPresenceState?.currentBodyState
  const continuityMode = visualPresenceState?.continuityMode
  const quietLineMs = visualPresenceState?.quietLineMs

  return {
    currentBodyState: currentBodyState === 'sleep'
      || currentBodyState === 'idle'
      || currentBodyState === 'noticing'
      || currentBodyState === 'accompanying'
      || currentBodyState === 'speaking'
      || currentBodyState === 'warning'
      || currentBodyState === 'recovering'
      ? currentBodyState
      : null,
    continuityMode: continuityMode === 'ambient-covision'
      || continuityMode === 'quiet-accompaniment'
      || continuityMode === 'active-dialogue'
      || continuityMode === 'protective-watch'
      || continuityMode === 'rest-withdrawal'
      ? continuityMode
      : null,
    quietLineMs: typeof quietLineMs === 'number' && Number.isFinite(quietLineMs)
      ? Math.max(0, quietLineMs)
      : 0,
  }
}

function resolveEmbodiedPresence(input: ResolveStageEmbodimentResidentPerformanceInput) {
  return input.activePresence?.embodiedPresence
    ?? input.visualPresenceState?.privateThought?.embodiedPresence
    ?? 'none'
}

function resolveDerivationWatchMode(input: ResolveStageEmbodimentResidentPerformanceInput) {
  const watchMode = input.visualPresenceState?.watchMode ?? null
  if (watchMode === 'recovering')
    return watchMode
  return input.presencePosture?.mode === 'inspection'
    ? 'invited-inspection'
    : watchMode
}

function resolveFallbackResidentSnapshot(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): AlicizationResidentPerformanceSnapshot {
  const visualPresenceState = input.visualPresenceState
  const pulsePresence = input.activePresence?.source === 'presence-pulse'
    ? input.activePresence
    : null
  const thoughtConfidence = Number(visualPresenceState?.privateThought?.confidence ?? 0)
  const confidence = clamp01(Math.max(
    Number(input.activePresence?.confidence ?? 0),
    Number(input.presencePosture?.confidence ?? 0),
    Number(visualPresenceState?.attention?.confidence ?? 0),
    Number(visualPresenceState?.currentScene?.confidence ?? 0),
    thoughtConfidence,
  ))
  const updatedAt = Number.isFinite(visualPresenceState?.updatedAt)
    ? Number(visualPresenceState?.updatedAt)
    : Date.now()

  return deriveAlicizationResidentPerformanceSnapshot({
    watchMode: resolveDerivationWatchMode(input) ?? pulsePresence?.watchMode ?? null,
    currentBodyState: pulsePresence?.currentBodyState ?? null,
    continuityMode: pulsePresence?.continuityMode ?? null,
    currentInwardPreoccupation: pulsePresence?.currentInwardPreoccupation ?? null,
    quietLineMs: pulsePresence?.quietLineMs ?? null,
    attention: visualPresenceState?.attention,
    captureState: visualPresenceState?.captureState,
    currentScene: visualPresenceState?.currentScene,
    privateThought: {
      confidence,
      embodiedPresence: resolveEmbodiedPresence(input),
      emotionalTension: visualPresenceState?.privateThought?.emotionalTension ?? pulsePresence?.emotionalTension ?? null,
      rationaleTags: visualPresenceState?.privateThought?.rationaleTags ?? pulsePresence?.reasonTags ?? [],
      stance: visualPresenceState?.privateThought?.stance ?? pulsePresence?.stance ?? null,
      shouldSpeak: false,
    },
    relationshipTimingBias: input.digitalLifeSpine?.outcomeLearning?.summary
      || input.digitalLifeSpine?.outcomeLearning?.latestInflection
      || input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine
      ? {
          relationshipDoctrine: input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine
            ?? input.digitalLifeSpine?.outcomeLearning?.summary
            ?? null,
          latestInflection: input.digitalLifeSpine?.outcomeLearning?.latestInflection ?? null,
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: resolveRelationshipTimingNextLearningAction(
            input.digitalLifeSpine?.outcomeLearning?.nextLearningAction,
          ),
          evolutionMomentum: input.digitalLifeSpine?.outcomeLearning?.evolutionMomentum ?? null,
          learningReadiness: input.digitalLifeSpine?.outcomeLearning?.learningReadiness ?? null,
          source: 'outcome-learning',
        }
      : null,
    updatedAt,
  }, {
    fallbackUpdatedAt: updatedAt,
    source: 'browser-fallback',
  })
}

function resolveResidentSnapshot(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): AlicizationResidentPerformanceSnapshot {
  const published = input.visualPresenceState?.residentPerformance
  if (published)
    return published

  if (input.digitalLifeSpine) {
    const synthesized = buildAlicizationVisualPresenceStateFromSpineDigest({
      digest: input.digitalLifeSpine,
      previous: input.visualPresenceState ?? null,
    })
    const resident = synthesized.residentPerformance
    if (resident)
      return resident
  }

  return resolveFallbackResidentSnapshot(input)
}

function buildResidentVariationToken(
  input: ResolveStageEmbodimentResidentPerformanceInput,
  performance: AlicizationDialoguePerformancePayload,
) {
  const scene = input.visualPresenceState?.currentScene
  const privateThought = input.visualPresenceState?.privateThought
  const attentionTarget = input.visualPresenceState?.attention?.target
  const spineArchitecture = input.digitalLifeSpine?.architecture
  const spineMemory = input.digitalLifeSpine?.memory
  const spineProactive = input.digitalLifeSpine?.proactive

  return [
    'resident',
    sanitizeTokenText(input.visualPresenceState?.watchMode, 48) || 'mnemonic-passive',
    sanitizeTokenText(resolveEmbodiedPresence(input), 32) || 'none',
    sanitizeTokenText(input.presencePosture?.mode, 32) || 'idle',
    sanitizeTokenText(privateThought?.stance, 32) || 'observe',
    sanitizeTokenText(privateThought?.emotionalTension, 48) || 'calm-browse',
    sanitizeTokenText(scene?.scenario, 32) || 'general',
    sanitizeTokenText(scene?.contentKind, 32) || 'unknown',
    sanitizeTokenText(scene?.workloadKind, 32) || 'unknown',
    sanitizeTokenText(scene?.summary, 96)
    || sanitizeTokenText(attentionTarget?.title, 96)
    || sanitizeTokenText(attentionTarget?.appName, 48)
    || 'ambient',
    sanitizeTokenText(spineArchitecture?.operatingMode, 32) || 'none',
    sanitizeTokenText(spineArchitecture?.dominantSystem, 32) || 'none',
    sanitizeTokenText(spineMemory?.recallMode, 32) || 'none',
    sanitizeTokenText(spineProactive?.selectedAction, 32) || 'none',
    performance.baseEmotion,
    performance.delivery,
    String(performance.emphasis),
  ].join('|')
}

function shouldBiasSilentAccompanying(input: ResolveStageEmbodimentResidentPerformanceInput) {
  const visualPresenceState = input.visualPresenceState
  if (visualPresenceState?.residentPerformance)
    return false
  const authority = resolveSilentPresenceAuthority(visualPresenceState)

  return authority.currentBodyState === 'accompanying'
    && authority.continuityMode === 'quiet-accompaniment'
    && authority.quietLineMs >= 120_000
    && visualPresenceState?.privateThought?.shouldSpeak === false
}

function shouldBiasSilentRecovering(input: ResolveStageEmbodimentResidentPerformanceInput) {
  const visualPresenceState = input.visualPresenceState
  if (visualPresenceState?.residentPerformance)
    return false
  const authority = resolveSilentPresenceAuthority(visualPresenceState)

  return authority.currentBodyState === 'recovering'
    && authority.continuityMode === 'protective-watch'
    && visualPresenceState?.watchMode === 'recovering'
    && visualPresenceState?.privateThought?.shouldSpeak === false
}

function biasSilentResidentPerformance(input: ResolveStageEmbodimentResidentPerformanceInput, performance: AlicizationDialoguePerformancePayload) {
  if (shouldBiasSilentAccompanying(input)) {
    const biasedFacialCue = resolveResidentFacialCueBias({
      configuredCue: performance.facialCue,
      presencePosture: input.presencePosture,
      visualPresenceState: input.visualPresenceState,
    })

    return normalizeAlicizationPerformancePayload({
      ...performance,
      baseEmotion: performance.baseEmotion === 'neutral' ? 'neutral' : 'thinking',
      emotion: performance.baseEmotion === 'neutral' ? 'neutral' : 'thinking',
      facialCue: biasedFacialCue,
      delivery: performance.delivery === 'gentle' ? 'gentle' : 'calm',
      actionCue: 'steady_focus',
      emphasis: Math.min(performance.emphasis, 1),
    })
  }

  if (shouldBiasSilentRecovering(input)) {
    const baseEmotion = performance.baseEmotion === 'tired' ? 'tired' : 'concerned'

    return normalizeAlicizationPerformancePayload({
      ...performance,
      baseEmotion,
      emotion: baseEmotion,
      delivery: 'gentle',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      emphasis: 1,
    })
  }

  return performance
}

export function resolveStageEmbodimentResidentPerformance(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): StageEmbodimentResidentPerformanceResolution {
  const residentSnapshot = resolveResidentSnapshot(input)
  if (input.visualPresenceState?.residentPerformance) {
    const publishedPerformance = normalizeAlicizationPerformancePayload(residentSnapshot.performance)
    const planned = buildStageEmbodimentPerformancePlan({
      continuity: input.continuity,
      manifest: input.performanceManifest,
      performance: publishedPerformance,
    })

    return {
      performance: {
        ...publishedPerformance,
        facialCue: publishedPerformance.facialCue ?? planned.performance.facialCue ?? null,
        actionCue: publishedPerformance.actionCue ?? planned.performance.actionCue ?? null,
      },
      variationToken: sanitizeTokenText(residentSnapshot.signature, 240)
        || buildResidentVariationToken(
          input,
          publishedPerformance,
        ),
    }
  }

  const planned = buildStageEmbodimentPerformancePlan({
    continuity: input.continuity,
    manifest: input.performanceManifest,
    performance: biasSilentResidentPerformance(
      input,
      normalizeAlicizationPerformancePayload(residentSnapshot.performance),
    ),
  })

  return {
    performance: planned.performance,
    variationToken: sanitizeTokenText(residentSnapshot.signature, 240)
      || buildResidentVariationToken(input, planned.performance),
  }
}

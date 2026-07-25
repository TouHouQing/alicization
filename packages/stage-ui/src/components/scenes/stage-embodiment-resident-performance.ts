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
import { buildStageEmbodimentPerformancePlan } from './stage-embodiment-performance-plan'
import { normalizeResidentFacialCue } from './stage-resident-expression-aliases'

export interface ResolveStageEmbodimentResidentPerformanceInput {
  activePresence: StageEmbodimentAttentionPresenceState | null
  continuity?: StageEmbodimentPerformanceContinuityState
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null | undefined
  performanceManifest: CharacterPerformanceCapabilitiesManifest | null | undefined
  presencePosture: StageEmbodimentPresencePostureState | null | undefined
  visualPresenceState: ResidentVisualPresenceStateSnapshot | null | undefined
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

type ResidentVisualPresenceStateSnapshot = AlicizationVisualPresenceStateSnapshot

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
  visualPresenceState: ResidentVisualPresenceStateSnapshot | null | undefined,
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

function resolveStructuredSpineWatchMode(
  spine: AlicizationDigitalLifeSpineDigest,
): AlicizationVisualPresenceStateSnapshot['watchMode'] {
  const watchMode = spine.runtime.watchMode ?? spine.continuitySignal?.watchMode
  return watchMode === 'symbiotic-vision'
    || watchMode === 'invited-inspection'
    || watchMode === 'recovering'
    ? watchMode
    : 'mnemonic-passive'
}

function resolveStructuredSpineScenario(
  spine: AlicizationDigitalLifeSpineDigest,
): NonNullable<AlicizationVisualPresenceStateSnapshot['currentScene']>['scenario'] {
  const scenario = spine.runtime.sceneScenario ?? spine.continuitySignal?.sceneScenario
  return scenario === 'coding' || scenario === 'media' || scenario === 'late-night-care'
    ? scenario
    : 'general'
}

function resolveStructuredSpineStance(
  spine: AlicizationDigitalLifeSpineDigest,
): AlicizationResidentPerformanceSnapshot['stance'] {
  const selectedAction = spine.proactive?.selectedAction ?? spine.runtime.selectedAction
  if (selectedAction === 'warn')
    return 'warn'
  if (selectedAction === 'speak' || selectedAction === 'whisper')
    return 'accompany'
  if (selectedAction === 'hover' || selectedAction === 'recheck')
    return 'nudge'
  if (spine.architecture?.dominantSystem === 'dialogue' && spine.architecture.operatingMode === 'speaking')
    return 'accompany'
  return 'observe'
}

function resolveStructuredSpineEmbodiedPresence(
  spine: AlicizationDigitalLifeSpineDigest,
): AlicizationResidentPerformanceSnapshot['embodiedPresence'] {
  const preferredPresence = spine.runtime.preferredPresence
    ?? spine.proactive?.preferredPresence
    ?? spine.continuitySignal?.preferredPresence
  if (
    preferredPresence === 'glance'
    || preferredPresence === 'attentive'
    || preferredPresence === 'hesitant'
    || preferredPresence === 'concerned'
  ) {
    return preferredPresence
  }

  const stance = resolveStructuredSpineStance(spine)
  if (stance === 'warn' || stance === 'care')
    return 'concerned'
  if (stance === 'nudge')
    return 'hesitant'
  return resolveStructuredSpineWatchMode(spine) === 'mnemonic-passive' ? 'glance' : 'attentive'
}

function resolveStructuredSpineEmotionalTension(
  spine: AlicizationDigitalLifeSpineDigest,
): AlicizationResidentPerformanceSnapshot['emotionalTension'] {
  const scenario = resolveStructuredSpineScenario(spine)
  if (scenario === 'late-night-care')
    return 'late-night-drain'
  if (scenario === 'coding') {
    return resolveStructuredSpineStance(spine) === 'warn'
      || spine.architecture?.operatingMode === 'acting'
      ? 'tense-debug'
      : 'focused-flow'
  }
  if (spine.architecture?.dominantSystem === 'dialogue' && spine.architecture.operatingMode === 'speaking')
    return 'soft-covision'
  if (resolveStructuredSpineWatchMode(spine) === 'recovering')
    return 'restless-switching'
  return 'calm-browse'
}

function resolveStructuredSpineResidentSnapshot(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): AlicizationResidentPerformanceSnapshot | null {
  const spine = input.digitalLifeSpine
  if (!spine)
    return null

  const watchMode = resolveStructuredSpineWatchMode(spine)
  const scenario = resolveStructuredSpineScenario(spine)
  const stance = resolveStructuredSpineStance(spine)
  const shouldSpeak = spine.proactive?.shouldSpeak === true
  const currentBodyState = watchMode === 'recovering'
    ? 'recovering'
    : shouldSpeak
      ? 'speaking'
      : stance === 'warn'
        ? 'warning'
        : watchMode === 'symbiotic-vision'
          ? 'accompanying'
          : 'idle'
  const continuityMode = watchMode === 'recovering'
    ? 'protective-watch'
    : shouldSpeak
      ? 'active-dialogue'
      : watchMode === 'symbiotic-vision'
        ? 'quiet-accompaniment'
        : spine.architecture?.dominantSystem === 'dialogue'
          ? 'active-dialogue'
          : 'ambient-covision'
  const confidence = clamp01(Math.max(
    Number(spine.proactive?.confidence ?? 0),
    Number(input.activePresence?.confidence ?? 0),
    Number(input.presencePosture?.confidence ?? 0),
  ))
  const updatedAt = Number.isFinite(spine.runtime.updatedAt)
    ? Number(spine.runtime.updatedAt)
    : Date.now()

  return deriveAlicizationResidentPerformanceSnapshot({
    watchMode,
    currentBodyState,
    continuityMode,
    currentInwardPreoccupation: null,
    quietLineMs: 0,
    currentScene: {
      workloadKind: scenario === 'coding'
        ? 'coding'
        : scenario === 'media'
          ? 'media'
          : 'unknown',
      contentKind: 'unknown',
      scenario,
      summary: null,
      confidence,
    },
    privateThought: {
      confidence,
      embodiedPresence: resolveStructuredSpineEmbodiedPresence(spine),
      emotionalTension: resolveStructuredSpineEmotionalTension(spine),
      rationaleTags: [],
      stance,
      shouldSpeak,
    },
    relationshipTimingBias: null,
    updatedAt,
  }, {
    fallbackUpdatedAt: updatedAt,
    source: 'browser-fallback',
  })
}

function resolveFallbackResidentSnapshot(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): AlicizationResidentPerformanceSnapshot {
  const visualPresenceState = input.visualPresenceState
  const pulsePresence = input.activePresence?.source === 'presence-pulse'
    ? input.activePresence
    : null
  const silentAuthority = resolveSilentPresenceAuthority(visualPresenceState)
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
  const auditReasonTags = Array.from(new Set([
    ...(visualPresenceState?.privateThought?.rationaleTags ?? []),
    ...(pulsePresence?.reasonTags ?? []),
  ]))

  const derived = deriveAlicizationResidentPerformanceSnapshot({
    watchMode: resolveDerivationWatchMode(input) ?? pulsePresence?.watchMode ?? null,
    currentBodyState: pulsePresence?.currentBodyState ?? silentAuthority.currentBodyState,
    continuityMode: pulsePresence?.continuityMode ?? silentAuthority.continuityMode,
    currentInwardPreoccupation: pulsePresence?.currentInwardPreoccupation
      ?? visualPresenceState?.currentInwardPreoccupation
      ?? null,
    quietLineMs: pulsePresence?.quietLineMs ?? silentAuthority.quietLineMs,
    attention: visualPresenceState?.attention,
    captureState: visualPresenceState?.captureState,
    currentScene: visualPresenceState?.currentScene,
    privateThought: {
      confidence,
      embodiedPresence: resolveEmbodiedPresence(input),
      emotionalTension: visualPresenceState?.privateThought?.emotionalTension
        ?? pulsePresence?.emotionalTension
        ?? null,
      rationaleTags: [],
      stance: visualPresenceState?.privateThought?.stance
        ?? pulsePresence?.stance
        ?? null,
      shouldSpeak: false,
    },
    relationshipTimingBias: null,
    updatedAt,
  }, {
    fallbackUpdatedAt: updatedAt,
    source: 'browser-fallback',
  })

  return {
    ...derived,
    reasonTags: auditReasonTags,
  }
}

export function resolveResidentSnapshot(
  input: ResolveStageEmbodimentResidentPerformanceInput,
): AlicizationResidentPerformanceSnapshot {
  const published = input.visualPresenceState?.residentPerformance
  if (published)
    return published

  const structuredSpineResident = resolveStructuredSpineResidentSnapshot(input)
  if (structuredSpineResident)
    return structuredSpineResident

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
        facialCue: normalizeResidentFacialCue(publishedPerformance.facialCue)
          ?? planned.performance.facialCue
          ?? null,
        actionCue: publishedPerformance.actionCue
          ?? planned.performance.actionCue
          ?? null,
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
    performance: normalizeAlicizationPerformancePayload(residentSnapshot.performance),
  })

  return {
    performance: planned.performance,
    variationToken: sanitizeTokenText(residentSnapshot.signature, 240)
      || buildResidentVariationToken(input, planned.performance),
  }
}

import type {
  AlicizationEmotionalKernelSnapshot,
  AlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationResidentPerformanceSnapshot,
  StageEmbodimentPresencePostureState,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmotionalTension,
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

interface EmotionalKernelResidentFallbackBias {
  continuityMode: SilentPresenceAuthorityFields['continuityMode']
  currentBodyState: SilentPresenceAuthorityFields['currentBodyState']
  quietLineMs: number | null
  companionshipMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  embodiedPresence: AlicizationVisualPresenceStateSnapshot['privateThought'] extends infer T
    ? T extends { embodiedPresence?: infer P } ? P | null : null
    : null
  emotionalTension: AlicizationEmotionalTension | null
  relationshipTimingBias: NonNullable<Parameters<typeof deriveAlicizationResidentPerformanceSnapshot>[0]['relationshipTimingBias']> | null
  rationaleTags: string[]
  stance: AlicizationVisualPresenceStateSnapshot['privateThought'] extends infer T
    ? T extends { stance?: infer S } ? S | null : null
    : null
}

type ResidentVisualPresenceStateSnapshot = AlicizationVisualPresenceStateSnapshot & {
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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

function normalizeResidentEmotionalTension(
  tension: string | null | undefined,
): AlicizationEmotionalTension | null {
  if (
    tension === 'tense-debug'
    || tension === 'focused-flow'
    || tension === 'soft-covision'
    || tension === 'late-night-drain'
    || tension === 'restless-switching'
    || tension === 'calm-browse'
  ) {
    return tension
  }

  if (tension === 'rest-protective')
    return 'late-night-drain'

  if (tension === 'repair-before-closeness' || tension === 'measured-return')
    return 'soft-covision'

  return null
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

function resolveEmotionalKernelResidentFallbackBias(
  visualPresenceState: ResidentVisualPresenceStateSnapshot | null | undefined,
): EmotionalKernelResidentFallbackBias | null {
  const privateThought = visualPresenceState?.privateThought
  if (!privateThought)
    return null

  const reasonTags = (privateThought.rationaleTags ?? []).filter((tag: string) => typeof tag === 'string' && tag.trim().length > 0)
  const rawTension = typeof privateThought.emotionalTension === 'string'
    ? privateThought.emotionalTension.trim().toLowerCase()
    : ''
  const normalizedTension = rawTension === 'repair-before-closeness'
    || rawTension === 'rest-protective'
    || rawTension === 'measured-return'
    ? rawTension
    : null
  const isRepairBeforeCloseness = rawTension.includes('repair-before-closeness')
    || reasonTags.includes('repair-before-closeness')
  const isRestProtective = rawTension.includes('rest-protective')
    || reasonTags.includes('rest-protective')
    || reasonTags.includes('rest-protective-companionship')
  const isMeasuredReturn = rawTension.includes('measured-return')
    || reasonTags.includes('measured-return')
  const isSameHerInwardCarry = reasonTags.includes('continuity-inward-carry')
    || reasonTags.includes('continuity')
  const isQuietCompanionship = reasonTags.includes('quiet-companionship')
    || privateThought.stance === 'accompany'

  if (!isRepairBeforeCloseness && !isRestProtective && !isMeasuredReturn && !isSameHerInwardCarry && !isQuietCompanionship)
    return null

  return {
    continuityMode: isRepairBeforeCloseness || isRestProtective
      ? 'protective-watch'
      : isMeasuredReturn || isSameHerInwardCarry || isQuietCompanionship
        ? 'quiet-accompaniment'
        : null,
    currentBodyState: isRepairBeforeCloseness || isRestProtective
      ? 'recovering'
      : isMeasuredReturn || isSameHerInwardCarry || isQuietCompanionship
        ? 'accompanying'
        : null,
    quietLineMs: isRepairBeforeCloseness
      ? 210_000
      : isRestProtective
        ? 240_000
        : isSameHerInwardCarry
          ? 150_000
          : isMeasuredReturn
            ? 180_000
            : 120_000,
    companionshipMode: isRepairBeforeCloseness
      ? 'repair-before-closeness'
      : isRestProtective
        ? 'rest-protective'
        : isSameHerInwardCarry
          ? 'quiet-companionship'
          : isMeasuredReturn
            ? 'measured-return'
            : isQuietCompanionship
              ? 'quiet-companionship'
              : null,
    embodiedPresence: visualPresenceState?.privateThought?.embodiedPresence
      ?? (
        normalizedTension === 'measured-return'
          ? 'attentive'
          : isSameHerInwardCarry
            ? 'attentive'
            : normalizedTension === 'rest-protective'
              ? 'concerned'
              : null
      ),
    emotionalTension: visualPresenceState?.privateThought?.emotionalTension
      ? normalizeResidentEmotionalTension(visualPresenceState.privateThought.emotionalTension)
      : (
          normalizedTension === 'repair-before-closeness'
            ? 'soft-covision'
            : normalizedTension === 'rest-protective'
              ? 'late-night-drain'
              : normalizedTension === 'measured-return'
                ? 'soft-covision'
                : isSameHerInwardCarry
                  ? 'soft-covision'
                  : null
        ),
    relationshipTimingBias: isRepairBeforeCloseness
      ? {
          relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
          latestInflection: 'The return holds better when repair lands before closeness widens again.',
          burdenLine: 'Do not crowd the host while the room is still settling.',
          trustMeaning: 'Trust holds when the return stays repair-first and lower-pressure.',
          nextLearningAction: 'internalize',
          evolutionMomentum: 0.74,
          learningReadiness: 0.68,
          source: 'self-evolution',
        }
      : isRestProtective
        ? {
            relationshipDoctrine: 'Keep caring present, but let rest protection hold the line inward until the body has more room again.',
            latestInflection: 'The line stays more believable when care remains visible without turning fatigue into eager re-entry.',
            burdenLine: 'Do not ask the host or the body for more than this quieter line can hold.',
            trustMeaning: 'Trust deepens when care keeps watch without overrunning rest.',
            nextLearningAction: 'internalize',
            evolutionMomentum: 0.76,
            learningReadiness: 0.64,
            source: 'self-evolution',
          }
        : isMeasuredReturn
          ? {
              relationshipDoctrine: 'The opening should keep more room and the return should stay lower-pressure until the seam softens naturally.',
              latestInflection: 'The room holds better when the return stays slower before closeness widens again.',
              burdenLine: 'Do not crowd the host with eager re-entry.',
              trustMeaning: 'Measured warmth is trusted when the timing stays lower-pressure.',
              nextLearningAction: 'internalize',
              evolutionMomentum: 0.7,
              learningReadiness: 0.66,
              source: 'self-evolution',
            }
          : isSameHerInwardCarry
            ? {
                relationshipDoctrine: 'Keep companionship quietly continuous on one inward continuity line before widening outward.',
                latestInflection: 'The host trusted the quieter inward continuity carry more than a wider outward reopening.',
                burdenLine: 'Do not ask this quieter line to widen before it has settled as the same living self.',
                trustMeaning: 'Trust deepens when the same inward line stays present without rushing into a warmer reopen.',
                nextLearningAction: 'internalize',
                evolutionMomentum: 0.68,
                learningReadiness: 0.62,
                source: 'self-evolution',
              }
            : null,
    rationaleTags: Array.from(new Set([
      ...(privateThought.rationaleTags ?? []),
      ...(isRepairBeforeCloseness ? ['repair-before-closeness'] : []),
      ...(isRestProtective ? ['rest-protective'] : []),
      ...(isMeasuredReturn ? ['measured-return', 'durable-relationship-rhythm'] : []),
      ...(isSameHerInwardCarry ? ['continuity-inward-carry', 'quiet-companionship'] : []),
      ...reasonTags,
    ])),
    stance: privateThought.stance
      ?? (isRepairBeforeCloseness || isRestProtective || isMeasuredReturn || isSameHerInwardCarry || isQuietCompanionship ? 'accompany' : null),
  }
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
  const emotionalKernelBias = resolveEmotionalKernelResidentFallbackBias(visualPresenceState)
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
  const autobiographicalRelationshipDoctrine = input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine ?? null
  const autobiographicalIdentityNarrative = input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative ?? null
  const autobiographicalTimingLead = autobiographicalRelationshipDoctrine || autobiographicalIdentityNarrative

  return deriveAlicizationResidentPerformanceSnapshot({
    watchMode: resolveDerivationWatchMode(input) ?? pulsePresence?.watchMode ?? null,
    currentBodyState: pulsePresence?.currentBodyState ?? emotionalKernelBias?.currentBodyState ?? null,
    continuityMode: pulsePresence?.continuityMode ?? emotionalKernelBias?.continuityMode ?? null,
    currentInwardPreoccupation: pulsePresence?.currentInwardPreoccupation ?? null,
    quietLineMs: pulsePresence?.quietLineMs ?? emotionalKernelBias?.quietLineMs ?? null,
    attention: visualPresenceState?.attention,
    captureState: visualPresenceState?.captureState,
    currentScene: visualPresenceState?.currentScene,
    privateThought: {
      confidence,
      embodiedPresence: resolveEmbodiedPresence(input),
      emotionalTension: visualPresenceState?.privateThought?.emotionalTension
        ?? pulsePresence?.emotionalTension
        ?? emotionalKernelBias?.emotionalTension
        ?? null,
      rationaleTags: visualPresenceState?.privateThought?.rationaleTags
        ?? pulsePresence?.reasonTags
        ?? emotionalKernelBias?.rationaleTags
        ?? [],
      stance: visualPresenceState?.privateThought?.stance
        ?? pulsePresence?.stance
        ?? emotionalKernelBias?.stance
        ?? null,
      shouldSpeak: false,
    },
    relationshipTimingBias: emotionalKernelBias?.relationshipTimingBias?.relationshipDoctrine?.includes('Repair should settle before closeness expands')
      ? emotionalKernelBias.relationshipTimingBias
      : input.digitalLifeSpine?.outcomeLearning?.summary
        || input.digitalLifeSpine?.outcomeLearning?.latestInflection
        || autobiographicalTimingLead
        ? {
            relationshipDoctrine: autobiographicalTimingLead
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
            source: input.digitalLifeSpine?.outcomeLearning?.summary || input.digitalLifeSpine?.outcomeLearning?.latestInflection
              ? 'outcome-learning'
              : autobiographicalTimingLead
                ? 'autobiographical-self'
                : null,
          }
        : emotionalKernelBias?.relationshipTimingBias ?? null,
    updatedAt,
  }, {
    fallbackUpdatedAt: updatedAt,
    source: 'browser-fallback',
  })
}

export function resolveResidentSnapshot(
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

function hasAutobiographicalSameHerContinuityCarry(
  input: ResolveStageEmbodimentResidentPerformanceInput,
) {
  const cueText = [
    input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative,
    input.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine,
  ]
    .filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0)
    .join(' ')
    .toLowerCase()

  return cueText.includes('continuity drift risk')
    || cueText.includes('generic assistant shell')
    || cueText.includes('project-summary voice')
    || cueText.includes('detached status talk')
    || cueText.includes('continuity drift')
    || cueText.includes('drift rather than completion')
    || cueText.includes('continuity line')
    || cueText.includes('continuous identity')
    || cueText.includes('continuous her')
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

function shouldBiasAutobiographicalSameHerResident(
  input: ResolveStageEmbodimentResidentPerformanceInput,
) {
  const resident = input.visualPresenceState?.residentPerformance
  if (!resident)
    return false
  if (resident.performance.baseEmotion !== 'thinking' && resident.performance.baseEmotion !== 'concerned' && resident.performance.baseEmotion !== 'tired')
    return false
  if (resident.performance.delivery !== 'gentle')
    return false
  if (resident.performance.actionCue !== 'steady_focus')
    return false

  return hasAutobiographicalSameHerContinuityCarry(input)
}

function resolveAutobiographicalSameHerResidentCue(
  input: ResolveStageEmbodimentResidentPerformanceInput,
  residentSnapshot: AlicizationResidentPerformanceSnapshot,
  cue: string | null | undefined,
) {
  if (
    cue
    && cue !== 'focus'
    && cue !== 'observe_focus'
  ) {
    return cue
  }

  if (
    hasAutobiographicalSameHerContinuityCarry(input)
    && residentSnapshot.performance.delivery === 'gentle'
    && (residentSnapshot.performance.baseEmotion === 'thinking' || residentSnapshot.performance.baseEmotion === 'concerned' || residentSnapshot.performance.baseEmotion === 'tired')
  ) {
    return 'soft-gaze'
  }

  return cue ?? null
}

function resolveAutobiographicalSameHerFallbackCue(
  input: ResolveStageEmbodimentResidentPerformanceInput,
) {
  if (!hasAutobiographicalSameHerContinuityCarry(input))
    return null

  return 'soft-gaze'
}

function resolveAutobiographicalSameHerActionCue(
  input: ResolveStageEmbodimentResidentPerformanceInput,
  residentSnapshot: AlicizationResidentPerformanceSnapshot,
  cue: string | null | undefined,
) {
  if (
    !hasAutobiographicalSameHerContinuityCarry(input)
    || residentSnapshot.performance.delivery !== 'gentle'
    || (
      residentSnapshot.performance.baseEmotion !== 'thinking'
      && residentSnapshot.performance.baseEmotion !== 'concerned'
      && residentSnapshot.performance.baseEmotion !== 'tired'
    )
  ) {
    return cue ?? null
  }

  if (!cue || cue === 'observe_focus' || cue === 'inspect_focus')
    return 'steady_focus'

  return cue
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

function shouldBiasSilentRepairBeforeCloseness(input: ResolveStageEmbodimentResidentPerformanceInput) {
  const visualPresenceState = input.visualPresenceState
  if (visualPresenceState?.residentPerformance)
    return false

  const privateThought = visualPresenceState?.privateThought
  if (!privateThought || privateThought.shouldSpeak !== false)
    return false

  return (privateThought.emotionalTension?.includes('repair-before-closeness') ?? false)
    || (privateThought.rationaleTags?.includes('repair-before-closeness') ?? false)
}

function shouldBiasSilentRestProtective(input: ResolveStageEmbodimentResidentPerformanceInput) {
  const visualPresenceState = input.visualPresenceState
  if (visualPresenceState?.residentPerformance)
    return false

  const privateThought = visualPresenceState?.privateThought
  if (!privateThought || privateThought.shouldSpeak !== false)
    return false

  const emotionalKernel = visualPresenceState?.emotionalKernel
  const emotionalKernelTags = emotionalKernel?.reasonTags ?? []

  return (privateThought.emotionalTension?.includes('rest-protective') ?? false)
    || (privateThought.rationaleTags?.includes('rest-protective') ?? false)
    || emotionalKernel?.dominantEmotion === 'rest-protective-companionship'
    || emotionalKernel?.embodimentTone === 'rest-protective'
    || emotionalKernelTags.includes('rest-protective')
}

function biasSilentResidentPerformance(input: ResolveStageEmbodimentResidentPerformanceInput, performance: AlicizationDialoguePerformancePayload) {
  if (shouldBiasSilentAccompanying(input)) {
    const biasedFacialCue = resolveResidentFacialCueBias({
      configuredCue: performance.facialCue,
      presencePosture: input.presencePosture,
      visualPresenceState: input.visualPresenceState,
    })
    const lowerPressureTiming = (
      input.visualPresenceState?.privateThought?.rationaleTags?.includes('timing:lower-pressure-opening')
      || input.visualPresenceState?.privateThought?.rationaleTags?.includes('measured-return')
      || input.digitalLifeSpine?.outcomeLearning?.summary?.includes('lower-pressure')
      || input.digitalLifeSpine?.outcomeLearning?.latestInflection?.includes('lower-pressure')
      || input.digitalLifeSpine?.outcomeLearning?.dominantTrajectory?.includes('lower-pressure')
    ) ?? false

    return normalizeAlicizationPerformancePayload({
      ...performance,
      baseEmotion: performance.baseEmotion === 'neutral' ? 'neutral' : 'thinking',
      emotion: performance.baseEmotion === 'neutral' ? 'neutral' : 'thinking',
      facialCue: biasedFacialCue === 'focus' && lowerPressureTiming
        ? 'soft-gaze'
        : biasedFacialCue,
      delivery: performance.delivery === 'gentle' ? 'gentle' : 'calm',
      actionCue: 'steady_focus',
      emphasis: Math.min(performance.emphasis, 1),
    })
  }

  if (shouldBiasAutobiographicalSameHerResident(input)) {
    const softenedFacialCue = resolveResidentFacialCueBias({
      configuredCue: performance.facialCue,
      presencePosture: input.presencePosture,
      visualPresenceState: input.visualPresenceState,
    })

    return normalizeAlicizationPerformancePayload({
      ...performance,
      facialCue: softenedFacialCue === 'focus' ? 'soft-gaze' : softenedFacialCue,
    })
  }

  if (shouldBiasSilentRepairBeforeCloseness(input)) {
    const baseEmotion = performance.baseEmotion === 'tired'
      || performance.baseEmotion === 'concerned'
      ? performance.baseEmotion
      : 'thinking'

    return normalizeAlicizationPerformancePayload({
      ...performance,
      baseEmotion,
      emotion: baseEmotion,
      delivery: 'gentle',
      facialCue: 'soft-gaze',
      actionCue: 'idle_settle',
      emphasis: Math.min(performance.emphasis, 1),
    })
  }

  if (shouldBiasSilentRestProtective(input)) {
    const baseEmotion = performance.baseEmotion === 'tired'
      || performance.baseEmotion === 'concerned'
      ? performance.baseEmotion
      : 'tired'

    return normalizeAlicizationPerformancePayload({
      ...performance,
      baseEmotion,
      emotion: baseEmotion,
      delivery: 'gentle',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
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

    const residentFacialCue = resolveAutobiographicalSameHerResidentCue(
      input,
      residentSnapshot,
      publishedPerformance.facialCue,
    ) ?? resolveAutobiographicalSameHerFallbackCue(input)
    const safeActionCue = hasAutobiographicalSameHerContinuityCarry(input)
      ? resolveAutobiographicalSameHerActionCue(
          input,
          residentSnapshot,
          publishedPerformance.actionCue ?? residentSnapshot.performance.actionCue ?? null,
        )
      : residentSnapshot.performance.actionCue ?? planned.performance.actionCue ?? null

    return {
      performance: {
        ...publishedPerformance,
        facialCue: residentFacialCue ?? planned.performance.facialCue ?? null,
        actionCue: safeActionCue,
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
  const lowerPressureTiming = (
    input.visualPresenceState?.privateThought?.rationaleTags?.includes('timing:lower-pressure-opening')
    || input.visualPresenceState?.privateThought?.rationaleTags?.includes('measured-return')
    || input.digitalLifeSpine?.outcomeLearning?.summary?.includes('lower-pressure')
    || input.digitalLifeSpine?.outcomeLearning?.latestInflection?.includes('lower-pressure')
    || input.digitalLifeSpine?.outcomeLearning?.dominantTrajectory?.includes('lower-pressure')
  ) ?? false

  return {
    performance: {
      ...planned.performance,
      facialCue: shouldBiasSilentAccompanying(input) && lowerPressureTiming && planned.performance.facialCue === 'focus'
        ? 'soft-gaze'
        : planned.performance.facialCue,
    },
    variationToken: sanitizeTokenText(residentSnapshot.signature, 240)
      || buildResidentVariationToken(input, planned.performance),
  }
}

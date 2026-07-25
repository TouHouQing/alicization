import type {
  AlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationVisualWatchMode,
} from '@proj-alicization/stage-shared'

import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationEmotionalTransitionDecaySnapshot } from './emotional-ledger'

import { pickAlicizationTransparentRuntimeFailureText } from './runtime-failure-evidence'

interface CreateAlicizationBodyKernelOptions {
  now?: () => number
}

interface AlicizationBodyKernelReduceInput {
  sustainedFocusMs: number
  watchMode: AlicizationVisualWatchMode
  shouldSpeak: boolean
  activeConversation: boolean
  relationshipPressure: number
}

interface AlicizationBodyKernelApplyInput {
  now: number
  previousState: AlicizationVisualPresenceStateSnapshot
  candidateState: AlicizationVisualPresenceStateSnapshot & {
    emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
  }
  activeConversation: boolean
}

function readBodyKernelEmotionalTransitionDecay(state: AlicizationVisualPresenceStateSnapshot) {
  return (state as {
    emotionalTransitionDecay?: AlicizationEmotionalTransitionDecaySnapshot | null
  }).emotionalTransitionDecay ?? null
}

function hasActiveBodyDrivingEmotionalTransitionDecay(
  state: AlicizationVisualPresenceStateSnapshot,
  embodimentTone: AlicizationEmotionalTransitionDecaySnapshot['embodimentTone'],
) {
  const decay = readBodyKernelEmotionalTransitionDecay(state)
  return decay?.phase !== 'release'
    && decay?.shouldDriveEmbodiment === true
    && decay.embodimentTone === embodimentTone
}

function resolveBodyKernelDynamicInwardPreoccupation(state: AlicizationVisualPresenceStateSnapshot) {
  return pickAlicizationTransparentRuntimeFailureText([
    state.currentInwardPreoccupation,
    state.emotionalKernel?.why,
    state.privateThought?.thoughtText,
  ], 180) || null
}

function hasMeasuredReturnContinuityAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null
  const cadenceMode = state.affectiveResidue?.relationshipCadence?.cadenceMode ?? null
  const cadenceReasonTags = state.affectiveResidue?.relationshipCadence?.reasonTags ?? []

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'measured-return')
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'lower-pressure'
    || cadenceMode === 'measured-return'
    || cadenceMode === 'cooldown'
    || emotionalKernel?.embodimentTone === 'measured-return'
    || (
      emotionalKernel?.initiativeMode === 'hold'
      && emotionalKernel?.memoryRecallMode === 'self-continuity'
      && emotionalKernel?.embodimentTone === 'nearby-soft'
    )
    || emotionalKernel?.initiativeMode === 'observe'
    || emotionalKernel?.dominantEmotion === 'measured-companionship'
    || emotionalKernel?.reasonTags?.includes('measured-return')
    || emotionalKernel?.reasonTags?.includes('self-continuity')
    || thoughtTags.includes('measured-return')
    || consciousFrameTags.includes('memory-deliberation-cadence:measured-return')
    || consciousFrameTags.includes('memory-deliberation-cadence:lower-pressure')
    || consciousFrameTags.includes('continuity-arc:hold-for-opening')
    || consciousFrameTags.includes('continuity-arc:gentle-reopen')
    || residentPerformanceTags.includes('measured-return')
    || cadenceReasonTags.includes('relationship-cadence:measured-return')
}

function hasRepairBeforeClosenessAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null
  const affectiveResidue = state.affectiveResidue ?? null
  const cadenceMode = affectiveResidue?.relationshipCadence?.cadenceMode ?? null
  const shouldDelayWarmth = affectiveResidue?.relationshipCadence?.shouldDelayWarmth === true
  const cadenceReasonTags = affectiveResidue?.relationshipCadence?.reasonTags ?? []

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'repair-before-closeness')
    || continuityRestraint === 'repair-before-closeness'
    || cadenceMode === 'repair'
    || (affectiveResidue?.dominantResidueKind === 'repair' && shouldDelayWarmth)
    || emotionalKernel?.embodimentTone === 'repair-before-closeness'
    || emotionalKernel?.initiativeMode === 'repair'
    || emotionalKernel?.dominantEmotion === 'repair-tension'
    || emotionalKernel?.reasonTags?.includes('repair-before-closeness')
    || thoughtTags.includes('repair-before-closeness')
    || consciousFrameTags.includes('memory-deliberation-cadence:repair-before-closeness')
    || residentPerformanceTags.includes('repair-before-closeness')
    || cadenceReasonTags.includes('relationship-cadence:repair-before-closeness')
}

function hasDurableSelfCoreProjectionEmbodimentAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const projection = state.personStateProjection ?? null
  const sourceTags = projection?.selfContinuityAuthority?.sourceTags ?? []
  return sourceTags.includes('durable-self-core')
    && (
      projection?.restrained === true
      || projection?.cautious === true
      || projection?.relationshipPosture === 'restrained'
    )
}

function hasRestProtectiveCompanionshipAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const continuityRestraint = state.initiative?.continuityRestraint
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const residentPerformanceTags = state.residentPerformance?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'rest-protective')
    || continuityRestraint === 'rest-protective'
    || emotionalKernel?.embodimentTone === 'rest-protective'
    || emotionalKernel?.initiativeMode === 'rest-guard'
    || emotionalKernel?.memoryRecallMode === 'rest-protective-presence'
    || emotionalKernel?.dominantEmotion === 'rest-protective-companionship'
    || emotionalKernel?.reasonTags?.includes('rest-protective')
    || emotionalKernel?.reasonTags?.includes('rest-protective-companionship')
    || thoughtTags.includes('rest-protective')
    || thoughtTags.includes('rest-protective-companionship')
    || consciousFrameTags.includes('memory-deliberation-cadence:rest-protective')
    || residentPerformanceTags.includes('rest-protective')
}

function hasGuardedCareConfirmationBoundaryAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const thoughtTags = state.privateThought?.rationaleTags ?? []
  const consciousFrameTags = state.currentConsciousFrame?.reasonTags ?? []
  const emotionalKernel = state.emotionalKernel ?? null

  return (
    emotionalKernel?.dominantEmotion === 'guarded-care'
    || (
      emotionalKernel?.initiativeMode === 'hold'
      && emotionalKernel?.memoryRecallMode === 'self-continuity'
      && emotionalKernel?.embodimentTone === 'protective-watch'
    )
    || (emotionalKernel?.reasonTags ?? []).includes('execution-safety-gate')
    || (emotionalKernel?.reasonTags ?? []).includes('confirmation-boundary')
    || (emotionalKernel?.reasonTags ?? []).includes('wait-for-confirmation')
    || consciousFrameTags.includes('execution-safety-gate:confirmation-boundary')
    || thoughtTags.includes('execution-safety-gate')
  )
}

export function createAlicizationBodyKernel(options: CreateAlicizationBodyKernelOptions = {}) {
  const now = options.now ?? Date.now

  function deriveSustainedFocusMs(input: {
    now: number
    state: AlicizationVisualPresenceStateSnapshot
  }) {
    const sceneBeganAt = Number(input.state.currentScene?.beganAt)
    if (!Number.isFinite(sceneBeganAt))
      return 0
    return Math.max(0, input.now - sceneBeganAt)
  }

  return {
    reduce(input: AlicizationBodyKernelReduceInput): AlicizationPersistentPresenceAuthoritySnapshot & {
      updatedAt: number
    } {
      const quietCoVision = input.watchMode === 'symbiotic-vision'
        && input.sustainedFocusMs >= 120_000
        && !input.shouldSpeak
        && !input.activeConversation
        && input.relationshipPressure >= 0.2
      const recoveringSilentWatch = input.watchMode === 'recovering'
        && !input.shouldSpeak
        && !input.activeConversation

      if (quietCoVision) {
        return {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          quietLineMs: input.sustainedFocusMs,
          currentInwardPreoccupation: null,
          updatedAt: now(),
        }
      }

      if (recoveringSilentWatch) {
        return {
          currentBodyState: 'recovering',
          continuityMode: 'protective-watch',
          quietLineMs: Math.max(0, input.sustainedFocusMs),
          currentInwardPreoccupation: null,
          updatedAt: now(),
        }
      }

      if (input.activeConversation) {
        return {
          currentBodyState: 'idle',
          continuityMode: 'active-dialogue',
          quietLineMs: Math.max(0, input.sustainedFocusMs),
          currentInwardPreoccupation: null,
          updatedAt: now(),
        }
      }

      return {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: Math.max(0, input.sustainedFocusMs),
        currentInwardPreoccupation: null,
        updatedAt: now(),
      }
    },

    applyToVisualPresenceState(input: AlicizationBodyKernelApplyInput): AlicizationVisualPresenceStateSnapshot {
      const authority = this.reduce({
        sustainedFocusMs: deriveSustainedFocusMs({
          now: input.now,
          state: input.candidateState,
        }),
        watchMode: input.candidateState.watchMode,
        shouldSpeak: input.candidateState.privateThought?.shouldSpeak === true,
        activeConversation: input.activeConversation,
        relationshipPressure: Math.max(0, Math.min(1, Number(
          (
            (input.candidateState.relationshipModel?.receptivity ?? 0)
            + (input.candidateState.relationshipModel?.sharedAttentionTrust ?? 0)
            + (input.candidateState.relationshipModel?.reciprocityExpectation ?? 0)
          ) / 3,
        ) || 0)),
      })
      const measuredReturnContinuityAuthority = hasMeasuredReturnContinuityAuthority(input.candidateState)
      const repairBeforeClosenessAuthority = hasRepairBeforeClosenessAuthority(input.candidateState)
      const restProtectiveCompanionshipAuthority = hasRestProtectiveCompanionshipAuthority(input.candidateState)
      const guardedCareConfirmationBoundaryAuthority = hasGuardedCareConfirmationBoundaryAuthority(input.candidateState)
      const durableSelfCoreProjectionEmbodimentAuthority = hasDurableSelfCoreProjectionEmbodimentAuthority(input.candidateState)
      const continuityAuthority = repairBeforeClosenessAuthority
        ? {
            currentBodyState: 'recovering' as const,
            continuityMode: 'protective-watch' as const,
            quietLineMs: Math.max(authority.quietLineMs, 180_000),
          }
        : restProtectiveCompanionshipAuthority
          ? {
              currentBodyState: 'recovering' as const,
              continuityMode: 'protective-watch' as const,
              quietLineMs: Math.max(authority.quietLineMs, 240_000),
            }
          : guardedCareConfirmationBoundaryAuthority
            ? {
                currentBodyState: 'recovering' as const,
                continuityMode: 'protective-watch' as const,
                quietLineMs: Math.max(authority.quietLineMs, 180_000),
              }
            : durableSelfCoreProjectionEmbodimentAuthority
              ? {
                  currentBodyState: 'accompanying' as const,
                  continuityMode: 'quiet-accompaniment' as const,
                  quietLineMs: Math.max(authority.quietLineMs, 180_000),
                }
              : measuredReturnContinuityAuthority
                ? {
                    currentBodyState: 'accompanying' as const,
                    continuityMode: 'quiet-accompaniment' as const,
                    quietLineMs: Math.max(authority.quietLineMs, 180_000),
                  }
                : null

      const { emotionalTransitionDecay: _emotionalTransitionDecay, ...persistentCandidateState } = input.candidateState
      const dynamicInwardPreoccupation = resolveBodyKernelDynamicInwardPreoccupation(input.candidateState)

      return {
        ...persistentCandidateState,
        currentBodyState: continuityAuthority?.currentBodyState ?? authority.currentBodyState,
        continuityMode: continuityAuthority?.continuityMode ?? authority.continuityMode,
        quietLineMs: continuityAuthority?.quietLineMs ?? authority.quietLineMs,
        currentInwardPreoccupation: dynamicInwardPreoccupation,
        updatedAt: input.now,
      }
    },
  }
}

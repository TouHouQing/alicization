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
  const emotionalKernel = state.emotionalKernel ?? null
  const cadenceMode = state.affectiveResidue?.relationshipCadence?.cadenceMode ?? null

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'measured-return')
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
}

function hasRepairBeforeClosenessAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const emotionalKernel = state.emotionalKernel ?? null
  const affectiveResidue = state.affectiveResidue ?? null
  const cadenceMode = affectiveResidue?.relationshipCadence?.cadenceMode ?? null
  const shouldDelayWarmth = affectiveResidue?.relationshipCadence?.shouldDelayWarmth === true

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'repair-before-closeness')
    || cadenceMode === 'repair'
    || (affectiveResidue?.dominantResidueKind === 'repair' && shouldDelayWarmth)
    || emotionalKernel?.embodimentTone === 'repair-before-closeness'
    || emotionalKernel?.initiativeMode === 'repair'
    || emotionalKernel?.dominantEmotion === 'repair-tension'
}

function hasRestrainedPersonStateEmbodimentAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const projection = state.personStateProjection ?? null
  return projection?.restrained === true
    || projection?.cautious === true
    || projection?.relationshipPosture === 'restrained'
}

function hasRestProtectiveCompanionshipAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const emotionalKernel = state.emotionalKernel ?? null

  return hasActiveBodyDrivingEmotionalTransitionDecay(state, 'rest-protective')
    || emotionalKernel?.embodimentTone === 'rest-protective'
    || emotionalKernel?.initiativeMode === 'rest-guard'
    || emotionalKernel?.memoryRecallMode === 'rest-protective-presence'
    || emotionalKernel?.dominantEmotion === 'rest-protective-companionship'
}

function hasGuardedCareConfirmationBoundaryAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const emotionalKernel = state.emotionalKernel ?? null

  return emotionalKernel?.dominantEmotion === 'guarded-care'
    || (
      emotionalKernel?.initiativeMode === 'hold'
      && emotionalKernel?.memoryRecallMode === 'self-continuity'
      && emotionalKernel?.embodimentTone === 'protective-watch'
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
      const restrainedPersonStateEmbodimentAuthority = hasRestrainedPersonStateEmbodimentAuthority(input.candidateState)
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
            : restrainedPersonStateEmbodimentAuthority
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

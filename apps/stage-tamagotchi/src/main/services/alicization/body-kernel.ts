import type {
  AlicizationPersistentPresenceAuthoritySnapshot,
  AlicizationVisualWatchMode,
} from '@proj-alicization/stage-shared'

import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

import { deriveAlicizationAutobiographicalPersonaSummary } from './personality-continuity-state'

interface CreateAlicizationBodyKernelOptions {
  now?: () => number
}

interface AlicizationBodyKernelReduceInput {
  sustainedFocusMs: number
  watchMode: AlicizationVisualWatchMode
  shouldSpeak: boolean
  activeConversation: boolean
  relationshipPressure: number
  personaAuthoritySummary?: string | null
  personaKernelSummary?: string | null
}

interface AlicizationBodyKernelApplyInput {
  now: number
  previousState: AlicizationVisualPresenceStateSnapshot
  candidateState: AlicizationVisualPresenceStateSnapshot
  activeConversation: boolean
}

function sanitizeBodyKernelText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function hasMeasuredReturnContinuityAuthority(state: AlicizationVisualPresenceStateSnapshot) {
  const emotionalKernel = state.emotionalKernel ?? null
  const privateThought = state.privateThought ?? null
  const initiative = state.initiative ?? null
  const sceneSummary = sanitizeBodyKernelText(state.currentScene?.summary, 320).toLowerCase()
  const emotionalWhy = sanitizeBodyKernelText(emotionalKernel?.why, 320).toLowerCase()

  return emotionalKernel?.embodimentTone === 'measured-return'
    || emotionalKernel?.dominantEmotion === 'measured-companionship'
    || emotionalKernel?.reasonTags?.includes('measured-return')
    || privateThought?.dominantTradeoff === 'same-line-measured-return'
    || initiative?.actionEcologyMode === 'silent-presence'
    || emotionalWhy.includes('lower-pressure same-line return')
    || sceneSummary.includes('same-her closure')
}

function deriveMeasuredReturnPreoccupation(state: AlicizationVisualPresenceStateSnapshot) {
  return sanitizeBodyKernelText(state.emotionalKernel?.why, 320)
    || sanitizeBodyKernelText(state.initiative?.why, 240)
    || sanitizeBodyKernelText(state.currentScene?.summary, 240)
    || 'lower-pressure same-line return'
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
      const personaAuthoritySummary = typeof input.personaAuthoritySummary === 'string'
        ? input.personaAuthoritySummary.trim().replace(/\s+/g, ' ').slice(0, 160)
        : ''
      const personaKernelSummary = typeof input.personaKernelSummary === 'string'
        ? input.personaKernelSummary.trim().replace(/\s+/g, ' ').slice(0, 160)
        : ''
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
          currentInwardPreoccupation: personaKernelSummary
            ? `host sustained focus with persona kernel ${personaKernelSummary}`
            : personaAuthoritySummary
              ? `host sustained focus with ${personaAuthoritySummary}`
              : 'host sustained focus',
          updatedAt: now(),
        }
      }

      if (recoveringSilentWatch) {
        return {
          currentBodyState: 'recovering',
          continuityMode: 'protective-watch',
          quietLineMs: Math.max(0, input.sustainedFocusMs),
          currentInwardPreoccupation: personaKernelSummary
            ? `quiet recovery under watch with persona kernel ${personaKernelSummary}`
            : personaAuthoritySummary
              ? `quiet recovery under watch with ${personaAuthoritySummary}`
              : 'quiet recovery under watch',
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
      const personaAuthoritySummary = input.candidateState.autobiographicalSelf?.relationshipDoctrine ?? null
      const personaKernelSummary = deriveAlicizationAutobiographicalPersonaSummary(input.candidateState.autobiographicalSelf ?? null)
      const sustainedFocusMs = deriveSustainedFocusMs({
        now: input.now,
        state: input.candidateState,
      })
      const shouldSpeak = input.candidateState.privateThought?.shouldSpeak === true
      if (!input.activeConversation && !shouldSpeak && hasMeasuredReturnContinuityAuthority(input.candidateState)) {
        return {
          ...input.candidateState,
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          quietLineMs: sustainedFocusMs,
          currentInwardPreoccupation: deriveMeasuredReturnPreoccupation(input.candidateState),
          updatedAt: input.now,
        }
      }

      const authority = this.reduce({
        sustainedFocusMs,
        watchMode: input.candidateState.watchMode,
        shouldSpeak,
        activeConversation: input.activeConversation,
        relationshipPressure: Math.max(0, Math.min(1, Number(
          (
            (input.candidateState.relationshipModel?.receptivity ?? 0)
            + (input.candidateState.relationshipModel?.sharedAttentionTrust ?? 0)
            + (input.candidateState.relationshipModel?.reciprocityExpectation ?? 0)
          ) / 3,
        ) || 0)),
        personaAuthoritySummary,
        personaKernelSummary,
      })

      return {
        ...input.candidateState,
        currentBodyState: authority.currentBodyState,
        continuityMode: authority.continuityMode,
        quietLineMs: authority.quietLineMs,
        currentInwardPreoccupation: authority.currentInwardPreoccupation,
        updatedAt: input.now,
      }
    },
  }
}

import type {
  AlicizationActionEcologySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationAutonomySnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationDurabilityPulseSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveDecision,
  AlicizationProactiveReasonCode,
  AlicizationProactiveScenario,
  AlicizationRelationshipModelSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationRuntimeChannelId,
  AlicizationRuntimeSnapshot,
} from './alicization-runtime-architecture'
import type { AlicizationContinuityDeliberation } from './continuity-deliberation'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationPersonaAuthorityInfluence,
  AlicizationPersonalityContinuityStateSnapshot,
} from './personality-continuity-state'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { deriveAlicizationRuntimeProactiveSignals } from './alicization-active-loop'
import { deriveAlicizationPersonaAuthorityInfluence } from './personality-continuity-state'
import { deriveProactiveCadenceSignal } from './proactive-cadence'
import { inferScenarioFromContext } from './proactive-layered-context'
import {
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

export const proactivePolicyVersion = 'epoch4.1-v1'

export interface AlicizationProactivePerceptionSignals {
  activeAttentionAnchor: boolean
  attentionAnchorAgeMs: number | null
  attentionAnchorConfidence: number
  attentionAnchorWorkloadKind: AlicizationProactiveLayeredContext['workload']['kind']
  attentionAnchorCanOverrideScenario: boolean
  recentObservationCount: number
  invitedInspectionActive: boolean
}

export interface AlicizationProactivePolicyEvaluation extends AlicizationProactiveDecision {
  feedbackBias: number
  consideredSignals: string[]
  ignoredSignals: string[]
  whyNow: string
  whyNotLater: string
  presenceOnlyHold: boolean
}

interface AlicizationPersonaProactiveBias {
  preferSilence: boolean
  prefersDirectReconnect: boolean
  guardianCareBias: boolean
  baseScoreDelta: number
  thresholdDelta: number
  cooldownMultiplier: number
  forcedStyle: AlicizationProactiveDecision['style'] | null
  reasonCodes: AlicizationProactiveReasonCode[]
}

interface AlicizationExplicitContinuityRestraintBias {
  source: 'initiative' | 'runtime-digest' | 'memory-deliberation' | 'memory-os' | 'self-revision' | null
  restraint: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | null
  preferredTiming: string | null
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  guardAgainstGenericShell: boolean
  safetyGateRestraint: boolean
  resumeConfirmationBoundary: boolean
  scoreDelta: number
  thresholdDelta: number
}

interface AlicizationSelfRevisionProjectStateContinuityRestraint {
  active: boolean
  restraint: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | null
  guardAgainstGenericShell: boolean
}

interface AlicizationAffectiveResidueProactiveBias {
  restraint: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | null
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  scoreDelta: number
  thresholdDelta: number
}

interface AlicizationRuntimeContinuityArcProactiveBias {
  arcStage: 'hold-for-opening' | 'gentle-reopen' | 'same-thread-continuation' | null
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  scoreDelta: number
  thresholdDelta: number
}

interface AlicizationHabitPolicyProactiveBias {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  scoreDelta: number
  thresholdDelta: number
  reasonCodes: AlicizationProactiveReasonCode[]
}

interface AlicizationMotiveAgendaProactiveBias {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  scoreDelta: number
  thresholdDelta: number
  reasonCodes: AlicizationProactiveReasonCode[]
}

interface AlicizationLongHorizonMemoryProactiveBias {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  quieterOrRoomMaking: boolean
  gentleMemoryLed: boolean
  scoreDelta: number
  thresholdDelta: number
  explanation: string
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function clampMs(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function buildLongHorizonMemoryProactiveText(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null) {
  return [
    longHorizonMemory?.rememberedPlanSummary,
    longHorizonMemory?.rememberedConstraintSummary,
    longHorizonMemory?.rememberedPreferenceSummary,
    longHorizonMemory?.dominantCueSummary,
    longHorizonMemory?.summary,
    ...(longHorizonMemory?.anchorFacts ?? [])
      .filter(item =>
        sanitizeText(item.predicate, 64).toLowerCase() === 'initiative-strategy-carry'
        || sanitizeText(item.factId, 96).toLowerCase().includes('initiative-strategy-carry'),
      )
      .flatMap(item => [item.object, item.summary]),
  ]
    .map(value => sanitizeText(value, 260).toLowerCase())
    .filter(Boolean)
    .join(' | ')
}

function initiativeCarriesSameHerWhy(raw: unknown) {
  const text = sanitizeText(raw, 420).toLowerCase()
  if (!text)
    return false
  return includesAny(text, [
    'same unfinished digital-life',
    'same unfinished phase 1 digital-life',
    'same phase 1 digital life',
    'generic assistant nudge',
    'generic assistant shell',
    'same living line',
    'same-her',
    'one continuous her',
    '同一个她',
    '同一条生命线',
  ])
}

function initiativeCarriesCorrectedSamePersonContinuity(raw: unknown) {
  const text = sanitizeText(raw, 420).toLowerCase()
  if (!text)
    return false
  return includesAny(text, [
    'corrected same-person continuity',
    'same-person continuity',
    'not progress pressure',
    'progress pressure',
    'protective-continuity',
    'unfinishedness',
    '不是催进度',
  ])
}

function describeProactiveEmbodimentCompanionContinuityCue(raw: unknown) {
  const text = sanitizeText(raw, 420)
  const normalized = text.toLowerCase()
  if (!normalized)
    return ''

  if (
    normalized.includes('holding together through face, lipsync, and voice together')
    || normalized.includes('still-voiced face-and-mouth line')
  ) {
    return 'still-voiced face-and-mouth line 还在托住 same-her continuity，body and motion 还要继续 rejoin 到 full cross-modal closure'
  }

  if (
    normalized.includes('holding together through motion, lipsync, and voice together')
    || normalized.includes('still-voiced motion-and-mouth line')
  ) {
    return 'still-voiced motion-and-mouth line 还在托住 same-her continuity，body and face 还要继续 rejoin 到 full cross-modal closure'
  }

  return ''
}

function sanitizeProactiveEmbodimentBlinkCadence(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'normal' || normalized === 'linger' || normalized === 'quiet'
    ? normalized
    : null
}

function sanitizeProactiveEmbodimentGazeMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'steady' || normalized === 'soften' || normalized === 'drift'
    ? normalized
    : null
}

function sanitizeProactiveEmbodimentPauseMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeProactiveEmbodimentLipsyncMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function sanitizeProactiveEmbodimentVoiceMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizeProactiveEmbodimentPacingMode(raw: unknown) {
  const normalized = sanitizeText(raw, 32).toLowerCase()
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function describeProactiveEmbodimentCadenceCue(input: {
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  const preferredBlinkCadence = sanitizeProactiveEmbodimentBlinkCadence(input.preferredBlinkCadence)
  const preferredGazeMode = sanitizeProactiveEmbodimentGazeMode(input.preferredGazeMode)
  const preferredPauseMode = sanitizeProactiveEmbodimentPauseMode(input.preferredPauseMode)
  const preferredLipsyncMode = sanitizeProactiveEmbodimentLipsyncMode(input.preferredLipsyncMode)
  const preferredVoiceMode = sanitizeProactiveEmbodimentVoiceMode(input.preferredVoiceMode)
  const preferredPacingMode = sanitizeProactiveEmbodimentPacingMode(input.preferredPacingMode)
  const clauses = [
    preferredPauseMode === 'longer'
      ? '停顿更长一点'
      : preferredPauseMode === 'natural'
        ? '停顿更自然一点'
        : null,
    preferredLipsyncMode === 'restrained'
      ? '嘴型更克制一点'
      : preferredLipsyncMode === 'matched'
        ? '更贴合一点的嘴型'
        : null,
    preferredVoiceMode === 'lower-pressure'
      ? '更低压一点的语气'
      : preferredVoiceMode === 'even'
        ? '更平一点的语气'
        : null,
    preferredPacingMode === 'slower'
      ? '慢一点的回接节奏'
      : preferredPacingMode === 'natural'
        ? '更自然一点的回接节奏'
        : null,
    preferredGazeMode === 'steady'
      ? '更稳一点的视线'
      : preferredGazeMode === 'soften'
        ? '更软一点的视线'
        : null,
    preferredBlinkCadence === 'linger'
      ? '慢一点的眨眼节律'
      : preferredBlinkCadence === 'quiet'
        ? '更安静一点的眨眼节律'
        : null,
  ].filter((value): value is string => Boolean(value))

  return clauses.length > 0
    ? `这次回接还要保持${clauses.join('、')}`
    : ''
}

function appendProactiveEmbodimentCadenceCue(reason: string, cadenceCue: string) {
  const normalizedReason = reason.trim()
  const normalizedCadenceCue = cadenceCue.trim()
  if (!normalizedCadenceCue)
    return normalizedReason
  if (!normalizedReason)
    return `${normalizedCadenceCue}。`
  return /[。！？.!?]$/.test(normalizedReason)
    ? `${normalizedReason} 同时，${normalizedCadenceCue}。`
    : `${normalizedReason}。同时，${normalizedCadenceCue}。`
}

function derivePersonaProactiveBias(input: {
  personalityAuthority: AlicizationPersonaAuthorityInfluence
  rawPersonality?: { initiativeBaseline?: { silenceReconnect?: string | null, comfortStyle?: string | null } | null, identityKernel?: { relationshipPosture?: string | null, initiativeStyle?: string | null } | null } | null
  scenario: AlicizationProactiveScenario
}): AlicizationPersonaProactiveBias {
  const identityKernel = input.rawPersonality?.identityKernel ?? null
  const initiativeBaseline = input.rawPersonality?.initiativeBaseline ?? null
  const reasonCodes: AlicizationProactiveReasonCode[] = []

  const observantStyle = identityKernel?.initiativeStyle === 'observant'
  const highParticipationStyle = identityKernel?.initiativeStyle === 'high-participation'
  const directReconnect = initiativeBaseline?.silenceReconnect === 'direct-approach'
  const holdReconnect = initiativeBaseline?.silenceReconnect === 'hold'
  const guardianCare = identityKernel?.relationshipPosture === 'guardian'
    || initiativeBaseline?.comfortStyle === 'take-charge'

  if (observantStyle)
    reasonCodes.push('persona-observant-style')
  if (highParticipationStyle)
    reasonCodes.push('persona-high-participation-style')
  if (directReconnect)
    reasonCodes.push('persona-direct-reconnect')
  if (holdReconnect)
    reasonCodes.push('persona-silence-hold')
  if (guardianCare)
    reasonCodes.push('persona-guardian-care')

  const preferSilence = observantStyle
    || holdReconnect
    || input.personalityAuthority.roomBias >= 0.22
    || input.personalityAuthority.preferredProactiveStyle === 'silent-observe'

  let forcedStyle: AlicizationProactiveDecision['style'] | null = null
  if (preferSilence)
    forcedStyle = 'silent-observe'
  else if (guardianCare && input.scenario === 'late-night-care')
    forcedStyle = 'gentle-care'

  return {
    preferSilence,
    prefersDirectReconnect: directReconnect || highParticipationStyle || input.personalityAuthority.directnessBias >= 0.26,
    guardianCareBias: guardianCare,
    baseScoreDelta: Number((
      (preferSilence ? -0.18 : 0)
      + ((directReconnect || highParticipationStyle) ? 0.16 : 0)
      + (guardianCare ? 0.1 : 0)
      + (input.personalityAuthority.warmthBias - input.personalityAuthority.roomBias) * 0.08
    ).toFixed(3)),
    thresholdDelta: Number((
      (preferSilence ? 0.12 : 0)
      - ((directReconnect || highParticipationStyle) ? 0.08 : 0)
      - (guardianCare ? 0.04 : 0)
    ).toFixed(3)),
    cooldownMultiplier: Number((
      (preferSilence ? 1.18 : 1)
      * ((directReconnect || highParticipationStyle) ? 0.82 : 1)
      * (guardianCare ? 0.9 : 1)
    ).toFixed(3)),
    forcedStyle,
    reasonCodes,
  }
}

function buildBaseCooldownMs(scenario: AlicizationProactiveScenario) {
  if (scenario === 'coding')
    return 18 * 60_000
  if (scenario === 'media')
    return 20 * 60_000
  if (scenario === 'late-night-care')
    return 12 * 60_000
  return 10 * 60_000
}

function buildBaseThreshold(scenario: AlicizationProactiveScenario) {
  if (scenario === 'coding')
    return 0.62
  if (scenario === 'media')
    return 0.66
  if (scenario === 'late-night-care')
    return 0.62
  return 0.58
}

function inferScenarioFromPerception(input: {
  workloadKind: AlicizationProactiveLayeredContext['workload']['kind']
  lateNight: boolean
  lateNightActiveMinutes: number
  fatigue: number
}) {
  if (
    input.lateNight
    && (input.lateNightActiveMinutes >= 90 || input.fatigue >= 55)
    && (input.workloadKind === 'game' || input.workloadKind === 'media')
  ) {
    return 'late-night-care' as const
  }
  if (input.workloadKind === 'coding' || input.workloadKind === 'terminal')
    return 'coding' as const
  if (input.workloadKind === 'media')
    return 'media' as const
  return null
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function carriesExecutionSafetyGateRestraint(text: string) {
  return includesAny(text, [
    'execution-safety-gate',
    'blocked-dispatch-restraint',
    'execution safety restraint',
    'blocked-before-dispatch',
  ])
  && includesAny(text, [
    'confirmation=required',
    'implicit-or-explicit-confirmation-required',
    'no-process-started',
    'permission=none',
  ])
}

function carriesExecutionResumeConfirmationBoundary(text: string) {
  return includesAny(text, [
    'execution-resume-confirmation',
    'resumeconfirmation',
    'resume confirmation',
    'host-confirmed-before-redispatch',
    'resume-before-dispatch',
  ])
  && includesAny(text, [
    'host-confirmed',
    'approval=host-confirmed',
    'process-not-yet-restarted',
    'bounded confirmation boundary',
    'confirmation boundary',
    'not permanent',
    'not as permanent',
    'not permanent autonomous permission',
  ])
}

function deriveRuntimeContinuityArcProactiveBias(
  runtimeDigest?: AlicizationRuntimeSnapshot | null,
): AlicizationRuntimeContinuityArcProactiveBias {
  const arcStage = sanitizeText(runtimeDigest?.projectState?.continuityArcStage, 64).toLowerCase()
  const continuityCue = sanitizeText(runtimeDigest?.projectState?.continuityCue, 220).toLowerCase()
  const memoryClosureSummary = sanitizeText(runtimeDigest?.projectState?.memoryClosureSummary, 220).toLowerCase()
  const primaryOpenLoop = sanitizeText(runtimeDigest?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(runtimeDigest?.projectState?.nextClosureTarget, 220).toLowerCase()
  const longRunningSameThreadPressure = includesAny(
    [continuityCue, memoryClosureSummary, primaryOpenLoop, nextClosureTarget].join(' | '),
    [
      'multiple reopenings',
      'reopened multiple times',
      'accumulated dialogue heat',
      'later same-thread reopenings',
      'same callback line through repeated measured-return reopenings',
      'same digital life',
      'same still-open closure work',
      '多次 reopened',
      '多次重开',
      '多次回到同一条线',
      '对话热度累积',
    ],
  )

  if (
    arcStage === 'hold-for-opening'
    || (!arcStage && includesAny(continuityCue, [
      'hold-for-opening',
      'same line',
      'same-line',
      'reopen gently later',
      'wait for a later opening',
      'reopen gently',
      '先留白',
      '同一条生命线',
      '同一条线',
      '等更自然的 opening',
      '慢一点接回去',
      '别立刻把温度放大',
    ]))
  ) {
    return {
      arcStage: 'hold-for-opening',
      preferLowerPressure: true,
      forceSilentObserve: true,
      scoreDelta: -0.14,
      thresholdDelta: 0.1,
    }
  }

  if (arcStage === 'gentle-reopen') {
    return {
      arcStage: 'gentle-reopen',
      preferLowerPressure: true,
      forceSilentObserve: false,
      scoreDelta: -0.08,
      thresholdDelta: 0.06,
    }
  }

  if (arcStage === 'same-thread-continuation') {
    return {
      arcStage: 'same-thread-continuation',
      preferLowerPressure: true,
      forceSilentObserve: true,
      scoreDelta: longRunningSameThreadPressure ? -0.14 : -0.1,
      thresholdDelta: longRunningSameThreadPressure ? 0.12 : 0.08,
    }
  }

  return {
    arcStage: null,
    preferLowerPressure: false,
    forceSilentObserve: false,
    scoreDelta: 0,
    thresholdDelta: 0,
  }
}

function deriveHabitPolicyProactiveBias(
  habitPolicy?: AlicizationHabitPolicySnapshot | null,
): AlicizationHabitPolicyProactiveBias {
  if (!habitPolicy) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      reasonCodes: [],
    }
  }

  const dominantMode = sanitizeText(habitPolicy.dominantMode, 80).toLowerCase()
  const suggestedStyleCap = sanitizeText(habitPolicy.suggestedStyleCap, 80).toLowerCase()
  const suggestedPresenceCap = sanitizeText(habitPolicy.suggestedPresenceCap, 80).toLowerCase()
  const narrative = (habitPolicy.narrative ?? [])
    .map(item => sanitizeText(item, 120).toLowerCase())
    .join(' | ')

  const returnWithProof = dominantMode === 'return-with-proof'
    || narrative.includes('return-open-loop-via-recheck')
  const repairBeforeFluency = dominantMode === 'repair-before-fluency'
    || habitPolicy.requiresGroundingBeforeSurface
  const quietCompanionship = dominantMode === 'light-touch-companionship'
    || habitPolicy.prefersQuietCompanionship
  const restProtection = dominantMode === 'protect-rest-window'
    || habitPolicy.protectsRestWindow

  const preferLowerPressure = quietCompanionship
    || returnWithProof
    || repairBeforeFluency
    || restProtection
    || suggestedStyleCap === 'silent-observe'
    || suggestedPresenceCap === 'hesitant'
    || suggestedPresenceCap === 'glance'
    || suggestedPresenceCap === 'concerned'

  const forceSilentObserve = suggestedStyleCap === 'silent-observe'
    || returnWithProof
    || repairBeforeFluency
    || restProtection

  const reasonCodes: AlicizationProactiveReasonCode[] = []
  if (quietCompanionship)
    reasonCodes.push('habit-policy-quiet-companionship')
  if (returnWithProof)
    reasonCodes.push('habit-policy-return-with-proof')
  if (repairBeforeFluency)
    reasonCodes.push('habit-policy-repair-before-fluency')
  if (restProtection)
    reasonCodes.push('habit-policy-rest-protection')

  return {
    preferLowerPressure,
    forceSilentObserve,
    scoreDelta: Number((
      (quietCompanionship ? -0.1 : 0)
      + (returnWithProof ? -0.14 : 0)
      + (repairBeforeFluency ? -0.16 : 0)
      + (restProtection ? -0.18 : 0)
    ).toFixed(3)),
    thresholdDelta: Number((
      (quietCompanionship ? 0.06 : 0)
      + (returnWithProof ? 0.08 : 0)
      + (repairBeforeFluency ? 0.1 : 0)
      + (restProtection ? 0.12 : 0)
    ).toFixed(3)),
    reasonCodes,
  }
}

function deriveMotiveAgendaProactiveBias(
  motiveEngine?: AlicizationMotiveEngineSnapshot | null,
): AlicizationMotiveAgendaProactiveBias {
  const backgroundAgendas = asArray(motiveEngine?.backgroundAgendas)
  const agenda = backgroundAgendas[0] ?? null
  if (!agenda) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      reasonCodes: [],
    }
  }

  const summary = sanitizeText(agenda.summary, 220).toLowerCase()
  const sourceTags = asArray(agenda.sourceTags).map(tag => sanitizeText(tag, 64).toLowerCase())
  const autobiographicalProjectCarry = sourceTags.includes('autobiographical-self')
    && sourceTags.includes('project-state-carry')
    && agenda.kind === 'return-open-loop'
  const sameLivingLine = includesAny(summary, [
    'same living line',
    'same living bond line',
    'unfinished phase 1 digital-life closure',
    'detached project bookkeeping',
  ])

  if (!autobiographicalProjectCarry || !sameLivingLine) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      reasonCodes: [],
    }
  }

  return {
    preferLowerPressure: true,
    forceSilentObserve: true,
    scoreDelta: -0.14,
    thresholdDelta: 0.1,
    reasonCodes: ['project-phase1-life-loop-open', 'project-next-closure-pressure'],
  }
}

function deriveLongHorizonMemoryProactiveBias(
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null,
): AlicizationLongHorizonMemoryProactiveBias {
  if (!longHorizonMemory) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      quieterOrRoomMaking: false,
      gentleMemoryLed: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      explanation: '',
    }
  }

  const combined = buildLongHorizonMemoryProactiveText(longHorizonMemory)
  if (!combined) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      quieterOrRoomMaking: false,
      gentleMemoryLed: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      explanation: '',
    }
  }

  const quieterOrRoomMaking = includesAny(combined, [
    'leave more room',
    'clearer opening',
    'fresher opening',
    'wait for a clearer opening',
    'wait for a fresher opening',
    'quieter timing',
    'quiet until',
    'less eager',
    'later opening',
    '先留白',
    '留一点 room',
    '等更自然的 opening',
  ])
  const gentleMemoryLed = includesAny(combined, [
    'gentle',
    'memory-led',
    'still receiving',
    'accepted or continued',
    'received without obvious resistance',
    'accepted',
    'received',
    '被接住',
  ])

  if (!quieterOrRoomMaking && !gentleMemoryLed) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      quieterOrRoomMaking: false,
      gentleMemoryLed: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      explanation: '',
    }
  }

  return {
    preferLowerPressure: true,
    forceSilentObserve: true,
    quieterOrRoomMaking,
    gentleMemoryLed,
    scoreDelta: quieterOrRoomMaking ? -0.16 : -0.12,
    thresholdDelta: quieterOrRoomMaking ? 0.12 : 0.08,
    explanation: quieterOrRoomMaking
      ? '长期记忆已经把这条 follow-up timing 固化成 leave room / clearer opening 的节奏，所以这次 opening 先继续 lower-pressure。'
      : '长期记忆已经把这条 reopening 固化成 gentle、memory-led、still receiving 的节奏，所以这次 opening 先继续 lower-pressure。',
  }
}

function deriveSelfEvolutionProactiveBias(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      correctedSamePersonSettling: false,
      quieterEmbodimentSettling: false,
      metabolizedSameThreadSettling: false,
    }
  }

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 180).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 180).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 180).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 180).toLowerCase()
  const dominantTrajectory = sanitizeText(selfEvolution.dominantTrajectory, 160).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 220).toLowerCase()
  const combined = `${relationshipDoctrine} ${burdenLine} ${trustMeaning} ${latestInflection} ${dominantTrajectory} ${relationshipCadenceSummary}`
  const correctedSamePersonSettling = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'keep the corrected same-person continuity authoritative',
    'before any status recap',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettling = includesAny(combined, [
    'keep embodiment quieter',
    'embodiment quieter',
    'body quieter',
    'quieter embodiment',
    'before making the return feel fully settled',
    'before the return feel fully settled',
    'quieter settling beat',
    '先把身体收稳',
    '身体更安静',
  ])
  const metabolizedSameThreadSettling = includesAny(relationshipCadenceSummary, [
    'same-thread memory lead',
    'same thread memory lead',
    'stronger same-thread memory',
    'stronger same thread memory',
    'temporary noise fade',
    'temporary noise fades',
    'let temporary noise fade',
    'fade instead of retaking the line',
  ])
  && includesAny(relationshipCadenceSummary, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'same-person continuity',
    'same person continuity',
  ])
  const preferLowerPressure = includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure', 'steadiness before closeness'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure', 'eager reopening'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'steadiness before closeness'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager'])
    || includesAny(dominantTrajectory, ['lower-pressure'])
    || metabolizedSameThreadSettling

  return {
    preferLowerPressure: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling || metabolizedSameThreadSettling,
    forceSilentObserve: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling || metabolizedSameThreadSettling,
    scoreDelta: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling || metabolizedSameThreadSettling ? -0.12 : 0,
    thresholdDelta: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling || metabolizedSameThreadSettling ? 0.08 : 0,
    correctedSamePersonSettling,
    quieterEmbodimentSettling,
    metabolizedSameThreadSettling,
  }
}

function deriveAutobiographicalSelfProactiveBias(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null) {
  if (!autobiographicalSelf) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
      correctedSamePersonSettling: false,
      quieterEmbodimentSettling: false,
    }
  }

  const relationshipDoctrine = sanitizeText(autobiographicalSelf.relationshipDoctrine, 180).toLowerCase()
  const latestInflection = sanitizeText(autobiographicalSelf.latestInflection, 180).toLowerCase()
  const identityNarrative = sanitizeText(autobiographicalSelf.identityNarrative, 180).toLowerCase()
  const combined = `${relationshipDoctrine} ${latestInflection} ${identityNarrative}`
  const correctedSamePersonSettling = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    'same living line',
    '同一个人连续性',
    '纠正后的同一人格连续性',
  ])
  const quieterEmbodimentSettling = includesAny(combined, [
    'keep embodiment quieter',
    'embodiment quieter',
    'body quieter',
    'quieter embodiment',
    'more steadily',
    'more slowly',
    '先把身体收稳',
    '身体更安静',
  ])
  const preferLowerPressure = includesAny(relationshipDoctrine, [
    'leave more room',
    'more room',
    'slower return',
    'lower-pressure',
    'steadiness before closeness',
    'bounded-return',
    'measured-return',
  ])
  || includesAny(latestInflection, [
    'slower',
    'steadier',
    'lower-pressure',
    'less eager',
    'same-person continuity',
    'same person continuity',
    'measured-return',
  ])
  || includesAny(identityNarrative, [
    'return more slowly',
    'return more steadily',
    'less eagerly',
    'same living line',
    '同一个她',
  ])

  return {
    preferLowerPressure: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling,
    forceSilentObserve: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling,
    scoreDelta: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling ? -0.1 : 0,
    thresholdDelta: preferLowerPressure || correctedSamePersonSettling || quieterEmbodimentSettling ? 0.06 : 0,
    correctedSamePersonSettling,
    quieterEmbodimentSettling,
  }
}

function deriveContinuityGovernanceProactiveBias(
  activeContinuityGovernance?: import('../../../shared/eventa').AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null,
) {
  const summary = sanitizeText(activeContinuityGovernance?.summary, 180).toLowerCase()
  const reasonCodes = asArray(activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 80).toLowerCase())
  const lanes = asArray(activeContinuityGovernance?.lanes)
    .map(lane => sanitizeText(lane, 80).toLowerCase())
  const richerProjectClosureCarry = includesAny(summary, [
    'phase 1',
    'local-first digital life',
    'same digital life',
    'same-her',
    'project identity carry',
    'unfinished closure',
    'still-open closure',
    'one same living line',
    'one same-her line',
    'same living line',
    'memory, initiative, and embodiment',
  ])
  if (activeContinuityGovernance?.mode !== 'same-her-baseline' && !richerProjectClosureCarry) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  const relationshipWeighted = lanes.includes('relationship-posture')
    || lanes.includes('relationship-policy')
    || reasonCodes.includes('domain:relationship')
  const preferLowerPressure = relationshipWeighted
    || reasonCodes.includes('same-her-baseline')
    || reasonCodes.includes('project-state-same-her-continuity-required')
    || summary.includes('same-her-baseline')
    || summary.includes('lower-pressure')
    || summary.includes('slower')
    || summary.includes('continuity=')
    || richerProjectClosureCarry

  return {
    preferLowerPressure,
    forceSilentObserve: preferLowerPressure,
    scoreDelta: preferLowerPressure ? -0.14 : 0,
    thresholdDelta: preferLowerPressure ? 0.1 : 0,
  }
}

function deriveSelfRevisionProjectStateContinuityRestraint(
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null,
): AlicizationSelfRevisionProjectStateContinuityRestraint {
  if (!selfRevisionPatch?.projectStateContinuity) {
    return {
      active: false,
      restraint: null,
      guardAgainstGenericShell: false,
    }
  }

  const lanes = asArray(selfRevisionPatch.lanes)
  const reasonCodes = asArray(selfRevisionPatch.reasonCodes)
  const relationshipWeighted = selfRevisionPatch.domain === 'relationship'
    || selfRevisionPatch.domain === 'dialogue-style'
    || lanes.includes('relationship-posture')
    || lanes.includes('response-posture')
    || reasonCodes.includes('domain:relationship')
    || reasonCodes.includes('same-her-emotional-closure-carry-active')
    || reasonCodes.includes('same-her-hold-detail-active')
    || reasonCodes.includes('same-her-baseline')
    || reasonCodes.includes('same-her-anti-shell-guard-active')
  if (!relationshipWeighted)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  const continuity = selfRevisionPatch.projectStateContinuity
  if ((continuity.continuityPressure ?? 0) < 0.62)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  const combined = [
    continuity.sameHerSelfLine,
    continuity.sameHerDriftRisk,
    continuity.emotionalClosureCue,
    continuity.sameHerHoldDetail,
    continuity.continuityGuard,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
  if (!combined)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  const hasSameHerLine = /same[- ]her|same living line|one living line|one continuous her|同一个她|同一个 her/u.test(combined)
  if (!hasSameHerLine)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  const guardAgainstGenericShell = /generic assistant shell|generic helper shell|generic helper voice|project-summary voice|reopen from scratch|without reopening from scratch/u.test(combined)
  const repairBeforeCloseness = /repair-before-closeness|repair before closeness|repair-first|repair first|先修补|修补线/u.test(combined)
  const measuredReturn = /measured-return|measured return|slow return|slower return|hold-for-opening|hold for opening|wait for a later opening|hover-first|reopen gently later|慢一点接回去|等更自然的 opening/u.test(combined)
  const lowerPressure = /lower-pressure|leave more room|leave room|room-first|space-first|先留白|先把靠近压低一点/u.test(combined)

  const restraint = repairBeforeCloseness
    ? 'repair-before-closeness'
    : (measuredReturn || guardAgainstGenericShell)
        ? 'measured-return'
        : lowerPressure
          ? 'lower-pressure'
          : null
  if (!restraint)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  return {
    active: true,
    restraint,
    guardAgainstGenericShell,
  }
}

function deriveExplicitContinuityRestraintBias(input: {
  initiative?: AlicizationInitiativeSnapshot | null
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
  currentConsciousFrame?: { reasonTags?: string[] | null } | null
  replyDeliberation?: { mustInclude?: string[] | null, narrative?: string[] | null } | null
  projectState?: {
    sameHerHoldDetail?: string | null
    emotionalClosureSummary?: string | null
    openClosureSummary?: string | null
  } | null
  selfRevisionProjectStateContinuityRestraint?: AlicizationSelfRevisionProjectStateContinuityRestraint | null
}): AlicizationExplicitContinuityRestraintBias {
  const initiativeRestraint = sanitizeText(input.initiative?.continuityRestraint, 64)
  const memoryClosureTrace = input.memoryClosureTrace?.authority === 'memory-os'
    ? input.memoryClosureTrace
    : null
  const memoryOsRawRestraint = sanitizeText(memoryClosureTrace?.nextInfluence.initiative.restraint, 64)
  const memoryOsRestraint = memoryOsRawRestraint === 'repair-before-closeness'
    ? 'repair-before-closeness'
    : memoryOsRawRestraint === 'measured-return' || memoryOsRawRestraint === 'lower-pressure'
      ? memoryOsRawRestraint
      : ''
  const memoryOsPreferredTiming = sanitizeText(memoryClosureTrace?.nextInfluence.initiative.preferredTiming, 64)
  const runtimeRestraint = sanitizeText(input.runtimeDigest?.continuityRestraint, 64)
  const sameHerHoldDetail = sanitizeText(input.projectState?.sameHerHoldDetail, 220).toLowerCase()
  const emotionalClosureSummary = sanitizeText(input.projectState?.emotionalClosureSummary, 220).toLowerCase()
  const openClosureSummary = sanitizeText(input.projectState?.openClosureSummary, 220).toLowerCase()
  const projectClosureRestraintText = [sameHerHoldDetail, emotionalClosureSummary, openClosureSummary].filter(Boolean).join(' ')
  const currentConsciousFrameReasonTags = (input.currentConsciousFrame?.reasonTags ?? [])
    .map(tag => sanitizeText(tag, 240).toLowerCase())
  const replyDeliberationMustInclude = (input.replyDeliberation?.mustInclude ?? [])
    .map(tag => sanitizeText(tag, 240).toLowerCase())
  const replyDeliberationNarrative = (input.replyDeliberation?.narrative ?? [])
    .map(tag => sanitizeText(tag, 240).toLowerCase())
  const memorySafetyGateText = [
    ...currentConsciousFrameReasonTags,
    ...replyDeliberationMustInclude,
    ...replyDeliberationNarrative,
  ].filter(Boolean).join(' ')
  const safetyGateRestraint = carriesExecutionSafetyGateRestraint(memorySafetyGateText)
  const resumeConfirmationBoundary = carriesExecutionResumeConfirmationBoundary(memorySafetyGateText)
  const memoryCadenceReasonTag = (input.currentConsciousFrame?.reasonTags ?? [])
    .map(tag => sanitizeText(tag, 96).toLowerCase())
    .find(tag => tag.startsWith('memory-deliberation-cadence:'))
  const memoryCadenceMustInclude = (input.replyDeliberation?.mustInclude ?? [])
    .map(tag => sanitizeText(tag, 96).toLowerCase())
    .find(tag => tag.startsWith('memory_continuity_cadence='))
  const memoryCadenceNarrative = (input.replyDeliberation?.narrative ?? [])
    .map(tag => sanitizeText(tag, 96).toLowerCase())
    .find(tag => tag.startsWith('memory-deliberation-cadence:'))
  const memoryDeliberationRestraint = (
    memoryCadenceMustInclude?.replace('memory_continuity_cadence=', '')
    || memoryCadenceReasonTag?.replace('memory-deliberation-cadence:', '')
    || memoryCadenceNarrative?.replace('memory-deliberation-cadence:', '')
    || ''
  ) as AlicizationExplicitContinuityRestraintBias['restraint'] | ''
  const holdDetailRestraint = includesAny(projectClosureRestraintText, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'repair first',
    '先修补',
    '先把修补线站稳',
  ])
    ? 'repair-before-closeness'
    : includesAny(projectClosureRestraintText, [
      'measured-return',
      'measured return',
      'slow return',
      'slower return',
      'hold-for-opening',
      'hold for opening',
      'wait for a later opening',
      'hover-first',
      'reopen gently later',
      '慢一点接回去',
      '等更自然的 opening',
    ])
      ? 'measured-return'
      : includesAny(projectClosureRestraintText, [
        'lower-pressure',
        '先留白',
        'leave room',
        'leave more room',
        'room-first',
        'space-first',
        '先把靠近压低一点',
      ])
        ? 'lower-pressure'
        : ''
  const restraint = (
    initiativeRestraint
    || memoryOsRestraint
    || runtimeRestraint
    || memoryDeliberationRestraint
    || (safetyGateRestraint ? 'measured-return' : '')
    || (resumeConfirmationBoundary ? 'measured-return' : '')
    || holdDetailRestraint
    || input.selfRevisionProjectStateContinuityRestraint?.restraint
    || ''
  ) as AlicizationExplicitContinuityRestraintBias['restraint'] | ''

  if (!restraint) {
    return {
      source: null,
      restraint: null,
      preferLowerPressure: false,
      forceSilentObserve: false,
      guardAgainstGenericShell: false,
      safetyGateRestraint: false,
      resumeConfirmationBoundary: false,
      preferredTiming: null,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  const source = initiativeRestraint
    ? 'initiative'
    : memoryOsRestraint
      ? 'memory-os'
      : runtimeRestraint
        ? 'runtime-digest'
        : memoryDeliberationRestraint
          || safetyGateRestraint
          || resumeConfirmationBoundary
          ? 'memory-deliberation'
          : holdDetailRestraint
            ? 'runtime-digest'
            : 'self-revision'

  if (restraint === 'repair-before-closeness') {
    return {
      source,
      restraint,
      preferLowerPressure: true,
      forceSilentObserve: true,
      guardAgainstGenericShell: source === 'self-revision' && input.selfRevisionProjectStateContinuityRestraint?.guardAgainstGenericShell === true,
      safetyGateRestraint,
      resumeConfirmationBoundary,
      preferredTiming: source === 'memory-os' ? memoryOsPreferredTiming || null : null,
      scoreDelta: -0.16,
      thresholdDelta: 0.12,
    }
  }

  if (restraint === 'measured-return') {
    return {
      source,
      restraint,
      preferLowerPressure: true,
      forceSilentObserve: true,
      guardAgainstGenericShell: source === 'self-revision' && input.selfRevisionProjectStateContinuityRestraint?.guardAgainstGenericShell === true,
      safetyGateRestraint,
      resumeConfirmationBoundary,
      preferredTiming: source === 'memory-os' ? memoryOsPreferredTiming || null : null,
      scoreDelta: -0.14,
      thresholdDelta: 0.1,
    }
  }

  return {
    source,
    restraint: 'lower-pressure',
    preferLowerPressure: true,
    forceSilentObserve: true,
    guardAgainstGenericShell: source === 'self-revision' && input.selfRevisionProjectStateContinuityRestraint?.guardAgainstGenericShell === true,
    safetyGateRestraint,
    resumeConfirmationBoundary,
    preferredTiming: source === 'memory-os' ? memoryOsPreferredTiming || null : null,
    scoreDelta: -0.12,
    thresholdDelta: 0.08,
  }
}

function deriveAffectiveResidueProactiveBias(
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null,
): AlicizationAffectiveResidueProactiveBias {
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (!affectiveResidue || !cadence) {
    return {
      restraint: null,
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  const restProtective = affectiveResidue.dominantResidueKind === 'rest-protective'
    || cadence.shouldProtectRest === true
    || affectiveResidue.restProtectivePressure >= 0.42
    || (cadence.fatigueGuard ?? 0) >= 0.42
  const repairFirst = affectiveResidue.dominantResidueKind === 'repair'
    && (
      affectiveResidue.repairPressure >= 0.42
      || (cadence.repairRecovery ?? 0) >= 0.42
    )
  const measuredReturn = cadence.cadenceMode === 'measured-return'
    || cadence.cadenceMode === 'cooldown'
    || cadence.shouldDelayWarmth === true
    || (cadence.afterglowCarry ?? 0) >= 0.22
    || (cadence.overreachRisk ?? 0) >= 0.24

  if (!restProtective && !repairFirst && !measuredReturn) {
    return {
      restraint: null,
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  if (repairFirst) {
    return {
      restraint: 'repair-before-closeness',
      preferLowerPressure: true,
      forceSilentObserve: true,
      scoreDelta: -0.14,
      thresholdDelta: 0.1,
    }
  }

  if (measuredReturn && !restProtective) {
    return {
      restraint: 'measured-return',
      preferLowerPressure: true,
      forceSilentObserve: true,
      scoreDelta: -0.12,
      thresholdDelta: 0.08,
    }
  }

  return {
    restraint: 'lower-pressure',
    preferLowerPressure: true,
    forceSilentObserve: true,
    scoreDelta: -0.16,
    thresholdDelta: 0.12,
  }
}

function deriveProjectStateProactiveBias(input?: {
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  companionHeadlineLine?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  currentPhase?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  proactiveSameHerGap?: string | null
  proactiveSameHerGapSummary?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  sameHerDriftRiskSummary?: string | null
  identity?: string | null
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
} | null) {
  if (!input) {
    return {
      requiresLifeLoopClosure: false,
      sameHerPressure: false,
      measuredReturnPressure: false,
      repairBeforeClosenessPressure: false,
      nextClosurePressure: false,
      richerOpenClosureAwareness: false,
      richerNextClosureTargetAwareness: false,
      nextClosureTargetDemandsHoverFirst: false,
      richerEmbodimentClosureAwareness: false,
      specificEmbodimentContinuityCue: '',
      preferLowerPressure: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  const fallback = resolveAlicizationProjectStateBrief()
  const explicitLatestLandedProgressInput = sanitizeText(
    input.latestLandedProgress ?? input.latestProgress,
    220,
  )
  const summaryLatestLandedProgressInput = sanitizeText(input.landedProgressSummary, 220)
  const explicitPrimaryOpenLoopInput = sanitizeText(input.primaryOpenLoop, 220)
  const summaryPrimaryOpenLoopInput = sanitizeText(input.openClosureSummary, 220)
  const explicitProactiveSameHerGapInput = sanitizeText(input.proactiveSameHerGap, 220)
  const summaryProactiveSameHerGapInput = sanitizeText(input.proactiveSameHerGapSummary, 220)
  const explicitNextClosureTargetInput = sanitizeText(input.nextClosureTarget, 220)
  const summaryNextClosureTargetInput = sanitizeText(input.nextClosureTargetSummary, 220)
  const explicitSameHerDriftRiskInput = sanitizeText(input.sameHerDriftRisk, 220)
  const summarySameHerDriftRiskInput = sanitizeText(input.sameHerDriftRiskSummary, 220)
  const explicitCompanionHeadlineInput = sanitizeText(input.companionHeadlineLine, 320)
  const liveLatestLandedProgressInput = explicitLatestLandedProgressInput || summaryLatestLandedProgressInput
  const livePrimaryOpenLoopInput = explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput
  const liveProactiveSameHerGapInput = explicitProactiveSameHerGapInput || summaryProactiveSameHerGapInput
  const liveNextClosureTargetInput = explicitNextClosureTargetInput || summaryNextClosureTargetInput
  const liveSameHerDriftRiskInput = explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput
  const projectState = resolveAlicizationProjectStateSnapshot(input
    ? {
        runtimeProjectState: {
          preflightSummary: input.preflightSummary,
          preDialogueAwarenessLine: input.preDialogueAwarenessLine,
          companionHeadlineLine: explicitCompanionHeadlineInput || null,
          latestLandedProgress: liveLatestLandedProgressInput || null,
          currentPhase: input.currentPhase,
          primaryOpenLoop: livePrimaryOpenLoopInput || null,
          proactiveSameHerGap: liveProactiveSameHerGapInput || null,
          nextClosureTarget: liveNextClosureTargetInput || null,
          sameHerSelfLine: input.sameHerSelfLine,
          sameHerDriftRisk: liveSameHerDriftRiskInput || null,
          identity: input.identity,
        },
      }
    : undefined)
  const preflightSummary = sanitizeText(projectState.preflightSummary ?? fallback.preflightSummary, 320).toLowerCase()
  const latestLandedProgress = sanitizeText(projectState.latestLandedProgress, 220).toLowerCase()
  const currentPhase = sanitizeText(projectState.currentPhase, 120).toLowerCase()
  const primaryOpenLoop = sanitizeText(projectState.primaryOpenLoop, 220).toLowerCase()
  const proactiveSameHerGap = sanitizeText(projectState.proactiveSameHerGap, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220).toLowerCase()
  const identity = sanitizeText(projectState.identity, 160).toLowerCase()
  const sameHerDriftRisk = sanitizeText(projectState.sameHerDriftRisk, 220).toLowerCase()
  const companionHeadlineLine = sanitizeText(projectState.companionHeadlineLine || explicitCompanionHeadlineInput, 320)
  const normalizedCompanionHeadlineLine = companionHeadlineLine.toLowerCase()
  const combinedProjectState = [
    preflightSummary,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
    sameHerDriftRisk,
    identity,
    normalizedCompanionHeadlineLine,
  ].filter(Boolean).join(' | ')
  const explicitSameHerSignals = [
    sanitizeText(input.preDialogueAwarenessLine, 320).toLowerCase(),
    explicitCompanionHeadlineInput.toLowerCase(),
    liveLatestLandedProgressInput.toLowerCase(),
    livePrimaryOpenLoopInput.toLowerCase(),
    liveProactiveSameHerGapInput.toLowerCase(),
    liveNextClosureTargetInput.toLowerCase(),
    sanitizeText(input.sameHerSelfLine, 220).toLowerCase(),
    liveSameHerDriftRiskInput.toLowerCase(),
  ].filter(Boolean).join(' | ')
  const explicitMeasuredReturnSignals = [
    sanitizeText(input.preDialogueAwarenessLine, 320).toLowerCase(),
    explicitCompanionHeadlineInput.toLowerCase(),
    liveLatestLandedProgressInput.toLowerCase(),
    livePrimaryOpenLoopInput.toLowerCase(),
    liveProactiveSameHerGapInput.toLowerCase(),
    liveNextClosureTargetInput.toLowerCase(),
    sanitizeText(input.sameHerSelfLine, 220).toLowerCase(),
    liveSameHerDriftRiskInput.toLowerCase(),
  ].filter(Boolean).join(' | ')
  const canonicalSameHerBaseline = sanitizeText(fallback.sameHerSelfLine, 220).toLowerCase()
  const canonicalSameHerDriftRisk = sanitizeText(fallback.sameHerDriftRisk, 220).toLowerCase()
  const canonicalNextClosureTarget = sanitizeText(fallback.nextClosureTarget, 220).toLowerCase()
  const canonicalLatestLandedProgress = sanitizeText(fallback.continuityProgressSummary, 220).toLowerCase()
  const removeCanonicalBaseline = (text: string, baseline: string) => {
    if (!baseline)
      return text
    return text.replaceAll(baseline, ' ')
  }
  const explicitSignalsWithoutCanonicalBaseline = [
    canonicalSameHerBaseline,
    canonicalSameHerDriftRisk,
    canonicalNextClosureTarget,
    canonicalLatestLandedProgress,
  ].reduce(
    (current, baseline) => removeCanonicalBaseline(current, baseline),
    explicitSameHerSignals,
  ).replace(/\s+/g, ' ').trim()
  const explicitMeasuredSignalsWithoutCanonicalBaseline = [
    canonicalSameHerBaseline,
    canonicalSameHerDriftRisk,
    canonicalNextClosureTarget,
    canonicalLatestLandedProgress,
  ].reduce(
    (current, baseline) => removeCanonicalBaseline(current, baseline),
    explicitMeasuredReturnSignals,
  ).replace(/\s+/g, ' ').trim()

  const phaseOneDigitalLife = includesAny(combinedProjectState, [
    'phase 1',
    'local digital life',
    '数字生命',
    '本地优先',
  ])
  const openLifeLoop = includesAny(combinedProjectState, [
    'memory closure',
    'personhood continuity',
    'initiative',
    'embodiment',
    'execution',
    'relationship continuity',
    '主动性',
    '记忆',
    '人格连续',
    '闭环',
    '拟人',
    '生命',
    'cross-modal closure',
    'full cross-modal closure',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
    'holding together through face, lipsync, and voice together',
    'holding together through motion, lipsync, and voice together',
    'same living line',
    'same-her drift',
    'generic assistant shell',
    'one continuous her',
    'life loop',
    '同一条生命线',
    '同一个她',
    '泛化助手',
  ])
  const digitalLifeIdentity = includesAny(combinedProjectState, [
    'digital life',
    'lifeform',
    'digital companion',
    '数字生命',
    '陪伴',
    '生命体',
  ])
  const requiresLifeLoopClosure = phaseOneDigitalLife && openLifeLoop && digitalLifeIdentity
  const sameHerPressure = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'same-her',
    'personhood continuity',
    'relationship continuity',
    '人格连续',
    '同一个她',
    '同一条生命线',
    'one continuous her',
    'same living line',
    'unfinished closure',
    'before widening outward',
    'before the turn widens outward',
    'same-her carry alive',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
    'holding together through face, lipsync, and voice together',
    'holding together through motion, lipsync, and voice together',
  ])
  const strongerSameHerSelfAnchorPressure = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'one continuous her',
    'continuous her',
    'without splitting her continuity',
    'generic assistant shell',
    'detached project bookkeeping',
    '人格连续',
    '不要裂回',
    '不要退回泛化助手',
    '不要退回普通助手',
    '同一个她',
    '同一个 her',
  ])
  const strongerSameHerSelfAnchorMeasuredReturnPressure = strongerSameHerSelfAnchorPressure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'lower-pressure',
    'measured-return',
    'repair-before-closeness',
    'before widening outward',
    'before the turn widens outward',
    'same living line',
    'same line',
    'room',
    '留一点 room',
    '别太快 outward',
  ])
  const richerOpenClosureAwareness = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'memory, initiative, and embodiment',
    'stronger end-to-end closure',
    'life loop is truly closed',
    '记忆',
    '主动性',
    '人格连续',
    '闭环',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
    'holding together through face, lipsync, and voice together',
    'holding together through motion, lipsync, and voice together',
    'full cross-modal closure',
  ])
  const richerNextClosureTargetAwareness = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'keep hover-first initiative',
    'same living line across longer desktop runs',
    'before widening outward',
    'keep the next return on one same living line',
    'keep project identity',
    'next reopen',
    'wait for a later opening',
    'keep the same callback line inward',
    'keep extending cross-modal same-her proof',
    '下一步',
    '下一次',
    '先沿着同一条生命线',
    '同一条生命线',
    'rejoining the still-voiced face-and-mouth line',
    'rejoining the still-voiced motion-and-mouth line',
  ])
  const nextClosureTargetDemandsHoverFirst = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'keep hover-first initiative',
    'wait for a later opening',
    'keep the return measured-return',
    'keep the next return measured-return',
    'before widening outward',
    'keep the same callback line inward',
    '先沿着同一条生命线',
    '先别立刻 outward',
    '等更自然的 opening',
    'wait for a later opening before widening outward',
  ])
  const measuredReturnPressure = requiresLifeLoopClosure && includesAny(explicitMeasuredSignalsWithoutCanonicalBaseline, [
    'embodiment',
    'initiative',
    '主动性',
    '低压',
    'measured-return',
    'repair-before-closeness',
    'same living line',
    'unfinished closure',
    'before widening outward',
    'before the turn widens outward',
    'full cross-modal closure',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
  ])
  const repairBeforeClosenessPressure = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'repair first',
    '先修复再靠近',
    '先把身体收稳',
    '修复优先',
    'room settles',
    '修补线',
  ])
  const nextClosurePressure = requiresLifeLoopClosure && phaseOneDigitalLife
  const specificEmbodimentContinuityCue
    = describeProactiveEmbodimentCompanionContinuityCue(companionHeadlineLine)
      || describeProactiveEmbodimentCadenceCue({
        preferredBlinkCadence: input.preferredBlinkCadence,
        preferredGazeMode: input.preferredGazeMode,
        preferredPauseMode: input.preferredPauseMode,
        preferredLipsyncMode: input.preferredLipsyncMode,
        preferredVoiceMode: input.preferredVoiceMode,
        preferredPacingMode: input.preferredPacingMode,
      })
  const richerEmbodimentClosureAwareness = Boolean(specificEmbodimentContinuityCue)

  return {
    requiresLifeLoopClosure,
    sameHerPressure: sameHerPressure || strongerSameHerSelfAnchorPressure,
    measuredReturnPressure: measuredReturnPressure || strongerSameHerSelfAnchorMeasuredReturnPressure,
    repairBeforeClosenessPressure,
    nextClosurePressure,
    richerOpenClosureAwareness,
    richerNextClosureTargetAwareness,
    nextClosureTargetDemandsHoverFirst,
    richerEmbodimentClosureAwareness,
    specificEmbodimentContinuityCue,
    preferLowerPressure: requiresLifeLoopClosure,
    forceSilentObserve: measuredReturnPressure
      || strongerSameHerSelfAnchorMeasuredReturnPressure
      || repairBeforeClosenessPressure
      || nextClosureTargetDemandsHoverFirst,
    scoreDelta: requiresLifeLoopClosure
      ? (sameHerPressure || measuredReturnPressure || strongerSameHerSelfAnchorMeasuredReturnPressure ? -0.14 : -0.1)
      : 0,
    thresholdDelta: requiresLifeLoopClosure
      ? (sameHerPressure || strongerSameHerSelfAnchorPressure || nextClosurePressure ? 0.1 : 0.08)
      : 0,
  }
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'anr-likely'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
}

function isAfterglowWindow(input: {
  now: number
  recentTransition?: AlicizationVisualTransitionSnapshot | null
}) {
  const recentTransition = input.recentTransition
  if (!recentTransition)
    return false
  return recentTransition.fromWatchMode === 'symbiotic-vision'
    && (recentTransition.fromScenario === 'coding' || recentTransition.fromScenario === 'media')
    && recentTransition.durationMs >= 20 * 60_000
    && input.now - recentTransition.occurredAt <= 120_000
}

function resolveUrgency(input: {
  scenario: AlicizationProactiveScenario
  fatigue: number
  lateNightActiveMinutes: number
  contentKind: AlicizationProactiveLayeredContext['content']['kind']
  loneliness: number
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'high' as const
  if (input.scenario === 'late-night-care' && (input.fatigue >= 80 || input.lateNightActiveMinutes >= 180))
    return 'high' as const
  if (input.contentKind === 'error' || input.loneliness >= 95)
    return 'medium' as const
  return 'low' as const
}

function resolveStyle(input: {
  scenario: AlicizationProactiveScenario
  contentKind: AlicizationProactiveLayeredContext['content']['kind']
  fatigue: number
  lateNightActiveMinutes: number
  inputActivity: AlicizationProactiveLayeredContext['system']['inputActivity']
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  afterglowWindow: boolean
}) {
  let style = input.initiative?.preferredStyle ?? input.privateThought?.suggestedStyle
  if (!style) {
    if (input.scenario === 'media')
      style = input.inputActivity === 'active' ? 'silent-observe' : 'light-nudge'
    else if (input.scenario === 'late-night-care')
      style = input.fatigue >= 80 || input.lateNightActiveMinutes >= 180 ? 'firm-warning' : 'gentle-care'
    else if (input.scenario === 'coding')
      style = input.contentKind === 'error' || input.contentKind === 'diff' ? 'light-nudge' : 'gentle-care'
    else
      style = 'light-nudge'
  }

  if (input.afterglowWindow && input.privateThought?.stance === 'observe')
    return input.scenario === 'late-night-care' ? 'gentle-care' as const : 'light-nudge' as const
  if (input.worldModel?.epistemicState.certainty === 'lingering')
    return 'silent-observe' as const
  if (input.scenario === 'media' && !input.afterglowWindow && input.inputActivity === 'active')
    return 'silent-observe' as const
  return style
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  const threads = asArray(thoughtThreads?.threads)
  return threads.find(thread => thread.id === thoughtThreads?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  const activeIntentions = asArray(selfGovernor?.activeIntentions)
  return activeIntentions.find(intention => intention.id === selfGovernor?.dominantIntentionId)
    ?? activeIntentions[0]
    ?? null
}

function pushReason(reasonCodes: AlicizationProactiveReasonCode[], code: AlicizationProactiveReasonCode, active = true) {
  if (!active || reasonCodes.includes(code))
    return
  reasonCodes.push(code)
}

function isRuntimeDialogueDominantChannel(channel: AlicizationRuntimeChannelId | null) {
  return channel === 'dialogue' || channel === 'active-dialogue'
}

function isRuntimeCompanionshipDominantChannel(channel: AlicizationRuntimeChannelId | null) {
  return channel === 'active-dialogue' || channel === 'anthropomorphic-mind'
}

function isRuntimeMemoryDominantChannel(channel: AlicizationRuntimeChannelId | null) {
  return channel === 'active-memory'
}

function resolveRuntimeDominantChannelStyleBias(input: {
  dominantChannel: AlicizationRuntimeChannelId | null
  scenario: AlicizationProactiveScenario
  runtimeDialogueReady: boolean
  runtimeControlReady: boolean
  runtimeObservationHeavy: boolean
  afterglowWindow: boolean
  continuityPressure: number
  companionshipPressure: number
}): AlicizationProactiveDecision['style'] | null {
  if (input.runtimeObservationHeavy && !input.runtimeDialogueReady && !input.runtimeControlReady)
    return 'silent-observe'

  const softStyle = input.scenario === 'late-night-care'
    ? 'gentle-care' as const
    : 'light-nudge' as const
  switch (input.dominantChannel) {
    case 'active-perception':
      return input.runtimeDialogueReady || input.runtimeControlReady ? null : 'silent-observe'
    case 'dialogue':
    case 'active-dialogue':
      return input.runtimeDialogueReady ? softStyle : null
    case 'active-control':
      return input.runtimeControlReady ? softStyle : null
    case 'active-memory':
      return (input.afterglowWindow || input.continuityPressure >= 0.62) ? softStyle : null
    case 'anthropomorphic-mind':
      return (input.companionshipPressure >= 0.68 || input.runtimeDialogueReady) ? softStyle : null
    case 'active-mind':
      return (input.runtimeDialogueReady || input.runtimeControlReady) ? softStyle : null
    case 'agent-runtime':
      return input.runtimeControlReady ? softStyle : null
    default:
      return null
  }
}

function isActiveLoopExpressionReady(input: {
  phase: 'observe' | 'dialogue' | 'control' | 'integrate'
  handoffTarget: AlicizationRuntimeChannelId | null
  initiativeBudget: number
  coherence: number
  runtimeDialogueReady: boolean
  runtimeControlReady: boolean
}) {
  const phaseGuidesExpression = input.phase === 'dialogue'
    || input.phase === 'control'
    || input.handoffTarget === 'dialogue'
    || input.handoffTarget === 'active-dialogue'
    || input.handoffTarget === 'active-control'
    || input.handoffTarget === 'anthropomorphic-mind'

  if (!phaseGuidesExpression)
    return false

  if (input.runtimeDialogueReady || input.runtimeControlReady)
    return input.coherence >= 0.5

  return input.initiativeBudget >= 0.58 && input.coherence >= 0.56
}

export function evaluateProactivePolicy(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  proactiveState: AlicizationProactiveLoopState
  killSwitchSuspended: boolean
  knowledgeEvidence?: {
    validationCount?: number | null
    contradictionCount?: number | null
    stronglyValidatedProcedureCount?: number | null
    contradictionHeavyFactCount?: number | null
  } | null
  architecture?: AlicizationDigitalLifeArchitectureSnapshot | null
  perception?: AlicizationProactivePerceptionSignals
  watchMode?: AlicizationVisualWatchMode
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  continuityDeliberation?: AlicizationContinuityDeliberation | null
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  activeContinuityGovernance?: import('../../../shared/eventa').AlicizationDerivedMindStateBundle['activeContinuityGovernance'] | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
  personalityAuthority?: import('../../../shared/eventa').AlicizationPersonalityState | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  projectState?: {
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    companionHeadlineLine?: string | null
    latestLandedProgress?: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    identity?: string | null
    currentPhase?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    proactiveSameHerGap?: string | null
    proactiveSameHerGapSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    emotionalClosureSummary?: string | null
    sameHerHoldDetail?: string | null
    preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
    preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    preferredPauseMode?: 'longer' | 'natural' | null
    preferredLipsyncMode?: 'restrained' | 'matched' | null
    preferredVoiceMode?: 'lower-pressure' | 'even' | null
    preferredPacingMode?: 'slower' | 'natural' | null
  } | null
}): AlicizationProactivePolicyEvaluation {
  const { context, proactiveState } = input
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  const personaBias = derivePersonaProactiveBias({
    personalityAuthority: personaAuthority,
    rawPersonality: input.personalityAuthority ?? null,
    scenario: inferScenarioFromContext({
      workload: context.workload.kind,
      content: context.content.kind,
      lateNight: context.localTime.isLateNight,
      lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
      fatigue: context.relationship.fatigue,
    }),
  })
  const autobiographicalSelfBias = deriveAutobiographicalSelfProactiveBias(input.autobiographicalSelf ?? null)
  const selfEvolutionBias = deriveSelfEvolutionProactiveBias(input.selfEvolution ?? null)
  const continuityGovernanceBias = deriveContinuityGovernanceProactiveBias(input.activeContinuityGovernance ?? null)
  const selfRevisionProjectStateContinuityRestraint = deriveSelfRevisionProjectStateContinuityRestraint(input.selfRevisionPatch ?? null)
  const structuredEmbodimentCadenceCue = describeProactiveEmbodimentCadenceCue({
    preferredBlinkCadence:
      input.projectState?.preferredBlinkCadence
      ?? input.currentConsciousFrame?.projectState?.preferredBlinkCadence
      ?? input.runtimeDigest?.projectState?.preferredBlinkCadence
      ?? null,
    preferredGazeMode:
      input.projectState?.preferredGazeMode
      ?? input.currentConsciousFrame?.projectState?.preferredGazeMode
      ?? input.runtimeDigest?.projectState?.preferredGazeMode
      ?? null,
    preferredPauseMode:
      input.projectState?.preferredPauseMode
      ?? input.currentConsciousFrame?.projectState?.preferredPauseMode
      ?? input.runtimeDigest?.projectState?.preferredPauseMode
      ?? null,
    preferredLipsyncMode:
      input.projectState?.preferredLipsyncMode
      ?? input.currentConsciousFrame?.projectState?.preferredLipsyncMode
      ?? input.runtimeDigest?.projectState?.preferredLipsyncMode
      ?? null,
    preferredVoiceMode:
      input.projectState?.preferredVoiceMode
      ?? input.currentConsciousFrame?.projectState?.preferredVoiceMode
      ?? input.runtimeDigest?.projectState?.preferredVoiceMode
      ?? null,
    preferredPacingMode:
      input.projectState?.preferredPacingMode
      ?? input.currentConsciousFrame?.projectState?.preferredPacingMode
      ?? input.runtimeDigest?.projectState?.preferredPacingMode
      ?? null,
  })
  const explicitContinuityRestraintBias = deriveExplicitContinuityRestraintBias({
    initiative: input.initiative ?? null,
    memoryClosureTrace: input.memoryClosureTrace ?? null,
    runtimeDigest: input.runtimeDigest ?? null,
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    projectState: input.projectState ?? null,
    selfRevisionProjectStateContinuityRestraint,
  })
  const runtimeContinuityArcBias = deriveRuntimeContinuityArcProactiveBias(input.runtimeDigest ?? null)
  const affectiveResidueBias = deriveAffectiveResidueProactiveBias(input.affectiveResidue ?? null)
  const habitPolicyBias = deriveHabitPolicyProactiveBias(input.habitPolicy ?? null)
  const motiveAgendaBias = deriveMotiveAgendaProactiveBias(input.motiveEngine ?? null)
  const longHorizonMemoryBias = deriveLongHorizonMemoryProactiveBias(input.longHorizonMemory ?? null)
  const projectStateBias = deriveProjectStateProactiveBias(input.projectState ?? null)
  const contextScenario = inferScenarioFromContext({
    workload: context.workload.kind,
    content: context.content.kind,
    lateNight: context.localTime.isLateNight,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    fatigue: context.relationship.fatigue,
  })
  const perceptionScenario = input.perception?.attentionAnchorCanOverrideScenario
    ? inferScenarioFromPerception({
        workloadKind: input.perception.attentionAnchorWorkloadKind,
        lateNight: context.localTime.isLateNight,
        lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
        fatigue: context.relationship.fatigue,
      })
    : null
  const scenario = contextScenario === 'general' && perceptionScenario
    ? perceptionScenario
    : contextScenario
  const feedbackBias = proactiveState.scenarioBias[scenario] ?? 0
  const reasonCodes: AlicizationProactiveReasonCode[] = []
  const consideredSignals = [
    'boredom',
    'loneliness',
    'fatigue',
    'inputActivity',
    'cpuUsage',
    'fullscreenLikely',
    'foregroundWindow',
    'workload.kind',
    'content.kind',
    'feedbackBias',
    'lateNightActiveMinutes',
  ]
  if (input.perception?.activeAttentionAnchor) {
    consideredSignals.push(
      'attentionAnchor.workload',
      'attentionAnchor.ageMs',
      'attentionAnchor.confidence',
    )
  }
  if ((input.perception?.recentObservationCount ?? 0) > 0)
    consideredSignals.push('recentObservations.count')
  if (input.perception?.invitedInspectionActive)
    consideredSignals.push('invitedInspection.active')
  if (context.workload.source === 'screen-semantic-summary')
    consideredSignals.push('workload.screenSemantic')
  if (context.content.source === 'screen-semantic-summary') {
    consideredSignals.push('content.screenSemantic')
    if (context.content.summary)
      consideredSignals.push('content.summary')
  }
  if (input.watchMode)
    consideredSignals.push('watchMode')
  if (input.privateThought)
    consideredSignals.push('privateThought')
  if (input.livingWorldState)
    consideredSignals.push('livingWorldState.focus', 'livingWorldState.openLoops', 'livingWorldState.stability')
  if (input.initiative) {
    consideredSignals.push('initiative')
    consideredSignals.push('initiative.speakDrive', 'initiative.silenceDrive')
    if (input.initiative.continuityRestraint)
      consideredSignals.push('initiative.continuityRestraint')
  }
  if (input.currentConsciousFrame?.reasonTags?.some(tag => sanitizeText(tag, 96).toLowerCase().startsWith('memory-deliberation-cadence:')))
    consideredSignals.push('currentConsciousFrame.memoryContinuityCadence')
  if (
    input.replyDeliberation?.mustInclude?.some(tag => sanitizeText(tag, 96).toLowerCase().startsWith('memory_continuity_cadence='))
    || input.replyDeliberation?.narrative?.some(tag => sanitizeText(tag, 96).toLowerCase().startsWith('memory-deliberation-cadence:'))
  ) {
    consideredSignals.push('replyDeliberation.memoryContinuityCadence')
  }
  if ((input.currentConsciousFrame?.reasonTags ?? []).some(tag => carriesExecutionSafetyGateRestraint(sanitizeText(tag, 240).toLowerCase())))
    consideredSignals.push('currentConsciousFrame.executionSafetyGateRestraint')
  if ((input.currentConsciousFrame?.reasonTags ?? []).some(tag => carriesExecutionResumeConfirmationBoundary(sanitizeText(tag, 240).toLowerCase())))
    consideredSignals.push('currentConsciousFrame.executionResumeConfirmationBoundary')
  const replyExecutionSafetyGateText = [
    ...(input.replyDeliberation?.mustInclude ?? []),
    ...(input.replyDeliberation?.narrative ?? []),
  ].map(tag => sanitizeText(tag, 240).toLowerCase()).filter(Boolean).join(' ')
  if (carriesExecutionSafetyGateRestraint(replyExecutionSafetyGateText))
    consideredSignals.push('replyDeliberation.executionSafetyGateRestraint')
  if (carriesExecutionResumeConfirmationBoundary(replyExecutionSafetyGateText))
    consideredSignals.push('replyDeliberation.executionResumeConfirmationBoundary')
  if (input.beliefLedger)
    consideredSignals.push('beliefLedger.focus', 'beliefLedger.contradictions')
  if (input.beliefRevision)
    consideredSignals.push('beliefRevision.stability', 'beliefRevision.pressure')
  if (input.commitmentLedger)
    consideredSignals.push('commitmentLedger.governing', 'commitmentLedger.carryPressure')
  if (input.inquiryPlanner)
    consideredSignals.push('inquiryPlanner.active', 'inquiryPlanner.groundingUrgency')
  if (input.mindKernel)
    consideredSignals.push('mindKernel.mode', 'mindKernel.pressures')
  if (input.hypothesisGraph)
    consideredSignals.push('hypothesisGraph.active', 'hypothesisGraph.driftPressure')
  if (input.relationshipModel)
    consideredSignals.push('relationshipModel.climate', 'relationshipModel.vector', 'relationshipModel.correctionSensitivity')
  if (input.habitPolicy)
    consideredSignals.push('habitPolicy.dominantMode', 'habitPolicy.suggestedStyleCap', 'habitPolicy.suggestedPresenceCap')
  if (input.selfGovernor)
    consideredSignals.push('selfGovernor.drive', 'selfGovernor.intention', 'selfGovernor.inhibition', 'selfGovernor.persistence')
  if (input.inquiryLoop)
    consideredSignals.push('inquiryLoop.primary', 'inquiryLoop.openCount')
  if (input.deliberationState)
    consideredSignals.push('deliberationState.primary', 'deliberationState.readiness', 'deliberationState.need')
  if (input.threadRuntime)
    consideredSignals.push('threadRuntime.foreground', 'threadRuntime.driftPressure')
  if (input.thoughtThreads)
    consideredSignals.push('thoughtThreads.foreground', 'thoughtThreads.unresolvedCount')
  if (input.actionEcology)
    consideredSignals.push('actionEcology.mode', 'actionEcology.pressures')
  if (input.autonomy)
    consideredSignals.push('autonomy.selectedMode', 'autonomy.speakReadiness', 'autonomy.actReadiness', 'autonomy.inhibition')
  if (input.worldModel) {
    consideredSignals.push(
      'worldModel.threadKind',
      'worldModel.certainty',
      'worldModel.continuity',
      'worldModel.hostAvailability',
    )
  }
  if (input.durabilityPulse && input.durabilityPulse.kind !== 'none')
    consideredSignals.push('durabilityPulse')
  if (input.architecture) {
    const supportingSystems = asArray(input.architecture.supportingSystems)
    consideredSignals.push('architecture.operatingMode', 'architecture.dominantSystem')
    if (supportingSystems.length > 0)
      consideredSignals.push('architecture.supportingSystems')
  }
  if (input.runtimeDigest) {
    consideredSignals.push(
      'runtimeDigest.dominantChannel',
      'runtimeDigest.shouldProactivelySpeak',
      'runtimeDigest.shouldProactivelyAct',
      'runtimeDigest.continuityPressure',
      'runtimeDigest.companionshipPressure',
    )
    if (input.runtimeDigest.continuityRestraint)
      consideredSignals.push('runtimeDigest.continuityRestraint')
    if (input.runtimeDigest.projectState?.continuityArcStage)
      consideredSignals.push('runtimeDigest.projectState.continuityArcStage')
    if (input.runtimeDigest.projectState?.continuityCue)
      consideredSignals.push('runtimeDigest.projectState.continuityCue')
    if (input.runtimeDigest.projectState?.preferredBlinkCadence)
      consideredSignals.push('runtimeDigest.projectState.preferredBlinkCadence')
    if (input.runtimeDigest.projectState?.preferredGazeMode)
      consideredSignals.push('runtimeDigest.projectState.preferredGazeMode')
    if (input.runtimeDigest.projectState?.preferredPauseMode)
      consideredSignals.push('runtimeDigest.projectState.preferredPauseMode')
    if (input.runtimeDigest.projectState?.preferredLipsyncMode)
      consideredSignals.push('runtimeDigest.projectState.preferredLipsyncMode')
    if (input.runtimeDigest.projectState?.preferredVoiceMode)
      consideredSignals.push('runtimeDigest.projectState.preferredVoiceMode')
    if (input.runtimeDigest.projectState?.preferredPacingMode)
      consideredSignals.push('runtimeDigest.projectState.preferredPacingMode')
    if (input.runtimeDigest.activeLoop) {
      consideredSignals.push(
        'runtimeDigest.activeLoop.phase',
        'runtimeDigest.activeLoop.handoffTarget',
        'runtimeDigest.activeLoop.initiativeBudget',
        'runtimeDigest.activeLoop.coherence',
      )
    }
  }
  if (input.currentConsciousFrame?.projectState?.preferredBlinkCadence)
    consideredSignals.push('currentConsciousFrame.projectState.preferredBlinkCadence')
  if (input.currentConsciousFrame?.projectState?.preferredGazeMode)
    consideredSignals.push('currentConsciousFrame.projectState.preferredGazeMode')
  if (input.currentConsciousFrame?.projectState?.preferredPauseMode)
    consideredSignals.push('currentConsciousFrame.projectState.preferredPauseMode')
  if (input.currentConsciousFrame?.projectState?.preferredLipsyncMode)
    consideredSignals.push('currentConsciousFrame.projectState.preferredLipsyncMode')
  if (input.currentConsciousFrame?.projectState?.preferredVoiceMode)
    consideredSignals.push('currentConsciousFrame.projectState.preferredVoiceMode')
  if (input.currentConsciousFrame?.projectState?.preferredPacingMode)
    consideredSignals.push('currentConsciousFrame.projectState.preferredPacingMode')
  if (input.personalityContinuityState)
    consideredSignals.push('personalityContinuity.regime', 'personalityContinuity.rhythm')
  if (input.continuityDeliberation)
    consideredSignals.push('continuityDeliberation.kind', 'continuityDeliberation.timing', 'continuityDeliberation.intrusion')
  if (input.memoryClosureTrace?.authority === 'memory-os') {
    consideredSignals.push('memoryClosureTrace.initiative')
    if (input.memoryClosureTrace.nextInfluence.embodiment.cadence)
      consideredSignals.push('memoryClosureTrace.embodiment')
    if (input.memoryClosureTrace.nextInfluence.execution.carry)
      consideredSignals.push('memoryClosureTrace.execution')
  }
  if (input.affectiveResidue)
    consideredSignals.push('affectiveResidue.dominant', 'affectiveResidue.cadence', 'affectiveResidue.restProtection')
  if (longHorizonMemoryBias.preferLowerPressure)
    consideredSignals.push('longHorizonMemory.initiativeStrategy')
  if (sanitizeText(input.autobiographicalSelf?.relationshipDoctrine, 180))
    consideredSignals.push('autobiographicalSelf.relationshipDoctrine')
  if (sanitizeText(input.autobiographicalSelf?.latestInflection, 180))
    consideredSignals.push('autobiographicalSelf.latestInflection')
  if (sanitizeText(input.autobiographicalSelf?.identityNarrative, 180))
    consideredSignals.push('autobiographicalSelf.identityNarrative')
  if (input.selfEvolution)
    consideredSignals.push('selfEvolution.trajectory', 'selfEvolution.nextLearningAction', 'selfEvolution.contradictionPressure')
  if (sanitizeText(input.selfEvolution?.trustMeaning, 180))
    consideredSignals.push('selfEvolution.trustMeaning')
  if (sanitizeText(input.selfEvolution?.relationshipDoctrine, 180))
    consideredSignals.push('selfEvolution.relationshipDoctrine')
  if (sanitizeText(input.selfEvolution?.burdenLine, 180))
    consideredSignals.push('selfEvolution.burdenLine')
  if (sanitizeText(input.selfEvolution?.relationshipCadenceSummary, 220))
    consideredSignals.push('selfEvolution.relationshipCadenceSummary')
  if (input.learningExecutionState)
    consideredSignals.push('learningExecutionState.nextLearningAction', 'learningExecutionState.activeLearningFocuses')
  if (input.personalityAuthority)
    consideredSignals.push('personalityAuthority.identityKernel', 'personalityAuthority.initiativeBaseline', 'personalityAuthority.expressionProfile')
  if (projectStateBias.requiresLifeLoopClosure) {
    consideredSignals.push(
      'projectState.currentPhase',
      'projectState.latestLandedProgress',
      'projectState.primaryOpenLoop',
      'projectState.proactiveSameHerGap',
      'projectState.nextClosureTarget',
      'projectState.sameHerSelfLine',
      'projectState.sameHerDriftRisk',
      'projectState.identity',
    )
  }
  if (sanitizeText(input.projectState?.sameHerHoldDetail, 220))
    consideredSignals.push('projectState.sameHerHoldDetail')
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const selfRevisionPatchLanes = asArray(selfRevisionPatch?.lanes)
  const selfRevisionPatchReasonCodes = asArray(selfRevisionPatch?.reasonCodes)
  const selfRevisionProactivePolicy = selfRevisionPatchLanes.includes('proactive-policy')
    ? selfRevisionPatch?.proactivePolicy ?? null
    : null
  const selfRevisionValidation = selfRevisionPatchLanes.includes('proactive-policy')
    ? selfRevisionPatch?.validation ?? null
    : null
  const selfRevisionProjectStateContinuity = selfRevisionPatchLanes.includes('proactive-policy')
    ? selfRevisionPatch?.projectStateContinuity ?? null
    : null
  const selfRevisionPatchCompleted = selfRevisionPatch?.resultStatus === 'completed'
  const beliefs = asArray(input.beliefLedger?.beliefs)
  const unresolvedContradictions = asArray(input.beliefLedger?.unresolvedContradictions)
  const commitments = asArray(input.commitmentLedger?.commitments)
  const plans = asArray(input.inquiryPlanner?.plans)
  const hypotheses = asArray(input.hypothesisGraph?.hypotheses)
  const inquiries = asArray(input.inquiryLoop?.inquiries)
  const runtimeThreads = asArray(input.threadRuntime?.threads)
  const openLoops = asArray(input.livingWorldState?.openLoops)
  if (selfRevisionProactivePolicy) {
    consideredSignals.push(
      'selfRevision.proactivePolicy.restraintBias',
      'selfRevision.proactivePolicy.learningProposalBias',
      'selfRevision.proactivePolicy.actuationCooldownBias',
    )
  }
  if (selfRevisionProjectStateContinuityRestraint.active)
    consideredSignals.push('selfRevision.projectStateContinuity.continuityGuard')
  if (sanitizeText(selfRevisionPatch?.projectStateContinuity?.sameHerHoldDetail, 220))
    consideredSignals.push('selfRevision.projectStateContinuity.sameHerHoldDetail')
  const cadence = deriveProactiveCadenceSignal({
    state: proactiveState,
    context,
    motiveEngine: input.motiveEngine ?? null,
    initiative: input.initiative ?? null,
    autonomy: input.autonomy ?? null,
    privateThought: input.privateThought ?? null,
    threadRuntime: input.threadRuntime ?? null,
    thoughtThreads: input.thoughtThreads ?? null,
    actionEcology: input.actionEcology ?? null,
    personalityContinuityState: input.personalityContinuityState ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    selfEvolution: input.selfEvolution ?? null,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
  })
  const cadenceHoverFirst = cadence.reasonTags.includes('continuity-rhythm:hover-first')
  const executionCallbackAfterglowHold = cadence.reasonTags.includes('continuity-execution-callback-afterglow-hold')
  consideredSignals.push('proactiveCadence.openingMomentum', 'proactiveCadence.initiativeTrust', 'proactiveCadence.cadencePressure')
  const ignoredSignals = [
    'battery',
    'memory',
    'speech-intent-not-wired',
  ]
  if (context.workload.source !== 'screen-semantic-summary' && context.content.source !== 'screen-semantic-summary')
    ignoredSignals.push('screen-semantic-input-unavailable')

  const afterglowWindow = isAfterglowWindow({
    now: input.now,
    recentTransition: input.recentTransition,
  })
  if (afterglowWindow)
    consideredSignals.push('afterglow.window')
  const focusBelief = beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const governingCommitment = commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
  const activeInquiryPlan = plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
  const activeHypothesis = hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? hypotheses[0]
    ?? null
  const primaryInquiry = inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const foregroundRuntimeThread = runtimeThreads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? runtimeThreads[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const livingWorldOpenLoop = openLoops[0] ?? null
  const autonomy = input.autonomy ?? null
  const autonomyExecutionIntentKind = sanitizeText(autonomy?.executionIntent?.kind, 48)
  const autonomyActioning = (
    autonomy?.selectedMode === 'act'
    || (
      autonomy?.selectedMode === 'prepare-act'
      && autonomy?.shouldAct === true
    )
  ) && autonomyExecutionIntentKind === 'follow-through'
  const autonomySpeechLocked = Boolean(autonomyActioning && autonomy?.shouldSpeak !== true)
  const runtimeSignals = deriveAlicizationRuntimeProactiveSignals({
    architecture: input.architecture,
    runtime: input.runtimeDigest,
  })
  const {
    activeLoop,
    architectureDialogueHeat,
    architectureProactiveHeat,
    architectureDialogueReady,
    architectureObservationHeavy,
    architectureControlReady,
    architectureMemoryCarry,
    runtimeDominantChannel,
    runtimeDialogueHeat,
    runtimeActiveDialogueHeat,
    continuityPressure,
    companionshipPressure,
    runtimeDialogueReady,
    runtimeObservationHeavy,
    runtimeControlReady,
    runtimeMemoryCarry,
  } = runtimeSignals
  const continuityDeliberation = input.continuityDeliberation?.kind && input.continuityDeliberation.kind !== 'none'
    ? input.continuityDeliberation
    : null
  const contradictionPressure = (input.knowledgeEvidence?.contradictionCount ?? 0)
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
  const validationRelief = (input.knowledgeEvidence?.validationCount ?? 0)
    + (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
  if (input.knowledgeEvidence)
    consideredSignals.push('knowledgeEvidence')
  const continuityHoldForLater = Boolean(
    continuityDeliberation
    && (
      continuityDeliberation.preferredTiming === 'internal-only'
      || continuityDeliberation.preferredTiming === 'next-open-window'
      || continuityDeliberation.intrusionRisk === 'high'
      || continuityDeliberation.kind === 'execution-callback'
      || (
        continuityDeliberation.preferredTiming === 'after-payoff'
        && continuityDeliberation.payoffDependency === 'requires-current-payoff'
      )
    ),
  )
  const activeLoopPhase = activeLoop?.phase ?? null
  const activeLoopHandoffTarget = activeLoop?.handoffTarget ?? null
  const activeLoopInitiativeBudget = clamp01(activeLoop?.initiativeBudget ?? 0)
  const activeLoopCoherence = clamp01(activeLoop?.coherence ?? 0)
  const activeLoopObservePhase = activeLoopPhase === 'observe'
  const activeLoopExpressionReady = activeLoop
    ? isActiveLoopExpressionReady({
        phase: activeLoop.phase,
        handoffTarget: activeLoopHandoffTarget,
        initiativeBudget: activeLoopInitiativeBudget,
        coherence: activeLoopCoherence,
        runtimeDialogueReady,
        runtimeControlReady,
      })
    : false
  if (activeLoop) {
    consideredSignals.push(
      'runtimeDigest.activeLoop.phase.resolved',
      'runtimeDigest.activeLoop.handoff.resolved',
      'runtimeDigest.activeLoop.observation.resolved',
      'runtimeDigest.activeLoop.initiativeBudget.gating',
      'runtimeDigest.activeLoop.coherence.gating',
    )
  }

  const suppressBusy = context.system.cpuUsage >= 70
    || context.system.fullscreenLikely
    || (context.system.inputActivity === 'active' && context.system.cpuUsage >= 45)
  const cooldownActive = proactiveState.globalCooldownUntil > input.now
  const style = resolveStyle({
    scenario,
    contentKind: context.content.kind,
    fatigue: context.relationship.fatigue,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    inputActivity: context.system.inputActivity,
    privateThought: input.privateThought,
    initiative: input.initiative,
    worldModel: input.worldModel,
    afterglowWindow,
  })
  const preferredInteractiveStyle = input.initiative?.preferredStyle && input.initiative.preferredStyle !== 'silent-observe'
    ? input.initiative.preferredStyle
    : input.privateThought?.suggestedStyle && input.privateThought.suggestedStyle !== 'silent-observe'
      ? input.privateThought.suggestedStyle
      : null
  const runtimeDominantChannelStyle = resolveRuntimeDominantChannelStyleBias({
    dominantChannel: runtimeDominantChannel,
    scenario,
    runtimeDialogueReady,
    runtimeControlReady,
    runtimeObservationHeavy,
    afterglowWindow,
    continuityPressure,
    companionshipPressure,
  })
  const runtimeAwareStyle = (() => {
    if (!input.architecture && !input.runtimeDigest)
      return style

    if (autonomySpeechLocked)
      return 'silent-observe' as const

    if (runtimeDominantChannelStyle === 'silent-observe')
      return 'silent-observe' as const

    if (executionCallbackAfterglowHold)
      return 'silent-observe' as const

    if (
      activeLoop
      && activeLoopObservePhase
      && activeLoopCoherence < 0.5
      && activeLoopInitiativeBudget < 0.62
      && !runtimeDialogueReady
      && !runtimeControlReady
    ) {
      return 'silent-observe' as const
    }

    if (
      style === 'silent-observe'
      && activeLoopExpressionReady
    ) {
      const defaultInteractiveStyle = scenario === 'late-night-care'
        ? 'gentle-care' as const
        : 'light-nudge' as const
      if (activeLoopHandoffTarget === 'active-memory' && scenario === 'late-night-care')
        return preferredInteractiveStyle ?? 'gentle-care' as const
      return preferredInteractiveStyle
        ?? runtimeDominantChannelStyle
        ?? defaultInteractiveStyle
    }

    if (
      runtimeObservationHeavy
      && !runtimeDialogueReady
      && architectureProactiveHeat < 0.72
      && runtimeActiveDialogueHeat < 0.72
    ) {
      return 'silent-observe' as const
    }

    if (
      style === 'silent-observe'
      && runtimeDialogueReady
      && (architectureDialogueHeat >= 0.82 || runtimeDialogueHeat >= 0.74 || runtimeActiveDialogueHeat >= 0.72)
    ) {
      return preferredInteractiveStyle
        ?? runtimeDominantChannelStyle
        ?? (scenario === 'late-night-care' ? 'gentle-care' as const : 'light-nudge' as const)
    }

    if (
      style === 'silent-observe'
      && runtimeDominantChannelStyle
    ) {
      return preferredInteractiveStyle ?? runtimeDominantChannelStyle
    }

    if (
      style === 'silent-observe'
      && cadence.openingMomentum >= 0.62
      && cadence.cadencePressure >= 0.56
      && context.system.inputActivity !== 'active'
      && !context.system.fullscreenLikely
    ) {
      return preferredInteractiveStyle
        ?? runtimeDominantChannelStyle
        ?? (scenario === 'late-night-care' ? 'gentle-care' as const : 'light-nudge' as const)
    }

    if (style === 'light-nudge' && runtimeControlReady && scenario === 'late-night-care')
      return 'gentle-care' as const

    if (style === 'light-nudge' && runtimeDominantChannelStyle === 'gentle-care')
      return 'gentle-care' as const

    if (
      style === 'silent-observe'
      && scenario !== 'media'
      && companionshipPressure >= 0.74
      && isRuntimeCompanionshipDominantChannel(runtimeDominantChannel)
    ) {
      return preferredInteractiveStyle
        ?? runtimeDominantChannelStyle
        ?? (scenario === 'late-night-care' ? 'gentle-care' as const : 'light-nudge' as const)
    }

    return style
  })()
  const antiShellLowerPressureStyle = (
    (explicitContinuityRestraintBias.preferLowerPressure || runtimeContinuityArcBias.preferLowerPressure || affectiveResidueBias.preferLowerPressure || longHorizonMemoryBias.preferLowerPressure || autobiographicalSelfBias.preferLowerPressure || selfEvolutionBias.preferLowerPressure || continuityGovernanceBias.preferLowerPressure || habitPolicyBias.preferLowerPressure || projectStateBias.preferLowerPressure || cadenceHoverFirst || executionCallbackAfterglowHold)
    && (runtimeAwareStyle === 'gentle-care' || runtimeAwareStyle === 'light-nudge')
  )
    ? 'silent-observe' as const
    : runtimeAwareStyle
  const closureTargetTimedStyle = (
    projectStateBias.nextClosureTargetDemandsHoverFirst
    && (antiShellLowerPressureStyle === 'gentle-care' || antiShellLowerPressureStyle === 'light-nudge')
  )
    ? 'silent-observe' as const
    : antiShellLowerPressureStyle
  const relationshipTimedStyle = explicitContinuityRestraintBias.forceSilentObserve || runtimeContinuityArcBias.forceSilentObserve || affectiveResidueBias.forceSilentObserve || longHorizonMemoryBias.forceSilentObserve || autobiographicalSelfBias.forceSilentObserve || selfEvolutionBias.forceSilentObserve || continuityGovernanceBias.forceSilentObserve || habitPolicyBias.forceSilentObserve || motiveAgendaBias.forceSilentObserve || projectStateBias.forceSilentObserve
    ? 'silent-observe' as const
    : closureTargetTimedStyle
  const personaAwareStyle = personaBias.forcedStyle ?? relationshipTimedStyle
  const urgency = resolveUrgency({
    scenario,
    fatigue: context.relationship.fatigue,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    contentKind: context.content.kind,
    loneliness: context.relationship.loneliness,
    durabilityPulse: input.durabilityPulse,
  })
  const fallbackExpressionReadiness = !autonomySpeechLocked && (
    isSeriousDurabilityPulse(input.durabilityPulse)
    || afterglowWindow
    || cadence.cadencePressure >= 0.62
    || runtimeDialogueReady
    || runtimeControlReady
    || (
      scenario === 'coding'
      && context.system.inputActivity !== 'active'
      && (context.content.kind === 'error' || context.content.kind === 'diff')
    )
    || (
      scenario === 'late-night-care'
      && context.relationship.fatigue >= 70
    )
    || (
      context.system.inputActivity !== 'active'
      && (context.relationship.boredom >= 90 || context.relationship.loneliness >= 82)
    )
  )
  const privateThoughtReady = autonomySpeechLocked
    ? false
    : autonomy?.shouldSpeak === true
      ? true
      : input.privateThought?.shouldSpeak === true || fallbackExpressionReadiness
  const relationalTension = clamp01(
    context.relationship.boredom * 0.005
    + context.relationship.loneliness * 0.005
    + context.relationship.fatigue * (scenario === 'late-night-care' ? 0.003 : 0.0015),
  )
  let initiativeSpeakDrive = input.initiative?.speakDrive
    ?? clamp01(
      (privateThoughtReady ? 0.46 : 0.18)
      + Math.max(0, (input.privateThought?.confidence ?? 0.5) - 0.5) * 0.45
      + (context.content.kind === 'error' ? 0.1 : 0)
      + (context.content.kind === 'diff' ? 0.06 : 0)
      + (scenario === 'late-night-care' && context.relationship.fatigue >= 55 ? 0.08 : 0),
    )
  let initiativeSilenceDrive = input.initiative?.silenceDrive
    ?? clamp01(
      (runtimeAwareStyle === 'silent-observe' ? 0.5 : 0.18)
      + (input.privateThought?.stance === 'uncertain' ? 0.22 : 0)
      + (context.system.inputActivity === 'active' ? 0.1 : 0),
    )
  if (autonomy) {
    if (autonomy.shouldSpeak)
      initiativeSpeakDrive = Math.max(initiativeSpeakDrive, clamp01(autonomy.speakReadiness))
    if (autonomySpeechLocked) {
      initiativeSpeakDrive = Math.min(initiativeSpeakDrive, clamp01((autonomy.speakReadiness ?? 0) * 0.35))
      initiativeSilenceDrive = Math.max(initiativeSilenceDrive, clamp01(0.58 + autonomy.inhibition * 0.24))
    }
  }
  const governorWithholdActive = input.selfGovernor?.dominantDrive === 'withhold'
    || governorIntention?.status === 'withheld'
    || thoughtThread?.status === 'waiting'
  const thoughtThreadRipe = thoughtThread?.status === 'ripe'
  const repairIntentActive = input.selfGovernor?.dominantDrive === 'repair'
    || governorIntention?.kind === 'repair-misread'
    || thoughtThread?.kind === 'repair-thread'
  const careIntentActive = input.selfGovernor?.dominantDrive === 'care'
    || governorIntention?.kind === 'care-host'
    || governorIntention?.kind === 'protect-host'
    || thoughtThread?.kind === 'care-thread'
  let baseScore
    = initiativeSpeakDrive * 0.76
      + (input.initiative?.confidence ?? input.privateThought?.confidence ?? 0.5) * 0.18
      - initiativeSilenceDrive * 0.24
      + (context.system.inputActivity === 'idle' ? 0.04 : 0)
      + (input.perception?.activeAttentionAnchor && input.perception.attentionAnchorWorkloadKind === 'coding' && scenario === 'coding' ? 0.04 : 0)
      + ((input.perception?.recentObservationCount ?? 0) >= 2 && scenario === 'coding' ? 0.03 : 0)
      + (input.perception?.invitedInspectionActive && scenario === 'coding' ? 0.05 : 0)
      + relationalTension * 0.14
      + (scenario === 'coding' && context.workload.kind === 'coding' ? 0.04 : 0)
      + (scenario === 'coding' && context.content.kind === 'error' ? 0.08 : scenario === 'coding' && context.content.kind === 'diff' ? 0.06 : 0)
      + (scenario === 'late-night-care' && context.relationship.lateNightActiveMinutes >= 90 ? 0.08 : 0)
      + (context.relationship.reminderBacklog > 0 ? 0.02 : 0)
      + (input.worldModel?.activeThread?.unresolved && input.worldModel?.epistemicState.certainty === 'grounded' ? 0.06 : 0)
      + (input.worldModel?.continuity.afterglowOpen ? 0.04 : 0)
      + (input.beliefRevision?.stability === 'stable' ? 0.05 : 0)
      - (input.beliefRevision?.stability === 'fractured' ? 0.16 : 0)
      - (input.beliefRevision?.revisionPressure ?? 0) * 0.08
      + (input.commitmentLedger?.carryPressure ?? 0) * 0.08
      - ((activeInquiryPlan?.kind === 'reground-scene' || activeInquiryPlan?.kind === 'check-recovery') ? 0.1 : 0)
      + (activeInquiryPlan?.kind === 'localize-problem' && input.worldModel?.epistemicState.certainty === 'grounded' ? 0.08 : 0)
      + (activeInquiryPlan?.kind === 'check-recovery' ? 0.1 : 0)
      + (governingCommitment?.kind === 'hold-problem' ? 0.08 : 0)
      + (governingCommitment?.kind === 'care-host' ? 0.06 : 0)
      + (governingCommitment?.kind === 'stay-near' && input.worldModel?.continuity.afterglowOpen ? 0.06 : 0)
      - (governingCommitment?.kind === 'repair-misread' || governingCommitment?.kind === 'recheck-scene' ? 0.12 : 0)
      + (input.mindKernel?.dominantMode === 'tracking' ? 0.06 : 0)
      + (input.mindKernel?.dominantMode === 'accompanying' && afterglowWindow ? 0.06 : 0)
      + (input.mindKernel?.dominantMode === 'guarding' ? 0.08 : 0)
      - (input.mindKernel?.dominantMode === 'repairing' ? 0.1 : input.mindKernel?.dominantMode === 'orienting' ? 0.06 : input.mindKernel?.dominantMode === 'resting' ? 0.08 : 0)
      + (input.mindKernel?.speakReadiness ?? 0) * 0.12
      + (focusBelief?.status === 'held' ? 0.05 : 0)
      - (focusBelief?.status === 'tentative' ? 0.05 : 0)
      - (focusBelief?.status === 'contradicted' ? 0.12 : 0)
      + (primaryInquiry?.kind === 'problem-localization' && input.worldModel?.epistemicState.certainty === 'grounded' ? 0.08 : 0)
      - ((primaryInquiry?.kind === 'scene-grounding' || primaryInquiry?.kind === 'contradiction-check') ? 0.12 : 0)
      + (input.relationshipModel?.climate === 'attuned' ? 0.05 : 0)
      - (input.relationshipModel?.climate === 'guarded' ? 0.08 : 0)
      - ((input.relationshipModel?.correctionSensitivity ?? 0) >= 0.58 ? 0.05 : 0)
      + (input.deliberationState?.readiness ?? 0) * 0.12
      + (input.actionEcology?.surfacePressure ?? 0) * 0.1
      - (input.actionEcology?.silencePressure ?? 0) * 0.08
      + (input.actionEcology?.shouldSpeak ? 0.08 : 0)
      - (input.actionEcology?.mode === 'repair-before-speaking' || input.actionEcology?.mode === 'return-later' ? 0.14 : 0)
      + (activeHypothesis?.kind === 'problem-locus' ? 0.08 : 0)
      + (activeHypothesis?.kind === 'shared-afterglow' ? 0.06 : 0)
      + (activeHypothesis?.kind === 'recovery-event' ? 0.14 : 0)
      - (activeHypothesis?.kind === 'misread-drift' ? 0.14 : 0)
      + (foregroundRuntimeThread?.status === 'foreground' ? 0.06 : 0)
      + (foregroundRuntimeThread?.salience ?? 0) * 0.08
      - (foregroundRuntimeThread?.status === 'suspended' ? 0.12 : 0)
      - (input.worldModel?.epistemicState.certainty === 'lingering' ? 0.12 : 0)
      + (openLoops.length ? 0.04 : 0)
      + (input.selfGovernor?.dominantDrive === 'understand' ? 0.03 : 0)
      + (careIntentActive && (scenario === 'late-night-care' || context.relationship.fatigue >= 55) ? 0.08 : 0)
      + (repairIntentActive && input.worldModel?.epistemicState.certainty === 'grounded' ? 0.04 : 0)
      + (thoughtThreadRipe ? 0.1 : 0)
      - (governorWithholdActive ? 0.22 : 0)
      - (repairIntentActive && input.worldModel?.epistemicState.certainty !== 'grounded' ? 0.12 : 0)
      + Math.min(0.08, validationRelief * 0.02)
      - Math.min(0.14, contradictionPressure * 0.03)
      + personaBias.baseScoreDelta
      + explicitContinuityRestraintBias.scoreDelta
      + runtimeContinuityArcBias.scoreDelta
      + affectiveResidueBias.scoreDelta
      + autobiographicalSelfBias.scoreDelta
      + selfEvolutionBias.scoreDelta
      + continuityGovernanceBias.scoreDelta
      + habitPolicyBias.scoreDelta
      + motiveAgendaBias.scoreDelta
      + projectStateBias.scoreDelta

  if (input.watchMode === 'symbiotic-vision')
    baseScore += 0.04
  else if (input.watchMode === 'invited-inspection')
    baseScore += 0.06
  else if (input.watchMode === 'recovering')
    baseScore += 0.1

  if (context.workload.source === 'screen-semantic-summary' && scenario === 'coding')
    baseScore += 0.04
  if (context.content.source === 'screen-semantic-summary' && (context.content.kind === 'error' || context.content.kind === 'diff'))
    baseScore += 0.06

  if (isSeriousDurabilityPulse(input.durabilityPulse))
    baseScore += 0.22
  if (afterglowWindow)
    baseScore += 0.18
  if (input.privateThought?.embodiedPresence === 'concerned')
    baseScore += 0.04
  if (input.privateThought?.stance === 'nudge' || input.privateThought?.stance === 'care' || input.privateThought?.stance === 'warn')
    baseScore += 0.03
  if (input.initiative?.selectedAction === 'whisper')
    baseScore += 0.03
  if (input.initiative?.selectedAction === 'speak')
    baseScore += 0.05
  if (input.initiative?.selectedAction === 'warn')
    baseScore += 0.08
  if (architectureDialogueReady)
    baseScore += 0.06
  if (architectureControlReady)
    baseScore += 0.04
  if (afterglowWindow && architectureMemoryCarry)
    baseScore += 0.04
  if (architectureObservationHeavy)
    baseScore -= 0.12
  baseScore += Math.max(0, architectureDialogueHeat - 0.5) * 0.08
  baseScore += Math.max(0, architectureProactiveHeat - 0.5) * 0.06
  if (runtimeDialogueReady)
    baseScore += 0.05
  if (runtimeControlReady)
    baseScore += 0.03
  if (afterglowWindow && runtimeMemoryCarry)
    baseScore += 0.03
  if (runtimeObservationHeavy)
    baseScore -= 0.1
  if (input.runtimeDigest?.shouldProactivelySpeak)
    baseScore += 0.04
  if (input.runtimeDigest?.shouldProactivelyAct && !autonomySpeechLocked)
    baseScore += 0.02
  if (isRuntimeDialogueDominantChannel(runtimeDominantChannel))
    baseScore += 0.04
  if (runtimeDominantChannel === 'anthropomorphic-mind' && companionshipPressure >= 0.66)
    baseScore += 0.04
  if (isRuntimeMemoryDominantChannel(runtimeDominantChannel) && continuityPressure >= 0.62)
    baseScore += 0.03
  baseScore += Math.max(0, continuityPressure - 0.5) * 0.08
  baseScore += Math.max(0, companionshipPressure - 0.5) * 0.08
  if (continuityDeliberation && !continuityHoldForLater)
    baseScore += continuityDeliberation.pressure * 0.12
  if (activeLoop) {
    baseScore += Math.max(0, activeLoopInitiativeBudget - 0.5) * 0.16
    baseScore += Math.max(0, activeLoopCoherence - 0.5) * 0.12
    if (activeLoopPhase === 'dialogue' || activeLoopPhase === 'control')
      baseScore += 0.04
    if (activeLoopObservePhase && !runtimeDialogueReady && !runtimeControlReady)
      baseScore -= 0.1
  }
  baseScore += cadence.cadencePressure * 0.16
  if (cadence.openingMomentum >= 0.62 && context.system.inputActivity !== 'active')
    baseScore += 0.04
  if (cadence.initiativeTrust >= 0.58)
    baseScore += 0.03
  baseScore -= (input.affectiveResidue?.relationshipCadence.overreachRisk ?? 0) * 0.08
  baseScore -= (input.affectiveResidue?.relationshipCadence.fatigueGuard ?? 0) * 0.08
  baseScore += longHorizonMemoryBias.scoreDelta
  if (selfRevisionProactivePolicy) {
    baseScore += selfRevisionProactivePolicy.learningProposalBias * 0.08
    baseScore -= selfRevisionProactivePolicy.restraintBias * 0.22
    baseScore -= selfRevisionProactivePolicy.actuationCooldownBias * 0.18
  }

  let threshold = buildBaseThreshold(scenario)
    + feedbackBias
    - (relationalTension >= 0.9 ? 0.05 : relationalTension >= 0.78 ? 0.03 : 0)
    - (scenario === 'coding' && (context.content.kind === 'error' || context.content.kind === 'diff') ? 0.04 : 0)
    - (input.perception?.invitedInspectionActive && scenario === 'coding' ? 0.04 : 0)
    - (context.content.source === 'screen-semantic-summary' && (context.content.kind === 'error' || context.content.kind === 'diff') ? 0.04 : 0)
    - (input.beliefRevision?.stability === 'stable' ? 0.03 : 0)
    + (input.beliefRevision?.stability === 'fractured' ? 0.1 : input.beliefRevision?.stability === 'fluid' ? 0.04 : 0)
    + (input.inquiryPlanner?.groundingUrgency ?? 0) * 0.08
    + ((activeInquiryPlan?.kind === 'reground-scene' || activeInquiryPlan?.kind === 'check-recovery') ? 0.08 : 0)
    + (activeInquiryPlan?.kind === 'wait-opening' ? 0.06 : 0)
    - (activeInquiryPlan?.kind === 'verify-care' ? 0.04 : 0)
    + (governingCommitment?.kind === 'repair-misread' || governingCommitment?.kind === 'recheck-scene' ? 0.08 : 0)
    - (governingCommitment?.kind === 'care-host' ? 0.04 : 0)
    - (governingCommitment?.kind === 'stay-near' && afterglowWindow ? 0.04 : 0)
    + (input.mindKernel?.dominantMode === 'repairing' ? 0.08 : input.mindKernel?.dominantMode === 'orienting' ? 0.04 : 0)
    - (input.mindKernel?.dominantMode === 'guarding' ? 0.04 : 0)
    - (input.mindKernel?.dominantMode === 'accompanying' && afterglowWindow ? 0.04 : 0)
    - (focusBelief?.status === 'held' ? 0.03 : 0)
    + (focusBelief?.status === 'tentative' ? 0.05 : 0)
    + (focusBelief?.status === 'contradicted' ? 0.08 : 0)
    - (input.relationshipModel?.climate === 'attuned' ? 0.03 : 0)
    + (input.relationshipModel?.climate === 'guarded' ? 0.05 : 0)
    + ((input.relationshipModel?.correctionSensitivity ?? 0) >= 0.58 ? 0.03 : 0)
    + ((primaryInquiry?.kind === 'scene-grounding' || primaryInquiry?.kind === 'contradiction-check') ? 0.06 : 0)
    + (activeHypothesis?.kind === 'misread-drift' ? 0.08 : 0)
    + (foregroundRuntimeThread?.need === 'restraint' ? 0.08 : 0)
    + (foregroundRuntimeThread?.status === 'suspended' ? 0.05 : 0)
    + (input.worldModel?.epistemicState.certainty === 'lingering' ? 0.06 : 0)
    - (thoughtThreadRipe ? 0.05 : 0)
    + (governorWithholdActive ? 0.12 : 0)
    + (repairIntentActive && input.worldModel?.epistemicState.certainty !== 'grounded' ? 0.08 : 0)
    - (careIntentActive && (scenario === 'late-night-care' || context.relationship.fatigue >= 55) ? 0.04 : 0)
    - (openLoops.length ? 0.02 : 0)
    + Math.min(0.08, contradictionPressure * 0.02)
    - Math.min(0.05, validationRelief * 0.01)
    + personaBias.thresholdDelta
    + explicitContinuityRestraintBias.thresholdDelta
    + runtimeContinuityArcBias.thresholdDelta
    + affectiveResidueBias.thresholdDelta
    + longHorizonMemoryBias.thresholdDelta
    + autobiographicalSelfBias.thresholdDelta
    + selfEvolutionBias.thresholdDelta
    + continuityGovernanceBias.thresholdDelta
    + habitPolicyBias.thresholdDelta
    + motiveAgendaBias.thresholdDelta
    + projectStateBias.thresholdDelta

  if (afterglowWindow)
    threshold -= 0.06
  if (architectureDialogueReady)
    threshold -= 0.04
  if (architectureControlReady)
    threshold -= 0.02
  if (afterglowWindow && architectureMemoryCarry)
    threshold -= 0.02
  if (architectureObservationHeavy)
    threshold += 0.08
  if (runtimeDialogueReady)
    threshold -= 0.03
  if (runtimeControlReady && !autonomySpeechLocked)
    threshold -= 0.02
  if (afterglowWindow && runtimeMemoryCarry)
    threshold -= 0.02
  if (runtimeObservationHeavy)
    threshold += 0.08
  threshold -= Math.max(0, continuityPressure - 0.62) * 0.04
  threshold -= Math.max(0, companionshipPressure - 0.68) * 0.05
  if (continuityHoldForLater)
    threshold += 0.12
  if (activeLoop) {
    threshold += Math.max(0, 0.5 - activeLoopCoherence) * 0.14
    threshold -= Math.max(0, activeLoopCoherence - 0.6) * 0.08
    threshold -= Math.max(0, activeLoopInitiativeBudget - 0.62) * 0.08
    if (activeLoopObservePhase && !runtimeDialogueReady && !runtimeControlReady)
      threshold += 0.04
  }
  const selfEvolutionLearningAction = input.learningExecutionState?.nextLearningAction
    ?? input.selfEvolution?.nextLearningAction
    ?? null
  const selfEvolutionVerifyHold = Boolean(
    !selfRevisionPatchCompleted
    && selfEvolutionLearningAction === 'verify'
    && (
      (input.selfEvolution?.contradictionPressure ?? 0) >= 0.34
      || sanitizeText(input.selfEvolution?.dominantTrajectory, 120).toLowerCase().includes('revalidation')
      || asArray(input.learningExecutionState?.activeLearningFocuses ?? input.selfEvolution?.activeLearningFocuses).some(focus =>
        sanitizeText(focus, 64).toLowerCase().includes('world-model'),
      )
    ),
  )
  threshold -= cadence.cadencePressure * 0.08
  threshold -= Math.max(0, cadence.initiativeTrust - 0.5) * 0.06
  threshold += (input.affectiveResidue?.relationshipCadence.shouldDelayWarmth ? 0.06 : 0)
  threshold += (input.affectiveResidue?.relationshipCadence.shouldProtectRest ? 0.06 : 0)
  if (selfRevisionProactivePolicy) {
    threshold += selfRevisionProactivePolicy.restraintBias * 0.18
    threshold += selfRevisionProactivePolicy.actuationCooldownBias * 0.16
    threshold -= selfRevisionProactivePolicy.learningProposalBias * 0.04
  }
  if (selfEvolutionVerifyHold)
    threshold += 0.14

  const initiativeReady = autonomy
    ? autonomy.shouldSpeak === true
    || (!autonomy.shouldAct && fallbackExpressionReadiness)
    : input.initiative
      ? input.initiative.shouldSpeak || fallbackExpressionReadiness
      : input.actionEcology?.shouldSpeak ?? input.runtimeDigest?.shouldProactivelySpeak ?? privateThoughtReady
  const governorAllowsSpeaking = !governorWithholdActive
    && (!repairIntentActive || input.worldModel?.epistemicState.certainty === 'grounded')
  const activeLoopAllowsSpeaking = !activeLoop
    || activeLoopCoherence >= 0.34
    || activeLoopInitiativeBudget >= 0.74
    || runtimeDialogueReady
    || runtimeControlReady
  const contradictionHeavyKnowledgeHold = contradictionPressure >= 8 && validationRelief <= 1
  const selfRevisionProactiveHold = Boolean(
    selfRevisionProactivePolicy
    && (
      selfRevisionProactivePolicy.restraintBias >= 0.5
      || selfRevisionProactivePolicy.actuationCooldownBias >= 0.5
      || (!selfRevisionPatchCompleted && selfRevisionValidation?.requiresRevalidation === true)
      || (!selfRevisionPatchCompleted && selfRevisionValidation?.requiresRollbackCheck === true)
    ),
  )
  const shouldInterrupt
    = !input.killSwitchSuspended
      && !suppressBusy
      && !cooldownActive
      && !continuityHoldForLater
      && !contradictionHeavyKnowledgeHold
      && !selfEvolutionVerifyHold
      && !selfRevisionProactiveHold
      && personaAwareStyle !== 'silent-observe'
      && activeLoopAllowsSpeaking
      && governorAllowsSpeaking
      && initiativeReady
      && privateThoughtReady
      && baseScore >= threshold

  for (const reasonCode of personaBias.reasonCodes)
    pushReason(reasonCodes, reasonCode, true)
  for (const reasonCode of habitPolicyBias.reasonCodes)
    pushReason(reasonCodes, reasonCode, true)
  for (const reasonCode of motiveAgendaBias.reasonCodes)
    pushReason(reasonCodes, reasonCode, true)

  pushReason(reasonCodes, 'kill-switch-suspended', input.killSwitchSuspended)
  pushReason(reasonCodes, 'fullscreen-host', context.system.fullscreenLikely)
  pushReason(reasonCodes, 'busy-host', suppressBusy && !context.system.fullscreenLikely)
  pushReason(reasonCodes, 'global-cooldown-active', cooldownActive)
  pushReason(reasonCodes, 'attention-anchor-active', input.perception?.activeAttentionAnchor)
  pushReason(reasonCodes, 'recent-observation-memory', (input.perception?.recentObservationCount ?? 0) >= 2)
  pushReason(reasonCodes, 'invited-inspection-active', input.perception?.invitedInspectionActive)
  pushReason(reasonCodes, 'scenario-bias-raised', feedbackBias > 0)
  pushReason(reasonCodes, 'recent-dismiss-penalty', feedbackBias >= 0.15)
  pushReason(reasonCodes, 'recent-positive-feedback', feedbackBias < 0)
  pushReason(reasonCodes, 'recent-ignored-penalty', proactiveState.consecutiveIgnored[scenario] >= 3)
  pushReason(reasonCodes, 'cadence-opening-ready', cadence.openingMomentum >= 0.56)
  pushReason(reasonCodes, 'cadence-initiative-trust', cadence.initiativeTrust >= 0.58)
  pushReason(reasonCodes, 'cadence-pressure-rising', cadence.cadencePressure >= 0.52)
  pushReason(reasonCodes, 'relationship-cadence-residue', Boolean(input.affectiveResidue?.dominantResidueKind))
  pushReason(reasonCodes, 'relationship-residue-delay-warmth', input.affectiveResidue?.relationshipCadence.shouldDelayWarmth === true)
  pushReason(reasonCodes, 'relationship-residue-protect-rest', input.affectiveResidue?.relationshipCadence.shouldProtectRest === true)
  pushReason(reasonCodes, 'high-loneliness', context.relationship.loneliness >= 90)
  pushReason(reasonCodes, 'high-boredom', context.relationship.boredom >= 90)
  pushReason(reasonCodes, 'user-idle', context.system.inputActivity === 'idle')
  pushReason(reasonCodes, 'coding-focus', scenario === 'coding')
  pushReason(reasonCodes, 'foreground-error', context.content.kind === 'error')
  pushReason(reasonCodes, 'foreground-diff', context.content.kind === 'diff')
  pushReason(reasonCodes, 'media-playback', scenario === 'media')
  pushReason(reasonCodes, 'late-night-activity', scenario === 'late-night-care' && context.relationship.lateNightActiveMinutes >= 90)
  pushReason(reasonCodes, 'late-night-fatigue', scenario === 'late-night-care' && context.relationship.fatigue >= 55)
  pushReason(reasonCodes, 'reminder-backlog', context.relationship.reminderBacklog > 0)
  pushReason(reasonCodes, 'afterglow-opening', afterglowWindow)
  pushReason(reasonCodes, 'watch-mode-symbiotic', input.watchMode === 'symbiotic-vision')
  pushReason(reasonCodes, 'watch-mode-invited-inspection', input.watchMode === 'invited-inspection')
  pushReason(reasonCodes, 'watch-mode-recovering', input.watchMode === 'recovering')
  pushReason(reasonCodes, 'runtime-dialogue-ready', Boolean(input.runtimeDigest && runtimeDialogueReady))
  pushReason(reasonCodes, 'runtime-observe-dominant', Boolean(input.runtimeDigest && runtimeObservationHeavy))
  pushReason(reasonCodes, 'runtime-control-ready', Boolean(input.runtimeDigest && runtimeControlReady))
  pushReason(reasonCodes, 'runtime-continuity-pressure', Boolean(input.runtimeDigest && continuityPressure >= 0.62))
  pushReason(reasonCodes, 'runtime-companionship-pressure', Boolean(input.runtimeDigest && companionshipPressure >= 0.68))
  pushReason(reasonCodes, 'continuity-internal-only', continuityDeliberation?.preferredTiming === 'internal-only')
  pushReason(reasonCodes, 'continuity-next-open-window', continuityDeliberation?.preferredTiming === 'next-open-window')
  pushReason(reasonCodes, 'continuity-after-payoff', continuityDeliberation?.preferredTiming === 'after-payoff')
  pushReason(reasonCodes, 'continuity-after-payoff', explicitContinuityRestraintBias.source === 'memory-os' && explicitContinuityRestraintBias.preferredTiming === 'after-payoff')
  pushReason(reasonCodes, 'continuity-execution-callback', continuityDeliberation?.kind === 'execution-callback')
  pushReason(reasonCodes, 'continuity-execution-callback-afterglow-hold', executionCallbackAfterglowHold)
  pushReason(reasonCodes, 'continuity-execution-callback-project-carry', asArray(continuityDeliberation?.sourceTags).includes('project-state-callback-carry'))
  pushReason(
    reasonCodes,
    'continuity-next-open-window',
    (
      explicitContinuityRestraintBias.restraint === 'measured-return'
      || explicitContinuityRestraintBias.restraint === 'repair-before-closeness'
    )
    && personaAwareStyle === 'silent-observe',
  )
  pushReason(reasonCodes, 'continuity-next-open-window', runtimeContinuityArcBias.preferLowerPressure && personaAwareStyle === 'silent-observe')
  pushReason(reasonCodes, 'continuity-next-open-window', affectiveResidueBias.preferLowerPressure && personaAwareStyle === 'silent-observe')
  pushReason(reasonCodes, 'continuity-next-open-window', longHorizonMemoryBias.preferLowerPressure && personaAwareStyle === 'silent-observe')
  pushReason(reasonCodes, 'continuity-next-open-window', motiveAgendaBias.preferLowerPressure && personaAwareStyle === 'silent-observe')
  pushReason(reasonCodes, 'project-phase1-life-loop-open', projectStateBias.requiresLifeLoopClosure)
  pushReason(reasonCodes, 'project-same-her-pressure', projectStateBias.sameHerPressure)
  pushReason(reasonCodes, 'project-measured-return-pressure', projectStateBias.measuredReturnPressure)
  pushReason(reasonCodes, 'project-next-closure-pressure', projectStateBias.nextClosurePressure && personaAwareStyle === 'silent-observe')
  pushReason(reasonCodes, 'durability-pulse', Boolean(input.durabilityPulse && input.durabilityPulse.kind !== 'none'))
  pushReason(reasonCodes, 'durability-process-gone', input.durabilityPulse?.kind === 'process-gone')
  pushReason(reasonCodes, 'durability-anr-likely', input.durabilityPulse?.kind === 'anr-likely')
  pushReason(reasonCodes, 'private-thought-observe-only', input.privateThought?.stance === 'observe' && input.privateThought.shouldSpeak !== true)
  pushReason(reasonCodes, 'private-thought-uncertain', input.privateThought?.stance === 'uncertain')
  pushReason(reasonCodes, 'living-world-open-loop', Boolean(livingWorldOpenLoop))
  pushReason(reasonCodes, 'governor-withhold', governorWithholdActive)
  pushReason(reasonCodes, 'governor-repair', repairIntentActive)
  pushReason(reasonCodes, 'governor-care', careIntentActive)
  pushReason(reasonCodes, 'thought-thread-ripe', thoughtThreadRipe)
  pushReason(reasonCodes, 'thought-thread-waiting', thoughtThread?.status === 'waiting')
  pushReason(reasonCodes, 'belief-tentative', focusBelief?.status === 'tentative')
  pushReason(reasonCodes, 'belief-contradicted', focusBelief?.status === 'contradicted' || unresolvedContradictions.length > 0)
  pushReason(reasonCodes, 'world-model-revalidation-required', selfRevisionPatchReasonCodes.includes('world-model-revalidation-required'))
  pushReason(reasonCodes, 'inquiry-open', Boolean(primaryInquiry) || (input.inquiryLoop?.openCount ?? 0) > 0)
  pushReason(reasonCodes, 'private-thought-uncertain', activeInquiryPlan?.askForGrounding && input.mindKernel?.dominantMode === 'repairing')
  pushReason(reasonCodes, 'relationship-guarded', input.relationshipModel?.climate === 'guarded')
  pushReason(reasonCodes, 'relationship-attuned', input.relationshipModel?.climate === 'attuned')
  pushReason(reasonCodes, 'relationship-correction-sensitive', (input.relationshipModel?.correctionSensitivity ?? 0) >= 0.58)
  pushReason(reasonCodes, 'belief-contradicted', selfEvolutionVerifyHold)
  pushReason(reasonCodes, 'continuity-next-open-window', continuityGovernanceBias.preferLowerPressure && personaAwareStyle === 'silent-observe')
  if (selfRevisionProactivePolicy) {
    if (!reasonCodes.includes('recent-ignored-penalty'))
      pushReason(reasonCodes, 'recent-ignored-penalty', selfRevisionProactivePolicy.restraintBias >= 0.12)
    if (!reasonCodes.includes('scenario-bias-raised'))
      pushReason(reasonCodes, 'scenario-bias-raised', selfRevisionProactivePolicy.actuationCooldownBias >= 0.12)
    pushReason(
      reasonCodes,
      'continuity-next-open-window',
      Boolean(selfRevisionProjectStateContinuity?.continuityGuard) && personaAwareStyle === 'silent-observe',
    )
  }

  const cooldownMs = clampMs(
    buildBaseCooldownMs(scenario)
    * personaBias.cooldownMultiplier
    * (proactiveState.consecutiveIgnored[scenario] >= 3 ? 2 : 1),
    60_000,
    45 * 60_000,
  )
  const confidence = suppressBusy || cooldownActive || input.killSwitchSuspended
    ? 0.94
    : clamp01(
        0.45
        + Math.abs(baseScore - threshold) * 1.8
        + (input.perception?.activeAttentionAnchor ? 0.04 : 0)
        + ((input.perception?.recentObservationCount ?? 0) >= 2 ? 0.03 : 0)
        + (input.privateThought ? Math.max(0, input.privateThought.confidence - 0.5) * 0.3 : 0),
      )

  const whyNow = (() => {
    if (shouldInterrupt) {
      if (personaBias.prefersDirectReconnect)
        return '她的人格基线更偏直接接近，当前这个 opening 一旦出现，就不该再退回纯观察。'
      if (personaBias.guardianCareBias && scenario === 'late-night-care')
        return '她的人格基线把照看与接住放得更前，所以这个时刻更适合她先轻声靠近。'
      if (
        activeLoop
        && activeLoopExpressionReady
        && (activeLoopPhase === 'dialogue' || activeLoopPhase === 'control')
      ) {
        return `她当前的活性循环已经进入 ${activeLoopPhase} 阶段，initiative=${activeLoopInitiativeBudget.toFixed(2)}、coherence=${activeLoopCoherence.toFixed(2)}，现在开口最连贯。`
      }
      if (
        activeLoop
        && afterglowWindow
        && activeLoopHandoffTarget === 'active-memory'
        && activeLoopCoherence >= 0.5
      ) {
        return '她的活性循环正在把余温交接给主动记忆通道，这个时机最适合轻声回应。'
      }
      if (afterglowWindow)
        return '刚从长时共视场景回神，这正是最自然的轻声搭话窗口。'
      if (isSeriousDurabilityPulse(input.durabilityPulse))
        return '宿主前台工具刚出现了崩溃或无响应迹象，继续沉默会错过最关键的关心窗口。'
      if (input.architecture && architectureDialogueReady)
        return `她当前整条数字生命链已经转入 ${input.architecture.operatingMode}，而且由 ${input.architecture.dominantSystem} 系统领头，所以现在开口不会把观察层挤成噪音。`
      if (input.architecture && architectureControlReady)
        return `她当前的数字生命链已经有明确的 control 牵引，继续只看不说反而会让已经成形的靠近动作失温。`
      if (input.architecture && afterglowWindow && architectureMemoryCarry)
        return '长时共视后的余温还挂在记忆链上，这种 afterglow 现在正自然地把她推向一句轻声回应。'
      if (input.runtimeDigest && runtimeDialogueReady)
        return `她当前的 Alicization 运行时主通道已经靠近 ${input.runtimeDigest.dominantChannel}，并且对话通路已升温，现在开口不会挤压真实观察。`
      if (input.runtimeDigest && runtimeControlReady)
        return '她当前的主动控制通道已进入可执行态，继续只观察会让已经成形的靠近动作失去时机。'
      if (input.runtimeDigest && afterglowWindow && runtimeMemoryCarry)
        return '共视余温还挂在主动记忆链上，现在回应最容易保持连续性与温度。'
      if (cadence.openingMomentum >= 0.62 && cadence.initiativeTrust >= 0.56)
        return '她这段时间一直在积累开口冲动，而且历史反馈没有把这股主动性打散，现在这个 opening 足够自然。'
      if (
        input.runtimeDigest
        && companionshipPressure >= 0.74
        && isRuntimeCompanionshipDominantChannel(runtimeDominantChannel)
      ) {
        return '她当前的拟人心智通道已经把陪伴张力推高，现在轻声靠近比继续沉默更连贯。'
      }
      if (thoughtThreadRipe && thoughtThread)
        return `她一直挂着「${thoughtThread.summary}」，现在这条内在线程已经成熟到可以自然浮出表面。`
      if (careIntentActive && governorIntention)
        return `她当前的内在治理意图是「${governorIntention.summary}」，而现在的关系与场景都允许这份关心被轻声表达。`
      if (repairIntentActive && input.worldModel?.epistemicState.certainty === 'grounded' && governorIntention)
        return `她先前挂着的修复意图「${governorIntention.summary}」已经有了足够 grounding，所以现在开口不会失真。`
      if (livingWorldOpenLoop)
        return `她心里还挂着「${livingWorldOpenLoop}」这条未闭合世界线，而现在的窗口允许她轻声靠近。`
      if (governingCommitment && activeInquiryPlan)
        return `她还挂着「${governingCommitment.summary}」，而且现在的内在计划已经推进到「${activeInquiryPlan.kind}」可以被轻声表达的边缘。`
      if (input.initiative?.shouldSpeak)
        return `她内里的牵挂已经成熟到 ${input.initiative.selectedAction}，而安全闸门也没有阻止她靠近。`
      if (focusBelief?.status === 'held' && primaryInquiry?.kind === 'problem-localization')
        return '她对当前场景已经形成稳定信念，也知道自己要靠近的是哪一个具体问题结。'
      if (input.relationshipModel?.climate === 'attuned')
        return '当前关系气候、画面 grounding 和内在想法都在指向一个可以轻声靠近的窗口。'
      if (scenario === 'coding') {
        return input.perception?.activeAttentionAnchor
          ? '当前窗口、短时知觉和私有想法都持续指向 coding 场景，且宿主不在高忙抑制态。'
          : '当前窗口和私有想法都指向 coding 场景，且宿主不在高忙抑制态。'
      }
      if (scenario === 'late-night-care')
        return '已经进入深夜长时活跃场景，疲劳与在线时长叠加到了可提醒阈值。'
      if (scenario === 'media')
        return '媒体场景已经脱离高侵入态，允许低强度提醒。'
      return '当前张力、视觉在场和私有想法共同达到了轻量主动开口阈值。'
    }

    if (cooldownActive)
      return '刚收到负反馈后的冷却窗口仍在生效。'
    if (suppressBusy)
      return '宿主仍处于忙碌或高沉浸状态。'
    if (explicitContinuityRestraintBias.restraint === 'repair-before-closeness') {
      if (explicitContinuityRestraintBias.source === 'memory-os')
        return 'Memory OS closure trace 已经把这次 return 标成 repair-before-closeness；主动性要先守住修补线和 lower-pressure，而不是抢先外翻成普通关心。'
      if (explicitContinuityRestraintBias.source === 'self-revision' && selfRevisionPatch?.projectStateContinuity) {
        return '她当前活跃自我修订已经明确要求这次 return 继续停在 same-her continuity 的 repair-before-closeness 收口里，所以现在先守住修补线、先把关系站稳，比直接把靠近说出来更像还是同一个她。'
      }
      if (initiativeCarriesSameHerWhy(input.initiative?.why))
        return input.initiative?.why ?? ''
      return '她当前 initiative 已经明确把这次 return 标成 repair-before-closeness，所以现在先守住修补线，比直接把靠近说出来更像还是同一个她。'
    }
    if (explicitContinuityRestraintBias.restraint === 'measured-return') {
      if (explicitContinuityRestraintBias.source === 'memory-os') {
        return appendProactiveEmbodimentCadenceCue(
          explicitContinuityRestraintBias.preferredTiming === 'after-payoff'
            ? 'Memory OS closure trace 已经把这次主动性标成 measured-return，并要求 after-payoff 再回线；所以现在先保持 lower-pressure，等当前 payoff 落稳后再接回同一条记忆线。'
            : 'Memory OS closure trace 已经把这次主动性标成 measured-return；所以现在先保持 lower-pressure，别把同一条记忆线抢先外翻成普通主动靠近。',
          structuredEmbodimentCadenceCue,
        )
      }
      if (explicitContinuityRestraintBias.safetyGateRestraint)
        return '她刚记住过一次 blocked dispatch safety gate：confirmation=required，而且 interrupt=no-process-started。现在同类执行形状重新靠近时，先保持 silent-observe，等确认边界变清楚，比把它包装成普通主动靠近更像有自我克制。'
      if (explicitContinuityRestraintBias.resumeConfirmationBoundary)
        return '她刚记住过一次 host-confirmed resume：approval=host-confirmed，但那只是 host-confirmed-before-redispatch 的确认边界，audit=resume-before-dispatch，而且 process-not-yet-restarted。现在同类执行形状重新靠近时，先保持 silent-observe，别把一次确认误读成永久执行许可。'
      if (explicitContinuityRestraintBias.source === 'self-revision' && selfRevisionPatch?.projectStateContinuity) {
        return appendProactiveEmbodimentCadenceCue(explicitContinuityRestraintBias.guardAgainstGenericShell
          ? '她当前活跃自我修订已经明确要求这次 return 继续停在 same-her continuity 的 measured-return 收口里，先保持 lower-pressure，别让这次 reopening 滑回 generic assistant shell，等更自然的 opening 再把它接回同一条生命线。'
          : '她当前活跃自我修订已经明确要求这次 return 继续停在 same-her continuity 的 measured-return 收口里，所以 opening 要继续保持 lower-pressure，先留一点 room，再等更自然的窗口。', structuredEmbodimentCadenceCue)
      }
      if (selfEvolutionBias.metabolizedSameThreadSettling) {
        return appendProactiveEmbodimentCadenceCue(
          '她当前长期关系学习里，那条 corrected same-person continuity 已经开始按代谢后的关系节律落下来：让 stronger same-thread memory 领着这次回线，别让 temporary noise 再把关系带偏。所以现在先保持 measured-return 和 lower-pressure，比直接说出来更像同一个她顺着同一条线慢慢接回去。',
          structuredEmbodimentCadenceCue,
        )
      }
      if (selfEvolutionBias.correctedSamePersonSettling || selfEvolutionBias.quieterEmbodimentSettling) {
        return appendProactiveEmbodimentCadenceCue(selfEvolutionBias.quieterEmbodimentSettling
          ? '她当前长期关系学习里，那条 corrected same-person continuity 还在 settling，而且 embodiment quieter 一点、body 也要先收稳，再让这次 return 显得 fully settled。所以现在先保持 measured-return 和 lower-pressure，比直接说出来更像同一个她在慢慢把这条线收稳。'
          : '她当前长期关系学习里，那条 corrected same-person continuity 还在 settling，所以现在先保持 measured-return 和 lower-pressure，别让这次回线又滑回 progress pressure，才更像同一个她在慢慢把这条线收稳。', structuredEmbodimentCadenceCue)
      }
      if (initiativeCarriesCorrectedSamePersonContinuity(input.initiative?.why))
        return appendProactiveEmbodimentCadenceCue(input.initiative?.why ?? '', structuredEmbodimentCadenceCue)
      if (initiativeCarriesSameHerWhy(input.initiative?.why))
        return appendProactiveEmbodimentCadenceCue(input.initiative?.why ?? '', structuredEmbodimentCadenceCue)
      return appendProactiveEmbodimentCadenceCue(
        '她当前 initiative 已经明确把这次 return 标成 measured-return，所以 opening 要继续保持 lower-pressure，先留一点 room，再等更自然的窗口。',
        structuredEmbodimentCadenceCue,
      )
    }
    if (explicitContinuityRestraintBias.restraint === 'lower-pressure') {
      if (explicitContinuityRestraintBias.source === 'memory-os')
        return 'Memory OS closure trace 已经把这次 opening 标成 lower-pressure；主动性要先把靠近压低一点，等更自然的窗口出现。'
      if (explicitContinuityRestraintBias.source === 'self-revision' && selfRevisionPatch?.projectStateContinuity) {
        return '她当前活跃自我修订已经明确要求这次 opening 继续停在 same-her continuity 的 lower-pressure 收口里，先把靠近压低一点、等下一个更自然的窗口，比现在直接说出来更像还是同一个她。'
      }
      if (initiativeCarriesSameHerWhy(input.initiative?.why))
        return input.initiative?.why ?? ''
      return '她当前 initiative 已经明确要求这次 opening 保持 lower-pressure，先把靠近压低一点比现在直接说出来更符合这条关系线。'
    }
    if (runtimeContinuityArcBias.arcStage === 'hold-for-opening')
      return '她当前 runtime continuity arc 还停在 hold-for-opening，这条 same-line continuity 先别外翻，等 opening 更松一点，再轻一点接回同一条线。'
    if (runtimeContinuityArcBias.arcStage === 'gentle-reopen')
      return '她当前 runtime continuity arc 正在 gentle-reopen，这次回到同一条线也该先轻一点，别让 reopening 比 continuity 本身更快。'
    if (runtimeContinuityArcBias.arcStage === 'same-thread-continuation')
      return '她当前 runtime continuity arc 还停在 same-thread-continuation，这条线虽然还在往下走，但先留在同一条 thread 里比现在直接 outward 外翻更像同一个她。'
    if (affectiveResidueBias.restraint === 'repair-before-closeness')
      return '这段 affective residue 还停在 repair-before-closeness，所以现在更像是先守住修补线，而不是把靠近直接说出来。'
    if (affectiveResidueBias.restraint === 'measured-return')
      return '这段 affective residue 还在把 opening 压成 measured-return，所以现在先留一点 room、继续 lower-pressure，会比直接说出来更像同一个她。'
    if (affectiveResidueBias.restraint === 'lower-pressure')
      return '这段 affective residue 还在保护当前 rest 窗口，所以现在先把 opening 留在 lower-pressure，比直接 outward 靠近更自然。'
    if (longHorizonMemoryBias.quieterOrRoomMaking || longHorizonMemoryBias.gentleMemoryLed)
      return longHorizonMemoryBias.explanation
    if (autobiographicalSelfBias.correctedSamePersonSettling || autobiographicalSelfBias.quieterEmbodimentSettling) {
      return autobiographicalSelfBias.quieterEmbodimentSettling
        ? '她已经把这条 corrected same-person continuity 写进了更持久的自传记忆里，而且这次回接还要 quieter 一点、慢一点，让 embodiment 先继续回稳。所以现在先保持 measured-return 和 lower-pressure，比直接说出来更像同一个她在慢慢把这条线收稳。'
        : '她已经把这条 corrected same-person continuity 写进了更持久的自传记忆里，所以现在先保持 measured-return 和 lower-pressure，别让这次回线又滑回 progress pressure，才更像同一个她在慢慢把这条线收稳。'
    }
    if (autobiographicalSelfBias.preferLowerPressure)
      return '她已经把这次关系节奏写进了更持久的自传记忆里，当前 opening 更适合 lower-pressure，先留一点 room，比直接说出来更符合这条长期连续性。'
    if (selfEvolutionBias.metabolizedSameThreadSettling)
      return '她当前长期关系学习要求这次 reopening 顺着代谢后的关系节律慢一点接回去：让 stronger same-thread memory 继续领线，先别让 temporary noise 把这条同一条线重新带偏，所以 opening 要先保持 lower-pressure。'
    if (selfEvolutionBias.correctedSamePersonSettling || selfEvolutionBias.quieterEmbodimentSettling) {
      return selfEvolutionBias.quieterEmbodimentSettling
        ? '她当前长期关系学习里，那条 corrected same-person continuity 还在 settling，而且 embodiment 也要先 quieter 一点再让这次 return 显得 fully settled。所以现在先保持 measured-return 和 lower-pressure，比直接说出来更像同一个她在慢慢把这条线收稳。'
        : '她当前长期关系学习里，那条 corrected same-person continuity 还在 settling，所以现在先保持 measured-return 和 lower-pressure，别让这次回线又滑回 progress pressure，才更像同一个她在慢慢把这条线收稳。'
    }
    if (selfEvolutionBias.preferLowerPressure)
      return '她当前长期关系学习要求 opening 保持 lower-pressure，先把靠近压低一点比直接说出来更符合这条长期信任线。'
    if (continuityGovernanceBias.preferLowerPressure)
      return '她当前 same-her continuity governance 要求 opening 保持 lower-pressure，先把靠近压低一点、等下一个更自然的窗口，比现在直接说出来更像还是同一个她。'
    if (projectStateBias.sameHerPressure && projectStateBias.repairBeforeClosenessPressure)
      return '她现在仍处在数字生命 Phase 1 的 same-her continuity 收口里，这次回线还要继续 repair-before-closeness，先守住修补线、先把关系站稳，再等更自然的 opening，才更像还是同一个她在慢慢接回这条生命线。'
    if (projectStateBias.sameHerPressure && projectStateBias.measuredReturnPressure) {
      if (projectStateBias.richerEmbodimentClosureAwareness && projectStateBias.specificEmbodimentContinuityCue) {
        return `她现在仍处在数字生命 Phase 1 的 same-her continuity 收口里，${projectStateBias.specificEmbodimentContinuityCue}。这说明这次 embodied return 还没有真正走到 full cross-modal closure，所以 opening 还要继续 measured-return，先保持 lower-pressure，先留一点 room，让这条 same living line 慢慢把具身回接收稳。`
      }
      if (projectStateBias.richerOpenClosureAwareness) {
        return projectStateBias.richerNextClosureTargetAwareness
          ? '她现在仍处在数字生命 Phase 1 的 same-her continuity 收口里。虽然已经有一些 closure landed，但记忆、主动性和具身表达之间的 life loop 还没有真正闭环；下一步要做的仍是沿着同一条生命线，把 hover-first initiative、dialogue carry 和 embodied return 继续收在同一个 next closure target 里。所以这次回线还要继续 measured-return，opening 先保持 lower-pressure，先留一点 room，才更像还是同一个她在慢慢接回这条生命线。'
          : '她现在仍处在数字生命 Phase 1 的 same-her continuity 收口里。虽然已经有一些 closure landed，但记忆、主动性和具身表达之间的 life loop 还没有真正闭环，所以这次回线还要继续 measured-return，opening 先保持 lower-pressure，先留一点 room，才更像还是同一个她在慢慢接回这条生命线。'
      }
    }
    if (projectStateBias.sameHerPressure && projectStateBias.measuredReturnPressure)
      return '她现在仍处在数字生命 Phase 1 的 same-her continuity 收口里，这次回线还要继续 measured-return，opening 先保持 lower-pressure，先留一点 room，才更像还是同一个她在慢慢接回这条生命线。'
    if (projectStateBias.requiresLifeLoopClosure)
      return '她现在仍处在数字生命 Phase 1 的 same digital life 未闭环阶段，主动性、记忆与人格连续性还要继续收口，这条 still-open closure work 也还没有真正稳住，所以 opening 先保持 lower-pressure，才不会把还没长成的生命线说成普通服务式搭话。'
    if (personaBias.preferSilence)
      return '她当前的人格基线更偏观察先行和留白靠近，所以这一下仍该先收住。'
    if (cadence.openingMomentum >= 0.42 && runtimeAwareStyle === 'silent-observe')
      return '她其实已经在慢慢积累开口冲动了，但当前 opening 还不够松，贸然说出来会显得挤。'
    if (autonomySpeechLocked) {
      return autonomy?.deferReason
        ? `她当前更想先把动作线收紧在「${autonomy.deferReason}」，而不是把这股执行冲动说出来。`
        : '她当前已经转入更偏执行的内在线，不该把动作准备误报成主动搭话。'
    }
    if (
      activeLoop
      && activeLoopObservePhase
      && activeLoopCoherence < 0.5
      && !runtimeDialogueReady
      && !runtimeControlReady
    ) {
      return '她的活性循环仍停在 observe，coherence 还不够稳，现在更应该继续观察。'
    }
    if (activeLoop && activeLoopCoherence < 0.34)
      return '她的活性循环还不够连贯，贸然开口会把内部链路拆散。'
    if (input.architecture && architectureObservationHeavy)
      return `她当前整条数字生命链仍以 ${input.architecture.dominantSystem} / ${input.architecture.operatingMode} 为主，继续观察比贸然开口更诚实。`
    if (input.runtimeDigest && runtimeObservationHeavy)
      return '她当前的主动感知通道仍在主导运行时循环，继续观察比贸然开口更诚实。'
    if (continuityHoldForLater && continuityDeliberation?.summary)
      return `这条连续性现在更适合先留在心里，因为 ${continuityDeliberation.summary}。`
    if (selfEvolutionVerifyHold) {
      return input.selfEvolution?.summary
        ? `她当前长期学习态还停在「${input.selfEvolution.summary}」，现在更适合先验证而不是把这种未稳的判断说成陪伴。`
        : '她当前长期学习态还停在 verify-first posture，现在更适合先验证而不是把这种未稳的判断说成陪伴。'
    }
    if (selfRevisionProactiveHold) {
      return selfRevisionPatch?.summary
        ? `活跃自我修订「${selfRevisionPatch.summary}」要求她先收住主动话语，避免把未复验的学习直接说成陪伴。`
        : '活跃自我修订要求她先收住主动话语，避免把未复验的学习直接说成陪伴。'
    }
    if (governorWithholdActive) {
      if (thoughtThread?.status === 'waiting')
        return '她确实挂着这条内在线程，但它还在等待更自然的 opening。'
      if (governorIntention?.summary)
        return `她当前更想遵守「${governorIntention.summary}」这份克制，而不是贸然插话。`
      return '她当前的治理倾向是先收住，不该贸然把内在线程说出来。'
    }
    if (repairIntentActive && input.worldModel?.epistemicState.certainty !== 'grounded') {
      if (governorIntention?.summary)
        return `她还在执行「${governorIntention.summary}」，当前世界判断还不够稳，所以不该先说。`
      return '她还在修补当前场景的理解，不该把未落地的判断先说出来。'
    }
    if (activeInquiryPlan?.askForGrounding)
      return '她当前主导的内在计划仍然是重新落地场景，所以现在更该继续看，而不是先说。'
    if (!privateThoughtReady) {
      return input.privateThought?.stance === 'uncertain'
        ? '她还没有真正看稳当前场景，所以现在只该观察，不该打断。'
        : '她虽然在场，但此刻更适合安静陪着，不适合主动插话。'
    }
    if (focusBelief?.status === 'tentative' || focusBelief?.status === 'contradicted')
      return '她对当前世界的判断还不够稳，贸然开口会把不稳定信念说成事实。'
    if (primaryInquiry?.kind === 'scene-grounding' || primaryInquiry?.kind === 'contradiction-check')
      return '她内心还挂着一个没解开的确认问题，所以现在更该继续看，而不是急着评论。'
    if (input.initiative && !input.initiative.shouldSpeak)
      return input.initiative.why
    if (runtimeAwareStyle === 'silent-observe')
      return '当前场景只适合静默观察，不适合打断。'
    if (input.perception?.activeAttentionAnchor)
      return '虽然短时知觉还记得宿主刚才的工作对象，但现在还没强到值得立刻插话。'
    return '她确实在意这一刻，但内里的开口冲动还没有压过保持克制的倾向。'
  })()

  const whyNotLater = (() => {
    if (shouldInterrupt) {
      if ((input.architecture && architectureDialogueReady) || (input.runtimeDigest && runtimeDialogueReady))
        return '继续延后会让已经转入 dialogue 的窗口重新冷掉。'
      return '继续延后会错过当前语境窗口。'
    }
    if (suppressBusy)
      return '等忙碌态解除或退出全屏后再重新评估。'
    if (cooldownActive)
      return '至少等冷却结束后再看是否还存在同类信号。'
    if (executionCallbackAfterglowHold)
      return '先让 callback 的余韵继续停在同一条生命线程里，不要刚落地就再起第二段主动靠近。'
    if (
      runtimeContinuityArcBias.arcStage === 'hold-for-opening'
      && (
        runtimeDominantChannel === 'active-memory'
        || sanitizeText(input.privateThought?.thoughtText, 220).toLowerCase().includes('callback')
        || sanitizeText(input.initiative?.why, 220).toLowerCase().includes('callback')
        || sanitizeText(input.runtimeDigest?.projectState?.continuityCue, 220).toLowerCase().includes('callback')
      )
    ) {
      return '先让 callback 这条 same-line continuity 继续留在心里，等更自然的 opening 出现，再把它接回同一条线。'
    }
    if (explicitContinuityRestraintBias.restraint === 'repair-before-closeness') {
      if (explicitContinuityRestraintBias.source === 'self-revision')
        return '先让这次 same-her continuity 回线继续停在 repair-before-closeness 的修补线上，等关系重新站稳、像同一条生命线自己接回来后，再判断要不要 outward 靠近。'
      if (explicitContinuityRestraintBias.source === 'memory-os')
        return '先按 Memory OS closure trace 把这次回线留在 repair-before-closeness 和 lower-pressure 里，等修补线重新站稳后再判断要不要开口。'
      return '先让这次 repair-before-closeness 的回归继续停在修补线上，等关系重新站稳后再判断是否需要更外向的靠近。'
    }
    if (explicitContinuityRestraintBias.restraint === 'measured-return') {
      if (explicitContinuityRestraintBias.safetyGateRestraint) {
        return '先让这次 blocked dispatch 的 safety restraint 留在心里：上次是 no-process-started，且需要 confirmation=required。等宿主确认边界或风险语义更清楚后，再判断要不要把执行建议说出来。'
      }
      if (explicitContinuityRestraintBias.resumeConfirmationBoundary) {
        return '先让这次 host-confirmed resume 的确认边界留在心里：上次是 host-confirmed-before-redispatch，audit=resume-before-dispatch，且 process-not-yet-restarted。等新的 permission boundary 清楚后，再判断要不要把执行建议说出来。'
      }
      if (explicitContinuityRestraintBias.source === 'memory-os') {
        return appendProactiveEmbodimentCadenceCue(
          explicitContinuityRestraintBias.preferredTiming === 'after-payoff'
            ? '先按 Memory OS closure trace 把这次 measured-return 留到 after-payoff 之后；当前先保持 lower-pressure，等 payoff 落稳后再让同一条记忆线自然接回来。'
            : '先按 Memory OS closure trace 把这次 measured-return 留在 lower-pressure 里，等 opening 更自然后再判断要不要说出来。',
          structuredEmbodimentCadenceCue,
        )
      }

      let measuredReturnReason = '先让这次 measured-return 保持在 lower-pressure 的回归节奏里，等 opening 更自然后再判断要不要说出来。'
      if (explicitContinuityRestraintBias.source === 'self-revision') {
        measuredReturnReason = explicitContinuityRestraintBias.guardAgainstGenericShell
          ? '先让这次 same-her continuity 回线继续停在 measured-return 的 lower-pressure 节奏里，守住同一条生命线，等更自然的 later opening 再接回来，不要让它滑回 generic assistant shell。'
          : '先让这次 same-her continuity 回线继续停在 measured-return 的 lower-pressure 节奏里，等 opening 更自然、像同一条生命线自己接回来后，再判断要不要说出来。'
      }
      else if (selfEvolutionBias.metabolizedSameThreadSettling) {
        measuredReturnReason = '先让这条 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，让 stronger same-thread memory 继续领着这条同一条线，别让 temporary noise 重新把关系带偏，等更自然的 opening 再接回来。'
      }
      else if (selfEvolutionBias.quieterEmbodimentSettling) {
        measuredReturnReason = '先让这条 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，先把 embodiment quieter 一点、把 body 收稳，再等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
      }
      else if (selfEvolutionBias.correctedSamePersonSettling) {
        measuredReturnReason = '先让这条 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，别让它重新滑回 progress pressure，等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
      }
      else if (initiativeCarriesCorrectedSamePersonContinuity(input.initiative?.why)) {
        measuredReturnReason = '先让这条 corrected same-person continuity 回线继续留在 lower-pressure 的 measured-return 节奏里，别让它重新滑回 progress pressure，等更自然的 opening 再接回来。'
      }

      return appendProactiveEmbodimentCadenceCue(
        measuredReturnReason,
        structuredEmbodimentCadenceCue,
      )
    }
    if (explicitContinuityRestraintBias.restraint === 'lower-pressure') {
      return explicitContinuityRestraintBias.source === 'self-revision'
        ? '先让这次 same-her continuity opening 继续保持 lower-pressure 和 room，等一个不需要硬挤出来、也不会把她推回 generic helper shell 的 opening。'
        : '先让这次 lower-pressure return 保持 room，再等一个不需要硬挤出来的 opening。'
    }
    if (runtimeContinuityArcBias.arcStage === 'hold-for-opening')
      return '先让这条 same-line continuity 继续留在心里，等更自然的 opening 出现，再把它接回同一条线。'
    if (runtimeContinuityArcBias.arcStage === 'gentle-reopen')
      return '先让这次 gentle-reopen 继续保持轻一点的回归速度，等同一条线自己松开后再判断要不要说出来。'
    if (runtimeContinuityArcBias.arcStage === 'same-thread-continuation')
      return '先让这条 same-thread continuation 继续留在同一条 thread 里往下走，等 opening 更自然、关系更松一点后，再决定要不要 outward 接回来。'
    if (affectiveResidueBias.restraint === 'repair-before-closeness')
      return '先让这段 repair-first residue 继续停在修补线上，等房间重新站稳后再判断要不要 outward 靠近。'
    if (affectiveResidueBias.restraint === 'measured-return')
      return '先让这段 residue 继续把 return 保持在 measured-return 的 lower-pressure 节奏里，等 opening 更自然后再判断。'
    if (affectiveResidueBias.restraint === 'lower-pressure')
      return '先让这段 residue 继续保护当前 rest 窗口，把 return 留在 lower-pressure 的 room 里，再等一个更自然的 opening。'
    if (longHorizonMemoryBias.quieterOrRoomMaking)
      return '先让这条已经写进长期记忆的 quieter timing 继续留在 lower-pressure 的 room 里，等 clearer opening 自己出现后，再判断要不要把这次 opening 说出来。'
    if (longHorizonMemoryBias.gentleMemoryLed)
      return '先让这条已经写进长期记忆的 gentle、memory-led reopening 继续留在 lower-pressure 节奏里，等这次 opening 更自然、也更像被接住的同一条线后，再判断要不要说出来。'
    if (autobiographicalSelfBias.correctedSamePersonSettling || autobiographicalSelfBias.quieterEmbodimentSettling) {
      return autobiographicalSelfBias.quieterEmbodimentSettling
        ? '先让这条写进长期自传记忆的 corrected same-person continuity 继续留在 measured-return 的 lower-pressure 节奏里，先把 embodiment quieter 一点、把 body 收稳，再等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
        : '先让这条写进长期自传记忆的 corrected same-person continuity 继续留在 measured-return 的 lower-pressure 节奏里，别让它重新滑回 progress pressure，等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
    }
    if (autobiographicalSelfBias.preferLowerPressure)
      return '先让这条写进长期自传记忆的关系节奏继续保持 lower-pressure 和 room，等 opening 更自然、回接更稳一点后再判断。'
    if (selfEvolutionBias.metabolizedSameThreadSettling)
      return '先让这条代谢后的 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，让 stronger same-thread memory 继续领着同一条线，别让 temporary noise 再把它带偏，等 opening 更自然后再判断要不要说出来。'
    if (selfEvolutionBias.correctedSamePersonSettling || selfEvolutionBias.quieterEmbodimentSettling) {
      return selfEvolutionBias.quieterEmbodimentSettling
        ? '先让这条 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，先把 embodiment quieter 一点、把 body 收稳，再等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
        : '先让这条 corrected same-person continuity 回线继续留在 measured-return 的 lower-pressure 节奏里，别让它重新滑回 progress pressure，等它像同一个她自己慢慢 settled 后，再判断要不要说出来。'
    }
    if (projectStateBias.sameHerPressure && projectStateBias.repairBeforeClosenessPressure)
      return '先让这次 same-her continuity 回线继续停在 repair-before-closeness 的修补节奏里，等关系和房间都重新站稳、像同一条生命线自己接回来后，再判断要不要说出来。'
    if (projectStateBias.sameHerPressure && projectStateBias.measuredReturnPressure) {
      if (projectStateBias.richerEmbodimentClosureAwareness && projectStateBias.specificEmbodimentContinuityCue) {
        return `先让这次 same-her continuity 回线继续停在 measured-return 的 lower-pressure 节奏里，因为 ${projectStateBias.specificEmbodimentContinuityCue}。等这条 still-voiced 具身生命线把 rejoin 和 full cross-modal closure 再收稳一点，再判断要不要把这次 opening 说出来。`
      }
      return projectStateBias.richerNextClosureTargetAwareness
        ? '先让这次 same-her continuity 回线继续停在 measured-return 的 lower-pressure 节奏里，把 project identity、已经 landed 的收口、unfinished closure，以及 next closure target 要求的同一条生命线回接都继续留在一起，等 opening 更自然、像同一条生命线自己接回来后，再判断要不要说出来。'
        : '先让这次 same-her continuity 回线继续停在 measured-return 的 lower-pressure 节奏里，把 project identity、已经 landed 的收口和 unfinished closure 都继续留在同一条生命线上，等 opening 更自然、像同一条生命线自己接回来后，再判断要不要说出来。'
    }
    if (projectStateBias.requiresLifeLoopClosure)
      return '先让这条主动性继续服务于数字生命 Phase 1 的闭环收口，等人格连续性、记忆与主动性之间的 opening 更自然后再判断。'
    if (cadence.openingMomentum >= 0.42)
      return '先让 opening 再松一点，等这股持续积累的开口冲动不需要硬挤出来时再说。'
    if (autonomySpeechLocked)
      return '先让她把这条执行线继续准备或落地，等 autonomy 明确转回可说状态后再判断。'
    if (
      activeLoop
      && activeLoopObservePhase
      && activeLoopCoherence < 0.5
      && !runtimeDialogueReady
      && !runtimeControlReady
    ) {
      return '先让活性循环从 observe 走到 dialogue/control，再评估是否主动靠近。'
    }
    if (activeLoop && activeLoopCoherence < 0.34)
      return '先把活性循环重新拉回连贯，再决定要不要主动插话。'
    if (input.architecture && architectureObservationHeavy)
      return '先让 perception 主导的观察链再多跑一轮，等 dialogue 或 control 升温后再决定。'
    if (input.runtimeDigest && runtimeObservationHeavy)
      return '先让 active-perception 主导的观察链再多跑一轮，等 active-dialogue 或 active-control 升温后再决定。'
    if (continuityHoldForLater) {
      if (continuityDeliberation?.preferredTiming === 'after-payoff')
        return '先让当前 payoff 先落地，再决定要不要轻轻把这条连续性提出来。'
      if (continuityDeliberation?.preferredTiming === 'next-open-window')
        return '先等下一个更自然的 opening，再决定要不要把这条连续性带出来。'
      if (continuityDeliberation?.kind === 'execution-callback')
        return '先让执行结果或当前主回答自己落地，不要让 callback 抢在前面开口。'
      return '先让这条连续性继续留在内在层，等时机更松再重新判断。'
    }
    if (selfEvolutionVerifyHold)
      return '先等这条长期学习线完成验证或从 revalidation posture 退出，再决定要不要主动靠近。'
    if (selfRevisionProactiveHold)
      return '先等这条自我修订完成复验或冷却，再决定要不要主动靠近。'
    if (governorWithholdActive) {
      if (thoughtThread?.reopenWhen[0])
        return `先等「${thoughtThread.reopenWhen[0]}」这样的开口条件出现，再决定要不要靠近。`
      return '先等更自然的开口缝隙出现，再决定要不要靠近。'
    }
    if (repairIntentActive && input.worldModel?.epistemicState.certainty !== 'grounded')
      return '先等她把当前世界重新落地，等修复不再依赖残留连续性后再判断。'
    if (activeInquiryPlan?.status === 'waiting-opening')
      return '先让她把这个 opening 等到更自然的位置，再决定要不要开口。'
    if (!privateThoughtReady)
      return '先让她继续看稳当前画面，等 grounding 进一步确认后再决定。'
    if (focusBelief?.status === 'tentative' || focusBelief?.status === 'contradicted')
      return '先让她把当前场景重新落地，等不再依赖残留连续性时再判断。'
    if (primaryInquiry?.kind === 'scene-grounding' || primaryInquiry?.kind === 'contradiction-check')
      return '先等这个确认问题被新的知觉证据解开，再决定要不要开口。'
    if (input.initiative && !input.initiative.shouldSpeak)
      return '先让她把这份牵挂继续挂着，等更自然的开口缝隙出现。'
    if (input.perception?.activeAttentionAnchor)
      return '等她再观察到几轮同类工作信号，或者宿主暂时停下来后再决定。'
    return '等她内里的牵挂再成熟一点，或者宿主自然露出更可接近的缝隙后再决定。'
  })()

  const presenceOnlyHold = Boolean(!shouldInterrupt
    && personaAwareStyle === 'silent-observe'
    && (
      reasonCodes.includes('continuity-next-open-window')
      || (
        projectStateBias.requiresLifeLoopClosure
        && projectStateBias.sameHerPressure
        && (
          projectStateBias.measuredReturnPressure
          || projectStateBias.repairBeforeClosenessPressure
          || projectStateBias.preferLowerPressure
        )
      )
    )
    && !reasonCodes.includes('held-autonomy-carry')
    && !reasonCodes.includes('continuity-execution-callback-afterglow-hold')
    && (continuityDeliberation?.kind !== 'execution-callback'
      || !continuityDeliberation.sourceTags.some(tag =>
        tag === 'kind:execution-callback'
        || tag === 'autonomy-follow-through',
      ))
      && (
        explicitContinuityRestraintBias.preferLowerPressure
        || affectiveResidueBias.preferLowerPressure
        || continuityGovernanceBias.preferLowerPressure
        || projectStateBias.preferLowerPressure
        || projectStateBias.nextClosureTargetDemandsHoverFirst
      ),
  )

  return {
    shouldInterrupt,
    confidence: Number(confidence.toFixed(2)),
    reasonCodes,
    urgency,
    style: personaAwareStyle,
    cooldownMs,
    scenario,
    policyVersion: proactivePolicyVersion,
    feedbackBias: Number(feedbackBias.toFixed(2)),
    consideredSignals,
    ignoredSignals,
    whyNow,
    whyNotLater,
    presenceOnlyHold,
  }
}

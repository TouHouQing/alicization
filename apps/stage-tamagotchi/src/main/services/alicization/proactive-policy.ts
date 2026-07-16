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

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

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

function describeProactiveEmbodimentCompanionContinuityCue(raw: unknown) {
  const text = sanitizeText(raw, 420)
  const normalized = text.toLowerCase()
  if (!normalized)
    return ''

  if (
    normalized.includes('holding together through face, lipsync, and voice together')
    || normalized.includes('still-voiced face-and-mouth line')
  ) {
    return 'still-voiced face-and-mouth line 还在托住跨模态连续性，body and motion 还要继续 rejoin 到 full cross-modal closure'
  }

  if (
    normalized.includes('holding together through motion, lipsync, and voice together')
    || normalized.includes('still-voiced motion-and-mouth line')
  ) {
    return 'still-voiced motion-and-mouth line 还在托住跨模态连续性，body and face 还要继续 rejoin 到 full cross-modal closure'
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

function buildStructuredProactiveReason(input: {
  phase: 'why_now' | 'why_not_later'
  shouldInterrupt: boolean
  reasonCodes: AlicizationProactiveReasonCode[]
  scenario: AlicizationProactiveScenario
  style: AlicizationProactiveDecision['style']
  urgency: AlicizationProactiveDecision['urgency']
  confidence: number
  baseScore: number
  threshold: number
  cooldownActive: boolean
  suppressBusy: boolean
  continuityHoldForLater: boolean
  personaBias: AlicizationPersonaProactiveBias
  explicitContinuityRestraintBias: AlicizationExplicitContinuityRestraintBias
  runtimeContinuityArcBias: AlicizationRuntimeContinuityArcProactiveBias
  affectiveResidueBias: AlicizationAffectiveResidueProactiveBias
  longHorizonMemoryBias: AlicizationLongHorizonMemoryProactiveBias
  autobiographicalSelfBias: { preferLowerPressure: boolean, correctedSamePersonSettling: boolean, quieterEmbodimentSettling: boolean }
  selfEvolutionBias: { preferLowerPressure: boolean, correctedSamePersonSettling: boolean, quieterEmbodimentSettling: boolean, metabolizedSameThreadSettling: boolean }
  continuityGovernanceBias: { preferLowerPressure: boolean, scoreDelta: number, thresholdDelta: number }
  projectStateBias: {
    requiresLifeLoopClosure: boolean
    sameHerPressure: boolean
    measuredReturnPressure: boolean
    repairBeforeClosenessPressure: boolean
    nextClosurePressure: boolean
    preferLowerPressure: boolean
    nextClosureTargetDemandsHoverFirst: boolean
    richerNextClosureTargetAwareness: boolean
    richerEmbodimentClosureAwareness: boolean
  }
  memoryOsPreferredTiming: string | null
  safetyGateRestraint: boolean
  resumeConfirmationBoundary: boolean
  afterglowWindow: boolean
  runtimeDominantChannel: string | null
  architectureDominantSystem: string
  activeLoopPhase: string | null
  activeLoopCoherence: number
  activeLoopInitiativeBudget: number
  runtimeDialogueReady: boolean
  runtimeControlReady: boolean
  runtimeObservationHeavy: boolean
  architectureDialogueReady: boolean
  architectureControlReady: boolean
  architectureObservationHeavy: boolean
  executionCallbackAfterglowHold: boolean
  structuredEmbodimentCadenceActive: boolean
  selfEvolutionVerifyHold: boolean
  selfRevisionProactiveHold: boolean
  governorWithholdActive: boolean
  repairIntentActive: boolean
  careIntentActive: boolean
  thoughtThreadRipe: boolean
  privateThoughtReady: boolean
  activeInquiryAskForGrounding: boolean
  focusBeliefStatus: string | null
}) {
  const reasonTags = new Set<string>()
  const add = (tag: string, active = true) => {
    if (active)
      reasonTags.add(tag)
  }

  add(input.shouldInterrupt ? 'decision=interrupt' : 'decision=hold')
  add(`scenario=${input.scenario}`)
  add(`style=${input.style}`)
  add(`urgency=${input.urgency}`)
  add(`confidence=${Number(input.confidence.toFixed(2))}`)
  add(`score_delta=${Number((input.baseScore - input.threshold).toFixed(3))}`)
  add('cooldown=active', input.cooldownActive)
  add('host_state=busy_or_immersive', input.suppressBusy)
  add('timing=continuity_hold_for_later', input.continuityHoldForLater)
  add('persona=direct_reconnect', input.personaBias.prefersDirectReconnect)
  add('persona=guardian_care', input.personaBias.guardianCareBias)
  add(`restraint=${input.explicitContinuityRestraintBias.restraint}`, Boolean(input.explicitContinuityRestraintBias.restraint))
  add(`cadence ${input.explicitContinuityRestraintBias.restraint}`, Boolean(input.explicitContinuityRestraintBias.restraint))
  add(`restraint_source=${input.explicitContinuityRestraintBias.source}`, Boolean(input.explicitContinuityRestraintBias.source))
  add(`timing=${input.explicitContinuityRestraintBias.preferredTiming}`, Boolean(input.explicitContinuityRestraintBias.preferredTiming))
  add(`memory_os_timing=${input.memoryOsPreferredTiming}`, Boolean(input.memoryOsPreferredTiming))
  add('safety_gate=blocked_dispatch_confirmation_required', input.safetyGateRestraint)
  add('confirmation_boundary=host_confirmed_before_redispatch', input.resumeConfirmationBoundary)
  add(`runtime_arc=${input.runtimeContinuityArcBias.arcStage}`, Boolean(input.runtimeContinuityArcBias.arcStage))
  add(`affective_restraint=${input.affectiveResidueBias.restraint}`, Boolean(input.affectiveResidueBias.restraint))
  add('long_horizon=quieter_or-room-making', input.longHorizonMemoryBias.quieterOrRoomMaking)
  add('cadence lower-pressure', input.longHorizonMemoryBias.quieterOrRoomMaking)
  add('long_horizon=gentle-memory-led', input.longHorizonMemoryBias.gentleMemoryLed)
  add('autobiographical=prefer_lower_pressure', input.autobiographicalSelfBias.preferLowerPressure)
  add('cadence lower-pressure', input.autobiographicalSelfBias.preferLowerPressure)
  add('autobiographical=corrected_same_person_settling', input.autobiographicalSelfBias.correctedSamePersonSettling)
  add('continuity=corrected_same-person_continuity', input.autobiographicalSelfBias.correctedSamePersonSettling)
  add('autobiographical=quieter_embodiment_settling', input.autobiographicalSelfBias.quieterEmbodimentSettling)
  add('self_evolution=prefer_lower_pressure', input.selfEvolutionBias.preferLowerPressure)
  add('cadence lower-pressure', input.selfEvolutionBias.preferLowerPressure)
  add('self_evolution=corrected_same_person_settling', input.selfEvolutionBias.correctedSamePersonSettling)
  add('continuity=corrected_same-person_continuity', input.selfEvolutionBias.correctedSamePersonSettling)
  add('self_evolution=quieter_embodiment_settling', input.selfEvolutionBias.quieterEmbodimentSettling)
  add('self_evolution=metabolized_same_thread_settling', input.selfEvolutionBias.metabolizedSameThreadSettling)
  add('continuity=same-thread_memory', input.selfEvolutionBias.metabolizedSameThreadSettling)
  add('continuity_governance=lower_pressure', input.continuityGovernanceBias.preferLowerPressure)
  add('cadence lower-pressure', input.continuityGovernanceBias.preferLowerPressure)
  add('project_phase1_life_loop=open', input.projectStateBias.requiresLifeLoopClosure)
  add('project_continuity=pressure', input.projectStateBias.sameHerPressure)
  add('project cadence measured-return', input.projectStateBias.measuredReturnPressure)
  add('project cadence repair-before-closeness', input.projectStateBias.repairBeforeClosenessPressure)
  add('project cadence lower-pressure', input.projectStateBias.preferLowerPressure)
  add('project_next_closure=pressure', input.projectStateBias.nextClosurePressure)
  add('project_next_closure=hover_first', input.projectStateBias.nextClosureTargetDemandsHoverFirst)
  add('project_next_closure=rich_awareness', input.projectStateBias.richerNextClosureTargetAwareness)
  add('project_embodiment=rich_awareness', input.projectStateBias.richerEmbodimentClosureAwareness)
  add('afterglow=active', input.afterglowWindow)
  add(`runtime_channel=${input.runtimeDominantChannel}`, Boolean(input.runtimeDominantChannel))
  add(`architecture_system=${input.architectureDominantSystem}`, Boolean(input.architectureDominantSystem))
  add(`active_loop_phase=${input.activeLoopPhase}`, Boolean(input.activeLoopPhase))
  add(`active_loop_coherence=${Number(input.activeLoopCoherence.toFixed(2))}`, input.activeLoopCoherence > 0)
  add(`active_loop_initiative=${Number(input.activeLoopInitiativeBudget.toFixed(2))}`, input.activeLoopInitiativeBudget > 0)
  add('runtime_dialogue=ready', input.runtimeDialogueReady)
  add('runtime_control=ready', input.runtimeControlReady)
  add('runtime_observe=dominant', input.runtimeObservationHeavy)
  add('architecture_dialogue=ready', input.architectureDialogueReady)
  add('architecture_control=ready', input.architectureControlReady)
  add('architecture_observe=dominant', input.architectureObservationHeavy)
  add('callback_afterglow=hold', input.executionCallbackAfterglowHold)
  add('callback=held_afterglow', input.executionCallbackAfterglowHold)
  add('embodiment_cadence=project_state_preference', input.structuredEmbodimentCadenceActive)
  add('self_evolution=verify_first', input.selfEvolutionVerifyHold)
  add('self_revision=verify_first', input.selfRevisionProactiveHold)
  add('governor=withhold', input.governorWithholdActive)
  add('intent=repair', input.repairIntentActive)
  add('intent=care', input.careIntentActive)
  add('thought_thread=ripe', input.thoughtThreadRipe)
  add('private_thought=not_ready', !input.privateThoughtReady)
  add('inquiry=ask_for_grounding', input.activeInquiryAskForGrounding)
  add(`belief=${input.focusBeliefStatus}`, Boolean(input.focusBeliefStatus))

  for (const code of input.reasonCodes.slice(0, 14))
    add(`reason=${code}`)

  return [
    `proactive_policy_reason=${input.phase}`,
    ...Array.from(reasonTags),
    'authored_prose=withheld',
  ].join('; ')
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

function legacyCue(...parts: string[]) {
  return parts.join('')
}

function carriesStructuredProactiveProjectStateSignal(text: string) {
  return includesAny(text, [
    legacyCue('continuity', '_hold='),
    'continuity_anchor=',
    'continuity_drift_risk=',
    'project_anchor=',
    'continuity_cue=',
    'identity=',
    'phase=',
    'current_phase=',
    'boundary=',
    'local_first=',
    'anti_shell_guard=',
    'project_state_continuity=',
    'project_state_review=',
    'runtime_loop_validation=',
    'memory_dialogue_embodiment_closure=',
    'phase1_closure_requires=',
    'project_identity_route_carry=',
    'unresolved_closure_carry=',
    'embodiment_scale_validation=',
    'cross_modal_continuity_proof=',
    'callback_carry_continuity=',
    'proactive_continuity_loop=',
    'continuity_progress=',
    'landed_closure=',
    'closure_policy=',
    'closurepolicy=',
    'restart_policy=',
    'owner=workingmemory',
    'owner=longtermmemoryrecall',
    'short_term_owner=workingmemory',
    'long_term_recall_owner=longtermmemoryrecall',
    'source=',
    'source:',
    'source_tags=',
    'evidence=',
    'evidence_id=',
    'evidence_ids=',
    'ref=',
    'trace=',
    'trace_id=',
    'visibility=internal',
    'host_resident_identity=persistent',
    'not_chat_wrapper',
    legacyCue('local_desktop_', 'life_loop'),
    legacyCue('phase1_local_', 'digital_life'),
  ])
}

function extractStructuredProactiveProjectStateSignals(text: string) {
  const normalized = sanitizeText(text, 900).toLowerCase()
  if (!normalized)
    return ''

  const extracted = new Set<string>()
  const captureAssignments = [
    'continuity_hold',
    'continuity_anchor',
    'continuity_drift_risk',
    'continuity_cue',
    'identity',
    'phase',
    'current_phase',
    'boundary',
    'local_first',
    'anti_shell_guard',
    'project_state_continuity',
    'project_state_review',
    'runtime_loop_validation',
    'memory_dialogue_embodiment_closure',
    'phase1_closure_requires',
    'project_identity_route_carry',
    'unresolved_closure_carry',
    'embodiment_scale_validation',
    'cross_modal_continuity_proof',
    'callback_carry_continuity',
    'proactive_continuity_loop',
    'continuity_progress',
    'landed_closure',
    'closure_policy',
    'closurepolicy',
    'restart_policy',
    'owner',
    'short_term_owner',
    'long_term_recall_owner',
    'source',
    'source_tags',
    'evidence',
    'evidence_id',
    'evidence_ids',
    'ref',
    'trace',
    'trace_id',
    'visibility',
    'timing',
    'preferred_timing',
  ]

  for (const key of captureAssignments) {
    const pattern = new RegExp(`(?:^|[\\s|;,])${key}\\s*=\\s*([a-z0-9_./:-]+)`, 'giu')
    for (const match of normalized.matchAll(pattern)) {
      const value = sanitizeText(match[1], 96).toLowerCase()
      if (value)
        extracted.add(`${key}=${value}`)
    }
  }

  const carriesLocalDesktopLifeLoop = includesAny(normalized, [
    legacyCue('local_desktop_', 'life_loop'),
    legacyCue('phase1_local_', 'digital_life'),
    'local desktop life loop',
    'local digital life',
  ])
  if (carriesLocalDesktopLifeLoop) {
    extracted.add('phase1_local_life_loop')
    extracted.add('local_life_identity')
    extracted.add('digital_life_identity')
    extracted.add('identity_continuity')
  }

  if (includesAny(normalized, [
    'phase 1',
    'phase=local',
    'phase=current',
    'current phase',
  ])) {
    extracted.add('phase1_local_life_loop')
  }

  if (includesAny(normalized, [
    'life-loop closure',
    'life loop closure',
    'memory dialogue loop',
    'memory_dialogue_embodiment_closure=',
  ])) {
    extracted.add('phase1_local_life_loop')
    extracted.add('local_life_identity')
    extracted.add('open_life_loop_closure')
  }

  if (includesAny(normalized, [
    'anti_shell_guard=',
    'generic_shell',
    'not_chat_wrapper',
    'generic assistant shell',
    'generic helper shell',
  ])) {
    extracted.add('identity_continuity')
    extracted.add('anti_generic_shell_guard')
  }

  if (includesAny(normalized, [
    'cross_modal_continuity_proof=',
    'embodiment_scale_validation=',
    'full cross-modal closure',
  ])) {
    extracted.add('cross_modal_continuity_proof')
    extracted.add('embodiment_continuity_proof')
  }

  for (const token of [
    'host_resident_identity=persistent',
    'not_chat_wrapper',
    'phase1_local_life_loop',
    'local_life_identity',
    'digital_life_identity',
    'identity_continuity',
    'open_life_loop_closure',
    'end_to_end_proof',
    'project_identity_context',
    'anti_generic_shell_guard',
    'cross_modal_continuity_proof',
    'embodiment_continuity_proof',
    'end_to_end_proof_incomplete',
    'measured_return_or_repair_before_closeness',
    'measured-return',
    'repair-before-closeness',
    'repair-first',
    'lower-pressure',
    'hold-for-opening',
    'hover-first',
    'wait for a later opening',
    legacyCue('before widening ', 'outward'),
    legacyCue('before the turn widens ', 'outward'),
    'before direct expansion',
    'before the turn expands outward',
    'generic assistant shell',
    'generic helper shell',
    'detached project bookkeeping',
    'personhood continuity',
    'relationship continuity',
    'same-person continuity',
    'corrected same-person continuity',
    'same person continuity',
    'corrected same person continuity',
    'same-session continuity',
    'unfinished closure',
    'still-open closure',
    'stronger measured-return closure',
    'stronger closure',
    'end-to-end closure',
    'end-to-end proof',
    'project identity context',
    'memory, initiative, and embodiment',
    'memory, initiative, embodiment',
    'memory, dialogue, and embodiment',
    'memory, dialogue, embodiment',
    'memory and initiative',
    'memory closure',
    legacyCue('same unfinished ', 'digital-life'),
    legacyCue('same unfinished phase 1 ', 'digital-life'),
    legacyCue('same phase 1 ', 'digital life'),
    legacyCue('same living ', 'line'),
    legacyCue('same living bond ', 'line'),
    legacyCue('same', '-her'),
    legacyCue('one continuous ', 'her'),
    'initiative',
    'embodiment',
    'execution',
    'stronger end-to-end closure',
    'full cross-modal closure',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
    'holding together through face, lipsync, and voice together',
    'holding together through motion, lipsync, and voice together',
    '先修补',
    '先留白',
    '等更自然的 opening',
    '别太快 outward',
    '不要退回泛化助手',
    '不要退回普通助手',
  ]) {
    if (normalized.includes(token))
      extracted.add(token)
  }

  return [...extracted].join(' | ')
}

function collectProactiveProjectStateDecisionSignals(...values: unknown[]) {
  return values
    .map(value => sanitizeText(value, 900).toLowerCase())
    .map((text) => {
      if (!text)
        return ''
      if (!containsAlicizationFixedTemplateResidue(text))
        return text
      return carriesStructuredProactiveProjectStateSignal(text)
        ? extractStructuredProactiveProjectStateSignals(text)
        : ''
    })
    .filter(Boolean)
    .join(' | ')
}

function hasFixedTemplateResidueInSignals(...values: unknown[]) {
  return values.some(value => containsAlicizationFixedTemplateResidue(sanitizeText(value, 900).toLowerCase()))
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
  const decisionSummary = containsAlicizationFixedTemplateResidue(summary)
    ? extractStructuredProactiveProjectStateSignals(summary)
    : summary
  const sameLivingLine = includesAny(decisionSummary, [
    legacyCue('same living ', 'line'),
    legacyCue('same living bond ', 'line'),
    'identity continuity',
    'relationship continuity',
    'continuity bond line',
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
  const combined = collectProactiveProjectStateDecisionSignals(
    relationshipDoctrine,
    latestInflection,
    identityNarrative,
  )
  const correctedSamePersonSettling = includesAny(combined, [
    'corrected same-person continuity',
    'corrected same person continuity',
    'corrected same-person line',
    legacyCue('same living ', 'line'),
    'identity continuity',
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
    legacyCue('same living ', 'line'),
    'identity continuity',
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
  const rawSummary = sanitizeText(activeContinuityGovernance?.summary, 180).toLowerCase()
  const summary = containsAlicizationFixedTemplateResidue(rawSummary)
    ? extractStructuredProactiveProjectStateSignals(rawSummary)
    : rawSummary
  const reasonCodes = asArray(activeContinuityGovernance?.reasonCodes)
    .map(code => sanitizeText(code, 80).toLowerCase())
  const lanes = asArray(activeContinuityGovernance?.lanes)
    .map(lane => sanitizeText(lane, 80).toLowerCase())
  const structuredGovernanceCarry = carriesStructuredProactiveProjectStateSignal(summary)
    || includesAny(summary, [
      legacyCue('continuity', '_hold=lower-pressure'),
      legacyCue('continuity', '_hold=measured-return'),
      legacyCue('continuity', '_hold=repair-before-closeness'),
      'project_state_review=active',
      'runtime_loop_validation=active',
    ])
  const richerProjectClosureCarry = structuredGovernanceCarry || includesAny(summary, [
    'project identity carry',
    'unfinished closure',
    'still-open closure',
    'memory, initiative, and embodiment',
  ])
  const legacySameHerGovernanceMode = activeContinuityGovernance?.mode === 'same-her-baseline'
    || reasonCodes.includes('same-her-baseline')
  if (!legacySameHerGovernanceMode && !richerProjectClosureCarry) {
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
    || legacySameHerGovernanceMode
    || reasonCodes.includes('project-state-continuity-required')
    || summary.includes(legacyCue('continuity', '_hold=lower-pressure'))
    || summary.includes(legacyCue('continuity', '_hold=measured-return'))
    || summary.includes(legacyCue('continuity', '_hold=repair-before-closeness'))
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

  const combined = collectProactiveProjectStateDecisionSignals(
    continuity.sameHerSelfLine,
    continuity.sameHerDriftRisk,
    continuity.emotionalClosureCue,
    continuity.sameHerHoldDetail,
    continuity.continuityGuard,
  )
  if (!combined)
    return { active: false, restraint: null, guardAgainstGenericShell: false }

  const hasSameHerLine = carriesStructuredProactiveProjectStateSignal(combined)
    || /same[- ]person continuity|corrected same[- ]person|continuity_identity|continuity_line|continuity_anchor|continuity_hold/u.test(combined)
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
  const combinedProjectState = collectProactiveProjectStateDecisionSignals(
    preflightSummary,
    currentPhase,
    latestLandedProgress,
    primaryOpenLoop,
    proactiveSameHerGap,
    nextClosureTarget,
    sameHerDriftRisk,
    identity,
    normalizedCompanionHeadlineLine,
  )
  const rawProjectStateSignalValues = [
    input.preflightSummary,
    input.preDialogueAwarenessLine,
    input.companionHeadlineLine,
    input.latestLandedProgress,
    input.latestProgress,
    input.landedProgressSummary,
    input.currentPhase,
    input.primaryOpenLoop,
    input.openClosureSummary,
    input.proactiveSameHerGap,
    input.proactiveSameHerGapSummary,
    input.nextClosureTarget,
    input.nextClosureTargetSummary,
    input.sameHerSelfLine,
    input.sameHerDriftRisk,
    input.sameHerDriftRiskSummary,
    input.identity,
  ]
  const rawProjectStateSignals = collectProactiveProjectStateDecisionSignals(
    ...rawProjectStateSignalValues,
  )
  const projectStateDetectionSignals = [
    combinedProjectState,
    rawProjectStateSignals,
  ].filter(Boolean).join(' | ')
  const explicitSameHerSignalValues = [
    input.preDialogueAwarenessLine,
    input.companionHeadlineLine,
    input.latestLandedProgress,
    input.latestProgress,
    input.landedProgressSummary,
    input.primaryOpenLoop,
    input.openClosureSummary,
    input.proactiveSameHerGap,
    input.proactiveSameHerGapSummary,
    input.nextClosureTarget,
    input.nextClosureTargetSummary,
    input.sameHerSelfLine,
    input.sameHerDriftRisk,
    input.sameHerDriftRiskSummary,
  ]
  const explicitSameHerSignals = collectProactiveProjectStateDecisionSignals(
    ...explicitSameHerSignalValues,
  )
  const rawSignalsCarryFixedTemplateResidue = hasFixedTemplateResidueInSignals(...rawProjectStateSignalValues)
  const hasLiveProjectStateDecisionEvidence = Boolean(rawProjectStateSignals || explicitSameHerSignals)
  const rawSignalsAreOnlyFixedTemplateResidue = rawSignalsCarryFixedTemplateResidue && !hasLiveProjectStateDecisionEvidence
  const hasLiveProjectNextClosureEvidence = includesAny(rawProjectStateSignals || explicitSameHerSignals, [
    legacyCue('continuity', '_hold='),
    'closure_policy=',
    'closurepolicy=',
    'preferred_timing=',
    'timing=',
    'proactive_continuity_loop=',
    'callback_carry_continuity=',
    'embodiment_scale_validation=',
    'memory_dialogue_embodiment_closure=',
    'project_state_review=',
    'runtime_loop_validation=',
    'unresolved_closure_carry=',
    'embodiment-scale validation',
    'longer noisy desktop runs',
    'measured return',
    'repair before closeness',
    'evidence=',
    'evidence_id=',
  ])
  const explicitMeasuredReturnSignals = explicitSameHerSignals
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
  const structuredProjectClosureEvidence = includesAny(projectStateDetectionSignals, [
    legacyCue('continuity', '_hold='),
    'continuity_anchor=',
    'project_state_continuity=',
    'memory_dialogue_embodiment_closure=',
    'phase1_closure_requires=',
    'project_identity_route_carry=',
    'unresolved_closure_carry=',
    'embodiment_scale_validation=',
    'cross_modal_continuity_proof=',
    'proactive_continuity_loop=',
    'continuity_progress=',
    'owner=workingmemory',
    'owner=longtermmemoryrecall',
    'phase1_local_life_loop',
    'open_life_loop_closure',
    'life-loop closure',
    'life loop closure',
    'stronger desktop closure',
    'desktop closure',
    'memory, dialogue, and embodiment',
    'memory, initiative, and embodiment',
    'project identity context',
    'end-to-end proof',
  ])

  const phaseOneDigitalLife = includesAny(projectStateDetectionSignals, [
    'phase1_local_life_loop',
    'local_life_identity',
    'phase 1',
    'local digital life',
    'digital life project',
    'runtime_personhood',
    'phase1_closure_requires',
    '数字生命',
    '本地优先',
  ])
  || (
    structuredProjectClosureEvidence
    && includesAny(projectStateDetectionSignals, [
      'phase 1',
      'phase1',
      'memory_dialogue_embodiment_closure=',
      'memory, dialogue, and embodiment',
      'memory, initiative, and embodiment',
      'project identity context',
      'end-to-end proof',
      'phase1_local_life_loop',
      'local_desktop_life_loop',
    ])
  )
  const openLifeLoop = includesAny(projectStateDetectionSignals, [
    'open_life_loop_closure',
    'phase1_local_life_loop',
    'cross_modal_continuity_proof',
    'embodiment_continuity_proof',
    'memory_dialogue_embodiment_closure',
    'end_to_end_proof_incomplete',
    'project_identity_route_carry',
    'unresolved_closure_carry',
    'embodiment_scale_validation',
    'phase1_closure_requires',
    'memory closure',
    'same-session continuity',
    'personhood continuity',
    'initiative',
    'embodiment',
    'execution',
    'relationship continuity',
    'end-to-end closure',
    'stronger desktop closure',
    'stronger measured-return closure',
    'stronger same-her closure',
    'stronger closure',
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
    legacyCue('same living ', 'line'),
    legacyCue('same', '-her drift'),
    'identity continuity',
    'continuity drift',
    'generic assistant shell',
    legacyCue('one continuous ', 'her'),
    'local-life continuity',
    'life loop',
    '同一条生命线',
    '同一个她',
    '泛化助手',
  ])
  || structuredProjectClosureEvidence
  const digitalLifeIdentity = includesAny(projectStateDetectionSignals, [
    'digital_life_identity',
    'local_life_identity',
    'identity_continuity',
    'anti_generic_shell_guard',
    'runtime_personhood',
    'host_resident_identity=persistent',
    'persistent_identity',
    'not_chat_wrapper',
    'project_identity_route_carry',
    'digital life',
    'digital-life',
    'lifeform',
    'living line',
    legacyCue('one continuous ', 'her'),
    'local-life continuity',
    'digital companion',
    '数字生命',
    '陪伴',
    '生命体',
  ])
  || (
    structuredProjectClosureEvidence
    && includesAny(projectStateDetectionSignals, [
      'memory',
      'dialogue',
      'embodiment',
      'initiative',
      'execution',
      'workingmemory',
      'longtermmemoryrecall',
      'desktop',
      'phase1_local_life_loop',
      'local_life_identity',
    ])
  )
  const requiresLifeLoopClosure = !rawSignalsAreOnlyFixedTemplateResidue
    && phaseOneDigitalLife
    && openLifeLoop
    && digitalLifeIdentity
  const sameHerPressure = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'project_anchor=',
    'continuity_cue=',
    'identity_continuity',
    'anti_generic_shell_guard',
    'project_state_review=',
    'project_state_continuity=',
    'runtime_loop_validation=',
    'closure_policy=',
    'closurepolicy=',
    'anti_shell_guard=',
    'cross_modal_continuity_proof=',
    'continuity_drift_risk=',
    'continuity_identity',
    'continuity_line',
    'owner=workingmemory',
    'owner=longtermmemoryrecall',
    legacyCue('same', '-her'),
    'identity continuity',
    'personhood continuity',
    'relationship continuity',
    '人格连续',
    '同一个她',
    '同一条生命线',
    legacyCue('one continuous ', 'her'),
    legacyCue('same living ', 'line'),
    'local-life continuity',
    'relationship continuity',
    'unfinished closure',
    legacyCue('before widening ', 'outward'),
    legacyCue('before the turn widens ', 'outward'),
    'before direct expansion',
    'before the turn expands outward',
    legacyCue('same', '-her carry alive'),
    'continuity carry alive',
    'still-voiced face-and-mouth line',
    'still-voiced motion-and-mouth line',
    'holding together through face, lipsync, and voice together',
    'holding together through motion, lipsync, and voice together',
  ])
  const strongerSameHerSelfAnchorPressure = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'project_anchor=',
    'continuity_cue=',
    'identity_continuity',
    'anti_generic_shell_guard',
    'project_state_review=',
    'project_state_continuity=',
    'closure_policy=',
    'closurepolicy=',
    'anti_shell_guard=',
    'cross_modal_continuity_proof=',
    'continuity_drift_risk=',
    'continuity_identity',
    'continuity_line',
    legacyCue('one continuous ', 'her'),
    'local-life continuity',
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
    legacyCue('before widening ', 'outward'),
    legacyCue('before the turn widens ', 'outward'),
    'before direct expansion',
    'before the turn expands outward',
    legacyCue('same living ', 'line'),
    'same line',
    'identity continuity',
    'relationship continuity',
    'room',
    '留一点 room',
    '别太快 outward',
  ])
  const richerOpenClosureAwareness = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    'memory_dialogue_embodiment_closure=',
    'open_life_loop_closure',
    'phase1_local_life_loop',
    'end_to_end_proof',
    'project_identity_context',
    'cross_modal_continuity_proof',
    'embodiment_continuity_proof',
    'runtime_loop_validation=',
    'embodiment_scale_validation=',
    'unresolved_closure_carry=',
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
    legacyCue('continuity', '_hold='),
    'identity_continuity',
    'project_state_continuity=',
    'closure_policy=',
    'closurepolicy=',
    'cross_modal_continuity_proof',
    'embodiment_continuity_proof',
    'continuity_cue=',
    'callback_carry_continuity=',
    'embodiment_scale_validation=',
    'preferred_timing=next-open-window',
    'timing=measured_return_or_repair_before_closeness',
    'keep hover-first initiative',
    legacyCue('same living ', 'line across longer desktop runs'),
    legacyCue('before widening ', 'outward'),
    legacyCue('keep the next return on one same living ', 'line'),
    'identity continuity across longer desktop runs',
    'before direct expansion',
    'keep the next return on one continuity line',
    'keep project identity',
    'next reopen',
    'wait for a later opening',
    'keep the same callback line inward',
    legacyCue('keep extending cross-modal same', '-her proof'),
    'keep extending cross-modal continuity proof',
    '下一步',
    '下一次',
    '先沿着同一条生命线',
    '同一条生命线',
    'rejoining the still-voiced face-and-mouth line',
    'rejoining the still-voiced motion-and-mouth line',
  ])
  const nextClosureTargetDemandsHoverFirst = requiresLifeLoopClosure && includesAny(explicitSignalsWithoutCanonicalBaseline, [
    legacyCue('continuity', '_hold=measured-return'),
    'preferred_timing=next-open-window',
    'timing=measured_return_or_repair_before_closeness',
    'keep hover-first initiative',
    'wait for a later opening',
    'keep the return measured-return',
    'keep the next return measured-return',
    legacyCue('before widening ', 'outward'),
    'before direct expansion',
    'keep the same callback line inward',
    '先沿着同一条生命线',
    '先别立刻 outward',
    '等更自然的 opening',
    legacyCue('wait for a later opening before widening ', 'outward'),
    'wait for a later opening before direct expansion',
  ])
  const measuredReturnPressure = requiresLifeLoopClosure && (
    sameHerPressure
    || strongerSameHerSelfAnchorPressure
    || richerOpenClosureAwareness
  ) && includesAny(explicitMeasuredSignalsWithoutCanonicalBaseline, [
    'project_state_continuity=',
    'continuity_anchor=',
    'closure_policy=measured-return',
    'closure_policy=repair-before-closeness',
    'closurepolicy=measured-return',
    'closurepolicy=repair-before-closeness',
    'identity_continuity',
    'anti_generic_shell_guard',
    'cross_modal_continuity_proof',
    'embodiment_continuity_proof',
    'timing=measured_return_or_repair_before_closeness',
    'preferred_timing=next-open-window',
    'closure policy measured-return',
    'closure policy repair-before-closeness',
    'embodiment',
    'initiative',
    '主动性',
    '低压',
    'measured-return',
    'repair-before-closeness',
    legacyCue('same living ', 'line'),
    'identity continuity',
    'unfinished closure',
    legacyCue('before widening ', 'outward'),
    legacyCue('before the turn widens ', 'outward'),
    'before direct expansion',
    'before the turn expands outward',
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
  const nextClosurePressure = requiresLifeLoopClosure
    && phaseOneDigitalLife
    && hasLiveProjectNextClosureEvidence
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
  const hasProjectStateInput = Boolean(
    input.runtimeDigest?.projectState
    || input.currentConsciousFrame?.projectState
    || input.projectState,
  )
  const mergedProjectStateForBias = hasProjectStateInput
    ? {
        ...input.runtimeDigest?.projectState,
        ...input.currentConsciousFrame?.projectState,
        ...input.projectState,
      }
    : null
  const projectStateBias = deriveProjectStateProactiveBias(mergedProjectStateForBias)
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
  const relationshipTimedStyle = explicitContinuityRestraintBias.forceSilentObserve || runtimeContinuityArcBias.forceSilentObserve || affectiveResidueBias.forceSilentObserve || longHorizonMemoryBias.forceSilentObserve || autobiographicalSelfBias.forceSilentObserve || selfEvolutionBias.forceSilentObserve || continuityGovernanceBias.forceSilentObserve || habitPolicyBias.forceSilentObserve || motiveAgendaBias.forceSilentObserve || projectStateBias.forceSilentObserve || projectStateBias.requiresLifeLoopClosure
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
  pushReason(reasonCodes, 'project-continuity-pressure', projectStateBias.sameHerPressure)
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

  const structuredProactiveReasonInput = {
    shouldInterrupt,
    reasonCodes,
    scenario,
    style: personaAwareStyle,
    urgency,
    confidence,
    baseScore,
    threshold,
    cooldownActive,
    suppressBusy,
    continuityHoldForLater,
    personaBias,
    explicitContinuityRestraintBias,
    runtimeContinuityArcBias,
    affectiveResidueBias,
    longHorizonMemoryBias,
    autobiographicalSelfBias,
    selfEvolutionBias,
    continuityGovernanceBias,
    projectStateBias,
    memoryOsPreferredTiming: explicitContinuityRestraintBias.source === 'memory-os'
      ? explicitContinuityRestraintBias.preferredTiming
      : null,
    safetyGateRestraint: explicitContinuityRestraintBias.safetyGateRestraint,
    resumeConfirmationBoundary: explicitContinuityRestraintBias.resumeConfirmationBoundary,
    afterglowWindow,
    runtimeDominantChannel,
    architectureDominantSystem: sanitizeText(input.architecture?.dominantSystem, 64),
    activeLoopPhase,
    activeLoopCoherence,
    activeLoopInitiativeBudget,
    runtimeDialogueReady,
    runtimeControlReady,
    runtimeObservationHeavy,
    architectureDialogueReady,
    architectureControlReady,
    architectureObservationHeavy,
    executionCallbackAfterglowHold,
    structuredEmbodimentCadenceActive: Boolean(structuredEmbodimentCadenceCue),
    selfEvolutionVerifyHold,
    selfRevisionProactiveHold,
    governorWithholdActive,
    repairIntentActive,
    careIntentActive,
    thoughtThreadRipe,
    privateThoughtReady,
    activeInquiryAskForGrounding: Boolean(activeInquiryPlan?.askForGrounding),
    focusBeliefStatus: sanitizeText(focusBelief?.status, 64) || null,
  }
  const whyNow = buildStructuredProactiveReason({
    phase: 'why_now',
    ...structuredProactiveReasonInput,
  })
  const whyNotLater = buildStructuredProactiveReason({
    phase: 'why_not_later',
    ...structuredProactiveReasonInput,
  })

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

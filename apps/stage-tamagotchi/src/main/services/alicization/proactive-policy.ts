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
  AlicizationEmotionalKernelSnapshot,
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
import { inferScenarioFromContext } from './proactive-layered-context'

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

interface AlicizationExecutionBoundaryProactiveBias {
  forceSilentObserve: boolean
  safetyGateRestraint: boolean
  resumeConfirmationBoundary: boolean
  scoreDelta: number
  thresholdDelta: number
}

interface AlicizationAffectiveResidueProactiveBias {
  restProtective: boolean
  repairFirst: boolean
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
  personaBias: AlicizationPersonaProactiveBias
  executionBoundaryBias: AlicizationExecutionBoundaryProactiveBias
  affectiveResidueBias: AlicizationAffectiveResidueProactiveBias
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
  add('persona=direct_reconnect', input.personaBias.prefersDirectReconnect)
  add('persona=guardian_care', input.personaBias.guardianCareBias)
  add('safety_gate=blocked_dispatch_confirmation_required', input.executionBoundaryBias.safetyGateRestraint)
  add('confirmation_boundary=host_confirmed_before_redispatch', input.executionBoundaryBias.resumeConfirmationBoundary)
  add('affective_rest=protected', input.affectiveResidueBias.restProtective)
  add('affective_repair=active', input.affectiveResidueBias.repairFirst)
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

  const returnWithProof = dominantMode === 'return-with-proof'
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

function deriveExecutionBoundaryProactiveBias(input: {
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}): AlicizationExecutionBoundaryProactiveBias {
  const reasonTags = new Set(input.emotionalKernel?.reasonTags ?? [])
  const safetyGateRestraint = reasonTags.has('execution-safety-gate')
  const resumeConfirmationBoundary = reasonTags.has('execution-resume-confirmation')
  const active = safetyGateRestraint || resumeConfirmationBoundary

  return {
    forceSilentObserve: active,
    safetyGateRestraint,
    resumeConfirmationBoundary,
    scoreDelta: active ? -0.16 : 0,
    thresholdDelta: active ? 0.12 : 0,
  }
}

function deriveAffectiveResidueProactiveBias(
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null,
): AlicizationAffectiveResidueProactiveBias {
  if (!affectiveResidue) {
    return {
      restProtective: false,
      repairFirst: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  const restProtective = affectiveResidue.dominantResidueKind === 'rest-protective'
    || affectiveResidue.restProtectivePressure >= 0.42
  const repairFirst = affectiveResidue.dominantResidueKind === 'repair'
    && affectiveResidue.repairPressure >= 0.42

  if (!restProtective && !repairFirst) {
    return {
      restProtective: false,
      repairFirst: false,
      forceSilentObserve: false,
      scoreDelta: 0,
      thresholdDelta: 0,
    }
  }

  return {
    restProtective,
    repairFirst,
    forceSilentObserve: true,
    scoreDelta: restProtective ? -0.16 : -0.14,
    thresholdDelta: restProtective ? 0.12 : 0.1,
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
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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
  const executionBoundaryBias = deriveExecutionBoundaryProactiveBias({
    emotionalKernel: input.emotionalKernel ?? null,
  })
  const affectiveResidueBias = deriveAffectiveResidueProactiveBias(input.affectiveResidue ?? null)
  const habitPolicyBias = deriveHabitPolicyProactiveBias(input.habitPolicy ?? null)
  const continuityDeliberation = input.continuityDeliberation ?? null
  const continuityDeliberationActive = Boolean(
    continuityDeliberation
    && continuityDeliberation.kind !== 'none',
  )
  const continuityDeliberationDefersSpeech = Boolean(
    continuityDeliberationActive
    && (
      continuityDeliberation?.shouldSpeakNow !== true
      || continuityDeliberation.preferredTiming === 'internal-only'
      || continuityDeliberation.preferredTiming === 'after-payoff'
      || continuityDeliberation.preferredTiming === 'next-open-window'
      || continuityDeliberation.intrusionRisk === 'high'
    ),
  )
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
  }
  if (continuityDeliberationActive) {
    consideredSignals.push(
      'continuityDeliberation.kind',
      'continuityDeliberation.preferredTiming',
      'continuityDeliberation.shouldSpeakNow',
    )
  }
  if (executionBoundaryBias.safetyGateRestraint)
    consideredSignals.push('emotionalKernel.executionSafetyGateRestraint')
  if (executionBoundaryBias.resumeConfirmationBoundary)
    consideredSignals.push('emotionalKernel.executionResumeConfirmationBoundary')
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
    if (input.runtimeDigest.activeLoop) {
      consideredSignals.push(
        'runtimeDigest.activeLoop.phase',
        'runtimeDigest.activeLoop.handoffTarget',
        'runtimeDigest.activeLoop.initiativeBudget',
        'runtimeDigest.activeLoop.coherence',
      )
    }
  }
  if (input.affectiveResidue)
    consideredSignals.push('affectiveResidue.dominant', 'affectiveResidue.restProtection', 'affectiveResidue.repairPressure')
  if (input.selfEvolution)
    consideredSignals.push('selfEvolution.nextLearningAction', 'selfEvolution.contradictionPressure')
  if (input.learningExecutionState)
    consideredSignals.push('learningExecutionState.nextLearningAction', 'learningExecutionState.activeLearningFocuses')
  if (input.personalityAuthority)
    consideredSignals.push('personalityAuthority.identityKernel', 'personalityAuthority.initiativeBaseline', 'personalityAuthority.expressionProfile')
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const selfRevisionPatchLanes = asArray(selfRevisionPatch?.lanes)
  const selfRevisionPatchReasonCodes = asArray(selfRevisionPatch?.reasonCodes)
  const selfRevisionProactivePolicy = selfRevisionPatchLanes.includes('proactive-policy')
    ? selfRevisionPatch?.proactivePolicy ?? null
    : null
  const selfRevisionValidation = selfRevisionPatchLanes.includes('proactive-policy')
    ? selfRevisionPatch?.validation ?? null
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
  const contradictionPressure = (input.knowledgeEvidence?.contradictionCount ?? 0)
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
  const validationRelief = (input.knowledgeEvidence?.validationCount ?? 0)
    + (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
  if (input.knowledgeEvidence)
    consideredSignals.push('knowledgeEvidence')
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
  const personaPreferredStyle = personaBias.forcedStyle ?? runtimeAwareStyle
  const personaAwareStyle = continuityDeliberationDefersSpeech
    || executionBoundaryBias.forceSilentObserve
    || affectiveResidueBias.forceSilentObserve
    || habitPolicyBias.forceSilentObserve
    ? 'silent-observe' as const
    : personaPreferredStyle
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
      + executionBoundaryBias.scoreDelta
      + affectiveResidueBias.scoreDelta
      + habitPolicyBias.scoreDelta

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
  if (activeLoop) {
    baseScore += Math.max(0, activeLoopInitiativeBudget - 0.5) * 0.16
    baseScore += Math.max(0, activeLoopCoherence - 0.5) * 0.12
    if (activeLoopPhase === 'dialogue' || activeLoopPhase === 'control')
      baseScore += 0.04
    if (activeLoopObservePhase && !runtimeDialogueReady && !runtimeControlReady)
      baseScore -= 0.1
  }
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
    + executionBoundaryBias.thresholdDelta
    + affectiveResidueBias.thresholdDelta
    + habitPolicyBias.thresholdDelta

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
      || asArray(input.learningExecutionState?.activeLearningFocuses ?? input.selfEvolution?.activeLearningFocuses).some(focus =>
        sanitizeText(focus, 64).toLowerCase().includes('world-model'),
      )
    ),
  )
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
      && !contradictionHeavyKnowledgeHold
      && !selfEvolutionVerifyHold
      && !selfRevisionProactiveHold
      && !continuityDeliberationDefersSpeech
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

  pushReason(reasonCodes, 'kill-switch-suspended', input.killSwitchSuspended)
  pushReason(reasonCodes, 'fullscreen-host', context.system.fullscreenLikely)
  pushReason(reasonCodes, 'busy-host', suppressBusy && !context.system.fullscreenLikely)
  pushReason(reasonCodes, 'global-cooldown-active', cooldownActive)
  pushReason(reasonCodes, 'continuity-internal-only', continuityDeliberation?.preferredTiming === 'internal-only')
  pushReason(reasonCodes, 'continuity-after-payoff', continuityDeliberation?.preferredTiming === 'after-payoff')
  pushReason(reasonCodes, 'continuity-next-open-window', continuityDeliberation?.preferredTiming === 'next-open-window')
  pushReason(reasonCodes, 'continuity-execution-callback', continuityDeliberation?.kind === 'execution-callback')
  pushReason(reasonCodes, 'attention-anchor-active', input.perception?.activeAttentionAnchor)
  pushReason(reasonCodes, 'recent-observation-memory', (input.perception?.recentObservationCount ?? 0) >= 2)
  pushReason(reasonCodes, 'invited-inspection-active', input.perception?.invitedInspectionActive)
  pushReason(reasonCodes, 'scenario-bias-raised', feedbackBias > 0)
  pushReason(reasonCodes, 'recent-dismiss-penalty', feedbackBias >= 0.15)
  pushReason(reasonCodes, 'recent-positive-feedback', feedbackBias < 0)
  pushReason(reasonCodes, 'recent-ignored-penalty', proactiveState.consecutiveIgnored[scenario] >= 3)
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
  if (selfRevisionProactivePolicy) {
    if (!reasonCodes.includes('recent-ignored-penalty'))
      pushReason(reasonCodes, 'recent-ignored-penalty', selfRevisionProactivePolicy.restraintBias >= 0.12)
    if (!reasonCodes.includes('scenario-bias-raised'))
      pushReason(reasonCodes, 'scenario-bias-raised', selfRevisionProactivePolicy.actuationCooldownBias >= 0.12)
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
    personaBias,
    executionBoundaryBias,
    affectiveResidueBias,
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
      executionBoundaryBias.forceSilentObserve
      || affectiveResidueBias.forceSilentObserve
      || habitPolicyBias.forceSilentObserve
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

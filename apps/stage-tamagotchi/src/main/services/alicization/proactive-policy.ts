import type {
  AlicizationActionEcologySnapshot,
  AlicizationAutonomySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveDecision,
  AlicizationProactiveReasonCode,
  AlicizationProactiveScenario,
  AlicizationRelationshipModelSnapshot,
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
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type { AlicizationContinuityDeliberation } from './continuity-deliberation'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { deriveAlicizationRuntimeProactiveSignals } from './alicization-active-loop'
import { deriveProactiveCadenceSignal } from './proactive-cadence'
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
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  return selfGovernor?.activeIntentions.find(intention => intention.id === selfGovernor.dominantIntentionId)
    ?? selfGovernor?.activeIntentions[0]
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
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  continuityDeliberation?: AlicizationContinuityDeliberation | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}): AlicizationProactivePolicyEvaluation {
  const { context, proactiveState } = input
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
    consideredSignals.push('architecture.operatingMode', 'architecture.dominantSystem')
    if (input.architecture.supportingSystems.length > 0)
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
  if (input.personalityContinuityState)
    consideredSignals.push('personalityContinuity.regime', 'personalityContinuity.rhythm')
  if (input.continuityDeliberation)
    consideredSignals.push('continuityDeliberation.kind', 'continuityDeliberation.timing', 'continuityDeliberation.intrusion')
  if (input.affectiveResidue)
    consideredSignals.push('affectiveResidue.dominant', 'affectiveResidue.cadence', 'affectiveResidue.restProtection')
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
  })
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
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const activeInquiryPlan = input.inquiryPlanner?.plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? input.inquiryPlanner?.plans[0]
    ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const foregroundRuntimeThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const livingWorldOpenLoop = input.livingWorldState?.openLoops[0] ?? null
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
      + (input.livingWorldState?.openLoops.length ? 0.04 : 0)
      + (input.selfGovernor?.dominantDrive === 'understand' ? 0.03 : 0)
      + (careIntentActive && (scenario === 'late-night-care' || context.relationship.fatigue >= 55) ? 0.08 : 0)
      + (repairIntentActive && input.worldModel?.epistemicState.certainty === 'grounded' ? 0.04 : 0)
      + (thoughtThreadRipe ? 0.1 : 0)
      - (governorWithholdActive ? 0.22 : 0)
      - (repairIntentActive && input.worldModel?.epistemicState.certainty !== 'grounded' ? 0.12 : 0)
      + Math.min(0.08, validationRelief * 0.02)
      - Math.min(0.14, contradictionPressure * 0.03)

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
    - (input.livingWorldState?.openLoops.length ? 0.02 : 0)
    + Math.min(0.08, contradictionPressure * 0.02)
    - Math.min(0.05, validationRelief * 0.01)

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
  threshold -= cadence.cadencePressure * 0.08
  threshold -= Math.max(0, cadence.initiativeTrust - 0.5) * 0.06
  threshold += (input.affectiveResidue?.relationshipCadence.shouldDelayWarmth ? 0.06 : 0)
  threshold += (input.affectiveResidue?.relationshipCadence.shouldProtectRest ? 0.06 : 0)

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
  const shouldInterrupt
    = !input.killSwitchSuspended
      && !suppressBusy
      && !cooldownActive
      && !continuityHoldForLater
      && !contradictionHeavyKnowledgeHold
      && runtimeAwareStyle !== 'silent-observe'
      && activeLoopAllowsSpeaking
      && governorAllowsSpeaking
      && initiativeReady
      && privateThoughtReady
      && baseScore >= threshold

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
  pushReason(reasonCodes, 'continuity-execution-callback', continuityDeliberation?.kind === 'execution-callback')
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
  pushReason(reasonCodes, 'belief-contradicted', focusBelief?.status === 'contradicted' || (input.beliefLedger?.unresolvedContradictions.length ?? 0) > 0)
  pushReason(reasonCodes, 'inquiry-open', Boolean(primaryInquiry) || (input.inquiryLoop?.openCount ?? 0) > 0)
  pushReason(reasonCodes, 'private-thought-uncertain', activeInquiryPlan?.askForGrounding && input.mindKernel?.dominantMode === 'repairing')
  pushReason(reasonCodes, 'relationship-guarded', input.relationshipModel?.climate === 'guarded')
  pushReason(reasonCodes, 'relationship-attuned', input.relationshipModel?.climate === 'attuned')
  pushReason(reasonCodes, 'relationship-correction-sensitive', (input.relationshipModel?.correctionSensitivity ?? 0) >= 0.58)

  const cooldownMs = clampMs(
    buildBaseCooldownMs(scenario) * (proactiveState.consecutiveIgnored[scenario] >= 3 ? 2 : 1),
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

  return {
    shouldInterrupt,
    confidence: Number(confidence.toFixed(2)),
    reasonCodes,
    urgency,
    style: runtimeAwareStyle,
    cooldownMs,
    scenario,
    policyVersion: proactivePolicyVersion,
    feedbackBias: Number(feedbackBias.toFixed(2)),
    consideredSignals,
    ignoredSignals,
    whyNow,
    whyNotLater,
  }
}

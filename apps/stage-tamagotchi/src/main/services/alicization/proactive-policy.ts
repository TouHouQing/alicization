import type {
  AlicizationActionEcologySnapshot,
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
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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

export function evaluateProactivePolicy(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  proactiveState: AlicizationProactiveLoopState
  killSwitchSuspended: boolean
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
  worldModel?: AlicizationWorldModelSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
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
  const urgency = resolveUrgency({
    scenario,
    fatigue: context.relationship.fatigue,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    contentKind: context.content.kind,
    loneliness: context.relationship.loneliness,
    durabilityPulse: input.durabilityPulse,
  })
  const privateThoughtReady = input.privateThought?.shouldSpeak === true
  const relationalTension = clamp01(
    context.relationship.boredom * 0.005
    + context.relationship.loneliness * 0.005
    + context.relationship.fatigue * (scenario === 'late-night-care' ? 0.003 : 0.0015),
  )
  const initiativeSpeakDrive = input.initiative?.speakDrive
    ?? clamp01(
      (privateThoughtReady ? 0.46 : 0.18)
      + Math.max(0, (input.privateThought?.confidence ?? 0.5) - 0.5) * 0.45
      + (context.content.kind === 'error' ? 0.1 : 0)
      + (context.content.kind === 'diff' ? 0.06 : 0)
      + (scenario === 'late-night-care' && context.relationship.fatigue >= 55 ? 0.08 : 0),
    )
  const initiativeSilenceDrive = input.initiative?.silenceDrive
    ?? clamp01(
      (style === 'silent-observe' ? 0.5 : 0.18)
      + (input.privateThought?.stance === 'uncertain' ? 0.22 : 0)
      + (context.system.inputActivity === 'active' ? 0.1 : 0),
    )
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

  if (afterglowWindow)
    threshold -= 0.06

  const initiativeReady = input.initiative
    ? input.initiative.shouldSpeak
    : input.actionEcology?.shouldSpeak ?? privateThoughtReady
  const governorAllowsSpeaking = !governorWithholdActive
    && (!repairIntentActive || input.worldModel?.epistemicState.certainty === 'grounded')
  const shouldInterrupt
    = !input.killSwitchSuspended
      && !suppressBusy
      && !cooldownActive
      && style !== 'silent-observe'
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
      if (afterglowWindow)
        return '刚从长时共视场景回神，这正是最自然的轻声搭话窗口。'
      if (isSeriousDurabilityPulse(input.durabilityPulse))
        return '宿主前台工具刚出现了崩溃或无响应迹象，继续沉默会错过最关键的关心窗口。'
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
    if (style === 'silent-observe')
      return '当前场景只适合静默观察，不适合打断。'
    if (input.perception?.activeAttentionAnchor)
      return '虽然短时知觉还记得宿主刚才的工作对象，但现在还没强到值得立刻插话。'
    return '她确实在意这一刻，但内里的开口冲动还没有压过保持克制的倾向。'
  })()

  const whyNotLater = (() => {
    if (shouldInterrupt)
      return '继续延后会错过当前语境窗口。'
    if (suppressBusy)
      return '等忙碌态解除或退出全屏后再重新评估。'
    if (cooldownActive)
      return '至少等冷却结束后再看是否还存在同类信号。'
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
    style,
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

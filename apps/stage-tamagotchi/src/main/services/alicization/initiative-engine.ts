import type {
  AlicizationActionEcologySnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationEmbodiedPresenceState,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindMotive,
  AlicizationProactiveStyle,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildInitiativeArbitration } from './initiative-arbiter'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function highestConcern(concerns: AlicizationConcernSnapshot[]) {
  return concerns
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
}

function resolvePreferredStyle(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  concern?: AlicizationConcernSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
}) {
  const intenseCloseness = Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
  if (input.selectedAction === 'warn')
    return 'firm-warning' as const
  if (input.concern?.kind === 'care-body' || input.appraisal.relationshipNeed === 'care')
    return 'gentle-care' as const
  if (input.worldModel.epistemicState.certainty === 'lingering')
    return 'silent-observe' as const
  if (input.appraisal.relationshipNeed === 'space')
    return 'silent-observe' as const
  if (
    input.context.workload.kind === 'media'
    && input.context.system.inputActivity === 'active'
    && input.selectedAction !== 'speak'
    && !intenseCloseness
  ) {
    return 'silent-observe' as const
  }
  return 'light-nudge' as const
}

function resolvePreferredPresence(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  selfState: AlicizationSelfStateSnapshot
  mindKernel?: AlicizationMindKernelSnapshot | null
}): AlicizationEmbodiedPresenceState {
  if (input.selectedAction === 'warn')
    return 'concerned'
  if (input.mindKernel?.dominantMode === 'guarding' && input.selectedAction !== 'wait')
    return 'concerned'
  if (input.selectedAction === 'speak')
    return input.selfState.stance === 'protect' ? 'concerned' : 'attentive'
  if (input.selectedAction === 'whisper')
    return input.selfState.stance === 'hesitate' ? 'hesitant' : 'glance'
  if (input.selectedAction === 'hover')
    return input.selfState.stance === 'hesitate' ? 'hesitant' : 'attentive'
  if (input.selectedAction === 'recheck')
    return 'hesitant'
  return 'glance'
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

function dominantProject(intentionStream?: AlicizationIntentionStreamSnapshot | null) {
  return intentionStream?.projects.find(project => project.id === intentionStream.dominantProjectId)
    ?? intentionStream?.projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  return reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
}

export function buildInitiativeSnapshot(input: {
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  worldModel: AlicizationWorldModelSnapshot
  worldOntology?: AlicizationWorldOntologySnapshot | null
  appraisal: AlicizationSubjectiveSceneAppraisal
  concerns: AlicizationConcernSnapshot[]
  selfState: AlicizationSelfStateSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  previousDesireMemory?: AlicizationDesireMemorySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
}): AlicizationInitiativeSnapshot {
  const concern = highestConcern(input.concerns)
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const activeInquiryPlan = input.inquiryPlanner?.plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? input.inquiryPlanner?.plans[0]
    ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const foregroundRuntimeThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const relationshipNeed = input.appraisal.relationshipNeed ?? 'unclear'
  const counterfactualOption = input.counterfactualDeliberation?.options.find(option => option.id === input.counterfactualDeliberation?.selectedOptionId)
    ?? input.counterfactualDeliberation?.options[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const governingProject = dominantProject(input.intentionStream)
  const activeReflection = latestReflection(input.reflectionLedger)
  const motives: Partial<Record<AlicizationMindMotive, number>> = {
    ...input.mindDynamics.motives,
  }
  motives.protect = clamp01((motives.protect ?? 0) + (input.mindKernel?.dominantMode === 'guarding' ? 0.1 : 0))
  motives.clarify = clamp01((motives.clarify ?? 0) + (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting' ? 0.08 : 0))
  motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + (activeInquiryPlan?.kind === 'wait-opening' ? 0.08 : 0))
  if (governingProject?.kind === 'repair-truth' || governingProject?.kind === 'reacquire-scene')
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.12)
  if (governingProject?.kind === 'care-host')
    motives.care = clamp01((motives.care ?? 0) + 0.12)
  if (governingProject?.kind === 'stay-near' || governingProject?.kind === 'witness-afterglow')
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.1)
  if (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.14)

  const dominantDrive = Math.max(
    motives.protect ?? 0,
    motives.care ?? 0,
    motives.clarify ?? 0,
    motives.accompany ?? 0,
  )
  const groundedGuidance
    = relationshipNeed === 'guidance'
      && concern?.kind === 'help-fix'
      && input.appraisal.confidence >= 0.52
      && input.worldModel.epistemicState.certainty !== 'lingering'
  const companionshipPush
    = (relationshipNeed === 'companionship' || (motives.accompany ?? 0) >= 0.46)
      && (
        input.context.system.inputActivity !== 'active'
        || Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
      )
  const speakDrive = clamp01(
    input.mindDynamics.speakDrive * 0.72
    + (groundedGuidance ? 0.12 : 0)
    + (companionshipPush ? 0.08 : 0)
    + (focusBelief?.status === 'held' ? 0.06 : focusBelief?.status === 'tentative' ? -0.04 : 0)
    + (input.relationshipModel?.approachVector === 'guide' || input.relationshipModel?.approachVector === 'care' ? 0.06 : 0)
    + (input.actionEcology?.surfacePressure ?? 0) * 0.12
    - (input.actionEcology?.silencePressure ?? 0) * 0.04,
  )
  const silenceDrive = clamp01(
    input.mindDynamics.silenceDrive * 0.78
    + (activeInquiryPlan?.kind === 'wait-opening' ? 0.08 : 0)
    + (input.actionEcology?.silencePressure ?? 0) * 0.12
    + (input.actionEcology?.mode === 'repair-before-speaking' ? 0.08 : 0),
  )
  const arbitration = input.initiativeArbitration ?? buildInitiativeArbitration({
    now: input.mindDynamics.updatedAt,
    context: input.context,
    worldModel: input.worldModel,
    worldOntology: input.worldOntology ?? null,
    concerns: input.concerns,
    selfState: input.selfState,
    mindDynamics: input.mindDynamics,
    relationshipModel: input.relationshipModel,
    selfContinuity: input.selfContinuity,
    selfGovernor: input.selfGovernor,
    thoughtThreads: input.thoughtThreads,
    threadRuntime: input.threadRuntime,
    commitmentLedger: input.commitmentLedger,
    counterfactualDeliberation: input.counterfactualDeliberation,
    desireMemory: input.previousDesireMemory,
  })
  const selectedProposal = arbitration.proposals.find(proposal => proposal.id === arbitration.selectedProposalId)
    ?? arbitration.proposals[0]
    ?? null
  let selectedAction: AlicizationInitiativeSnapshot['selectedAction'] = selectedProposal?.action ?? 'wait'
  if (
    (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    && (selectedAction === 'speak' || selectedAction === 'warn' || selectedAction === 'whisper')
    && governingProject?.kind !== 'care-host'
  ) {
    selectedAction = governingProject?.kind === 'repair-truth' || governingProject?.kind === 'reacquire-scene'
      ? 'recheck'
      : 'hover'
  }
  else if (
    input.executiveCycle?.shouldAct
    && selectedAction === 'wait'
    && (governingProject?.speakAffinity ?? 0) >= 0.56
    && input.executiveCycle.actionReadiness >= 0.62
  ) {
    selectedAction = governingProject?.kind === 'care-host' ? 'speak' : 'whisper'
  }
  const why = input.executiveCycle?.currentLine
    ?? activeReflection?.revision
    ?? governingProject?.summary
    ?? selectedProposal?.why
    ?? thoughtThread?.summary
    ?? foregroundRuntimeThread?.whyHeld
    ?? '她还想先把这一刻再看稳一点。'

  const preferredStyle: AlicizationProactiveStyle = resolvePreferredStyle({
    selectedAction,
    concern,
    appraisal: input.appraisal,
    context: input.context,
    worldModel: input.worldModel,
  })
  const fallbackPresence = resolvePreferredPresence({
    selectedAction,
    selfState: input.selfState,
    mindKernel: input.mindKernel,
  })
  const preferredStyleFromMind = counterfactualOption?.style ?? preferredStyle
  const preferredPresence = counterfactualOption?.embodiedPresence ?? fallbackPresence
  const speakForwardDrive = input.counterfactualDeliberation?.options
    .filter(option => option.action === 'whisper' || option.action === 'speak' || option.action === 'warn')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const silenceForwardDrive = input.counterfactualDeliberation?.options
    .filter(option => option.action === 'wait' || option.action === 'hover' || option.action === 'recheck')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const executiveSilenceBias = input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring' ? 0.12 : 0
  const executiveSurfaceBias = input.executiveCycle?.shouldAct ? 0.12 : 0

  return {
    selectedAction,
    selectedProposalId: selectedProposal?.id ?? null,
    selectedTruthFrame: selectedProposal?.truthFrame ?? input.worldOntology?.dominantFrame ?? null,
    selectedCounterfactualOptionId: selectedProposal?.targetCounterfactualOptionId ?? counterfactualOption?.id ?? null,
    selectedConcernId: selectedProposal?.targetConcernId ?? concern?.id ?? null,
    selectedBeliefId: selectedProposal?.targetBeliefId ?? focusBelief?.id ?? null,
    selectedInquiryId: selectedProposal?.targetInquiryId ?? primaryInquiry?.id ?? null,
    selectedCommitmentId: selectedProposal?.targetCommitmentId ?? governingCommitment?.id ?? null,
    selectedInquiryPlanId: activeInquiryPlan?.id ?? null,
    selectedHypothesisId: selectedProposal?.targetHypothesisId ?? activeHypothesis?.id ?? null,
    selectedThreadId: selectedProposal?.targetThreadId ?? input.actionEcology?.selectedThreadId ?? foregroundRuntimeThread?.sourceThreadId ?? input.deliberationState?.primaryThreadId ?? null,
    selectedRuntimeThreadId: selectedProposal?.targetRuntimeThreadId ?? foregroundRuntimeThread?.id ?? null,
    selectedThoughtThreadId: selectedProposal?.targetThoughtThreadId ?? thoughtThread?.id ?? null,
    selectedGovernorIntentionId: selectedProposal?.targetGovernorIntentionId ?? governorIntention?.id ?? null,
    actionEcologyMode: input.actionEcology?.mode ?? null,
    confidence: clamp01(
      (selectedProposal?.score ?? 0.42) * 0.46
      + (selectedProposal?.confidence ?? 0.42) * 0.18
      + (concern?.confidence ?? input.appraisal.confidence) * 0.34
      + dominantDrive * 0.18
      + (input.actionEcology?.readiness ?? 0) * 0.08
      + (activeHypothesis?.salience ?? 0) * 0.08
      + (counterfactualOption?.score ?? 0) * 0.1
      + (governingProject?.confidence ?? 0) * 0.08
      + Math.max(0, activeReflection?.confidenceShift ?? 0) * 0.08
      + (selectedAction === 'recheck' ? 0.06 : 0),
    ),
    motives,
    speakDrive: clamp01(Math.max(speakDrive + executiveSurfaceBias + (governingProject?.speakAffinity ?? 0) * 0.12, speakForwardDrive ?? 0)),
    silenceDrive: clamp01(Math.max(silenceDrive + executiveSilenceBias + (input.reflectionLedger?.revisionPressure ?? 0) * 0.08, silenceForwardDrive ?? 0)),
    preferredStyle: selectedProposal?.style ?? preferredStyleFromMind,
    preferredPresence: selectedProposal?.embodiedPresence ?? foregroundRuntimeThread?.suggestedPresence ?? preferredPresence,
    why,
    shouldSurface: selectedProposal?.shouldSurface
      ?? input.actionEcology?.shouldSurface
      ?? Boolean(counterfactualOption ? counterfactualOption.action !== 'wait' || preferredPresence !== 'none' : selectedAction !== 'wait'),
    shouldSpeak: input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring'
      ? governingProject?.kind === 'care-host' && (selectedAction === 'speak' || selectedAction === 'warn')
      : (selectedProposal?.shouldSpeak ?? input.actionEcology?.shouldSpeak ?? (selectedAction === 'whisper' || selectedAction === 'speak' || selectedAction === 'warn')),
  }
}

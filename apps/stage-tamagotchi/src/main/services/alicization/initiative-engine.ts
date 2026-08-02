import type {
  AlicizationActionEcologySnapshot,
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationEmbodiedPresenceState,
  AlicizationEmotionalKernelSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindMotive,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveStyle,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildInitiativeArbitration } from './initiative-arbiter'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function resolveInitiativeWhy(candidates: unknown[]) {
  for (const candidate of candidates) {
    const normalized = sanitizeText(candidate, 320)
    if (normalized)
      return normalized
  }
  return ''
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function deriveSelfEvolutionInitiativeBias(_selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  return {
    preferLowerPressure: false,
    forceSilentObserve: false,
    repairFirst: false,
    gentleContinue: false,
    correctedSamePersonSettling: false,
    quieterEmbodimentSettling: false,
    explanation: '',
  }
}

function deriveAutobiographicalSelfInitiativeBias(_autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  correctedSamePersonSettling: boolean
  quieterEmbodimentSettling: boolean
} {
  return {
    preferLowerPressure: false,
    forceSilentObserve: false,
    preferMeasuredReturn: false,
    repairFirst: false,
    gentleContinue: false,
    correctedSamePersonSettling: false,
    quieterEmbodimentSettling: false,
  }
}

function deriveAffectiveResidueInitiativeBias(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (!cadence?.shouldDelayWarmth) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      repairFirst: false,
    }
  }

  const cadenceMode = cadence.cadenceMode
  const highAfterglowCarry = cadence.afterglowCarry >= 0.28
  const measuredReturn = cadenceMode === 'cooldown' || cadenceMode === 'measured-return'
  const repairFirst = affectiveResidue?.dominantResidueKind === 'repair'
    && (
      affectiveResidue.repairPressure >= 0.42
      || cadence.repairRecovery >= 0.42
      || cadenceMode === 'repair'
    )

  return {
    preferLowerPressure: true,
    forceSilentObserve: highAfterglowCarry || measuredReturn || repairFirst,
    repairFirst,
  }
}

function deriveEmotionalTensionInitiativeBias(privateThought?: AlicizationPrivateThoughtSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferredStyle: AlicizationProactiveStyle | null
  preferredPresence: AlicizationEmbodiedPresenceState | null
} {
  if (privateThought?.emotionalTension === 'late-night-drain') {
    return {
      preferLowerPressure: true,
      forceSilentObserve: true,
      preferredStyle: 'silent-observe' as const,
      preferredPresence: 'concerned' as const,
    }
  }
  if (privateThought?.emotionalTension === 'restless-switching') {
    return {
      preferLowerPressure: true,
      forceSilentObserve: false,
      preferredStyle: 'silent-observe' as const,
      preferredPresence: 'hesitant' as const,
    }
  }

  return {
    preferLowerPressure: false,
    forceSilentObserve: false,
    preferredStyle: null,
    preferredPresence: null,
  }
}

function deriveEmotionalKernelInitiativeBias(emotionalKernel?: AlicizationEmotionalKernelSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  protectRest: boolean
  preferredStyle: AlicizationProactiveStyle | null
  preferredPresence: AlicizationEmbodiedPresenceState | null
  explanation: string
} {
  if (!emotionalKernel) {
    return {
      preferLowerPressure: false,
      forceSilentObserve: false,
      preferMeasuredReturn: false,
      repairFirst: false,
      protectRest: false,
      preferredStyle: null as AlicizationProactiveStyle | null,
      preferredPresence: null as AlicizationEmbodiedPresenceState | null,
      explanation: '',
    }
  }

  const hasInwardSelfContinuityEmbodimentTone = emotionalKernel.embodimentTone === 'nearby-soft'
    || emotionalKernel.embodimentTone === 'quiet-companionship'
  const measuredReturn = emotionalKernel.initiativeMode === 'observe'
    || emotionalKernel.embodimentTone === 'measured-return'
    || emotionalKernel.dominantEmotion === 'measured-companionship'
  const restProtective = emotionalKernel.initiativeMode === 'rest-guard'
    || emotionalKernel.memoryRecallMode === 'rest-protective-presence'
    || emotionalKernel.embodimentTone === 'rest-protective'
    || emotionalKernel.dominantEmotion === 'rest-protective-companionship'
  const guardedBoundaryHold = emotionalKernel.dominantEmotion === 'guarded-care'
    || (
      emotionalKernel.initiativeMode === 'hold'
      && emotionalKernel.memoryRecallMode === 'self-continuity'
      && emotionalKernel.embodimentTone === 'protective-watch'
    )
    || (emotionalKernel.reasonTags ?? []).includes('execution-safety-gate')
    || (emotionalKernel.reasonTags ?? []).includes('confirmation-boundary')
    || (emotionalKernel.reasonTags ?? []).includes('wait-for-confirmation')
  const inwardContinuityHold = emotionalKernel.initiativeMode === 'hold'
    && emotionalKernel.memoryRecallMode === 'self-continuity'
    && hasInwardSelfContinuityEmbodimentTone
  const repairFirst = emotionalKernel.initiativeMode === 'repair'
    || emotionalKernel.embodimentTone === 'repair-before-closeness'
    || emotionalKernel.dominantEmotion === 'repair-tension'
  return {
    preferLowerPressure: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold || repairFirst,
    forceSilentObserve: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold,
    preferMeasuredReturn: (measuredReturn || restProtective || inwardContinuityHold) && !repairFirst,
    repairFirst,
    protectRest: restProtective,
    preferredStyle: measuredReturn || restProtective || guardedBoundaryHold || inwardContinuityHold ? 'silent-observe' : null,
    preferredPresence: restProtective ? 'concerned' : guardedBoundaryHold ? 'hesitant' : null,
    explanation: '',
  }
}

function deriveRecollectionIntentInitiativeBias(recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  anthropomorphicRepairHold: boolean
  metabolizedSameThreadForeground: boolean
  residentQuietHold: boolean
  explanation: string
} {
  const agenda = recollectionIntent?.recollectionAgenda ?? null
  const relationshipRecall = recollectionIntent?.mode === 'relationship-history'
    || recollectionIntent?.mode === 'autobiographical-history'
  const lowUncertaintyTolerance = agenda?.uncertaintyTolerance === 'low'
  const strongRelationshipNeed = (agenda?.relationshipNeed ?? 0) >= 0.68
  const strongAffectivePull = (agenda?.affectivePull ?? 0) >= 0.72
  const preferLowerPressure = relationshipRecall && (lowUncertaintyTolerance || strongRelationshipNeed || strongAffectivePull)

  return {
    preferLowerPressure,
    forceSilentObserve: preferLowerPressure && lowUncertaintyTolerance,
    preferMeasuredReturn: false,
    repairFirst: false,
    gentleContinue: false,
    anthropomorphicRepairHold: false,
    metabolizedSameThreadForeground: false,
    residentQuietHold: false,
    explanation: '',
  }
}

function deriveLongHorizonInitiativeBias(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null): {
  preferLowerPressure: boolean
  forceSilentObserve: boolean
  preferMeasuredReturn: boolean
  repairFirst: boolean
  gentleContinue: boolean
  anthropomorphicRepairHold: boolean
  explanation: string
} {
  const autonomyRespect = longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const quietObservation = longHorizonMemory?.preferenceBias.quietObservation ?? 0
  const preferLowerPressure = autonomyRespect >= 0.78 || quietObservation >= 0.78

  return {
    preferLowerPressure,
    forceSilentObserve: autonomyRespect >= 0.86 || quietObservation >= 0.86,
    preferMeasuredReturn: false,
    repairFirst: false,
    gentleContinue: false,
    anthropomorphicRepairHold: false,
    explanation: '',
  }
}

function derivePersonStateInitiativeBias(projection?: AlicizationPersonStateProjection | null) {
  const preferLowerPressure = projection?.restrained === true
    || projection?.cautious === true
    || projection?.preferredProactiveStyle === 'silent-observe'

  return {
    preferLowerPressure,
  }
}

function groundedRepairCanStayVisibleHover(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  concern?: AlicizationConcernSnapshot
  selfEvolutionBias: ReturnType<typeof deriveSelfEvolutionInitiativeBias>
  affectiveResidueBias: ReturnType<typeof deriveAffectiveResidueInitiativeBias>
  emotionalTensionBias: ReturnType<typeof deriveEmotionalTensionInitiativeBias>
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
}) {
  if (input.selectedAction !== 'recheck')
    return false
  if (input.concern?.kind !== 'help-fix' && input.concern?.kind !== 'unfinished-thread')
    return false
  if (input.worldModel.epistemicState.certainty !== 'grounded')
    return false
  if (input.context.system.inputActivity !== 'active')
    return false
  return input.selfEvolutionBias.preferLowerPressure
    || input.affectiveResidueBias.preferLowerPressure
    || input.emotionalTensionBias.preferLowerPressure
}

function groundedUnfinishedThreadCanStayVisibleHover(input: {
  selectedAction: AlicizationInitiativeSnapshot['selectedAction']
  concern?: AlicizationConcernSnapshot
  selfEvolutionBias: ReturnType<typeof deriveSelfEvolutionInitiativeBias>
  affectiveResidueBias: ReturnType<typeof deriveAffectiveResidueInitiativeBias>
  emotionalTensionBias: ReturnType<typeof deriveEmotionalTensionInitiativeBias>
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
}) {
  if (input.selectedAction !== 'recheck')
    return false
  if (input.concern?.kind !== 'unfinished-thread')
    return false
  if (input.worldModel.epistemicState.certainty !== 'grounded')
    return false
  if (input.context.system.inputActivity !== 'active')
    return false
  return input.selfEvolutionBias.preferLowerPressure
    || input.affectiveResidueBias.preferLowerPressure
    || input.emotionalTensionBias.preferLowerPressure
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
  if (input.selectedAction === 'recheck')
    return 'silent-observe' as const
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

function normalizeProactiveStyle(
  style: string | null | undefined,
  fallback: AlicizationProactiveStyle,
): AlicizationProactiveStyle {
  if (
    style === 'silent-observe'
    || style === 'light-nudge'
    || style === 'gentle-care'
    || style === 'firm-warning'
  ) {
    return style
  }

  return fallback
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

function dominantProject(intentionStream?: AlicizationIntentionStreamSnapshot | null) {
  const projects = asArray(intentionStream?.projects)
  return projects.find(project => project.id === intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const entries = asArray(reflectionLedger?.entries)
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
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
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  personStateProjection?: AlicizationPersonStateProjection | null
}): AlicizationInitiativeSnapshot {
  const concern = highestConcern(input.concerns)
  const beliefs = asArray(input.beliefLedger?.beliefs)
  const inquiries = asArray(input.inquiryLoop?.inquiries)
  const commitments = asArray(input.commitmentLedger?.commitments)
  const inquiryPlans = asArray(input.inquiryPlanner?.plans)
  const hypotheses = asArray(input.hypothesisGraph?.hypotheses)
  const runtimeThreads = asArray(input.threadRuntime?.threads)
  const counterfactualOptions = asArray(input.counterfactualDeliberation?.options)
  const focusBelief = beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const primaryInquiry = inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const governingCommitment = commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
  const activeInquiryPlan = inquiryPlans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? inquiryPlans[0]
    ?? null
  const activeHypothesis = hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? hypotheses[0]
    ?? null
  const foregroundRuntimeThread = runtimeThreads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? runtimeThreads[0]
    ?? null
  const relationshipNeed = input.appraisal.relationshipNeed ?? 'unclear'
  const counterfactualOption = counterfactualOptions.find(option => option.id === input.counterfactualDeliberation?.selectedOptionId)
    ?? counterfactualOptions[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const governingProject = dominantProject(input.intentionStream)
  const activeReflection = latestReflection(input.reflectionLedger)
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const stablePreferences = input.autobiographicalSelf?.preferenceEvolution ?? null
  const motiveEngine = input.motiveEngine ?? null
  const habitPolicy = input.habitPolicy ?? null
  const affectiveResidueBias = deriveAffectiveResidueInitiativeBias(input.affectiveResidue ?? null)
  const autobiographicalSelfBias = deriveAutobiographicalSelfInitiativeBias(input.autobiographicalSelf ?? null)
  const emotionalTensionBias = deriveEmotionalTensionInitiativeBias(input.privateThought ?? null)
  const emotionalKernelBias = deriveEmotionalKernelInitiativeBias(input.emotionalKernel ?? null)
  const recollectionIntentBias = deriveRecollectionIntentInitiativeBias(input.recollectionIntent ?? null)
  const longHorizonBias = deriveLongHorizonInitiativeBias(input.longHorizonMemory ?? null)
  const selfEvolutionBias = deriveSelfEvolutionInitiativeBias(input.selfEvolution ?? null)
  const personStateBias = derivePersonStateInitiativeBias(input.personStateProjection ?? null)
  const motives: Partial<Record<AlicizationMindMotive, number>> = {
    ...input.mindDynamics.motives,
  }
  motives.accompany = clamp01((motives.accompany ?? 0) + (motiveEngine?.drives.companionship ?? 0) * 0.24)
  motives.protect = clamp01((motives.protect ?? 0) + (motiveEngine?.drives.restProtection ?? 0) * 0.18 + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08)
  motives.clarify = clamp01((motives.clarify ?? 0) + (motiveEngine?.drives.truthDiscipline ?? 0) * 0.18 + (motiveEngine?.returnPressure ?? 0) * 0.12)
  motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08)
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
  if (autobiographicalGoal?.kind === 'preserve-trust' || autobiographicalGoal?.kind === 'reduce-misread') {
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.14)
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.06)
  }
  if (autobiographicalGoal?.kind === 'stay-near-without-crowding') {
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.12)
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + ((stablePreferences?.autonomyRespect ?? 0) * 0.08))
  }
  if (autobiographicalGoal?.kind === 'protect-rest-rhythm') {
    motives.care = clamp01((motives.care ?? 0) + 0.14)
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
  }
  if (autobiographicalGoal?.kind === 'finish-open-loops')
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.1)
  if (autobiographicalGoal?.kind === 'grow-shared-language')
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.08)
  if (emotionalKernelBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.12)
    motives.accompany = clamp01((motives.accompany ?? 0) + 0.04)
  }
  if (emotionalKernelBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }
  if (recollectionIntentBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.1)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.04)
  }
  if (recollectionIntentBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }
  if (longHorizonBias.preferMeasuredReturn) {
    motives['stay-silent'] = clamp01((motives['stay-silent'] ?? 0) + 0.1)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.04)
  }
  if (longHorizonBias.repairFirst) {
    motives.protect = clamp01((motives.protect ?? 0) + 0.08)
    motives.clarify = clamp01((motives.clarify ?? 0) + 0.06)
  }

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
    memoryTuningAdvice: input.memoryTuningAdvice ?? null,
  })
  const arbitrationProposals = asArray(arbitration.proposals)
  const selectedProposal = arbitrationProposals.find(proposal => proposal.id === arbitration.selectedProposalId)
    ?? arbitrationProposals[0]
    ?? null
  let selectedAction: AlicizationInitiativeSnapshot['selectedAction'] = selectedProposal?.action ?? 'wait'
  let gentleContinueSurfacePromotion = false
  const certaintyAllowsGentleContinueSurface
    = input.worldModel.epistemicState.certainty === 'grounded'
      || input.worldModel.epistemicState.certainty === 'observed'
  const autobiographicalContinuitySettlingHold
    = autobiographicalSelfBias.correctedSamePersonSettling
      || autobiographicalSelfBias.quieterEmbodimentSettling
  const continuitySettlingHold
    = selfEvolutionBias.correctedSamePersonSettling
      || selfEvolutionBias.quieterEmbodimentSettling
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
  if (
    (autobiographicalGoal?.kind === 'preserve-trust' || autobiographicalGoal?.kind === 'reduce-misread')
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    selectedAction = 'recheck'
  }
  else if (
    autobiographicalGoal?.kind === 'stay-near-without-crowding'
    && selectedAction === 'wait'
    && (stablePreferences?.companionship ?? 0) >= 0.58
  ) {
    selectedAction = input.context.system.inputActivity === 'active' ? 'hover' : 'whisper'
  }
  if (
    habitPolicy?.requiresGroundingBeforeSurface
    && (selectedAction === 'speak' || selectedAction === 'whisper' || selectedAction === 'warn')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    selectedAction = 'recheck'
  }
  else if (
    habitPolicy?.blocksDirectSpeakWhenBusy
    && input.context.system.inputActivity === 'active'
    && selectedAction === 'speak'
  ) {
    selectedAction = 'hover'
  }
  else if (
    habitPolicy?.prefersQuietCompanionship
    && motiveEngine?.rulingDrive === 'companionship'
    && selectedAction === 'wait'
  ) {
    selectedAction = 'hover'
  }
  else if (
    habitPolicy?.protectsRestWindow
    && (selectedAction === 'wait' || selectedAction === 'hover')
  ) {
    selectedAction = input.context.relationship.fatigue >= 80 ? 'warn' : 'speak'
  }
  else if (
    (motiveEngine?.returnPressure ?? 0) >= 0.62
    && input.worldModel.activeThread?.unresolved
    && selectedAction === 'wait'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'whisper' : 'recheck'
  }
  if (
    emotionalKernelBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    recollectionIntentBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = recollectionIntentBias.anthropomorphicRepairHold || continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : recollectionIntentBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    longHorizonBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = longHorizonBias.anthropomorphicRepairHold || continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : longHorizonBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    emotionalTensionBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = emotionalTensionBias.forceSilentObserve
      ? 'hover'
      : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    affectiveResidueBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    autobiographicalSelfBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = autobiographicalContinuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : autobiographicalSelfBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    selfEvolutionBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = continuitySettlingHold
      ? certaintyAllowsGentleContinueSurface
        ? 'hover'
        : 'recheck'
      : selfEvolutionBias.gentleContinue
        ? certaintyAllowsGentleContinueSurface
          ? 'whisper'
          : 'recheck'
        : input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (
    autobiographicalSelfBias.gentleContinue
    && !autobiographicalContinuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    selfEvolutionBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    recollectionIntentBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    recollectionIntentBias.residentQuietHold
    && selectedAction === 'recheck'
    && concern?.kind === 'unfinished-thread'
  ) {
    selectedAction = 'hover'
  }
  if (
    longHorizonBias.gentleContinue
    && !continuitySettlingHold
    && selectedAction === 'hover'
    && selectedProposal?.action === 'hover'
    && counterfactualOption?.action === 'speak'
    && concern?.kind === 'unfinished-thread'
    && concern?.status === 'active'
    && certaintyAllowsGentleContinueSurface
  ) {
    selectedAction = 'whisper'
    gentleContinueSurfacePromotion = true
  }
  if (
    personStateBias.preferLowerPressure
    && (selectedAction === 'speak' || selectedAction === 'whisper')
    && concern?.kind !== 'care-body'
  ) {
    selectedAction = input.worldModel.epistemicState.certainty === 'grounded' ? 'hover' : 'recheck'
  }
  if (groundedRepairCanStayVisibleHover({
    selectedAction,
    concern,
    selfEvolutionBias,
    affectiveResidueBias,
    emotionalTensionBias,
    worldModel: input.worldModel,
    context: input.context,
  })) {
    selectedAction = 'hover'
  }
  else if (groundedUnfinishedThreadCanStayVisibleHover({
    selectedAction,
    concern,
    selfEvolutionBias,
    affectiveResidueBias,
    emotionalTensionBias,
    worldModel: input.worldModel,
    context: input.context,
  })) {
    selectedAction = 'hover'
  }
  const selectedProposalWhy = sanitizeText(selectedProposal?.why, 260)
  const preferredProposalWhy = selectedProposalWhy || null

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
  const autobiographicalStyle = autobiographicalGoal?.kind === 'protect-rest-rhythm'
    ? (input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care')
    : autobiographicalGoal?.kind === 'grow-shared-language' && (stablePreferences?.playfulIntimacy ?? 0) >= 0.56
      ? 'light-nudge'
      : preferredStyle
  const preferredStyleFromMind = counterfactualOption?.style ?? autobiographicalStyle
  const cappedPreferredStyle: AlicizationProactiveStyle = habitPolicy?.suggestedStyleCap === 'silent-observe'
    ? 'silent-observe'
    : habitPolicy?.suggestedStyleCap === 'gentle-care' && preferredStyleFromMind === 'light-nudge'
      ? 'gentle-care'
      : habitPolicy?.suggestedStyleCap === 'firm-warning' && selectedAction === 'warn'
        ? 'firm-warning'
        : preferredStyleFromMind
  const preferredPresence = counterfactualOption?.embodiedPresence
    ?? (
      input.autobiographicalSelf?.personaDrift?.attachmentStyle === 'attuned' && (selectedAction === 'hover' || selectedAction === 'whisper')
        ? 'attentive'
        : input.autobiographicalSelf?.personaDrift?.attachmentStyle === 'guarded' && selectedAction === 'hover'
          ? 'hesitant'
          : fallbackPresence
    )
  const cappedPreferredPresence: AlicizationEmbodiedPresenceState = habitPolicy?.suggestedPresenceCap === 'concerned'
    ? selectedAction === 'warn' || selectedAction === 'speak' ? 'concerned' : preferredPresence
    : habitPolicy?.suggestedPresenceCap === 'hesitant' && preferredPresence === 'attentive'
      ? 'hesitant'
      : habitPolicy?.suggestedPresenceCap ?? preferredPresence
  const speakForwardDrive = counterfactualOptions
    .filter(option => option.action === 'whisper' || option.action === 'speak' || option.action === 'warn')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const silenceForwardDrive = counterfactualOptions
    .filter(option => option.action === 'wait' || option.action === 'hover' || option.action === 'recheck')
    .reduce((best, option) => Math.max(best, option.score), 0)
  const executiveSilenceBias = input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring' ? 0.12 : 0
  const executiveSurfaceBias = input.executiveCycle?.shouldAct ? 0.12 : 0
  const emotionalKernelForcedSilentObserve = emotionalKernelBias.forceSilentObserve
    && (
      emotionalKernelBias.protectRest
      || concern?.kind !== 'care-body'
    )
  const uncertaintyRepairHoldRequiresSilentObserve
    = selectedAction === 'recheck'
      && !certaintyAllowsGentleContinueSurface
      && concern?.kind !== 'care-body'
      && (
        recollectionIntentBias.anthropomorphicRepairHold
        || longHorizonBias.anthropomorphicRepairHold
        || autobiographicalContinuitySettlingHold
      )
  const nonCareConcern = concern?.kind !== 'care-body'
  const backgroundForceSilentObserve = (
    affectiveResidueBias.forceSilentObserve
  ) && nonCareConcern
  const forcedSilentObserve = backgroundForceSilentObserve
    || (autobiographicalSelfBias.forceSilentObserve && nonCareConcern)
    || emotionalKernelForcedSilentObserve
    || uncertaintyRepairHoldRequiresSilentObserve
    || (recollectionIntentBias.forceSilentObserve && nonCareConcern)
    || (longHorizonBias.forceSilentObserve && nonCareConcern)
    || (emotionalTensionBias.forceSilentObserve && nonCareConcern)
    || (personStateBias.preferLowerPressure && nonCareConcern)
  const finalPreferredStyle: AlicizationProactiveStyle = forcedSilentObserve
    ? 'silent-observe'
    : selectedAction === 'recheck'
      ? 'silent-observe'
      : (
          emotionalTensionBias.preferredStyle
          ?? emotionalKernelBias.preferredStyle
          ?? (
            gentleContinueSurfacePromotion
              ? normalizeProactiveStyle(counterfactualOption?.style, cappedPreferredStyle)
              : normalizeProactiveStyle(selectedProposal?.style, cappedPreferredStyle)
          )
        )
  const finalPreferredPresence: AlicizationEmbodiedPresenceState
    = emotionalTensionBias.preferredPresence
      ?? emotionalKernelBias.preferredPresence
      ?? (
        selectedAction === 'recheck'
          ? fallbackPresence
          : null
      )
      ?? (
        gentleContinueSurfacePromotion
          ? counterfactualOption?.embodiedPresence
          : selectedProposal?.embodiedPresence
      )
      ?? foregroundRuntimeThread?.suggestedPresence
      ?? cappedPreferredPresence
  const finalShouldSpeak = forcedSilentObserve
    ? false
    : input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring'
      ? governingProject?.kind === 'care-host' && (selectedAction === 'speak' || selectedAction === 'warn')
      : (
          (selectedAction !== 'whisper' && selectedAction !== 'speak' && selectedAction !== 'warn')
            ? false
            : gentleContinueSurfacePromotion
              ? (input.actionEcology?.shouldSpeak ?? (selectedAction === 'whisper' || selectedAction === 'speak' || selectedAction === 'warn'))
              : (selectedProposal?.shouldSpeak ?? input.actionEcology?.shouldSpeak ?? (selectedAction === 'whisper' || selectedAction === 'speak' || selectedAction === 'warn'))
        )
  const factualWhy = resolveInitiativeWhy([
    preferredProposalWhy,
    input.privateThought?.thoughtText,
    input.executiveCycle?.currentLine,
    activeReflection?.revision,
    asArray(motiveEngine?.backgroundAgendas)[0]?.summary,
    autobiographicalGoal?.summary,
    governingProject?.summary,
    thoughtThread?.summary,
    foregroundRuntimeThread?.summary,
    foregroundRuntimeThread?.whyHeld,
    concern?.summary,
    input.worldModel.activeThread?.summary,
  ])

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
    speakDrive: clamp01(Math.max(
      speakDrive
      + executiveSurfaceBias
      + (governingProject?.speakAffinity ?? 0) * 0.12
      + (motiveEngine?.drives.companionship ?? 0) * 0.06
      + (motiveEngine?.drives.restProtection ?? 0) * 0.08
      - (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.1 : 0)
      - (habitPolicy?.requiresGroundingBeforeSurface ? 0.08 : 0),
      speakForwardDrive ?? 0,
    )),
    silenceDrive: clamp01(Math.max(
      silenceDrive
      + executiveSilenceBias
      + (input.reflectionLedger?.revisionPressure ?? 0) * 0.08
      + (motiveEngine?.drives.boundaryRespect ?? 0) * 0.08
      + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0)
      + (habitPolicy?.prefersQuietCompanionship ? 0.08 : 0),
      silenceForwardDrive ?? 0,
    )),
    preferredStyle: finalPreferredStyle,
    preferredPresence: finalPreferredPresence,
    why: factualWhy,
    shouldSurface: selectedProposal?.shouldSurface
      ?? input.actionEcology?.shouldSurface
      ?? Boolean(counterfactualOption ? counterfactualOption.action !== 'wait' || preferredPresence !== 'none' : selectedAction !== 'wait'),
    shouldSpeak: finalShouldSpeak,
  }
}

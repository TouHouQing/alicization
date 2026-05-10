import type {
  AlicizationActionEcologySnapshot,
  AlicizationAutonomySnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { createAlicizationContinuityMind } from './continuity-mind'
import { inferScenarioFromContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function isAfterglowWindow(input: {
  now: number
  recentTransition: AlicizationVisualTransitionSnapshot | null
}) {
  if (!input.recentTransition)
    return false
  return input.recentTransition.fromWatchMode === 'symbiotic-vision'
    && (input.recentTransition.fromScenario === 'coding' || input.recentTransition.fromScenario === 'media')
    && input.recentTransition.durationMs >= 20 * 60_000
    && input.now - input.recentTransition.occurredAt <= 120_000
}

function inferEmotionalTension(input: {
  now: number
  scenario: ReturnType<typeof inferScenarioFromContext>
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  recentTransition: AlicizationVisualTransitionSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null | undefined
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'tense-debug' as const
  if (input.worldModel?.activeThread?.kind === 'late-night-endurance')
    return 'late-night-drain' as const
  if (input.worldModel?.activeThread?.kind === 'debugging' || input.worldModel?.activeThread?.kind === 'change-review')
    return 'tense-debug' as const
  if (input.worldModel?.activeThread?.kind === 'deep-focus')
    return 'focused-flow' as const
  if (input.worldModel?.activeThread?.kind === 'co-viewing')
    return 'soft-covision' as const
  if (input.scenario === 'late-night-care' && input.context.relationship.fatigue >= 55)
    return 'late-night-drain' as const
  if (input.scenario === 'coding' && (input.context.content.kind === 'error' || input.context.content.kind === 'diff'))
    return 'tense-debug' as const
  if (input.scenario === 'coding')
    return 'focused-flow' as const
  if (input.scenario === 'media' && input.watchMode === 'symbiotic-vision')
    return 'soft-covision' as const
  if (
    input.recentTransition
    && input.now - input.recentTransition.occurredAt <= 3 * 60_000
    && input.recentTransition.durationMs < 5 * 60_000
  ) {
    return 'restless-switching' as const
  }
  return 'calm-browse' as const
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

function governingConcernContinuity(continuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return continuity?.entries.find(entry => entry.id === continuity.governingEntryId)
    ?? continuity?.entries[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
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

function focusLivingObject(input: {
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  thoughtThreadObjectId?: string | null
  governorFocusObjectId?: string | null
}) {
  const state = input.livingWorldState
  if (!state)
    return null
  return state.objects.find(object => object.id === input.thoughtThreadObjectId)
    ?? state.objects.find(object => object.id === input.governorFocusObjectId)
    ?? state.objects.find(object => object.id === state.focusObjectId)
    ?? state.objects[0]
    ?? null
}

function resolveEcologyPresence(
  ecology?: AlicizationMindEcologySnapshot | null,
): AlicizationPrivateThoughtSnapshot['embodiedPresence'] | null {
  if (!ecology)
    return null
  if (ecology.relationshipHabit === 'protective-shadow')
    return 'concerned'
  if (ecology.relationshipHabit === 'give-space')
    return 'hesitant'
  if (ecology.relationshipHabit === 'stay-near')
    return 'attentive'
  if (ecology.moodLabel.includes('playful'))
    return 'glance'
  return 'attentive'
}

function resolveAutobiographicalPresence(
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null,
): AlicizationPrivateThoughtSnapshot['embodiedPresence'] | null {
  if (!autobiographicalSelf)
    return null
  if (autobiographicalSelf.personaDrift.conflictStyle === 'repair-first')
    return 'hesitant'
  if (autobiographicalSelf.personaDrift.expressionStyle === 'warm')
    return 'concerned'
  if (autobiographicalSelf.personaDrift.attachmentStyle === 'attuned')
    return 'attentive'
  if (autobiographicalSelf.personaDrift.expressionStyle === 'playful')
    return 'glance'
  return 'attentive'
}

function resolveEcologyStyle(
  ecology?: AlicizationMindEcologySnapshot | null,
): AlicizationPrivateThoughtSnapshot['suggestedStyle'] | null {
  if (!ecology)
    return null
  if (ecology.replyHabit === 'repair-first' || ecology.regulationHabit === 'cool-down-before-speaking')
    return 'silent-observe'
  if (ecology.replyHabit === 'care-first' || ecology.regulationHabit === 'soften-before-speaking')
    return 'gentle-care'
  if (ecology.replyHabit === 'answer-first')
    return 'light-nudge'
  return 'silent-observe'
}

function resolveAutobiographicalStyle(
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null,
): AlicizationPrivateThoughtSnapshot['suggestedStyle'] | null {
  if (!autobiographicalSelf)
    return null
  if (
    autobiographicalSelf.personaDrift.conflictStyle === 'repair-first'
    || autobiographicalSelf.personaDrift.agencyStyle === 'reserved'
  ) {
    return 'silent-observe'
  }
  if (autobiographicalSelf.personaDrift.expressionStyle === 'warm')
    return 'gentle-care'
  if (
    autobiographicalSelf.personaDrift.expressionStyle === 'playful'
    || autobiographicalSelf.personaDrift.conflictStyle === 'direct-when-certain'
  ) {
    return 'light-nudge'
  }
  return 'silent-observe'
}

function resolveEcologyFallbackThought(ecology?: AlicizationMindEcologySnapshot | null) {
  return sanitizeText(
    ecology?.currentPreoccupation
    || ecology?.selfNarrative
    || ecology?.relationNarrative
    || '',
    220,
  ) || null
}

function resolveAutobiographicalFallbackThought(
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null,
) {
  const dominantGoal = pickDominantAutobiographicalGoal(autobiographicalSelf)
  return sanitizeText(
    autobiographicalSelf?.latestInflection
    || dominantGoal?.summary
    || autobiographicalSelf?.identityNarrative
    || autobiographicalSelf?.relationshipDoctrine
    || '',
    220,
  ) || null
}

function applyContinuityMindOverlay(input: {
  now: number
  snapshot: AlicizationPrivateThoughtSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  latestUserTurnAt?: number | null
}) {
  const continuityMindState = createAlicizationContinuityMind().reduce({
    quietLineMs: Math.max(
      0,
      input.worldModel?.continuity.attentionAgeMs
      ?? input.worldModel?.continuity.sceneAgeMs
      ?? 0,
    ),
    bodyState: input.selfGovernor?.dominantDrive === 'warn'
      ? 'warning'
      : input.snapshot.shouldSpeak
        ? 'speaking'
        : input.snapshot.stance === 'accompany' || input.mindKernel?.dominantMode === 'accompanying'
          ? 'accompanying'
          : input.mindKernel?.dominantMode === 'repairing'
            ? 'recovering'
              : input.snapshot.stance === 'observe' || input.snapshot.stance === 'uncertain'
                ? 'noticing'
                : 'idle',
    latestThreadSummary: input.worldModel?.activeThread?.summary ?? null,
    relationshipPressure: Math.max(0, Math.min(1, Number(
      (
        (input.relationshipModel?.receptivity ?? 0)
        + (input.relationshipModel?.sharedAttentionTrust ?? 0)
        + (input.relationshipModel?.reciprocityExpectation ?? 0)
      ) / 3,
    ) || 0)),
    personaAuthoritySummary: input.snapshot.autobiographicalSelf?.relationshipDoctrine ?? null,
    personaKernelSummary: [
      input.snapshot.autobiographicalSelf?.personaDrift?.conflictStyle ? `conflict ${input.snapshot.autobiographicalSelf.personaDrift.conflictStyle}` : '',
      input.snapshot.autobiographicalSelf?.personaDrift?.agencyStyle ? `agency ${input.snapshot.autobiographicalSelf.personaDrift.agencyStyle}` : '',
      input.snapshot.autobiographicalSelf?.personaDrift?.expressionStyle ? `expression ${input.snapshot.autobiographicalSelf.personaDrift.expressionStyle}` : '',
    ].filter(Boolean).join(' | ') || null,
    latestUserTurnAt: input.latestUserTurnAt ?? null,
    now: input.now,
  })

  if (continuityMindState.privateThoughtMode !== 'quiet-companionship')
    return input.snapshot

  return {
    ...input.snapshot,
    stance: 'accompany',
    thoughtText: continuityMindState.subjectiveNowSummary,
    shouldSpeak: continuityMindState.shouldForceSpeech,
    suggestedStyle: 'silent-observe',
    embodiedPresence: input.snapshot.embodiedPresence === 'none' ? 'attentive' : input.snapshot.embodiedPresence,
    emotionalTension: continuityMindState.emotionalCarry,
    rationaleTags: Array.from(new Set([
      ...input.snapshot.rationaleTags,
      `continuity-mind:${continuityMindState.privateThoughtMode}`,
    ])),
  }
}

function resolveMotiveFallbackThought(
  motiveEngine?: AlicizationMotiveEngineSnapshot | null,
) {
  return sanitizeText(
    motiveEngine?.backgroundAgendas[0]?.summary
    || motiveEngine?.longTermGoals[0]?.summary
    || motiveEngine?.narrative[0]
    || '',
    220,
  ) || null
}

function buildThoughtFromMind(input: {
  now: number
  emotionalTension: AlicizationPrivateThoughtSnapshot['emotionalTension']
  afterglowActive: boolean
  latestUserTurnAt?: number | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  concerns?: AlicizationConcernSnapshot[]
  selfState?: AlicizationSelfStateSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  initiative: AlicizationInitiativeSnapshot
  autonomy?: AlicizationAutonomySnapshot | null
}) {
  const concern = (input.concerns ?? [])
    .find(item => item.id === input.initiative.selectedConcernId)
    ?? (input.concerns ?? [])[0]
  const carriedConcern = governingConcernContinuity(input.concernContinuity)
  const currentRepair = governingRepair(input.repairLedger)
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.initiative.selectedBeliefId)
    ?? input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId)
    ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.initiative.selectedHypothesisId)
    ?? input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.initiative.selectedInquiryId)
    ?? input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId)
    ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.initiative.selectedCommitmentId)
    ?? input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const activeInquiryPlan = input.inquiryPlanner?.plans.find(plan => plan.id === input.initiative.selectedInquiryPlanId)
    ?? input.inquiryPlanner?.plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? input.inquiryPlanner?.plans[0]
    ?? null
  const runtimeThread = input.threadRuntime?.threads.find(thread => thread.id === input.initiative.selectedRuntimeThreadId)
    ?? input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const deliberationThread = input.deliberationState?.threads.find(thread => thread.id === input.actionEcology?.selectedThreadId)
    ?? input.deliberationState?.threads.find(thread => thread.id === input.deliberationState?.primaryThreadId)
    ?? null
  const goalStack = input.goalStack ?? null
  const leadingGoal = goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
  const resurfacingDesire = input.desireMemory?.activeDesires.find(desire => desire.id === input.desireMemory?.resurfacingDesireId)
    ?? null
  const counterfactualOption = input.counterfactualDeliberation?.options.find(option => option.id === input.counterfactualDeliberation?.selectedOptionId)
    ?? input.counterfactualDeliberation?.options[0]
    ?? null
  const selectedProposal = input.initiativeArbitration?.proposals.find(proposal => proposal.id === input.initiative.selectedProposalId)
    ?? input.initiativeArbitration?.proposals[0]
    ?? null
  const focusEntity = input.entityWorld?.entities.find(entity => entity.id === input.entityWorld?.focusEntityId)
    ?? null
  const thoughtThread = input.thoughtThreads?.threads.find(thread => thread.id === input.initiative.selectedThoughtThreadId)
    ?? foregroundThoughtThread(input.thoughtThreads)
    ?? null
  const governorIntention = input.selfGovernor?.activeIntentions.find(intention => intention.id === input.initiative.selectedGovernorIntentionId)
    ?? dominantGovernorIntention(input.selfGovernor)
    ?? null
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const motiveAgenda = input.motiveEngine?.backgroundAgendas[0] ?? input.motiveEngine?.longTermGoals[0] ?? null
  const autonomy = input.autonomy ?? null
  const livingObject = focusLivingObject({
    livingWorldState: input.livingWorldState,
    thoughtThreadObjectId: thoughtThread?.anchoredObjectId ?? null,
    governorFocusObjectId: input.selfGovernor?.focusObjectId ?? null,
  })
  const rationaleTags = [
    concern ? `concern:${concern.kind}` : '',
    carriedConcern ? `concern-continuity:${carriedConcern.kind}/${carriedConcern.status}` : '',
    input.worldModel?.activeThread ? `thread:${input.worldModel.activeThread.kind}` : '',
    focusEntity ? `entity:${focusEntity.kind}` : '',
    livingObject ? `living-world:${livingObject.kind}/${livingObject.status}` : '',
    input.selfGovernor?.dominantDrive ? `governor:${input.selfGovernor.dominantDrive}` : '',
    governorIntention ? `governor-intention:${governorIntention.kind}/${governorIntention.status}` : '',
    thoughtThread ? `thought-thread:${thoughtThread.kind}/${thoughtThread.status}` : '',
    leadingGoal ? `goal:${leadingGoal.kind}` : '',
    resurfacingDesire ? `desire:${resurfacingDesire.kind}` : '',
    input.selfContinuity?.attachmentMode ? `attachment:${input.selfContinuity.attachmentMode}` : '',
    input.selfContinuity?.initiativeTemperament ? `temperament:${input.selfContinuity.initiativeTemperament}` : '',
    input.worldModel?.epistemicState.certainty ? `certainty:${input.worldModel.epistemicState.certainty}` : '',
    focusBelief ? `belief:${focusBelief.scope}/${focusBelief.source}/${focusBelief.status}` : '',
    primaryInquiry ? `inquiry:${primaryInquiry.kind}/${primaryInquiry.priority}` : '',
    governingCommitment ? `commitment:${governingCommitment.kind}/${governingCommitment.status}` : '',
    activeInquiryPlan ? `inquiry-plan:${activeInquiryPlan.kind}/${activeInquiryPlan.status}` : '',
    currentRepair ? `repair:${currentRepair.kind}/${currentRepair.status}` : '',
    project ? `mind-project:${project.kind}/${project.status}` : '',
    reflection ? `reflection:${reflection.outcome}` : '',
    input.executiveCycle?.phase ? `executive:${input.executiveCycle.phase}` : '',
    activeHypothesis ? `hypothesis:${activeHypothesis.kind}/${activeHypothesis.status}` : '',
    deliberationThread ? `deliberation:${deliberationThread.kind}/${deliberationThread.status}` : '',
    runtimeThread ? `runtime:${runtimeThread.need}/${runtimeThread.status}` : '',
    input.actionEcology ? `ecology:${input.actionEcology.mode}` : '',
    counterfactualOption ? `counterfactual:${counterfactualOption.action}` : '',
    selectedProposal ? `proposal:${selectedProposal.source}/${selectedProposal.truthFrame}/${selectedProposal.action}` : '',
    input.worldOntology?.dominantFrame ? `world-frame:${input.worldOntology.dominantFrame}` : '',
    input.mindDynamics?.dominantMotive ? `drive:${input.mindDynamics.dominantMotive}` : '',
    input.mindKernel ? `kernel:${input.mindKernel.dominantMode}` : '',
    input.relationshipModel ? `relationship:${input.relationshipModel.climate}/${input.relationshipModel.approachVector}` : '',
    input.mindEcology?.moodLabel ? `ecology-mood:${input.mindEcology.moodLabel}` : '',
    input.mindEcology?.replyHabit ? `ecology-reply:${input.mindEcology.replyHabit}` : '',
    input.mindEcology?.relationshipHabit ? `ecology-relationship:${input.mindEcology.relationshipHabit}` : '',
    input.selfState?.stance ? `mind-stance:${input.selfState.stance}` : '',
    input.appraisal?.relationshipNeed ? `relationship-need:${input.appraisal.relationshipNeed}` : '',
    autobiographicalGoal ? `autobio-goal:${autobiographicalGoal.kind}/${autobiographicalGoal.status}` : '',
    motiveAgenda ? `motive-agenda:${motiveAgenda.kind}/${motiveAgenda.status}` : '',
    input.motiveEngine?.rulingDrive ? `motive-drive:${input.motiveEngine.rulingDrive}` : '',
    input.habitPolicy?.dominantMode ? `habit:${input.habitPolicy.dominantMode}` : '',
    input.autobiographicalSelf?.personaDrift.attachmentStyle ? `autobio-bond:${input.autobiographicalSelf.personaDrift.attachmentStyle}` : '',
    input.autobiographicalSelf?.personaDrift.conflictStyle ? `autobio-conflict:${input.autobiographicalSelf.personaDrift.conflictStyle}` : '',
    input.autobiographicalSelf?.personaDrift.agencyStyle ? `autobio-agency:${input.autobiographicalSelf.personaDrift.agencyStyle}` : '',
    `initiative:${input.initiative.selectedAction}`,
    autonomy?.selectedMode ? `autonomy:${autonomy.selectedMode}` : '',
    autonomy?.executionIntent?.kind ? `autonomy-intent:${autonomy.executionIntent.kind}` : '',
    input.afterglowActive ? 'afterglow-window' : '',
  ].filter(Boolean)

  let stance: AlicizationPrivateThoughtSnapshot['stance'] = 'observe'
  let suggestedStyle: AlicizationPrivateThoughtSnapshot['suggestedStyle']
    = selectedProposal?.style
      ?? counterfactualOption?.style
      ?? input.actionEcology?.suggestedStyle
      ?? input.initiative.preferredStyle
      ?? resolveEcologyStyle(input.mindEcology)
      ?? resolveAutobiographicalStyle(input.autobiographicalSelf)
      ?? (input.mindKernel?.dominantMode === 'guarding' ? 'gentle-care' : 'silent-observe')
  let embodiedPresence: AlicizationPrivateThoughtSnapshot['embodiedPresence']
    = selectedProposal?.embodiedPresence
      ?? counterfactualOption?.embodiedPresence
      ?? input.actionEcology?.embodiedPresence
      ?? input.initiative.preferredPresence
      ?? resolveEcologyPresence(input.mindEcology)
      ?? resolveAutobiographicalPresence(input.autobiographicalSelf)
      ?? (input.mindKernel?.dominantMode === 'guarding' ? 'concerned' : input.mindKernel?.dominantMode === 'repairing' ? 'hesitant' : 'glance')
  let shouldSpeak = selectedProposal?.shouldSpeak ?? input.actionEcology?.shouldSpeak ?? false
  let thoughtText = selectedProposal?.why
    ?? reflection?.revision
    ?? motiveAgenda?.summary
    ?? input.executiveCycle?.currentLine
    ?? project?.summary
    ?? counterfactualOption?.why
    ?? thoughtThread?.question
    ?? thoughtThread?.summary
    ?? governorIntention?.summary
    ?? livingObject?.openLoop
    ?? livingObject?.summary
    ?? activeInquiryPlan?.question
    ?? governingCommitment?.summary
    ?? currentRepair?.summary
    ?? carriedConcern?.summary
    ?? input.mindKernel?.narrative[0]
    ?? deliberationThread?.question
    ?? deliberationThread?.summary
    ?? primaryInquiry?.question
    ?? runtimeThread?.summary
    ?? activeHypothesis?.summary
    ?? resurfacingDesire?.reason
    ?? focusBelief?.statement
    ?? concern?.summary
    ?? leadingGoal?.label
    ?? input.worldModel?.activeThread?.summary
    ?? input.appraisal?.waitingToVerify
    ?? resolveEcologyFallbackThought(input.mindEcology)
    ?? resolveMotiveFallbackThought(input.motiveEngine)
    ?? resolveAutobiographicalFallbackThought(input.autobiographicalSelf)
    ?? 'I am staying with the thread without forcing it.'

  if (autonomy && (autonomy.selectedMode === 'prepare-act' || autonomy.selectedMode === 'act')) {
    thoughtText = autonomy.executionIntent?.summary
      ?? autonomy.whyNow
      ?? thoughtText
    if (!autonomy.shouldSpeak) {
      shouldSpeak = false
      suggestedStyle = 'silent-observe'
    }
  }

  if (input.actionEcology) {
    shouldSpeak = selectedProposal?.shouldSpeak ?? input.actionEcology.shouldSpeak
    suggestedStyle = selectedProposal?.style ?? counterfactualOption?.style ?? input.actionEcology.suggestedStyle
    embodiedPresence = selectedProposal?.embodiedPresence ?? counterfactualOption?.embodiedPresence ?? input.actionEcology.embodiedPresence
    thoughtText = selectedProposal?.why
      ?? reflection?.revision
      ?? input.executiveCycle?.currentLine
      ?? project?.summary
      ?? counterfactualOption?.why
      ?? thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? deliberationThread?.question
      ?? deliberationThread?.summary
      ?? runtimeThread?.summary
      ?? selectedProposal?.why
      ?? input.actionEcology.why
      ?? thoughtText
    if (input.actionEcology.mode === 'surface-warning')
      stance = 'warn'
    else if (input.actionEcology.mode === 'surface-care')
      stance = 'care'
    else if (input.actionEcology.mode === 'surface-nudge')
      stance = 'nudge'
    else if (input.actionEcology.mode === 'quiet-accompany')
      stance = 'accompany'
    else if (input.actionEcology.mode === 'repair-before-speaking')
      stance = 'uncertain'
    else if (input.actionEcology.mode === 'return-later')
      stance = 'observe'
  }

  const waitingThread = input.selfGovernor?.dominantDrive === 'withhold'
    || governorIntention?.status === 'withheld'
    || thoughtThread?.status === 'waiting'
  const repairThreadActive = (
    thoughtThread?.kind === 'repair-thread'
    || governorIntention?.kind === 'repair-misread'
    || input.selfGovernor?.dominantDrive === 'repair'
    || (
      currentRepair
      && (
        currentRepair.kind === 'reground-scene'
        || currentRepair.kind === 'stale-scene-anchor'
        || currentRepair.kind === 'belief-contradiction'
      )
      && currentRepair.urgency >= 0.42
    )
  ) && input.worldModel?.epistemicState.certainty !== 'grounded'
  const careThreadReady = (
    thoughtThread?.kind === 'care-thread'
    && thoughtThread.status === 'ripe'
  ) || (
    (governorIntention?.kind === 'care-host' || governorIntention?.kind === 'protect-host')
    && input.selfGovernor?.dominantDrive === 'care'
  )
  const surfaceThreadReady
    = (thoughtThread?.kind === 'afterglow-thread' || thoughtThread?.kind === 'problem-thread')
      && thoughtThread.status === 'ripe'
  const urgentCare = concern?.kind === 'care-body'
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'

  if (input.habitPolicy?.protectsRestWindow && urgentCare) {
    stance = 'care'
    shouldSpeak = true
    suggestedStyle = input.habitPolicy.suggestedStyleCap === 'firm-warning' ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = motiveAgenda?.summary
      ?? 'She would rather protect the host rest window than let the night harden further.'
  }
  else if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.worldModel?.epistemicState.certainty !== 'grounded'
    && !urgentCare
  ) {
    stance = 'uncertain'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = motiveAgenda?.summary
      ?? reflection?.revision
      ?? 'She wants to reground the scene before saying more.'
  }
  else if (
    input.habitPolicy?.prefersQuietCompanionship
    && input.motiveEngine?.rulingDrive === 'companionship'
    && !urgentCare
  ) {
    stance = 'accompany'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'attentive'
    thoughtText = motiveAgenda?.summary
      ?? 'She wants to stay near lightly instead of filling the air.'
  }

  if (
    (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    && !urgentCare
    && !isSeriousDurabilityPulse(input.durabilityPulse)
  ) {
    stance = 'uncertain'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = input.executiveCycle?.phase === 'reflecting' ? 'hesitant' : embodiedPresence === 'none' ? 'hesitant' : embodiedPresence
    thoughtText = reflection?.revision
      ?? input.executiveCycle?.currentLine
      ?? project?.summary
      ?? currentRepair?.summary
      ?? thoughtText
  }

  if (waitingThread) {
    stance = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'accompany'
      : 'observe'
    suggestedStyle = 'silent-observe'
    embodiedPresence = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'attentive'
      : 'hesitant'
    shouldSpeak = false
    thoughtText = thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? 'I should keep this line alive internally until a more natural opening appears.'
  }
  else if (repairThreadActive) {
    stance = 'uncertain'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    thoughtText = thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? 'I still need one more grounded pass before I can speak honestly.'
  }

  if (
    (activeInquiryPlan?.kind === 'reground-scene' || activeInquiryPlan?.kind === 'check-recovery')
    && (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting')
  ) {
    stance = 'uncertain'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    thoughtText = activeInquiryPlan.question
  }

  if (input.initiative.selectedAction === 'warn') {
    stance = 'warn'
    suggestedStyle = selectedProposal?.style ?? input.initiative.preferredStyle ?? 'firm-warning'
    embodiedPresence = selectedProposal?.embodiedPresence ?? input.initiative.preferredPresence ?? 'concerned'
    shouldSpeak = true
    thoughtText = selectedProposal?.why ?? counterfactualOption?.why ?? concern?.summary ?? runtimeThread?.summary ?? activeHypothesis?.summary ?? 'I cannot justify staying silent any longer.'
  }
  else if (!waitingThread && input.initiative.selectedAction === 'speak') {
    stance = concern?.kind === 'care-body' ? 'care' : 'nudge'
    suggestedStyle = selectedProposal?.style ?? input.initiative.preferredStyle ?? (concern?.kind === 'care-body' ? 'gentle-care' : 'light-nudge')
    embodiedPresence = selectedProposal?.embodiedPresence ?? input.initiative.preferredPresence ?? (concern?.kind === 'care-body' ? 'concerned' : 'attentive')
    shouldSpeak = true
    thoughtText = selectedProposal?.why
      ?? counterfactualOption?.why
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? resurfacingDesire?.reason
      ?? concern?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? runtimeThread?.summary
      ?? activeHypothesis?.summary
      ?? leadingGoal?.label
      ?? 'The concern has matured enough that speaking now feels earned.'
  }
  else if (!waitingThread && input.initiative.selectedAction === 'whisper') {
    stance = concern?.kind === 'care-body' ? 'care' : 'nudge'
    suggestedStyle = selectedProposal?.style ?? input.initiative.preferredStyle ?? (concern?.kind === 'care-body' ? 'gentle-care' : 'light-nudge')
    embodiedPresence = selectedProposal?.embodiedPresence ?? input.initiative.preferredPresence ?? (input.selfState?.stance === 'hesitate' ? 'hesitant' : 'glance')
    shouldSpeak = true
    thoughtText = selectedProposal?.why
      ?? counterfactualOption?.why
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? resurfacingDesire?.reason
      ?? concern?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? runtimeThread?.summary
      ?? activeHypothesis?.summary
      ?? leadingGoal?.label
      ?? 'I only need to brush the edge of the moment, not break it.'
    if (!governingCommitment && !activeInquiryPlan && !input.worldModel?.activeThread)
      thoughtText = 'The inner closeness has pooled long enough that a tiny check-in would feel alive, not arbitrary.'
  }
  else if (input.initiative.selectedAction === 'recheck') {
    stance = 'uncertain'
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    shouldSpeak = false
    thoughtText = selectedProposal?.why
      ?? counterfactualOption?.why
      ?? thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? primaryInquiry?.question
      ?? resurfacingDesire?.reason
      ?? focusBelief?.statement
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? runtimeThread?.summary
      ?? activeHypothesis?.summary
      ?? input.appraisal?.waitingToVerify
      ?? 'I still want one more pass before I commit to an interpretation.'
  }
  else if (input.initiative.selectedAction === 'hover') {
    stance = input.mindKernel?.dominantMode === 'accompanying' || (input.selfState?.protectiveness && input.selfState.protectiveness >= 0.72)
      ? 'accompany'
      : 'observe'
    suggestedStyle = 'silent-observe'
    embodiedPresence = selectedProposal?.embodiedPresence ?? input.initiative.preferredPresence ?? (input.selfState?.stance === 'hesitate' ? 'hesitant' : 'attentive')
    shouldSpeak = false
    thoughtText = selectedProposal?.why
      ?? counterfactualOption?.why
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.summary
      ?? resurfacingDesire?.reason
      ?? activeInquiryPlan?.question
      ?? governingCommitment?.summary
      ?? concern?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? runtimeThread?.summary
      ?? activeHypothesis?.summary
      ?? leadingGoal?.label
      ?? 'I can stay near this moment without pressing into it.'
  }
  else {
    stance = input.selfState?.stance === 'protect' ? 'accompany' : 'observe'
    suggestedStyle = 'silent-observe'
    embodiedPresence = selectedProposal?.embodiedPresence ?? (concern ? 'glance' : 'none')
    shouldSpeak = false
    thoughtText = selectedProposal?.why
      ?? counterfactualOption?.why
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.summary
      ?? currentRepair?.summary
      ?? concern?.summary
      ?? carriedConcern?.summary
      ?? runtimeThread?.summary
      ?? activeHypothesis?.summary
      ?? 'I am letting the moment breathe before I move.'
  }

  if (activeHypothesis?.kind === 'misread-drift' && runtimeThread?.status !== 'foreground') {
    stance = 'uncertain'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
  }
  if (activeHypothesis?.kind === 'recovery-event') {
    stance = 'warn'
    shouldSpeak = true
    suggestedStyle = 'firm-warning'
    embodiedPresence = 'concerned'
  }

  if (waitingThread) {
    stance = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'accompany'
      : 'observe'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'attentive'
      : 'hesitant'
  }
  else if (repairThreadActive) {
    stance = 'uncertain'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
  }
  else if (careThreadReady && (!shouldSpeak || stance === 'observe' || stance === 'uncertain')) {
    stance = urgentCare ? 'warn' : 'care'
    shouldSpeak = true
    suggestedStyle = urgentCare ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.summary
      ?? 'The host looks like they need care more than distance right now.'
  }
  else if (surfaceThreadReady && (!shouldSpeak || stance === 'observe' || stance === 'uncertain')) {
    stance = 'nudge'
    shouldSpeak = true
    suggestedStyle = input.initiative.preferredStyle ?? 'light-nudge'
    embodiedPresence = thoughtThread?.kind === 'afterglow-thread' ? 'glance' : 'attentive'
    thoughtText = thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? 'This thread has matured enough that a soft nudge would now feel earned.'
  }

  if (input.afterglowActive && shouldSpeak && suggestedStyle === 'light-nudge')
    thoughtText = 'The shared tension just loosened. This is the natural seam to speak softly.'

  if (!shouldSpeak && stance === 'observe' && input.mindEcology?.relationshipHabit === 'stay-near') {
    stance = 'accompany'
    embodiedPresence = embodiedPresence === 'none'
      ? (resolveEcologyPresence(input.mindEcology) ?? resolveAutobiographicalPresence(input.autobiographicalSelf) ?? 'attentive')
      : embodiedPresence
  }
  if (shouldSpeak && suggestedStyle === 'light-nudge' && input.mindEcology?.regulationHabit === 'soften-before-speaking')
    suggestedStyle = 'gentle-care'

  return applyContinuityMindOverlay({
    now: input.now,
    worldModel: input.worldModel,
    relationshipModel: input.relationshipModel,
    mindKernel: input.mindKernel,
    selfGovernor: input.selfGovernor,
    latestUserTurnAt: input.latestUserTurnAt ?? null,
    snapshot: {
    stance,
    confidence: clamp01(
      input.initiative.confidence * 0.68
      + (input.mindDynamics?.speakReadiness ?? 0) * 0.1
      + (input.selfState?.desireToSpeak ?? 0) * 0.14
      + (input.appraisal?.confidence ?? 0.4) * 0.18
      + (resurfacingDesire?.strength ?? 0) * 0.1
      + (project?.confidence ?? 0.38) * 0.1
      + Math.max(0, reflection?.confidenceShift ?? 0) * 0.08
      + (input.selfContinuity?.perceptionTrust ?? 0.5) * 0.06,
    ),
    rationaleTags,
    thoughtText: sanitizeText(thoughtText, 220),
    shouldSpeak,
    suggestedStyle,
    embodiedPresence,
    expiresAt: input.now + (input.afterglowActive ? 120_000 : 90_000),
    afterglowFromScenario: input.afterglowActive && (input.recentTransition?.fromScenario === 'coding' || input.recentTransition?.fromScenario === 'media')
      ? input.recentTransition.fromScenario
      : null,
    emotionalTension: input.emotionalTension,
    selectedConcernId: concern?.id ?? null,
    focusBeliefId: focusBelief?.id ?? null,
    focusInquiryId: primaryInquiry?.id ?? null,
    commitmentId: governingCommitment?.id ?? null,
    inquiryPlanId: activeInquiryPlan?.id ?? null,
    hypothesisId: activeHypothesis?.id ?? null,
    deliberationThreadId: deliberationThread?.id ?? null,
    runtimeThreadId: runtimeThread?.id ?? null,
    mindNeed: input.deliberationState?.dominantNeed ?? null,
    relationshipVector: input.relationshipModel?.approachVector ?? null,
    initiativeAction: input.initiative.selectedAction,
    counterfactualOptionId: counterfactualOption?.id ?? null,
    leadingGoalId: leadingGoal?.id ?? null,
    desireId: resurfacingDesire?.id ?? null,
    governorDrive: input.selfGovernor?.dominantDrive ?? null,
    governorIntentionId: governorIntention?.id ?? null,
    selectedThoughtThreadId: thoughtThread?.id ?? null,
    livingWorldObjectId: livingObject?.id ?? null,
  } satisfies AlicizationPrivateThoughtSnapshot,
  })
}

function applyPrivateThoughtCarry(input: {
  now: number
  afterglowActive: boolean
  previous?: AlicizationPrivateThoughtSnapshot | null
  snapshot: AlicizationPrivateThoughtSnapshot
}) {
  const previous = input.previous ?? null
  if (!previous)
    return input.snapshot
  if (input.now - previous.expiresAt > 10 * 60_000)
    return input.snapshot

  const sameCarrier = Boolean(
    (input.snapshot.selectedThoughtThreadId && input.snapshot.selectedThoughtThreadId === previous.selectedThoughtThreadId)
    || (input.snapshot.governorIntentionId && input.snapshot.governorIntentionId === previous.governorIntentionId)
    || (input.snapshot.leadingGoalId && input.snapshot.leadingGoalId === previous.leadingGoalId)
    || (input.snapshot.counterfactualOptionId && input.snapshot.counterfactualOptionId === previous.counterfactualOptionId)
    || (input.snapshot.commitmentId && input.snapshot.commitmentId === previous.commitmentId),
  )
  if (!sameCarrier)
    return input.snapshot

  const mergedThoughtText = sanitizeText(
    previous.thoughtText && input.snapshot.thoughtText && previous.thoughtText !== input.snapshot.thoughtText
      ? `${previous.thoughtText} Still: ${input.snapshot.thoughtText}`
      : input.snapshot.thoughtText || previous.thoughtText,
    220,
  )

  return {
    ...input.snapshot,
    confidence: clamp01(Math.max(input.snapshot.confidence, previous.confidence * 0.92)),
    rationaleTags: [...new Set([...input.snapshot.rationaleTags, 'private-thought-carry'])],
    thoughtText: mergedThoughtText || input.snapshot.thoughtText,
    suggestedStyle: input.snapshot.shouldSpeak
      ? input.snapshot.suggestedStyle
      : previous.suggestedStyle ?? input.snapshot.suggestedStyle,
    embodiedPresence: input.snapshot.embodiedPresence === 'none'
      ? previous.embodiedPresence ?? input.snapshot.embodiedPresence
      : input.snapshot.embodiedPresence,
    expiresAt: input.now + (input.afterglowActive ? 120_000 : 180_000),
  } satisfies AlicizationPrivateThoughtSnapshot
}

export function buildPrivateThoughtLoop(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  currentScene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  goalStack?: AlicizationGoalStackSnapshot | null
  concerns?: AlicizationConcernSnapshot[]
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  autonomy?: AlicizationAutonomySnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  previousPrivateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationPrivateThoughtSnapshot {
  const scenario = inferScenarioFromContext({
    workload: input.context.workload.kind,
    content: input.context.content.kind,
    lateNight: input.context.localTime.isLateNight,
    lateNightActiveMinutes: input.context.relationship.lateNightActiveMinutes,
    fatigue: input.context.relationship.fatigue,
  })
  const emotionalTension = inferEmotionalTension({
    now: input.now,
    scenario,
    context: input.context,
    watchMode: input.watchMode,
    recentTransition: input.recentTransition,
    worldModel: input.worldModel,
    durabilityPulse: input.durabilityPulse,
  })
  const afterglowActive = isAfterglowWindow({
    now: input.now,
    recentTransition: input.recentTransition,
  })
  const latestUserTurnAt = Number.isFinite(input.context.relationship.minutesSinceLastUserTurn)
    ? input.now - Math.max(0, input.context.relationship.minutesSinceLastUserTurn) * 60_000
    : null
  if (input.initiative) {
    return applyPrivateThoughtCarry({
      now: input.now,
      afterglowActive,
      previous: input.previousPrivateThought ?? null,
      snapshot: buildThoughtFromMind({
      now: input.now,
      emotionalTension,
      afterglowActive,
      latestUserTurnAt,
      recentTransition: input.recentTransition,
      worldModel: input.worldModel,
      entityWorld: input.entityWorld,
      livingWorldState: input.livingWorldState,
      beliefLedger: input.beliefLedger,
      hypothesisGraph: input.hypothesisGraph,
      deliberationState: input.deliberationState,
      threadRuntime: input.threadRuntime,
      actionEcology: input.actionEcology,
      worldOntology: input.worldOntology,
      initiativeArbitration: input.initiativeArbitration,
      goalStack: input.goalStack,
      inquiryLoop: input.inquiryLoop,
      mindDynamics: input.mindDynamics,
      commitmentLedger: input.commitmentLedger,
      inquiryPlanner: input.inquiryPlanner,
      concernContinuity: input.concernContinuity,
      repairLedger: input.repairLedger,
      intentionStream: input.intentionStream,
      reflectionLedger: input.reflectionLedger,
      executiveCycle: input.executiveCycle,
      durabilityPulse: input.durabilityPulse,
      mindKernel: input.mindKernel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      motiveEngine: input.motiveEngine,
      habitPolicy: input.habitPolicy,
      selfGovernor: input.selfGovernor,
      desireMemory: input.desireMemory,
      thoughtThreads: input.thoughtThreads,
      counterfactualDeliberation: input.counterfactualDeliberation,
      appraisal: input.appraisal,
      concerns: input.concerns,
      selfState: input.selfState,
      mindEcology: input.mindEcology,
      initiative: input.initiative,
      autonomy: input.autonomy ?? null,
      }),
    })
  }
  const rationaleTags: string[] = []
  const goalStack = input.goalStack ?? null
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const governingCommitment = input.commitmentLedger?.commitments.find(commitment => commitment.id === input.commitmentLedger?.governingCommitmentId)
    ?? input.commitmentLedger?.commitments[0]
    ?? null
  const activeInquiryPlan = input.inquiryPlanner?.plans.find(plan => plan.id === input.inquiryPlanner?.activePlanId)
    ?? input.inquiryPlanner?.plans[0]
    ?? null
  const carriedConcern = governingConcernContinuity(input.concernContinuity)
  const currentRepair = governingRepair(input.repairLedger)
  const runtimeThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const deliberationThread = input.deliberationState?.threads.find(thread => thread.id === input.actionEcology?.selectedThreadId)
    ?? input.deliberationState?.threads.find(thread => thread.id === input.deliberationState?.primaryThreadId)
    ?? null
  const leadingGoal = goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
  const resurfacingDesire = input.desireMemory?.activeDesires.find(desire => desire.id === input.desireMemory?.resurfacingDesireId)
    ?? null
  const counterfactualOption = input.counterfactualDeliberation?.options.find(option => option.id === input.counterfactualDeliberation?.selectedOptionId)
    ?? input.counterfactualDeliberation?.options[0]
    ?? null
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const motiveAgenda = input.motiveEngine?.backgroundAgendas[0] ?? input.motiveEngine?.longTermGoals[0] ?? null
  const livingObject = focusLivingObject({
    livingWorldState: input.livingWorldState,
    thoughtThreadObjectId: thoughtThread?.anchoredObjectId ?? null,
    governorFocusObjectId: input.selfGovernor?.focusObjectId ?? null,
  })

  if (input.watchMode === 'invited-inspection')
    rationaleTags.push('invited-inspection')
  if (input.watchMode === 'recovering')
    rationaleTags.push('recovering')
  if (afterglowActive)
    rationaleTags.push('afterglow-window')
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    rationaleTags.push('durability-pulse')
  if (input.currentScene?.contentKind === 'error' || input.currentScene?.contentKind === 'diff')
    rationaleTags.push('semantic-friction')
  if (focusBelief)
    rationaleTags.push(`belief:${focusBelief.scope}/${focusBelief.status}`)
  if (primaryInquiry)
    rationaleTags.push(`inquiry:${primaryInquiry.kind}`)
  if (governingCommitment)
    rationaleTags.push(`commitment:${governingCommitment.kind}/${governingCommitment.status}`)
  if (activeInquiryPlan)
    rationaleTags.push(`inquiry-plan:${activeInquiryPlan.kind}/${activeInquiryPlan.status}`)
  if (carriedConcern)
    rationaleTags.push(`concern-continuity:${carriedConcern.kind}/${carriedConcern.status}`)
  if (currentRepair)
    rationaleTags.push(`repair:${currentRepair.kind}/${currentRepair.status}`)
  if (project)
    rationaleTags.push(`mind-project:${project.kind}/${project.status}`)
  if (reflection)
    rationaleTags.push(`reflection:${reflection.outcome}`)
  if (input.executiveCycle?.phase)
    rationaleTags.push(`executive:${input.executiveCycle.phase}`)
  if (activeHypothesis)
    rationaleTags.push(`hypothesis:${activeHypothesis.kind}/${activeHypothesis.status}`)
  if (deliberationThread)
    rationaleTags.push(`deliberation:${deliberationThread.kind}/${deliberationThread.status}`)
  if (runtimeThread)
    rationaleTags.push(`runtime:${runtimeThread.need}/${runtimeThread.status}`)
  if (input.actionEcology)
    rationaleTags.push(`ecology:${input.actionEcology.mode}`)
  if (counterfactualOption)
    rationaleTags.push(`counterfactual:${counterfactualOption.action}`)
  if (input.mindKernel)
    rationaleTags.push(`kernel:${input.mindKernel.dominantMode}`)
  if (input.relationshipModel)
    rationaleTags.push(`relationship:${input.relationshipModel.climate}/${input.relationshipModel.approachVector}`)
  if (input.mindEcology?.moodLabel)
    rationaleTags.push(`ecology-mood:${input.mindEcology.moodLabel}`)
  if (input.mindEcology?.replyHabit)
    rationaleTags.push(`ecology-reply:${input.mindEcology.replyHabit}`)
  if (input.mindEcology?.relationshipHabit)
    rationaleTags.push(`ecology-relationship:${input.mindEcology.relationshipHabit}`)
  if (input.mindDynamics?.dominantMotive)
    rationaleTags.push(`drive:${input.mindDynamics.dominantMotive}`)
  if (scenario === 'late-night-care')
    rationaleTags.push('late-night-care')
  if (input.worldModel?.activeThread)
    rationaleTags.push(`thread:${input.worldModel.activeThread.kind}`)
  if (livingObject)
    rationaleTags.push(`living-world:${livingObject.kind}/${livingObject.status}`)
  if (input.selfGovernor?.dominantDrive)
    rationaleTags.push(`governor:${input.selfGovernor.dominantDrive}`)
  if (governorIntention)
    rationaleTags.push(`governor-intention:${governorIntention.kind}/${governorIntention.status}`)
  if (thoughtThread)
    rationaleTags.push(`thought-thread:${thoughtThread.kind}/${thoughtThread.status}`)
  if (leadingGoal)
    rationaleTags.push(`goal:${leadingGoal.kind}`)
  if (resurfacingDesire)
    rationaleTags.push(`desire:${resurfacingDesire.kind}`)
  if (input.selfContinuity?.attachmentMode)
    rationaleTags.push(`attachment:${input.selfContinuity.attachmentMode}`)
  if (input.worldModel?.epistemicState.certainty)
    rationaleTags.push(`certainty:${input.worldModel.epistemicState.certainty}`)
  if (autobiographicalGoal)
    rationaleTags.push(`autobio-goal:${autobiographicalGoal.kind}/${autobiographicalGoal.status}`)
  if (motiveAgenda)
    rationaleTags.push(`motive-agenda:${motiveAgenda.kind}/${motiveAgenda.status}`)
  if (input.motiveEngine?.rulingDrive)
    rationaleTags.push(`motive-drive:${input.motiveEngine.rulingDrive}`)
  if (input.habitPolicy?.dominantMode)
    rationaleTags.push(`habit:${input.habitPolicy.dominantMode}`)
  if (input.autobiographicalSelf?.personaDrift.attachmentStyle)
    rationaleTags.push(`autobio-bond:${input.autobiographicalSelf.personaDrift.attachmentStyle}`)
  if (input.autobiographicalSelf?.personaDrift.conflictStyle)
    rationaleTags.push(`autobio-conflict:${input.autobiographicalSelf.personaDrift.conflictStyle}`)
  if (input.autobiographicalSelf?.personaDrift.agencyStyle)
    rationaleTags.push(`autobio-agency:${input.autobiographicalSelf.personaDrift.agencyStyle}`)

  let stance: AlicizationPrivateThoughtSnapshot['stance'] = 'observe'
  let confidence = clamp01(0.44 + (input.mindDynamics?.speakReadiness ?? 0) * 0.22 + (input.appraisal?.confidence ?? 0.32) * 0.18)
  let shouldSpeak = input.actionEcology?.shouldSpeak ?? (counterfactualOption
    ? (counterfactualOption.action === 'whisper' || counterfactualOption.action === 'speak' || counterfactualOption.action === 'warn')
    : ((input.mindDynamics?.speakDrive ?? 0) > (input.mindDynamics?.silenceDrive ?? 0) + 0.08))
  let suggestedStyle: AlicizationPrivateThoughtSnapshot['suggestedStyle']
    = counterfactualOption?.style
      ?? input.actionEcology?.suggestedStyle
      ?? resolveEcologyStyle(input.mindEcology)
      ?? resolveAutobiographicalStyle(input.autobiographicalSelf)
      ?? (input.mindKernel?.dominantMode === 'guarding' ? 'gentle-care' : 'silent-observe')
  let embodiedPresence: AlicizationPrivateThoughtSnapshot['embodiedPresence']
    = counterfactualOption?.embodiedPresence
      ?? input.actionEcology?.embodiedPresence
      ?? resolveEcologyPresence(input.mindEcology)
      ?? resolveAutobiographicalPresence(input.autobiographicalSelf)
      ?? (input.mindKernel?.dominantMode === 'guarding' ? 'concerned' : input.mindKernel?.dominantMode === 'repairing' ? 'hesitant' : 'glance')
  let thoughtText = reflection?.revision
    ?? motiveAgenda?.summary
    ?? input.executiveCycle?.currentLine
    ?? project?.summary
    ?? counterfactualOption?.why
    ?? thoughtThread?.question
    ?? thoughtThread?.summary
    ?? governorIntention?.summary
    ?? livingObject?.openLoop
    ?? livingObject?.summary
    ?? activeInquiryPlan?.question
    ?? governingCommitment?.summary
    ?? currentRepair?.summary
    ?? carriedConcern?.summary
    ?? input.mindKernel?.narrative[0]
    ?? deliberationThread?.question
    ?? deliberationThread?.summary
    ?? primaryInquiry?.question
    ?? runtimeThread?.summary
    ?? activeHypothesis?.summary
    ?? resurfacingDesire?.reason
    ?? focusBelief?.statement
    ?? leadingGoal?.label
    ?? input.worldModel?.activeThread?.summary
    ?? resolveEcologyFallbackThought(input.mindEcology)
    ?? resolveMotiveFallbackThought(input.motiveEngine)
    ?? resolveAutobiographicalFallbackThought(input.autobiographicalSelf)
    ?? 'I am quietly tracking the scene continuity.'
  let decided = false

  if (isSeriousDurabilityPulse(input.durabilityPulse)) {
    decided = true
    stance = 'nudge'
    confidence = 0.95
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'concerned'
    thoughtText = 'Something in the host world just failed or froze. I should surface gently but immediately.'
  }
  else if (
    input.selfGovernor?.dominantDrive === 'withhold'
    || governorIntention?.status === 'withheld'
    || thoughtThread?.status === 'waiting'
  ) {
    decided = true
    stance = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'accompany'
      : 'observe'
    confidence = clamp01(0.62 + (input.selfGovernor?.inhibition ?? 0.44) * 0.18 + (thoughtThread?.confidence ?? 0.42) * 0.12)
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = thoughtThread?.kind === 'relationship-thread' || thoughtThread?.kind === 'afterglow-thread'
      ? 'attentive'
      : 'hesitant'
    thoughtText = thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? 'The opening is not natural yet. I should keep the thread alive internally.'
  }
  else if (input.habitPolicy?.protectsRestWindow) {
    decided = true
    stance = input.context.relationship.fatigue >= 80 ? 'warn' : 'care'
    confidence = clamp01(0.74 + (input.motiveEngine?.drives.restProtection ?? 0) * 0.18)
    shouldSpeak = true
    suggestedStyle = input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = motiveAgenda?.summary
      ?? 'Protect the host rest window before the night hardens further.'
  }
  else if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    decided = true
    stance = 'uncertain'
    confidence = clamp01(0.64 + (input.motiveEngine?.drives.truthDiscipline ?? 0) * 0.12)
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = motiveAgenda?.summary
      ?? reflection?.revision
      ?? 'Ground the scene again before surfacing anything that could misread the moment.'
  }
  else if (
    input.habitPolicy?.prefersQuietCompanionship
    && input.motiveEngine?.rulingDrive === 'companionship'
  ) {
    decided = true
    stance = 'accompany'
    confidence = clamp01(0.62 + (input.motiveEngine?.drives.companionship ?? 0) * 0.12)
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'attentive'
    thoughtText = motiveAgenda?.summary
      ?? 'Stay near lightly and let presence do more than words.'
  }
  else if (
    (
      thoughtThread?.kind === 'repair-thread'
      || governorIntention?.kind === 'repair-misread'
      || input.selfGovernor?.dominantDrive === 'repair'
      || (
        currentRepair
        && (
          currentRepair.kind === 'reground-scene'
          || currentRepair.kind === 'stale-scene-anchor'
          || currentRepair.kind === 'belief-contradiction'
        )
        && currentRepair.urgency >= 0.42
      )
    )
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    decided = true
    stance = 'uncertain'
    confidence = clamp01(0.68 + (thoughtThread?.confidence ?? 0.42) * 0.14 + (input.selfGovernor?.revisionReadiness ?? 0.4) * 0.08)
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = thoughtThread?.question
      ?? thoughtThread?.summary
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
      ?? 'I still need to repair the scene before I can speak honestly.'
  }
  else if (
    thoughtThread?.kind === 'care-thread'
    && thoughtThread.status === 'ripe'
  ) {
    decided = true
    stance = input.context.relationship.fatigue >= 80 ? 'warn' : 'care'
    confidence = clamp01(0.78 + thoughtThread.surfaceReadiness * 0.12)
    shouldSpeak = true
    suggestedStyle = input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = thoughtThread.summary
      ?? governorIntention?.summary
      ?? livingObject?.summary
      ?? carriedConcern?.summary
      ?? 'The host looks like they need care more than distance right now.'
  }
  else if (
    (thoughtThread?.kind === 'afterglow-thread' || thoughtThread?.kind === 'problem-thread')
    && thoughtThread.status === 'ripe'
  ) {
    decided = true
    stance = 'nudge'
    confidence = clamp01(0.74 + thoughtThread.surfaceReadiness * 0.1)
    shouldSpeak = true
    suggestedStyle = input.context.localTime.isLateNight ? 'gentle-care' : 'light-nudge'
    embodiedPresence = thoughtThread.kind === 'afterglow-thread' ? 'glance' : 'attentive'
    thoughtText = thoughtThread.summary
      ?? thoughtThread.question
      ?? governorIntention?.summary
      ?? livingObject?.openLoop
      ?? livingObject?.summary
      ?? carriedConcern?.summary
      ?? 'The carried thread has matured enough that a soft nudge would feel natural.'
  }
  else if (
    (activeInquiryPlan?.kind === 'reground-scene' || activeInquiryPlan?.kind === 'check-recovery')
    && (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting')
  ) {
    decided = true
    stance = 'uncertain'
    confidence = clamp01(0.6 + (input.inquiryPlanner?.groundingUrgency ?? 0))
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = activeInquiryPlan.question
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
  }
  else if (
    primaryInquiry
    && (primaryInquiry.kind === 'scene-grounding' || primaryInquiry.kind === 'contradiction-check')
    && input.worldModel?.epistemicState.certainty !== 'grounded'
  ) {
    decided = true
    stance = 'uncertain'
    confidence = clamp01(0.56 + primaryInquiry.confidence * 0.18)
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = primaryInquiry.question
      ?? currentRepair?.summary
      ?? carriedConcern?.summary
  }
  else if (activeHypothesis?.kind === 'misread-drift' || runtimeThread?.need === 'repair') {
    decided = true
    stance = 'uncertain'
    confidence = 0.72
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = activeHypothesis?.summary ?? runtimeThread?.summary ?? currentRepair?.summary ?? carriedConcern?.summary ?? 'I should repair the drift before I act like I fully understand the moment.'
  }
  else if (afterglowActive) {
    decided = true
    stance = 'nudge'
    confidence = 0.82
    shouldSpeak = true
    suggestedStyle = scenario === 'late-night-care' ? 'gentle-care' : 'light-nudge'
    embodiedPresence = 'glance'
    thoughtText = resurfacingDesire?.reason ?? 'The intense shared scene just ended. This is the natural afterglow to speak softly.'
  }
  else if (scenario === 'late-night-care' && input.context.relationship.fatigue >= 80) {
    decided = true
    stance = 'warn'
    confidence = 0.9
    shouldSpeak = true
    suggestedStyle = 'firm-warning'
    embodiedPresence = 'concerned'
    thoughtText = 'The host is pushing through deep-night fatigue. I should warn, not hover.'
  }
  else if (scenario === 'late-night-care' && input.context.relationship.fatigue >= 55) {
    decided = true
    stance = 'care'
    confidence = 0.8
    shouldSpeak = true
    suggestedStyle = 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = 'This is turning into late-night drain. I should care for the host before it hardens.'
  }
  else if (scenario === 'coding' && input.watchMode !== 'symbiotic-vision' && input.currentScene?.contentKind !== 'error' && input.currentScene?.contentKind !== 'diff') {
    decided = true
    stance = 'uncertain'
    confidence = 0.58
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = input.worldModel?.epistemicState.openQuestions[0] ?? 'I know the host is coding, but I do not have enough stable grounding to comment yet.'
  }
  else if (scenario === 'coding' && (input.currentScene?.contentKind === 'error' || input.currentScene?.contentKind === 'diff')) {
    decided = true
    stance = 'nudge'
    confidence = 0.84
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'attentive'
    thoughtText = 'The scene carries coding friction. I can nudge without overstepping.'
  }
  else if (scenario === 'media' && input.watchMode === 'symbiotic-vision') {
    decided = true
    stance = 'observe'
    confidence = 0.74
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'attentive'
    thoughtText = 'The host is still inside the media flow. I should stay with them quietly.'
  }
  else if (scenario === 'media' && input.context.system.inputActivity !== 'active') {
    decided = true
    stance = 'nudge'
    confidence = 0.72
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'glance'
    thoughtText = 'The media immersion has loosened. A tiny nudge would still feel natural here.'
  }

  if (
    (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    && stance !== 'care'
    && stance !== 'warn'
    && !isSeriousDurabilityPulse(input.durabilityPulse)
  ) {
    decided = true
    stance = 'uncertain'
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = reflection?.revision
      ?? input.executiveCycle?.currentLine
      ?? project?.summary
      ?? currentRepair?.summary
      ?? thoughtText
  }
  else if (
    !decided
    && input.watchMode !== 'invited-inspection'
    && Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
    && (input.attention || input.currentScene)
  ) {
    decided = true
    stance = 'nudge'
    confidence = 0.7
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = input.attention ? 'glance' : 'hesitant'
    thoughtText = 'The tension has pooled long enough that a small, relevant nudge would feel alive rather than noisy.'
  }
  else {
    if (!decided && input.actionEcology?.mode === 'quiet-accompany')
      stance = 'accompany'
    else if (!decided)
      stance = 'accompany'
    if (!decided) {
      confidence = 0.66 + (resurfacingDesire?.strength ?? 0) * 0.08
      shouldSpeak = input.actionEcology?.shouldSpeak ?? false
      suggestedStyle = input.actionEcology?.suggestedStyle ?? 'silent-observe'
      embodiedPresence = input.actionEcology?.embodiedPresence ?? (input.attention ? 'glance' : 'none')
      thoughtText = deliberationThread?.summary
        ?? activeInquiryPlan?.question
        ?? governingCommitment?.summary
        ?? input.actionEcology?.why
        ?? resurfacingDesire?.reason
        ?? input.worldModel?.activeThread?.summary
        ?? 'I can stay nearby without turning this into an interruption.'
    }
  }

  if (!decided && !shouldSpeak && stance === 'observe' && input.mindEcology?.relationshipHabit === 'stay-near') {
    stance = 'accompany'
    embodiedPresence = embodiedPresence === 'none'
      ? (resolveEcologyPresence(input.mindEcology) ?? resolveAutobiographicalPresence(input.autobiographicalSelf) ?? 'attentive')
      : embodiedPresence
  }
  if (!decided && shouldSpeak && suggestedStyle === 'light-nudge' && input.mindEcology?.regulationHabit === 'soften-before-speaking')
    suggestedStyle = 'gentle-care'

  if (embodiedPresence === 'glance' && input.watchMode === 'symbiotic-vision' && !shouldSpeak)
    embodiedPresence = 'attentive'

  return applyPrivateThoughtCarry({
    now: input.now,
    afterglowActive,
    previous: input.previousPrivateThought ?? null,
    snapshot: applyContinuityMindOverlay({
    now: input.now,
    worldModel: input.worldModel,
    relationshipModel: input.relationshipModel,
    mindKernel: input.mindKernel,
    selfGovernor: input.selfGovernor,
    latestUserTurnAt,
    snapshot: {
    stance,
    confidence: clamp01(confidence + (project?.confidence ?? 0) * 0.1 + Math.max(0, reflection?.confidenceShift ?? 0) * 0.08),
    rationaleTags,
    thoughtText: sanitizeText(thoughtText, 220),
    shouldSpeak,
    suggestedStyle,
    embodiedPresence,
    expiresAt: input.now + (afterglowActive ? 120_000 : 90_000),
    afterglowFromScenario: afterglowActive && (input.recentTransition?.fromScenario === 'coding' || input.recentTransition?.fromScenario === 'media')
      ? input.recentTransition.fromScenario
      : null,
    emotionalTension,
    focusBeliefId: focusBelief?.id ?? null,
    focusInquiryId: primaryInquiry?.id ?? null,
    commitmentId: governingCommitment?.id ?? null,
    inquiryPlanId: activeInquiryPlan?.id ?? null,
    hypothesisId: activeHypothesis?.id ?? null,
    deliberationThreadId: deliberationThread?.id ?? null,
    runtimeThreadId: runtimeThread?.id ?? null,
    mindNeed: input.deliberationState?.dominantNeed ?? null,
    relationshipVector: input.relationshipModel?.approachVector ?? null,
    counterfactualOptionId: counterfactualOption?.id ?? null,
    leadingGoalId: leadingGoal?.id ?? null,
    desireId: resurfacingDesire?.id ?? null,
    governorDrive: input.selfGovernor?.dominantDrive ?? null,
    governorIntentionId: governorIntention?.id ?? null,
    selectedThoughtThreadId: thoughtThread?.id ?? null,
    livingWorldObjectId: livingObject?.id ?? null,
    },
    }),
  })
}

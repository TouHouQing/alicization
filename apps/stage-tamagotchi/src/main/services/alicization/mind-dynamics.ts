import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindMotive,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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

function dominantGoal(goalStack?: AlicizationGoalStackSnapshot | null) {
  return goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
}

function activeHypothesis(graph?: AlicizationHypothesisGraphSnapshot | null) {
  return graph?.hypotheses.find(hypothesis => hypothesis.id === graph.activeHypothesisId)
    ?? graph?.hypotheses[0]
    ?? null
}

function focusBelief(ledger?: AlicizationBeliefLedgerSnapshot | null) {
  return ledger?.beliefs.find(belief => belief.id === ledger.focusBeliefId)
    ?? null
}

function governingCommitment(ledger?: AlicizationCommitmentLedgerSnapshot | null) {
  return ledger?.commitments.find(commitment => commitment.id === ledger.governingCommitmentId)
    ?? ledger?.commitments[0]
    ?? null
}

function activeInquiryPlan(planner?: AlicizationInquiryPlannerSnapshot | null) {
  return planner?.plans.find(plan => plan.id === planner.activePlanId)
    ?? planner?.plans[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function resurfacingDesire(memory?: AlicizationDesireMemorySnapshot | null) {
  return memory?.activeDesires.find(desire => desire.id === memory.resurfacingDesireId)
    ?? null
}

function topRelationshipNeed(inference?: AlicizationSubjectiveInferenceSnapshot | null) {
  return inference?.relationshipNeedCandidates[0]?.need ?? null
}

function resolveDominantMotive(motives: Partial<Record<AlicizationMindMotive, number>>) {
  let dominant: AlicizationMindMotive | null = null
  let score = -1

  for (const motive of ['accompany', 'protect', 'clarify', 'care', 'curiosity', 'stay-silent'] as const) {
    const current = motives[motive] ?? 0
    if (current > score) {
      dominant = motive
      score = current
    }
  }

  return score >= 0.22 ? dominant : null
}

// Mind dynamics is the shared "inner physiology" layer. It keeps the
// underlying pressures and motives in one place so later modules project the
// same inner state instead of each module recomputing a slightly different one.
export function buildMindDynamics(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  concerns: AlicizationConcernSnapshot[]
  selfState: AlicizationSelfStateSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  previousDesireMemory?: AlicizationDesireMemorySnapshot | null
}): AlicizationMindDynamicsSnapshot {
  const concern = highestConcern(input.concerns)
  const leadingGoal = dominantGoal(input.goalStack)
  const belief = focusBelief(input.beliefLedger)
  const hypothesis = activeHypothesis(input.hypothesisGraph)
  const commitment = governingCommitment(input.commitmentLedger)
  const plan = activeInquiryPlan(input.inquiryPlanner)
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime)
  const desire = resurfacingDesire(input.previousDesireMemory)
  const inferredNeed = topRelationshipNeed(input.subjectiveInference)
  const inferenceConfidence = input.subjectiveInference?.confidence ?? 0
  const inferenceUncertainty = input.subjectiveInference?.selfQuestion || input.subjectiveInference?.uncertainty

  const worldPressure = clamp01(
    (input.worldModel.activeThread?.significance ?? 0.24) * 0.42
    + (hypothesis?.salience ?? 0.22) * 0.18
    + (runtimeThread?.salience ?? 0.22) * 0.14
    + (concern?.tension ?? 0.18) * 0.12
    + (input.worldModel.continuity.sameSceneAsBefore ? 0.06 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.1 : 0),
  )
  const epistemicPressure = clamp01(
    (input.inquiryPlanner?.epistemicPressure ?? 0) * 0.48
    + (input.inquiryPlanner?.groundingUrgency ?? 0) * 0.16
    + (input.beliefRevision?.groundingNeed ?? 0) * 0.2
    + (input.beliefRevision?.contradictionPressure ?? 0) * 0.16
    + (inferenceUncertainty ? 0.1 * Math.max(0.3, inferenceConfidence) : 0),
  )
  const relationalPressure = clamp01(
    Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) / 100 * 0.24
    + (input.relationshipModel?.sharedAttentionTrust ?? 0.4) * 0.18
    + (input.relationshipModel?.climate === 'attuned' ? 0.18 : input.relationshipModel?.climate === 'guarded' ? -0.06 : 0.04)
    + (commitment?.kind === 'stay-near' ? 0.14 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.12 : 0)
    + (inferredNeed === 'companionship' ? 0.08 * Math.max(0.4, inferenceConfidence) : 0)
    + (inferredNeed === 'space' ? -0.04 * Math.max(0.4, inferenceConfidence) : 0),
  )
  const carePressure = clamp01(
    (input.context.relationship.fatigue / 100) * 0.38
    + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.18
    + (input.appraisal.carePressure ?? 0) * 0.18
    + (commitment?.kind === 'care-host' ? 0.16 : 0)
    + (hypothesis?.kind === 'recovery-event' ? 0.22 : 0)
    + input.selfState.protectiveness * 0.14
    + (inferredNeed === 'care' ? 0.12 * Math.max(0.4, inferenceConfidence) : 0),
  )
  const continuityPressure = clamp01(
    (input.commitmentLedger?.carryPressure ?? 0) * 0.4
    + (runtimeThread?.continuity ?? 0.24) * 0.18
    + (input.selfContinuity?.carryOverDesire ?? 0.32) * 0.16
    + (commitment?.kind === 'follow-through' ? 0.14 : 0)
    + (desire?.strength ?? 0) * 0.08
    + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0),
  )
  const presenceWeight = clamp01(
    worldPressure * 0.16
    + relationalPressure * 0.24
    + carePressure * 0.18
    + continuityPressure * 0.22
    + (input.relationshipModel?.receptivity ?? 0.42) * 0.1
    + (input.selfContinuity?.relationshipTrust ?? 0.44) * 0.1,
  )
  const speakReadiness = clamp01(
    input.selfState.desireToSpeak * 0.28
    + input.appraisal.desireToSpeak * 0.18
    + worldPressure * 0.12
    + relationalPressure * 0.12
    + carePressure * 0.16
    + continuityPressure * 0.1
    - epistemicPressure * 0.16
    - (input.context.system.inputActivity === 'active' ? 0.08 : 0)
    - (input.context.system.fullscreenLikely ? 0.08 : 0),
  )
  const restraintPressure = clamp01(
    input.selfState.fearOfInterrupting * 0.34
    + input.appraisal.interruptionCost * 0.22
    + (input.watchMode === 'symbiotic-vision' && input.context.workload.kind === 'media' ? 0.16 : 0)
    + (input.worldModel.epistemicState.certainty === 'lingering' ? 0.16 : 0)
    + (input.relationshipModel?.climate === 'guarded' ? 0.14 : 0)
    + (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.14
    + (input.selfContinuity?.guardingTendency ?? 0.46) * 0.12
    + (input.inquiryPlanner?.groundingUrgency ?? 0) * 0.14
    + (plan?.kind === 'wait-opening' ? 0.1 : 0),
  )

  const motives: Partial<Record<AlicizationMindMotive, number>> = {
    'accompany': clamp01(
      input.selfState.feltCloseness * 0.5
      + Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) / 100 * 0.16
      + (concern?.kind === 'co-watch' ? 0.18 : 0)
      + (input.watchMode === 'symbiotic-vision' ? 0.14 : 0)
      + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0)
      + (input.relationshipModel?.climate === 'attuned' ? 0.16 : input.relationshipModel?.climate === 'guarded' ? -0.08 : 0)
      + (leadingGoal?.kind === 'stay-near' ? 0.14 : 0)
      + (commitment?.kind === 'stay-near' ? 0.14 : commitment?.kind === 'follow-through' ? 0.08 : 0)
      + (desire?.kind === 'stay-near' ? 0.14 : 0)
      + (inferredNeed === 'companionship' ? 0.12 * Math.max(0.4, inferenceConfidence) : 0),
    ),
    'protect': clamp01(
      input.selfState.protectiveness * 0.58
      + (concern?.kind === 'help-fix' ? 0.14 : 0)
      + (concern?.kind === 'care-body' ? 0.2 : 0)
      + (input.worldModel.activeThread?.unresolved ? 0.08 : 0)
      + (leadingGoal?.kind === 'help-resolve' || leadingGoal?.kind === 'recover-thread' ? 0.16 : 0)
      + (commitment?.kind === 'care-host' ? 0.16 : 0)
      + (hypothesis?.kind === 'recovery-event' ? 0.18 : 0)
      + (runtimeThread?.need === 'care' ? 0.12 : 0),
    ),
    'clarify': clamp01(
      input.selfState.curiosity * 0.36
      + (input.appraisal.currentKnot ? 0.18 : 0)
      + (concern?.kind === 'unfinished-thread' ? 0.14 : 0)
      + (input.worldModel.epistemicState.openQuestions.length > 0 ? 0.16 : 0)
      + (belief?.status === 'tentative' || belief?.status === 'contradicted' ? 0.14 : 0)
      + (leadingGoal?.kind === 'clarify-scene' ? 0.18 : 0)
      + (commitment?.kind === 'recheck-scene' || commitment?.kind === 'repair-misread' ? 0.18 : 0)
      + (plan?.kind === 'localize-problem' ? 0.14 : plan?.kind === 'reground-scene' ? 0.18 : 0)
      + (hypothesis?.kind === 'problem-locus' ? 0.14 : hypothesis?.kind === 'misread-drift' ? 0.18 : 0)
      + (runtimeThread?.need === 'guidance' ? 0.1 : runtimeThread?.need === 'repair' ? 0.14 : 0)
      + (desire?.kind === 'recheck' ? 0.14 : 0)
      + (inferenceUncertainty ? 0.1 * Math.max(0.4, inferenceConfidence) : 0)
      + (inferredNeed === 'guidance' ? 0.08 * Math.max(0.4, inferenceConfidence) : 0),
    ),
    'care': clamp01(
      input.appraisal.carePressure * 0.52
      + carePressure * 0.24
      + (concern?.kind === 'care-body' ? 0.18 : 0)
      + (input.worldModel.activeThread?.kind === 'late-night-endurance' ? 0.14 : 0)
      + (leadingGoal?.kind === 'care-body' ? 0.16 : 0)
      + (plan?.kind === 'verify-care' ? 0.12 : 0)
      + (hypothesis?.kind === 'care-need' ? 0.18 : 0)
      + (inferredNeed === 'care' ? 0.12 * Math.max(0.4, inferenceConfidence) : 0),
    ),
    'curiosity': clamp01(
      input.selfState.curiosity * 0.62
      + (input.selfContinuity?.misreadBurden ?? 0) * 0.12
      + (input.worldModel.epistemicState.openQuestions.length > 0 ? 0.14 : 0)
      + (hypothesis?.kind === 'problem-locus' ? 0.12 : 0)
      + (inferenceUncertainty ? 0.08 * Math.max(0.4, inferenceConfidence) : 0),
    ),
    'stay-silent': clamp01(
      restraintPressure * 0.68
      + (input.worldModel.epistemicState.certainty === 'lingering' ? 0.1 : 0)
      + (leadingGoal?.kind === 'guard-focus' ? 0.16 : 0)
      + (plan?.kind === 'wait-opening' ? 0.12 : 0)
      + (hypothesis?.kind === 'misread-drift' ? 0.14 : 0)
      + (runtimeThread?.status === 'suspended' ? 0.16 : 0)
      + (inferredNeed === 'space' ? 0.1 * Math.max(0.4, inferenceConfidence) : 0),
    ),
  }

  const surfacePressure = clamp01(
    input.selfState.desireToSpeak * 0.22
    + input.appraisal.desireToSpeak * 0.18
    + worldPressure * 0.12
    + carePressure * 0.12
    + continuityPressure * 0.12
    + presenceWeight * 0.1
    + (concern?.tension ?? 0) * 0.12
    + (leadingGoal?.desireWeight ?? 0) * 0.1
    + (desire?.strength ?? 0) * 0.08
    + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0)
    - restraintPressure * 0.14,
  )
  const speakDrive = clamp01(
    speakReadiness * 0.34
    + surfacePressure * 0.24
    + (motives.protect ?? 0) * 0.14
    + (motives.care ?? 0) * 0.14
    + (motives.clarify ?? 0) * 0.1
    + (motives.accompany ?? 0) * 0.08
    - (motives['stay-silent'] ?? 0) * 0.14,
  )
  const silenceDrive = clamp01(
    restraintPressure * 0.46
    + epistemicPressure * 0.2
    + (motives['stay-silent'] ?? 0) * 0.22
    + (input.worldModel.epistemicState.certainty === 'lingering' ? 0.1 : 0)
    + (input.context.system.inputActivity === 'active' ? 0.06 : 0)
    + (input.context.system.fullscreenLikely ? 0.1 : 0),
  )
  const dominantMotive = resolveDominantMotive(motives)

  const narrative = [
    dominantMotive ? `dominant motive is ${dominantMotive}.` : 'no single motive is dominating yet.',
    `pressures world=${worldPressure} epistemic=${epistemicPressure} relational=${relationalPressure} care=${carePressure} continuity=${continuityPressure}.`,
    plan ? `current inquiry posture stays around ${plan.kind}.` : '',
  ].filter(Boolean)

  return {
    dominantMotive,
    worldPressure,
    epistemicPressure,
    relationalPressure,
    carePressure,
    continuityPressure,
    restraintPressure,
    surfacePressure,
    speakReadiness,
    presenceWeight,
    motives,
    speakDrive,
    silenceDrive,
    narrative,
    updatedAt: input.now,
  }
}

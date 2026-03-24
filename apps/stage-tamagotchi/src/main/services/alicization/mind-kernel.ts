import type {
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelMode,
  AlicizationMindKernelSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'

function modeScore(input: {
  mode: AlicizationMindKernelMode
  worldPressure: number
  epistemicPressure: number
  relationalPressure: number
  carePressure: number
  continuityPressure: number
  speakReadiness: number
}) {
  switch (input.mode) {
    case 'repairing':
      return input.epistemicPressure * 0.56 + input.continuityPressure * 0.14 + (1 - input.speakReadiness) * 0.12
    case 'guarding':
      return input.carePressure * 0.62 + input.worldPressure * 0.12 + input.speakReadiness * 0.08
    case 'tracking':
      return input.worldPressure * 0.38 + input.continuityPressure * 0.24 + input.epistemicPressure * 0.12
    case 'accompanying':
      return input.relationalPressure * 0.42 + input.continuityPressure * 0.28 + input.speakReadiness * 0.06
    case 'orienting':
      return input.epistemicPressure * 0.38 + input.worldPressure * 0.18 + (1 - input.speakReadiness) * 0.08
    case 'resting':
      return (1 - input.worldPressure) * 0.22 + (1 - input.carePressure) * 0.12 + (1 - input.epistemicPressure) * 0.12
  }
}

// Mind kernel is the governing inner mode. It stops Alicization from feeling
// like a fresh rules evaluation every tick by making one dominant inner posture
// persist over time.
export function buildMindKernel(input: {
  now: number
  worldModel: AlicizationWorldModelSnapshot
  mindDynamics: AlicizationMindDynamicsSnapshot
  commitmentLedger: AlicizationCommitmentLedgerSnapshot
  inquiryPlanner: AlicizationInquiryPlannerSnapshot
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  previous?: AlicizationMindKernelSnapshot | null
}): AlicizationMindKernelSnapshot {
  const previous = input.previous ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const foregroundThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const governingCommitment = input.commitmentLedger.commitments.find(commitment => commitment.id === input.commitmentLedger.governingCommitmentId)
    ?? input.commitmentLedger.commitments[0]
    ?? null
  const activePlan = input.inquiryPlanner.plans.find(plan => plan.id === input.inquiryPlanner.activePlanId)
    ?? input.inquiryPlanner.plans[0]
    ?? null
  const dominantIntention = input.selfGovernor?.activeIntentions.find(intention => intention.id === input.selfGovernor?.dominantIntentionId)
    ?? input.selfGovernor?.activeIntentions[0]
    ?? null

  const {
    worldPressure,
    epistemicPressure,
    relationalPressure,
    carePressure,
    continuityPressure,
    speakReadiness,
    presenceWeight,
  } = input.mindDynamics

  let dominantMode: AlicizationMindKernelMode = 'resting'
  if (
    dominantIntention?.kind === 'repair-misread'
    || input.selfGovernor?.dominantDrive === 'repair'
  ) {
    dominantMode = 'repairing'
  }
  else if (
    dominantIntention?.kind === 'protect-host'
    || dominantIntention?.kind === 'care-host'
    || input.selfGovernor?.dominantDrive === 'protect'
    || input.selfGovernor?.dominantDrive === 'care'
  ) {
    dominantMode = 'guarding'
  }
  else if (
    dominantIntention?.kind === 'hold-thread'
    || input.selfGovernor?.dominantDrive === 'understand'
  ) {
    dominantMode = 'tracking'
  }
  else if (
    dominantIntention?.kind === 'stay-near'
    || dominantIntention?.kind === 'wait-opening'
    || input.selfGovernor?.dominantDrive === 'accompany'
    || input.selfGovernor?.dominantDrive === 'withhold'
  ) {
    dominantMode = 'accompanying'
  }
  else if (
    governingCommitment?.kind === 'repair-misread'
    || governingCommitment?.kind === 'recheck-scene'
    || activePlan?.kind === 'reground-scene'
    || activePlan?.kind === 'check-recovery'
    || (input.beliefRevision?.stability === 'fractured')
  ) {
    dominantMode = activePlan?.kind === 'check-recovery' || carePressure >= epistemicPressure + 0.08
      ? 'guarding'
      : 'repairing'
  }
  else if (
    governingCommitment?.kind === 'care-host'
    || carePressure >= 0.62
  ) {
    dominantMode = 'guarding'
  }
  else if (
    governingCommitment?.kind === 'hold-problem'
    || governingCommitment?.kind === 'follow-through'
    || activePlan?.kind === 'localize-problem'
    || activePlan?.kind === 'follow-thread'
  ) {
    dominantMode = 'tracking'
  }
  else if (
    governingCommitment?.kind === 'stay-near'
    || activePlan?.kind === 'wait-opening'
    || input.worldModel.continuity.afterglowOpen
    || relationalPressure >= 0.52
  ) {
    dominantMode = 'accompanying'
  }
  else if (
    epistemicPressure >= 0.46
    || input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    dominantMode = 'orienting'
  }

  if (worldPressure < 0.22 && epistemicPressure < 0.24 && carePressure < 0.24 && continuityPressure < 0.24)
    dominantMode = 'resting'

  if (previous && previous.updatedAt >= input.now - 10 * 60_000) {
    const previousScore = modeScore({
      mode: previous.dominantMode,
      worldPressure,
      epistemicPressure,
      relationalPressure,
      carePressure,
      continuityPressure,
      speakReadiness,
    })
    const nextScore = modeScore({
      mode: dominantMode,
      worldPressure,
      epistemicPressure,
      relationalPressure,
      carePressure,
      continuityPressure,
      speakReadiness,
    })
    if (previousScore >= nextScore - 0.08)
      dominantMode = previous.dominantMode
  }

  const narrative = [
    `${dominantMode} is governing the current inner line.`,
    input.selfGovernor?.dominantDrive ? `dominant drive is ${input.selfGovernor.dominantDrive}.` : '',
    dominantIntention ? `carrying ${dominantIntention.kind} as the living intention.` : '',
    input.mindDynamics.dominantMotive ? `dominant motive is ${input.mindDynamics.dominantMotive}.` : '',
    governingCommitment ? `carrying ${governingCommitment.kind} as the main obligation.` : '',
    activePlan ? `next epistemic move is ${activePlan.kind}.` : '',
  ].filter(Boolean)

  return {
    dominantMode,
    governingHypothesisId: activeHypothesis?.id ?? null,
    governingRuntimeThreadId: foregroundThread?.id ?? null,
    governingCommitmentId: governingCommitment?.id ?? null,
    governingInquiryPlanId: activePlan?.id ?? null,
    governingIntentionId: dominantIntention?.id ?? null,
    dominantDrive: input.selfGovernor?.dominantDrive ?? null,
    worldPressure,
    epistemicPressure,
    relationalPressure,
    carePressure,
    continuityPressure,
    speakReadiness,
    presenceWeight,
    narrative,
    updatedAt: input.now,
  }
}

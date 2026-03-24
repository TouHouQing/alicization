import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationConcernSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function dominantConcern(concerns: AlicizationConcernSnapshot[]) {
  return concerns
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
}

export function buildSelfState(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  concerns: AlicizationConcernSnapshot[]
  watchMode: AlicizationVisualWatchMode
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
}): AlicizationSelfStateSnapshot {
  const concern = dominantConcern(input.concerns)
  const goalStack = input.goalStack ?? null
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const leadingGoal = goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
  const beliefRevision = input.beliefRevision ?? null
  const attachmentBonus = input.selfContinuity?.attachmentMode === 'attuned'
    ? 0.12
    : input.selfContinuity?.attachmentMode === 'guarded'
      ? -0.06
      : 0.02
  const feltCloseness = clamp01(
    Math.max(input.context.relationship.loneliness, input.context.relationship.boredom) / 100 * 0.26
    + (input.watchMode === 'symbiotic-vision' ? 0.36 : input.watchMode === 'invited-inspection' ? 0.42 : 0.18)
    + (input.worldModel.continuity.sameSceneAsBefore ? 0.08 : 0)
    + (input.worldModel.activeThread?.kind === 'co-viewing' ? 0.06 : 0)
    + (input.selfContinuity?.relationshipTrust ?? 0.48) * 0.14
    + (input.relationshipModel?.climate === 'attuned' ? 0.12 : input.relationshipModel?.climate === 'guarded' ? -0.06 : 0.02)
    + (input.relationshipModel?.sharedAttentionTrust ?? 0.42) * 0.12
    + attachmentBonus,
  )
  const protectiveness = clamp01(
    input.appraisal.carePressure * 0.56
    + (concern?.kind === 'care-body' ? 0.24 : 0)
    + (concern?.kind === 'help-fix' ? 0.16 : 0)
    + (input.worldModel.activeThread?.unresolved ? 0.08 : 0)
    + (input.worldModel.hostState.burden === 'heavy' ? 0.06 : 0)
    + (leadingGoal?.kind === 'care-body' || leadingGoal?.kind === 'recover-thread' ? 0.16 : 0)
    + (leadingGoal?.kind === 'help-resolve' ? 0.08 : 0),
  )
  const curiosity = clamp01(
    (input.appraisal.currentKnot ? 0.22 : 0.06)
    + (concern?.kind === 'curiosity' ? 0.34 : 0)
    + (input.appraisal.confidence < 0.65 ? 0.18 : 0.04)
    + (input.worldModel.epistemicState.openQuestions.length > 0 ? 0.12 : 0)
    + (primaryInquiry ? 0.16 : 0)
    + (leadingGoal?.kind === 'clarify-scene' ? 0.12 : 0)
    + (input.selfContinuity?.misreadBurden ?? 0) * 0.1
    + (beliefRevision?.groundingNeed ?? 0) * 0.14
    + (beliefRevision?.contradictionPressure ?? 0) * 0.1,
  )
  const fearOfInterrupting = clamp01(
    input.appraisal.interruptionCost * 0.72
    + (input.context.system.inputActivity === 'active' ? 0.14 : 0)
    + (input.context.workload.kind === 'coding' ? 0.08 : 0)
    + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.1 : 0)
    + (input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.22
    + (input.relationshipModel?.approachVector === 'give-space' ? 0.12 : 0)
    + (input.selfContinuity?.guardingTendency ?? 0.46) * 0.18
    + (beliefRevision?.hostCorrectionWeight ?? 0) * 0.14
    + (beliefRevision?.stability === 'fractured' ? 0.08 : 0),
  )
  const desireToSpeak = clamp01(
    input.appraisal.desireToSpeak * 0.58
    + (concern ? concern.tension * 0.24 : 0)
    + protectiveness * 0.12
    + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0)
    + (input.worldModel.activeThread?.significance ?? 0) * 0.08
    + (focusBelief?.status === 'held' ? 0.08 : focusBelief?.status === 'tentative' ? -0.06 : 0)
    + (input.relationshipModel?.approachVector === 'guide' || input.relationshipModel?.approachVector === 'care' ? 0.06 : 0)
    + (input.selfContinuity?.carryOverDesire ?? 0) * 0.16
    + (leadingGoal?.desireWeight ?? 0) * 0.14
    - fearOfInterrupting * 0.1
    - (beliefRevision?.groundingNeed ?? 0) * 0.12
    - (beliefRevision?.contradictionPressure ?? 0) * 0.08,
  )
  const patience = clamp01(
    0.42
    + (input.watchMode === 'symbiotic-vision' ? 0.18 : 0.08)
    + (fearOfInterrupting > desireToSpeak ? 0.18 : 0)
    + (input.worldModel.epistemicState.certainty === 'lingering' ? 0.1 : 0)
    + (input.selfContinuity?.initiativeTemperament === 'reserved' ? 0.08 : input.selfContinuity?.initiativeTemperament === 'eager' ? -0.04 : 0)
    + (beliefRevision?.groundingNeed ?? 0) * 0.12
    + (beliefRevision?.stability === 'fractured' ? 0.08 : 0),
  )

  let stance: AlicizationSelfStateSnapshot['stance'] = 'coexist'
  let moodLabel = 'quiet-nearby'
  if (protectiveness >= 0.74) {
    stance = 'protect'
    moodLabel = 'protective-tension'
  }
  else if (input.relationshipModel?.climate === 'guarded' && input.relationshipModel.approachVector === 'give-space') {
    stance = 'hold'
    moodLabel = 'guarded-nearby'
  }
  else if (
    primaryInquiry
    && (primaryInquiry.kind === 'scene-grounding' || primaryInquiry.kind === 'contradiction-check')
    && input.worldModel.epistemicState.certainty !== 'grounded'
  ) {
    stance = 'hesitate'
    moodLabel = 'question-held'
  }
  else if (fearOfInterrupting > desireToSpeak + 0.16 || input.worldModel.epistemicState.certainty === 'lingering') {
    stance = concern ? 'hesitate' : 'hold'
    moodLabel = 'hesitant-observe'
  }
  else if (input.watchMode === 'invited-inspection' || desireToSpeak >= 0.6) {
    stance = 'approach'
    moodLabel = input.relationshipModel?.climate === 'attuned' ? 'attuned-guidance' : 'leaning-forward'
  }

  if (beliefRevision?.stability === 'fractured' && stance !== 'protect') {
    stance = 'hesitate'
    moodLabel = 'repairing-confidence'
  }
  else if (
    beliefRevision?.stability === 'stable'
    && stance === 'hesitate'
    && desireToSpeak >= 0.56
    && fearOfInterrupting <= 0.6
  ) {
    stance = 'approach'
    moodLabel = 'confidence-returning'
  }

  if (input.selfContinuity?.attachmentMode === 'guarded' && stance === 'approach') {
    stance = 'hesitate'
    moodLabel = 'guarded-approach'
  }
  else if (input.selfContinuity?.attachmentMode === 'attuned' && stance === 'coexist') {
    stance = 'approach'
    moodLabel = 'attuned-nearby'
  }

  return {
    stance,
    feltCloseness,
    protectiveness,
    curiosity,
    patience,
    desireToSpeak,
    fearOfInterrupting,
    dominantConcernId: concern?.id ?? null,
    moodLabel,
  }
}

import type {
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationCounterfactualOptionSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationMindActionTendency,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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

function topHostGoal(input: {
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal: AlicizationSubjectiveSceneAppraisal
}) {
  return input.subjectiveInference?.hostIntentCandidates[0]?.goal
    ?? input.appraisal.inferredHostGoal
}

function topRelationshipNeed(input: {
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal: AlicizationSubjectiveSceneAppraisal
}) {
  return input.subjectiveInference?.relationshipNeedCandidates[0]?.need
    ?? input.appraisal.relationshipNeed
    ?? 'unclear'
}

function dominantGoal(goalStack?: AlicizationGoalStackSnapshot | null) {
  return goalStack?.alicizationGoals.find(goal => goal.id === goalStack.leadingAlicizationGoalId)
    ?? goalStack?.alicizationGoals[0]
    ?? null
}

function highestConcern(concerns: AlicizationConcernSnapshot[]) {
  return concerns
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
}

function activeCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function optionStyle(input: {
  action: AlicizationMindActionTendency
  relationshipNeed: ReturnType<typeof topRelationshipNeed>
  careUrgent: boolean
}) {
  if (input.action === 'warn')
    return 'firm-warning' as const
  if (input.action === 'speak') {
    return input.relationshipNeed === 'care' || input.careUrgent
      ? 'gentle-care' as const
      : 'light-nudge' as const
  }
  if (input.action === 'whisper') {
    return input.relationshipNeed === 'care'
      ? 'gentle-care' as const
      : 'light-nudge' as const
  }
  return 'silent-observe' as const
}

function optionPresence(input: {
  action: AlicizationMindActionTendency
  relationshipNeed: ReturnType<typeof topRelationshipNeed>
  selfState: AlicizationSelfStateSnapshot
  mindDynamics: AlicizationMindDynamicsSnapshot
}) {
  if (input.action === 'warn')
    return 'concerned' as const
  if (input.action === 'speak') {
    return input.relationshipNeed === 'care' || input.selfState.stance === 'protect'
      ? 'concerned' as const
      : 'attentive' as const
  }
  if (input.action === 'whisper') {
    return input.selfState.stance === 'hesitate'
      ? 'hesitant' as const
      : 'glance' as const
  }
  if (input.action === 'recheck')
    return 'hesitant' as const
  if (input.action === 'hover') {
    return input.mindDynamics.presenceWeight >= 0.52
      ? 'attentive' as const
      : 'glance' as const
  }
  return input.mindDynamics.presenceWeight >= 0.4
    ? 'glance' as const
    : 'none' as const
}

function dominantTradeoff(action: AlicizationMindActionTendency) {
  switch (action) {
    case 'recheck':
      return 'clarity-before-expression'
    case 'warn':
      return 'care-over-restraint'
    case 'speak':
      return 'specific-help-over-distance'
    case 'whisper':
      return 'closeness-without-breaking-scene'
    case 'hover':
      return 'presence-before-commentary'
    case 'wait':
    default:
      return 'restraint-over-premature-action'
  }
}

function buildWhy(input: {
  action: AlicizationMindActionTendency
  relationshipNeed: ReturnType<typeof topRelationshipNeed>
  hostGoal: ReturnType<typeof topHostGoal>
  uncertain: boolean
  careUrgent: boolean
  afterglowOpen: boolean
  concern?: AlicizationConcernSnapshot
  commitmentSummary?: string
  threadSummary?: string
}) {
  switch (input.action) {
    case 'recheck':
      return input.concern?.summary
        ?? input.commitmentSummary
        ?? input.threadSummary
        ?? ''
    case 'warn':
      return input.concern?.summary
        ?? input.commitmentSummary
        ?? input.threadSummary
        ?? ''
    case 'speak':
      if (input.relationshipNeed === 'guidance' && (input.hostGoal === 'resolve-problem' || input.hostGoal === 'inspect-change'))
        return input.concern?.summary ?? input.threadSummary ?? ''
      if (input.relationshipNeed === 'care')
        return input.concern?.summary ?? input.commitmentSummary ?? input.threadSummary ?? ''
      return input.threadSummary ?? input.commitmentSummary ?? ''
    case 'whisper':
      return input.concern?.summary ?? input.commitmentSummary ?? input.threadSummary ?? ''
    case 'hover':
      return input.threadSummary ?? input.commitmentSummary ?? input.concern?.summary ?? ''
    case 'wait':
    default:
      return input.commitmentSummary ?? input.threadSummary ?? input.concern?.summary ?? ''
  }
}

function actionBaseAdjustment(action: AlicizationMindActionTendency) {
  switch (action) {
    case 'warn':
      return 0.04
    case 'speak':
      return 0.03
    case 'whisper':
      return 0.02
    case 'hover':
      return 0.01
    case 'recheck':
      return 0.03
    case 'wait':
    default:
      return 0
  }
}

export function buildCounterfactualDeliberation(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  concerns: AlicizationConcernSnapshot[]
  selfState: AlicizationSelfStateSnapshot
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  mindDynamics: AlicizationMindDynamicsSnapshot
  mindKernel?: AlicizationMindKernelSnapshot | null
  previous?: AlicizationCounterfactualDeliberationSnapshot | null
}): AlicizationCounterfactualDeliberationSnapshot {
  const relationshipNeed = topRelationshipNeed(input)
  const hostGoal = topHostGoal(input)
  const concern = highestConcern(input.concerns)
  const leadingGoal = dominantGoal(input.goalStack)
  const commitment = activeCommitment(input.commitmentLedger)
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const guarded = input.relationshipModel?.climate === 'guarded'
  const afterglowOpen = input.worldModel.continuity.afterglowOpen
  const worldCertainty = input.worldModel.epistemicState.certainty
  const uncertaintyPressure = Math.max(
    input.beliefRevision?.groundingNeed ?? 0,
    input.beliefRevision?.contradictionPressure ?? 0,
  )
  const inferenceConfidence = input.subjectiveInference?.confidence ?? input.appraisal.confidence
  const carriesReflectiveQuestion = Boolean(input.subjectiveInference?.selfQuestion)
  const carriesSoftUncertainty = Boolean(input.subjectiveInference?.uncertainty)
  const softUncertaintyNeedsRepair
    = worldCertainty === 'lingering'
      || worldCertainty === 'uncertain'
      || inferenceConfidence < 0.76
  const uncertain = worldCertainty === 'uncertain'
    || worldCertainty === 'lingering'
    || uncertaintyPressure >= 0.68
    || ((carriesReflectiveQuestion || carriesSoftUncertainty) && softUncertaintyNeedsRepair)
  const careUrgent = input.context.relationship.fatigue >= 80
    || input.worldModel.activeThread?.kind === 'late-night-endurance'
    || concern?.kind === 'care-body'
  const guidanceWindow = (hostGoal === 'resolve-problem' || hostGoal === 'inspect-change')
    && (
      worldCertainty === 'grounded'
      || (
        worldCertainty === 'observed'
        && input.appraisal.confidence >= 0.62
        && (
          input.context.content.kind === 'error'
          || input.context.content.kind === 'diff'
          || input.worldModel.activeThread?.unresolved
        )
      )
    )
    && relationshipNeed !== 'space'
  const companionshipWindow = relationshipNeed === 'companionship'
    || input.mindDynamics.dominantMotive === 'accompany'
    || leadingGoal?.kind === 'stay-near'
    || thoughtThread?.kind === 'relationship-thread'
    || thoughtThread?.kind === 'afterglow-thread'
  const groundedHelpWindow = guidanceWindow
    && !uncertain
    && input.appraisal.confidence >= 0.58
  const governorWithholding = input.selfGovernor?.dominantDrive === 'withhold'
    || thoughtThread?.status === 'waiting'
  const governorRepairing = input.selfGovernor?.dominantDrive === 'repair'
    || thoughtThread?.kind === 'repair-thread'
  const governorCaring = input.selfGovernor?.dominantDrive === 'care'
    || input.selfGovernor?.dominantDrive === 'protect'
    || thoughtThread?.kind === 'care-thread'

  const baseInterruption = clamp01(
    input.appraisal.interruptionCost * 0.7
    + (input.context.system.inputActivity === 'active' ? 0.14 : 0)
    + (input.context.system.fullscreenLikely ? 0.2 : 0)
    + (guarded ? 0.08 : 0),
  )
  const spacePenalty = relationshipNeed === 'space' ? 0.18 : 0
  const relationshipBase = clamp01(
    (guarded ? 0.16 : 0.08)
    + spacePenalty
    + ((input.relationshipModel?.correctionSensitivity ?? 0.32) * 0.12),
  )
  const epistemicNeed = clamp01(
    input.mindDynamics.epistemicPressure * 0.46
    + (input.beliefRevision?.groundingNeed ?? 0) * 0.24
    + (input.beliefRevision?.contradictionPressure ?? 0) * 0.12
    + (uncertain ? 0.18 : 0),
  )

  const evaluateOption = (action: AlicizationMindActionTendency): AlicizationCounterfactualOptionSnapshot => {
    let relationshipCost = relationshipBase
    let interruptionCost = baseInterruption
    let informationGain = 0.08
    let timingFitness = 0.24
    let identityFit = 0.24

    if (action === 'wait') {
      relationshipCost = clamp01(0.02 + (careUrgent ? 0.08 : 0))
      interruptionCost = 0.01
      informationGain = clamp01(epistemicNeed * 0.12)
      timingFitness = clamp01(input.mindDynamics.restraintPressure * 0.72 + (guarded ? 0.12 : 0))
      identityFit = clamp01((input.mindDynamics.motives['stay-silent'] ?? 0) * 0.78 + input.mindDynamics.restraintPressure * 0.18)
    }
    else if (action === 'hover') {
      relationshipCost = clamp01(relationshipBase * 0.28 + 0.04)
      interruptionCost = clamp01(baseInterruption * 0.18 + 0.04)
      informationGain = clamp01(0.1 + epistemicNeed * 0.08)
      timingFitness = clamp01(
        input.mindDynamics.presenceWeight * 0.44
        + (afterglowOpen ? 0.2 : 0)
        + (companionshipWindow ? 0.18 : 0),
      )
      identityFit = clamp01(
        (input.mindDynamics.motives.accompany ?? 0) * 0.58
        + (input.mindDynamics.motives['stay-silent'] ?? 0) * 0.16
        + input.mindDynamics.presenceWeight * 0.16,
      )
    }
    else if (action === 'recheck') {
      relationshipCost = clamp01(relationshipBase * 0.22 + 0.02)
      interruptionCost = clamp01(baseInterruption * 0.16 + 0.02)
      informationGain = clamp01(epistemicNeed * 0.9 + (guidanceWindow ? 0.08 : 0) + (governorRepairing ? 0.12 : 0))
      timingFitness = clamp01((uncertain ? 0.54 : 0.14) + epistemicNeed * 0.22 - (afterglowOpen ? 0.06 : 0) - (groundedHelpWindow ? 0.12 : 0) + (governorRepairing ? 0.08 : 0))
      identityFit = clamp01(
        (input.mindDynamics.motives.clarify ?? 0) * 0.66
        + (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting' ? 0.16 : 0)
        + epistemicNeed * 0.16,
      )
    }
    else if (action === 'whisper') {
      relationshipCost = clamp01(relationshipBase * 0.56 + (relationshipNeed === 'care' ? 0.02 : 0))
      interruptionCost = clamp01(baseInterruption * 0.52 + 0.08)
      informationGain = clamp01((guidanceWindow ? 0.24 : 0.1) + (companionshipWindow ? 0.08 : 0) + input.appraisal.desireToSpeak * 0.12)
      timingFitness = clamp01(
        (afterglowOpen ? 0.42 : 0.12)
        + (companionshipWindow ? 0.2 : 0)
        + (groundedHelpWindow ? 0.14 : 0)
        + (thoughtThread?.kind === 'afterglow-thread' ? 0.12 : 0)
        + (input.context.system.inputActivity === 'active' ? -0.12 : 0)
        + (input.context.system.fullscreenLikely ? -0.16 : 0),
      )
      identityFit = clamp01(
        (input.mindDynamics.motives.accompany ?? 0) * 0.42
        + (input.mindDynamics.motives.care ?? 0) * 0.12
        + input.mindDynamics.speakReadiness * 0.18,
      )
    }
    else if (action === 'speak') {
      relationshipCost = clamp01(relationshipBase * 0.74 + (relationshipNeed === 'space' ? 0.06 : 0))
      interruptionCost = clamp01(baseInterruption * 0.74 + 0.1)
      informationGain = clamp01(
        (guidanceWindow ? 0.42 : 0.12)
        + (careUrgent ? 0.14 : 0)
        + ((worldCertainty === 'grounded' || worldCertainty === 'observed') ? 0.12 : 0)
        + (governorCaring ? 0.08 : 0)
        + input.appraisal.desireToSpeak * 0.14,
      )
      timingFitness = clamp01(
        (guidanceWindow ? 0.38 : 0.12)
        + (afterglowOpen ? 0.12 : 0)
        + (careUrgent ? 0.08 : 0)
        + (groundedHelpWindow ? 0.16 : 0)
        + (thoughtThread?.status === 'ripe' ? 0.08 : 0)
        - (input.context.system.inputActivity === 'active' ? 0.14 : 0)
        - (input.context.system.fullscreenLikely ? 0.18 : 0),
      )
      identityFit = clamp01(
        (input.mindDynamics.motives.clarify ?? 0) * 0.24
        + (input.mindDynamics.motives.protect ?? 0) * 0.16
        + (input.mindDynamics.motives.care ?? 0) * 0.14
        + input.mindDynamics.speakReadiness * 0.2
        + input.appraisal.desireToSpeak * 0.18,
      )
    }
    else if (action === 'warn') {
      relationshipCost = clamp01(relationshipBase * 0.86 + 0.08)
      interruptionCost = clamp01(baseInterruption * 0.84 + 0.18)
      informationGain = clamp01((careUrgent ? 0.42 : 0.1) + (governorCaring ? 0.1 : 0))
      timingFitness = clamp01(
        (careUrgent ? 0.48 : 0.08)
        + (input.context.relationship.fatigue >= 90 ? 0.18 : 0)
        + (thoughtThread?.kind === 'care-thread' ? 0.08 : 0)
        - (input.context.system.fullscreenLikely ? 0.16 : 0),
      )
      identityFit = clamp01(
        (input.mindDynamics.motives.protect ?? 0) * 0.44
        + (input.mindDynamics.motives.care ?? 0) * 0.3
        + (input.mindKernel?.dominantMode === 'guarding' ? 0.16 : 0),
      )
    }

    if (governorWithholding && action !== 'wait' && action !== 'hover')
      relationshipCost = clamp01(relationshipCost + 0.08)
    if (governorWithholding && action === 'hover')
      timingFitness = clamp01(timingFitness + 0.08)

    const score = clamp01(
      actionBaseAdjustment(action)
      + identityFit * 0.34
      + timingFitness * 0.28
      + informationGain * 0.18
      - interruptionCost * 0.14
      - relationshipCost * 0.12,
    )
    const style = optionStyle({
      action,
      relationshipNeed,
      careUrgent,
    })
    const embodiedPresence = optionPresence({
      action,
      relationshipNeed,
      selfState: input.selfState,
      mindDynamics: input.mindDynamics,
    })

    return {
      id: `counterfactual::${action}`,
      action,
      style,
      embodiedPresence,
      relationshipCost,
      interruptionCost,
      informationGain,
      timingFitness,
      identityFit,
      score,
      why: sanitizeText(buildWhy({
        action,
        relationshipNeed,
        hostGoal,
        uncertain,
        careUrgent,
        afterglowOpen,
        concern,
        commitmentSummary: commitment?.summary,
        threadSummary: runtimeThread?.summary,
      }), 220),
    }
  }

  const rankedOptions = (['wait', 'hover', 'recheck', 'whisper', 'speak', 'warn'] as const)
    .map(evaluateOption)
    .sort((left, right) => right.score - left.score)

  let selectedOption = rankedOptions[0]
  const previousOption = input.previous?.selectedOptionId
    ? rankedOptions.find(option => option.id === input.previous?.selectedOptionId)
    : null
  if (previousOption && selectedOption && previousOption.score >= selectedOption.score - 0.05)
    selectedOption = previousOption

  const nextOption = rankedOptions.find(option => option.id !== selectedOption?.id) ?? null
  const confidence = clamp01(
    (selectedOption?.score ?? 0.24) * 0.72
    + Math.max(0, (selectedOption?.score ?? 0) - (nextOption?.score ?? 0)) * 0.24
    + (input.subjectiveInference?.confidence ?? input.appraisal.confidence) * 0.08,
  )

  return {
    selectedOptionId: selectedOption?.id ?? null,
    selectedAction: selectedOption?.action ?? 'wait',
    confidence,
    dominantTradeoff: dominantTradeoff(selectedOption?.action ?? 'wait'),
    options: rankedOptions,
    narrative: [
      selectedOption
        ? `${selectedOption.action} wins because identity fit and timing beat its interruption cost.`
        : 'No outward option matured enough to dominate the mind this tick.',
      selectedOption?.why ?? '',
    ].filter(Boolean),
    updatedAt: input.now,
  }
}

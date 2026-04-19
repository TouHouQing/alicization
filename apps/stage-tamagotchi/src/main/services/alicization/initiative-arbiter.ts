import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeProposalSnapshot,
  AlicizationMindActionTendency,
  AlicizationMindDynamicsSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationProactiveStyle,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldFrameKind,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function actionSpeaks(action: AlicizationMindActionTendency) {
  return action === 'whisper' || action === 'speak' || action === 'warn'
}

function defaultStyle(action: AlicizationMindActionTendency): AlicizationProactiveStyle {
  switch (action) {
    case 'warn':
      return 'firm-warning'
    case 'speak':
    case 'whisper':
      return 'light-nudge'
    default:
      return 'silent-observe'
  }
}

function defaultPresence(action: AlicizationMindActionTendency) {
  switch (action) {
    case 'warn':
      return 'concerned' as const
    case 'speak':
      return 'attentive' as const
    case 'whisper':
      return 'glance' as const
    case 'recheck':
      return 'hesitant' as const
    case 'hover':
      return 'attentive' as const
    case 'wait':
    default:
      return 'glance' as const
  }
}

function dominantConcern(concerns: AlicizationConcernSnapshot[] | undefined | null) {
  return (concerns ?? [])
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
    ?? null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  return threadRuntime?.threads.find(thread => thread.id === threadRuntime.foregroundThreadId)
    ?? threadRuntime?.threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  return selfGovernor?.activeIntentions.find(intention => intention.id === selfGovernor.dominantIntentionId)
    ?? selfGovernor?.activeIntentions[0]
    ?? null
}

function activeCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function resurfacingDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return desireMemory?.activeDesires.find(desire => desire.id === desireMemory.resurfacingDesireId)
    ?? desireMemory?.activeDesires[0]
    ?? null
}

function truthFrameForSurface(
  worldOntology: AlicizationWorldOntologySnapshot | null | undefined,
  worldModel: AlicizationWorldModelSnapshot,
): AlicizationWorldFrameKind {
  if (worldOntology?.live)
    return 'live'
  if (worldOntology?.remembered)
    return 'remembered'
  if (
    worldModel.epistemicState.certainty === 'grounded'
    || worldModel.epistemicState.certainty === 'observed'
  ) {
    return 'live'
  }
  if (worldModel.epistemicState.certainty === 'lingering')
    return 'remembered'
  return 'imagined'
}

function truthCost(input: {
  frame: AlicizationWorldFrameKind
  action: AlicizationMindActionTendency
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}) {
  if (input.action === 'wait' || input.action === 'hover')
    return 0.02
  if (input.action === 'recheck')
    return input.frame === 'imagined' ? 0.04 : 0.02

  const misreadBurden = input.selfContinuity?.misreadBurden ?? 0.18
  if (input.frame === 'live')
    return clamp01(0.04 + misreadBurden * 0.06)
  if (input.frame === 'remembered')
    return clamp01((input.action === 'whisper' ? 0.18 : 0.28) + misreadBurden * 0.18)
  return clamp01((input.action === 'whisper' ? 0.24 : 0.36) + misreadBurden * 0.2)
}

function interruptionCost(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  action: AlicizationMindActionTendency
}) {
  const hostBusy = input.context.system.inputActivity === 'active'
    || input.worldModel.hostState.availability === 'focused'
    || input.worldModel.hostState.availability === 'immersed'
  const busyPenalty = hostBusy ? 0.2 : 0.04
  switch (input.action) {
    case 'warn':
      return clamp01(busyPenalty + 0.12)
    case 'speak':
      return clamp01(busyPenalty + 0.08)
    case 'whisper':
      return clamp01(busyPenalty * 0.72)
    case 'hover':
      return clamp01(0.06 + (hostBusy ? 0.04 : 0))
    case 'recheck':
      return 0.04
    case 'wait':
    default:
      return 0.02
  }
}

function relationshipCost(input: {
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  action: AlicizationMindActionTendency
}) {
  const climate = input.relationshipModel?.climate ?? 'neutral'
  const correctionSensitivity = input.relationshipModel?.correctionSensitivity ?? 0.34
  const receptivity = input.relationshipModel?.receptivity ?? 0.46
  const surfaceScale = input.action === 'warn'
    ? 1.2
    : input.action === 'speak'
      ? 1
      : input.action === 'whisper'
        ? 0.72
        : 0.24
  return clamp01(
    (climate === 'guarded' ? 0.16 : climate === 'warm' || climate === 'attuned' ? -0.04 : 0.04)
    + correctionSensitivity * 0.22
    - receptivity * 0.12
    + surfaceScale * 0.04,
  )
}

function continuityGain(input: {
  worldModel: AlicizationWorldModelSnapshot
  action: AlicizationMindActionTendency
  source: AlicizationInitiativeProposalSnapshot['source']
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
}) {
  const afterglowGain = input.worldModel.continuity.afterglowOpen
    ? (input.action === 'whisper' || input.action === 'speak' ? 0.16 : 0.08)
    : 0
  const carryOverGain = (input.selfContinuity?.carryOverDesire ?? 0.22) * (input.source === 'thought-thread' || input.source === 'desire-memory' ? 0.16 : 0.08)
  return clamp01(afterglowGain + carryOverGain)
}

function autobiographicalPreferenceGain(input: {
  action: AlicizationMindActionTendency
  source: AlicizationInitiativeProposalSnapshot['source']
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
}) {
  const snapshot = input.autobiographicalSelf
  if (!snapshot)
    return 0

  const preferences = snapshot.preferenceEvolution
  const dominantGoal = pickDominantAutobiographicalGoal(snapshot)
  let gain = 0
  switch (input.action) {
    case 'recheck':
      gain += preferences.truthfulGrounding * 0.16 + preferences.gentleRepair * 0.08
      break
    case 'hover':
    case 'wait':
      gain += preferences.quietObservation * 0.12 + preferences.autonomyRespect * 0.08
      break
    case 'whisper':
      gain += preferences.companionship * 0.08 + preferences.playfulIntimacy * 0.08
      break
    case 'warn':
      gain += preferences.proactiveCare * 0.12 + preferences.truthfulGrounding * 0.06
      break
    case 'speak':
      gain += preferences.companionship * 0.08 + preferences.proactiveCare * 0.06
      break
  }

  if (
    dominantGoal?.kind === 'finish-open-loops'
    && (input.source === 'thread-runtime' || input.source === 'thought-thread' || input.source === 'commitment')
  ) {
    gain += preferences.unfinishedThreadReturn * 0.08
  }
  if (
    (dominantGoal?.kind === 'preserve-trust' || dominantGoal?.kind === 'reduce-misread')
    && input.action === 'recheck'
  ) {
    gain += 0.08
  }
  if (dominantGoal?.kind === 'stay-near-without-crowding' && (input.action === 'hover' || input.action === 'whisper'))
    gain += 0.06
  if (dominantGoal?.kind === 'protect-rest-rhythm' && (input.action === 'warn' || input.action === 'speak'))
    gain += 0.08

  return clamp01(gain)
}

function finalScore(input: {
  base: number
  truthCost: number
  interruptionCost: number
  relationshipCost: number
  continuityGain: number
  preferenceGain: number
}) {
  return clamp01(input.base + input.continuityGain + input.preferenceGain - input.truthCost - input.interruptionCost - input.relationshipCost)
}

function proposalBias(input: {
  proposal: AlicizationInitiativeProposalSnapshot
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  concern?: AlicizationConcernSnapshot | null
}) {
  let bias = 0

  switch (input.proposal.action) {
    case 'recheck':
      bias += (input.motiveEngine?.drives.truthDiscipline ?? 0) * 0.12
      bias += (input.motiveEngine?.returnPressure ?? 0) * 0.1
      bias += input.habitPolicy?.requiresGroundingBeforeSurface ? 0.08 : 0
      bias += input.habitPolicy?.returnViaRecheck ? 0.08 : 0
      break
    case 'hover':
    case 'whisper':
      bias += (input.motiveEngine?.drives.companionship ?? 0) * 0.08
      bias += input.habitPolicy?.prefersQuietCompanionship ? 0.12 : 0
      bias += input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.06 : 0
      break
    case 'warn':
      bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.14
      bias += input.habitPolicy?.protectsRestWindow ? 0.14 : 0
      break
    case 'speak':
      bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.08
      bias += (input.motiveEngine?.drives.companionship ?? 0) * 0.04
      bias -= input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0
      break
    case 'wait':
      bias += (input.motiveEngine?.drives.boundaryRespect ?? 0) * 0.08
      bias += input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0
      break
  }

  if (input.concern?.kind === 'care-body' && (input.proposal.action === 'warn' || input.proposal.action === 'speak'))
    bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.08

  return Math.max(-0.18, Math.min(0.22, Number(bias.toFixed(2))))
}

function createProposal(input: {
  id: string
  source: AlicizationInitiativeProposalSnapshot['source']
  frame: AlicizationWorldFrameKind
  action: AlicizationMindActionTendency
  base: number
  why: string
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  style?: AlicizationProactiveStyle
  presence?: AlicizationInitiativeProposalSnapshot['embodiedPresence']
  targetBeliefId?: string | null
  targetInquiryId?: string | null
  targetCommitmentId?: string | null
  targetHypothesisId?: string | null
  targetThreadId?: string | null
  targetRuntimeThreadId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  targetCounterfactualOptionId?: string | null
  targetDesireId?: string | null
  targetConcernId?: string | null
}): AlicizationInitiativeProposalSnapshot {
  const truthPenalty = truthCost({
    frame: input.frame,
    action: input.action,
    selfContinuity: input.selfContinuity,
  })
  const interruptionPenalty = interruptionCost({
    context: input.context,
    worldModel: input.worldModel,
    action: input.action,
  })
  const relationshipPenalty = relationshipCost({
    relationshipModel: input.relationshipModel,
    action: input.action,
  })
  const continuity = continuityGain({
    worldModel: input.worldModel,
    action: input.action,
    source: input.source,
    selfContinuity: input.selfContinuity,
  })
  const preferenceGain = autobiographicalPreferenceGain({
    action: input.action,
    source: input.source,
    autobiographicalSelf: input.autobiographicalSelf,
  })
  return {
    id: sanitizeText(input.id, 180) || `${input.source}:${input.action}`,
    source: input.source,
    truthFrame: input.frame,
    action: input.action,
    style: input.style ?? defaultStyle(input.action),
    embodiedPresence: input.presence ?? defaultPresence(input.action),
    targetBeliefId: sanitizeText(input.targetBeliefId, 160) || null,
    targetInquiryId: sanitizeText(input.targetInquiryId, 160) || null,
    targetCommitmentId: sanitizeText(input.targetCommitmentId, 160) || null,
    targetHypothesisId: sanitizeText(input.targetHypothesisId, 160) || null,
    targetThreadId: sanitizeText(input.targetThreadId, 160) || null,
    targetRuntimeThreadId: sanitizeText(input.targetRuntimeThreadId, 160) || null,
    targetThoughtThreadId: sanitizeText(input.targetThoughtThreadId, 160) || null,
    targetGovernorIntentionId: sanitizeText(input.targetGovernorIntentionId, 160) || null,
    targetCounterfactualOptionId: sanitizeText(input.targetCounterfactualOptionId, 160) || null,
    targetDesireId: sanitizeText(input.targetDesireId, 160) || null,
    targetConcernId: sanitizeText(input.targetConcernId, 160) || null,
    truthCost: truthPenalty,
    interruptionCost: interruptionPenalty,
    relationshipCost: relationshipPenalty,
    continuityGain: continuity,
    preferenceGain,
    confidence: clamp01(input.base),
    score: finalScore({
      base: input.base,
      truthCost: truthPenalty,
      interruptionCost: interruptionPenalty,
      relationshipCost: relationshipPenalty,
      continuityGain: continuity,
      preferenceGain,
    }),
    shouldSpeak: actionSpeaks(input.action),
    shouldSurface: input.action !== 'wait' || (input.presence ?? defaultPresence(input.action)) !== 'none',
    why: sanitizeText(input.why, 220) || 'The inner line is still deciding how close to come.',
  }
}

export function buildInitiativeArbitration(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  worldOntology?: AlicizationWorldOntologySnapshot | null
  concerns?: AlicizationConcernSnapshot[] | null
  selfState: AlicizationSelfStateSnapshot
  mindDynamics: AlicizationMindDynamicsSnapshot
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
}): AlicizationInitiativeArbitrationSnapshot {
  const concern = dominantConcern(input.concerns)
  const runtimeThread = foregroundRuntimeThread(input.threadRuntime)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const commitment = activeCommitment(input.commitmentLedger)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const desire = resurfacingDesire(input.desireMemory)
  const proposals: AlicizationInitiativeProposalSnapshot[] = []

  const push = (proposal: AlicizationInitiativeProposalSnapshot | null) => {
    if (!proposal)
      return
    const existing = proposals.find(item => item.id === proposal.id)
    if (existing)
      return
    proposals.push(proposal)
  }

  for (const option of input.counterfactualDeliberation?.options ?? []) {
    push(createProposal({
      id: `counterfactual:${option.id}`,
      source: 'counterfactual',
      frame: option.action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action: option.action,
      base: clamp01(
        option.score * 0.68
        + option.informationGain * 0.08
        + option.timingFitness * 0.08
        + option.identityFit * 0.08
        - option.relationshipCost * 0.05
        - option.interruptionCost * 0.05,
      ),
      why: option.why,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      style: option.style,
      presence: option.embodiedPresence,
      targetCounterfactualOptionId: option.id,
      targetRuntimeThreadId: runtimeThread?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (concern) {
    const surfaceFrame = truthFrameForSurface(input.worldOntology, input.worldModel)
    const action: AlicizationMindActionTendency = concern.kind === 'care-body'
      ? (input.context.relationship.fatigue >= 80 ? 'warn' : 'speak')
      : concern.kind === 'help-fix'
        ? (surfaceFrame === 'live' ? 'speak' : 'recheck')
        : concern.kind === 'co-watch'
          ? 'whisper'
          : concern.kind === 'unfinished-thread'
            ? 'hover'
            : 'hover'
    push(createProposal({
      id: `concern:${concern.id}`,
      source: 'concern',
      frame: action === 'recheck' ? 'imagined' : surfaceFrame,
      action,
      base: clamp01(
        concern.tension * 0.34
        + concern.confidence * 0.18
        + concern.careWeight * 0.18
        + input.selfState.desireToSpeak * 0.12
        + input.selfState.protectiveness * 0.08,
      ),
      why: concern.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      style: concern.kind === 'care-body'
        ? (input.context.relationship.fatigue >= 80 ? 'firm-warning' : 'gentle-care')
        : concern.kind === 'co-watch'
          ? 'light-nudge'
          : undefined,
      presence: concern.kind === 'care-body'
        ? 'concerned'
        : concern.kind === 'help-fix'
          ? 'attentive'
          : undefined,
      targetConcernId: concern.id,
      targetRuntimeThreadId: runtimeThread?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
    }))
  }

  if (commitment) {
    const action: AlicizationMindActionTendency = commitment.kind === 'recheck-scene' || commitment.kind === 'repair-misread'
      ? 'recheck'
      : commitment.kind === 'care-host'
        ? input.context.relationship.fatigue >= 80 ? 'warn' : 'speak'
        : commitment.kind === 'stay-near'
          ? (input.worldModel.continuity.afterglowOpen ? 'whisper' : 'hover')
          : commitment.kind === 'hold-problem' && input.worldOntology?.live
            ? 'speak'
            : commitment.kind === 'follow-through' && input.worldOntology?.live
              ? 'whisper'
              : 'hover'
    push(createProposal({
      id: `commitment:${commitment.id}`,
      source: 'commitment',
      frame: action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action,
      base: clamp01(commitment.priority * 0.62 + commitment.confidence * 0.24 + (input.mindDynamics.speakReadiness * 0.08)),
      why: commitment.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetCommitmentId: commitment.id,
      targetRuntimeThreadId: runtimeThread?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (thoughtThread) {
    const action: AlicizationMindActionTendency = thoughtThread.kind === 'repair-thread'
      ? 'recheck'
      : thoughtThread.kind === 'care-thread'
        ? (input.context.relationship.fatigue >= 80 ? 'warn' : 'speak')
        : thoughtThread.kind === 'afterglow-thread' || thoughtThread.kind === 'relationship-thread'
          ? 'whisper'
          : thoughtThread.kind === 'problem-thread'
            ? (input.worldOntology?.live ? 'speak' : 'whisper')
            : thoughtThread.status === 'waiting'
              ? 'hover'
              : 'hover'
    push(createProposal({
      id: `thought-thread:${thoughtThread.id}`,
      source: 'thought-thread',
      frame: action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action,
      base: clamp01(
        thoughtThread.salience * 0.4
        + thoughtThread.confidence * 0.24
        + thoughtThread.surfaceReadiness * 0.2
        + (thoughtThread.status === 'ripe' ? 0.12 : thoughtThread.status === 'waiting' ? -0.08 : 0),
      ),
      why: thoughtThread.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetThoughtThreadId: thoughtThread.id,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (runtimeThread) {
    const action: AlicizationMindActionTendency = runtimeThread.need === 'repair' || runtimeThread.need === 'ground-truth'
      ? 'recheck'
      : runtimeThread.need === 'care'
        ? (input.context.relationship.fatigue >= 80 ? 'warn' : 'speak')
        : runtimeThread.need === 'companionship'
          ? 'hover'
          : input.worldOntology?.live
            ? 'speak'
            : 'hover'
    push(createProposal({
      id: `runtime:${runtimeThread.id}`,
      source: 'thread-runtime',
      frame: action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action,
      base: clamp01(runtimeThread.salience * 0.42 + runtimeThread.continuity * 0.18 + (input.mindDynamics.surfacePressure * 0.14)),
      why: runtimeThread.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      presence: runtimeThread.suggestedPresence,
      targetRuntimeThreadId: runtimeThread.id,
      targetThreadId: runtimeThread.sourceThreadId ?? null,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (governorIntention) {
    const action: AlicizationMindActionTendency = governorIntention.kind === 'repair-misread'
      ? 'recheck'
      : governorIntention.kind === 'protect-host' || governorIntention.kind === 'care-host'
        ? (input.context.relationship.fatigue >= 80 ? 'warn' : 'speak')
        : governorIntention.kind === 'stay-near'
          ? 'hover'
          : governorIntention.kind === 'wait-opening'
            ? 'wait'
            : input.worldOntology?.live
              ? 'speak'
              : 'hover'
    push(createProposal({
      id: `governor:${governorIntention.id}`,
      source: 'governor',
      frame: action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action,
      base: clamp01(governorIntention.urgency * 0.44 + governorIntention.confidence * 0.24 + (1 - governorIntention.patience) * 0.12),
      why: governorIntention.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetGovernorIntentionId: governorIntention.id,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (desire && desire.strength >= 0.34) {
    const action: AlicizationMindActionTendency = desire.kind === 'recheck'
      ? 'recheck'
      : desire.kind === 'warn'
        ? 'warn'
        : desire.kind === 'care'
          ? 'speak'
          : desire.kind === 'stay-near'
            ? 'whisper'
            : input.worldOntology?.live
              ? 'speak'
              : 'whisper'
    push(createProposal({
      id: `desire:${desire.id}`,
      source: 'desire-memory',
      frame: action === 'recheck' ? 'imagined' : truthFrameForSurface(input.worldOntology, input.worldModel),
      action,
      base: clamp01(desire.strength * 0.54 + input.selfState.desireToSpeak * 0.16 + input.mindDynamics.speakDrive * 0.14),
      why: desire.reason,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetDesireId: desire.id,
      targetConcernId: concern?.id ?? null,
    }))
  }

  if (
    input.worldModel.activeThread
    && (input.worldModel.activeThread.kind === 'debugging'
      || input.worldModel.activeThread.kind === 'change-review'
      || input.worldModel.activeThread.kind === 'deep-focus')
    && truthFrameForSurface(input.worldOntology, input.worldModel) === 'live'
    && input.mindDynamics.speakDrive >= 0.56
  ) {
    const action: AlicizationMindActionTendency = input.worldModel.activeThread.kind === 'deep-focus'
      ? 'whisper'
      : 'speak'
    push(createProposal({
      id: `fallback:live-thread:${input.worldModel.activeThread.id}`,
      source: 'fallback',
      frame: 'live',
      action,
      base: clamp01(
        input.mindDynamics.speakDrive * 0.36
        + input.mindDynamics.speakReadiness * 0.18
        + input.selfState.desireToSpeak * 0.12
        + (input.worldModel.activeThread.significance ?? 0.4) * 0.18,
      ),
      why: input.worldModel.activeThread.summary,
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetThreadId: input.worldModel.activeThread.id,
      targetRuntimeThreadId: runtimeThread?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetConcernId: concern?.id ?? null,
      presence: action === 'speak' ? 'attentive' : 'glance',
    }))
  }

  if (proposals.length === 0) {
    push(createProposal({
      id: 'fallback:wait',
      source: 'fallback',
      frame: input.worldOntology?.dominantFrame ?? truthFrameForSurface(input.worldOntology, input.worldModel),
      action: 'wait',
      base: 0.42,
      why: 'The inner world has not yet earned a nearer move.',
      context: input.context,
      worldModel: input.worldModel,
      relationshipModel: input.relationshipModel,
      selfContinuity: input.selfContinuity,
      autobiographicalSelf: input.autobiographicalSelf,
      targetConcernId: concern?.id ?? null,
    }))
  }

  const sorted = proposals
    .map(proposal => ({
      ...proposal,
      score: clamp01(proposal.score + proposalBias({
        proposal,
        motiveEngine: input.motiveEngine ?? null,
        habitPolicy: input.habitPolicy ?? null,
        concern,
      })),
    }))
    .sort((left, right) => right.score - left.score)
  const selected = sorted[0] ?? null
  const dominantConflict = selected
    ? `${selected.truthFrame}-truth vs ${actionSpeaks(selected.action) ? 'surface' : 'restraint'}`
    : 'none'

  return {
    selectedProposalId: selected?.id ?? null,
    dominantConflict,
    proposals: sorted.slice(0, 8),
    updatedAt: input.now,
  }
}

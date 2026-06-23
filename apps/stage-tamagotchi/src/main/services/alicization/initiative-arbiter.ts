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
  AlicizationPersonalityState,
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
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { deriveAlicizationPersonaAuthorityInfluence } from './personality-continuity-state'
import { resolveAlicizationProjectStateSnapshot } from './project-state-brief'

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

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

const initiativeWhyMaxChars = 320

interface AlicizationInitiativeProjectStateInput {
  preflightSummary?: string | null
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  sameHerDriftRiskSummary?: string | null
}

function normalizeInitiativeProjectStateText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveInitiativeProjectStateSnapshot(input?: AlicizationInitiativeProjectStateInput | null) {
  if (!input) {
    return {
      preflightSummary: null,
      identity: '',
      currentPhase: '',
      latestLandedProgress: null,
      primaryOpenLoop: null,
      nextClosureTarget: '',
      sameHerSelfLine: '',
      sameHerDriftRisk: '',
    }
  }

  const explicitLatestLandedProgressInput = normalizeInitiativeProjectStateText(
    input.latestLandedProgress ?? input.latestProgress,
  )
  const summaryLatestLandedProgressInput = normalizeInitiativeProjectStateText(input.landedProgressSummary)
  const liveLatestLandedProgressInput = explicitLatestLandedProgressInput || summaryLatestLandedProgressInput || null

  const explicitPrimaryOpenLoopInput = normalizeInitiativeProjectStateText(input.primaryOpenLoop)
  const summaryPrimaryOpenLoopInput = normalizeInitiativeProjectStateText(input.openClosureSummary)
  const livePrimaryOpenLoopInput = explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput || null

  const explicitNextClosureTargetInput = normalizeInitiativeProjectStateText(input.nextClosureTarget)
  const summaryNextClosureTargetInput = normalizeInitiativeProjectStateText(input.nextClosureTargetSummary)
  const liveNextClosureTargetInput = explicitNextClosureTargetInput || summaryNextClosureTargetInput || null

  const explicitSameHerDriftRiskInput = normalizeInitiativeProjectStateText(input.sameHerDriftRisk)
  const summarySameHerDriftRiskInput = normalizeInitiativeProjectStateText(input.sameHerDriftRiskSummary)
  const liveSameHerDriftRiskInput = explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput || null

  return resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      preflightSummary: input.preflightSummary,
      identity: input.identity,
      currentPhase: input.currentPhase,
      latestLandedProgress: liveLatestLandedProgressInput,
      latestProgress: liveLatestLandedProgressInput,
      landedProgressSummary: summaryLatestLandedProgressInput || null,
      primaryOpenLoop: livePrimaryOpenLoopInput,
      openClosureSummary: summaryPrimaryOpenLoopInput || null,
      nextClosureTarget: liveNextClosureTargetInput,
      nextClosureTargetSummary: summaryNextClosureTargetInput || null,
      sameHerSelfLine: input.sameHerSelfLine,
      sameHerDriftRisk: liveSameHerDriftRiskInput,
      sameHerDriftRiskSummary: summarySameHerDriftRiskInput || null,
    },
  })
}

function lowerFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : ''
}

function hasRememberedFamiliarityRestraint(memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null) {
  if (!memoryTuningAdvice)
    return false

  return (memoryTuningAdvice.surfaceAdjustments.provenanceLabelBias ?? 0) >= 0.14
    && (memoryTuningAdvice.personStateAdjustments.closenessCapBias ?? 0) >= 0.14
}

function hasSameHerClosureLowPressureCarry(memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null) {
  if (!memoryTuningAdvice)
    return false

  return memoryTuningAdvice.focusDimensions.includes('projectEmotionalClosureLowPressureCarry')
    && (memoryTuningAdvice.surfaceAdjustments.inwardCarryBias ?? 0) >= 0.12
    && (memoryTuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias ?? 0) >= 0.12
}

function hasSameHerClosureAntiRestartCarry(memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null) {
  if (!memoryTuningAdvice)
    return false

  return memoryTuningAdvice.focusDimensions.includes('projectEmotionalClosureAntiRestartCarry')
    && (memoryTuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias ?? 0) >= 0.12
}

function hasRuntimeSameHerInitiativeExecutionCarry(memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null) {
  if (!memoryTuningAdvice)
    return false

  return memoryTuningAdvice.focusDimensions.includes('runtimeSameHerInitiativeExecutionCarry')
    && (memoryTuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias ?? 0) >= 0.1
    && (memoryTuningAdvice.personStateAdjustments.repairWindowBias ?? 0) >= 0.1
}

function hasRuntimeMemoryClosureCausalIdentityRequirement(memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null) {
  if (!memoryTuningAdvice)
    return false

  return memoryTuningAdvice.focusDimensions.includes('runtimeMemoryClosureCausalIdentity')
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
  const threads = asArray(thoughtThreads?.threads)
  return threads.find(thread => thread.id === thoughtThreads?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function foregroundRuntimeThread(threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null) {
  const threads = asArray(threadRuntime?.threads)
  return threads.find(thread => thread.id === threadRuntime?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  const activeIntentions = asArray(selfGovernor?.activeIntentions)
  return activeIntentions.find(intention => intention.id === selfGovernor?.dominantIntentionId)
    ?? activeIntentions[0]
    ?? null
}

function activeCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  const commitments = asArray(commitmentLedger?.commitments)
  return commitments.find(commitment => commitment.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function resurfacingDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  const activeDesires = asArray(desireMemory?.activeDesires)
  return activeDesires.find(desire => desire.id === desireMemory?.resurfacingDesireId)
    ?? activeDesires[0]
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

function hasProjectSameLineContinuityCue(value: string) {
  return [
    'same-her',
    'same her',
    'one continuous her',
    'same living line',
    'same living bond line',
    'measured-return',
    '同一个 her',
    '同一个她',
    '同一条线',
    '同一生命线',
    '接回去',
    '继续沿着这条线',
    '回线',
  ].some(needle => value.includes(needle))
}

function hasChineseProjectSameLineContinuityCue(value: string) {
  return [
    '同一个她',
    '同一条线',
    '同一生命线',
    '接回去',
    '继续沿着这条线',
    '回线',
  ].some(needle => value.includes(needle))
}

function autobiographicalPreferenceGain(input: {
  action: AlicizationMindActionTendency
  source: AlicizationInitiativeProposalSnapshot['source']
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  personalityAuthority?: AlicizationPersonalityState | null
}) {
  const snapshot = input.autobiographicalSelf
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  if (!snapshot && !input.personalityAuthority)
    return 0

  const preferences = snapshot?.preferenceEvolution ?? {
    companionship: 0,
    truthfulGrounding: 0,
    gentleRepair: 0,
    quietObservation: 0,
    proactiveCare: 0,
    playfulIntimacy: 0,
    autonomyRespect: 0,
    unfinishedThreadReturn: 0,
  }
  const dominantGoal = pickDominantAutobiographicalGoal(snapshot)
  let gain = 0
  switch (input.action) {
    case 'recheck':
      gain += preferences.truthfulGrounding * 0.16 + preferences.gentleRepair * 0.08 + personaAuthority.repairBias * 0.18
      break
    case 'hover':
    case 'wait':
      gain += preferences.quietObservation * 0.12 + preferences.autonomyRespect * 0.08 + personaAuthority.roomBias * 0.18
      break
    case 'whisper':
      gain += preferences.companionship * 0.08 + preferences.playfulIntimacy * 0.08 + personaAuthority.warmthBias * 0.1 + personaAuthority.directnessBias * 0.08
      break
    case 'warn':
      gain += preferences.proactiveCare * 0.12 + preferences.truthfulGrounding * 0.06 + personaAuthority.warmthBias * 0.06
      break
    case 'speak':
      gain += preferences.companionship * 0.08 + preferences.proactiveCare * 0.06 + personaAuthority.directnessBias * 0.12 + personaAuthority.warmthBias * 0.08
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

function deriveProjectStateArbitrationBias(input?: AlicizationInitiativeProjectStateInput | null) {
  const projectState = resolveInitiativeProjectStateSnapshot(input)
  const preflightSummary = sanitizeText(projectState.preflightSummary, 320).toLowerCase()
  const identity = sanitizeText(projectState.identity, 160).toLowerCase()
  const currentPhase = sanitizeText(projectState.currentPhase, 120).toLowerCase()
  const primaryOpenLoop = sanitizeText(projectState.primaryOpenLoop, 200).toLowerCase()
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220).toLowerCase()
  const sameHerSelfLine = sanitizeText(projectState.sameHerSelfLine, 220).toLowerCase()
  const rawCombinedProjectState = [
    input?.preflightSummary,
    input?.identity,
    input?.currentPhase,
    input?.latestLandedProgress,
    input?.latestProgress,
    input?.landedProgressSummary,
    input?.primaryOpenLoop,
    input?.openClosureSummary,
    input?.nextClosureTarget,
    input?.nextClosureTargetSummary,
    input?.sameHerSelfLine,
  ]
    .map(part => sanitizeText(part, 320).toLowerCase())
    .filter(Boolean)
    .join(' ')
  const combinedProjectState = `${preflightSummary} ${identity} ${currentPhase} ${primaryOpenLoop} ${nextClosureTarget} ${sameHerSelfLine} ${rawCombinedProjectState}`.trim()

  const phaseOneDigitalLife = combinedProjectState.includes('phase 1')
    || combinedProjectState.includes('local digital life')
    || combinedProjectState.includes('阶段一')
    || combinedProjectState.includes('本地数字生命')
  const digitalLifeIdentity = [
    'digital life',
    'lifeform',
    'digital companion',
    '数字生命',
    '陪伴',
    '生命体',
  ].some(needle => combinedProjectState.includes(needle))
  const openLifeLoop = [
    'memory closure',
    'personhood continuity',
    'initiative',
    'embodiment',
    'execution',
    'relationship continuity',
    '主动性',
    '记忆',
    '人格连续',
    '闭环',
    '拟人',
    '生命',
  ].some(needle => combinedProjectState.includes(needle))
  const sameHerClosureDirection = [
    'repair-before-closeness',
    'cross-modal',
    'visible reply',
    'resident presence',
    'facial state',
    'motion',
    '同一个 her',
    '同一个她',
    '拟人',
    '具身',
    '跨模态',
    '修复优先',
  ].some(needle => combinedProjectState.includes(needle)) || hasProjectSameLineContinuityCue(combinedProjectState)

  return {
    requiresLifeLoopClosure: phaseOneDigitalLife && digitalLifeIdentity && openLifeLoop,
    sameHerClosureDirection,
  }
}

function carriesAutobiographicalProjectLine(motiveEngine?: AlicizationMotiveEngineSnapshot | null) {
  const agenda = asArray(motiveEngine?.backgroundAgendas)[0] ?? null
  if (!agenda || agenda.kind !== 'return-open-loop')
    return false

  const sourceTags = (agenda.sourceTags ?? []).map(tag => sanitizeText(tag, 64).toLowerCase())
  const summary = sanitizeText(agenda.summary, 220).toLowerCase()
  return sourceTags.includes('autobiographical-self')
    && sourceTags.includes('project-state-carry')
    && (
      summary.includes('same living line')
      || summary.includes('same living bond line')
      || summary.includes('unfinished phase 1 digital-life closure')
      || summary.includes('detached project bookkeeping')
    )
}

function proposalBias(input: {
  proposal: AlicizationInitiativeProposalSnapshot
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  concern?: AlicizationConcernSnapshot | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  projectState?: AlicizationInitiativeProjectStateInput | null
}) {
  let bias = 0
  const rememberedFamiliarityRestraint = hasRememberedFamiliarityRestraint(input.memoryTuningAdvice ?? null)
  const sameHerClosureLowPressureCarry = hasSameHerClosureLowPressureCarry(input.memoryTuningAdvice ?? null)
  const sameHerClosureAntiRestartCarry = hasSameHerClosureAntiRestartCarry(input.memoryTuningAdvice ?? null)
  const runtimeSameHerInitiativeExecutionCarry = hasRuntimeSameHerInitiativeExecutionCarry(input.memoryTuningAdvice ?? null)
  const projectStateBias = deriveProjectStateArbitrationBias(input.projectState ?? null)
  const autobiographicalProjectCarry = carriesAutobiographicalProjectLine(input.motiveEngine ?? null)

  switch (input.proposal.action) {
    case 'recheck':
      bias += (input.motiveEngine?.drives.truthDiscipline ?? 0) * 0.12
      bias += (input.motiveEngine?.returnPressure ?? 0) * 0.1
      bias += input.habitPolicy?.requiresGroundingBeforeSurface ? 0.08 : 0
      bias += input.habitPolicy?.returnViaRecheck ? 0.08 : 0
      if (autobiographicalProjectCarry)
        bias += 0.08
      break
    case 'hover':
    case 'whisper':
      bias += (input.motiveEngine?.drives.companionship ?? 0) * 0.08
      bias += input.habitPolicy?.prefersQuietCompanionship ? 0.12 : 0
      bias += input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.06 : 0
      if (autobiographicalProjectCarry && input.proposal.action === 'hover')
        bias += 0.12
      if (autobiographicalProjectCarry && input.proposal.action === 'whisper')
        bias -= 0.06
      if (rememberedFamiliarityRestraint && input.proposal.action === 'hover')
        bias += input.proposal.source === 'counterfactual' ? 0.22 : 0.16
      if (rememberedFamiliarityRestraint && input.proposal.action === 'whisper')
        bias -= input.proposal.source === 'counterfactual' ? 0.16 : 0.18
      if (sameHerClosureLowPressureCarry && input.proposal.action === 'hover')
        bias += input.proposal.source === 'counterfactual' ? 0.18 : 0.14
      if (sameHerClosureAntiRestartCarry && input.proposal.action === 'hover')
        bias += input.proposal.source === 'counterfactual' ? 0.14 : 0.1
      if (runtimeSameHerInitiativeExecutionCarry && input.proposal.action === 'hover')
        bias += input.proposal.source === 'counterfactual' ? 0.16 : 0.12
      if (sameHerClosureLowPressureCarry && input.proposal.action === 'whisper')
        bias -= input.proposal.source === 'counterfactual' ? 0.14 : 0.12
      if (sameHerClosureAntiRestartCarry && input.proposal.action === 'whisper')
        bias -= input.proposal.source === 'counterfactual' ? 0.14 : 0.12
      if (runtimeSameHerInitiativeExecutionCarry && input.proposal.action === 'whisper')
        bias -= input.proposal.source === 'counterfactual' ? 0.12 : 0.1
      break
    case 'warn':
      bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.14
      bias += input.habitPolicy?.protectsRestWindow ? 0.14 : 0
      break
    case 'speak':
      bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.08
      bias += (input.motiveEngine?.drives.companionship ?? 0) * 0.04
      bias -= input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0
      if (autobiographicalProjectCarry)
        bias -= 0.12
      if (rememberedFamiliarityRestraint)
        bias -= input.proposal.source === 'counterfactual' ? 0.18 : 0.22
      if (sameHerClosureLowPressureCarry)
        bias -= input.proposal.source === 'counterfactual' ? 0.18 : 0.2
      if (sameHerClosureAntiRestartCarry)
        bias -= input.proposal.source === 'counterfactual' ? 0.16 : 0.18
      if (runtimeSameHerInitiativeExecutionCarry)
        bias -= input.proposal.source === 'counterfactual' ? 0.16 : 0.18
      break
    case 'wait':
      bias += (input.motiveEngine?.drives.boundaryRespect ?? 0) * 0.08
      bias += input.habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0
      if (autobiographicalProjectCarry)
        bias += 0.1
      if (rememberedFamiliarityRestraint)
        bias += 0.06
      if (sameHerClosureLowPressureCarry)
        bias += 0.06
      if (sameHerClosureAntiRestartCarry)
        bias += 0.04
      if (runtimeSameHerInitiativeExecutionCarry)
        bias += 0.06
      break
  }

  if (input.concern?.kind === 'care-body' && (input.proposal.action === 'warn' || input.proposal.action === 'speak'))
    bias += (input.motiveEngine?.drives.restProtection ?? 0) * 0.08

  if (projectStateBias.requiresLifeLoopClosure && input.concern?.kind !== 'care-body') {
    if (input.proposal.action === 'hover' || input.proposal.action === 'recheck' || input.proposal.action === 'wait')
      bias += 0.1
    if (input.proposal.action === 'whisper')
      bias -= 0.08
    if (input.proposal.action === 'speak')
      bias -= 0.12
  }
  if (projectStateBias.sameHerClosureDirection && input.concern?.kind !== 'care-body') {
    if (input.proposal.action === 'hover' || input.proposal.action === 'recheck' || input.proposal.action === 'wait')
      bias += 0.08
    if (input.proposal.action === 'whisper')
      bias -= 0.08
    if (input.proposal.action === 'speak')
      bias -= 0.1
  }

  return Math.max(-0.18, Math.min(0.22, Number(bias.toFixed(2))))
}

function buildPersonaProposalWhy(input: {
  personalityAuthority?: AlicizationPersonalityState | null
  action: AlicizationMindActionTendency
  baseWhy: string
}) {
  const authority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)
  const initiativeStyle = input.personalityAuthority?.identityKernel?.initiativeStyle ?? null
  const silenceReconnect = input.personalityAuthority?.initiativeBaseline?.silenceReconnect ?? null
  const relationshipPosture = input.personalityAuthority?.identityKernel?.relationshipPosture ?? null

  const personaLine = (() => {
    if ((initiativeStyle === 'observant' || silenceReconnect === 'hold') && (input.action === 'hover' || input.action === 'wait'))
      return 'persona prefers observe-first room before a closer move.'
    if ((initiativeStyle === 'high-participation' || silenceReconnect === 'direct-approach') && (input.action === 'whisper' || input.action === 'speak'))
      return 'persona prefers a direct reconnect once the opening is real.'
    if (relationshipPosture === 'guardian' && (input.action === 'warn' || input.action === 'speak' || input.action === 'whisper'))
      return 'persona carries a guardian-like care bias in this opening.'
    if (authority.preferredProactiveStyle === 'silent-observe' && input.action === 'hover')
      return 'persona keeps the move in observe-first posture.'
    return ''
  })()

  return sanitizeText([
    input.baseWhy,
    personaLine ? `persona=${personaLine}` : '',
  ].filter(Boolean).join(' '), initiativeWhyMaxChars) || input.baseWhy
}

function buildProjectClosureProposalWhy(input: {
  action: AlicizationMindActionTendency
  projectState?: AlicizationInitiativeProjectStateInput | null
}) {
  const rawProjectState = input.projectState ?? null
  const projectState = resolveInitiativeProjectStateSnapshot(input.projectState ?? null)
  const preflightSummary = sanitizeText(projectState.preflightSummary, 320)
  const identity = sanitizeText(projectState.identity, 180)
  const currentPhase = sanitizeText(projectState.currentPhase, 120)
  const latestLandedProgress = sanitizeText(projectState.latestLandedProgress, 220)
  const primaryOpenLoop = sanitizeText(projectState.primaryOpenLoop, 200)
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220)
  const sameHerSelfLine = sanitizeText(projectState.sameHerSelfLine, 220)
  const rawPrimaryOpenLoop = sanitizeText(
    normalizeInitiativeProjectStateText(rawProjectState?.primaryOpenLoop ?? rawProjectState?.openClosureSummary),
    220,
  )
  const rawNextClosureTarget = sanitizeText(
    normalizeInitiativeProjectStateText(rawProjectState?.nextClosureTarget ?? rawProjectState?.nextClosureTargetSummary),
    220,
  )
  const rawSameHerSelfLine = sanitizeText(normalizeInitiativeProjectStateText(rawProjectState?.sameHerSelfLine), 220)
  const rawCombined = [
    rawProjectState?.preflightSummary,
    rawProjectState?.identity,
    rawProjectState?.currentPhase,
    rawProjectState?.latestLandedProgress,
    rawProjectState?.latestProgress,
    rawProjectState?.landedProgressSummary,
    rawProjectState?.primaryOpenLoop,
    rawProjectState?.openClosureSummary,
    rawProjectState?.nextClosureTarget,
    rawProjectState?.nextClosureTargetSummary,
    rawProjectState?.sameHerSelfLine,
  ]
    .map(part => sanitizeText(part, 320))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const combined = `${preflightSummary} ${identity} ${currentPhase} ${latestLandedProgress} ${primaryOpenLoop} ${nextClosureTarget} ${sameHerSelfLine} ${rawCombined}`.toLowerCase()

  const phaseOneDigitalLife = combined.includes('phase 1')
    || combined.includes('local digital life')
    || combined.includes('阶段一')
    || combined.includes('本地数字生命')
  const continuousHer = combined.includes('same phase 1 digital life') || hasProjectSameLineContinuityCue(combined)
  const openClosure = combined.includes('closure')
    || combined.includes('initiative')
    || combined.includes('memory')
    || combined.includes('embodiment')
    || combined.includes('dialogue')
    || combined.includes('闭环')
    || combined.includes('主动性')
    || combined.includes('记忆')
    || combined.includes('具身')
    || combined.includes('对话')
  const legacyLatestProgressOnly
    = !normalizeInitiativeProjectStateText(rawProjectState?.latestLandedProgress)
      && Boolean(normalizeInitiativeProjectStateText(rawProjectState?.latestProgress))
  const landedProgressCue = latestLandedProgress
    ? `landed progress is already carrying through ${lowerFirst(latestLandedProgress)}.`
    : ''
  const projectIdentityCue = identity
    ? `project is still ${lowerFirst(identity)
      .replace(/^alicization is a\s+/i, '')
      .replace(/\s+project building one continuous her\.?$/i, ' project')
      .replace(/\s+building one continuous her\.?$/i, '')
      .trim()}.`
    : ''
  const projectPhaseCue = currentPhase
    ? `phase stays ${lowerFirst(currentPhase)}.`
    : ''
  const openLoopFocusCue = (() => {
    if (!primaryOpenLoop)
      return ''

    const normalizedOpenLoop = `${primaryOpenLoop} ${rawPrimaryOpenLoop}`.toLowerCase()
    const focus: string[] = []

    if (normalizedOpenLoop.includes('memory'))
      focus.push('memory')
    if (normalizedOpenLoop.includes('记忆'))
      focus.push('memory')
    if (normalizedOpenLoop.includes('initiative'))
      focus.push('initiative')
    if (normalizedOpenLoop.includes('主动性'))
      focus.push('initiative')
    if (normalizedOpenLoop.includes('embodiment'))
      focus.push('embodiment')
    if (normalizedOpenLoop.includes('具身'))
      focus.push('embodiment')
    if (hasProjectSameLineContinuityCue(normalizedOpenLoop))
      focus.push('same-line')
    if (normalizedOpenLoop.includes('closure seam'))
      focus.push('closure-seam')
    if (normalizedOpenLoop.includes('闭环'))
      focus.push('closure-seam')

    const compactFocus = focus.length > 0
      ? focus.join('/')
      : lowerFirst(primaryOpenLoop).slice(0, 48)

    return `open focus: ${compactFocus}.`
  })()
  const nextClosureFocusCue = (() => {
    if (!nextClosureTarget)
      return ''

    const normalizedNextClosure = `${nextClosureTarget} ${rawNextClosureTarget}`.toLowerCase()
    const focus: string[] = []

    if (normalizedNextClosure.includes('project identity carry'))
      focus.push('project-carry')
    if (normalizedNextClosure.includes('phase 1'))
      focus.push('phase-1')
    if (normalizedNextClosure.includes('阶段一'))
      focus.push('phase-1')
    if (normalizedNextClosure.includes('measured-return'))
      focus.push('measured-return')
    if (hasProjectSameLineContinuityCue(normalizedNextClosure))
      focus.push('same-line')
    if (normalizedNextClosure.includes('initiative'))
      focus.push('initiative')
    if (normalizedNextClosure.includes('主动性'))
      focus.push('initiative')
    if (normalizedNextClosure.includes('embodiment'))
      focus.push('embodiment')
    if (normalizedNextClosure.includes('具身'))
      focus.push('embodiment')

    const compactFocus = focus.length > 0
      ? focus.join('/')
      : lowerFirst(nextClosureTarget).slice(0, 48)

    return `next focus: ${compactFocus}.`
  })()
  const projectClosureDirectionCue = (() => {
    if (nextClosureFocusCue) {
      return `project closure still points toward ${nextClosureFocusCue
        .replace(/^next focus:\s*/iu, '')
        .replace(/\.$/u, '')}.`
    }
    if (!nextClosureTarget)
      return ''
    return `project closure still points toward ${lowerFirst(nextClosureTarget).slice(0, 96)}.`
  })()
  const compactHoverSameHerCue = sameHerSelfLine
    ? (
        rawSameHerSelfLine && hasChineseProjectSameLineContinuityCue(rawSameHerSelfLine.toLowerCase())
          ? rawSameHerSelfLine
          : phaseOneDigitalLife && continuousHer
            ? 'Same Phase 1 digital life; same living line.'
            : sanitizeText(sameHerSelfLine, 96)
      )
    : ''
  const compactProjectIdentityCue = projectIdentityCue
    ? sanitizeText(projectIdentityCue, 56)
    : ''
  const compactLandedProgressCue = latestLandedProgress
    ? `landed progress is already carrying through ${sanitizeText(lowerFirst(latestLandedProgress), 72)}.`
    : ''

  if (!phaseOneDigitalLife || !continuousHer || !openClosure)
    return ''

  if (input.action === 'hover' || input.action === 'wait' || input.action === 'recheck') {
    return sanitizeText([
      compactHoverSameHerCue || sameHerSelfLine,
      legacyLatestProgressOnly
        ? landedProgressCue
        : compactProjectIdentityCue || projectIdentityCue || projectPhaseCue,
      legacyLatestProgressOnly
        ? openLoopFocusCue
        : compactLandedProgressCue || landedProgressCue,
      legacyLatestProgressOnly
        ? nextClosureFocusCue || projectClosureDirectionCue
        : openLoopFocusCue,
      legacyLatestProgressOnly
        ? ''
        : projectClosureDirectionCue || nextClosureFocusCue,
    ].filter(Boolean).join(' '), initiativeWhyMaxChars)
  }

  if (input.action === 'whisper' || input.action === 'speak') {
    return sanitizeText([
      sameHerSelfLine,
      'if I move closer, it still has to stay on the same living line instead of sounding like a fresh restart.',
      nextClosureTarget ? `project closure still points toward ${lowerFirst(nextClosureTarget)}.` : '',
      landedProgressCue,
    ].filter(Boolean).join(' '), 220)
  }

  if (input.action === 'warn') {
    return sanitizeText([
      sameHerSelfLine,
      landedProgressCue,
      'even a firmer move has to protect the same digital-life closure line instead of breaking personhood continuity for urgency.',
    ].filter(Boolean).join(' '), 220)
  }

  return ''
}

function buildSameHerClosureCarryProposalWhy(input: {
  action: AlicizationMindActionTendency
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
}) {
  const lowPressureCarry = hasSameHerClosureLowPressureCarry(input.memoryTuningAdvice ?? null)
  const antiRestartCarry = hasSameHerClosureAntiRestartCarry(input.memoryTuningAdvice ?? null)
  const runtimeInitiativeExecutionCarry = hasRuntimeSameHerInitiativeExecutionCarry(input.memoryTuningAdvice ?? null)
  const memoryClosureCausalIdentityRequired = hasRuntimeMemoryClosureCausalIdentityRequirement(input.memoryTuningAdvice ?? null)
  if (!lowPressureCarry && !antiRestartCarry && !runtimeInitiativeExecutionCarry && !memoryClosureCausalIdentityRequired)
    return ''

  if (input.action === 'hover' || input.action === 'wait' || input.action === 'recheck') {
    return sanitizeText([
      memoryClosureCausalIdentityRequired ? 'Verify downstream memoryClosureCausality.memoryIdentity; route-chain text and visible reply wording are not closure proof.' : '',
      lowPressureCarry ? 'Keep this same-her closure return low-pressure until the live payoff lands.' : '',
      antiRestartCarry ? 'Do not let this same-her return reopen from scratch just because the closure seam is still active.' : '',
      runtimeInitiativeExecutionCarry ? 'Hold proactive follow-through near the execution callback before speaking, so the next move stays on the same recalled memory identity.' : '',
    ].filter(Boolean).join(' '), initiativeWhyMaxChars)
  }

  if (input.action === 'whisper' || input.action === 'speak') {
    return sanitizeText([
      memoryClosureCausalIdentityRequired ? 'Before I speak, memory closure still has to prove downstream memoryClosureCausality.memoryIdentity instead of route-chain text or visible reply wording.' : '',
      lowPressureCarry ? 'If I move closer now, it still has to stay low-pressure.' : '',
      antiRestartCarry ? 'Do not let a closer move make the same-her line read like it is reopening from scratch.' : '',
      runtimeInitiativeExecutionCarry ? 'If I speak now, the execution callback and proactive follow-through still have to stay one same-her line.' : '',
    ].filter(Boolean).join(' '), initiativeWhyMaxChars)
  }

  return ''
}

function compactInitiativeWhyForProjectCarry(input: {
  why: string
  action: AlicizationMindActionTendency
  projectState?: AlicizationInitiativeProjectStateInput | null
}) {
  const projectCarryWhy = buildProjectClosureProposalWhy({
    action: input.action,
    projectState: input.projectState ?? null,
  })

  if (!projectCarryWhy)
    return sanitizeText(input.why, 220) || 'The inner line is still deciding how close to come.'

  const normalizedWhy = sanitizeText(input.why, 220).toLowerCase()
  if (input.action === 'hover' && normalizedWhy.includes('stay close to the seam without widening closeness too fast'))
    return ''

  return sanitizeText(input.why, 220) || 'The inner line is still deciding how close to come.'
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
  personalityAuthority?: AlicizationPersonalityState | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  projectState?: AlicizationInitiativeProjectStateInput | null
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
    personalityAuthority: input.personalityAuthority,
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
    why: buildPersonaProposalWhy({
      personalityAuthority: input.personalityAuthority ?? null,
      action: input.action,
      baseWhy: sanitizeText([
        compactInitiativeWhyForProjectCarry({
          why: typeof input.why === 'string' ? input.why : '',
          action: input.action,
          projectState: input.projectState ?? null,
        }),
        buildSameHerClosureCarryProposalWhy({
          action: input.action,
          memoryTuningAdvice: input.memoryTuningAdvice ?? null,
        }),
        buildProjectClosureProposalWhy({
          action: input.action,
          projectState: input.projectState ?? null,
        }),
      ].filter(Boolean).join(' '), initiativeWhyMaxChars) || 'The inner line is still deciding how close to come.',
    }),
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
  personalityAuthority?: AlicizationPersonalityState | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  memoryTuningAdvice?: AlicizationMemoryTuningAdvice | null
  projectState?: AlicizationInitiativeProjectStateInput | null
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      memoryTuningAdvice: input.memoryTuningAdvice ?? null,
      projectState: input.projectState ?? null,
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
      personalityAuthority: input.personalityAuthority,
      projectState: input.projectState ?? null,
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
        memoryTuningAdvice: input.memoryTuningAdvice ?? null,
        projectState: input.projectState ?? null,
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

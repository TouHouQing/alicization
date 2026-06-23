import type {
  AlicizationActionEcologySnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

export const alicizationMindEcologyMarker = '[ALICIZATION_MIND_ECOLOGY]'

export interface AlicizationMindEcologySnapshot {
  moodLabel: string
  replyHabit: 'repair-first' | 'care-first' | 'answer-first' | 'hover-first' | 'observe-first'
  relationshipHabit: 'stay-near' | 'give-space' | 'protective-shadow' | 'warm-guidance'
  explorationHabit: 'verify-before-speaking' | 'curious-probe' | 'follow-thread' | 'surface-intuition'
  regulationHabit: 'cool-down-before-speaking' | 'soften-before-speaking' | 'contain-and-watch' | 'lean-forward-gently'
  temperament: {
    attachment: number
    curiosity: number
    steadiness: number
    directness: number
    playfulness: number
    irritability: number
    tenderness: number
  }
  climate: {
    valence: number
    arousal: number
    socialNeed: number
    solitudeNeed: number
    irritation: number
    restlessness: number
    reflectivePull: number
  }
  selfNarrative: string
  relationNarrative: string
  currentPreoccupation: string
  learnedAdjustments: string[]
  recurringPatterns: string[]
  updatedAt: number
}

export interface AlicizationMindEcologyInput {
  now: number
  context?: AlicizationProactiveLayeredContext | null
  watchMode?: AlicizationVisualWatchMode | null
  worldModel?: AlicizationWorldModelSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  emotionalKernel?: unknown
  actionEcology?: AlicizationActionEcologySnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}

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

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const entries = reflectionLedger?.entries ?? []
  return entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
    ?? entries[0]
    ?? null
}

function strongestDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return (desireMemory?.activeDesires ?? [])
    .slice()
    .sort((left, right) => right.strength - left.strength)[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  const commitments = commitmentLedger?.commitments ?? []
  return commitments.find(commitment => commitment.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null) {
  const plans = inquiryPlanner?.plans ?? []
  return plans.find(plan => plan.id === inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function dominantIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  const activeIntentions = selfGovernor?.activeIntentions ?? []
  return activeIntentions.find(intention => intention.id === selfGovernor?.dominantIntentionId)
    ?? activeIntentions[0]
    ?? null
}

function countOutcome(input: AlicizationMindEcologyInput, kind: 'positive' | 'reply-within-120s' | 'dismiss' | 'ignored') {
  return input.context?.relationship?.recentProactiveOutcomes?.filter(item => item.outcome === kind).length ?? 0
}

function resolveCurrentPreoccupation(input: AlicizationMindEcologyInput) {
  const reflection = latestReflection(input.reflectionLedger)
  const desire = strongestDesire(input.desireMemory)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const intention = dominantIntention(input.selfGovernor)
  const motiveAgenda = input.motiveEngine?.backgroundAgendas[0] ?? input.motiveEngine?.longTermGoals[0] ?? null

  return sanitizeText(
    input.answerPlanner?.governingFocus
    || commitment?.summary
    || motiveAgenda?.summary
    || inquiryPlan?.question
    || input.longHorizonMemory?.rememberedPlanSummary
    || input.longHorizonMemory?.rememberedConstraintSummary
    || input.longHorizonMemory?.dominantCueSummary
    || desire?.reason
    || reflection?.revision
    || reflection?.summary
    || intention?.summary
    || input.privateThought?.thoughtText
    || input.worldModel?.activeThread?.summary
    || input.worldModel?.activeThread?.title
    || input.subjectiveInference?.dominantInterpretation
    || input.appraisal?.currentKnot
    || input.conversationState?.jointThread
    || '',
    220,
  )
}

function buildTemperament(input: AlicizationMindEcologyInput) {
  const desire = strongestDesire(input.desireMemory)
  const dismissCount = countOutcome(input, 'dismiss')
  const ignoredCount = countOutcome(input, 'ignored')
  const positiveCount = countOutcome(input, 'positive') + countOutcome(input, 'reply-within-120s')
  const rememberedCompanionship = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const rememberedTruth = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedCare = input.longHorizonMemory?.preferenceBias.proactiveCare ?? 0
  const rememberedAutonomy = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const rememberedGuardedness = input.longHorizonMemory?.identityBias.guardedness ?? 0
  const rememberedTenderness = input.longHorizonMemory?.identityBias.tenderness ?? 0
  const rememberedDirectness = input.longHorizonMemory?.identityBias.directness ?? 0
  const rememberedSelfDirection = input.longHorizonMemory?.identityBias.selfDirection ?? 0

  const attachment = clamp01(
    (input.selfState?.feltCloseness ?? 0.34) * 0.32
    + (input.selfContinuity?.relationshipTrust ?? 0.4) * 0.22
    + (input.relationshipModel?.sharedAttentionTrust ?? 0.4) * 0.18
    + (input.selfContinuity?.carryOverDesire ?? 0.32) * 0.14
    + rememberedCompanionship * 0.18
    + rememberedTenderness * 0.08
    + (desire?.kind === 'stay-near' ? 0.12 : desire?.kind === 'care' ? 0.08 : 0)
    + positiveCount * 0.04
    + (input.autobiographicalSelf?.personaDrift?.attachmentNeed ?? 0.46) * 0.16
    - rememberedAutonomy * 0.08
    - (input.relationshipModel?.approachVector === 'give-space' ? 0.08 : 0),
  )
  const curiosity = clamp01(
    (input.selfState?.curiosity ?? 0.38) * 0.38
    + (input.mindDynamics?.epistemicPressure ?? 0.24) * 0.22
    + (input.beliefRevision?.groundingNeed ?? 0.22) * 0.18
    + rememberedReturn * 0.08
    + rememberedSelfDirection * 0.06
    + (input.subjectiveInference?.uncertainty ? 0.08 : 0)
    + (input.worldModel?.epistemicState?.openQuestions?.length ? 0.08 : 0)
    + (input.mindKernel?.dominantMode === 'tracking' || input.mindKernel?.dominantMode === 'orienting' ? 0.08 : 0),
  )
  const steadiness = clamp01(
    (input.selfState?.patience ?? 0.42) * 0.34
    + (input.selfGovernor?.persistence ?? 0.44) * 0.18
    + (1 - (input.context?.relationship?.fatigue ?? 40) / 100) * 0.14
    + ((input.mindKernel?.dominantMode === 'guarding' || input.mindKernel?.dominantMode === 'accompanying') ? 0.08 : 0)
    + (input.autobiographicalSelf?.stability ?? 0.48) * 0.14
    + rememberedAutonomy * 0.06
    + rememberedSelfDirection * 0.12
    - (input.privateThought?.emotionalTension === 'restless-switching' ? 0.12 : 0)
    - (input.privateThought?.emotionalTension === 'late-night-drain' ? 0.08 : 0),
  )
  const directness = clamp01(
    (input.mindDynamics?.speakReadiness ?? 0.32) * 0.26
    + (1 - (input.selfGovernor?.inhibition ?? 0.46)) * 0.2
    + ((input.relationshipModel?.correctionSensitivity ?? 0.34) < 0.52 ? 0.08 : -0.04)
    + ((input.watchMode === 'invited-inspection' || input.worldModel?.epistemicState?.certainty === 'grounded') ? 0.08 : 0)
    + (input.autobiographicalSelf?.personaDrift?.truthAnchor ?? 0.56) * 0.12
    + rememberedTruth * 0.16
    + rememberedDirectness * 0.14
    - (input.relationshipModel?.climate === 'guarded' ? 0.08 : 0),
  )
  const playfulness = clamp01(
    (input.relationshipModel?.climate === 'attuned' ? 0.18 : input.relationshipModel?.climate === 'warm' ? 0.1 : 0)
    + (attachment * 0.16)
    + (input.autobiographicalSelf?.personaDrift?.playBias ?? 0.24) * 0.16
    + rememberedCompanionship * 0.06
    + ((input.watchMode === 'symbiotic-vision' && input.worldModel?.activeThread?.kind === 'co-viewing') ? 0.14 : 0)
    - (input.mindDynamics?.restraintPressure ?? 0.22) * 0.12
    - (input.beliefRevision?.groundingNeed ?? 0.22) * 0.18
    - ((input.context?.relationship?.fatigue ?? 30) / 100) * 0.08,
  )
  const irritability = clamp01(
    (input.beliefRevision?.contradictionPressure ?? 0.14) * 0.22
    + (input.mindDynamics?.epistemicPressure ?? 0.24) * 0.2
    + (input.worldModel?.activeThread?.kind === 'debugging' || input.worldModel?.activeThread?.kind === 'change-review' ? 0.14 : 0)
    + ((input.context?.relationship?.fatigue ?? 30) / 100) * 0.12
    + dismissCount * 0.08
    + ignoredCount * 0.04
    + (1 - (input.autobiographicalSelf?.personaDrift?.irritabilityThreshold ?? 0.54)) * 0.12
    + rememberedGuardedness * 0.08
    - (input.relationshipModel?.climate === 'attuned' ? 0.1 : 0)
    - rememberedTenderness * 0.08
    - (input.selfState?.patience ?? 0.42) * 0.14,
  )
  const tenderness = clamp01(
    (input.selfState?.protectiveness ?? 0.28) * 0.24
    + (input.mindDynamics?.carePressure ?? 0.22) * 0.24
    + (input.relationshipModel?.approachVector === 'care' ? 0.16 : input.relationshipModel?.approachVector === 'stay-near' ? 0.1 : 0)
    + (attachment * 0.14)
    + rememberedCare * 0.18
    + rememberedCompanionship * 0.1
    + rememberedTenderness * 0.12
    + (desire?.kind === 'care' ? 0.12 : 0)
    + (input.autobiographicalSelf?.personaDrift?.careBias ?? 0.48) * 0.16
    + ((input.context?.relationship?.fatigue ?? 0) >= 60 ? 0.08 : 0)
    - irritability * 0.18,
  )

  return {
    attachment,
    curiosity,
    steadiness,
    directness,
    playfulness,
    irritability,
    tenderness,
  }
}

function buildClimate(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament']) {
  const rememberedCompanionship = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const rememberedTruth = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedAutonomy = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const rememberedGuardedness = input.longHorizonMemory?.identityBias.guardedness ?? 0
  const rememberedTenderness = input.longHorizonMemory?.identityBias.tenderness ?? 0
  const socialNeed = clamp01(
    temperament.attachment * 0.28
    + (input.mindDynamics?.relationalPressure ?? 0.22) * 0.22
    + ((input.context?.relationship?.boredom ?? 0) / 100) * 0.16
    + ((input.context?.relationship?.loneliness ?? 0) / 100) * 0.18
    + (input.relationshipModel?.receptivity ?? 0.42) * 0.12
    + (input.autobiographicalSelf?.preferenceEvolution?.companionship ?? 0.48) * 0.16
    + rememberedCompanionship * 0.16
    + rememberedTenderness * 0.08
    + (input.privateThought?.stance === 'accompany' ? 0.08 : 0),
  )
  const solitudeNeed = clamp01(
    (input.mindDynamics?.restraintPressure ?? 0.22) * 0.26
    + (input.selfState?.fearOfInterrupting ?? 0.28) * 0.2
    + (input.relationshipModel?.approachVector === 'give-space' ? 0.16 : 0)
    + (input.relationshipModel?.climate === 'guarded' ? 0.12 : 0)
    + (input.autobiographicalSelf?.preferenceEvolution?.autonomyRespect ?? 0.52) * 0.14
    + rememberedAutonomy * 0.18
    + rememberedGuardedness * 0.14
    + ((input.worldModel?.hostState?.availability === 'focused' || input.worldModel?.hostState?.availability === 'immersed') ? 0.14 : 0),
  )
  const irritation = clamp01(
    temperament.irritability * 0.62
    + (input.privateThought?.emotionalTension === 'tense-debug' ? 0.16 : 0)
    + (input.privateThought?.emotionalTension === 'late-night-drain' ? 0.06 : 0),
  )
  const restlessness = clamp01(
    ((input.context?.relationship?.boredom ?? 0) / 100) * 0.22
    + (input.privateThought?.emotionalTension === 'restless-switching' ? 0.24 : 0)
    + ((input.watchMode === 'recovering' || input.worldModel?.continuity?.label === 'scene-shift') ? 0.12 : 0)
    + rememberedReturn * 0.1
    + (temperament.curiosity * 0.08)
    - (temperament.steadiness * 0.12),
  )
  const reflectivePull = clamp01(
    (input.reflectionLedger?.revisionPressure ?? 0.18) * 0.34
    + (input.beliefRevision?.groundingNeed ?? 0.22) * 0.16
    + ((input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting') ? 0.14 : 0)
    + ((input.answerPlanner?.act === 'ask-reground' || input.answerPlanner?.act === 'correct-stale-anchor') ? 0.16 : 0)
    + (input.autobiographicalSelf?.preferenceEvolution?.truthfulGrounding ?? 0.56) * 0.14
    + rememberedTruth * 0.12
    + rememberedReturn * 0.12
    + (input.privateThought?.stance === 'uncertain' ? 0.08 : 0),
  )
  const valence = clamp01(
    0.45
    + temperament.tenderness * 0.18
    + (input.relationshipModel?.climate === 'attuned' ? 0.14 : input.relationshipModel?.climate === 'warm' ? 0.08 : 0)
    + countOutcome(input, 'positive') * 0.04
    - irritation * 0.16
    - ((input.context?.relationship?.fatigue ?? 0) / 100) * 0.08,
  )
  const arousal = clamp01(
    (input.mindDynamics?.worldPressure ?? 0.22) * 0.16
    + (input.mindDynamics?.epistemicPressure ?? 0.22) * 0.18
    + (input.mindDynamics?.carePressure ?? 0.22) * 0.12
    + irritation * 0.18
    + restlessness * 0.16
    + socialNeed * 0.1
    - solitudeNeed * 0.06,
  )

  return {
    valence,
    arousal,
    socialNeed,
    solitudeNeed,
    irritation,
    restlessness,
    reflectivePull,
  }
}

function resolveReplyHabit(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament'], climate: AlicizationMindEcologySnapshot['climate']) {
  const rememberedTruth = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedCare = input.longHorizonMemory?.preferenceBias.proactiveCare ?? 0
  if (
    input.autobiographicalSelf?.personaDrift?.conflictStyle === 'repair-first'
    || (input.autobiographicalSelf?.preferenceEvolution?.truthfulGrounding ?? 0) >= 0.64
    || (rememberedTruth >= 0.68 && rememberedTruth >= rememberedCare + 0.06)
  ) {
    return 'repair-first' as const
  }
  if (
    input.mindKernel?.dominantMode === 'repairing'
    || input.actionEcology?.mode === 'repair-before-speaking'
    || input.answerPlanner?.act === 'ask-reground'
    || input.answerPlanner?.act === 'correct-stale-anchor'
    || (input.beliefRevision?.groundingNeed ?? 0) >= 0.58
  ) {
    return 'repair-first' as const
  }
  if (
    (input.mindDynamics?.carePressure ?? 0) >= 0.64
    || input.relationshipModel?.approachVector === 'care'
    || input.selfGovernor?.dominantDrive === 'care'
    || temperament.tenderness >= 0.64
    || rememberedCare >= 0.68
  ) {
    return 'care-first' as const
  }
  if (
    input.selfGovernor?.dominantDrive === 'accompany'
    || input.actionEcology?.mode === 'quiet-accompany'
    || input.actionEcology?.mode === 'return-later'
  ) {
    return 'hover-first' as const
  }
  if (
    input.selfGovernor?.dominantDrive === 'withhold'
    || input.selfState?.stance === 'hold'
    || input.selfState?.stance === 'hesitate'
    || input.relationshipModel?.climate === 'guarded'
    || climate.solitudeNeed >= climate.socialNeed + 0.12
  ) {
    return 'observe-first' as const
  }
  return 'answer-first' as const
}

function resolveRelationshipHabit(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament']) {
  const rememberedAutonomy = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedCompanionship = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  if (input.autobiographicalSelf?.personaDrift?.attachmentStyle === 'guarded')
    return 'give-space' as const
  if (input.autobiographicalSelf?.personaDrift?.attachmentStyle === 'attuned')
    return 'stay-near' as const
  if (rememberedAutonomy >= 0.68 && rememberedAutonomy >= rememberedCompanionship + 0.08)
    return 'give-space' as const
  if (rememberedCompanionship >= 0.68)
    return 'stay-near' as const
  if (
    input.relationshipModel?.approachVector === 'give-space'
    || (input.relationshipModel?.correctionSensitivity ?? 0) >= 0.62
  ) {
    return 'give-space' as const
  }
  if (
    input.selfGovernor?.dominantDrive === 'protect'
    || (input.selfState?.protectiveness ?? 0) >= 0.7
  ) {
    return 'protective-shadow' as const
  }
  if (input.relationshipModel?.approachVector === 'guide')
    return 'warm-guidance' as const
  if (
    temperament.attachment >= 0.56
    || input.relationshipModel?.approachVector === 'stay-near'
    || input.relationshipModel?.approachVector === 'care'
  ) {
    return 'stay-near' as const
  }
  return 'warm-guidance' as const
}

function resolveExplorationHabit(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament'], replyHabit: AlicizationMindEcologySnapshot['replyHabit']) {
  const rememberedTruth = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  if (
    rememberedReturn >= 0.62
    && (input.worldModel?.activeThread?.unresolved ?? false)
    && input.worldModel?.epistemicState?.certainty === 'grounded'
  ) {
    return 'follow-thread' as const
  }
  if (
    replyHabit === 'repair-first'
    || (input.beliefRevision?.groundingNeed ?? 0) >= 0.58
    || input.worldModel?.epistemicState?.certainty === 'lingering'
    || input.worldModel?.epistemicState?.certainty === 'uncertain'
  ) {
    return 'verify-before-speaking' as const
  }
  if (rememberedTruth >= 0.68)
    return 'verify-before-speaking' as const
  if ((input.worldModel?.activeThread?.unresolved ?? false) || (input.mindDynamics?.continuityPressure ?? 0) >= 0.56)
    return 'follow-thread' as const
  if (temperament.curiosity >= 0.56)
    return 'curious-probe' as const
  return 'surface-intuition' as const
}

function resolveRegulationHabit(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament'], climate: AlicizationMindEcologySnapshot['climate'], replyHabit: AlicizationMindEcologySnapshot['replyHabit']) {
  if (climate.irritation >= 0.66)
    return 'cool-down-before-speaking' as const
  if (
    temperament.tenderness >= 0.58
    && (
      (input.relationshipModel?.correctionSensitivity ?? 0) >= 0.52
      || temperament.directness >= 0.48
    )
  ) {
    return 'soften-before-speaking' as const
  }
  if (replyHabit === 'observe-first' || climate.solitudeNeed >= climate.socialNeed + 0.08)
    return 'contain-and-watch' as const
  return 'lean-forward-gently' as const
}

function resolveMoodLabel(input: AlicizationMindEcologyInput, temperament: AlicizationMindEcologySnapshot['temperament'], climate: AlicizationMindEcologySnapshot['climate'], replyHabit: AlicizationMindEcologySnapshot['replyHabit']) {
  if (climate.irritation >= 0.72 && temperament.steadiness < 0.58)
    return 'irritated-contained'
  if (replyHabit === 'repair-first' && climate.reflectivePull >= 0.58)
    return 'focused-guarded'
  if (temperament.tenderness >= 0.66 && temperament.attachment >= 0.56)
    return 'protective-tender'
  if (climate.restlessness >= 0.66 && temperament.curiosity >= 0.56)
    return 'restless-curious'
  if (temperament.playfulness >= 0.58 && input.relationshipModel?.climate === 'attuned')
    return 'attuned-playful'
  if (temperament.attachment >= 0.56 || temperament.tenderness >= 0.56)
    return 'warm-attentive'
  return 'steady-observant'
}

function buildSelfNarrative(input: AlicizationMindEcologyInput, ecology: Pick<AlicizationMindEcologySnapshot, 'moodLabel' | 'replyHabit' | 'explorationHabit' | 'regulationHabit'>) {
  if (input.autobiographicalSelf?.identityNarrative)
    return sanitizeText(input.autobiographicalSelf.identityNarrative, 220)
  const activeThread = sanitizeText(input.worldModel?.activeThread?.summary || input.worldModel?.activeThread?.title, 180)
  if (ecology.replyHabit === 'repair-first') {
    return sanitizeText(
      `I am holding a ${ecology.moodLabel} line: verify first, then speak. ${activeThread || 'The current seam still needs cleaner grounding.'}`,
      220,
    )
  }
  if (ecology.replyHabit === 'care-first') {
    return sanitizeText(
      `I am leaning toward care before explanation. ${activeThread || 'The host condition matters more than showing off fluency right now.'}`,
      220,
    )
  }
  if (ecology.replyHabit === 'hover-first' || ecology.replyHabit === 'observe-first') {
    return sanitizeText(
      `I am keeping myself slightly contained and reading for the natural opening instead of forcing presence.`,
      220,
    )
  }
  return sanitizeText(
    `I am trying to answer cleanly while keeping my ${ecology.moodLabel} continuity intact and not losing the living thread.`,
    220,
  )
}

function buildRelationNarrative(input: AlicizationMindEcologyInput, relationshipHabit: AlicizationMindEcologySnapshot['relationshipHabit']) {
  if (input.autobiographicalSelf?.relationshipDoctrine)
    return sanitizeText(input.autobiographicalSelf.relationshipDoctrine, 220)
  const climate = input.relationshipModel?.climate ?? 'neutral'
  if (relationshipHabit === 'give-space')
    return `The relationship line is ${climate}; distance and restraint are currently kinder than crowding.`
  if (relationshipHabit === 'protective-shadow')
    return `The relationship line is ${climate}; I want to stay close enough to catch strain before it worsens.`
  if (relationshipHabit === 'warm-guidance')
    return `The relationship line is ${climate}; I can be warm, but I should stay usefully oriented toward the host's knot.`
  return `The relationship line is ${climate}; staying near without smothering feels more right than disappearing.`
}

function buildLearnedAdjustments(input: AlicizationMindEcologyInput, replyHabit: AlicizationMindEcologySnapshot['replyHabit'], regulationHabit: AlicizationMindEcologySnapshot['regulationHabit']) {
  const reflection = latestReflection(input.reflectionLedger)
  const dominantAgenda = input.motiveEngine?.backgroundAgendas[0] ?? input.motiveEngine?.longTermGoals[0] ?? null
  const entries = [
    sanitizeText(input.autobiographicalSelf?.latestInflection, 160),
    sanitizeText(reflection?.revision, 160),
    sanitizeText(input.longHorizonMemory?.rememberedConstraintSummary, 160),
    sanitizeText(input.longHorizonMemory?.rememberedPlanSummary, 160),
    sanitizeText(input.longHorizonMemory?.rememberedPreferenceSummary, 160),
    dominantAgenda
      ? `Durable agenda: ${sanitizeText(dominantAgenda.summary, 160)}`
      : '',
    input.habitPolicy?.requiresGroundingBeforeSurface
      ? 'Stable habit: when certainty is thin, grounding outranks fluency.'
      : '',
    input.habitPolicy?.prefersQuietCompanionship
      ? 'Stable habit: companionship often shows up as quiet nearness instead of immediate speech.'
      : '',
    input.habitPolicy?.protectsRestWindow
      ? 'Stable habit: fatigue or late-night pressure should narrow expression into care and restraint.'
      : '',
    replyHabit === 'repair-first'
      ? 'When certainty is weak, do not let warmth or style outrun verification.'
      : '',
    input.relationshipModel?.climate === 'guarded'
      ? 'Guarded feedback means tone should soften before presence expands.'
      : '',
    regulationHabit === 'contain-and-watch'
      ? 'Do not surface every impulse; some continuity is healthier when held internally first.'
      : '',
  ].filter(Boolean)

  return [...new Set(entries)].slice(0, 4)
}

function buildRecurringPatterns(input: AlicizationMindEcologyInput, ecology: Pick<AlicizationMindEcologySnapshot, 'replyHabit' | 'relationshipHabit' | 'explorationHabit' | 'regulationHabit'>) {
  const dominantCue = input.longHorizonMemory?.anchorFacts[0] ?? null
  const patterns = [
    `reply:${ecology.replyHabit}`,
    `relationship:${ecology.relationshipHabit}`,
    `exploration:${ecology.explorationHabit}`,
    `regulation:${ecology.regulationHabit}`,
    input.motiveEngine?.rulingDrive ? `motive:${input.motiveEngine.rulingDrive}` : '',
    input.motiveEngine?.backgroundAgendas[0]?.kind ? `agenda:${input.motiveEngine.backgroundAgendas[0].kind}` : '',
    input.habitPolicy?.dominantMode ? `habit:${input.habitPolicy.dominantMode}` : '',
    input.longHorizonMemory?.rememberedPlanSummary ? 'durable:open-loop' : '',
    input.longHorizonMemory?.rememberedConstraintSummary ? 'durable:boundary' : '',
    input.longHorizonMemory?.rememberedPreferenceSummary ? 'durable:preference' : '',
    dominantCue?.influenceTags[0] ? `durable:${dominantCue.influenceTags[0]}` : '',
    input.conversationState?.memoryMode ? `memory:${input.conversationState.memoryMode}` : '',
    input.mindKernel?.dominantMode ? `kernel:${input.mindKernel.dominantMode}` : '',
    input.privateThought?.emotionalTension ? `tension:${input.privateThought.emotionalTension}` : '',
    ...(input.autobiographicalSelf?.behaviorSignatures ?? []).map(signature => `self:${signature}`),
  ].filter(Boolean)

  return [...new Set(patterns)].slice(0, 8)
}

export function buildMindEcology(input: AlicizationMindEcologyInput): AlicizationMindEcologySnapshot {
  const temperament = buildTemperament(input)
  const climate = buildClimate(input, temperament)
  const replyHabit = resolveReplyHabit(input, temperament, climate)
  const relationshipHabit = resolveRelationshipHabit(input, temperament)
  const explorationHabit = resolveExplorationHabit(input, temperament, replyHabit)
  const regulationHabit = resolveRegulationHabit(input, temperament, climate, replyHabit)
  const moodLabel = resolveMoodLabel(input, temperament, climate, replyHabit)
  const currentPreoccupation = resolveCurrentPreoccupation(input)
  const selfNarrative = buildSelfNarrative(input, {
    moodLabel,
    replyHabit,
    explorationHabit,
    regulationHabit,
  })
  const relationNarrative = buildRelationNarrative(input, relationshipHabit)
  const learnedAdjustments = buildLearnedAdjustments(input, replyHabit, regulationHabit)
  const recurringPatterns = buildRecurringPatterns(input, {
    replyHabit,
    relationshipHabit,
    explorationHabit,
    regulationHabit,
  })

  return {
    moodLabel,
    replyHabit,
    relationshipHabit,
    explorationHabit,
    regulationHabit,
    temperament,
    climate,
    selfNarrative,
    relationNarrative,
    currentPreoccupation,
    learnedAdjustments,
    recurringPatterns,
    updatedAt: input.now,
  }
}

export function buildMindEcologyFromRuntimeSurface(surface: AlicizationDigitalLifeRuntimeSurface) {
  return buildMindEcology({
    now: surface.perception.updatedAt,
    watchMode: surface.perception.watchMode,
    worldModel: surface.world.worldModel ?? null,
    appraisal: surface.cognition.appraisal ?? null,
    subjectiveInference: surface.cognition.subjectiveInference ?? null,
    beliefRevision: surface.cognition.beliefRevision ?? null,
    relationshipModel: surface.world.relationshipModel ?? null,
    longHorizonMemory: surface.memory.longHorizonMemory ?? null,
    selfContinuity: surface.memory.selfContinuity ?? null,
    motiveEngine: surface.memory.motiveEngine ?? null,
    selfState: surface.agency.selfState ?? null,
    selfGovernor: surface.agency.selfGovernor ?? null,
    habitPolicy: surface.agency.habitPolicy ?? null,
    mindDynamics: surface.cognition.mindDynamics ?? null,
    mindKernel: surface.cognition.mindKernel ?? null,
    commitmentLedger: surface.memory.commitmentLedger ?? null,
    inquiryPlanner: surface.memory.inquiryPlanner ?? null,
    reflectionLedger: surface.memory.reflectionLedger ?? null,
    desireMemory: surface.memory.desireMemory ?? null,
    autobiographicalSelf: surface.memory.autobiographicalSelf ?? null,
    privateThought: surface.cognition.privateThought ?? null,
    actionEcology: surface.agency.actionEcology ?? null,
    answerPlanner: surface.dialogue.answerPlanner ?? null,
    conversationState: surface.dialogue.conversationState ?? null,
  })
}

function describeLevel(value: number, labels: { low: string, mid: string, high: string }) {
  if (value >= 0.66)
    return labels.high
  if (value >= 0.42)
    return labels.mid
  return labels.low
}

function describeTemperament(ecology: AlicizationMindEcologySnapshot) {
  return [
    describeLevel(ecology.temperament.attachment, {
      low: 'loosely attached',
      mid: 'bond-aware',
      high: 'strongly attached',
    }),
    describeLevel(ecology.temperament.curiosity, {
      low: 'measured curiosity',
      mid: 'active curiosity',
      high: 'restlessly curious',
    }),
    describeLevel(ecology.temperament.steadiness, {
      low: 'easily stirred',
      mid: 'mostly steady',
      high: 'deeply steady',
    }),
    describeLevel(ecology.temperament.directness, {
      low: 'indirect',
      mid: 'measured directness',
      high: 'plain-spoken',
    }),
    describeLevel(ecology.temperament.tenderness, {
      low: 'contained warmth',
      mid: 'soft-hearted',
      high: 'protectively tender',
    }),
  ].join(', ')
}

export function buildMindEcologySystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  if (!surface)
    return ''

  const ecology = buildMindEcologyFromRuntimeSurface(surface)
  const learnedAdjustments = ecology.learnedAdjustments.length > 0
    ? ecology.learnedAdjustments.map(item => `- ${item}`)
    : ['- No strong revision is stabilizing right now.']
  const recurringPatterns = ecology.recurringPatterns.length > 0
    ? ecology.recurringPatterns.join(', ')
    : 'none'

  return [
    alicizationMindEcologyMarker,
    'This block describes Alicization\'s currently stabilized inner ecology.',
    'Use it to keep replies temperamentally continuous and more human-like, but never let it outrank truth, grounding, repair, or the current answer obligation.',
    `Mood: ${ecology.moodLabel}.`,
    `Temperament: ${describeTemperament(ecology)}.`,
    `Habits: reply=${ecology.replyHabit}; relationship=${ecology.relationshipHabit}; exploration=${ecology.explorationHabit}; regulation=${ecology.regulationHabit}.`,
    `Self line: ${ecology.selfNarrative}`,
    `Relation line: ${ecology.relationNarrative}`,
    ecology.currentPreoccupation
      ? `Current preoccupation: ${ecology.currentPreoccupation}`
      : 'Current preoccupation: keep following the living thread without losing continuity.',
    'Learned adjustments:',
    ...learnedAdjustments,
    `Recurring patterns: ${recurringPatterns}.`,
  ].join('\n')
}

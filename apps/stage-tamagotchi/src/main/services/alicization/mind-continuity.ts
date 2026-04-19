import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  buildAutobiographicalContinuityLines,
  pickDominantAutobiographicalGoal,
} from './autobiographical-self'
import { buildMindEcology } from './mind-ecology'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

interface AlicizationMindContinuitySource {
  currentScene?: AlicizationVisualPresenceStateSnapshot['currentScene']
  livingWorldState?: AlicizationVisualPresenceStateSnapshot['livingWorldState']
  selfGovernor?: AlicizationVisualPresenceStateSnapshot['selfGovernor']
  thoughtThreads?: AlicizationVisualPresenceStateSnapshot['thoughtThreads']
  beliefRevision?: AlicizationVisualPresenceStateSnapshot['beliefRevision']
  mindDynamics?: AlicizationVisualPresenceStateSnapshot['mindDynamics']
  deliberationState?: AlicizationVisualPresenceStateSnapshot['deliberationState']
  hypothesisGraph?: AlicizationVisualPresenceStateSnapshot['hypothesisGraph']
  threadRuntime?: AlicizationVisualPresenceStateSnapshot['threadRuntime']
  commitmentLedger?: AlicizationVisualPresenceStateSnapshot['commitmentLedger']
  inquiryPlanner?: AlicizationVisualPresenceStateSnapshot['inquiryPlanner']
  concernContinuity?: AlicizationVisualPresenceStateSnapshot['concernContinuity']
  repairLedger?: AlicizationVisualPresenceStateSnapshot['repairLedger']
  intentionStream?: AlicizationVisualPresenceStateSnapshot['intentionStream']
  reflectionLedger?: AlicizationVisualPresenceStateSnapshot['reflectionLedger']
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle']
  mindKernel?: AlicizationVisualPresenceStateSnapshot['mindKernel']
  relationshipModel?: AlicizationVisualPresenceStateSnapshot['relationshipModel']
  selfContinuity?: AlicizationVisualPresenceStateSnapshot['selfContinuity']
  autobiographicalSelf?: AlicizationVisualPresenceStateSnapshot['autobiographicalSelf']
  longHorizonMemory?: AlicizationVisualPresenceStateSnapshot['longHorizonMemory']
  goalStack?: AlicizationVisualPresenceStateSnapshot['goalStack']
  motiveEngine?: AlicizationVisualPresenceStateSnapshot['motiveEngine']
  selfState?: AlicizationVisualPresenceStateSnapshot['selfState']
  conversationState?: AlicizationVisualPresenceStateSnapshot['conversationState']
  dialogueWorldThread?: AlicizationVisualPresenceStateSnapshot['dialogueWorldThread']
  replyDeliberation?: AlicizationVisualPresenceStateSnapshot['replyDeliberation']
  recallGovernor?: AlicizationVisualPresenceStateSnapshot['recallGovernor']
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner']
  actionEcology?: AlicizationVisualPresenceStateSnapshot['actionEcology']
  desireMemory?: AlicizationVisualPresenceStateSnapshot['desireMemory']
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought']
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel']
}

function resolveMindContinuitySource(
  state?: AlicizationVisualPresenceStateSnapshot | AlicizationMindContinuitySource | null,
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
): AlicizationMindContinuitySource | null {
  if (runtimeSurface) {
    return {
      currentScene: runtimeSurface.perception.currentScene ?? null,
      livingWorldState: runtimeSurface.world.livingWorldState ?? null,
      selfGovernor: runtimeSurface.agency.selfGovernor ?? null,
      thoughtThreads: runtimeSurface.memory.thoughtThreads ?? null,
      beliefRevision: runtimeSurface.cognition.beliefRevision ?? null,
      mindDynamics: runtimeSurface.cognition.mindDynamics ?? null,
      deliberationState: runtimeSurface.agency.deliberationState ?? null,
      hypothesisGraph: runtimeSurface.cognition.hypothesisGraph ?? null,
      threadRuntime: runtimeSurface.memory.threadRuntime ?? null,
      commitmentLedger: runtimeSurface.memory.commitmentLedger ?? null,
      inquiryPlanner: runtimeSurface.memory.inquiryPlanner ?? null,
      concernContinuity: runtimeSurface.memory.concernContinuity ?? null,
      repairLedger: runtimeSurface.memory.repairLedger ?? null,
      intentionStream: runtimeSurface.memory.intentionStream ?? null,
      reflectionLedger: runtimeSurface.memory.reflectionLedger ?? null,
      executiveCycle: runtimeSurface.memory.executiveCycle ?? null,
      mindKernel: runtimeSurface.cognition.mindKernel ?? null,
      relationshipModel: runtimeSurface.world.relationshipModel ?? null,
      selfContinuity: runtimeSurface.memory.selfContinuity ?? null,
      autobiographicalSelf: runtimeSurface.memory.autobiographicalSelf ?? null,
      longHorizonMemory: runtimeSurface.memory.longHorizonMemory ?? null,
      goalStack: runtimeSurface.memory.goalStack ?? null,
      motiveEngine: runtimeSurface.memory.motiveEngine ?? null,
      selfState: runtimeSurface.agency.selfState ?? null,
      conversationState: runtimeSurface.dialogue.conversationState ?? null,
      dialogueWorldThread: runtimeSurface.dialogue.dialogueWorldThread ?? null,
      replyDeliberation: runtimeSurface.dialogue.replyDeliberation ?? null,
      recallGovernor: runtimeSurface.memory.recallGovernor ?? null,
      answerPlanner: runtimeSurface.dialogue.answerPlanner ?? null,
      actionEcology: runtimeSurface.agency.actionEcology ?? null,
      desireMemory: runtimeSurface.memory.desireMemory ?? null,
      privateThought: runtimeSurface.cognition.privateThought ?? null,
      worldModel: runtimeSurface.world.worldModel ?? null,
    }
  }

  return state ?? null
}

function primaryThread(state: AlicizationMindContinuitySource | null | undefined) {
  if (state?.threadRuntime) {
    const runtimeThread = state.threadRuntime.threads.find(thread => thread.id === state.threadRuntime?.foregroundThreadId)
      ?? state.threadRuntime.threads[0]
    if (runtimeThread)
      return runtimeThread
  }
  if (!state?.deliberationState)
    return null
  return state.deliberationState.threads.find(thread => thread.id === state.deliberationState?.primaryThreadId)
    ?? state.deliberationState.threads[0]
    ?? null
}

function threadKindLabel(thread: ReturnType<typeof primaryThread>) {
  if (!thread)
    return ''
  if ('kind' in thread)
    return thread.kind
  return ''
}

function runtimeNeedLabel(thread: ReturnType<typeof primaryThread>) {
  if (!thread)
    return ''
  if ('need' in thread)
    return thread.need
  return ''
}

function resolveMindContinuityTimestamp(state: AlicizationMindContinuitySource | null | undefined) {
  return Number(
    state?.answerPlanner?.updatedAt
    ?? state?.conversationState?.updatedAt
    ?? state?.privateThought?.expiresAt
    ?? state?.worldModel?.updatedAt
    ?? state?.currentScene?.lastSeenAt
    ?? 0,
  )
}

function buildMindContinuityEcology(state: AlicizationMindContinuitySource | null | undefined) {
  if (!state)
    return null
  return buildMindEcology({
    now: resolveMindContinuityTimestamp(state),
    worldModel: state.worldModel ?? null,
    beliefRevision: state.beliefRevision ?? null,
    relationshipModel: state.relationshipModel ?? null,
    selfContinuity: state.selfContinuity ?? null,
    autobiographicalSelf: state.autobiographicalSelf ?? null,
    selfState: state.selfState ?? null,
    selfGovernor: state.selfGovernor ?? null,
    mindDynamics: state.mindDynamics ?? null,
    mindKernel: state.mindKernel ?? null,
    commitmentLedger: state.commitmentLedger ?? null,
    inquiryPlanner: state.inquiryPlanner ?? null,
    reflectionLedger: state.reflectionLedger ?? null,
    desireMemory: state.desireMemory ?? null,
    privateThought: state.privateThought ?? null,
    actionEcology: state.actionEcology ?? null,
    answerPlanner: state.answerPlanner ?? null,
    conversationState: state.conversationState ?? null,
  })
}

function continuitySignature(state: AlicizationMindContinuitySource | null | undefined) {
  const thread = primaryThread(state)
  const ecology = buildMindContinuityEcology(state)
  const dominantAutobiographicalGoal = pickDominantAutobiographicalGoal(state?.autobiographicalSelf)
  const autobiographicalContinuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: state?.autobiographicalSelf ?? null,
    longHorizonMemory: state?.longHorizonMemory ?? null,
    goalStack: state?.goalStack ?? null,
    desireMemory: state?.desireMemory ?? null,
    privateThought: state?.privateThought ?? null,
    mindEcology: ecology,
  })
  return [
    state?.livingWorldState?.focusObjectId ?? 'none',
    state?.selfGovernor?.dominantIntentionId ?? 'none',
    state?.selfGovernor?.dominantDrive ?? 'none',
    state?.thoughtThreads?.foregroundThreadId ?? 'none',
    state?.beliefRevision?.stability ?? 'none',
    state?.deliberationState?.dominantNeed ?? 'none',
    state?.hypothesisGraph?.activeHypothesisId ?? 'none',
    state?.threadRuntime?.foregroundThreadId ?? 'none',
    state?.commitmentLedger?.governingCommitmentId ?? 'none',
    state?.inquiryPlanner?.activePlanId ?? 'none',
    state?.concernContinuity?.governingEntryId ?? 'none',
    state?.repairLedger?.governingRepairId ?? 'none',
    state?.intentionStream?.dominantProjectId ?? 'none',
    state?.reflectionLedger?.latestEntryId ?? 'none',
    state?.executiveCycle?.phase ?? 'none',
    state?.mindKernel?.dominantMode ?? 'none',
    state?.conversationState?.continuityPolicy ?? 'none',
    state?.conversationState?.memoryMode ?? 'none',
    state?.dialogueWorldThread?.lastOutcome ?? 'none',
    state?.dialogueWorldThread?.relationDrift ?? 'none',
    state?.replyDeliberation?.selectedMotive ?? 'none',
    state?.replyDeliberation?.speakingFrom ?? 'none',
    state?.recallGovernor?.mode ?? 'none',
    state?.answerPlanner?.act ?? 'none',
    state?.answerPlanner?.evidenceMode ?? 'none',
    thread?.id ?? 'none',
    state?.actionEcology?.mode ?? 'none',
    state?.privateThought?.emotionalTension ?? 'none',
    state?.privateThought?.stance ?? 'none',
    ecology?.moodLabel ?? 'none',
    ecology?.replyHabit ?? 'none',
    ecology?.relationshipHabit ?? 'none',
    ecology?.explorationHabit ?? 'none',
    ecology?.regulationHabit ?? 'none',
    sanitizeText(ecology?.currentPreoccupation ?? '', 96) || 'none',
    state?.autobiographicalSelf?.personaDrift.attachmentStyle ?? 'none',
    state?.autobiographicalSelf?.personaDrift.conflictStyle ?? 'none',
    state?.autobiographicalSelf?.personaDrift.agencyStyle ?? 'none',
    dominantAutobiographicalGoal?.kind ?? 'none',
    sanitizeText(state?.autobiographicalSelf?.behaviorSignatures.join('|') ?? '', 96) || 'none',
    sanitizeText(state?.autobiographicalSelf?.identityNarrative ?? '', 96) || 'none',
    sanitizeText(autobiographicalContinuityLines.join('|'), 120) || 'none',
  ].join('::')
}

// This layer turns a living mind transition into searchable subconscious text,
// so Alicization can later recall not just what was on screen, but what inner
// posture she was holding toward that moment.
export function buildMindContinuityFragment(input: {
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  nextState?: AlicizationVisualPresenceStateSnapshot | null
  previousRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  nextRuntimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}) {
  const previousState = resolveMindContinuitySource(input.previousState, input.previousRuntimeSurface)
  const nextState = resolveMindContinuitySource(input.nextState, input.nextRuntimeSurface)
  if (!nextState)
    return ''

  const previousSignature = continuitySignature(previousState)
  const nextSignature = continuitySignature(nextState)
  if (previousSignature === nextSignature)
    return ''

  const thread = primaryThread(nextState)
  const activeHypothesis = nextState.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === nextState.hypothesisGraph?.activeHypothesisId)
    ?? null
  const governingCommitment = nextState.commitmentLedger?.commitments.find(commitment => commitment.id === nextState.commitmentLedger?.governingCommitmentId)
    ?? null
  const activePlan = nextState.inquiryPlanner?.plans.find(plan => plan.id === nextState.inquiryPlanner?.activePlanId)
    ?? null
  const governingConcernContinuity = nextState.concernContinuity?.entries.find(entry => entry.id === nextState.concernContinuity?.governingEntryId)
    ?? null
  const governingRepair = nextState.repairLedger?.entries.find(entry => entry.id === nextState.repairLedger?.governingRepairId)
    ?? null
  const dominantProject = nextState.intentionStream?.projects.find(project => project.id === nextState.intentionStream?.dominantProjectId)
    ?? nextState.intentionStream?.projects[0]
    ?? null
  const latestReflection = nextState.reflectionLedger?.entries.find(entry => entry.id === nextState.reflectionLedger?.latestEntryId)
    ?? nextState.reflectionLedger?.entries[0]
    ?? null
  const dominantIntention = nextState.selfGovernor?.activeIntentions.find(intention => intention.id === nextState.selfGovernor?.dominantIntentionId)
    ?? null
  const thoughtThread = nextState.thoughtThreads?.threads.find(candidate => candidate.id === nextState.thoughtThreads?.foregroundThreadId)
    ?? nextState.thoughtThreads?.threads[0]
    ?? null
  const ecology = buildMindContinuityEcology(nextState)
  const dominantAutobiographicalGoal = pickDominantAutobiographicalGoal(nextState.autobiographicalSelf)
  const autobiographicalContinuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: nextState.autobiographicalSelf ?? null,
    longHorizonMemory: nextState.longHorizonMemory ?? null,
    goalStack: nextState.goalStack ?? null,
    desireMemory: nextState.desireMemory ?? null,
    privateThought: nextState.privateThought ?? null,
    mindEcology: ecology,
  })
  const summary = sanitizeText(
    autobiographicalContinuityLines[0]
    || nextState.longHorizonMemory?.rememberedPlanSummary
    || nextState.longHorizonMemory?.rememberedConstraintSummary
    || nextState.motiveEngine?.backgroundAgendas[0]?.summary
    || thoughtThread?.summary
    || dominantIntention?.summary
    || governingCommitment?.summary
    || activePlan?.question
    || governingConcernContinuity?.summary
    || governingRepair?.summary
    || latestReflection?.revision
    || dominantProject?.summary
    || nextState.executiveCycle?.currentLine
    || nextState.dialogueWorldThread?.activeThread
    || nextState.dialogueWorldThread?.currentQuestion
    || nextState.answerPlanner?.governingFocus
    || nextState.replyDeliberation?.whyThisReplyNow
    || nextState.conversationState?.jointThread
    || nextState.actionEcology?.why
    || dominantAutobiographicalGoal?.summary
    || nextState.autobiographicalSelf?.latestInflection
    || ecology?.currentPreoccupation
    || ecology?.selfNarrative
    || ecology?.relationNarrative
    || nextState.autobiographicalSelf?.identityNarrative
    || activeHypothesis?.summary
    || thread?.summary
    || nextState.privateThought?.thoughtText
    || nextState.worldModel?.activeThread?.summary
    || nextState.currentScene?.summary
    || '',
    220,
  )
  if (!summary)
    return ''

  return [
    nextState.livingWorldState?.focusObjectId ? `living_world_focus:${nextState.livingWorldState.focusObjectId}` : '',
    nextState.livingWorldState?.stability ? `living_world_stability:${nextState.livingWorldState.stability}` : '',
    nextState.selfGovernor?.dominantDrive ? `governor_drive:${nextState.selfGovernor.dominantDrive}` : '',
    dominantIntention?.kind ? `governor_intention:${dominantIntention.kind}` : '',
    thoughtThread?.kind ? `thought_thread:${thoughtThread.kind}/${thoughtThread.status}` : '',
    nextState.beliefRevision?.stability ? `belief_stability:${nextState.beliefRevision.stability}` : '',
    nextState.deliberationState?.dominantNeed ? `mind_need:${nextState.deliberationState.dominantNeed}` : '',
    activeHypothesis?.kind ? `hypothesis:${activeHypothesis.kind}` : '',
    nextState.threadRuntime?.foregroundThreadId ? `runtime_thread:${nextState.threadRuntime.foregroundThreadId}` : '',
    governingCommitment?.kind ? `commitment:${governingCommitment.kind}` : '',
    activePlan?.kind ? `inquiry_plan:${activePlan.kind}` : '',
    governingConcernContinuity?.kind ? `concern_continuity:${governingConcernContinuity.kind}/${governingConcernContinuity.status}` : '',
    governingRepair?.kind ? `repair_ledger:${governingRepair.kind}/${governingRepair.status}` : '',
    dominantProject?.kind ? `mind_project:${dominantProject.kind}/${dominantProject.status}` : '',
    latestReflection?.outcome ? `reflection:${latestReflection.outcome}` : '',
    nextState.executiveCycle?.phase ? `executive_phase:${nextState.executiveCycle.phase}` : '',
    nextState.mindKernel?.dominantMode ? `mind_kernel:${nextState.mindKernel.dominantMode}` : '',
    nextState.conversationState?.continuityPolicy ? `conversation_policy:${nextState.conversationState.continuityPolicy}` : '',
    nextState.conversationState?.memoryMode ? `conversation_memory:${nextState.conversationState.memoryMode}` : '',
    nextState.dialogueWorldThread?.lastOutcome ? `dialogue_outcome:${nextState.dialogueWorldThread.lastOutcome}` : '',
    nextState.dialogueWorldThread?.relationDrift ? `dialogue_relation:${nextState.dialogueWorldThread.relationDrift}` : '',
    nextState.replyDeliberation?.selectedMotive ? `reply_motive:${nextState.replyDeliberation.selectedMotive}` : '',
    nextState.replyDeliberation?.speakingFrom ? `reply_from:${nextState.replyDeliberation.speakingFrom}` : '',
    nextState.recallGovernor?.mode ? `recall_mode:${nextState.recallGovernor.mode}` : '',
    nextState.answerPlanner?.act ? `answer_act:${nextState.answerPlanner.act}` : '',
    nextState.answerPlanner?.evidenceMode ? `answer_evidence:${nextState.answerPlanner.evidenceMode}` : '',
    nextState.actionEcology?.mode ? `action_ecology:${nextState.actionEcology.mode}` : '',
    nextState.privateThought?.emotionalTension ? `emotional_tension:${nextState.privateThought.emotionalTension}` : '',
    nextState.autobiographicalSelf?.stability != null ? `autobio_stability:${nextState.autobiographicalSelf.stability.toFixed(2)}` : '',
    dominantAutobiographicalGoal?.kind ? `autobio_goal:${dominantAutobiographicalGoal.kind}/${dominantAutobiographicalGoal.status}` : '',
    nextState.autobiographicalSelf?.personaDrift.attachmentStyle ? `autobio_bond:${nextState.autobiographicalSelf.personaDrift.attachmentStyle}` : '',
    nextState.autobiographicalSelf?.personaDrift.conflictStyle ? `autobio_conflict:${nextState.autobiographicalSelf.personaDrift.conflictStyle}` : '',
    nextState.autobiographicalSelf?.personaDrift.agencyStyle ? `autobio_agency:${nextState.autobiographicalSelf.personaDrift.agencyStyle}` : '',
    nextState.autobiographicalSelf?.behaviorSignatures[0] ? `autobio_signature:${sanitizeText(nextState.autobiographicalSelf.behaviorSignatures[0], 96)}` : '',
    nextState.autobiographicalSelf?.latestInflection ? `autobio_inflection:${sanitizeText(nextState.autobiographicalSelf.latestInflection, 120)}` : '',
    nextState.longHorizonMemory?.rememberedPlanSummary ? `durable_plan:${sanitizeText(nextState.longHorizonMemory.rememberedPlanSummary, 120)}` : '',
    nextState.longHorizonMemory?.rememberedConstraintSummary ? `durable_constraint:${sanitizeText(nextState.longHorizonMemory.rememberedConstraintSummary, 120)}` : '',
    nextState.longHorizonMemory?.rememberedPreferenceSummary ? `durable_preference:${sanitizeText(nextState.longHorizonMemory.rememberedPreferenceSummary, 120)}` : '',
    nextState.motiveEngine?.backgroundAgendas[0]?.summary ? `motive_agenda:${sanitizeText(nextState.motiveEngine.backgroundAgendas[0].summary, 120)}` : '',
    autobiographicalContinuityLines[0] ? `autobio_line:${sanitizeText(autobiographicalContinuityLines[0], 120)}` : '',
    ecology?.moodLabel ? `ecology_mood:${ecology.moodLabel}` : '',
    ecology?.replyHabit ? `ecology_reply:${ecology.replyHabit}` : '',
    ecology?.relationshipHabit ? `ecology_relationship:${ecology.relationshipHabit}` : '',
    ecology?.explorationHabit ? `ecology_exploration:${ecology.explorationHabit}` : '',
    ecology?.regulationHabit ? `ecology_regulation:${ecology.regulationHabit}` : '',
    threadKindLabel(thread) ? `thread_kind:${threadKindLabel(thread)}` : '',
    runtimeNeedLabel(thread) ? `runtime_need:${runtimeNeedLabel(thread)}` : '',
    `summary:${summary}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function buildMindContinuityRecallSeed(
  stateOrSurface: AlicizationVisualPresenceStateSnapshot | AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  const state = resolveMindContinuitySource(
    stateOrSurface && 'version' in stateOrSurface
      ? undefined
      : stateOrSurface ?? null,
    stateOrSurface && 'version' in stateOrSurface
      ? stateOrSurface
      : null,
  )
  const thread = primaryThread(state)
  const activeHypothesis = state?.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === state.hypothesisGraph?.activeHypothesisId)
    ?? null
  const governingCommitment = state?.commitmentLedger?.commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
    ?? null
  const activePlan = state?.inquiryPlanner?.plans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
    ?? null
  const governingConcernContinuity = state?.concernContinuity?.entries.find(entry => entry.id === state.concernContinuity?.governingEntryId)
    ?? null
  const governingRepair = state?.repairLedger?.entries.find(entry => entry.id === state.repairLedger?.governingRepairId)
    ?? null
  const dominantProject = state?.intentionStream?.projects.find(project => project.id === state.intentionStream?.dominantProjectId)
    ?? state?.intentionStream?.projects[0]
    ?? null
  const latestReflection = state?.reflectionLedger?.entries.find(entry => entry.id === state.reflectionLedger?.latestEntryId)
    ?? state?.reflectionLedger?.entries[0]
    ?? null
  const dominantIntention = state?.selfGovernor?.activeIntentions.find(intention => intention.id === state.selfGovernor?.dominantIntentionId)
    ?? null
  const thoughtThread = state?.thoughtThreads?.threads.find(candidate => candidate.id === state.thoughtThreads?.foregroundThreadId)
    ?? state?.thoughtThreads?.threads[0]
    ?? null
  const ecology = buildMindContinuityEcology(state)
  const dominantAutobiographicalGoal = pickDominantAutobiographicalGoal(state?.autobiographicalSelf)
  const autobiographicalContinuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: state?.autobiographicalSelf ?? null,
    longHorizonMemory: state?.longHorizonMemory ?? null,
    goalStack: state?.goalStack ?? null,
    desireMemory: state?.desireMemory ?? null,
    privateThought: state?.privateThought ?? null,
    mindEcology: ecology,
  })
  return [
    sanitizeText(thread?.summary ?? '', 180),
    state?.livingWorldState?.focusObjectId ? `living_world_focus:${state.livingWorldState.focusObjectId}` : '',
    state?.livingWorldState?.stability ? `living_world_stability:${state.livingWorldState.stability}` : '',
    state?.selfGovernor?.dominantDrive ? `governor_drive:${state.selfGovernor.dominantDrive}` : '',
    dominantIntention?.kind ? `governor_intention:${dominantIntention.kind}` : '',
    thoughtThread?.kind ? `thought_thread:${thoughtThread.kind}/${thoughtThread.status}` : '',
    state?.deliberationState?.dominantNeed ? `mind_need:${state.deliberationState.dominantNeed}` : '',
    activeHypothesis?.kind ? `hypothesis:${activeHypothesis.kind}` : '',
    state?.threadRuntime?.foregroundThreadId ? `runtime_thread:${state.threadRuntime.foregroundThreadId}` : '',
    governingCommitment?.kind ? `commitment:${governingCommitment.kind}` : '',
    activePlan?.kind ? `inquiry_plan:${activePlan.kind}` : '',
    governingConcernContinuity?.kind ? `concern_continuity:${governingConcernContinuity.kind}/${governingConcernContinuity.status}` : '',
    governingRepair?.kind ? `repair_ledger:${governingRepair.kind}/${governingRepair.status}` : '',
    dominantProject?.kind ? `mind_project:${dominantProject.kind}/${dominantProject.status}` : '',
    latestReflection?.outcome ? `reflection:${latestReflection.outcome}` : '',
    state?.executiveCycle?.phase ? `executive_phase:${state.executiveCycle.phase}` : '',
    state?.conversationState?.jointThread ? sanitizeText(state.conversationState.jointThread, 180) : '',
    state?.conversationState?.unansweredQuestion ? sanitizeText(state.conversationState.unansweredQuestion, 180) : '',
    state?.conversationState?.memoryMode ? `conversation_memory:${state.conversationState.memoryMode}` : '',
    state?.dialogueWorldThread?.activeThread ? sanitizeText(state.dialogueWorldThread.activeThread, 180) : '',
    state?.dialogueWorldThread?.currentQuestion ? sanitizeText(state.dialogueWorldThread.currentQuestion, 180) : '',
    state?.dialogueWorldThread?.lastOutcome ? `dialogue_outcome:${state.dialogueWorldThread.lastOutcome}` : '',
    state?.replyDeliberation?.selectedMotive ? `reply_motive:${state.replyDeliberation.selectedMotive}` : '',
    state?.replyDeliberation?.speakingFrom ? `reply_from:${state.replyDeliberation.speakingFrom}` : '',
    state?.recallGovernor?.mode ? `recall_mode:${state.recallGovernor.mode}` : '',
    state?.answerPlanner?.act ? `answer_act:${state.answerPlanner.act}` : '',
    state?.answerPlanner?.evidenceMode ? `answer_evidence:${state.answerPlanner.evidenceMode}` : '',
    state?.mindKernel?.dominantMode ? `mind_kernel:${state.mindKernel.dominantMode}` : '',
    state?.actionEcology?.mode ? `action_ecology:${state.actionEcology.mode}` : '',
    state?.beliefRevision?.stability ? `belief_stability:${state.beliefRevision.stability}` : '',
    state?.privateThought?.emotionalTension ? `emotional_tension:${state.privateThought.emotionalTension}` : '',
    state?.autobiographicalSelf?.stability != null ? `autobio_stability:${state.autobiographicalSelf.stability.toFixed(2)}` : '',
    dominantAutobiographicalGoal?.kind ? `autobio_goal:${dominantAutobiographicalGoal.kind}/${dominantAutobiographicalGoal.status}` : '',
    state?.autobiographicalSelf?.personaDrift.attachmentStyle ? `autobio_bond:${state.autobiographicalSelf.personaDrift.attachmentStyle}` : '',
    state?.autobiographicalSelf?.personaDrift.conflictStyle ? `autobio_conflict:${state.autobiographicalSelf.personaDrift.conflictStyle}` : '',
    state?.autobiographicalSelf?.personaDrift.agencyStyle ? `autobio_agency:${state.autobiographicalSelf.personaDrift.agencyStyle}` : '',
    state?.autobiographicalSelf?.behaviorSignatures[0] ? `autobio_signature:${sanitizeText(state.autobiographicalSelf.behaviorSignatures[0], 96)}` : '',
    state?.autobiographicalSelf?.identityNarrative ? sanitizeText(state.autobiographicalSelf.identityNarrative, 180) : '',
    state?.autobiographicalSelf?.latestInflection ? sanitizeText(state.autobiographicalSelf.latestInflection, 180) : '',
    state?.longHorizonMemory?.rememberedPlanSummary ? sanitizeText(state.longHorizonMemory.rememberedPlanSummary, 180) : '',
    state?.longHorizonMemory?.rememberedConstraintSummary ? sanitizeText(state.longHorizonMemory.rememberedConstraintSummary, 180) : '',
    state?.longHorizonMemory?.rememberedPreferenceSummary ? sanitizeText(state.longHorizonMemory.rememberedPreferenceSummary, 180) : '',
    state?.motiveEngine?.backgroundAgendas[0]?.summary ? sanitizeText(state.motiveEngine.backgroundAgendas[0].summary, 180) : '',
    ...autobiographicalContinuityLines.map(line => sanitizeText(line, 180)),
    ecology?.moodLabel ? `ecology_mood:${ecology.moodLabel}` : '',
    ecology?.replyHabit ? `ecology_reply:${ecology.replyHabit}` : '',
    ecology?.relationshipHabit ? `ecology_relationship:${ecology.relationshipHabit}` : '',
    ecology?.currentPreoccupation ? sanitizeText(ecology.currentPreoccupation, 180) : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

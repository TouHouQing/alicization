import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function primaryThread(state: AlicizationVisualPresenceStateSnapshot | null | undefined) {
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

function continuitySignature(state: AlicizationVisualPresenceStateSnapshot | null | undefined) {
  const thread = primaryThread(state)
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
  ].join('::')
}

// This layer turns a living mind transition into searchable subconscious text,
// so Alicization can later recall not just what was on screen, but what inner
// posture she was holding toward that moment.
export function buildMindContinuityFragment(input: {
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  nextState: AlicizationVisualPresenceStateSnapshot
}) {
  const previousSignature = continuitySignature(input.previousState)
  const nextSignature = continuitySignature(input.nextState)
  if (previousSignature === nextSignature)
    return ''

  const thread = primaryThread(input.nextState)
  const activeHypothesis = input.nextState.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.nextState.hypothesisGraph?.activeHypothesisId)
    ?? null
  const governingCommitment = input.nextState.commitmentLedger?.commitments.find(commitment => commitment.id === input.nextState.commitmentLedger?.governingCommitmentId)
    ?? null
  const activePlan = input.nextState.inquiryPlanner?.plans.find(plan => plan.id === input.nextState.inquiryPlanner?.activePlanId)
    ?? null
  const governingConcernContinuity = input.nextState.concernContinuity?.entries.find(entry => entry.id === input.nextState.concernContinuity?.governingEntryId)
    ?? null
  const governingRepair = input.nextState.repairLedger?.entries.find(entry => entry.id === input.nextState.repairLedger?.governingRepairId)
    ?? null
  const dominantProject = input.nextState.intentionStream?.projects.find(project => project.id === input.nextState.intentionStream?.dominantProjectId)
    ?? input.nextState.intentionStream?.projects[0]
    ?? null
  const latestReflection = input.nextState.reflectionLedger?.entries.find(entry => entry.id === input.nextState.reflectionLedger?.latestEntryId)
    ?? input.nextState.reflectionLedger?.entries[0]
    ?? null
  const dominantIntention = input.nextState.selfGovernor?.activeIntentions.find(intention => intention.id === input.nextState.selfGovernor?.dominantIntentionId)
    ?? null
  const thoughtThread = input.nextState.thoughtThreads?.threads.find(candidate => candidate.id === input.nextState.thoughtThreads?.foregroundThreadId)
    ?? input.nextState.thoughtThreads?.threads[0]
    ?? null
  const summary = sanitizeText(
    thoughtThread?.summary
    || dominantIntention?.summary
    || governingCommitment?.summary
    || activePlan?.question
    || governingConcernContinuity?.summary
    || governingRepair?.summary
    || latestReflection?.revision
    || dominantProject?.summary
    || input.nextState.executiveCycle?.currentLine
    || input.nextState.dialogueWorldThread?.activeThread
    || input.nextState.dialogueWorldThread?.currentQuestion
    || input.nextState.answerPlanner?.governingFocus
    || input.nextState.replyDeliberation?.whyThisReplyNow
    || input.nextState.conversationState?.jointThread
    || input.nextState.actionEcology?.why
    || activeHypothesis?.summary
    || thread?.summary
    || input.nextState.privateThought?.thoughtText
    || input.nextState.worldModel?.activeThread?.summary
    || input.nextState.currentScene?.summary
    || '',
    220,
  )
  if (!summary)
    return ''

  return [
    input.nextState.livingWorldState?.focusObjectId ? `living_world_focus:${input.nextState.livingWorldState.focusObjectId}` : '',
    input.nextState.livingWorldState?.stability ? `living_world_stability:${input.nextState.livingWorldState.stability}` : '',
    input.nextState.selfGovernor?.dominantDrive ? `governor_drive:${input.nextState.selfGovernor.dominantDrive}` : '',
    dominantIntention?.kind ? `governor_intention:${dominantIntention.kind}` : '',
    thoughtThread?.kind ? `thought_thread:${thoughtThread.kind}/${thoughtThread.status}` : '',
    input.nextState.beliefRevision?.stability ? `belief_stability:${input.nextState.beliefRevision.stability}` : '',
    input.nextState.deliberationState?.dominantNeed ? `mind_need:${input.nextState.deliberationState.dominantNeed}` : '',
    activeHypothesis?.kind ? `hypothesis:${activeHypothesis.kind}` : '',
    input.nextState.threadRuntime?.foregroundThreadId ? `runtime_thread:${input.nextState.threadRuntime.foregroundThreadId}` : '',
    governingCommitment?.kind ? `commitment:${governingCommitment.kind}` : '',
    activePlan?.kind ? `inquiry_plan:${activePlan.kind}` : '',
    governingConcernContinuity?.kind ? `concern_continuity:${governingConcernContinuity.kind}/${governingConcernContinuity.status}` : '',
    governingRepair?.kind ? `repair_ledger:${governingRepair.kind}/${governingRepair.status}` : '',
    dominantProject?.kind ? `mind_project:${dominantProject.kind}/${dominantProject.status}` : '',
    latestReflection?.outcome ? `reflection:${latestReflection.outcome}` : '',
    input.nextState.executiveCycle?.phase ? `executive_phase:${input.nextState.executiveCycle.phase}` : '',
    input.nextState.mindKernel?.dominantMode ? `mind_kernel:${input.nextState.mindKernel.dominantMode}` : '',
    input.nextState.conversationState?.continuityPolicy ? `conversation_policy:${input.nextState.conversationState.continuityPolicy}` : '',
    input.nextState.conversationState?.memoryMode ? `conversation_memory:${input.nextState.conversationState.memoryMode}` : '',
    input.nextState.dialogueWorldThread?.lastOutcome ? `dialogue_outcome:${input.nextState.dialogueWorldThread.lastOutcome}` : '',
    input.nextState.dialogueWorldThread?.relationDrift ? `dialogue_relation:${input.nextState.dialogueWorldThread.relationDrift}` : '',
    input.nextState.replyDeliberation?.selectedMotive ? `reply_motive:${input.nextState.replyDeliberation.selectedMotive}` : '',
    input.nextState.replyDeliberation?.speakingFrom ? `reply_from:${input.nextState.replyDeliberation.speakingFrom}` : '',
    input.nextState.recallGovernor?.mode ? `recall_mode:${input.nextState.recallGovernor.mode}` : '',
    input.nextState.answerPlanner?.act ? `answer_act:${input.nextState.answerPlanner.act}` : '',
    input.nextState.answerPlanner?.evidenceMode ? `answer_evidence:${input.nextState.answerPlanner.evidenceMode}` : '',
    input.nextState.actionEcology?.mode ? `action_ecology:${input.nextState.actionEcology.mode}` : '',
    input.nextState.privateThought?.emotionalTension ? `emotional_tension:${input.nextState.privateThought.emotionalTension}` : '',
    threadKindLabel(thread) ? `thread_kind:${threadKindLabel(thread)}` : '',
    runtimeNeedLabel(thread) ? `runtime_need:${runtimeNeedLabel(thread)}` : '',
    `summary:${summary}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function buildMindContinuityRecallSeed(state: AlicizationVisualPresenceStateSnapshot | null | undefined) {
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
  ]
    .filter(Boolean)
    .join(' | ')
}

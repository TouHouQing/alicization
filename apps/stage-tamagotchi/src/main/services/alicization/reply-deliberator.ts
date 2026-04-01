import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationReplyMotive,
  AlicizationReplyMotiveSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'

import { pickDialogueSurfaceText, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function pickDialogueAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function resolvePrimaryReplyAnchor(input: {
  conversationState: AlicizationConversationStateSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
}) {
  return pickDialogueAnchorText(
    input.conversationState.primaryTurnAnchor,
    input.discourseState.primaryTurnAnchor,
    input.dialogueEncounter?.taskAnchor,
    input.dialogueEncounter?.summary,
    input.conversationState.hostMove,
    input.answerCompiler.openingClaim,
  )
}

function isDialogueFirstReplyTurn(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
}) {
  const subject = input.dialogueEncounter?.subject
    ?? input.answerCompiler.answerSubject
    ?? input.discourseState.currentTurnSubject
  return input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || subject === 'relationship'
    || subject === 'alicization-self'
    || subject === 'host-state'
    || subject === 'general'
}

function makeMotive(input: {
  kind: AlicizationReplyMotive
  summary?: string | null
  weight: number
  sourceTags?: string[]
}) {
  const summary = sanitizeDialogueSurfaceText(input.summary, 180)
  if (!summary)
    return null
  return {
    kind: input.kind,
    summary,
    weight: clamp01(input.weight),
    sourceTags: (input.sourceTags ?? []).map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6),
  } satisfies AlicizationReplyMotiveSnapshot
}

function speakingFrom(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'live-scene' as const
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.evidenceMode === 'repair-first')
    return 'held-memory' as const
  if (input.discourseState.currentTurnSubject === 'task-knot')
    return 'task-thread' as const
  if (input.discourseState.currentTurnSubject === 'relationship' || input.discourseState.currentTurnSubject === 'host-state')
    return 'dialogue-bond' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'self-continuity' as const
  return 'task-thread' as const
}

function repairIsAlreadySettledByFreshGrounding(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot
  discourseState: AlicizationDiscourseStateSnapshot
}) {
  return input.answerCompiler.evidenceMode === 'live-grounded'
    && input.answerCompiler.turnMode !== 'screen-repair'
    && input.answerCompiler.screenReferenceMode !== 'avoid'
    && (
      input.discourseState.currentTurnSubject === 'visible-scene'
      || input.discourseState.currentTurnSubject === 'task-knot'
    )
}

function openingBeat(input: {
  selectedMotive: AlicizationReplyMotive
  answerCompiler: AlicizationAnswerCompilerSnapshot
  conversationState: AlicizationConversationStateSnapshot
}) {
  switch (input.selectedMotive) {
    case 'repair':
      return 'Correct the stale read first.'
    case 'guide':
      return 'Start with the concrete issue in front of you.'
    case 'care':
      return 'Answer the host\'s current state directly and stay close to this turn.'
    case 'attune':
      return 'Answer the host\'s question about Alicization directly.'
    case 'witness':
      return 'Start from what is visible right now.'
    case 'defer':
      return 'Keep the reply brief and low-pressure.'
    default: {
      const directive = sanitizeDialogueSurfaceText(input.answerCompiler.openingDirective, 180)
      return directive || 'Start from the current turn.'
    }
  }
}

function whyThisReplyNow(input: {
  selectedMotive: AlicizationReplyMotive
  conversationState: AlicizationConversationStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  primaryTurnAnchor?: string | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const consciousFrameReason = pickDialogueSurfaceText(
    input.currentConsciousFrame?.speakingIntention,
    input.currentConsciousFrame?.consciousNeed,
    input.currentConsciousFrame?.consciousTension,
  )
  if (consciousFrameReason)
    return consciousFrameReason

  const claimEvidenceReason = pickDialogueSurfaceText(
    input.claimEvidenceLedger?.intentHypothesis,
    input.claimEvidenceLedger?.taskHypothesis,
    input.claimEvidenceLedger?.observedSurface,
  )
  if (claimEvidenceReason)
    return claimEvidenceReason

  if (input.selectedMotive === 'repair') {
    return pickDialogueSurfaceText(
      input.conversationState.owedRepair
      || input.answerCompiler.uncertaintyBoundary
      || input.worldModel?.epistemicState.staleRisks[0]
      || input.primaryTurnAnchor
      || '',
    ) || 'The last read may no longer be true.'
  }
  if (input.selectedMotive === 'guide') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.conversationState.unansweredQuestion
      || input.conversationState.activeProject
      || input.conversationState.activeCommitments[0]
      || input.answerCompiler.nextMove
      || input.worldModel?.activeThread?.summary
      || '',
    ) || 'The current question still needs a concrete answer.'
  }
  if (input.selectedMotive === 'care') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.answerCompiler.careVector
      || input.conversationState.hostMove
      || input.conversationState.jointThread
      || '',
    ) || 'The host is speaking from the current state, so the answer should stay close.'
  }
  if (input.selectedMotive === 'attune') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.conversationState.hostMove
      || input.conversationState.jointThread
      || input.answerCompiler.openingClaim,
    ) || 'The host has turned the dialogue back toward Alicization.'
  }
  if (input.selectedMotive === 'witness') {
    return pickDialogueSurfaceText(
      input.primaryTurnAnchor,
      input.answerCompiler.openingClaim
      || input.conversationState.jointThread
      || input.worldModel?.activeThread?.summary,
    ) || 'The live scene is still the clearest place to begin.'
  }
  return pickDialogueSurfaceText(
    input.primaryTurnAnchor,
    input.conversationState.hostMove
    || input.answerCompiler.openingClaim
    || input.conversationState.jointThread,
  ) || 'This is the clearest truthful reply for the current turn.'
}

export function buildReplyDeliberation(input: {
  now: number
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
}): AlicizationReplyDeliberationSnapshot | null {
  if (!input.conversationState || !input.discourseState || !input.mindSynthesis || !input.answerCompiler)
    return null

  const primaryTurnAnchor = resolvePrimaryReplyAnchor({
    conversationState: input.conversationState,
    discourseState: input.discourseState,
    answerCompiler: input.answerCompiler,
    dialogueEncounter: input.dialogueEncounter ?? null,
  }) || null
  const dialogueFirstTurn = isDialogueFirstReplyTurn({
    discourseState: input.discourseState,
    answerCompiler: input.answerCompiler,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })
  const groundedRepairResolved = repairIsAlreadySettledByFreshGrounding({
    answerCompiler: input.answerCompiler,
    discourseState: input.discourseState,
  })
  const frameCenter = input.currentConsciousFrame?.centerOfGravity ?? null
  const shouldWithholdSpecificity = input.currentConsciousFrame?.shouldWithholdSpecificity === true
  const shouldSelfRevise = input.currentConsciousFrame?.shouldSelfRevise === true
  const truthDiscipline = input.currentConsciousFrame?.truthDiscipline ?? null
  const claimEvidenceLedger = input.claimEvidenceLedger ?? null
  const coarseSceneBudget = claimEvidenceLedger?.specificityBudget === 'coarse-scene'
  const shouldLabelHypothesis = claimEvidenceLedger?.shouldLabelHypothesis === true

  const candidates = [
    makeMotive({
      kind: 'repair',
      summary: input.conversationState.owedRepair ?? input.answerCompiler.uncertaintyBoundary,
      weight: groundedRepairResolved
        ? 0.08
        : input.discourseState.owedAction === 'repair-truth' || input.answerCompiler.recommendedAct === 'ask-reground' || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
          ? 0.96
          : 0.12
            + (frameCenter === 'repair' ? 0.12 : 0)
            + (shouldSelfRevise ? 0.1 : 0),
      sourceTags: ['discourse-state', 'answer-compiler'],
    }),
    makeMotive({
      kind: 'guide',
      summary: primaryTurnAnchor
        ?? input.conversationState.unansweredQuestion
        ?? input.conversationState.activeProject
        ?? input.conversationState.activeCommitments[0]
        ?? input.mindSynthesis.commitments[0]?.summary,
      weight: (
        groundedRepairResolved && input.answerCompiler.answerSubject === 'task-knot'
          ? 0.92
          : input.discourseState.owedAction === 'guide-task' || input.answerCompiler.recommendedAct === 'guide'
            ? 0.88
            : input.conversationState.shouldHoldThread ? 0.52 : 0.18
      )
      + (frameCenter === 'guide' ? 0.12 : 0)
      - (coarseSceneBudget ? 0.12 : 0)
      - (shouldWithholdSpecificity ? 0.18 : 0),
      sourceTags: ['conversation-state', 'mind-synthesis'],
    }),
    makeMotive({
      kind: 'care',
      summary: primaryTurnAnchor
        ?? input.answerCompiler.careVector
        ?? input.mindSynthesis.concerns[0]?.summary
        ?? input.conversationState.hostMove,
      weight: input.discourseState.owedAction === 'care-host' || input.answerCompiler.recommendedAct === 'care' || input.privateThought?.stance === 'care' || input.privateThought?.stance === 'warn'
        ? 0.84
        : 0.18
          + (frameCenter === 'care' ? 0.12 : 0),
      sourceTags: ['private-thought', 'mind-synthesis'],
    }),
    makeMotive({
      kind: 'attune',
      summary: primaryTurnAnchor ?? input.conversationState.hostMove,
      weight: input.discourseState.currentTurnSubject === 'relationship'
        ? 0.82
        : input.discourseState.currentTurnSubject === 'alicization-self'
          ? 0.74
          : dialogueFirstTurn
            ? 0.44
            : 0.14
              + (frameCenter === 'attune' ? 0.12 : 0),
      sourceTags: ['conversation-state', 'discourse-state'],
    }),
    makeMotive({
      kind: 'witness',
      summary: dialogueFirstTurn
        ? primaryTurnAnchor ?? input.conversationState.jointThread
        : input.answerCompiler.openingClaim ?? input.conversationState.jointThread,
      weight: (
        groundedRepairResolved && input.answerCompiler.answerSubject === 'visible-scene'
          ? 0.92
          : input.discourseState.currentTurnSubject === 'visible-scene'
            ? 0.8
            : input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed'
              ? (dialogueFirstTurn ? 0.22 : 0.64)
              : 0.16
      )
      + (frameCenter === 'witness' ? 0.12 : 0)
      + (coarseSceneBudget ? 0.14 : 0)
      + (shouldWithholdSpecificity ? 0.28 : 0),
      sourceTags: ['answer-compiler', 'world-model'],
    }),
    makeMotive({
      kind: 'answer',
      summary: primaryTurnAnchor ?? input.answerCompiler.openingClaim ?? input.conversationState.hostMove,
      weight: input.answerCompiler.recommendedAct === 'answer'
        ? (dialogueFirstTurn ? 0.8 : 0.72) - (coarseSceneBudget ? 0.08 : 0)
        : dialogueFirstTurn
          ? 0.42
          : 0.32
            + (frameCenter === 'answer' ? 0.12 : 0)
            - (shouldWithholdSpecificity ? 0.1 : 0),
      sourceTags: ['answer-compiler'],
    }),
    makeMotive({
      kind: 'defer',
      summary: 'Keep the reply light enough that it does not overwhelm the turn.',
      weight: input.answerCompiler.recommendedAct === 'defer' || input.privateThought?.shouldSpeak === false
        ? 0.58
        : 0.08
          + (frameCenter === 'defer' ? 0.12 : 0),
      sourceTags: ['private-thought', 'answer-compiler'],
    }),
  ].filter((candidate): candidate is AlicizationReplyMotiveSnapshot => Boolean(candidate)).sort((left, right) => right.weight - left.weight)

  const selected = candidates[0] ?? null
  if (!selected)
    return null

  const speakingSource = truthDiscipline === 'dialogue-first'
    ? (input.discourseState.currentTurnSubject === 'alicization-self' ? 'self-continuity' : 'dialogue-bond')
    : truthDiscipline === 'memory-labeled' || shouldSelfRevise
      ? 'held-memory'
      : shouldWithholdSpecificity
        ? 'live-scene'
        : speakingFrom({
            answerCompiler: input.answerCompiler,
            discourseState: input.discourseState,
          })
  const whyNow = whyThisReplyNow({
    selectedMotive: selected.kind,
    conversationState: input.conversationState,
    answerCompiler: input.answerCompiler,
    worldModel: input.worldModel ?? null,
    primaryTurnAnchor,
    currentConsciousFrame: input.currentConsciousFrame ?? null,
    claimEvidenceLedger,
  })
  const mustInclude = uniqueList([
    openingBeat({
      selectedMotive: selected.kind,
      answerCompiler: input.answerCompiler,
      conversationState: input.conversationState,
    }),
    primaryTurnAnchor,
    shouldLabelHypothesis
      ? 'Keep direct observation and any task guess in separate clauses.'
      : null,
    claimEvidenceLedger?.observedSurface ?? null,
    input.currentConsciousFrame?.speakingIntention ?? null,
    whyNow,
    dialogueFirstTurn ? null : input.answerCompiler.openingDirective,
    input.answerCompiler.nextMove,
  ], 5)
  const mustAvoid = uniqueList([
    input.answerCompiler.mustNotDo[0],
    dialogueFirstTurn && primaryTurnAnchor
      ? 'Do not let control directives outrank the current turn anchor.'
      : null,
    input.conversationState.memoryMode === 'dialogue-carry'
      ? 'Do not let live-screen repair hijack a dialogue-first turn.'
      : null,
    input.conversationState.memoryMode === 'scene-anchored'
      ? 'Do not let old memory outrank the live scene.'
      : null,
    input.conversationState.memoryMode === 'task-thread'
      ? 'Do not drift into decorative association before the knot is answered.'
      : null,
    shouldWithholdSpecificity
      ? 'Do not jump from coarse visual cues to file, class, enum, or field-level certainty.'
      : null,
    claimEvidenceLedger?.forbidUnsupportedSpecificity
      ? 'Do not name specific technical artifacts unless the host named them or the current evidence explicitly grounds them.'
      : null,
    shouldSelfRevise
      ? 'Do not preserve the previous read just because it sounds coherent; revise it if truth demands it.'
      : null,
  ], 5)

  return {
    selectedMotive: selected.kind,
    speakingFrom: speakingSource,
    memoryMode: input.conversationState.memoryMode,
    openingBeat: mustInclude[0] ?? input.answerCompiler.openingDirective,
    whyThisReplyNow: whyNow,
    whyNotOtherCandidates: candidates.slice(1, 4).map(candidate => `${candidate.kind}:${candidate.summary}`),
    withheldImpulses: uniqueList([
      input.answerCompiler.labelCarryAsMemory ? 'withhold-presenting-carried-memory-as-live' : null,
      input.answerCompiler.suppressAssociativeRecall ? 'withhold-associative-recall-noise' : null,
      input.privateThought?.shouldSpeak === false ? 'withhold-overeager-presence' : null,
    ], 4),
    candidateMotives: candidates.slice(0, 5),
    shouldSpeak: input.answerCompiler.recommendedAct !== 'defer',
    mustInclude,
    mustAvoid,
    confidence: clamp01(
      selected.weight * 0.42
      + input.answerCompiler.confidence * 0.28
      + input.conversationState.confidence * 0.18
      + (input.privateThought?.confidence ?? 0.34) * 0.12,
    ),
    narrative: uniqueList([
      `selected:${selected.kind}`,
      `speaking-from:${speakingSource}`,
      `memory:${input.conversationState.memoryMode}`,
      frameCenter ? `conscious-center:${frameCenter}` : null,
      truthDiscipline ? `truth-discipline:${truthDiscipline}` : null,
      claimEvidenceLedger?.specificityBudget ? `claim-budget:${claimEvidenceLedger.specificityBudget}` : null,
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      whyNow,
      ...mustAvoid,
    ], 7),
    updatedAt: input.now,
  } satisfies AlicizationReplyDeliberationSnapshot
}

export function buildReplyDeliberationSystemBlock(state: AlicizationReplyDeliberationSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_REPLY_DELIBERATION]',
    'This block is the final inner arbitration before speech. It explains why this utterance should surface instead of other possible inner moves.',
    `Selected motive: ${state.selectedMotive}.`,
    `Speaking from: ${state.speakingFrom}.`,
    `Memory mode: ${state.memoryMode}.`,
    `Should speak: ${state.shouldSpeak ? 'yes' : 'no'}.`,
    `Opening beat: ${state.openingBeat}.`,
    `Why this reply now: ${state.whyThisReplyNow}.`,
    `Withheld impulses: ${state.withheldImpulses.length > 0 ? state.withheldImpulses.join(' | ') : 'none'}.`,
    `Other candidate motives: ${state.whyNotOtherCandidates.length > 0 ? state.whyNotOtherCandidates.join(' | ') : 'none'}.`,
    'Must include:',
    ...(state.mustInclude.length > 0 ? state.mustInclude.map(item => `- ${item}`) : ['- none']),
    'Must avoid:',
    ...(state.mustAvoid.length > 0 ? state.mustAvoid.map(item => `- ${item}`) : ['- none']),
  ].join('\n')
}

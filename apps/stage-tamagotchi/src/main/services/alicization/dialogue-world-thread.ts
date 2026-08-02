import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { resolvePrimaryTurnAnchor, turnAnchorAligns } from './dialogue-turn-anchor'

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

function sanitizeDialogueFact(raw: unknown, maxChars = 180) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function shouldCarryPreviousDialogueAnchor(input: {
  conversationState: AlicizationConversationStateSnapshot
  previous?: AlicizationDialogueWorldThreadSnapshot | null
}) {
  const previousActiveThread = sanitizeDialogueFact(input.previous?.activeThread, 180)
  const previousAnchor = sanitizeDialogueFact(
    input.previous?.primaryTurnAnchor ?? input.previous?.currentQuestion ?? previousActiveThread,
    180,
  )
  if (!previousActiveThread || !previousAnchor || input.previous?.memoryMode !== 'dialogue-carry' || input.previous?.carryEligible !== true)
    return false

  const currentAnchors = uniqueList([
    input.conversationState.primaryTurnAnchor,
    input.conversationState.hostMove,
    input.conversationState.jointThread,
    input.conversationState.unansweredQuestion,
  ], 6)
  if (currentAnchors.length === 0)
    return false

  return turnAnchorAligns({
    anchor: previousAnchor,
    context: currentAnchors,
  }) || measureDialogueFocusAlignment({
    message: previousActiveThread,
    contextPhrases: currentAnchors,
  }).overlapRatio >= 0.18
}

function filterDialogueCarryFacts(values: Array<string | null | undefined>, anchors: string[]) {
  return values
    .map(value => sanitizeDialogueFact(value, 180))
    .filter(Boolean)
    .filter((value) => {
      if (anchors.length === 0)
        return false
      return measureDialogueFocusAlignment({
        message: value,
        contextPhrases: anchors,
      }).overlapRatio >= 0.18
    })
}

function resolveRelationDrift(input: {
  conversationState: AlicizationConversationStateSnapshot
  discourseState?: AlicizationDiscourseStateSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationDialogueWorldThreadSnapshot | null
}) {
  if (
    input.conversationState.owedRepair
    || input.discourseState?.owedAction === 'repair-truth'
    || input.replyDeliberation?.selectedMotive === 'repair'
  ) {
    return 'repairing' as const
  }

  if (input.discourseState?.screenReferenceMode === 'required') {
    return 'guarded' as const
  }

  if (
    input.conversationState.relationFrame === 'care'
    || input.conversationState.relationFrame === 'attune'
    || input.conversationState.relationFrame === 'self-disclose'
    || input.replyDeliberation?.selectedMotive === 'care'
    || input.replyDeliberation?.selectedMotive === 'attune'
    || input.privateThought?.stance === 'care'
  ) {
    return 'warming' as const
  }

  return input.previous?.relationDrift === 'repairing'
    && !input.conversationState.owedRepair
    ? 'steady'
    : input.previous?.relationDrift ?? 'steady'
}

// This thread is the durable dialogue seam. It is intentionally narrower than the
// whole world model: only the parts that should survive into the next answer are kept.
export function buildDialogueWorldThread(input: {
  now: number
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationDialogueWorldThreadSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueWorldThreadSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const previous = runtimeSurface?.dialogue.dialogueWorldThread ?? input.previous ?? null

  if (!conversationState) {
    return previous
      ? {
          ...previous,
          updatedAt: input.now,
        }
      : null
  }

  const dialogueCarry = conversationState.memoryMode === 'dialogue-carry'
  const { text: primaryTurnAnchor, source: primaryTurnAnchorSource } = resolvePrimaryTurnAnchor([
    { source: conversationState.primaryTurnAnchorSource ?? 'unknown', text: conversationState.primaryTurnAnchor },
    { source: 'question', text: conversationState.unansweredQuestion },
    { source: 'thread', text: conversationState.jointThread },
    { source: 'user-text', text: dialogueCarry ? conversationState.hostMove : null },
    { source: 'user-text', text: dialogueCarry ? null : conversationState.hostMove },
    { source: 'carry', text: previous?.primaryTurnAnchor },
  ])
  const activeThread = sanitizeText(
    (dialogueCarry ? primaryTurnAnchor : conversationState.jointThread)
    || (dialogueCarry ? conversationState.jointThread : primaryTurnAnchor)
    || previous?.activeThread
    || worldModel?.activeThread?.summary
    || worldModel?.activeThread?.title
    || mindSynthesis?.interiorSummary
    || answerCompiler?.openingClaim
    || '',
    220,
  )
  const conversationCarryEligible = conversationState.carryEligible
    ?? Boolean(primaryTurnAnchor && conversationState.shouldHoldThread)

  const currentQuestion = sanitizeText(
    conversationState.unansweredQuestion
    || (
      conversationCarryEligible
      && conversationState.shouldHoldThread
        ? previous?.currentQuestion
        : ''
    )
    || '',
    180,
  ) || null
  const carryPreviousDialogueAnchor = shouldCarryPreviousDialogueAnchor({
    conversationState,
    previous,
  })
  const dialogueCarryAnchors = uniqueList([
    primaryTurnAnchor,
    conversationState.hostMove,
    conversationState.jointThread,
    currentQuestion,
    carryPreviousDialogueAnchor
      ? previous?.activeThread ?? null
      : null,
  ], 6)

  const openLoops = uniqueList([
    currentQuestion,
    conversationState.owedRepair,
    ...conversationState.activeCommitments,
    ...(
      dialogueCarry || !carryPreviousDialogueAnchor
        ? []
        : (previous?.pendingValidation?.question ? [previous.pendingValidation.question] : [])
    ),
    ...(dialogueCarry || !carryPreviousDialogueAnchor ? [] : (previous?.openLoops ?? [])),
  ], 6)
  const carriedFacts = dialogueCarry
    ? uniqueList(filterDialogueCarryFacts([
        ...(answerCompiler?.supportingReality ?? []),
        ...(carryPreviousDialogueAnchor ? (previous?.carriedFacts ?? []) : []),
      ], dialogueCarryAnchors), 6)
    : uniqueList([
        ...(answerCompiler?.supportingReality ?? []),
        worldModel?.activeThread?.title,
        worldModel?.activeThread?.summary,
        ...(previous?.carriedFacts ?? []),
      ], 6)
  const recentlyResolvedLoops = dialogueCarry
    ? uniqueList(filterDialogueCarryFacts(
        (previous?.openLoops ?? []).filter(loop => !openLoops.includes(loop)),
        dialogueCarryAnchors,
      ), 4)
    : uniqueList(
        (previous?.openLoops ?? []).filter(loop => !openLoops.includes(loop)),
        4,
      )
  const relationDrift = resolveRelationDrift({
    conversationState,
    discourseState,
    replyDeliberation,
    answerCompiler,
    privateThought,
    previous,
  })
  const recallKeys = uniqueList([
    primaryTurnAnchor,
    activeThread,
    currentQuestion,
    conversationState.hostMove,
    conversationState.activeProject,
    ...openLoops,
    ...carriedFacts,
    ...(conversationState.memoryQueryHints ?? []),
    replyDeliberation?.selectedMotive ? `reply_motive:${replyDeliberation.selectedMotive}` : null,
    privateThought?.emotionalTension ? `emotional_tension:${privateThought.emotionalTension}` : null,
    `relation:${relationDrift}`,
  ], 10)

  return {
    activeThread,
    currentQuestion,
    primaryTurnAnchor,
    primaryTurnAnchorSource,
    openLoops,
    recentlyResolvedLoops,
    carriedFacts,
    relationDrift,
    memoryMode: conversationState.memoryMode,
    recallKeys,
    carryEligible: conversationCarryEligible,
    carryReason: conversationState.carryReason ?? null,
    lastUserMove: sanitizeText(conversationState.hostMove, 220) || previous?.lastUserMove || activeThread,
    lastAssistantMove: previous?.lastAssistantMove ?? null,
    lastOutcome: previous?.lastOutcome ?? 'none',
    pendingValidation: previous?.pendingValidation ?? null,
    confidence: clamp01(
      conversationState.confidence * 0.42
      + (replyDeliberation?.confidence ?? 0.34) * 0.18
      + (answerCompiler?.confidence ?? 0.34) * 0.16
      + (privateThought?.confidence ?? 0.32) * 0.12
      + (previous?.confidence ?? 0.3) * 0.12,
    ),
    narrative: uniqueList([
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      `thread:${activeThread}`,
      currentQuestion ? `question:${currentQuestion}` : null,
      conversationState.owedRepair ? `repair:${conversationState.owedRepair}` : null,
      `relation:${relationDrift}`,
      `memory:${conversationState.memoryMode}`,
      conversationState.carryReason ? `carry:${conversationState.carryReason}` : (conversationCarryEligible ? 'carry:hold-thread' : null),
      replyDeliberation?.selectedMotive ? `reply:${replyDeliberation.selectedMotive}` : null,
    ], 8),
    updatedAt: input.now,
  } satisfies AlicizationDialogueWorldThreadSnapshot
}

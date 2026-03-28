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

import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { sanitizeDialogueSurfaceText } from './dialogue-surface-text'

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
  if (!previousActiveThread || input.previous?.memoryMode !== 'dialogue-carry')
    return false

  const currentAnchors = uniqueList([
    input.conversationState.hostMove,
    input.conversationState.jointThread,
    input.conversationState.unansweredQuestion,
  ], 6)
  if (currentAnchors.length === 0)
    return false

  return measureDialogueFocusAlignment({
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

  if (
    input.answerCompiler?.relationshipPosture === 'restrained'
    || input.discourseState?.screenReferenceMode === 'required'
  ) {
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
}): AlicizationDialogueWorldThreadSnapshot | null {
  if (!input.conversationState) {
    return input.previous
      ? {
          ...input.previous,
          updatedAt: input.now,
        }
      : null
  }

  const activeThread = sanitizeText(
    input.conversationState.jointThread
    || input.previous?.activeThread
    || input.worldModel?.activeThread?.summary
    || input.worldModel?.activeThread?.title
    || input.mindSynthesis?.interiorSummary
    || input.answerCompiler?.openingClaim
    || 'Stay with the current dialogue seam.',
    220,
  ) || 'Stay with the current dialogue seam.'

  const currentQuestion = sanitizeText(
    input.conversationState.unansweredQuestion
    || (
      input.conversationState.shouldHoldThread
        ? input.previous?.currentQuestion
        : ''
    )
    || '',
    180,
  ) || null
  const dialogueCarry = input.conversationState.memoryMode === 'dialogue-carry'
  const carryPreviousDialogueAnchor = shouldCarryPreviousDialogueAnchor({
    conversationState: input.conversationState,
    previous: input.previous ?? null,
  })
  const dialogueCarryAnchors = uniqueList([
    input.conversationState.hostMove,
    input.conversationState.jointThread,
    currentQuestion,
    carryPreviousDialogueAnchor
      ? input.previous?.activeThread ?? null
      : null,
  ], 6)

  const openLoops = uniqueList([
    currentQuestion,
    input.conversationState.owedRepair,
    ...input.conversationState.activeCommitments,
    ...(
      dialogueCarry
        ? []
        : (input.previous?.pendingValidation?.question ? [input.previous.pendingValidation.question] : [])
    ),
    ...(dialogueCarry ? [] : (input.previous?.openLoops ?? [])),
  ], 6)
  const recentlyResolvedLoops = uniqueList(
    (input.previous?.openLoops ?? []).filter(loop => !openLoops.includes(loop)),
    4,
  )
  const carriedFacts = dialogueCarry
    ? uniqueList(filterDialogueCarryFacts([
        ...(input.answerCompiler?.supportingReality ?? []),
        ...(carryPreviousDialogueAnchor ? (input.previous?.carriedFacts ?? []) : []),
      ], dialogueCarryAnchors), 6)
    : uniqueList([
        ...(input.answerCompiler?.supportingReality ?? []),
        input.worldModel?.activeThread?.title,
        input.worldModel?.activeThread?.summary,
        ...(input.previous?.carriedFacts ?? []),
      ], 6)
  const relationDrift = resolveRelationDrift({
    conversationState: input.conversationState,
    discourseState: input.discourseState ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    answerCompiler: input.answerCompiler ?? null,
    privateThought: input.privateThought ?? null,
    previous: input.previous ?? null,
  })
  const recallKeys = uniqueList([
    activeThread,
    currentQuestion,
    input.conversationState.hostMove,
    input.conversationState.activeProject,
    ...openLoops,
    ...carriedFacts,
    ...(input.conversationState.memoryQueryHints ?? []),
    input.replyDeliberation?.selectedMotive ? `reply_motive:${input.replyDeliberation.selectedMotive}` : null,
    input.privateThought?.emotionalTension ? `emotional_tension:${input.privateThought.emotionalTension}` : null,
    `relation:${relationDrift}`,
  ], 10)

  return {
    activeThread,
    currentQuestion,
    openLoops,
    recentlyResolvedLoops,
    carriedFacts,
    relationDrift,
    memoryMode: input.conversationState.memoryMode,
    recallKeys,
    lastUserMove: sanitizeText(input.conversationState.hostMove, 220) || input.previous?.lastUserMove || activeThread,
    lastAssistantMove: input.previous?.lastAssistantMove ?? null,
    lastOutcome: input.previous?.lastOutcome ?? 'none',
    pendingValidation: input.previous?.pendingValidation ?? null,
    confidence: clamp01(
      input.conversationState.confidence * 0.42
      + (input.replyDeliberation?.confidence ?? 0.34) * 0.18
      + (input.answerCompiler?.confidence ?? 0.34) * 0.16
      + (input.privateThought?.confidence ?? 0.32) * 0.12
      + (input.previous?.confidence ?? 0.3) * 0.12,
    ),
    narrative: uniqueList([
      `thread:${activeThread}`,
      currentQuestion ? `question:${currentQuestion}` : null,
      input.conversationState.owedRepair ? `repair:${input.conversationState.owedRepair}` : null,
      `relation:${relationDrift}`,
      `memory:${input.conversationState.memoryMode}`,
      input.replyDeliberation?.selectedMotive ? `reply:${input.replyDeliberation.selectedMotive}` : null,
    ], 8),
    updatedAt: input.now,
  } satisfies AlicizationDialogueWorldThreadSnapshot
}

export function buildDialogueWorldThreadSystemBlock(state: AlicizationDialogueWorldThreadSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_DIALOGUE_WORLD_THREAD]',
    'This block is the carried cross-turn dialogue seam. Treat it as the living thread Alicization believes she is still inside.',
    `Active thread: ${state.activeThread}.`,
    `Current question: ${state.currentQuestion ?? 'none'}.`,
    `Open loops: ${state.openLoops.length > 0 ? state.openLoops.join(' | ') : 'none'}.`,
    `Recently resolved loops: ${state.recentlyResolvedLoops.length > 0 ? state.recentlyResolvedLoops.join(' | ') : 'none'}.`,
    `Carried facts: ${state.carriedFacts.length > 0 ? state.carriedFacts.join(' | ') : 'none'}.`,
    `Relation drift: ${state.relationDrift}.`,
    `Memory mode: ${state.memoryMode}.`,
    `Last user move: ${state.lastUserMove}.`,
    `Last assistant move: ${state.lastAssistantMove ?? 'none'}.`,
    `Last outcome: ${state.lastOutcome}.`,
    `Pending validation: ${state.pendingValidation ? JSON.stringify(state.pendingValidation) : 'none'}.`,
    `Recall keys: ${state.recallKeys.length > 0 ? state.recallKeys.join(' | ') : 'none'}.`,
    'Do not answer from stale surface residue when this thread says the living seam is elsewhere.',
  ].join('\n')
}

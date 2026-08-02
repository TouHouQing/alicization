import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { resolveGroundedSupportingReality } from './dialogue-world-thread'

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

function normalizeComparableText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}

function sharesThread(left: unknown, right: unknown) {
  const a = normalizeComparableText(left)
  const b = normalizeComparableText(right)
  if (!a || !b)
    return false
  if (a === b)
    return true
  const shorter = a.length <= b.length ? a : b
  const longer = shorter === a ? b : a
  if (shorter.length >= 6 && longer.includes(shorter))
    return true
  const probeLength = Math.min(8, shorter.length)
  if (probeLength < 4)
    return false
  for (let index = 0; index <= shorter.length - probeLength; index += 1) {
    if (longer.includes(shorter.slice(index, index + probeLength)))
      return true
  }
  return false
}

function mapExpectedMode(input: {
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
}): NonNullable<AlicizationDialogueWorldThreadSnapshot['pendingValidation']>['expectedMode'] {
  if (input.replyDeliberation?.selectedMotive)
    return input.replyDeliberation.selectedMotive

  switch (input.answerCompiler?.recommendedAct) {
    case 'ask-reground':
    case 'correct-stale-anchor':
      return 'repair'
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'defer':
      return 'defer'
    default:
      return 'answer'
  }
}

export function settleDialogueWorldThreadOnUserTurn(input: {
  now: number
  previous?: AlicizationDialogueWorldThreadSnapshot | null
  userText?: string
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueWorldThreadSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const previous = runtimeSurface?.dialogue.dialogueWorldThread ?? input.previous ?? null
  if (!previous)
    return null

  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const lastUserMove = sanitizeText(
    conversationState?.hostMove
    || input.userText
    || previous.lastUserMove,
    220,
  ) || previous.lastUserMove
  const pending = previous.pendingValidation ?? null
  if (!pending || !conversationState) {
    return {
      ...previous,
      lastUserMove,
      updatedAt: input.now,
    }
  }

  const sameThread = [
    conversationState.jointThread,
    conversationState.hostMove,
    conversationState.unansweredQuestion,
    conversationState.activeProject,
  ].some(candidate => sharesThread(candidate, previous.activeThread)
    || sharesThread(candidate, pending.question)
    || previous.openLoops.some(loop => sharesThread(candidate, loop)))

  const lastOutcome = conversationState.owedRepair || conversationState.relationFrame === 'repair' || discourseState?.owedAction === 'repair-truth'
    ? 'repairing'
    : pending.expectedMode === 'defer'
      ? 'deferred'
      : conversationState.unansweredQuestion && pending.question && sharesThread(conversationState.unansweredQuestion, pending.question)
        ? 'missed'
        : sameThread
          ? 'aligned'
          : conversationState.relationFrame === 'attune' || conversationState.relationFrame === 'care'
            ? 'deferred'
            : 'missed'

  return {
    ...previous,
    lastUserMove,
    currentQuestion: conversationState.unansweredQuestion ?? previous.currentQuestion ?? null,
    lastOutcome,
    pendingValidation: null,
    confidence: clamp01(previous.confidence * 0.78 + conversationState.confidence * 0.22),
    narrative: uniqueList([
      ...previous.narrative,
      `outcome:${lastOutcome}`,
      `user:${lastUserMove}`,
    ], 10),
    updatedAt: input.now,
  }
}

export function registerDialogueWorldThreadAssistantTurn(input: {
  now: number
  previous?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  assistantText?: string | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationDialogueWorldThreadSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const previous = runtimeSurface?.dialogue.dialogueWorldThread ?? input.previous ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const replyDeliberation = runtimeSurface?.dialogue.replyDeliberation ?? input.replyDeliberation ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const assistantText = sanitizeText(input.assistantText, 220)
  if (!assistantText)
    return previous

  const activeThread = sanitizeText(
    conversationState?.jointThread
    || previous?.activeThread,
    220,
  )
  if (!activeThread)
    return previous

  const expectedMode = mapExpectedMode({
    replyDeliberation,
    answerCompiler,
  })
  const validationQuestion = sanitizeText(
    conversationState?.unansweredQuestion
    || conversationState?.activeCommitments[0]
    || previous?.currentQuestion
    || '',
    180,
  ) || null
  const shouldTrackValidation = Boolean(
    expectedMode !== 'defer'
    && (validationQuestion || conversationState?.shouldHoldThread || expectedMode === 'repair' || expectedMode === 'guide'),
  )
  const groundedSupportingReality = resolveGroundedSupportingReality({
    answerCompiler,
    conversationState,
    worldModel: runtimeSurface?.world.worldModel ?? null,
  })

  return {
    activeThread,
    currentQuestion: conversationState?.unansweredQuestion ?? previous?.currentQuestion ?? null,
    openLoops: uniqueList([
      ...(conversationState?.activeCommitments ?? []),
      conversationState?.owedRepair,
      validationQuestion,
      ...(previous?.openLoops ?? []),
    ], 6),
    recentlyResolvedLoops: previous?.recentlyResolvedLoops ?? [],
    carriedFacts: uniqueList([
      ...(previous?.carriedFacts ?? []),
      ...groundedSupportingReality,
      conversationState?.activeProject,
    ], 6),
    relationDrift: previous?.relationDrift ?? 'steady',
    memoryMode: conversationState?.memoryMode ?? previous?.memoryMode ?? 'dialogue-carry',
    recallKeys: uniqueList([
      ...(previous?.recallKeys ?? []),
      activeThread,
      validationQuestion,
      ...(conversationState?.memoryQueryHints ?? []),
    ], 10),
    lastUserMove: conversationState?.hostMove ?? previous?.lastUserMove ?? '',
    lastAssistantMove: assistantText,
    lastOutcome: shouldTrackValidation
      ? 'pending'
      : expectedMode === 'defer'
        ? 'deferred'
        : 'aligned',
    pendingValidation: shouldTrackValidation
      ? {
          question: validationQuestion,
          expectedMode,
          openedAt: input.now,
        }
      : null,
    confidence: clamp01(
      (conversationState?.confidence ?? previous?.confidence ?? 0.34) * 0.44
      + (replyDeliberation?.confidence ?? 0.34) * 0.24
      + (answerCompiler?.confidence ?? 0.34) * 0.22
      + (previous?.confidence ?? 0.3) * 0.1,
    ),
    narrative: uniqueList([
      ...(previous?.narrative ?? []),
      `assistant:${sanitizeText(assistantText, 120)}`,
      `validation:${shouldTrackValidation ? expectedMode : 'none'}`,
    ], 10),
    updatedAt: input.now,
  } satisfies AlicizationDialogueWorldThreadSnapshot
}

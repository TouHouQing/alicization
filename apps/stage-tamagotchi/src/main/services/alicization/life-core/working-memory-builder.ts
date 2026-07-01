import type {
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
} from '../../../../shared/eventa'
import type {
  WorkingMemoryQuestion,
  WorkingMemoryFailureKind,
  WorkingMemorySnapshot,
  WorkingMemoryTurn,
} from './working-memory'

import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { createLongTermCandidatesFromWorkingTurns } from './working-memory-policy'

export interface WorkingMemoryRecentTurnInput {
  turnId?: string | null
  userText?: string | null
  assistantText?: string | null
  createdAt?: number | null
}

export interface BuildWorkingMemorySnapshotInput {
  cardId: string
  sessionId: string
  now: number
  currentUserText: string
  recentTurns?: WorkingMemoryRecentTurnInput[]
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  executionCarry?: string | null
}

function detectCorrectionScope(text: string) {
  if (/人格|固定回复|固定模板|数字生命|persona|same-her/iu.test(text))
    return 'persona' as const
  if (/记忆|回想|长期|短期/iu.test(text))
    return 'memory' as const
  if (/任务|执行|工具|commit|push|编译/iu.test(text))
    return 'task' as const
  if (/不是这个|你错了|别这样|不要这样/u.test(text))
    return 'reply' as const
  return 'unknown' as const
}

function looksLikeCorrection(text: string) {
  return /不是这个|不想要|不要固定|固定回复|固定模板|我需要|你搞错|你错了|别这样|不要这样/u.test(text)
}

function detectFailureKindFromVisibleText(text: string): WorkingMemoryFailureKind | null {
  if (/^超时了[。.]?$/u.test(text))
    return 'timeout'
  if (/provider|供应方|模型服务|模型调用/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'provider-error'
  if (/工具|tool/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'tool-error'
  return null
}

function mapRecentTurns(input: BuildWorkingMemorySnapshotInput): WorkingMemoryTurn[] {
  const turns: WorkingMemoryTurn[] = []
  for (const [index, turn] of (input.recentTurns ?? []).entries()) {
    const createdAt = Number.isFinite(turn.createdAt) ? Number(turn.createdAt) : input.now - (index + 2)
    const turnId = normalizeWorkingMemoryText(turn.turnId, 120) || `recent-${index + 1}`
    const userText = normalizeWorkingMemoryText(turn.userText, 900)
    const assistantText = normalizeWorkingMemoryText(turn.assistantText, 900)
    if (userText) {
      turns.push(normalizeWorkingMemoryTurn({
        turnId: `${turnId}:user`,
        role: 'user',
        text: userText,
        createdAt,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.66,
      }))
    }
    if (assistantText) {
      turns.push(normalizeWorkingMemoryTurn({
        turnId: `${turnId}:alice`,
        role: 'alice',
        text: assistantText,
        createdAt: createdAt + 1,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: detectFailureKindFromVisibleText(assistantText),
        importance: 0.52,
      }))
    }
  }

  const currentText = normalizeWorkingMemoryText(input.currentUserText, 1200)
  if (currentText) {
    turns.push(normalizeWorkingMemoryTurn({
      turnId: 'current-user',
      role: 'user',
      text: currentText,
      createdAt: input.now,
      source: 'conversation-turn',
      visibility: 'user-visible',
      importance: 1,
    }))
  }
  return turns
}

function buildQuestions(input: BuildWorkingMemorySnapshotInput): WorkingMemoryQuestion[] {
  return uniqueWorkingMemoryTexts([
    input.conversationState?.unansweredQuestion,
    input.dialogueWorldThread?.currentQuestion,
  ], 6, 220).map(text => ({
    text,
    sourceTurnId: null,
  }))
}

export function buildWorkingMemorySnapshot(input: BuildWorkingMemorySnapshotInput): WorkingMemorySnapshot {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: input.cardId,
    sessionId: input.sessionId,
    now: input.now,
  })
  const recentRawTurns = mapRecentTurns(input)
  const firstTurn = recentRawTurns[0] ?? null
  const lastTurn = recentRawTurns.at(-1) ?? null
  const threadTitle = normalizeWorkingMemoryText(
    input.dialogueWorldThread?.activeThread
    || input.conversationState?.jointThread
    || input.conversationState?.primaryTurnAnchor
    || input.currentUserText,
    220,
  )
  const currentUserMove = normalizeWorkingMemoryText(
    input.conversationState?.hostMove
    || input.dialogueWorldThread?.lastUserMove
    || input.currentUserText,
    220,
  )
  const relationFrame = input.conversationState?.relationFrame ?? null
  const currentThreadMode = relationFrame === 'repair'
    ? 'repair'
    : input.conversationState?.memoryMode === 'task-thread'
      ? 'task'
      : input.conversationState?.memoryMode === 'scene-anchored'
        ? 'execution'
        : 'casual'

  return {
    ...snapshot,
    turnRange: {
      fromTurnId: firstTurn?.turnId ?? null,
      toTurnId: lastTurn?.turnId ?? null,
    },
    recentRawTurns,
    currentThread: threadTitle
      ? {
          title: threadTitle,
          currentUserMove,
          currentAliceMove: normalizeWorkingMemoryText(input.dialogueWorldThread?.lastAssistantMove, 220) || null,
          primaryAnchor: normalizeWorkingMemoryText(input.conversationState?.primaryTurnAnchor ?? input.dialogueWorldThread?.primaryTurnAnchor, 180) || null,
          mode: currentThreadMode,
          shouldHold: input.conversationState?.shouldHoldThread ?? input.dialogueWorldThread?.lastOutcome === 'pending',
          confidence: Math.max(input.conversationState?.confidence ?? 0, input.dialogueWorldThread?.confidence ?? 0),
        }
      : null,
    activeTask: input.conversationState?.activeProject
      ? {
          summary: normalizeWorkingMemoryText(input.conversationState.activeProject, 220),
          status: input.dialogueWorldThread?.lastOutcome === 'pending' ? 'active' : 'waiting-user',
          evidenceTurnIds: lastTurn ? [lastTurn.turnId] : [],
        }
      : null,
    unresolvedQuestions: buildQuestions(input),
    commitments: uniqueWorkingMemoryTexts([
      ...(input.conversationState?.activeCommitments ?? []),
      ...(input.dialogueWorldThread?.openLoops ?? []),
    ], 8, 220).map(text => ({
      text,
      sourceTurnId: null,
    })),
    userCorrections: recentRawTurns
      .filter(turn => turn.role === 'user' && looksLikeCorrection(turn.text))
      .map(turn => ({
        text: turn.text,
        sourceTurnId: turn.turnId,
        scope: detectCorrectionScope(turn.text),
      })),
    relationshipPosture: relationFrame
      ? {
          summary: `relation=${relationFrame}`,
          source: 'conversation-state',
        }
      : null,
    emotionalPosture: input.currentConsciousFrame?.consciousTension
      ? {
          summary: normalizeWorkingMemoryText(input.currentConsciousFrame.consciousTension, 260),
          source: 'conscious-frame',
        }
      : null,
    executionState: input.executionCarry
      ? {
          summary: normalizeWorkingMemoryText(input.executionCarry, 260),
          source: 'execution-callback',
        }
      : null,
    memoryQueryHints: uniqueWorkingMemoryTexts([
      ...(input.conversationState?.memoryQueryHints ?? []),
      ...(input.dialogueWorldThread?.recallKeys ?? []),
    ], 8, 120),
    longTermCandidates: createLongTermCandidatesFromWorkingTurns(recentRawTurns),
  }
}

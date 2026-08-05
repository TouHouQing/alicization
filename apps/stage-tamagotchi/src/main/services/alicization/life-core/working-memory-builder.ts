import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
} from '../../../../shared/eventa'
import type {
  WorkingMemoryAuditState,
  WorkingMemoryFailureKind,
  WorkingMemoryFailureSurface,
  WorkingMemoryLongTermCandidate,
  WorkingMemoryQuestion,
  WorkingMemorySnapshot,
  WorkingMemoryTask,
  WorkingMemoryTurn,
} from './working-memory'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { compressWorkingMemorySnapshot } from './working-memory-compressor'
import {
  createLongTermCandidatesFromWorkingTurns,
  shouldExcludeTurnFromLongTermCandidate,
} from './working-memory-policy'

export interface WorkingMemoryRecentTurnInput {
  turnId?: string | null
  userText?: string | null
  assistantText?: string | null
  createdAt?: number | null
  origin?: AlicizationVisibleArtifactOrigin | null
  learningPolicy?: AlicizationVisibleArtifactLearningPolicy | null
  failureSurface?: WorkingMemoryFailureSurface | null
  contaminated?: boolean
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
  executionActive?: boolean
  executionCarry?: string | null
  previousSnapshot?: WorkingMemorySnapshot | null
}

const activeExecutionStateRetentionMs = 15 * 60_000

const explicitCorrectionPattern = /我?不是(?:这个|这样|要)|不对|不想要|你(?:搞错|错了)|别这样|请?不要|请(?:改成|纠正)|别再|禁止|移除|清除/u

function detectCorrectionScope(text: string) {
  if (/人格|身份|表达|语气|风格|persona/iu.test(text))
    return 'persona' as const
  if (/记忆|回想|长期|短期/u.test(text))
    return 'memory' as const
  if (/任务|执行|工具|commit|push|编译/iu.test(text))
    return 'task' as const
  return 'reply' as const
}

function looksLikeCorrection(text: string) {
  return explicitCorrectionPattern.test(text)
}

function sanitizeWorkingMemoryStoredText(raw: unknown, maxChars: number) {
  const normalized = normalizeWorkingMemoryText(raw, maxChars)
  if (!normalized)
    return ''
  return containsAlicizationFixedTemplateResidue(normalized, {
    provenance: 'internal-structured-fact',
  })
    ? sanitizeAlicizationProviderFacingText(normalized, maxChars, '', {
        provenance: 'internal-structured-fact',
      })
    : normalized
}

function looksLikeThinContinuationCue(text: string) {
  const normalized = normalizeWorkingMemoryText(text, 80)
  return /^(继续|继续吧|接着|接着说|继续这个|继续上面|go on|continue|keep going)[。.!！?？]*$/iu.test(normalized)
}

function matchesResolvedWorkingMemoryText(text: string, resolvedTexts: string[]) {
  const normalized = normalizeWorkingMemoryText(text, 220)
  return resolvedTexts.some((resolved) => {
    const normalizedResolved = normalizeWorkingMemoryText(resolved, 220)
    return Boolean(
      normalizedResolved
      && (
        normalized === normalizedResolved
        || normalized.includes(normalizedResolved)
        || normalizedResolved.includes(normalized)
      ),
    )
  })
}

function filterResolvedWorkingMemoryEntries<T extends { text: string }>(entries: T[], resolvedTexts: string[]) {
  if (resolvedTexts.length === 0)
    return entries
  return entries.filter(entry => !matchesResolvedWorkingMemoryText(entry.text, resolvedTexts))
}

function mergeWorkingMemoryTextEntries<T extends { text: string, sourceTurnId: string | null }>(
  current: T[],
  previous: T[] | null | undefined,
  maxItems = 8,
  maxChars = 220,
) {
  const result: T[] = []
  const seen = new Set<string>()
  for (const item of [...current, ...(previous ?? [])]) {
    const text = normalizeWorkingMemoryText(item.text, maxChars)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    result.push({
      ...item,
      text,
    })
    if (result.length >= maxItems)
      break
  }
  return result
}

function mergeWorkingMemoryStrings(current: string[], previous: string[] | null | undefined, maxItems = 8, maxChars = 220) {
  return uniqueWorkingMemoryTexts([
    ...current,
    ...(previous ?? []),
  ], maxItems, maxChars)
}

function mergeLongTermCandidates(
  current: WorkingMemoryLongTermCandidate[],
  previous: WorkingMemoryLongTermCandidate[] | null | undefined,
) {
  const result: WorkingMemoryLongTermCandidate[] = []
  const seen = new Set<string>()
  for (const entry of [
    ...current.map(candidate => ({ candidate, current: true })),
    ...(previous ?? []).map(candidate => ({ candidate, current: false })),
  ]) {
    const candidate = entry.candidate
    const summary = entry.current
      ? normalizeWorkingMemoryText(candidate.summary, 260)
      : sanitizeWorkingMemoryStoredText(candidate.summary, 260)
    const reason = sanitizeWorkingMemoryStoredText(candidate.reason, 260)
    const sourceTurnIds = uniqueWorkingMemoryTexts(candidate.sourceTurnIds, 12, 120)
    const key = [
      candidate.kind,
      summary,
      reason,
      sourceTurnIds.join(','),
    ].join('|')
    if (!summary || seen.has(key))
      continue
    seen.add(key)
    result.push({
      ...candidate,
      summary,
      reason,
      sourceTurnIds,
    })
    if (result.length >= 6)
      break
  }
  return result
}

function recoverLongTermCandidateSummary(
  candidate: WorkingMemoryLongTermCandidate,
  recentRawTurns: WorkingMemoryTurn[],
) {
  const sourceText = candidate.sourceTurnIds
    .map(sourceTurnId => recentRawTurns.find(turn => turn.turnId === sourceTurnId)?.text ?? '')
    .map(text => normalizeWorkingMemoryText(text, 260))
    .find(Boolean)
  return sourceText || candidate.summary
}

function mergeAudit(current: WorkingMemoryAuditState, previous: WorkingMemoryAuditState | null | undefined): WorkingMemoryAuditState {
  return {
    failureTurnIds: mergeWorkingMemoryStrings(current.failureTurnIds, previous?.failureTurnIds, 20, 120),
    excludedLongTermCandidateTurnIds: mergeWorkingMemoryStrings(
      current.excludedLongTermCandidateTurnIds,
      previous?.excludedLongTermCandidateTurnIds,
      20,
      120,
    ),
    notes: mergeWorkingMemoryStrings(current.notes, previous?.notes, 8, 220),
  }
}

function detectFailureKindFromVisibleText(text: string): WorkingMemoryFailureKind | null {
  if (/^超时了[。.]?$/u.test(text) || /\b(?:timed out|timeout)\b|请求超时|模型超时|provider timeout/iu.test(text))
    return 'timeout'
  if (/execution_callback_status:failed|execution_status:failed|callback failed|tool failed|执行回调失败|工具失败/iu.test(text))
    return 'tool-error'
  if (/provider|供应方|模型服务|模型调用/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'provider-error'
  if (/工具|tool/u.test(text) && /失败|错误|error|failed/iu.test(text))
    return 'tool-error'
  return null
}

function detectFailureKindFromSurface(
  failureSurface: WorkingMemoryFailureSurface | null | undefined,
): WorkingMemoryFailureKind | null {
  if (!failureSurface)
    return null
  if (failureSurface.kind === 'timeout')
    return 'timeout'
  if (failureSurface.kind === 'runtime-aborted')
    return 'abort'
  if (/tool/iu.test(failureSurface.kind))
    return 'tool-error'
  return 'provider-error'
}

function mapRecentTurns(input: BuildWorkingMemorySnapshotInput): WorkingMemoryTurn[] {
  const turns: WorkingMemoryTurn[] = []
  for (const [index, turn] of (input.recentTurns ?? []).entries()) {
    const createdAt = Number.isFinite(turn.createdAt) ? Number(turn.createdAt) : input.now - (index + 2)
    const turnId = normalizeWorkingMemoryText(turn.turnId, 120) || `recent-${index + 1}`
    const userText = normalizeWorkingMemoryText(turn.userText, 900)
    const assistantText = sanitizeWorkingMemoryStoredText(turn.assistantText, 900)
    const origin = turn.failureSurface?.origin ?? turn.origin ?? null
    const learningPolicy = turn.learningPolicy ?? (turn.failureSurface
      ? {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }
      : null)
    if (userText) {
      turns.push(normalizeWorkingMemoryTurn({
        turnId: `${turnId}:user`,
        role: 'user',
        text: userText,
        createdAt,
        source: 'conversation-turn',
        visibility: 'user-visible',
        origin,
        learningPolicy,
        failureSurface: turn.failureSurface ?? null,
        contaminated: turn.contaminated === true,
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
        failureKind:
          detectFailureKindFromSurface(turn.failureSurface)
          ?? detectFailureKindFromVisibleText(assistantText),
        origin,
        learningPolicy,
        failureSurface: turn.failureSurface ?? null,
        contaminated: turn.contaminated === true,
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

function deriveActiveTaskStatus(input: {
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  executionCarry?: string | null
  previousSnapshot?: WorkingMemorySnapshot | null
}): WorkingMemoryTask['status'] {
  const executionCarry = normalizeWorkingMemoryText(input.executionCarry, 900).toLowerCase()
  if (/execution_callback_status:failed|execution_status:failed|status:failed|tool failed|error|failed|失败|报错|卡住|blocked/iu.test(executionCarry))
    return 'blocked'
  if (/execution_callback_status:(running|pending)|execution_status:(running|pending)|status:(running|pending)|in[_-]?progress|waiting|执行中|等待工具/iu.test(executionCarry))
    return 'waiting-tool'

  const lastOutcome = normalizeWorkingMemoryText(input.dialogueWorldThread?.lastOutcome, 40)
  const openLoopCount = input.dialogueWorldThread?.openLoops?.length ?? 0
  if (/^(aligned|resolved|none|deferred)$/u.test(lastOutcome) && openLoopCount === 0)
    return 'settled'
  if (lastOutcome === 'pending')
    return 'active'

  return input.previousSnapshot?.activeTask?.status ?? 'waiting-user'
}

export function buildWorkingMemorySnapshot(input: BuildWorkingMemorySnapshotInput): WorkingMemorySnapshot {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: input.cardId,
    sessionId: input.sessionId,
    now: input.now,
  })
  const previousSnapshot = input.previousSnapshot ?? null
  const recentRawTurns = mapRecentTurns(input)
  const firstTurn = recentRawTurns[0] ?? null
  const lastTurn = recentRawTurns.at(-1) ?? null
  const currentUserTextIsThinContinuation = looksLikeThinContinuationCue(input.currentUserText)
  const threadTitle = normalizeWorkingMemoryText(
    input.dialogueWorldThread?.activeThread
    || input.conversationState?.jointThread
    || input.conversationState?.primaryTurnAnchor
    || (currentUserTextIsThinContinuation ? null : input.currentUserText),
    220,
  )
  const hasFreshThreadSignal = Boolean(threadTitle)
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
  const mergedThreadTitle = threadTitle || previousSnapshot?.currentThread?.title || null
  const mergedThreadCurrentUserMove = currentUserMove || previousSnapshot?.currentThread?.currentUserMove || null
  const mergedThreadCurrentAliceMove = normalizeWorkingMemoryText(input.dialogueWorldThread?.lastAssistantMove, 220) || previousSnapshot?.currentThread?.currentAliceMove || null
  const mergedThreadPrimaryAnchor = normalizeWorkingMemoryText(input.conversationState?.primaryTurnAnchor ?? input.dialogueWorldThread?.primaryTurnAnchor, 180) || previousSnapshot?.currentThread?.primaryAnchor || null
  const mergedThreadMode = hasFreshThreadSignal
    ? currentThreadMode
    : previousSnapshot?.currentThread?.mode ?? null
  const dialogueThreadShouldHold = input.dialogueWorldThread
    ? input.dialogueWorldThread.lastOutcome === 'pending'
    : undefined
  const mergedThreadShouldHold = input.conversationState?.shouldHoldThread ?? dialogueThreadShouldHold ?? previousSnapshot?.currentThread?.shouldHold ?? false
  const mergedThreadConfidence = Math.max(input.conversationState?.confidence ?? 0, input.dialogueWorldThread?.confidence ?? 0, previousSnapshot?.currentThread?.confidence ?? 0)
  const activeProjectSummary = normalizeWorkingMemoryText(input.conversationState?.activeProject, 220) || previousSnapshot?.activeTask?.summary || null
  const activeProjectStatus = activeProjectSummary
    ? deriveActiveTaskStatus(input)
    : null
  const mergedEvidenceTurnIds = uniqueWorkingMemoryTexts([
    ...(lastTurn ? [lastTurn.turnId] : []),
    ...(previousSnapshot?.activeTask?.evidenceTurnIds ?? []),
  ], 12, 120)
  const resolvedWorkingMemoryTexts = uniqueWorkingMemoryTexts(
    input.dialogueWorldThread?.recentlyResolvedLoops ?? [],
    12,
    220,
  )
  const currentUnresolvedQuestions = filterResolvedWorkingMemoryEntries(mergeWorkingMemoryTextEntries(
    buildQuestions(input),
    previousSnapshot?.unresolvedQuestions,
    8,
    220,
  ), resolvedWorkingMemoryTexts)
  const currentCommitments = filterResolvedWorkingMemoryEntries(mergeWorkingMemoryTextEntries(
    uniqueWorkingMemoryTexts([
      ...(input.conversationState?.activeCommitments ?? []),
      ...(input.dialogueWorldThread?.openLoops ?? []),
    ], 8, 220).map(text => ({
      text,
      sourceTurnId: null,
    })),
    previousSnapshot?.commitments,
    8,
    220,
  ), resolvedWorkingMemoryTexts)
  const currentUserCorrections = mergeWorkingMemoryTextEntries(
    recentRawTurns
      .filter(turn => turn.role === 'user' && looksLikeCorrection(turn.text))
      .map(turn => ({
        text: turn.text,
        sourceTurnId: turn.turnId,
        scope: detectCorrectionScope(turn.text),
      })),
    previousSnapshot?.userCorrections,
    8,
    220,
  )
  const currentRelationshipPosture = relationFrame
    ? {
        summary: `relation=${relationFrame}`,
        source: 'conversation-state' as const,
      }
    : previousSnapshot?.relationshipPosture ?? null
  const currentEmotionalPosture = input.currentConsciousFrame?.consciousTension
    ? {
        summary: normalizeWorkingMemoryText(input.currentConsciousFrame.consciousTension, 260),
        source: 'conscious-frame' as const,
      }
    : previousSnapshot?.emotionalPosture ?? null
  const currentExecutionState = input.executionCarry
    ? {
        summary: normalizeWorkingMemoryText(input.executionCarry, 260),
        source: input.executionActive ? 'execution-ledger' as const : 'execution-callback' as const,
        status: input.executionActive ? 'active' as const : 'terminal' as const,
        observedAt: input.now,
      }
    : previousSnapshot?.executionState?.status === 'active'
      && Number.isFinite(previousSnapshot.executionState.observedAt)
      && input.now - Number(previousSnapshot.executionState.observedAt) < activeExecutionStateRetentionMs
      ? previousSnapshot.executionState
      : null
  const mergedMemoryQueryHints = mergeWorkingMemoryStrings([
    ...(input.conversationState?.memoryQueryHints ?? []),
    ...(input.dialogueWorldThread?.recallKeys ?? []),
  ], previousSnapshot?.memoryQueryHints, 8, 120)
  const currentLongTermCandidates = createLongTermCandidatesFromWorkingTurns(recentRawTurns)
    .map(candidate => ({
      ...candidate,
      summary: recoverLongTermCandidateSummary(candidate, recentRawTurns),
    }))
  const mergedLongTermCandidates = mergeLongTermCandidates(
    currentLongTermCandidates,
    previousSnapshot?.longTermCandidates,
  )
  const failureTurnIds = recentRawTurns
    .filter(turn => Boolean(turn.failureKind))
    .map(turn => turn.turnId)
  const excludedLongTermCandidateTurnIds = recentRawTurns
    .filter(shouldExcludeTurnFromLongTermCandidate)
    .map(turn => turn.turnId)
  const mergedAudit = mergeAudit({
    failureTurnIds,
    excludedLongTermCandidateTurnIds,
    notes: [
      failureTurnIds.length > 0 ? 'failure turns are audit-only and excluded from long-term candidates' : '',
      excludedLongTermCandidateTurnIds.length > 0 ? 'non-learning turns are excluded from long-term candidates' : '',
    ].filter(Boolean),
  }, previousSnapshot?.audit)
  const mergedSnapshot: WorkingMemorySnapshot = {
    ...snapshot,
    turnRange: {
      fromTurnId: firstTurn?.turnId ?? null,
      toTurnId: lastTurn?.turnId ?? null,
    },
    recentRawTurns,
    compressedTimeline: previousSnapshot?.compressedTimeline ?? [],
    currentThread: mergedThreadTitle
      ? {
          title: mergedThreadTitle,
          currentUserMove: mergedThreadCurrentUserMove || '',
          currentAliceMove: mergedThreadCurrentAliceMove,
          primaryAnchor: mergedThreadPrimaryAnchor,
          mode: mergedThreadMode ?? 'casual',
          shouldHold: mergedThreadShouldHold,
          confidence: mergedThreadConfidence,
        }
      : previousSnapshot?.currentThread ?? null,
    activeTask: activeProjectSummary
      ? {
          summary: activeProjectSummary,
          status: activeProjectStatus ?? 'waiting-user',
          evidenceTurnIds: mergedEvidenceTurnIds,
        }
      : previousSnapshot?.activeTask ?? null,
    unresolvedQuestions: currentUnresolvedQuestions,
    commitments: currentCommitments,
    userCorrections: currentUserCorrections,
    relationshipPosture: currentRelationshipPosture,
    emotionalPosture: currentEmotionalPosture,
    executionState: currentExecutionState,
    memoryQueryHints: mergedMemoryQueryHints,
    longTermCandidates: mergedLongTermCandidates,
    compression: previousSnapshot?.compression ?? snapshot.compression,
    audit: mergedAudit,
  }
  return compressWorkingMemorySnapshot(mergedSnapshot, {
    now: input.now,
    maxRawTurns: 6,
  })
}

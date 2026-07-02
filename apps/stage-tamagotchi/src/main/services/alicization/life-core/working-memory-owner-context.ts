import type { AlicizationVisualEpisode } from '../../../../shared/eventa'
import type {
  WorkingMemorySnapshot,
  WorkingMemoryTask,
  WorkingMemoryThread,
} from './working-memory'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export interface WorkingMemoryOwnerContext {
  version: 'working-memory-owner-context-v1'
  owner: 'working-memory'
  authorityLine: string
  scope: {
    cardId: string
    sessionId: string
    updatedAt: number
    turnRange: WorkingMemorySnapshot['turnRange']
  }
  current: {
    threadTitle: string | null
    threadMode: WorkingMemoryThread['mode'] | null
    shouldHoldThread: boolean
    currentUserMove: string | null
    activeTask: string | null
    taskStatus: WorkingMemoryTask['status'] | null
  }
  obligations: string[]
  queryHints: string[]
  audit: {
    failureTurnIds: string[]
    excludedLongTermCandidateTurnIds: string[]
    notes: string[]
  }
}

function numberOrZero(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : 0
}

function compact(raw: unknown, maxChars = 220) {
  return normalizeWorkingMemoryText(raw, maxChars)
}

function uniqueLines(values: string[], maxItems = 10) {
  return uniqueWorkingMemoryTexts(values, maxItems, 260)
}

function buildOwnerObligations(snapshot: WorkingMemorySnapshot) {
  return uniqueLines([
    ...snapshot.userCorrections.map(correction =>
      `respect_correction(${correction.scope}):${compact(correction.text, 220)}`,
    ),
    ...snapshot.unresolvedQuestions.map(question =>
      `answer_unresolved_question:${compact(question.text, 220)}`,
    ),
    ...snapshot.commitments.map(commitment =>
      `honor_commitment:${compact(commitment.text, 220)}`,
    ),
    snapshot.activeTask?.summary && snapshot.activeTask.status !== 'settled'
      ? `carry_task(${snapshot.activeTask.status}):${compact(snapshot.activeTask.summary, 220)}`
      : '',
    snapshot.currentThread?.shouldHold && snapshot.currentThread.title
      ? `hold_thread:${compact(snapshot.currentThread.title, 220)}`
      : '',
    snapshot.executionState?.summary
      ? `carry_execution:${compact(snapshot.executionState.summary, 220)}`
      : '',
    snapshot.audit.failureTurnIds.length > 0
      ? `failure_audit_only:${snapshot.audit.failureTurnIds.join(',')}`
      : '',
  ].filter(Boolean), 12)
}

export function buildWorkingMemoryOwnerContext(snapshot: WorkingMemorySnapshot): WorkingMemoryOwnerContext {
  return {
    version: 'working-memory-owner-context-v1',
    owner: 'working-memory',
    authorityLine: 'WorkingMemory is the authoritative short-term dialogue state for this turn; older runtime hints are inputs, not competing owners.',
    scope: {
      cardId: compact(snapshot.cardId, 120) || 'default',
      sessionId: compact(snapshot.sessionId, 160) || 'detached',
      updatedAt: numberOrZero(snapshot.updatedAt),
      turnRange: {
        fromTurnId: compact(snapshot.turnRange.fromTurnId, 120) || null,
        toTurnId: compact(snapshot.turnRange.toTurnId, 120) || null,
      },
    },
    current: {
      threadTitle: compact(snapshot.currentThread?.title, 220) || null,
      threadMode: snapshot.currentThread?.mode ?? null,
      shouldHoldThread: Boolean(snapshot.currentThread?.shouldHold),
      currentUserMove: compact(snapshot.currentThread?.currentUserMove, 220) || null,
      activeTask: compact(snapshot.activeTask?.summary, 220) || null,
      taskStatus: snapshot.activeTask?.status ?? null,
    },
    obligations: buildOwnerObligations(snapshot),
    queryHints: uniqueWorkingMemoryTexts(snapshot.memoryQueryHints, 8, 120),
    audit: {
      failureTurnIds: uniqueWorkingMemoryTexts(snapshot.audit.failureTurnIds, 20, 120),
      excludedLongTermCandidateTurnIds: uniqueWorkingMemoryTexts(snapshot.audit.excludedLongTermCandidateTurnIds, 20, 120),
      notes: uniqueWorkingMemoryTexts(snapshot.audit.notes, 8, 220),
    },
  }
}

function renderOwnerList(label: string, values: string[]) {
  return `${label}=${values.length > 0 ? values.join(' ; ') : 'none'}`
}

export function buildWorkingMemoryOwnerSystemBlock(context: WorkingMemoryOwnerContext) {
  const lines = [
    '[ALICIZATION_WORKING_MEMORY_OWNER]',
    `owner=${context.owner}`,
    `authority=${context.authorityLine}`,
    context.current.threadTitle
      ? `thread=${[
        context.current.threadTitle,
        context.current.threadMode ? `mode=${context.current.threadMode}` : '',
        `hold=${context.current.shouldHoldThread ? 'yes' : 'no'}`,
        context.current.currentUserMove ? `user=${context.current.currentUserMove}` : '',
      ].filter(Boolean).join(' | ')}`
      : 'thread=none',
    context.current.activeTask && context.current.taskStatus
      ? `task=${context.current.taskStatus}:${context.current.activeTask}`
      : 'task=none',
    renderOwnerList('obligations', context.obligations),
    renderOwnerList('memory_query_hints', context.queryHints),
    renderOwnerList('failure_audit_only', context.audit.failureTurnIds),
    renderOwnerList('excluded_long_term', context.audit.excludedLongTermCandidateTurnIds),
  ]
  return uniqueWorkingMemoryTexts(lines, lines.length, 500).join('\n')
}

function deriveEpisodeTension(snapshot: WorkingMemorySnapshot): AlicizationVisualEpisode['emotionalTension'] {
  const text = [
    snapshot.emotionalPosture?.summary,
    snapshot.executionState?.summary,
    snapshot.activeTask?.status,
  ].map(value => compact(value, 220).toLowerCase()).filter(Boolean).join(' ')

  if (/failed|failure|error|失败|报错|blocked|卡住/u.test(text))
    return 'tense-debug'
  if (/rest|疲惫|late|drain|休息/u.test(text))
    return 'late-night-drain'
  if (/calm|soft|quiet|陪伴/u.test(text))
    return 'soft-covision'
  return 'focused-flow'
}

function buildOwnerEpisodeSummary(context: WorkingMemoryOwnerContext) {
  return uniqueWorkingMemoryTexts([
    context.current.threadTitle ? `thread=${context.current.threadTitle}` : '',
    context.current.activeTask && context.current.taskStatus
      ? `task=${context.current.taskStatus}:${context.current.activeTask}`
      : '',
    context.obligations.find(line => line.startsWith('respect_correction('))?.replace(/^respect_correction\([^)]*\):/u, 'correction=') ?? '',
    context.obligations.find(line => line.startsWith('answer_unresolved_question:'))?.replace(/^answer_unresolved_question:/u, 'question=') ?? '',
    context.audit.failureTurnIds.length > 0 ? `audit_failures=${context.audit.failureTurnIds.join(',')}` : '',
  ], 6, 260).join(' | ')
}

export function projectWorkingMemoryOwnerEpisodes(
  snapshot: WorkingMemorySnapshot,
  existingEpisodes: AlicizationVisualEpisode[] = [],
): AlicizationVisualEpisode[] {
  const context = buildWorkingMemoryOwnerContext(snapshot)
  const summary = buildOwnerEpisodeSummary(context)
  if (!summary)
    return existingEpisodes.filter(episode => episode.scene !== 'working-memory-owner').slice(-8)

  const beganAt = snapshot.recentRawTurns[0]?.createdAt ?? context.scope.updatedAt
  const episode: AlicizationVisualEpisode = {
    scene: 'working-memory-owner',
    summary,
    attentionTarget: context.current.activeTask ?? context.current.threadTitle ?? undefined,
    beganAt,
    endedAt: context.scope.updatedAt,
    confidence: Math.max(0.5, Math.min(0.92, snapshot.currentThread?.confidence ?? 0.62)),
    emotionalTension: deriveEpisodeTension(snapshot),
    sedimentCandidate: false,
  }

  return [
    ...existingEpisodes.filter(episode => episode.scene !== 'working-memory-owner'),
    episode,
  ].slice(-8)
}

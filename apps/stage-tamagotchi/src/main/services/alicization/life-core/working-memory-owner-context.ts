import type { AlicizationVisualEpisode } from '../../../../shared/eventa'
import type {
  WorkingMemorySnapshot,
  WorkingMemoryTask,
  WorkingMemoryThread,
} from './working-memory'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { buildWorkingMemoryLongTermCandidateQueue } from './working-memory-long-term-queue'

export interface WorkingMemoryOwnerContext {
  version: 'working-memory-owner-context-v1'
  owner: 'working-memory'
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
  longTermQueue: WorkingMemoryLongTermQueueItem[]
}

function numberOrZero(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : 0
}

function compact(raw: unknown, maxChars = 220) {
  const normalized = normalizeWorkingMemoryText(raw, maxChars)
  return sanitizeAlicizationProviderFacingText(normalized, maxChars)
}

function compactRaw(raw: unknown, maxChars = 220) {
  return normalizeWorkingMemoryText(raw, maxChars)
}

function uniqueLines(values: string[], maxItems = 10) {
  return uniqueWorkingMemoryTexts(
    values.map(value => compact(value, 260)),
    maxItems,
    260,
  )
}

function buildOwnerObligations(snapshot: WorkingMemorySnapshot) {
  return uniqueWorkingMemoryTexts([
    ...snapshot.userCorrections.map(correction =>
      correction.text,
    ),
    ...snapshot.unresolvedQuestions.map(question =>
      question.text,
    ),
    ...snapshot.commitments.map(commitment =>
      commitment.text,
    ),
    snapshot.activeTask?.summary && snapshot.activeTask.status !== 'settled'
      ? compact(snapshot.activeTask.summary, 220)
      : '',
    snapshot.currentThread?.shouldHold && snapshot.currentThread.title
      ? compact(snapshot.currentThread.title, 220)
      : '',
    snapshot.executionState?.summary
      ? compactRaw(snapshot.executionState.summary, 220)
      : '',
  ].filter(Boolean), 12, 220)
}

export function buildWorkingMemoryOwnerContext(snapshot: WorkingMemorySnapshot): WorkingMemoryOwnerContext {
  return {
    version: 'working-memory-owner-context-v1',
    owner: 'working-memory',
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
      currentUserMove: normalizeWorkingMemoryText(snapshot.currentThread?.currentUserMove, 220) || null,
      activeTask: compact(snapshot.activeTask?.summary, 220) || null,
      taskStatus: snapshot.activeTask?.status ?? null,
    },
    obligations: buildOwnerObligations(snapshot),
    queryHints: uniqueLines(snapshot.memoryQueryHints, 8),
    audit: {
      failureTurnIds: uniqueWorkingMemoryTexts(snapshot.audit.failureTurnIds, 20, 120),
      excludedLongTermCandidateTurnIds: uniqueWorkingMemoryTexts(snapshot.audit.excludedLongTermCandidateTurnIds, 20, 120),
      notes: uniqueLines(snapshot.audit.notes, 8),
    },
    longTermQueue: buildWorkingMemoryLongTermCandidateQueue(snapshot),
  }
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
    context.obligations[0] ?? '',
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

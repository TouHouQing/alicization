import type {
  WorkingMemoryAuditState,
  WorkingMemoryCommitment,
  WorkingMemoryCompressionState,
  WorkingMemoryCorrection,
  WorkingMemoryEmotionalPosture,
  WorkingMemoryEpisodelet,
  WorkingMemoryExecutionState,
  WorkingMemoryLongTermCandidate,
  WorkingMemoryQuestion,
  WorkingMemoryRelationshipPosture,
  WorkingMemorySnapshot,
  WorkingMemoryTask,
  WorkingMemoryThread,
} from './working-memory'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export interface WorkingMemoryQualityView {
  version: 'working-memory-quality-view-v1'
  scope: {
    cardId: string
    sessionId: string
    updatedAt: number
    turnRange: WorkingMemorySnapshot['turnRange']
  }
  modules: {
    thread: {
      title: string | null
      currentUserMove: string | null
      currentAliceMove: string | null
      primaryAnchor: string | null
      mode: WorkingMemoryThread['mode'] | null
      shouldHold: boolean | null
      confidence: number | null
    }
    task: {
      summary: string | null
      status: WorkingMemoryTask['status'] | null
      evidenceTurnIds: string[]
    }
    compressedTimeline: Array<{
      summary: string
      thread: string | null
      sourceTurnIds: string[]
    }>
    unresolvedQuestions: string[]
    memoryQueryHints: string[]
    commitments: string[]
    corrections: Array<{
      text: string
      scope: WorkingMemoryCorrection['scope']
    }>
    relationshipPosture: WorkingMemoryRelationshipPosture | null
    emotionalPosture: WorkingMemoryEmotionalPosture | null
    executionState: WorkingMemoryExecutionState | null
    compression: WorkingMemoryCompressionState
    audit: WorkingMemoryAuditState
    longTermCandidates: WorkingMemoryLongTermCandidate[]
  }
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(normalizeWorkingMemoryText(raw, maxChars), maxChars)
}

function numberOrNull(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : null
}

function uniqueItems<T>(items: T[], keyOf: (item: T) => string, maxItems = 8) {
  const result: T[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const key = keyOf(item)
    if (!key || seen.has(key))
      continue
    seen.add(key)
    result.push(item)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeQuestions(questions: WorkingMemoryQuestion[]) {
  return uniqueItems(
    questions.map(item => sanitizePromptText(item.text, 220)).filter(Boolean),
    item => item,
    8,
  )
}

function normalizeCommitments(commitments: WorkingMemoryCommitment[]) {
  return uniqueItems(
    commitments.map(item => sanitizePromptText(item.text, 220)).filter(Boolean),
    item => item,
    8,
  )
}

function normalizeCorrections(corrections: WorkingMemoryCorrection[]) {
  return uniqueItems(
    corrections.map(item => ({
      text: sanitizePromptText(item.text, 220),
      scope: item.scope,
    })).filter(item => item.text),
    item => `${item.scope}:${item.text}`,
    8,
  )
}

function normalizeCompressedTimeline(episodes: WorkingMemoryEpisodelet[]) {
  return uniqueItems(
    episodes.slice(-4).map(episode => ({
      summary: sanitizePromptText(episode.summary, 260),
      thread: sanitizePromptText(episode.thread, 160) || null,
      sourceTurnIds: uniqueWorkingMemoryTexts(episode.sourceTurnIds, 12, 120),
    })).filter(episode => episode.summary),
    episode => [
      episode.summary,
      episode.thread ?? '',
      episode.sourceTurnIds.join(','),
    ].join('|'),
    4,
  )
}

function normalizeLongTermCandidates(candidates: WorkingMemoryLongTermCandidate[]) {
  return uniqueItems(
    candidates.map(candidate => ({
      ...candidate,
      summary: sanitizePromptText(candidate.summary, 260),
      reason: sanitizePromptText(candidate.reason, 260),
      sourceTurnIds: uniqueWorkingMemoryTexts(candidate.sourceTurnIds, 12, 120),
    })).filter(candidate => candidate.summary),
    candidate => [
      candidate.kind,
      candidate.summary,
      candidate.reason,
      candidate.sourceTurnIds.join(','),
    ].join('|'),
    6,
  )
}

function normalizeAudit(audit: WorkingMemoryAuditState): WorkingMemoryAuditState {
  return {
    failureTurnIds: uniqueWorkingMemoryTexts(audit.failureTurnIds, 20, 120),
    excludedLongTermCandidateTurnIds: uniqueWorkingMemoryTexts(audit.excludedLongTermCandidateTurnIds, 20, 120),
    notes: uniqueItems(
      audit.notes.map(note => sanitizePromptText(note, 220)).filter(Boolean),
      note => note,
      8,
    ),
  }
}

export function buildWorkingMemoryQualityView(snapshot: WorkingMemorySnapshot): WorkingMemoryQualityView {
  const thread = snapshot.currentThread
  const task = snapshot.activeTask
  const modules: WorkingMemoryQualityView['modules'] = {
    thread: {
      title: sanitizePromptText(thread?.title, 220) || null,
      currentUserMove: sanitizePromptText(thread?.currentUserMove, 220) || null,
      currentAliceMove: sanitizePromptText(thread?.currentAliceMove, 220) || null,
      primaryAnchor: sanitizePromptText(thread?.primaryAnchor, 180) || null,
      mode: thread?.mode ?? null,
      shouldHold: thread?.shouldHold ?? null,
      confidence: numberOrNull(thread?.confidence),
    },
    task: {
      summary: sanitizePromptText(task?.summary, 220) || null,
      status: task?.status ?? null,
      evidenceTurnIds: uniqueWorkingMemoryTexts(task?.evidenceTurnIds ?? [], 12, 120),
    },
    compressedTimeline: normalizeCompressedTimeline(snapshot.compressedTimeline),
    unresolvedQuestions: normalizeQuestions(snapshot.unresolvedQuestions),
    memoryQueryHints: uniqueItems(
      snapshot.memoryQueryHints.map(hint => sanitizePromptText(hint, 120)).filter(Boolean),
      hint => hint,
      8,
    ),
    commitments: normalizeCommitments(snapshot.commitments),
    corrections: normalizeCorrections(snapshot.userCorrections),
    relationshipPosture: snapshot.relationshipPosture
      ? {
          summary: sanitizePromptText(snapshot.relationshipPosture.summary, 220),
          source: snapshot.relationshipPosture.source,
        }
      : null,
    emotionalPosture: snapshot.emotionalPosture
      ? {
          summary: sanitizePromptText(snapshot.emotionalPosture.summary, 220),
          source: snapshot.emotionalPosture.source,
        }
      : null,
    executionState: snapshot.executionState
      ? {
          summary: sanitizePromptText(snapshot.executionState.summary, 220),
          source: snapshot.executionState.source,
        }
      : null,
    compression: {
      level: snapshot.compression.level,
      sourceTurnIds: uniqueWorkingMemoryTexts(snapshot.compression.sourceTurnIds, 80, 120),
      lastCompressedAt: numberOrNull(snapshot.compression.lastCompressedAt),
    },
    audit: normalizeAudit(snapshot.audit),
    longTermCandidates: normalizeLongTermCandidates(snapshot.longTermCandidates),
  }

  const scope = {
    cardId: sanitizePromptText(snapshot.cardId, 120) || 'default',
    sessionId: sanitizePromptText(snapshot.sessionId, 160) || 'detached',
    updatedAt: numberOrNull(snapshot.updatedAt) ?? 0,
    turnRange: {
      fromTurnId: sanitizePromptText(snapshot.turnRange.fromTurnId, 120) || null,
      toTurnId: sanitizePromptText(snapshot.turnRange.toTurnId, 120) || null,
    },
  }
  return {
    version: 'working-memory-quality-view-v1',
    scope,
    modules,
  }
}

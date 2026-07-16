import type { Message } from '@xsai/shared-chat'

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

export interface WorkingMemoryPromptView {
  version: 'working-memory-prompt-view-v1'
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
  rendering: {
    blockLines: string[]
  }
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(normalizeWorkingMemoryText(raw, maxChars), maxChars)
}

function numberOrNull(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : null
}

function formatScore(raw: unknown) {
  const score = numberOrNull(raw)
  return score === null ? null : score.toFixed(2)
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

function readableWorkingMemoryLabel(label: string) {
  return label.replace(/_/gu, ' ')
}

function renderListLine(label: string, values: string[]) {
  return `${readableWorkingMemoryLabel(label)}: ${values.length > 0 ? values.join('; ') : 'none'}.`
}

function renderThreadLine(thread: WorkingMemoryPromptView['modules']['thread']) {
  if (!thread.title)
    return 'Thread: none.'

  return [
    `Thread: ${thread.title}.`,
    thread.mode ? `Mode: ${thread.mode}.` : '',
    thread.shouldHold === null ? '' : `Hold thread: ${thread.shouldHold ? 'yes' : 'no'}.`,
    thread.currentUserMove ? `Current user move: ${thread.currentUserMove}.` : '',
    thread.currentAliceMove ? `Current Alice move: ${thread.currentAliceMove}.` : '',
    thread.primaryAnchor ? `Primary anchor: ${thread.primaryAnchor}.` : '',
    formatScore(thread.confidence) ? `Confidence: ${formatScore(thread.confidence)}.` : '',
  ].filter(Boolean).join(' ')
}

function renderTaskLine(task: WorkingMemoryPromptView['modules']['task']) {
  if (!task.summary || !task.status)
    return 'Task: none.'

  return [
    `Task: ${task.status}: ${task.summary}.`,
    task.evidenceTurnIds.length > 0 ? `Evidence turns: ${task.evidenceTurnIds.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
}

function renderCompressedTimelineLine(episodes: WorkingMemoryPromptView['modules']['compressedTimeline']) {
  if (episodes.length === 0)
    return 'Compressed timeline: none.'

  return `Compressed timeline: ${episodes.map((episode) => {
    return [
      episode.summary,
      episode.thread ? `Thread: ${episode.thread}` : '',
      episode.sourceTurnIds.length > 0 ? `Sources: ${episode.sourceTurnIds.join(', ')}` : '',
    ].filter(Boolean).join('. ')
  }).filter(Boolean).join('; ')}.`
}

function renderPostureLine(
  label: 'relationship' | 'emotion' | 'execution',
  posture: WorkingMemoryRelationshipPosture | WorkingMemoryEmotionalPosture | WorkingMemoryExecutionState | null,
) {
  if (!posture)
    return `${readableWorkingMemoryLabel(label)}: none.`
  return `${readableWorkingMemoryLabel(label)}: ${posture.summary}. Source: ${posture.source}.`
}

function renderCompressionLine(compression: WorkingMemoryCompressionState) {
  if (
    compression.level === 'none'
    && compression.sourceTurnIds.length === 0
    && compression.lastCompressedAt === null
  ) {
    return 'Compression: none.'
  }

  return [
    `Compression: ${compression.level}.`,
    compression.sourceTurnIds.length > 0 ? `Sources: ${compression.sourceTurnIds.join(', ')}.` : '',
    compression.lastCompressedAt === null ? '' : `Last compressed at: ${compression.lastCompressedAt}.`,
  ].filter(Boolean).join(' ')
}

function renderAuditLine(audit: WorkingMemoryAuditState) {
  if (
    audit.failureTurnIds.length === 0
    && audit.excludedLongTermCandidateTurnIds.length === 0
    && audit.notes.length === 0
  ) {
    return 'Audit: none.'
  }

  return [
    'Audit:',
    audit.failureTurnIds.length > 0 ? `Failures: ${audit.failureTurnIds.join(', ')}.` : '',
    audit.excludedLongTermCandidateTurnIds.length > 0
      ? `Excluded long-term candidates: ${audit.excludedLongTermCandidateTurnIds.join(', ')}.`
      : '',
    audit.notes.length > 0 ? `Notes: ${audit.notes.join('; ')}.` : '',
  ].filter(Boolean).join(' ')
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

function uniqueBlockLines(lines: string[]) {
  const result: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    if (!line || seen.has(line))
      continue
    seen.add(line)
    result.push(line)
  }
  return result
}

export function buildWorkingMemoryPromptView(snapshot: WorkingMemorySnapshot): WorkingMemoryPromptView {
  const thread = snapshot.currentThread
  const task = snapshot.activeTask
  const modules: WorkingMemoryPromptView['modules'] = {
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

  const correctionLines = modules.corrections.map(item => `${item.scope}:${item.text}`)
  const scope = {
    cardId: sanitizePromptText(snapshot.cardId, 120) || 'default',
    sessionId: sanitizePromptText(snapshot.sessionId, 160) || 'detached',
    updatedAt: numberOrNull(snapshot.updatedAt) ?? 0,
    turnRange: {
      fromTurnId: sanitizePromptText(snapshot.turnRange.fromTurnId, 120) || null,
      toTurnId: sanitizePromptText(snapshot.turnRange.toTurnId, 120) || null,
    },
  }
  const rangeLine = scope.turnRange.fromTurnId || scope.turnRange.toTurnId
    ? `Turn range: ${scope.turnRange.fromTurnId ?? 'unknown'}..${scope.turnRange.toTurnId ?? 'unknown'}.`
    : ''

  return {
    version: 'working-memory-prompt-view-v1',
    scope,
    modules,
    rendering: {
      blockLines: uniqueBlockLines([
        'WorkingMemory short-term memory evidence.',
        'Owner: WorkingMemory. Scope: short-term dialogue. Use it only when it helps the current answer payoff.',
        rangeLine,
        renderThreadLine(modules.thread),
        renderTaskLine(modules.task),
        renderCompressedTimelineLine(modules.compressedTimeline),
        renderListLine('questions', modules.unresolvedQuestions),
        renderListLine('memory_query_hints', modules.memoryQueryHints),
        renderListLine('commitments', modules.commitments),
        renderListLine('corrections', correctionLines),
        renderPostureLine('relationship', modules.relationshipPosture),
        renderPostureLine('emotion', modules.emotionalPosture),
        renderPostureLine('execution', modules.executionState),
        renderCompressionLine(modules.compression),
        renderAuditLine(modules.audit),
      ]),
    },
  }
}

export function buildWorkingMemorySystemBlock(view: WorkingMemoryPromptView) {
  return view.rendering.blockLines.join('\n')
}

export function buildWorkingMemoryPromptBlock(snapshot: WorkingMemorySnapshot) {
  return buildWorkingMemorySystemBlock(buildWorkingMemoryPromptView(snapshot))
}

export function injectWorkingMemorySystemBlock(messages: Message[], systemBlock: string | null | undefined): Message[] {
  const normalizedBlock = normalizeWorkingMemoryText(systemBlock, 5000)
    .split('\n')
    .map(line => sanitizePromptText(line, 5000))
    .filter(Boolean)
    .join('\n')
  if (!normalizedBlock)
    return messages
  if (messages.some(message => message.role === 'system' && typeof message.content === 'string' && message.content.trim() === normalizedBlock))
    return messages

  const insertionIndex = messages.findIndex(message => message.role !== 'system')
  const nextMessages = [...messages]
  nextMessages.splice(insertionIndex >= 0 ? insertionIndex : nextMessages.length, 0, {
    role: 'system',
    content: normalizedBlock,
  } as Message)
  return nextMessages
}

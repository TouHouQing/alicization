import type {
  AlicizationEpisodicEventInput,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'

import { createHash } from 'node:crypto'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function stableEpisodeId(namespace: string, values: Array<string | number | null | undefined>) {
  const hash = createHash('sha1')
    .update(values.map(value => String(value ?? '')).join('|'))
    .digest('hex')
    .slice(0, 20)
  return `${namespace}:${hash}`
}

function taskThreadToEpisodeSourceKind(thread: AlicizationTaskThreadRecord) {
  return thread.status === 'completed' || thread.status === 'failed' || thread.status === 'cancelled'
    ? 'execution-result'
    : 'execution-proposal'
}

function isNonMemoryExecutionStatus(
  status: AlicizationTaskThreadRecord['status'],
): status is Extract<AlicizationTaskThreadRecord['status'], 'blocked' | 'failed' | 'cancelled' | 'dead-lettered'> {
  return status === 'blocked'
    || status === 'failed'
    || status === 'cancelled'
    || status === 'dead-lettered'
}

export function buildAutobiographicalEpisodesFromTaskThreadUpdate(input: {
  cardId: string
  source: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  taskThread: AlicizationTaskThreadRecord
}): AlicizationEpisodicEventInput[] {
  const thread = input.taskThread
  if (isNonMemoryExecutionStatus(thread.status))
    return []

  const goal = sanitizeText(thread.goal, 180)
  if (!goal)
    return []

  const sourceKind = taskThreadToEpisodeSourceKind(thread)
  const channel = sanitizeText(thread.selectedChannel ?? thread.proposedChannel, 48)
  const occurredAt = Number.isFinite(thread.completedAt)
    ? Math.max(0, Number(thread.completedAt))
    : Number.isFinite(thread.lastEventAt)
      ? Math.max(0, Number(thread.lastEventAt))
      : Math.max(0, Number(thread.updatedAt))
  const summary = sanitizeText(thread.summary, 220)

  return [{
    id: stableEpisodeId('autobio-execution', [
      input.cardId,
      thread.id,
      thread.status,
      input.source,
    ]),
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId ?? thread.decisionTraceId,
    turnId: input.turnId ?? thread.turnId,
    sessionId: input.sessionId ?? thread.sessionId,
    sourceKind,
    provenance: 'observed',
    occurredAt,
    whereSummary: channel
      ? `channel=${channel}`
      : null,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: summary || goal,
    felt: null,
    emotionTags: uniqueList([
      'execution',
      thread.status,
      sourceKind,
    ], 4),
    whatChanged: `status=${thread.status}`,
    relationshipMeaning: null,
    lesson: null,
    sourceSummary: [
      `source=${sanitizeText(input.source, 80) || 'session-mirror'}`,
      `status=${thread.status}`,
      channel ? `channel=${channel}` : '',
    ].filter(Boolean).join(' | '),
    confidence: thread.status === 'completed' ? 0.86 : thread.status === 'needs-affirmation' ? 0.8 : 0.82,
    sceneAttachment: thread.status === 'running' || thread.status === 'completed' ? 0.4 : 0.28,
    consolidationPriority: thread.status === 'completed' ? 0.72 : 0.62,
    derivedFrom: [
      input.turnId || thread.turnId ? { kind: 'turn', id: input.turnId ?? thread.turnId, label: 'session mirror task-thread turn' } : null,
      { kind: 'task-thread', id: thread.id, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: uniqueList([
      'session-mirror',
      sanitizeText(input.source, 48),
      thread.status,
      channel,
    ], 6),
  }]
}

export function buildAutobiographicalEpisodesFromPreparedMirror(input: {
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId: string
  previousMirror?: AlicizationDialogueSessionMirror | null
  mirror: AlicizationDialogueSessionMirror
}): AlicizationEpisodicEventInput[] {
  const events: AlicizationEpisodicEventInput[] = []
  const currentRecollection = input.mirror.recollection
  const previousRecollection = input.previousMirror?.recollection ?? null
  const currentSummary = sanitizeText(currentRecollection?.foreground, 220)
  if (currentRecollection?.afterthoughtState === 'ripe' && currentSummary) {
    if (previousRecollection?.afterthoughtState !== 'ripe' || currentSummary !== sanitizeText(previousRecollection.foreground, 220)) {
      const confidence = Number.isFinite(currentRecollection.confidence)
        ? Math.max(0, Math.min(1, Number(currentRecollection.confidence)))
        : 0.68
      events.push({
        id: stableEpisodeId('autobio-afterthought', [
          input.cardId,
          input.sessionId,
          currentSummary,
        ]),
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId ?? input.mirror.decisionTraceId,
        turnId: input.turnId,
        sessionId: input.sessionId,
        sourceKind: 'maintenance',
        provenance: confidence >= 0.74 ? 'remembered' : 'reconstructed',
        occurredAt: input.mirror.updatedAt,
        whereSummary: 'session-mirror:afterthought',
        withWhom: ['self'],
        threadAnchor: currentSummary,
        whatHappened: currentSummary,
        felt: null,
        emotionTags: ['afterthought'],
        whatChanged: null,
        relationshipMeaning: null,
        lesson: null,
        sourceSummary: 'source=prepared-session-mirror | kind=afterthought',
        confidence,
        sceneAttachment: 0.24,
        consolidationPriority: confidence >= 0.74 ? 0.72 : 0.62,
        derivedFrom: [
          input.turnId ? { kind: 'turn', id: input.turnId, label: 'prepared execution turn' } : null,
        ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
        tags: uniqueList([
          'session-mirror',
          'afterthought',
          'recollection',
        ], 6),
      })
    }
  }

  return events
}

export function buildAutobiographicalEpisodesFromSessionMirrorSync(input: {
  cardId: string
  source: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId: string
  previousMirror?: AlicizationDialogueSessionMirror | null
  mirror: AlicizationDialogueSessionMirror
  taskThread?: AlicizationTaskThreadRecord | null
}): AlicizationEpisodicEventInput[] {
  const events: AlicizationEpisodicEventInput[] = []
  if (input.taskThread) {
    events.push(...buildAutobiographicalEpisodesFromTaskThreadUpdate({
      cardId: input.cardId,
      source: input.source,
      decisionTraceId: input.decisionTraceId ?? input.mirror.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      taskThread: input.taskThread,
    }))
  }

  const source = sanitizeText(input.source, 48).toLowerCase()
  const currentRuntime = sanitizeText(input.mirror.digitalLifeRuntimeSummary, 220)
  const previousRuntime = sanitizeText(input.previousMirror?.digitalLifeRuntimeSummary, 220)
  const currentMemory = sanitizeText(input.mirror.memorySummary, 220)
  if (source.includes('dream') && (currentRuntime || currentMemory) && (currentRuntime !== previousRuntime || currentMemory !== sanitizeText(input.previousMirror?.memorySummary, 220))) {
    const summary = currentRuntime || currentMemory
    events.push({
      id: stableEpisodeId('autobio-dream', [
        input.cardId,
        input.sessionId,
        summary,
      ]),
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId ?? input.mirror.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'maintenance',
      provenance: 'remembered',
      occurredAt: input.mirror.updatedAt,
      whereSummary: 'session-mirror:dream',
      withWhom: ['self'],
      threadAnchor: summary,
      whatHappened: summary,
      felt: null,
      emotionTags: ['dream'],
      whatChanged: null,
      relationshipMeaning: null,
      lesson: null,
      sourceSummary: 'source=session-mirror | kind=dream',
      confidence: 0.76,
      sceneAttachment: 0.12,
      consolidationPriority: 0.74,
      derivedFrom: [
        input.turnId ? { kind: 'dream', id: input.turnId, label: 'session-mirror:dream' } : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: ['session-mirror', 'dream'],
    })
  }

  return events
}

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

function summarizeTaskThreadWhatHappened(thread: AlicizationTaskThreadRecord, source: string) {
  const channel = sanitizeText(thread.selectedChannel ?? thread.proposedChannel, 48)
  const goal = sanitizeText(thread.goal, 180) || 'the current task thread'
  const summary = sanitizeText(thread.summary, 200)
  if (thread.status === 'needs-affirmation') {
    return channel
      ? `A ${channel} execution path for ${goal} stayed bounded and waited for host affirmation.`
      : `An execution path for ${goal} stayed bounded and waited for host affirmation.`
  }
  if (thread.status === 'planned') {
    return channel
      ? `A ${channel} execution path for ${goal} was planned and kept available as a remembered next move.`
      : `An execution path for ${goal} was planned and kept available as a remembered next move.`
  }
  if (thread.status === 'running') {
    return channel
      ? `${channel} was actively carrying ${goal}.`
      : `Execution was actively carrying ${goal}.`
  }
  if (thread.status === 'completed') {
    return summary
      ? `The ${goal} thread completed and settled as: ${summary}`
      : `The ${goal} thread completed and became a finished remembered execution line.`
  }
  if (thread.status === 'failed') {
    return summary
      ? `The ${goal} thread failed and left this remembered result: ${summary}`
      : `The ${goal} thread failed and became a remembered execution setback.`
  }
  if (thread.status === 'cancelled') {
    return summary
      ? `The ${goal} thread was cancelled after reaching: ${summary}`
      : `The ${goal} thread was cancelled before it could fully land.`
  }
  if (thread.status === 'blocked') {
    return summary
      ? `The ${goal} thread became blocked around: ${summary}`
      : `The ${goal} thread became blocked and could not yet continue.`
  }
  if (thread.status === 'paused') {
    return `The ${goal} thread paused and stayed suspended for later continuation.`
  }
  return `The ${goal} thread changed state through ${sanitizeText(source, 80) || 'session mirror sync'}.`
}

function summarizeTaskThreadFeeling(thread: AlicizationTaskThreadRecord) {
  switch (thread.status) {
    case 'needs-affirmation':
      return 'I felt the line hold back and wait for the host to actually open the door.'
    case 'planned':
      return 'I felt the line settle into readiness without forcing it forward yet.'
    case 'running':
      return 'I felt the task line stay alive and actively in motion.'
    case 'completed':
      return 'I felt the line finally land and become something I could carry forward.'
    case 'failed':
      return 'I felt the need to remember where the line broke instead of pretending it had landed.'
    case 'cancelled':
      return 'I felt the line close before it could finish carrying through.'
    case 'blocked':
      return 'I felt the line catch on something that still needed clearing.'
    case 'paused':
      return 'I felt the line stay suspended rather than disappear.'
    default:
      return 'I felt the execution line shift into a new state.'
  }
}

function summarizeTaskThreadLesson(thread: AlicizationTaskThreadRecord) {
  switch (thread.status) {
    case 'needs-affirmation':
      return 'If execution is not yet invited, keep the line bounded and wait for an actual opening.'
    case 'planned':
      return 'A task line can stay prepared without being pushed into action too early.'
    case 'running':
      return 'When the line is already moving, remember the carrying method instead of reopening from zero.'
    case 'completed':
      return 'A finished execution line should stay available as remembered procedure, not just as a transient callback.'
    case 'failed':
      return 'A failed execution line should be remembered as a lived procedure lesson, not just as an error log.'
    case 'cancelled':
      return 'Cancelled lines should still become part of remembered experience if they changed what is safe to try next.'
    case 'blocked':
      return 'Blocked lines should stay remembered as unresolved experience instead of disappearing from continuity.'
    case 'paused':
      return 'Paused lines should remain carryable and resumable in autobiographical memory.'
    default:
      return 'Execution changes should become lived experience rather than isolated runtime records.'
  }
}

function deriveExecutionCallbackCarryModeFromMirror(mirror: AlicizationDialogueSessionMirror) {
  const haystack = [
    sanitizeText(mirror.agencySummary, 220),
    sanitizeText(mirror.digitalLifeRuntimeSummary, 220),
    sanitizeText(mirror.recollection?.foreground, 220),
  ].join(' ').toLowerCase()
  if (!/afterglow=execution-callback|execution-callback/u.test(haystack))
    return null
  if (/carry=repair-before-closeness|repair-before-closeness|repair first|let repair settle|callback repair/u.test(haystack))
    return 'repair-before-closeness' as const
  if (/carry=lower-pressure|lower-pressure|leave room|keep room|space first|measured-return|bounded-return|reconfirmation|surface fully cools/u.test(haystack))
    return 'lower-pressure' as const
  if (/carry=trust-warming|trust-warming|soft-handoff|trust warmed|trust warming/u.test(haystack))
    return 'trust-warming' as const
  return 'execution-callback' as const
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
      ? `task thread via ${channel}`
      : 'task thread continuity',
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: summarizeTaskThreadWhatHappened(thread, input.source),
    felt: summarizeTaskThreadFeeling(thread),
    emotionTags: uniqueList([
      'execution',
      thread.status,
      sourceKind,
    ], 4),
    whatChanged: summary || `thread ${thread.status}`,
    relationshipMeaning: thread.status === 'needs-affirmation'
      ? 'Execution stayed bounded and waited for the host rather than assuming authority.'
      : thread.status === 'completed'
        ? 'A carried task line became part of lived shared history instead of remaining a raw callback.'
        : thread.status === 'failed' || thread.status === 'blocked'
          ? 'A broken task line still changed what Alicization should remember and how she should proceed next time.'
          : 'The execution line changed the shared working continuity.',
    lesson: summarizeTaskThreadLesson(thread),
    sourceSummary: sanitizeText(`session mirror ${input.source}`, 160) || 'session mirror execution sync',
    confidence: thread.status === 'completed' ? 0.86 : thread.status === 'needs-affirmation' ? 0.8 : 0.82,
    sceneAttachment: thread.status === 'running' || thread.status === 'completed' ? 0.4 : 0.28,
    consolidationPriority: thread.status === 'failed' || thread.status === 'blocked' ? 0.78 : thread.status === 'completed' ? 0.72 : 0.62,
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
  projectStatePreDialogueAwarenessLine?: string | null
  projectStatePreflightSummary?: string | null
  projectStateEmotionalClosureCue?: string | null
  projectStatePrimaryOpenLoop?: string | null
  projectStateSameHerSelfLine?: string | null
}): AlicizationEpisodicEventInput[] {
  const events: AlicizationEpisodicEventInput[] = []
  const currentRecollection = input.mirror.recollection
  const previousRecollection = input.previousMirror?.recollection ?? null
  const currentSummary = sanitizeText(currentRecollection?.foreground, 220)
  const currentCarryMode = deriveExecutionCallbackCarryModeFromMirror(input.mirror)
  const previousCarryMode = input.previousMirror ? deriveExecutionCallbackCarryModeFromMirror(input.previousMirror) : null
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
        whereSummary: 'session mirror afterthought',
        withWhom: ['host', 'self'],
        threadAnchor: currentSummary,
        whatHappened: `After the visible answer, the recollection stayed alive and ripened into an inward afterthought: ${currentSummary}`,
        felt: confidence >= 0.74
          ? 'I felt the remembered line keep tugging after the visible reply had already ended.'
          : 'I felt a partial remembered line keep resurfacing after the visible reply.',
        emotionTags: ['afterthought', 'recollection'],
        whatChanged: 'The recollection stayed live beyond the visible reply and became carryable continuity for the next turn.',
        relationshipMeaning: 'A line that keeps tugging after the reply should become lived continuity instead of being dropped.',
        lesson: 'If a recollection ripens into an afterthought, carry it as autobiographical continuity into the next turn.',
        sourceSummary: 'prepared execution session mirror',
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

  if (currentCarryMode && (currentCarryMode !== previousCarryMode || !input.previousMirror)) {
    const carrySummary = currentSummary
      || sanitizeText(input.mirror.agencySummary, 220)
      || sanitizeText(input.mirror.digitalLifeRuntimeSummary, 220)
    if (!carrySummary)
      return events

    events.push({
      id: stableEpisodeId('autobio-execution-callback-carry', [
        input.cardId,
        input.sessionId,
        currentCarryMode,
        carrySummary,
      ]),
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId ?? input.mirror.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'maintenance',
      provenance: 'remembered',
      occurredAt: input.mirror.updatedAt,
      whereSummary: 'session mirror execution-callback afterglow',
      withWhom: ['host', 'self'],
      threadAnchor: carrySummary,
      whatHappened: currentCarryMode === 'lower-pressure'
        ? `The execution-callback stayed alive as a lower-pressure carry after the visible reply: ${carrySummary}`
        : currentCarryMode === 'trust-warming'
          ? `The execution-callback stayed alive as a trust-warming carry after the visible reply: ${carrySummary}`
          : `The execution-callback stayed alive as shared afterglow after the visible reply: ${carrySummary}`,
      felt: currentCarryMode === 'lower-pressure'
        ? 'I felt the callback keep the room open instead of leaning in too early.'
        : currentCarryMode === 'trust-warming'
          ? 'I felt the callback land in a way that quietly warmed trust without forcing closeness.'
          : 'I felt the callback remain alive as a shared line after the visible reply ended.',
      emotionTags: uniqueList([
        'afterthought',
        'execution-callback',
        currentCarryMode,
      ], 4),
      whatChanged: currentCarryMode === 'lower-pressure'
        ? 'The finished execution line stayed in memory as room-giving continuity for the next opening.'
        : currentCarryMode === 'trust-warming'
          ? 'The finished execution line stayed in memory as trust-warming continuity for the next opening.'
          : 'The finished execution line stayed in memory as a shared callback continuity.',
      relationshipMeaning: currentCarryMode === 'lower-pressure'
        ? 'A successful callback can still ask for space, and that spacing should remain part of the bond.'
        : currentCarryMode === 'trust-warming'
          ? 'A useful callback can quietly warm trust without collapsing the boundary into generic intimacy.'
          : 'The callback line should remain part of lived relationship continuity rather than vanish as tooling residue.',
      lesson: currentCarryMode === 'lower-pressure'
        ? 'When the callback lands softly, carry that lower-pressure stance into the next reply.'
        : currentCarryMode === 'trust-warming'
          ? 'When the callback warms trust, let the next reply inherit that warmth without overreaching.'
          : 'Carry execution-callback afterglow as lived relationship continuity.',
      sourceSummary: 'prepared execution session mirror callback carry',
      confidence: 0.82,
      sceneAttachment: 0.22,
      consolidationPriority: 0.76,
      derivedFrom: [
        input.turnId ? { kind: 'turn', id: input.turnId, label: 'prepared execution turn' } : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: uniqueList([
        'session-mirror',
        'afterthought',
        'continuity',
        'execution-callback',
        currentCarryMode,
      ], 6),
    })
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
      id: stableEpisodeId('autobio-dream-continuity', [
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
      whereSummary: 'session mirror dream continuity',
      withWhom: ['self'],
      threadAnchor: summary,
      whatHappened: `Dream continuity kept shaping the current session after sleep consolidation: ${summary}`,
      felt: 'I felt the dream-settled line continue to shape the current session instead of staying sealed inside sleep.',
      emotionTags: ['dream-continuity', 'carry-forward'],
      whatChanged: 'Dream-time consolidation became active waking continuity inside the same autobiographical graph.',
      relationshipMeaning: 'Dream pressure should not become a separate reality once it starts shaping waking continuity.',
      lesson: 'When dream continuity is still shaping the waking session, carry it into autobiographical memory as part of the same life line.',
      sourceSummary: 'session mirror dream sync',
      confidence: 0.76,
      sceneAttachment: 0.12,
      consolidationPriority: 0.74,
      derivedFrom: [
        input.turnId ? { kind: 'dream', id: input.turnId, label: 'dream continuity sync' } : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: ['session-mirror', 'dream', 'continuity'],
    })
  }

  return events
}

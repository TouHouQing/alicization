import type {
  WorkingMemoryCommitment,
  WorkingMemoryCorrection,
  WorkingMemoryEpisodelet,
  WorkingMemoryLongTermCandidate,
  WorkingMemoryQuestion,
  WorkingMemorySnapshot,
  WorkingMemoryTask,
  WorkingMemoryThread,
} from './working-memory'

import {
  clampWorkingMemoryScore,
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryText,
  normalizeWorkingMemoryTurn,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export const workingMemoryCheckpointVersion = 'working-memory-checkpoint-v1'

const maxRecentRawTurns = 8
const maxCompressedTimeline = 32
const maxTextEntries = 12
const maxLongTermCandidates = 6

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
}

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : []
}

function finiteNumber(raw: unknown, fallback = 0) {
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function normalizeThread(raw: unknown): WorkingMemoryThread | null {
  if (!isRecord(raw))
    return null

  const title = normalizeWorkingMemoryText(raw.title, 220)
  const currentUserMove = normalizeWorkingMemoryText(raw.currentUserMove, 220)
  if (!title && !currentUserMove)
    return null

  const mode = raw.mode === 'task'
    || raw.mode === 'repair'
    || raw.mode === 'execution'
    || raw.mode === 'reflection'
    || raw.mode === 'recollection'
    || raw.mode === 'casual'
    ? raw.mode
    : 'casual'

  return {
    title: title || currentUserMove,
    currentUserMove,
    currentAliceMove: normalizeWorkingMemoryText(raw.currentAliceMove, 220) || null,
    primaryAnchor: normalizeWorkingMemoryText(raw.primaryAnchor, 180) || null,
    mode,
    shouldHold: raw.shouldHold === true,
    confidence: clampWorkingMemoryScore(raw.confidence),
  }
}

function normalizeTask(raw: unknown): WorkingMemoryTask | null {
  if (!isRecord(raw))
    return null
  const summary = normalizeWorkingMemoryText(raw.summary, 220)
  if (!summary)
    return null

  const status = raw.status === 'active'
    || raw.status === 'waiting-user'
    || raw.status === 'waiting-tool'
    || raw.status === 'blocked'
    || raw.status === 'settled'
    ? raw.status
    : 'waiting-user'

  return {
    summary,
    status,
    evidenceTurnIds: uniqueWorkingMemoryTexts(asArray(raw.evidenceTurnIds).map(String), 12, 120),
  }
}

function normalizeQuestion(raw: unknown): WorkingMemoryQuestion | null {
  if (!isRecord(raw))
    return null
  const text = normalizeWorkingMemoryText(raw.text, 220)
  if (!text)
    return null
  return {
    text,
    sourceTurnId: normalizeWorkingMemoryText(raw.sourceTurnId, 120) || null,
  }
}

function normalizeCommitment(raw: unknown): WorkingMemoryCommitment | null {
  if (!isRecord(raw))
    return null
  const text = normalizeWorkingMemoryText(raw.text, 220)
  if (!text)
    return null
  return {
    text,
    sourceTurnId: normalizeWorkingMemoryText(raw.sourceTurnId, 120) || null,
  }
}

function normalizeCorrection(raw: unknown): WorkingMemoryCorrection | null {
  if (!isRecord(raw))
    return null
  const text = normalizeWorkingMemoryText(raw.text, 220)
  if (!text)
    return null
  const scope = raw.scope === 'reply'
    || raw.scope === 'memory'
    || raw.scope === 'persona'
    || raw.scope === 'task'
    || raw.scope === 'unknown'
    ? raw.scope
    : 'unknown'
  return {
    text,
    sourceTurnId: normalizeWorkingMemoryText(raw.sourceTurnId, 120) || null,
    scope,
  }
}

function normalizeEpisodelet(raw: unknown): WorkingMemoryEpisodelet | null {
  if (!isRecord(raw))
    return null
  const sourceTurnIds = uniqueWorkingMemoryTexts(asArray(raw.sourceTurnIds).map(String), 40, 120)
  const summary = normalizeWorkingMemoryText(raw.summary, 700)
  if (sourceTurnIds.length === 0 && !summary)
    return null

  return {
    id: normalizeWorkingMemoryText(raw.id, 180) || `wm-episodelet:${finiteNumber(raw.createdAt)}`,
    sourceTurnIds,
    summary,
    thread: normalizeWorkingMemoryText(raw.thread, 220) || null,
    unresolvedQuestions: uniqueWorkingMemoryTexts(asArray(raw.unresolvedQuestions).map(String), 8, 220),
    commitments: uniqueWorkingMemoryTexts(asArray(raw.commitments).map(String), 8, 220),
    corrections: uniqueWorkingMemoryTexts(asArray(raw.corrections).map(String), 8, 220),
    relationshipPosture: normalizeWorkingMemoryText(raw.relationshipPosture, 220) || null,
    emotionalPosture: normalizeWorkingMemoryText(raw.emotionalPosture, 220) || null,
    executionCarry: normalizeWorkingMemoryText(raw.executionCarry, 260) || null,
    importance: clampWorkingMemoryScore(raw.importance),
    createdAt: finiteNumber(raw.createdAt),
  }
}

function normalizeLongTermCandidate(raw: unknown): WorkingMemoryLongTermCandidate | null {
  if (!isRecord(raw))
    return null
  const summary = normalizeWorkingMemoryText(raw.summary, 260)
  if (!summary)
    return null

  const kind = raw.kind === 'episode'
    || raw.kind === 'preference'
    || raw.kind === 'relationship'
    || raw.kind === 'procedure'
    || raw.kind === 'correction'
    ? raw.kind
    : 'episode'
  const sensitivity = raw.sensitivity === 'private'
    || raw.sensitivity === 'secret'
    || raw.sensitivity === 'personal'
    || raw.sensitivity === 'public'
    ? raw.sensitivity
    : 'personal'

  return {
    sourceTurnIds: uniqueWorkingMemoryTexts(asArray(raw.sourceTurnIds).map(String), 12, 120),
    kind,
    summary,
    reason: normalizeWorkingMemoryText(raw.reason, 260),
    salience: clampWorkingMemoryScore(raw.salience),
    sensitivity,
    confidence: clampWorkingMemoryScore(raw.confidence),
    allowTraining: raw.allowTraining === true,
  }
}

export function normalizeWorkingMemoryCheckpointSnapshot(
  raw: unknown,
  expected?: {
    cardId?: string | null
    sessionId?: string | null
  },
): WorkingMemorySnapshot | null {
  if (!isRecord(raw) || raw.version !== 'working-memory-v1')
    return null

  const cardId = normalizeWorkingMemoryText(raw.cardId, 120) || 'default'
  const sessionId = normalizeWorkingMemoryText(raw.sessionId, 160) || 'detached'
  if (expected?.cardId && cardId !== expected.cardId)
    return null
  if (expected?.sessionId && sessionId !== expected.sessionId)
    return null

  const updatedAt = finiteNumber(raw.updatedAt, Date.now())
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId,
    sessionId,
    now: updatedAt,
  })
  const turnRange = isRecord(raw.turnRange) ? raw.turnRange : {}
  snapshot.turnRange = {
    fromTurnId: normalizeWorkingMemoryText(turnRange.fromTurnId, 120) || null,
    toTurnId: normalizeWorkingMemoryText(turnRange.toTurnId, 120) || null,
  }
  snapshot.recentRawTurns = asArray(raw.recentRawTurns)
    .slice(-maxRecentRawTurns)
    .map(turn => isRecord(turn)
      ? normalizeWorkingMemoryTurn({
          turnId: String(turn.turnId ?? ''),
          role: turn.role === 'alice' || turn.role === 'tool' || turn.role === 'system' ? turn.role : 'user',
          text: String(turn.text ?? ''),
          createdAt: finiteNumber(turn.createdAt),
          source: turn.source === 'tool-result' || turn.source === 'runtime-event' ? turn.source : 'conversation-turn',
          visibility: turn.visibility === 'internal' ? 'internal' : 'user-visible',
          failureKind: turn.failureKind === 'timeout'
            || turn.failureKind === 'provider-error'
            || turn.failureKind === 'tool-error'
            || turn.failureKind === 'abort'
            ? turn.failureKind
            : null,
          origin: turn.origin === 'provider' || turn.origin === 'failure-surface' || turn.origin === 'authorization-surface' ? turn.origin : null,
          learningPolicy: isRecord(turn.learningPolicy)
            ? {
                allowLongTermCondensation: turn.learningPolicy.allowLongTermCondensation === true,
                allowPersonaLearning: turn.learningPolicy.allowPersonaLearning === true,
                allowTraining: false,
              }
            : null,
          failureSurface: null,
          contaminated: turn.contaminated === true,
          importance: finiteNumber(turn.importance),
        })
      : null)
    .filter((turn): turn is WorkingMemorySnapshot['recentRawTurns'][number] => turn !== null)
  snapshot.compressedTimeline = asArray(raw.compressedTimeline)
    .map(normalizeEpisodelet)
    .filter((episode): episode is WorkingMemoryEpisodelet => episode !== null)
    .slice(-maxCompressedTimeline)
  snapshot.currentThread = normalizeThread(raw.currentThread)
  snapshot.activeTask = normalizeTask(raw.activeTask)
  snapshot.unresolvedQuestions = asArray(raw.unresolvedQuestions)
    .map(normalizeQuestion)
    .filter((entry): entry is WorkingMemoryQuestion => entry !== null)
    .slice(0, maxTextEntries)
  snapshot.commitments = asArray(raw.commitments)
    .map(normalizeCommitment)
    .filter((entry): entry is WorkingMemoryCommitment => entry !== null)
    .slice(0, maxTextEntries)
  snapshot.userCorrections = asArray(raw.userCorrections)
    .map(normalizeCorrection)
    .filter((entry): entry is WorkingMemoryCorrection => entry !== null)
    .slice(0, maxTextEntries)
  snapshot.relationshipPosture = isRecord(raw.relationshipPosture)
    ? {
        summary: normalizeWorkingMemoryText(raw.relationshipPosture.summary, 260),
        source: raw.relationshipPosture.source === 'conversation-state' || raw.relationshipPosture.source === 'conscious-frame'
          ? raw.relationshipPosture.source
          : 'runtime',
      }
    : null
  snapshot.emotionalPosture = isRecord(raw.emotionalPosture)
    ? {
        summary: normalizeWorkingMemoryText(raw.emotionalPosture.summary, 260),
        source: raw.emotionalPosture.source === 'conscious-frame' ? 'conscious-frame' : 'runtime',
      }
    : null
  snapshot.executionState = isRecord(raw.executionState)
    ? {
        summary: normalizeWorkingMemoryText(raw.executionState.summary, 260),
        source: raw.executionState.source === 'execution-ledger' || raw.executionState.source === 'tool-result'
          ? raw.executionState.source
          : 'execution-callback',
        status: raw.executionState.status === 'active' ? 'active' : 'terminal',
        observedAt: finiteNumber(raw.executionState.observedAt),
      }
    : null
  snapshot.memoryQueryHints = uniqueWorkingMemoryTexts(asArray(raw.memoryQueryHints).map(String), 8, 120)
  snapshot.longTermCandidates = asArray(raw.longTermCandidates)
    .map(normalizeLongTermCandidate)
    .filter((entry): entry is WorkingMemoryLongTermCandidate => entry !== null)
    .slice(0, maxLongTermCandidates)

  if (isRecord(raw.compression)) {
    snapshot.compression = {
      level: raw.compression.level === 'heavy' || raw.compression.level === 'light'
        ? raw.compression.level
        : 'none',
      sourceTurnIds: uniqueWorkingMemoryTexts(asArray(raw.compression.sourceTurnIds).map(String), 200, 160),
      lastCompressedAt: raw.compression.lastCompressedAt == null ? null : finiteNumber(raw.compression.lastCompressedAt),
    }
  }
  if (isRecord(raw.audit)) {
    snapshot.audit = {
      failureTurnIds: uniqueWorkingMemoryTexts(asArray(raw.audit.failureTurnIds).map(String), 20, 120),
      excludedLongTermCandidateTurnIds: uniqueWorkingMemoryTexts(asArray(raw.audit.excludedLongTermCandidateTurnIds).map(String), 20, 120),
      notes: uniqueWorkingMemoryTexts(asArray(raw.audit.notes).map(String), 8, 220),
    }
  }

  return snapshot
}

export function serializeWorkingMemoryCheckpoint(snapshot: WorkingMemorySnapshot) {
  const normalized = normalizeWorkingMemoryCheckpointSnapshot(snapshot, {
    cardId: snapshot.cardId,
    sessionId: snapshot.sessionId,
  })
  if (!normalized)
    throw new Error('invalid working memory checkpoint snapshot')
  return JSON.stringify({
    checkpointVersion: workingMemoryCheckpointVersion,
    snapshot: normalized,
  })
}

export function parseWorkingMemoryCheckpoint(
  raw: string | null | undefined,
  expected?: {
    cardId?: string | null
    sessionId?: string | null
  },
) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw)
    const snapshot = isRecord(parsed) && parsed.checkpointVersion === workingMemoryCheckpointVersion
      ? parsed.snapshot
      : parsed
    return normalizeWorkingMemoryCheckpointSnapshot(snapshot, expected)
  }
  catch {
    return null
  }
}

import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemorySnapshot,
} from './working-memory'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export type WorkingMemoryLongTermQueueStatus = 'pending-cleaning' | 'rejected' | 'ready-for-long-term'

export interface WorkingMemoryLongTermQueueItem {
  id: string
  source: 'working-memory-owner'
  kind: WorkingMemoryLongTermCandidate['kind']
  summary: string
  reason: string
  sourceTurnIds: string[]
  evidenceSnippets: string[]
  salience: number
  confidence: number
  sensitivity: WorkingMemoryLongTermCandidate['sensitivity']
  allowTraining: boolean
  status: WorkingMemoryLongTermQueueStatus
  rejectionReasons: string[]
  contaminationFlags: string[]
  createdAt: number
}

const fixedFallbackTemplatePattern = /我在。同一条本地数字生命的线还在|同一条本地数字生命的线还在|我先轻一点留在这里|你想说什么，我就接住/u

function stableQueueId(input: {
  sessionId: string
  kind: string
  sourceTurnIds: string[]
  summary: string
}) {
  const compactSummary = normalizeWorkingMemoryText(input.summary, 48)
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase()
  return [
    'working-memory-long-term',
    normalizeWorkingMemoryText(input.sessionId, 80) || 'detached',
    input.kind,
    input.sourceTurnIds.join('+') || 'no-source',
    compactSummary || 'candidate',
  ].join(':')
}

function candidateText(candidate: WorkingMemoryLongTermCandidate) {
  return [
    candidate.summary,
    candidate.reason,
  ].map(text => normalizeWorkingMemoryText(text, 320)).filter(Boolean).join(' ')
}

function collectContaminationFlags(input: {
  candidate: WorkingMemoryLongTermCandidate
  excludedTurnIds: Set<string>
  failureTurnIds: Set<string>
  sourceTurnIds: string[]
}) {
  const flags: string[] = []
  if (input.sourceTurnIds.some(turnId => input.failureTurnIds.has(turnId)))
    flags.push('failure-turn')
  if (input.sourceTurnIds.some(turnId => input.excludedTurnIds.has(turnId)))
    flags.push('excluded-turn')
  if (fixedFallbackTemplatePattern.test(candidateText(input.candidate)))
    flags.push('fixed-fallback-template')
  return uniqueWorkingMemoryTexts(flags, 6, 80)
}

function evidenceForCandidate(snapshot: WorkingMemorySnapshot, sourceTurnIds: string[]) {
  const byTurnId = new Map(snapshot.recentRawTurns.map(turn => [turn.turnId, turn.text]))
  return uniqueWorkingMemoryTexts(
    sourceTurnIds.map(turnId => byTurnId.get(turnId) ?? ''),
    6,
    260,
  )
}

export function buildWorkingMemoryLongTermCandidateQueue(snapshot: WorkingMemorySnapshot): WorkingMemoryLongTermQueueItem[] {
  const failureTurnIds = new Set(snapshot.audit.failureTurnIds)
  const excludedTurnIds = new Set(snapshot.audit.excludedLongTermCandidateTurnIds)
  const queue: WorkingMemoryLongTermQueueItem[] = []

  for (const candidate of snapshot.longTermCandidates) {
    const summary = normalizeWorkingMemoryText(candidate.summary, 260)
    const reason = normalizeWorkingMemoryText(candidate.reason, 260)
    const sourceTurnIds = uniqueWorkingMemoryTexts(candidate.sourceTurnIds, 12, 120)
    if (!summary || !reason || sourceTurnIds.length === 0)
      continue

    const contaminationFlags = collectContaminationFlags({
      candidate,
      excludedTurnIds,
      failureTurnIds,
      sourceTurnIds,
    })
    if (contaminationFlags.length > 0)
      continue

    queue.push({
      id: stableQueueId({
        sessionId: snapshot.sessionId,
        kind: candidate.kind,
        sourceTurnIds,
        summary,
      }),
      source: 'working-memory-owner',
      kind: candidate.kind,
      summary,
      reason,
      sourceTurnIds,
      evidenceSnippets: evidenceForCandidate(snapshot, sourceTurnIds),
      salience: clampWorkingMemoryScore(candidate.salience),
      confidence: clampWorkingMemoryScore(candidate.confidence),
      sensitivity: candidate.sensitivity,
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: Number.isFinite(snapshot.updatedAt) ? Number(snapshot.updatedAt) : Date.now(),
    })
  }

  return queue.slice(0, 12)
}

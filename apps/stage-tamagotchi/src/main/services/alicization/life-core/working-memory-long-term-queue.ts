import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemorySnapshot,
} from './working-memory'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { resolveAlicizationLearningEligibility } from './working-memory-policy'

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

const fixedTemplateEvidenceReplacement
  = 'content_withheld; reason=continuity-residue'

function sanitizeQueueText(raw: unknown, maxChars = 260, replacement = '') {
  return sanitizeAlicizationProviderFacingText(
    normalizeWorkingMemoryText(raw, maxChars),
    maxChars,
    replacement,
  )
}

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
  snapshot: WorkingMemorySnapshot
  sourceTurnIds: string[]
}) {
  const flags: string[] = []
  if (input.sourceTurnIds.some(turnId => input.failureTurnIds.has(turnId)))
    flags.push('failure-turn')
  if (input.sourceTurnIds.some(turnId => input.excludedTurnIds.has(turnId)))
    flags.push('excluded-turn')
  if (
    fixedFallbackTemplatePattern.test(candidateText(input.candidate))
    || containsAlicizationFixedTemplateResidue(candidateText(input.candidate))
  ) {
    flags.push('fixed-fallback-template')
  }
  const turnsById = new Map(input.snapshot.recentRawTurns.map(turn => [turn.turnId, turn]))
  const hasIneligibleTypedSource = input.sourceTurnIds.some((turnId) => {
    const turn = turnsById.get(turnId)
    if (!turn)
      return false
    const hasTypedArtifactMetadata = turn.origin !== undefined
      || turn.learningPolicy !== undefined
      || turn.failureSurface !== undefined
      || turn.contaminated !== undefined
    if (!hasTypedArtifactMetadata)
      return false

    const origin = turn.failureSurface?.origin ?? turn.origin
    const learningPolicy = turn.learningPolicy ?? (turn.failureSurface
      ? {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }
      : null)
    if (!origin || !learningPolicy)
      return true
    return !resolveAlicizationLearningEligibility({
      origin,
      learningPolicy,
      contaminated: turn.contaminated === true,
    }).allowLongTermCondensation
  })
  if (hasIneligibleTypedSource)
    flags.push('ineligible-artifact')
  return uniqueWorkingMemoryTexts(flags, 6, 80)
}

function evidenceForCandidate(snapshot: WorkingMemorySnapshot, sourceTurnIds: string[]) {
  const byTurnId = new Map(snapshot.recentRawTurns.map(turn => [turn.turnId, turn.text]))
  return uniqueWorkingMemoryTexts(
    sourceTurnIds.map(turnId => sanitizeQueueText(
      byTurnId.get(turnId) ?? '',
      260,
      fixedTemplateEvidenceReplacement,
    )),
    6,
    260,
  )
}

export function buildWorkingMemoryLongTermCandidateQueue(snapshot: WorkingMemorySnapshot): WorkingMemoryLongTermQueueItem[] {
  const failureTurnIds = new Set(snapshot.audit.failureTurnIds)
  const excludedTurnIds = new Set(snapshot.audit.excludedLongTermCandidateTurnIds)
  const queue: WorkingMemoryLongTermQueueItem[] = []

  for (const candidate of snapshot.longTermCandidates) {
    const summary = sanitizeQueueText(candidate.summary, 260, '')
    const reason = sanitizeQueueText(candidate.reason, 260, '')
    const sourceTurnIds = uniqueWorkingMemoryTexts(candidate.sourceTurnIds, 12, 120)
    if (!summary || !reason || sourceTurnIds.length === 0)
      continue

    const contaminationFlags = collectContaminationFlags({
      candidate,
      excludedTurnIds,
      failureTurnIds,
      snapshot,
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

import type {
  WorkingMemoryLongTermCandidate,
  WorkingMemoryLongTermEvidence,
  WorkingMemorySnapshot,
} from './working-memory'

import { createHash } from 'node:crypto'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryLongTermEvidence,
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { resolveAlicizationLearningEligibility } from './working-memory-policy'

export type WorkingMemoryLongTermQueueStatus = 'pending-cleaning' | 'rejected' | 'ready-for-long-term'

export interface WorkingMemoryLongTermQueueItem {
  id: string
  source: 'working-memory-owner'
  memoryEvidence?: WorkingMemoryLongTermEvidence | null
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

const internalStructuredFactContext = {
  provenance: 'internal-structured-fact' as const,
}

function sanitizeQueueText(raw: unknown, maxChars = 260, replacement = '') {
  return sanitizeAlicizationProviderFacingText(
    normalizeWorkingMemoryText(raw, maxChars),
    maxChars,
    replacement,
    internalStructuredFactContext,
  )
}

function stableQueueId(input: {
  sessionId: string
  kind: string
  sourceTurnIds: string[]
  summary: string
}) {
  const canonicalIdentity = JSON.stringify([
    input.sessionId.trim() || 'detached',
    input.kind,
    input.sourceTurnIds,
    input.summary,
  ])
  const digest = createHash('sha256')
    .update(canonicalIdentity, 'utf8')
    .digest('hex')
  return `working-memory-long-term:v1:sha256:${digest}`
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
  if (containsAlicizationFixedTemplateResidue(
    candidateText(input.candidate),
    internalStructuredFactContext,
  )) {
    flags.push('structured-internal-residue')
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

export function buildWorkingMemoryLongTermCandidateQueue(snapshot: WorkingMemorySnapshot): WorkingMemoryLongTermQueueItem[] {
  const failureTurnIds = new Set(snapshot.audit.failureTurnIds)
  const excludedTurnIds = new Set(snapshot.audit.excludedLongTermCandidateTurnIds)
  const queue: WorkingMemoryLongTermQueueItem[] = []

  for (const candidate of snapshot.longTermCandidates) {
    const memoryEvidence = normalizeWorkingMemoryLongTermEvidence(candidate.memoryEvidence)
    if (!memoryEvidence)
      continue
    const summary = sanitizeQueueText(memoryEvidence.summary, 260, '')
    const reason = sanitizeQueueText(memoryEvidence.reason, 260, '')
    const evidenceSnippets = uniqueWorkingMemoryTexts(
      memoryEvidence.evidenceSnippets.map(snippet => sanitizeQueueText(snippet, 260, '')),
      6,
      260,
    )
    const sourceTurnIds = uniqueWorkingMemoryTexts(candidate.sourceTurnIds, 12, 120)
    if (!summary || !reason || evidenceSnippets.length === 0 || sourceTurnIds.length === 0)
      continue

    const contaminationFlags = collectContaminationFlags({
      candidate: {
        ...candidate,
        kind: memoryEvidence.kind,
        summary,
        reason,
      },
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
        kind: memoryEvidence.kind,
        sourceTurnIds,
        summary,
      }),
      source: 'working-memory-owner',
      memoryEvidence,
      kind: memoryEvidence.kind,
      summary,
      reason,
      sourceTurnIds,
      evidenceSnippets,
      salience: clampWorkingMemoryScore(memoryEvidence.salience),
      confidence: clampWorkingMemoryScore(memoryEvidence.confidence),
      sensitivity: memoryEvidence.sensitivity,
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: Number.isFinite(snapshot.updatedAt) ? Number(snapshot.updatedAt) : Date.now(),
    })
  }

  return queue.slice(0, 12)
}

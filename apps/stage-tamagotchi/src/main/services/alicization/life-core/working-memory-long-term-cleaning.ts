import type { WorkingMemoryLongTermCandidate } from './working-memory'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export type WorkingMemoryLongTermCleaningStatus
  = | 'pending-cleaning'
    | 'cleaning'
    | 'rejected'
    | 'needs-user-review'
    | 'admitted'
    | 'applied'
    | 'failed'
    | 'dead-lettered'

export type WorkingMemoryLongTermAdmissionDecision
  = | 'pending'
    | 'admit'
    | 'reject'
    | 'review'

export type WorkingMemoryLongTermTrainingEligibility
  = | 'blocked'
    | 'review-required'
    | 'candidate'

export interface WorkingMemoryLongTermCleanedCandidate {
  id: string
  queueItemId: string
  source: 'working-memory-owner'
  kind: WorkingMemoryLongTermCandidate['kind']
  cardId: string
  sessionId: string
  summary: string
  reason: string
  sourceTurnIds: string[]
  evidenceSnippets: string[]
  retrievalCues: string[]
  entities: string[]
  relationshipMeaning: string | null
  salience: number
  confidence: number
  sensitivity: WorkingMemoryLongTermCandidate['sensitivity']
  trainingEligibility: WorkingMemoryLongTermTrainingEligibility
  createdAt: number
}

export interface WorkingMemoryLongTermProjectionBundle {
  memoryFacts: unknown[]
  memoryReflections: unknown[]
  episodicEvents: unknown[]
  personaReinforcements: unknown[]
  trainingArtifacts: unknown[]
}

export interface WorkingMemoryLongTermCleaningTransaction {
  id: string
  idempotencyKey: string
  queueItemId: string
  source: 'working-memory-owner'
  cardId: string
  sessionId: string
  status: WorkingMemoryLongTermCleaningStatus
  decision: WorkingMemoryLongTermAdmissionDecision
  item: WorkingMemoryLongTermQueueItem
  cleanedCandidate: WorkingMemoryLongTermCleanedCandidate | null
  projections: WorkingMemoryLongTermProjectionBundle | null
  allowTraining: boolean
  rejectionReasons: string[]
  reviewReasons: string[]
  contaminationFlags: string[]
  attemptCount: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  nextAttemptAt: number | null
  appliedAt: number | null
}

export function normalizeWorkingMemoryLongTermCleaningStatus(raw: unknown): WorkingMemoryLongTermCleaningStatus {
  if (
    raw === 'pending-cleaning'
    || raw === 'cleaning'
    || raw === 'rejected'
    || raw === 'needs-user-review'
    || raw === 'admitted'
    || raw === 'applied'
    || raw === 'failed'
    || raw === 'dead-lettered'
  ) {
    return raw
  }
  return 'dead-lettered'
}

export const WORKING_MEMORY_LONG_TERM_CLEANING_MAX_ATTEMPTS = 3

export interface WorkingMemoryLongTermDrainMutex {
  run: <T>(task: () => Promise<T>) => Promise<T>
}

export function createWorkingMemoryLongTermDrainMutex(): WorkingMemoryLongTermDrainMutex {
  let tail = Promise.resolve()

  return {
    run: async <T>(task: () => Promise<T>) => {
      const previous = tail
      let release!: () => void
      tail = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      try {
        return await task()
      }
      finally {
        release()
      }
    },
  }
}

export function workingMemoryLongTermCleaningRetryDelayMs(attemptCount: number) {
  const retryIndex = Math.max(0, Math.floor(attemptCount) - 1)
  return Math.min(60_000, 1_000 * (2 ** retryIndex))
}

export function buildWorkingMemoryLongTermIdempotencyKey(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
}) {
  const sourceId = normalizeWorkingMemoryText(input.item.id, 240) || 'source'
  const sourceTurnIds = uniqueWorkingMemoryTexts(input.item.sourceTurnIds, 12, 120).join('+') || 'no-source'
  const summary = normalizeWorkingMemoryText(input.item.summary, 120) || 'candidate'
  return [
    'working-memory-owner',
    normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    input.item.kind,
    sourceId,
    sourceTurnIds,
    summary,
  ].join(':')
}

export function createWorkingMemoryLongTermCleaningTransaction(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
  now: number
}): WorkingMemoryLongTermCleaningTransaction {
  const idempotencyKey = buildWorkingMemoryLongTermIdempotencyKey(input)
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  const queueItemId = normalizeWorkingMemoryText(input.item.id, 240)
  return {
    id: `wm-lt-clean:${idempotencyKey}`,
    idempotencyKey,
    queueItemId,
    source: 'working-memory-owner',
    cardId: normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    sessionId: normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    status: 'pending-cleaning',
    decision: 'pending',
    item: {
      ...input.item,
      id: queueItemId,
      summary: normalizeWorkingMemoryText(input.item.summary, 260),
      reason: normalizeWorkingMemoryText(input.item.reason, 260),
      sourceTurnIds: uniqueWorkingMemoryTexts(input.item.sourceTurnIds, 12, 120),
      evidenceSnippets: uniqueWorkingMemoryTexts(input.item.evidenceSnippets, 6, 260),
      salience: clampWorkingMemoryScore(input.item.salience),
      confidence: clampWorkingMemoryScore(input.item.confidence),
      allowTraining: false,
    },
    cleanedCandidate: null,
    projections: null,
    allowTraining: false,
    rejectionReasons: uniqueWorkingMemoryTexts(input.item.rejectionReasons, 8, 180),
    reviewReasons: [],
    contaminationFlags: uniqueWorkingMemoryTexts(input.item.contaminationFlags, 8, 120),
    attemptCount: 0,
    lastError: null,
    createdAt: Number.isFinite(input.item.createdAt) ? Number(input.item.createdAt) : now,
    updatedAt: now,
    nextAttemptAt: now,
    appliedAt: null,
  }
}

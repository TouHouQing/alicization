import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'
import type sqlite3 from 'sqlite3'

import type {
  AlicizationMemoryReflectionRecord,
  AlicizationPersonaCandidateListResult,
  AlicizationPersonaCandidateWorkbenchDecision,
  AlicizationPersonaCandidateWorkbenchItem,
  AlicizationPersonaCandidateWorkbenchStatus,
  AlicizationPersonaReinforcementEventRecord,
} from '../../../shared/eventa'
import type { MemoryWorkbenchPolicyStoreRuntime } from './memory-workbench-policy-store'
import type { PersonaTrainingCandidate } from './persona-training-candidate'

import { Buffer } from 'node:buffer'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import { resolveAlicizationLearningEligibility } from './life-core/working-memory-policy'
import { buildPersonaTrainingCandidatesFromLongTermMemory } from './persona-training-candidate'

export interface PersonaCandidateReviewState {
  candidateId: string
  status: AlicizationPersonaCandidateWorkbenchStatus
  allowTraining: boolean
  reason: string | null
  updatedAt: number
}

interface PersonaCandidateReviewRow {
  candidate_id: string
  status: string
  allow_training: number
  reason: string | null
  updated_at: number
}

function normalizeText(raw: unknown, maxChars = 240) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function normalizeCandidateStatus(raw: unknown): AlicizationPersonaCandidateWorkbenchStatus {
  return raw === 'approved' || raw === 'rejected' || raw === 'no-training'
    ? raw
    : 'candidate'
}

function statusForDecision(decision: AlicizationPersonaCandidateWorkbenchDecision): AlicizationPersonaCandidateWorkbenchStatus {
  if (decision === 'approve')
    return 'approved'
  if (decision === 'reject')
    return 'rejected'
  return 'no-training'
}

function safeLimit(raw: unknown) {
  return Math.max(1, Math.min(100, Math.floor(Number(raw ?? 50))))
}

function encodeCursor(input: {
  updatedAt: number
  id: string
  sourceUpdatedAt?: number
  sourceId?: string
}) {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url')
}

function decodeCursor(raw: string | null | undefined) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      updatedAt?: unknown
      id?: unknown
      sourceUpdatedAt?: unknown
      sourceId?: unknown
    }
    if (!Number.isFinite(parsed.updatedAt) || typeof parsed.id !== 'string' || !parsed.id.trim())
      return null
    return {
      updatedAt: Number(parsed.updatedAt),
      id: parsed.id.trim(),
      ...(Number.isFinite(parsed.sourceUpdatedAt) ? { sourceUpdatedAt: Number(parsed.sourceUpdatedAt) } : {}),
      ...(typeof parsed.sourceId === 'string' && parsed.sourceId.trim() ? { sourceId: parsed.sourceId.trim() } : {}),
    }
  }
  catch {
    return null
  }
}

function encodeMemoryReflectionCursor(cursor: {
  updatedAt: number
  id: string
  sourceUpdatedAt?: number
  sourceId?: string
}) {
  const sourceId = cursor.sourceId?.trim()
    || (cursor.id.startsWith('persona-candidate:')
      ? cursor.id.slice('persona-candidate:'.length)
      : cursor.id)
  return encodeURIComponent(JSON.stringify({
    sortValue: Number.isFinite(cursor.sourceUpdatedAt) ? cursor.sourceUpdatedAt : cursor.updatedAt,
    id: sourceId,
  }))
}

function mapReviewRow(row: PersonaCandidateReviewRow): PersonaCandidateReviewState {
  return {
    candidateId: normalizeText(row.candidate_id),
    status: normalizeCandidateStatus(row.status),
    allowTraining: row.allow_training === 1,
    reason: normalizeText(row.reason, 240) || null,
    updatedAt: Number.isFinite(row.updated_at) ? Math.max(0, Math.floor(row.updated_at)) : 0,
  }
}

export type PersonaCandidateLearningSource
  = | 'cleaned-long-term-reflection'
    | 'persona-reinforcement'
    | 'raw-transcript'
    | 'review-queue'
    | 'failure-artifact'
    | 'authorization-artifact'

export function resolvePersonaCandidateSourceEligibility(input: {
  source: PersonaCandidateLearningSource | string
  origin: AlicizationVisibleArtifactOrigin
  learningPolicy: AlicizationVisibleArtifactLearningPolicy
  contaminated: boolean
}) {
  const allowedSource = input.source === 'cleaned-long-term-reflection'
    || input.source === 'persona-reinforcement'
  return resolveAlicizationLearningEligibility({
    origin: input.origin,
    learningPolicy: input.learningPolicy,
    contaminated: input.contaminated || !allowedSource,
  })
}

export function mergePersonaCandidateReviewState(input: {
  candidate: PersonaTrainingCandidate
  review: PersonaCandidateReviewState | null
  now: number
}): AlicizationPersonaCandidateWorkbenchItem {
  const status = normalizeCandidateStatus(input.review?.status ?? input.candidate.status)
  return {
    id: normalizeText(input.candidate.id),
    sourceMemoryIds: input.candidate.sourceMemoryIds.map(id => normalizeText(id)).filter(Boolean),
    behaviorLesson: normalizeText(input.candidate.behaviorLesson, 420),
    positiveExample: normalizeText(input.candidate.positiveExample, 420),
    negativeExample: normalizeText(input.candidate.negativeExample, 420) || null,
    privacyClass: input.candidate.privacyClass,
    status,
    allowTraining: false,
    rejectionReason: normalizeText(input.review?.reason ?? input.candidate.rejectionReason, 240) || null,
    createdAt: Number.isFinite(input.now) ? Math.max(0, Math.floor(input.now)) : Date.now(),
    updatedAt: Number.isFinite(input.review?.updatedAt)
      ? Math.max(0, Math.floor(input.review!.updatedAt))
      : Number.isFinite(input.now)
        ? Math.max(0, Math.floor(input.now))
        : Date.now(),
  }
}

export function createMemoryWorkbenchPersonaCandidateRuntime(input: {
  database: sqlite3.Database
  now: () => number
  randomUUID: () => string
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
  policyStore: MemoryWorkbenchPolicyStoreRuntime
  listMemoryReflectionsPage: (payload: {
    cardId: string
    limit?: number
    status?: AlicizationMemoryReflectionRecord['status']
    cursor?: string | null
  }) => Promise<{
    items: AlicizationMemoryReflectionRecord[]
    nextCursor: string | null
  }>
  listPersonaReinforcementEventsPage: (payload: {
    cardId: string
    limit?: number
    cursor?: string | null
  }) => Promise<{
    items: AlicizationPersonaReinforcementEventRecord[]
    nextCursor: string | null
  }>
  listTombstonedLongTermMemorySourceIds: (sourceIds: string[]) => Promise<Set<string>>
}) {
  interface CandidateSourceItem {
    candidate: PersonaTrainingCandidate
    updatedAt: number
    sourceId: string
  }

  async function listReviews(cardId: string) {
    const rows = await input.all<PersonaCandidateReviewRow>(
      input.database,
      `
      SELECT candidate_id, status, allow_training, reason, updated_at
      FROM persona_training_candidate_reviews
      WHERE card_id = ?
      ORDER BY updated_at DESC
      `,
      [cardId],
    )
    return new Map(rows.map(row => mapReviewRow(row)).map(review => [review.candidateId, review]))
  }

  const maxReinforcementSourcesPerCandidate = 7

  async function listLatestReinforcements(cardId: string) {
    const reinforcements: AlicizationPersonaReinforcementEventRecord[] = []
    const tombstonedSourceIds = new Set<string>()
    const seenCursors = new Set<string>()
    let cursor: string | null = null

    while (reinforcements.length < maxReinforcementSourcesPerCandidate) {
      const page: {
        items: AlicizationPersonaReinforcementEventRecord[]
        nextCursor: string | null
      } = await input.listPersonaReinforcementEventsPage({
        cardId,
        limit: maxReinforcementSourcesPerCandidate + 1,
        cursor,
      }).catch(() => ({
        items: [] as AlicizationPersonaReinforcementEventRecord[],
        nextCursor: null,
      }))
      const pageTombstonedSourceIds = await input.listTombstonedLongTermMemorySourceIds(
        page.items.map(reinforcement => reinforcement.id),
      )
      for (const sourceId of pageTombstonedSourceIds)
        tombstonedSourceIds.add(sourceId)

      for (const reinforcement of page.items) {
        if (reinforcement.valence !== 'reinforce') {
          continue
        }
        if (containsAlicizationFixedTemplateResidue(`${reinforcement.dimension} ${reinforcement.summary}`, {
          provenance: 'internal-structured-fact',
        })) {
          continue
        }
        if (pageTombstonedSourceIds.has(reinforcement.id)) {
          continue
        }
        reinforcements.push(reinforcement)
        if (reinforcements.length >= maxReinforcementSourcesPerCandidate) {
          break
        }
      }

      if (
        reinforcements.length >= maxReinforcementSourcesPerCandidate
        || !page.nextCursor
        || seenCursors.has(page.nextCursor)
      ) {
        break
      }
      seenCursors.add(page.nextCursor)
      cursor = page.nextCursor
    }

    return {
      reinforcements,
      tombstonedSourceIds,
    }
  }

  function buildCandidatesFromReflections(inputData: {
    reflections: AlicizationMemoryReflectionRecord[]
    reinforcements: AlicizationPersonaReinforcementEventRecord[]
    tombstonedSourceIds: Set<string>
  }) {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: inputData.reflections.map(reflection => ({
        id: reflection.id,
        summary: reflection.summary,
        lesson: reflection.lesson,
        confidence: reflection.confidence,
        status: reflection.status,
      })),
      reinforcements: inputData.reinforcements.map(reinforcement => ({
        id: reinforcement.id,
        dimension: reinforcement.dimension,
        summary: reinforcement.summary,
        valence: reinforcement.valence,
        delta: reinforcement.delta,
      })),
      tombstonedSourceIds: Array.from(inputData.tombstonedSourceIds),
    })
    const reflectionUpdatedAt = new Map(inputData.reflections.map(reflection => [reflection.id, reflection.updatedAt]))
    return candidates
      .filter(candidate => resolvePersonaCandidateSourceEligibility({
        source: 'cleaned-long-term-reflection',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        contaminated: containsAlicizationFixedTemplateResidue([
          candidate.behaviorLesson,
          candidate.positiveExample,
          candidate.negativeExample,
        ].filter(Boolean).join(' '), {
          provenance: 'internal-structured-fact',
        }),
      }).allowPersonaLearning)
      .map(candidate => ({
        candidate,
        updatedAt: reflectionUpdatedAt.get(candidate.sourceMemoryIds[0] ?? '') ?? input.now(),
        sourceId: candidate.sourceMemoryIds[0] ?? candidate.id,
      }))
  }

  async function readCandidateSourcePages(inputData: {
    cardId: string
    cursor: string | null
    sourcePageLimit: number
    onPage: (candidates: CandidateSourceItem[]) => Promise<boolean> | boolean
  }) {
    const { reinforcements, tombstonedSourceIds: reinforcementTombstones } = await listLatestReinforcements(inputData.cardId)
    const seenCursors = new Set<string>()
    let cursor = inputData.cursor

    while (true) {
      const page: {
        items: AlicizationMemoryReflectionRecord[]
        nextCursor: string | null
      } = await input.listMemoryReflectionsPage({
        cardId: inputData.cardId,
        limit: inputData.sourcePageLimit,
        status: 'confirmed',
        cursor,
      }).catch(() => ({
        items: [] as AlicizationMemoryReflectionRecord[],
        nextCursor: null,
      }))
      const tombstonedSourceIds = new Set(reinforcementTombstones)
      const reflectionTombstones = await input.listTombstonedLongTermMemorySourceIds(
        page.items.map(reflection => reflection.id),
      )
      for (const sourceId of reflectionTombstones)
        tombstonedSourceIds.add(sourceId)

      if (await inputData.onPage(buildCandidatesFromReflections({
        reflections: page.items,
        reinforcements,
        tombstonedSourceIds,
      }))) {
        return
      }

      if (!page.nextCursor || seenCursors.has(page.nextCursor))
        return
      seenCursors.add(page.nextCursor)
      cursor = page.nextCursor
    }
  }

  async function buildCandidates(cardId: string) {
    const candidates: CandidateSourceItem[] = []
    await readCandidateSourcePages({
      cardId,
      cursor: null,
      sourcePageLimit: 256,
      onPage: (pageCandidates) => {
        candidates.push(...pageCandidates)
        return false
      },
    })
    return candidates
  }

  async function listPersonaCandidates(payload: {
    cardId: string
    status?: AlicizationPersonaCandidateWorkbenchStatus | 'all'
    limit?: number
    cursor?: string | null
  }): Promise<AlicizationPersonaCandidateListResult> {
    const cardId = normalizeText(payload.cardId, 120)
    if (!cardId)
      return { items: [], nextCursor: null }

    const reviews = await listReviews(cardId)
    const requestedStatus = payload.status && payload.status !== 'all'
      ? payload.status
      : null
    const cursor = decodeCursor(payload.cursor)
    const limit = safeLimit(payload.limit)
    const matched: Array<{
      item: AlicizationPersonaCandidateWorkbenchItem
      sourceUpdatedAt: number
      sourceId: string
    }> = []
    await readCandidateSourcePages({
      cardId,
      cursor: cursor ? encodeMemoryReflectionCursor(cursor) : null,
      sourcePageLimit: Math.max(2, Math.min(256, limit + 1)),
      onPage: async (pageCandidates) => {
        const sourceIds = pageCandidates.flatMap(item => item.candidate.sourceMemoryIds)
        const policies = await input.policyStore.listPolicyOverrides({ cardId, sourceIds })
        const noTrainingSources = new Set(
          policies
            .filter(policy => policy.reviewState === 'no-training' || policy.allowTraining === false)
            .map(policy => policy.sourceId),
        )
        matched.push(...pageCandidates
          .map(({ candidate, updatedAt, sourceId }) => {
            const review = reviews.get(candidate.id)
              ?? (candidate.sourceMemoryIds.some(sourceId => noTrainingSources.has(sourceId))
                ? {
                    candidateId: candidate.id,
                    status: 'no-training' as const,
                    allowTraining: false,
                    reason: 'memory policy blocks persona training',
                    updatedAt,
                  }
                : null)
            return {
              item: mergePersonaCandidateReviewState({
                candidate,
                review,
                now: updatedAt,
              }),
              sourceUpdatedAt: updatedAt,
              sourceId,
            }
          })
          .filter(({ item }) => !requestedStatus || item.status === requestedStatus))
        return matched.length > limit
      },
    })

    const items = matched.slice(0, limit).map(({ item }) => item)
    const next = matched.length > limit ? items[items.length - 1] : null
    const nextSource = matched.length > limit ? matched[limit - 1] : null
    return {
      items,
      nextCursor: next && nextSource
        ? encodeCursor({
            updatedAt: next.updatedAt,
            id: next.id,
            sourceUpdatedAt: nextSource.sourceUpdatedAt,
            sourceId: nextSource.sourceId,
          })
        : null,
    }
  }

  async function applyPersonaCandidateAction(payload: {
    cardId: string
    candidateId: string
    decision: AlicizationPersonaCandidateWorkbenchDecision
    reason?: string | null
  }) {
    const cardId = normalizeText(payload.cardId, 120)
    const candidateId = normalizeText(payload.candidateId, 240)
    if (!cardId || !candidateId)
      return null

    const candidates = await buildCandidates(cardId)
    const candidate = candidates.find(item => item.candidate.id === candidateId)
    if (!candidate)
      return null

    const status = statusForDecision(payload.decision)
    const allowTraining = false
    const reason = normalizeText(payload.reason, 240) || null
    const updatedAt = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        await input.run(
          input.database,
          `
          INSERT INTO persona_training_candidate_reviews (
            id,
            card_id,
            candidate_id,
            status,
            allow_training,
            reason,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(card_id, candidate_id) DO UPDATE SET
            status = excluded.status,
            allow_training = excluded.allow_training,
            reason = excluded.reason,
            updated_at = excluded.updated_at
          `,
          [
            `persona-candidate-review:${input.randomUUID()}`,
            cardId,
            candidateId,
            status,
            allowTraining ? 1 : 0,
            reason,
            updatedAt,
            updatedAt,
          ],
        )
      })
    })

    const reviews = await listReviews(cardId)
    const review = reviews.get(candidateId)
    return mergePersonaCandidateReviewState({
      candidate: candidate.candidate,
      review: review ?? {
        candidateId,
        status,
        allowTraining: false,
        reason,
        updatedAt,
      },
      now: candidate.updatedAt,
    })
  }

  return {
    listPersonaCandidates,
    applyPersonaCandidateAction,
  }
}

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
  AlicizationPersonaTrainingSourceRef,
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

interface PersonaCandidateProjectionRow {
  candidate_id: string
  root_source_id: string
  source_memory_ids_json: string
  behavior_lesson: string
  positive_example: string
  negative_example: string | null
  privacy_class: string
  source_created_at: number
  source_updated_at: number
  updated_at: number
}

interface PersonaCandidateReflectionRow {
  id: string
  card_id: string
  source_kind: AlicizationMemoryReflectionRecord['sourceKind']
  target_scope: AlicizationMemoryReflectionRecord['targetScope']
  summary: string
  lesson: string
  status: AlicizationMemoryReflectionRecord['status']
  confidence: number
  created_at: number
  updated_at: number
}

interface PersonaTrainingSourceProvenance {
  sourceId: string
  sourceKind: AlicizationPersonaTrainingSourceRef['sourceKind']
  cleaningTransactionId: string
  cleanedAt: number
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

function statusForDecision(decision: AlicizationPersonaCandidateWorkbenchDecision): Exclude<AlicizationPersonaCandidateWorkbenchStatus, 'candidate'> {
  if (decision === 'approve')
    return 'approved'
  if (decision === 'reject')
    return 'rejected'
  return 'no-training'
}

function safeLimit(raw: unknown) {
  return Math.max(1, Math.min(100, Math.floor(Number(raw ?? 50))))
}

function parseTextArray(raw: unknown, maxItems = 8, maxChars = 180) {
  if (typeof raw !== 'string' || !raw.trim())
    return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return []
    return parsed
      .map(item => normalizeText(item, maxChars))
      .filter(Boolean)
      .filter((item, index, values) => values.indexOf(item) === index)
      .slice(0, maxItems)
  }
  catch {
    return []
  }
}

function personaTrainingSourceRefKey(sourceRef: AlicizationPersonaTrainingSourceRef) {
  return `${sourceRef.sourceKind}\0${sourceRef.sourceId}`
}

function candidateSourceRefs(input: {
  sourceId: string
  sourceMemoryIds: string[]
}): AlicizationPersonaTrainingSourceRef[] {
  const sourceIds = [
    input.sourceId,
    ...input.sourceMemoryIds.filter(sourceId => sourceId !== input.sourceId),
  ]
  return [...new Set(sourceIds)]
    .filter(Boolean)
    .map((sourceId, index) => ({
      sourceId,
      sourceKind: index === 0
        ? 'cleaned-long-term-reflection'
        : 'persona-reinforcement',
    }))
}

function hasPersonaCandidateTemplateResidue(candidate: Pick<
  PersonaTrainingCandidate,
  'behaviorLesson' | 'positiveExample' | 'negativeExample'
>) {
  return containsAlicizationFixedTemplateResidue([
    candidate.behaviorLesson,
    candidate.positiveExample,
    candidate.negativeExample,
  ].filter(Boolean).join(' '), {
    provenance: 'internal-structured-fact',
  })
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

function mapProjectionRow(row: PersonaCandidateProjectionRow): {
  candidate: PersonaTrainingCandidate
  sourceId: string
  sourceCreatedAt: number
  sourceUpdatedAt: number
} {
  const rootSourceId = normalizeText(row.root_source_id, 240)
  const sourceMemoryIds = parseTextArray(row.source_memory_ids_json)
  return {
    candidate: {
      id: normalizeText(row.candidate_id, 240),
      sourceMemoryIds: sourceMemoryIds.length > 0
        ? sourceMemoryIds
        : rootSourceId
          ? [rootSourceId]
          : [],
      behaviorLesson: normalizeText(row.behavior_lesson, 420),
      positiveExample: normalizeText(row.positive_example, 420),
      negativeExample: normalizeText(row.negative_example, 420) || undefined,
      privacyClass: row.privacy_class === 'public' ? 'public' : 'personal-redacted',
      status: 'candidate',
    },
    sourceId: rootSourceId,
    sourceCreatedAt: Number.isFinite(row.source_created_at)
      ? Math.max(0, Math.floor(row.source_created_at))
      : 0,
    sourceUpdatedAt: Number.isFinite(row.source_updated_at)
      ? Math.max(0, Math.floor(row.source_updated_at))
      : Number.isFinite(row.updated_at)
        ? Math.max(0, Math.floor(row.updated_at))
        : 0,
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
  createdAt?: number
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
    createdAt: Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(input.createdAt!))
      : Number.isFinite(input.now)
        ? Math.max(0, Math.floor(input.now))
        : Date.now(),
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
  listTombstonedLongTermMemorySourceIds: (
    sourceIds: string[],
    cardId?: string,
    source?: string,
  ) => Promise<Set<string>>
  listPersonaTrainingSourceProvenance: (payload: {
    cardId: string
    sourceRefs: AlicizationPersonaTrainingSourceRef[]
  }) => Promise<PersonaTrainingSourceProvenance[]>
}) {
  interface CandidateSourceItem {
    candidate: PersonaTrainingCandidate
    updatedAt: number
    createdAt: number
    sourceId: string
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
      })
      const pageTombstonedSourceIds = await input.listTombstonedLongTermMemorySourceIds(
        page.items.map(reinforcement => reinforcement.id),
        cardId,
        'persona_reinforcement_events',
      )
      const pageProvenanceKeys = await listProvenanceKeys(
        cardId,
        page.items.map(reinforcement => ({
          sourceId: reinforcement.id,
          sourceKind: 'persona-reinforcement',
        })),
      )
      for (const sourceId of pageTombstonedSourceIds)
        tombstonedSourceIds.add(sourceId)

      for (const reinforcement of page.items) {
        if (reinforcement.valence !== 'reinforce') {
          continue
        }
        if (containsAlicizationFixedTemplateResidue(reinforcement.dimension, {
          provenance: 'internal-structured-fact',
        }) || containsAlicizationFixedTemplateResidue(reinforcement.summary, {
          provenance: 'internal-structured-fact',
        })) {
          continue
        }
        if (pageTombstonedSourceIds.has(reinforcement.id)) {
          continue
        }
        if (!pageProvenanceKeys.has(personaTrainingSourceRefKey({
          sourceId: reinforcement.id,
          sourceKind: 'persona-reinforcement',
        }))) {
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

  async function listProvenanceKeys(
    cardId: string,
    sourceRefs: AlicizationPersonaTrainingSourceRef[],
  ) {
    const normalizedRefs = sourceRefs.filter(sourceRef =>
      normalizeText(sourceRef.sourceId, 240)
      && (
        sourceRef.sourceKind === 'cleaned-long-term-reflection'
        || sourceRef.sourceKind === 'persona-reinforcement'
      ),
    )
    if (normalizedRefs.length === 0)
      return new Set<string>()
    const rows = await input.listPersonaTrainingSourceProvenance({
      cardId,
      sourceRefs: normalizedRefs,
    })
    return new Set(rows.map(row => personaTrainingSourceRefKey({
      sourceId: normalizeText(row.sourceId, 240),
      sourceKind: row.sourceKind,
    })))
  }

  async function listConfirmedReflectionIds(cardId: string, sourceIds: string[]) {
    const normalizedSourceIds = [...new Set(sourceIds.map(sourceId => normalizeText(sourceId, 240)).filter(Boolean))]
    if (normalizedSourceIds.length === 0)
      return new Set<string>()
    const rows = await input.all<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM memory_reflections
      WHERE card_id = ?
        AND status = 'confirmed'
        AND id IN (${normalizedSourceIds.map(() => '?').join(', ')})
      `,
      [cardId, ...normalizedSourceIds],
    )
    return new Set(rows.map(row => normalizeText(row.id, 240)).filter(Boolean))
  }

  async function filterPersistedCandidatesWithProvenance(
    cardId: string,
    candidates: Array<{
      candidate: PersonaTrainingCandidate
      sourceId: string
      sourceCreatedAt: number
      sourceUpdatedAt: number
    }>,
  ) {
    if (candidates.length === 0)
      return candidates
    const reflectionTombstoneIds = await input.listTombstonedLongTermMemorySourceIds(
      candidates.map(item => item.sourceId),
      cardId,
      'memory_reflections',
    )
    const confirmedReflectionIds = await listConfirmedReflectionIds(
      cardId,
      candidates.map(item => item.sourceId),
    )
    const candidateReinforcementIds = new Set(
      candidates.flatMap(item => item.candidate.sourceMemoryIds.slice(1)),
    )
    const validReinforcementIds = candidateReinforcementIds.size > 0
      ? new Set((await listLatestReinforcements(cardId)).reinforcements.map(reinforcement => reinforcement.id))
      : new Set<string>()
    const sanitizedCandidates = candidates
      .filter(item =>
        confirmedReflectionIds.has(item.sourceId)
        && !reflectionTombstoneIds.has(item.sourceId)
        && !hasPersonaCandidateTemplateResidue(item.candidate),
      )
      .map(item => ({
        ...item,
        candidate: {
          ...item.candidate,
          sourceMemoryIds: [
            item.sourceId,
            ...item.candidate.sourceMemoryIds
              .filter(sourceId => sourceId !== item.sourceId)
              .filter(sourceId => validReinforcementIds.has(sourceId)),
          ],
        },
      }))
    const candidatesWithSourceRefs = sanitizedCandidates.map(item => ({
      ...item,
      sourceRefs: candidateSourceRefs({
        sourceId: item.sourceId,
        sourceMemoryIds: item.candidate.sourceMemoryIds,
      }),
    }))
    const sourceRefs = candidatesWithSourceRefs.flatMap(item => item.sourceRefs)
    const provenanceKeys = await listProvenanceKeys(cardId, sourceRefs)
    return candidatesWithSourceRefs
      .filter(item => item.sourceRefs.every(sourceRef => provenanceKeys.has(personaTrainingSourceRefKey(sourceRef))))
      .map(({ sourceRefs: _sourceRefs, ...item }) => item)
  }

  function buildCandidatesFromReflections(inputData: {
    reflections: AlicizationMemoryReflectionRecord[]
    reinforcements: AlicizationPersonaReinforcementEventRecord[]
    tombstonedSourceIds: Set<string>
    provenanceKeys: Set<string>
  }) {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: inputData.reflections
        .filter(reflection => inputData.provenanceKeys.has(personaTrainingSourceRefKey({
          sourceId: reflection.id,
          sourceKind: 'cleaned-long-term-reflection',
        })))
        .map(reflection => ({
          id: reflection.id,
          summary: reflection.summary,
          lesson: reflection.lesson,
          confidence: reflection.confidence,
          status: reflection.status,
        })),
      reinforcements: inputData.reinforcements
        .filter(reinforcement => inputData.provenanceKeys.has(personaTrainingSourceRefKey({
          sourceId: reinforcement.id,
          sourceKind: 'persona-reinforcement',
        })))
        .map(reinforcement => ({
          id: reinforcement.id,
          dimension: reinforcement.dimension,
          summary: reinforcement.summary,
          valence: reinforcement.valence,
          delta: reinforcement.delta,
        })),
      tombstonedSourceIds: Array.from(inputData.tombstonedSourceIds),
    })
    const reflectionUpdatedAt = new Map(inputData.reflections.map(reflection => [reflection.id, reflection.updatedAt]))
    const reflectionCreatedAt = new Map(inputData.reflections.map(reflection => [reflection.id, reflection.createdAt]))
    return candidates
      .filter(candidate => resolvePersonaCandidateSourceEligibility({
        source: 'cleaned-long-term-reflection',
        origin: 'provider',
        learningPolicy: {
          allowLongTermCondensation: true,
          allowPersonaLearning: true,
          allowTraining: false,
        },
        contaminated: hasPersonaCandidateTemplateResidue(candidate),
      }).allowPersonaLearning)
      .map(candidate => ({
        candidate,
        updatedAt: reflectionUpdatedAt.get(candidate.sourceMemoryIds[0] ?? '') ?? input.now(),
        createdAt: reflectionCreatedAt.get(candidate.sourceMemoryIds[0] ?? '')
          ?? reflectionUpdatedAt.get(candidate.sourceMemoryIds[0] ?? '')
          ?? input.now(),
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
    const reinforcementProvenanceKeys = await listProvenanceKeys(
      inputData.cardId,
      reinforcements.map(reinforcement => ({
        sourceId: reinforcement.id,
        sourceKind: 'persona-reinforcement',
      })),
    )
    const provenancedReinforcements = reinforcements.filter(reinforcement =>
      reinforcementProvenanceKeys.has(personaTrainingSourceRefKey({
        sourceId: reinforcement.id,
        sourceKind: 'persona-reinforcement',
      })),
    )
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
      })
      const tombstonedSourceIds = new Set(reinforcementTombstones)
      const reflectionTombstones = await input.listTombstonedLongTermMemorySourceIds(
        page.items.map(reflection => reflection.id),
        inputData.cardId,
        'memory_reflections',
      )
      for (const sourceId of reflectionTombstones)
        tombstonedSourceIds.add(sourceId)

      const provenanceKeys = await listProvenanceKeys(
        inputData.cardId,
        page.items.map(reflection => ({
          sourceId: reflection.id,
          sourceKind: 'cleaned-long-term-reflection',
        })),
      )
      for (const key of reinforcementProvenanceKeys)
        provenanceKeys.add(key)

      if (await inputData.onPage(buildCandidatesFromReflections({
        reflections: page.items,
        reinforcements: provenancedReinforcements,
        tombstonedSourceIds,
        provenanceKeys,
      }))) {
        return
      }

      if (!page.nextCursor || seenCursors.has(page.nextCursor))
        return
      seenCursors.add(page.nextCursor)
      cursor = page.nextCursor
    }
  }

  async function persistCandidateProjectionPage(cardId: string, candidates: CandidateSourceItem[]) {
    if (candidates.length === 0)
      return
    const projectedAt = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        for (const candidate of candidates) {
          await input.run(
            input.database,
            `
            INSERT INTO persona_training_candidate_projections (
              card_id,
              candidate_id,
              root_source_id,
              source_memory_ids_json,
              behavior_lesson,
              positive_example,
              negative_example,
              privacy_class,
              source_created_at,
              source_updated_at,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id, candidate_id) DO UPDATE SET
              root_source_id = excluded.root_source_id,
              source_memory_ids_json = excluded.source_memory_ids_json,
              behavior_lesson = excluded.behavior_lesson,
              positive_example = excluded.positive_example,
              negative_example = excluded.negative_example,
              privacy_class = excluded.privacy_class,
              source_created_at = excluded.source_created_at,
              source_updated_at = excluded.source_updated_at,
              updated_at = excluded.updated_at
            `,
            [
              cardId,
              candidate.candidate.id,
              candidate.sourceId,
              JSON.stringify(candidate.candidate.sourceMemoryIds),
              candidate.candidate.behaviorLesson,
              candidate.candidate.positiveExample,
              candidate.candidate.negativeExample ?? null,
              candidate.candidate.privacyClass,
              candidate.createdAt,
              candidate.updatedAt,
              projectedAt,
              projectedAt,
            ],
          )
        }
      })
    })
  }

  async function refreshProjectionForReflections(reflections: AlicizationMemoryReflectionRecord[]) {
    const reflectionsByCard = new Map<string, AlicizationMemoryReflectionRecord[]>()
    for (const reflection of reflections) {
      const cardId = normalizeText(reflection.cardId, 120)
      if (!cardId)
        continue
      const cardReflections = reflectionsByCard.get(cardId) ?? []
      cardReflections.push(reflection)
      reflectionsByCard.set(cardId, cardReflections)
    }

    for (const [cardId, cardReflections] of reflectionsByCard) {
      const rootSourceIds = cardReflections.map(reflection => reflection.id)
      const { reinforcements, tombstonedSourceIds: reinforcementTombstones } = await listLatestReinforcements(cardId)
      const reflectionTombstones = await input.listTombstonedLongTermMemorySourceIds(
        rootSourceIds,
        cardId,
        'memory_reflections',
      )
      const tombstonedSourceIds = new Set([
        ...reinforcementTombstones,
        ...reflectionTombstones,
      ])
      const candidates = buildCandidatesFromReflections({
        reflections: cardReflections,
        reinforcements,
        tombstonedSourceIds,
        provenanceKeys: await listProvenanceKeys(cardId, [
          ...cardReflections.map(reflection => ({
            sourceId: reflection.id,
            sourceKind: 'cleaned-long-term-reflection' as const,
          })),
          ...reinforcements.map(reinforcement => ({
            sourceId: reinforcement.id,
            sourceKind: 'persona-reinforcement' as const,
          })),
        ]),
      })
      await input.enqueueWrite(async () => {
        await input.runInTransaction(input.database, async () => {
          for (const rootSourceId of rootSourceIds) {
            await input.run(
              input.database,
              `
              DELETE FROM persona_training_candidate_projections
              WHERE card_id = ? AND root_source_id = ?
              `,
              [cardId, rootSourceId],
            )
          }
        })
      })
      await persistCandidateProjectionPage(cardId, candidates)
    }
  }

  async function removeProjectionSources(payload: {
    cardId: string
    sourceIds: string[]
  }) {
    const cardId = normalizeText(payload.cardId, 120)
    const sourceIds = payload.sourceIds
      .map(sourceId => normalizeText(sourceId, 240))
      .filter(Boolean)
    if (!cardId || sourceIds.length === 0)
      return
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        for (const sourceId of sourceIds) {
          await input.run(
            input.database,
            `
            DELETE FROM persona_training_candidate_projections
            WHERE card_id = ? AND root_source_id = ?
            `,
            [cardId, sourceId],
          )
        }
      })
    })
  }

  async function refreshProjectionReinforcementSources(cardIdRaw: string) {
    const cardId = normalizeText(cardIdRaw, 120)
    if (!cardId)
      return
    const { reinforcements } = await listLatestReinforcements(cardId)
    const reinforcementIds = reinforcements.map(reinforcement => reinforcement.id)
    const rows = await input.all<Pick<PersonaCandidateProjectionRow, 'candidate_id' | 'root_source_id'>>(
      input.database,
      `
      SELECT candidate_id, root_source_id
      FROM persona_training_candidate_projections
      WHERE card_id = ?
      `,
      [cardId],
    )
    if (rows.length === 0)
      return
    const projectedAt = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        for (const row of rows) {
          await input.run(
            input.database,
            `
            UPDATE persona_training_candidate_projections
            SET source_memory_ids_json = ?, updated_at = ?
            WHERE card_id = ? AND candidate_id = ?
            `,
            [
              JSON.stringify([row.root_source_id, ...reinforcementIds].slice(0, 8)),
              projectedAt,
              cardId,
              row.candidate_id,
            ],
          )
        }
      })
    })
  }

  async function listProjectionPage(inputData: {
    cardId: string
    cursor: ReturnType<typeof decodeCursor>
    limit: number
  }) {
    const params: unknown[] = [inputData.cardId]
    const where = ['card_id = ?']
    if (inputData.cursor) {
      const sourceUpdatedAt = inputData.cursor.sourceUpdatedAt ?? inputData.cursor.updatedAt
      const sourceId = inputData.cursor.sourceId
        ?? (inputData.cursor.id.startsWith('persona-candidate:')
          ? inputData.cursor.id.slice('persona-candidate:'.length)
          : inputData.cursor.id)
      where.push('(source_updated_at < ? OR (source_updated_at = ? AND root_source_id > ?))')
      params.push(sourceUpdatedAt, sourceUpdatedAt, sourceId)
    }
    params.push(inputData.limit)
    const rows = await input.all<PersonaCandidateProjectionRow>(
      input.database,
      `
      SELECT
        candidate_id,
        root_source_id,
        source_memory_ids_json,
        behavior_lesson,
        positive_example,
        negative_example,
        privacy_class,
        source_created_at,
        source_updated_at,
        updated_at
      FROM persona_training_candidate_projections
      WHERE ${where.join(' AND ')}
      ORDER BY source_updated_at DESC, root_source_id ASC
      LIMIT ?
      `,
      params,
    )
    return rows.map(mapProjectionRow)
  }

  async function getProjectionCandidate(cardId: string, candidateId: string) {
    const rows = await input.all<PersonaCandidateProjectionRow>(
      input.database,
      `
      SELECT
        candidate_id,
        root_source_id,
        source_memory_ids_json,
        behavior_lesson,
        positive_example,
        negative_example,
        privacy_class,
        source_created_at,
        source_updated_at,
        updated_at
      FROM persona_training_candidate_projections
      WHERE card_id = ? AND candidate_id = ?
      LIMIT 1
      `,
      [cardId, candidateId],
    )
    return rows[0] ? mapProjectionRow(rows[0]) : null
  }

  async function refreshProjectionForCandidateId(cardId: string, candidateId: string) {
    const sourceId = candidateId.startsWith('persona-candidate:')
      ? candidateId.slice('persona-candidate:'.length)
      : ''
    if (!sourceId)
      return null
    const rows = await input.all<PersonaCandidateReflectionRow>(
      input.database,
      `
      SELECT
        id,
        card_id,
        source_kind,
        target_scope,
        summary,
        lesson,
        status,
        confidence,
        created_at,
        updated_at
      FROM memory_reflections
      WHERE card_id = ? AND id = ?
      LIMIT 1
      `,
      [cardId, sourceId],
    )
    const row = rows[0]
    if (!row)
      return null
    await refreshProjectionForReflections([{
      id: row.id,
      cardId: row.card_id,
      decisionTraceId: null,
      turnId: null,
      sessionId: null,
      sourceKind: row.source_kind,
      targetScope: row.target_scope,
      summary: row.summary,
      lesson: row.lesson,
      status: row.status,
      confidence: row.confidence,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confirmedAt: row.status === 'confirmed' ? row.updated_at : null,
      deniedAt: row.status === 'denied' ? row.updated_at : null,
    }])
    return await getProjectionCandidate(cardId, candidateId)
  }

  function projectionMarkerKey(cardId: string) {
    return `persona_candidate_projection_v1:${cardId}`
  }

  async function setProjectionState(cardIds: string[], state: 'complete' | 'dirty') {
    const normalizedCardIds = [...new Set(
      cardIds
        .map(cardId => normalizeText(cardId, 120))
        .filter(Boolean),
    )]
    if (normalizedCardIds.length === 0)
      return
    const updatedAt = input.now()
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        for (const cardId of normalizedCardIds) {
          await input.run(
            input.database,
            `
            INSERT INTO alicization_meta (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
            `,
            [projectionMarkerKey(cardId), state, updatedAt],
          )
        }
      })
    })
  }

  async function markProjectionDirty(cardIds: string[]) {
    await setProjectionState(cardIds, 'dirty')
  }

  async function markProjectionComplete(cardIds: string[]) {
    await setProjectionState(cardIds, 'complete')
  }

  async function backfillCard(cardIdRaw: string) {
    const cardId = normalizeText(cardIdRaw, 120)
    if (!cardId)
      return
    const markerKey = projectionMarkerKey(cardId)
    const markerRows = await input.all<{ value: string }>(
      input.database,
      `SELECT value FROM alicization_meta WHERE key = ? LIMIT 1`,
      [markerKey],
    )
    if (markerRows[0]?.value === 'complete')
      return

    await input.enqueueWrite(async () => {
      await input.run(
        input.database,
        `DELETE FROM persona_training_candidate_projections WHERE card_id = ?`,
        [cardId],
      )
    })
    await readCandidateSourcePages({
      cardId,
      cursor: null,
      sourcePageLimit: 256,
      onPage: async (candidates) => {
        await persistCandidateProjectionPage(cardId, candidates)
        return false
      },
    })
    await markProjectionComplete([cardId])
  }

  async function backfillLegacyProjections(cardIdRaw?: string | null) {
    const cardId = normalizeText(cardIdRaw, 120)
    if (cardId) {
      await backfillCard(cardId)
      return
    }

    const cardRows = await input.all<{ card_id: string }>(
      input.database,
      `
      SELECT DISTINCT card_id
      FROM memory_reflections
      WHERE status = 'confirmed' AND card_id <> ''
      `,
    )
    for (const row of cardRows)
      await backfillCard(row.card_id)
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
    const sourcePageLimit = Math.max(2, Math.min(256, limit + 1))
    let pageCursor = cursor
    const seenCursors = new Set<string>()
    let hasMoreSources = false
    while (true) {
      const pageCandidates = await listProjectionPage({
        cardId,
        cursor: pageCursor,
        limit: sourcePageLimit,
      })
      const eligiblePageCandidates = await filterPersistedCandidatesWithProvenance(cardId, pageCandidates)
      const sourceRefs = eligiblePageCandidates.flatMap(item => candidateSourceRefs({
        sourceId: item.sourceId,
        sourceMemoryIds: item.candidate.sourceMemoryIds,
      }))
      const sourceIds = eligiblePageCandidates.flatMap(item => item.candidate.sourceMemoryIds)
      const [policies, candidatePolicies] = await Promise.all([
        input.policyStore.listPolicyOverrides({ cardId, sourceRefs }),
        input.policyStore.listPolicyOverrides({ cardId, sourceIds }),
      ])
      const policiesBySourceRef = new Map(policies.map(policy => [
        `${policy.sourceKind}\0${policy.sourceId}`,
        policy,
      ]))
      const policiesByCandidateSourceId = new Map(
        candidatePolicies
          .filter(policy => policy.source === 'working_memory_long_term_candidate')
          .map(policy => [policy.sourceId, policy]),
      )
      matched.push(...eligiblePageCandidates
        .map(({ candidate, sourceCreatedAt, sourceUpdatedAt, sourceId }) => {
          const rootPolicy = policiesBySourceRef.get(`${'cleaned-long-term-reflection'}\0${sourceId}`)
          const noTrainingPolicy = candidate.sourceMemoryIds
            .slice(1)
            .map(reinforcementId => policiesBySourceRef.get(`${'persona-reinforcement'}\0${reinforcementId}`))
            .find(policy => policy?.reviewState === 'no-training')
          const candidatePolicy = candidate.sourceMemoryIds
            .map(candidateSourceId => policiesByCandidateSourceId.get(candidateSourceId))
            .find(policy => policy?.reviewState === 'inward-only' || policy?.reviewState === 'no-training')
          const policy = rootPolicy?.reviewState && rootPolicy.reviewState !== 'none'
            ? rootPolicy
            : noTrainingPolicy ?? candidatePolicy
          const review = policy
            ? {
                candidateId: candidate.id,
                status: policy.reviewState === 'inward-only'
                  ? 'no-training' as const
                  : normalizeCandidateStatus(policy.reviewState),
                allowTraining: false,
                reason: policy.reason,
                updatedAt: policy.updatedAt,
              }
            : null
          return {
            item: mergePersonaCandidateReviewState({
              candidate,
              review,
              now: sourceUpdatedAt,
              createdAt: sourceCreatedAt,
            }),
            sourceUpdatedAt,
            sourceId,
          }
        })
        .filter(({ item }) => !requestedStatus || item.status === requestedStatus))

      hasMoreSources = pageCandidates.length >= sourcePageLimit
      if (matched.length > limit || !hasMoreSources)
        break
      const last = pageCandidates.at(-1)
      if (!last)
        break
      const nextCursor = encodeCursor({
        updatedAt: last.sourceUpdatedAt,
        id: last.candidate.id,
        sourceUpdatedAt: last.sourceUpdatedAt,
        sourceId: last.sourceId,
      })
      if (seenCursors.has(nextCursor))
        break
      seenCursors.add(nextCursor)
      pageCursor = decodeCursor(nextCursor)
    }

    const items = matched.slice(0, limit).map(({ item }) => item)
    const next = matched.length > limit || hasMoreSources ? items[items.length - 1] : null
    const nextSource = matched.length > limit || hasMoreSources ? matched[Math.max(0, items.length - 1)] : null
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

    const projectedCandidate = await getProjectionCandidate(cardId, candidateId)
      ?? await refreshProjectionForCandidateId(cardId, candidateId)
    if (!projectedCandidate)
      return null
    const eligible = await filterPersistedCandidatesWithProvenance(cardId, [{
      candidate: projectedCandidate.candidate,
      sourceId: projectedCandidate.sourceId,
      sourceCreatedAt: projectedCandidate.sourceCreatedAt,
      sourceUpdatedAt: projectedCandidate.sourceUpdatedAt,
    }])
    if (eligible.length === 0)
      return null
    const candidate = eligible[0]!

    const status = statusForDecision(payload.decision)
    const reason = normalizeText(payload.reason, 240) || null
    const policy = await input.policyStore.upsertPolicyOverride({
      cardId,
      sourceId: candidate.sourceId,
      source: 'memory_reflections',
      sourceKind: 'cleaned-long-term-reflection',
      visibleMode: 'explicit',
      allowTraining: false,
      reviewState: status,
      reason,
    })
    return mergePersonaCandidateReviewState({
      candidate: candidate.candidate,
      review: {
        candidateId,
        status,
        allowTraining: false,
        reason: policy.reason ?? reason,
        updatedAt: policy.updatedAt,
      },
      now: candidate.sourceUpdatedAt,
      createdAt: candidate.sourceCreatedAt,
    })
  }

  return {
    backfillLegacyProjections,
    markProjectionComplete,
    markProjectionDirty,
    refreshProjectionForCandidateId,
    refreshProjectionForReflections,
    refreshProjectionReinforcementSources,
    removeProjectionSources,
    listPersonaCandidates,
    applyPersonaCandidateAction,
  }
}

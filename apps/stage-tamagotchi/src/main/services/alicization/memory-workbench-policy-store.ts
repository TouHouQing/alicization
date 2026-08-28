import type {
  AlicizationPersonaTrainingSourceKind,
  AlicizationPersonaTrainingSourceRef,
} from '@proj-alicization/stage-shared'
import type sqlite3 from 'sqlite3'

import type {
  AlicizationMemoryWorkbenchSensitivity,
  AlicizationMemoryWorkbenchTrainingState,
  AlicizationMemoryWorkbenchVisibility,
} from '../../../shared/eventa'

export type MemoryWorkbenchReviewState = 'none' | 'approved' | 'rejected' | 'tombstoned' | 'inward-only' | 'no-training'

export interface MemoryWorkbenchPolicyOverride {
  sourceId: string
  source: string
  sourceKind: AlicizationPersonaTrainingSourceKind | null
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
  updatedAt: number
}

export interface MemoryWorkbenchMergedPolicy {
  visibleMode: AlicizationMemoryWorkbenchVisibility
  training: AlicizationMemoryWorkbenchTrainingState
  tombstoned: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
}

interface MemoryWorkbenchPolicyOverrideRow {
  source_id: string
  source: string
  source_kind: string
  visible_mode: string
  allow_training: number
  review_state: string
  reason: string | null
  updated_at: number
}

export interface MemoryWorkbenchPolicyStoreRuntime {
  upsertPolicyOverride: (input: {
    cardId: string
    sourceId: string
    source: string
    sourceKind?: AlicizationPersonaTrainingSourceKind | null
    visibleMode: AlicizationMemoryWorkbenchVisibility
    allowTraining: boolean
    reviewState: MemoryWorkbenchReviewState
    reason?: string | null
  }) => Promise<MemoryWorkbenchPolicyOverride>
  listPolicyOverrides: (input: {
    cardId: string
    sourceIds?: string[]
    sourceRefs?: AlicizationPersonaTrainingSourceRef[]
  }) => Promise<MemoryWorkbenchPolicyOverride[]>
  inheritCandidatePolicies: (input: {
    cardId: string
    candidateSourceIds: string[]
    projectedSources: Array<{
      sourceId: string
      source: string
      sourceKind?: AlicizationPersonaTrainingSourceKind | null
    }>
  }) => Promise<MemoryWorkbenchPolicyOverride[]>
}

function normalizeText(raw: unknown, maxChars = 240) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
    : ''
}

function defaultVisibleMode(sensitivity: AlicizationMemoryWorkbenchSensitivity): AlicizationMemoryWorkbenchVisibility {
  return sensitivity === 'private' || sensitivity === 'secret' ? 'inward-only' : 'explicit'
}

function normalizeReviewState(raw: unknown): MemoryWorkbenchReviewState {
  return raw === 'approved'
    || raw === 'rejected'
    || raw === 'tombstoned'
    || raw === 'inward-only'
    || raw === 'no-training'
    ? raw
    : 'none'
}

function normalizeVisibleMode(raw: unknown): AlicizationMemoryWorkbenchVisibility {
  return raw === 'inward-only' ? 'inward-only' : 'explicit'
}

function normalizePersonaTrainingSourceKind(raw: unknown): AlicizationPersonaTrainingSourceKind | null {
  return raw === 'cleaned-long-term-reflection' || raw === 'persona-reinforcement'
    ? raw
    : null
}

function sourceForPersonaTrainingSourceKind(
  sourceKind: AlicizationPersonaTrainingSourceKind,
) {
  return sourceKind === 'cleaned-long-term-reflection'
    ? 'memory_reflections'
    : 'persona_reinforcement_events'
}

export function deriveMemoryWorkbenchPolicyForSource(input: {
  sourceId: string
  source: string
  sourceKind?: AlicizationPersonaTrainingSourceKind | null
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
  updatedAt: number
}): MemoryWorkbenchPolicyOverride {
  return {
    sourceId: normalizeText(input.sourceId),
    source: normalizeText(input.source, 120),
    sourceKind: input.sourceKind === 'cleaned-long-term-reflection'
      || input.sourceKind === 'persona-reinforcement'
      ? input.sourceKind
      : null,
    visibleMode: input.visibleMode,
    allowTraining: input.allowTraining === true,
    reviewState: input.reviewState,
    reason: normalizeText(input.reason, 240) || null,
    updatedAt: Number.isFinite(input.updatedAt) ? Number(input.updatedAt) : Date.now(),
  }
}

export function mergeMemoryWorkbenchPolicy(input: {
  sourceId: string
  source: string
  sensitivity: AlicizationMemoryWorkbenchSensitivity
  override: MemoryWorkbenchPolicyOverride | null
  tombstoned: boolean
}): MemoryWorkbenchMergedPolicy {
  if (input.tombstoned) {
    return {
      visibleMode: 'inward-only',
      training: 'blocked',
      tombstoned: true,
      reviewState: 'tombstoned',
      reason: input.override?.reason ?? 'tombstoned',
    }
  }

  return {
    visibleMode: input.override?.visibleMode ?? defaultVisibleMode(input.sensitivity),
    training: input.override?.allowTraining ? 'allowed' : 'blocked',
    tombstoned: false,
    reviewState: input.override?.reviewState ?? 'none',
    reason: input.override?.reason ?? null,
  }
}

export function inheritPreAdmissionMemoryWorkbenchPolicies(input: {
  candidatePolicies: MemoryWorkbenchPolicyOverride[]
  candidateSourceIds: string[]
  projectedSources: Array<{
    sourceId: string
    source: string
    sourceKind?: AlicizationPersonaTrainingSourceKind | null
  }>
  now: number
}): MemoryWorkbenchPolicyOverride[] {
  const candidateIds = new Set(input.candidateSourceIds.map(id => normalizeText(id)).filter(Boolean))
  const sourcePolicy = input.candidatePolicies.find(policy => candidateIds.has(policy.sourceId))
  if (!sourcePolicy)
    return []

  return input.projectedSources
    .map(source => deriveMemoryWorkbenchPolicyForSource({
      sourceId: source.sourceId,
      source: source.source,
      sourceKind: source.sourceKind,
      visibleMode: sourcePolicy.visibleMode,
      allowTraining: sourcePolicy.allowTraining,
      reviewState: sourcePolicy.reviewState,
      reason: sourcePolicy.reason,
      updatedAt: input.now,
    }))
    .filter(policy => policy.sourceId && policy.source)
}

function mapPolicyRow(row: MemoryWorkbenchPolicyOverrideRow): MemoryWorkbenchPolicyOverride {
  return deriveMemoryWorkbenchPolicyForSource({
    sourceId: row.source_id,
    source: row.source,
    sourceKind: normalizePersonaTrainingSourceKind(row.source_kind),
    visibleMode: normalizeVisibleMode(row.visible_mode),
    allowTraining: row.allow_training === 1,
    reviewState: normalizeReviewState(row.review_state),
    reason: row.reason,
    updatedAt: row.updated_at,
  })
}

export function createMemoryWorkbenchPolicyStoreRuntime(input: {
  database: sqlite3.Database
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}): MemoryWorkbenchPolicyStoreRuntime {
  async function upsertPolicyOverride(policyInput: {
    cardId: string
    sourceId: string
    source: string
    sourceKind?: AlicizationPersonaTrainingSourceKind | null
    visibleMode: AlicizationMemoryWorkbenchVisibility
    allowTraining: boolean
    reviewState: MemoryWorkbenchReviewState
    reason?: string | null
  }) {
    const cardId = normalizeText(policyInput.cardId, 120)
    const policy = deriveMemoryWorkbenchPolicyForSource({
      sourceId: policyInput.sourceId,
      source: policyInput.source,
      sourceKind: policyInput.sourceKind,
      visibleMode: policyInput.visibleMode,
      allowTraining: policyInput.allowTraining,
      reviewState: policyInput.reviewState,
      reason: policyInput.reason ?? null,
      updatedAt: input.now(),
    })
    if (!cardId || !policy.sourceId || !policy.source)
      return policy

    const sourceKind = policy.sourceKind ?? ''
    const id = `ltm-policy:${cardId}:${policy.source}:${sourceKind || 'generic'}:${policy.sourceId}`
    await input.enqueueWrite(async () => {
      await input.run(
        input.database,
        `
        INSERT INTO long_term_memory_policy_overrides (
          id,
          card_id,
          source_id,
          source,
          source_kind,
          visible_mode,
          allow_training,
          review_state,
          reason,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id, source_id, source, source_kind) DO UPDATE SET
          visible_mode = excluded.visible_mode,
          allow_training = excluded.allow_training,
          review_state = excluded.review_state,
          reason = excluded.reason,
          updated_at = excluded.updated_at
        `,
        [
          id,
          cardId,
          policy.sourceId,
          policy.source,
          sourceKind,
          policy.visibleMode,
          policy.allowTraining ? 1 : 0,
          policy.reviewState,
          policy.reason,
          policy.updatedAt,
          policy.updatedAt,
        ],
      )
    })
    return policy
  }

  async function listPolicyOverrides(listInput: {
    cardId: string
    sourceIds?: string[]
    sourceRefs?: AlicizationPersonaTrainingSourceRef[]
  }) {
    const cardId = normalizeText(listInput.cardId, 120)
    if (!cardId)
      return []

    const sourceIds = new Set((listInput.sourceIds ?? []).map(id => normalizeText(id)).filter(Boolean))
    const sourceRefs = (listInput.sourceRefs ?? [])
      .map(sourceRef => ({
        sourceId: normalizeText(sourceRef.sourceId),
        sourceKind: sourceRef.sourceKind,
      }))
      .filter(sourceRef => sourceRef.sourceId)
    const sourceRefKeys = new Set(sourceRefs
      .map(sourceRef => `${sourceRef.sourceKind}\0${sourceRef.sourceId}`))
    const rows: MemoryWorkbenchPolicyOverrideRow[] = []
    const selectColumns = `
      SELECT source_id, source, source_kind, visible_mode, allow_training, review_state, reason, updated_at
      FROM long_term_memory_policy_overrides
    `
    const appendRows = async (where: string, params: unknown[]) => {
      rows.push(...await input.all<MemoryWorkbenchPolicyOverrideRow>(
        input.database,
        `${selectColumns}
        WHERE ${where}
        ORDER BY updated_at DESC
        `,
        params,
      ))
    }

    if (sourceRefs.length > 0) {
      for (let index = 0; index < sourceRefs.length; index += 200) {
        const sourceRefChunk = sourceRefs.slice(index, index + 200)
        await appendRows(
          `card_id = ? AND (${sourceRefChunk.map(() => '(source_id = ? AND source_kind = ?)').join(' OR ')})`,
          [
            cardId,
            ...sourceRefChunk.flatMap(sourceRef => [sourceRef.sourceId, sourceRef.sourceKind]),
          ],
        )
      }
    }
    else if (sourceIds.size > 0) {
      const ids = [...sourceIds]
      for (let index = 0; index < ids.length; index += 400) {
        const idChunk = ids.slice(index, index + 400)
        await appendRows(
          `card_id = ? AND source_id IN (${idChunk.map(() => '?').join(', ')})`,
          [cardId, ...idChunk],
        )
      }
    }
    else {
      await appendRows('card_id = ?', [cardId])
    }

    return rows
      .map(mapPolicyRow)
      .filter((policy) => {
        if (sourceRefKeys.size > 0) {
          return policy.sourceKind != null
            && sourceRefKeys.has(`${policy.sourceKind}\0${policy.sourceId}`)
            && policy.source === sourceForPersonaTrainingSourceKind(policy.sourceKind)
        }
        return sourceIds.size === 0 || sourceIds.has(policy.sourceId)
      })
      .sort((left, right) => right.updatedAt - left.updatedAt || left.sourceId.localeCompare(right.sourceId))
  }

  async function inheritCandidatePolicies(inheritInput: {
    cardId: string
    candidateSourceIds: string[]
    projectedSources: Array<{
      sourceId: string
      source: string
      sourceKind?: AlicizationPersonaTrainingSourceKind | null
    }>
  }) {
    const candidatePolicies = (await listPolicyOverrides({
      cardId: inheritInput.cardId,
      sourceIds: inheritInput.candidateSourceIds,
    })).filter(policy => policy.source === 'working_memory_long_term_candidate')
    const inherited = inheritPreAdmissionMemoryWorkbenchPolicies({
      candidatePolicies,
      candidateSourceIds: inheritInput.candidateSourceIds,
      projectedSources: inheritInput.projectedSources,
      now: input.now(),
    })
    await input.enqueueWrite(async () => {
      await input.runInTransaction(input.database, async () => {
        for (const policy of inherited) {
          const sourceKind = policy.sourceKind ?? ''
          const id = `ltm-policy:${normalizeText(inheritInput.cardId, 120)}:${policy.source}:${sourceKind || 'generic'}:${policy.sourceId}`
          await input.run(
            input.database,
            `
            INSERT INTO long_term_memory_policy_overrides (
              id,
              card_id,
              source_id,
              source,
              source_kind,
              visible_mode,
              allow_training,
              review_state,
              reason,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id, source_id, source, source_kind) DO UPDATE SET
              visible_mode = excluded.visible_mode,
              allow_training = excluded.allow_training,
              review_state = excluded.review_state,
              reason = excluded.reason,
              updated_at = excluded.updated_at
            `,
            [
              id,
              normalizeText(inheritInput.cardId, 120),
              policy.sourceId,
              policy.source,
              sourceKind,
              policy.visibleMode,
              policy.allowTraining ? 1 : 0,
              policy.reviewState,
              policy.reason,
              policy.updatedAt,
              policy.updatedAt,
            ],
          )
        }
      })
    })
    return inherited
  }

  return {
    upsertPolicyOverride,
    listPolicyOverrides,
    inheritCandidatePolicies,
  }
}

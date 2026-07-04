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
    visibleMode: AlicizationMemoryWorkbenchVisibility
    allowTraining: boolean
    reviewState: MemoryWorkbenchReviewState
    reason?: string | null
  }) => Promise<MemoryWorkbenchPolicyOverride>
  listPolicyOverrides: (input: { cardId: string, sourceIds?: string[] }) => Promise<MemoryWorkbenchPolicyOverride[]>
  inheritCandidatePolicies: (input: {
    cardId: string
    candidateSourceIds: string[]
    projectedSources: Array<{ sourceId: string, source: string }>
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

export function deriveMemoryWorkbenchPolicyForSource(input: {
  sourceId: string
  source: string
  visibleMode: AlicizationMemoryWorkbenchVisibility
  allowTraining: boolean
  reviewState: MemoryWorkbenchReviewState
  reason: string | null
  updatedAt: number
}): MemoryWorkbenchPolicyOverride {
  return {
    sourceId: normalizeText(input.sourceId),
    source: normalizeText(input.source, 120),
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
  projectedSources: Array<{ sourceId: string, source: string }>
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
    visibleMode: AlicizationMemoryWorkbenchVisibility
    allowTraining: boolean
    reviewState: MemoryWorkbenchReviewState
    reason?: string | null
  }) {
    const cardId = normalizeText(policyInput.cardId, 120)
    const policy = deriveMemoryWorkbenchPolicyForSource({
      sourceId: policyInput.sourceId,
      source: policyInput.source,
      visibleMode: policyInput.visibleMode,
      allowTraining: policyInput.allowTraining,
      reviewState: policyInput.reviewState,
      reason: policyInput.reason ?? null,
      updatedAt: input.now(),
    })
    if (!cardId || !policy.sourceId || !policy.source)
      return policy

    const id = `ltm-policy:${cardId}:${policy.source}:${policy.sourceId}`
    await input.enqueueWrite(async () => {
      await input.run(
        input.database,
        `
        INSERT INTO long_term_memory_policy_overrides (
          id,
          card_id,
          source_id,
          source,
          visible_mode,
          allow_training,
          review_state,
          reason,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(card_id, source_id, source) DO UPDATE SET
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

  async function listPolicyOverrides(listInput: { cardId: string, sourceIds?: string[] }) {
    const cardId = normalizeText(listInput.cardId, 120)
    if (!cardId)
      return []

    const sourceIds = new Set((listInput.sourceIds ?? []).map(id => normalizeText(id)).filter(Boolean))
    const rows = await input.all<MemoryWorkbenchPolicyOverrideRow>(
      input.database,
      `
      SELECT source_id, source, visible_mode, allow_training, review_state, reason, updated_at
      FROM long_term_memory_policy_overrides
      WHERE card_id = ?
      ORDER BY updated_at DESC
      `,
      [cardId],
    )
    return rows
      .map(mapPolicyRow)
      .filter(policy => sourceIds.size === 0 || sourceIds.has(policy.sourceId))
  }

  async function inheritCandidatePolicies(inheritInput: {
    cardId: string
    candidateSourceIds: string[]
    projectedSources: Array<{ sourceId: string, source: string }>
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
          const id = `ltm-policy:${normalizeText(inheritInput.cardId, 120)}:${policy.source}:${policy.sourceId}`
          await input.run(
            input.database,
            `
            INSERT INTO long_term_memory_policy_overrides (
              id,
              card_id,
              source_id,
              source,
              visible_mode,
              allow_training,
              review_state,
              reason,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id, source_id, source) DO UPDATE SET
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

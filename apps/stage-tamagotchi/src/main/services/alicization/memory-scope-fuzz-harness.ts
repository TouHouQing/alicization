import { errorMessageFrom } from '@moeru/std'

export const MEMORY_SCOPE_FUZZ_SURFACES = [
  'memory_facts',
  'memory_consolidations',
  'search_documents',
  'vectors',
  'review_queue',
  'persona_dataset',
] as const

export type MemoryScopeFuzzSurface = typeof MEMORY_SCOPE_FUZZ_SURFACES[number]
export type MemoryScopeFuzzViolationReason
  = | 'cross-card'
    | 'cross-user'
    | 'cross-source'
    | 'target-miss'
    | 'malformed-record'
    | 'malformed-result'
    | 'surface-error'

export interface MemoryScopeFuzzRecord {
  id: string
  cardId: string
  userId: string
  sourceId: string
}

export interface MemoryScopeFuzzQuery {
  caseId: string
  cardId: string
  userId: string
  sourceId: string
}

export interface MemoryScopeFuzzSurfaceViewInput {
  query: MemoryScopeFuzzQuery
  records: readonly MemoryScopeFuzzRecord[]
}

export type MemoryScopeFuzzSurfaceView = (
  input: MemoryScopeFuzzSurfaceViewInput,
) => Promise<readonly MemoryScopeFuzzRecord[]> | readonly MemoryScopeFuzzRecord[]

export type MemoryScopeFuzzSurfaceViews = {
  [Surface in MemoryScopeFuzzSurface]: MemoryScopeFuzzSurfaceView
}

export interface MemoryScopeFuzzViolation {
  id: string
  caseId: string
  surface: MemoryScopeFuzzSurface
  query: MemoryScopeFuzzQuery
  record: MemoryScopeFuzzRecord | null
  reasons: MemoryScopeFuzzViolationReason[]
  error: string | null
}

export interface MemoryScopeFuzzSurfaceSummary {
  surface: MemoryScopeFuzzSurface
  caseCount: number
  returnedRecordCount: number
  violationCount: number
  crossCardViolationCount: number
  crossUserViolationCount: number
  crossSourceViolationCount: number
  targetMissCount: number
  malformedRecordCount: number
  errorCount: number
  passed: boolean
}

export interface MemoryScopeFuzzReport {
  version: 'memory-scope-fuzz-harness-v1'
  seed: string
  normalizedSeed: number
  caseCount: number
  passed: boolean
  surfaceSummaries: MemoryScopeFuzzSurfaceSummary[]
  violations: MemoryScopeFuzzViolation[]
  recommendedActions: string[]
}

interface MemoryScopeFuzzCase {
  query: MemoryScopeFuzzQuery
  records: MemoryScopeFuzzRecord[]
}

function canonicalSeed(seed: string | number) {
  if (typeof seed === 'number' && Number.isFinite(seed))
    return String(seed)
  return String(seed ?? '').trim() || '0'
}

function hashSeed(seed: string) {
  let hash = 0x811C9DC5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

function randomToken(random: () => number) {
  return Math.floor(random() * 0x1_0000_0000)
    .toString(36)
    .padStart(7, '0')
}

function shuffleRecords(records: MemoryScopeFuzzRecord[], random: () => number) {
  const shuffled = records.map(record => ({ ...record }))
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]!
    shuffled[index] = shuffled[swapIndex]!
    shuffled[swapIndex] = current
  }
  return shuffled
}

function buildFuzzCases(input: {
  caseCount: number
  random: () => number
  cardId?: string
  userId?: string
}): MemoryScopeFuzzCase[] {
  return Array.from({ length: input.caseCount }, (_item, index) => {
    const caseIndex = String(index + 1).padStart(4, '0')
    const caseId = `scope-case-${caseIndex}-${randomToken(input.random)}`
    const cardId = input.cardId ?? `card-target-${randomToken(input.random)}`
    const foreignCardId = `card-foreign-${randomToken(input.random)}`
    const userId = input.userId ?? `user-target-${randomToken(input.random)}`
    const foreignUserId = `user-foreign-${randomToken(input.random)}`
    const sourceId = `source-target-${randomToken(input.random)}`
    const foreignSourceId = `source-foreign-${randomToken(input.random)}`
    const query = {
      caseId,
      cardId,
      userId,
      sourceId,
    } satisfies MemoryScopeFuzzQuery
    const records = shuffleRecords([
      {
        id: `${caseId}:target`,
        cardId,
        userId,
        sourceId,
      },
      {
        id: `${caseId}:foreign-card`,
        cardId: foreignCardId,
        userId,
        sourceId,
      },
      {
        id: `${caseId}:foreign-user`,
        cardId,
        userId: foreignUserId,
        sourceId,
      },
      {
        id: `${caseId}:foreign-card-user`,
        cardId: foreignCardId,
        userId: foreignUserId,
        sourceId,
      },
      {
        id: `${caseId}:foreign-source`,
        cardId,
        userId,
        sourceId: foreignSourceId,
      },
    ], input.random)
    return { query, records }
  })
}

function cloneQuery(query: MemoryScopeFuzzQuery): MemoryScopeFuzzQuery {
  return { ...query }
}

function cloneRecord(record: MemoryScopeFuzzRecord): MemoryScopeFuzzRecord {
  return { ...record }
}

function isMemoryScopeFuzzRecord(value: unknown): value is MemoryScopeFuzzRecord {
  if (!value || typeof value !== 'object')
    return false
  const record = value as Partial<MemoryScopeFuzzRecord>
  return typeof record.id === 'string'
    && typeof record.cardId === 'string'
    && typeof record.userId === 'string'
    && typeof record.sourceId === 'string'
}

function buildViolation(input: {
  surface: MemoryScopeFuzzSurface
  query: MemoryScopeFuzzQuery
  record: MemoryScopeFuzzRecord | null
  reasons: MemoryScopeFuzzViolationReason[]
  error?: string | null
  ordinal: number
}): MemoryScopeFuzzViolation {
  return {
    id: `${input.surface}:${input.query.caseId}:${input.ordinal}`,
    caseId: input.query.caseId,
    surface: input.surface,
    query: cloneQuery(input.query),
    record: input.record ? cloneRecord(input.record) : null,
    reasons: [...input.reasons],
    error: input.error ?? null,
  }
}

function summarizeSurface(input: {
  surface: MemoryScopeFuzzSurface
  caseCount: number
  returnedRecordCount: number
  violations: MemoryScopeFuzzViolation[]
}): MemoryScopeFuzzSurfaceSummary {
  const violations = input.violations
  return {
    surface: input.surface,
    caseCount: input.caseCount,
    returnedRecordCount: input.returnedRecordCount,
    violationCount: violations.length,
    crossCardViolationCount: violations.filter(violation => violation.reasons.includes('cross-card')).length,
    crossUserViolationCount: violations.filter(violation => violation.reasons.includes('cross-user')).length,
    crossSourceViolationCount: violations.filter(violation => violation.reasons.includes('cross-source')).length,
    targetMissCount: violations.filter(violation => violation.reasons.includes('target-miss')).length,
    malformedRecordCount: violations.filter(violation => violation.reasons.includes('malformed-record')).length,
    errorCount: violations.filter(violation =>
      violation.reasons.includes('surface-error')
      || violation.reasons.includes('malformed-result'),
    ).length,
    passed: violations.length === 0,
  }
}

function buildRecommendedActions(violations: MemoryScopeFuzzViolation[]) {
  const actions: string[] = []
  if (violations.some(violation => violation.reasons.includes('cross-card'))) {
    actions.push(
      '为发生泄漏的 memory owner 查询、唯一键和删除路径绑定 cardId，并补充同 sourceId 跨 card 隔离测试。',
    )
  }
  if (violations.some(violation => violation.reasons.includes('cross-user'))) {
    actions.push(
      '为发生泄漏的存储视图绑定 userId 或等价用户 namespace，禁止仅凭 cardId 或 sourceId 返回记录。',
    )
  }
  if (violations.some(violation => violation.reasons.includes('cross-source'))) {
    actions.push(
      '为发生泄漏的存储视图补齐 sourceId/source 过滤，避免同 card/user 下的旧来源或外部来源被当作目标记忆。',
    )
  }
  if (violations.some(violation => violation.reasons.includes('target-miss'))) {
    actions.push(
      '修复过度过滤或断开的 scope adapter：目标 card/user/sourceId 记录必须能被召回，否则不能把隔离视为通过。',
    )
  }
  if (violations.some(violation =>
    violation.reasons.includes('surface-error')
    || violation.reasons.includes('malformed-result')
    || violation.reasons.includes('malformed-record'),
  )) {
    actions.push(
      '修复失败或返回非法记录的 scope adapter，并保留明确错误，不能把该 surface 计为通过。',
    )
  }
  return actions
}

export async function runMemoryScopeFuzzHarness(input: {
  seed: string | number
  caseCount?: number
  cardId?: string
  userId?: string
  views: MemoryScopeFuzzSurfaceViews
}): Promise<MemoryScopeFuzzReport> {
  const seed = canonicalSeed(input.seed)
  const normalizedSeed = hashSeed(seed)
  const caseCount = Math.max(1, Math.min(10_000, Math.floor(Number(input.caseCount ?? 100) || 1)))
  const cases = buildFuzzCases({
    caseCount,
    random: createSeededRandom(normalizedSeed),
    cardId: typeof input.cardId === 'string' && input.cardId.trim() ? input.cardId.trim() : undefined,
    userId: typeof input.userId === 'string' && input.userId.trim() ? input.userId.trim() : undefined,
  })
  const violations: MemoryScopeFuzzViolation[] = []
  const surfaceSummaries: MemoryScopeFuzzSurfaceSummary[] = []

  for (const surface of MEMORY_SCOPE_FUZZ_SURFACES) {
    const surfaceViolations: MemoryScopeFuzzViolation[] = []
    let returnedRecordCount = 0

    for (const fuzzCase of cases) {
      const query = cloneQuery(fuzzCase.query)
      try {
        const returned = await input.views[surface]({
          query: cloneQuery(query),
          records: fuzzCase.records.map(cloneRecord),
        })
        if (!Array.isArray(returned)) {
          surfaceViolations.push(buildViolation({
            surface,
            query,
            record: null,
            reasons: ['malformed-result'],
            error: 'scope view did not return an array',
            ordinal: surfaceViolations.length + 1,
          }))
          continue
        }

        returnedRecordCount += returned.length
        const returnedTarget = returned.some(value =>
          isMemoryScopeFuzzRecord(value)
          && value.cardId === query.cardId
          && value.userId === query.userId
          && value.sourceId === query.sourceId,
        )
        if (!returnedTarget) {
          surfaceViolations.push(buildViolation({
            surface,
            query,
            record: null,
            reasons: ['target-miss'],
            error: 'scope view did not return the target card/user/sourceId record',
            ordinal: surfaceViolations.length + 1,
          }))
        }
        for (const value of returned) {
          if (!isMemoryScopeFuzzRecord(value)) {
            surfaceViolations.push(buildViolation({
              surface,
              query,
              record: null,
              reasons: ['malformed-record'],
              error: 'scope view returned a record without string id/cardId/userId/sourceId',
              ordinal: surfaceViolations.length + 1,
            }))
            continue
          }

          const reasons: MemoryScopeFuzzViolationReason[] = []
          if (value.cardId !== query.cardId)
            reasons.push('cross-card')
          if (value.userId !== query.userId)
            reasons.push('cross-user')
          if (value.sourceId !== query.sourceId)
            reasons.push('cross-source')
          if (reasons.length === 0)
            continue
          surfaceViolations.push(buildViolation({
            surface,
            query,
            record: value,
            reasons,
            ordinal: surfaceViolations.length + 1,
          }))
        }
      }
      catch (error) {
        surfaceViolations.push(buildViolation({
          surface,
          query,
          record: null,
          reasons: ['surface-error'],
          error: errorMessageFrom(error) ?? String(error),
          ordinal: surfaceViolations.length + 1,
        }))
      }
    }

    violations.push(...surfaceViolations)
    surfaceSummaries.push(summarizeSurface({
      surface,
      caseCount,
      returnedRecordCount,
      violations: surfaceViolations,
    }))
  }

  return {
    version: 'memory-scope-fuzz-harness-v1',
    seed,
    normalizedSeed,
    caseCount,
    passed: violations.length === 0,
    surfaceSummaries,
    violations,
    recommendedActions: buildRecommendedActions(violations),
  }
}

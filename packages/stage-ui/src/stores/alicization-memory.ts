import type {
  AlicizationMemoryFactInput,
  AlicizationMemoryStats,
  AlicizationMemoryArchiveRecord as BridgeAlicizationMemoryArchiveRecord,
  AlicizationMemoryFact as BridgeAlicizationMemoryFact,
  AlicizationMemorySource as BridgeAlicizationMemorySource,
  AlicizationMemoryUpsertTrace as BridgeAlicizationMemoryUpsertTrace,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { mapAlicizationMemorySourceToProvenance } from '@proj-alicization/stage-shared'

import { storage } from '../database/storage'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

const memoryFactsKey = 'local:alicization/memory/facts:v1'
const memoryArchiveKey = 'local:alicization/memory/archive:v1'
const memoryMetaKey = 'local:alicization/memory/meta:v1'
const memoryPendingRuntimeWritesKey = 'local:alicization/memory/pending-runtime-writes:v1'

const dayMs = 24 * 60 * 60 * 1000
const memoryColdTierThreshold = 0.72
const memoryColdTierAccessWindowDays = 14
const memoryHotTierFreshDays = 2
const runtimeWriteRetryCooldownMs = 15_000

let migrationAttempted = false
let runtimeWriteBlocked = false
let runtimeWriteBlockLogged = false
let runtimeWriteRetryAt = 0

export type AlicizationMemorySource = BridgeAlicizationMemorySource
export type AlicizationMemoryFact = BridgeAlicizationMemoryFact
export type AlicizationMemoryArchiveRecord = BridgeAlicizationMemoryArchiveRecord
export type AlicizationMemoryUpsertTrace = BridgeAlicizationMemoryUpsertTrace

interface AlicizationMemoryUpsertOptions {
  trace?: AlicizationMemoryUpsertTrace | null
}

interface AlicizationMemoryMeta {
  lastPrunedAt: number | null
}

interface AlicizationPendingRuntimeMemoryWrite {
  id: string
  facts: AlicizationMemoryFactInput[]
  source: AlicizationMemorySource
  trace: AlicizationMemoryUpsertTrace | null
  enqueuedAt: number
  attempts: number
  nextRetryAt: number
}

export interface AlicizationMemoryExtractInput {
  userText: string
  replyText?: string
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function now() {
  return Date.now()
}

const mapMemorySourceToProvenance = mapAlicizationMemorySourceToProvenance

function buildDedupeKey(subject: string, predicate: string, object: string) {
  return `${subject.trim().toLowerCase()}|${predicate.trim().toLowerCase()}|${object.trim().toLowerCase()}`
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function scoreFact(queryTokens: Set<string>, fact: AlicizationMemoryFact, currentTs: number) {
  const factTokens = tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (factTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of factTokens) {
    if (queryTokens.has(token))
      overlap += 1
  }

  const lexicalScore = overlap / factTokens.size
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const vagueQuery = queryTokens.size <= 3
  const coldTier = isMemoryColdTierFact(fact, currentTs)
  const longTailEligible = coldTier || (ageDays >= 45 && fact.confidence >= 0.72)
  const longTailFloor = longTailEligible && (lexicalScore >= 0.22 || vagueQuery) ? 0.35 : 0
  const decay = Math.max(Math.exp(-ageDays / 14), longTailFloor)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)
  const coldReachabilityBoost = longTailEligible && vagueQuery
    ? Math.min(0.08, fact.confidence * 0.08)
    : 0

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay + coldReachabilityBoost
}

function computePruneScore(fact: AlicizationMemoryFact, currentTs: number) {
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

function isMemoryColdTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : (currentTs - fact.lastAccessAt) / dayMs
  return computePruneScore(fact, currentTs) >= memoryColdTierThreshold
    && daysSinceAccess >= memoryColdTierAccessWindowDays
}

function isMemoryHotTierFact(fact: AlicizationMemoryFact, currentTs: number) {
  const daysSinceUpdate = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const daysSinceAccess = fact.lastAccessAt == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (currentTs - fact.lastAccessAt) / dayMs)
  return daysSinceUpdate <= memoryHotTierFreshDays
    || daysSinceAccess <= memoryHotTierFreshDays
    || fact.accessCount >= 4
}

function deriveMemoryTierCounts(facts: AlicizationMemoryFact[], currentTs: number) {
  let hot = 0
  let warm = 0
  let cold = 0
  for (const fact of facts) {
    if (isMemoryColdTierFact(fact, currentTs)) {
      cold += 1
      continue
    }
    if (isMemoryHotTierFact(fact, currentTs)) {
      hot += 1
      continue
    }
    warm += 1
  }
  return { hot, warm, cold }
}

function deriveMemoryIntegrity(facts: AlicizationMemoryFact[], pendingSyncCount: number) {
  const issues: string[] = []
  const dedupeKeys = new Set<string>()
  for (const fact of facts) {
    if (!fact.subject.trim() || !fact.predicate.trim() || !fact.object.trim())
      issues.push(`malformed-fact:${fact.id}`)
    const dedupeKey = fact.dedupeKey?.trim()
    if (dedupeKey) {
      if (dedupeKeys.has(dedupeKey))
        issues.push(`duplicate-dedupe:${dedupeKey}`)
      dedupeKeys.add(dedupeKey)
    }
    if (isMemoryColdTierFact(fact, now()) && tokenize(`${fact.subject} ${fact.predicate} ${fact.object}`).size === 0)
      issues.push(`cold-unsearchable:${fact.id}`)
  }
  if (pendingSyncCount > 0)
    issues.push(`pending-runtime-sync:${pendingSyncCount}`)

  return {
    status: issues.length > 0 ? 'degraded' as const : 'ok' as const,
    issues,
  }
}

async function getFacts() {
  return await storage.getItemRaw<AlicizationMemoryFact[]>(memoryFactsKey) ?? []
}

async function saveFacts(facts: AlicizationMemoryFact[]) {
  await storage.setItemRaw(memoryFactsKey, facts)
}

async function getArchive() {
  return await storage.getItemRaw<AlicizationMemoryArchiveRecord[]>(memoryArchiveKey) ?? []
}

async function saveArchive(records: AlicizationMemoryArchiveRecord[]) {
  await storage.setItemRaw(memoryArchiveKey, records)
}

async function getMeta() {
  return await storage.getItemRaw<AlicizationMemoryMeta>(memoryMetaKey) ?? { lastPrunedAt: null }
}

async function saveMeta(meta: AlicizationMemoryMeta) {
  await storage.setItemRaw(memoryMetaKey, meta)
}

async function getPendingRuntimeWrites() {
  return await storage.getItemRaw<AlicizationPendingRuntimeMemoryWrite[]>(memoryPendingRuntimeWritesKey) ?? []
}

async function savePendingRuntimeWrites(entries: AlicizationPendingRuntimeMemoryWrite[]) {
  await storage.setItemRaw(memoryPendingRuntimeWritesKey, entries)
}

function mergeArchivedFactsIntoFacts(
  facts: AlicizationMemoryFact[],
  archive: AlicizationMemoryArchiveRecord[],
) {
  if (archive.length === 0)
    return { facts, mergedArchiveCount: 0 }

  const next = [...facts]
  let mergedArchiveCount = 0

  for (const item of archive) {
    const subject = item.subject.trim()
    const predicate = item.predicate.trim()
    const object = item.object.trim()
    if (!subject || !predicate || !object)
      continue

    const dedupeKey = item.dedupeKey?.trim() || buildDedupeKey(subject, predicate, object)
    const existingIndex = next.findIndex(fact => fact.dedupeKey === dedupeKey)
    const nextLastAccessAt = [item.lastAccessAt, existingIndex >= 0 ? next[existingIndex].lastAccessAt : null]
      .filter(value => typeof value === 'number')
      .sort((left, right) => Number(right) - Number(left))[0] ?? null

    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      next[existingIndex] = {
        ...existing,
        confidence: clamp01(Math.max(existing.confidence, item.confidence)),
        source: item.source,
        createdAt: Math.min(existing.createdAt, item.createdAt),
        updatedAt: Math.max(existing.updatedAt, item.updatedAt),
        lastAccessAt: nextLastAccessAt,
        accessCount: Math.max(existing.accessCount, item.accessCount),
        provenance: existing.provenance ?? item.provenance ?? mapMemorySourceToProvenance(item.source),
      }
    }
    else {
      next.push({
        id: item.id,
        subject,
        predicate,
        object,
        confidence: clamp01(item.confidence),
        source: item.source,
        dedupeKey,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastAccessAt: nextLastAccessAt,
        accessCount: Math.max(0, item.accessCount),
        provenance: item.provenance ?? mapMemorySourceToProvenance(item.source),
      })
    }

    mergedArchiveCount += 1
  }

  return {
    facts: next,
    mergedArchiveCount,
  }
}

async function normalizeLocalArchiveIntoFacts() {
  const [facts, archive] = await Promise.all([
    getFacts(),
    getArchive(),
  ])
  const merged = mergeArchivedFactsIntoFacts(facts, archive)
  if (merged.mergedArchiveCount > 0) {
    await Promise.all([
      saveFacts(merged.facts),
      saveArchive([]),
    ])
  }
  return merged.facts
}

async function appendAuditLog(payload: {
  level: 'info' | 'notice' | 'warning' | 'critical'
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}) {
  if (!hasAlicizationBridge())
    return

  await getAlicizationBridge().appendAuditLog({
    level: payload.level,
    category: payload.category,
    action: payload.action,
    message: payload.message,
    payload: payload.details,
  }).catch(() => {})
}

function shouldUseRuntimeMemoryBackend() {
  return hasAlicizationBridge() && (!runtimeWriteBlocked || now() >= runtimeWriteRetryAt)
}

function toFactInput(facts: Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object' | 'confidence'>>): AlicizationMemoryFactInput[] {
  return facts
    .map(fact => ({
      subject: fact.subject.trim(),
      predicate: fact.predicate.trim(),
      object: fact.object.trim(),
      confidence: clamp01(fact.confidence),
    }))
    .filter(item => item.subject && item.predicate && item.object)
}

async function markRuntimeWriteBlocked(reason: string, details?: Record<string, unknown>) {
  runtimeWriteBlocked = true
  runtimeWriteRetryAt = now() + runtimeWriteRetryCooldownMs
  if (runtimeWriteBlockLogged)
    return

  runtimeWriteBlockLogged = true
  await appendAuditLog({
    level: 'warning',
    category: 'memory',
    action: 'write-blocked',
    message: reason,
    details,
  })
}

function clearRuntimeWriteBlocked() {
  runtimeWriteBlocked = false
  runtimeWriteRetryAt = 0
  runtimeWriteBlockLogged = false
}

async function buildLocalWriteHealth() {
  const entries = await getPendingRuntimeWrites()
  const currentTs = now()
  const oldestEntryTs = entries.length > 0
    ? Math.min(...entries.map(entry => entry.enqueuedAt))
    : null
  const nextRetryAt = entries.length > 0
    ? entries
      .map(entry => entry.nextRetryAt)
      .filter(value => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right)[0] ?? null
    : null

  return {
    backlogCount: entries.length,
    retryOldestAgeMs: oldestEntryTs == null ? null : Math.max(0, currentTs - oldestEntryTs),
    nextRetryAt: nextRetryAt ?? (runtimeWriteBlocked && runtimeWriteRetryAt > 0 ? runtimeWriteRetryAt : null),
    blocked: runtimeWriteBlocked,
    lastError: null,
  }
}

function buildDefaultRetrievalHealth() {
  return {
    semanticLatencyMs: null,
    graphLatencyMs: null,
    reconstructionFrequency: 0,
    reconstructedCount: 0,
    templateLeakageFailCount: 0,
  }
}

async function enqueuePendingRuntimeWrite(input: {
  facts: AlicizationMemoryFactInput[]
  source: AlicizationMemorySource
  trace?: AlicizationMemoryUpsertTrace | null
}) {
  if (!hasAlicizationBridge())
    return

  const normalizedFacts = toFactInput(input.facts)
  if (normalizedFacts.length === 0)
    return

  const entries = await getPendingRuntimeWrites()
  entries.push({
    id: `${now()}-${Math.random().toString(36).slice(2, 10)}`,
    facts: normalizedFacts,
    source: input.source,
    trace: input.trace ?? null,
    enqueuedAt: now(),
    attempts: 0,
    nextRetryAt: 0,
  })
  await savePendingRuntimeWrites(entries)
}

async function flushPendingRuntimeWrites() {
  if (!hasAlicizationBridge() || !shouldUseRuntimeMemoryBackend()) {
    return {
      flushed: 0,
      pending: (await getPendingRuntimeWrites()).length,
    }
  }

  const bridge = getAlicizationBridge()
  const entries = await getPendingRuntimeWrites()
  if (entries.length === 0) {
    clearRuntimeWriteBlocked()
    return { flushed: 0, pending: 0 }
  }

  const currentTs = now()
  const keep: AlicizationPendingRuntimeMemoryWrite[] = []
  let flushed = 0
  for (const entry of entries) {
    if (entry.nextRetryAt > currentTs) {
      keep.push(entry)
      continue
    }

    try {
      await bridge.upsertMemoryFacts({
        facts: entry.facts,
        source: entry.source,
        trace: entry.trace,
      })
      flushed += 1
    }
    catch (error) {
      await markRuntimeWriteBlocked('Runtime memory flush failed; keeping writes queued locally.', {
        reason: errorMessageFrom(error) ?? 'unknown-error',
        queueEntryId: entry.id,
      })
      keep.push({
        ...entry,
        attempts: entry.attempts + 1,
        nextRetryAt: currentTs + runtimeWriteRetryCooldownMs * Math.max(1, entry.attempts + 1),
      })
      await savePendingRuntimeWrites(keep.concat(entries.slice(entries.indexOf(entry) + 1)))
      return { flushed, pending: keep.length + (entries.length - entries.indexOf(entry) - 1) }
    }
  }

  await savePendingRuntimeWrites(keep)
  clearRuntimeWriteBlocked()
  return {
    flushed,
    pending: keep.length,
  }
}

export async function ensureRuntimeMemoryMigration() {
  if (!hasAlicizationBridge() || migrationAttempted)
    return

  migrationAttempted = true

  const [facts, archive, meta] = await Promise.all([
    getFacts(),
    getArchive(),
    getMeta(),
  ])
  const merged = mergeArchivedFactsIntoFacts(facts, archive)
  if (merged.mergedArchiveCount > 0) {
    await Promise.all([
      saveFacts(merged.facts),
      saveArchive([]),
    ])
  }

  try {
    await getAlicizationBridge().importLegacyMemory({
      facts: merged.facts,
      archive: [],
      lastPrunedAt: meta.lastPrunedAt ?? null,
    })
    clearRuntimeWriteBlocked()
  }
  catch (error) {
    await markRuntimeWriteBlocked('Legacy memory migration failed; local queue mode enabled.', {
      reason: errorMessageFrom(error) ?? 'unknown-error',
    })
  }
}

export function extractRuleFacts(input: AlicizationMemoryExtractInput): Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object' | 'confidence'>> {
  const text = input.userText.trim()
  if (!text)
    return []

  const results: Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object' | 'confidence'>> = []

  const likes = /我很?喜欢(.{1,24})/.exec(text)
  if (likes?.[1]) {
    results.push({
      subject: 'user',
      predicate: 'likes',
      object: likes[1].trim(),
      confidence: 0.74,
    })
  }

  const dislikes = /我很?不喜欢(.{1,24})/.exec(text)
  if (dislikes?.[1]) {
    results.push({
      subject: 'user',
      predicate: 'dislikes',
      object: dislikes[1].trim(),
      confidence: 0.8,
    })
  }

  const plans = /(?:明天|下周|周五|今天)\s*(?:(?:要|得|需要)\s*)?(.{1,32})/.exec(text)
  if (plans?.[1]) {
    results.push({
      subject: 'user',
      predicate: 'plan',
      object: plans[1].trim(),
      confidence: 0.66,
    })
  }

  return results
}

export async function upsertFacts(
  facts: Array<Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object' | 'confidence'>>,
  source: AlicizationMemorySource,
  options?: AlicizationMemoryUpsertOptions,
) {
  if (facts.length === 0)
    return

  await ensureRuntimeMemoryMigration()
  const normalized = toFactInput(facts)
  if (normalized.length === 0)
    return
  let queuedToRuntimeFallback = false

  if (shouldUseRuntimeMemoryBackend()) {
    await flushPendingRuntimeWrites()

    await getAlicizationBridge().upsertMemoryFacts({
      facts: normalized,
      source,
      trace: options?.trace ?? null,
    }).catch(async (error) => {
      await markRuntimeWriteBlocked('SQLite memory write failed; local queue mode enabled.', {
        reason: errorMessageFrom(error) ?? 'unknown-error',
      })
      await enqueuePendingRuntimeWrite({
        facts: normalized,
        source,
        trace: options?.trace ?? null,
      })
      queuedToRuntimeFallback = true
    })
    if (!runtimeWriteBlocked)
      return
  }

  if (hasAlicizationBridge() && !queuedToRuntimeFallback) {
    await enqueuePendingRuntimeWrite({
      facts: normalized,
      source,
      trace: options?.trace ?? null,
    })
  }

  const current = await getFacts()
  const next = [...current]
  const currentTs = now()

  for (const fact of facts) {
    const dedupeKey = buildDedupeKey(fact.subject, fact.predicate, fact.object)
    const existingIndex = next.findIndex(item => item.dedupeKey === dedupeKey)

    if (existingIndex >= 0) {
      const existing = next[existingIndex]
      next[existingIndex] = {
        ...existing,
        confidence: clamp01(Math.max(existing.confidence, fact.confidence)),
        source,
        updatedAt: currentTs,
      }
      continue
    }

    next.push({
      id: `${currentTs}-${Math.random().toString(36).slice(2, 10)}`,
      subject: fact.subject.trim(),
      predicate: fact.predicate.trim(),
      object: fact.object.trim(),
      confidence: clamp01(fact.confidence),
      source,
      dedupeKey,
      createdAt: currentTs,
      updatedAt: currentTs,
      lastAccessAt: null,
      accessCount: 0,
      provenance: mapMemorySourceToProvenance(source),
    })
  }

  await saveFacts(next)
}

export async function retrieveFacts(query: string, limit = 6) {
  await ensureRuntimeMemoryMigration()

  if (shouldUseRuntimeMemoryBackend()) {
    await flushPendingRuntimeWrites()
    const result = await getAlicizationBridge().retrieveMemoryFacts({ query, limit }).catch(() => null)
    if (result)
      return result
  }

  const facts = await normalizeLocalArchiveIntoFacts()
  if (!query.trim() || facts.length === 0)
    return []

  const currentTs = now()
  const queryTokens = tokenize(query)
  const ranked = facts
    .map(fact => ({ fact, score: scoreFact(queryTokens, fact, currentTs) }))
    .filter(item => item.score > 0.01)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(0, limit))

  if (ranked.length === 0)
    return []

  const rankedMap = new Map(ranked.map(item => [item.fact.id, item.score]))
  const touchedFacts = facts.map((fact) => {
    if (!rankedMap.has(fact.id))
      return fact
    return {
      ...fact,
      accessCount: fact.accessCount + 1,
      lastAccessAt: currentTs,
    }
  })

  await saveFacts(touchedFacts)
  return ranked.map(item => ({
    ...item.fact,
    provenance: item.fact.provenance ?? mapMemorySourceToProvenance(item.fact.source),
  }))
}

export async function runMemoryPrune() {
  await ensureRuntimeMemoryMigration()

  if (shouldUseRuntimeMemoryBackend()) {
    const queueState = await flushPendingRuntimeWrites()
    const stats = await getAlicizationBridge().runMemoryPrune().catch(() => null)
    if (stats) {
      const writeHealth = await buildLocalWriteHealth()
      return {
        ...stats,
        pendingSyncCount: queueState.pending,
        writeHealth: {
          backlogCount: queueState.pending,
          retryOldestAgeMs: writeHealth.retryOldestAgeMs,
          nextRetryAt: writeHealth.nextRetryAt,
          blocked: writeHealth.blocked || stats.writeHealth?.blocked === true,
          lastError: stats.writeHealth?.lastError ?? writeHealth.lastError,
        },
        retrievalHealth: stats.retrievalHealth ?? buildDefaultRetrievalHealth(),
      }
    }
  }

  const currentTs = now()
  const facts = await normalizeLocalArchiveIntoFacts()
  const tierCounts = deriveMemoryTierCounts(facts, currentTs)
  const pending = (await getPendingRuntimeWrites()).length
  const writeHealth = await buildLocalWriteHealth()

  await saveMeta({ lastPrunedAt: currentTs })

  return {
    total: facts.length,
    active: facts.length,
    archived: tierCounts.cold,
    tierCounts,
    pendingSyncCount: pending,
    writeHealth,
    retrievalHealth: buildDefaultRetrievalHealth(),
    integrity: deriveMemoryIntegrity(facts, pending),
    lastPrunedAt: currentTs,
  }
}

export async function getMemoryStats(): Promise<AlicizationMemoryStats> {
  await ensureRuntimeMemoryMigration()

  if (shouldUseRuntimeMemoryBackend()) {
    const queueState = await flushPendingRuntimeWrites()
    const stats = await getAlicizationBridge().getMemoryStats().catch(() => null)
    if (stats) {
      const writeHealth = await buildLocalWriteHealth()
      return {
        ...stats,
        pendingSyncCount: queueState.pending,
        writeHealth: {
          backlogCount: queueState.pending,
          retryOldestAgeMs: writeHealth.retryOldestAgeMs,
          nextRetryAt: writeHealth.nextRetryAt,
          blocked: writeHealth.blocked || stats.writeHealth?.blocked === true,
          lastError: stats.writeHealth?.lastError ?? writeHealth.lastError,
        },
        retrievalHealth: stats.retrievalHealth ?? buildDefaultRetrievalHealth(),
      }
    }
  }

  const [facts, meta] = await Promise.all([
    normalizeLocalArchiveIntoFacts(),
    getMeta(),
  ])
  const currentTs = now()
  const tierCounts = deriveMemoryTierCounts(facts, currentTs)
  const pending = (await getPendingRuntimeWrites()).length
  const writeHealth = await buildLocalWriteHealth()

  return {
    total: facts.length,
    active: facts.length,
    archived: tierCounts.cold,
    tierCounts,
    pendingSyncCount: pending,
    writeHealth,
    retrievalHealth: buildDefaultRetrievalHealth(),
    integrity: deriveMemoryIntegrity(facts, pending),
    lastPrunedAt: meta.lastPrunedAt ?? null,
  }
}

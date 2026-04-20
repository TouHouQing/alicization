import type {
  AlicizationMemoryFactInput,
  AlicizationMemoryStats,
  AlicizationMemoryArchiveRecord as BridgeAlicizationMemoryArchiveRecord,
  AlicizationMemoryFact as BridgeAlicizationMemoryFact,
  AlicizationMemorySource as BridgeAlicizationMemorySource,
  AlicizationMemoryUpsertTrace as BridgeAlicizationMemoryUpsertTrace,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'

import { storage } from '../database/storage'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

const memoryFactsKey = 'local:alicization/memory/facts:v1'
const memoryArchiveKey = 'local:alicization/memory/archive:v1'
const memoryMetaKey = 'local:alicization/memory/meta:v1'

const dayMs = 24 * 60 * 60 * 1000

let migrationAttempted = false
let runtimeWriteBlocked = false
let runtimeWriteBlockLogged = false

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

function mapMemorySourceToProvenance(source: AlicizationMemorySource) {
  return source === 'async-llm' ? 'inferred' : 'remembered'
}

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
  const decay = Math.exp(-ageDays / 14)
  const accessBoost = Math.min(0.2, fact.accessCount / 50)

  return (lexicalScore * 0.5 + fact.confidence * 0.4 + accessBoost * 0.1) * decay
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
  return hasAlicizationBridge() && !runtimeWriteBlocked
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

export async function ensureRuntimeMemoryMigration() {
  if (!hasAlicizationBridge() || migrationAttempted)
    return

  migrationAttempted = true

  const [facts, archive, meta] = await Promise.all([
    getFacts(),
    getArchive(),
    getMeta(),
  ])

  try {
    await getAlicizationBridge().importLegacyMemory({
      facts,
      archive,
      lastPrunedAt: meta.lastPrunedAt ?? null,
    })
  }
  catch (error) {
    await markRuntimeWriteBlocked('Legacy memory migration failed, switched to read-only fallback.', {
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

  if (shouldUseRuntimeMemoryBackend()) {
    const normalized = toFactInput(facts)
    if (normalized.length === 0)
      return

    await getAlicizationBridge().upsertMemoryFacts({
      facts: normalized,
      source,
      trace: options?.trace ?? null,
    }).catch(async (error) => {
      await markRuntimeWriteBlocked('SQLite memory write failed, switched to read-only fallback.', {
        reason: errorMessageFrom(error) ?? 'unknown-error',
      })
    })
    return
  }

  if (runtimeWriteBlocked)
    return

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
    const result = await getAlicizationBridge().retrieveMemoryFacts({ query, limit }).catch(() => null)
    if (result)
      return result
  }

  const facts = await getFacts()
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

function computePruneScore(fact: AlicizationMemoryFact, currentTs: number) {
  const ageDays = Math.max(0, (currentTs - fact.updatedAt) / dayMs)
  const timeDecay = Math.min(1, ageDays / 30)
  const accessFrequencyNorm = Math.min(1, fact.accessCount / 12)
  const confidenceNorm = clamp01(fact.confidence)
  return timeDecay * (1 - accessFrequencyNorm) * (1 - confidenceNorm)
}

export async function runMemoryPrune() {
  await ensureRuntimeMemoryMigration()

  if (shouldUseRuntimeMemoryBackend()) {
    const stats = await getAlicizationBridge().runMemoryPrune().catch(() => null)
    if (stats)
      return stats
  }

  const currentTs = now()
  const thresholdArchive = 0.72
  const thresholdDelete = 0.92
  const maxArchiveRetentionDays = 30

  const facts = await getFacts()
  const archive = await getArchive()

  const keepFacts: AlicizationMemoryFact[] = []
  const archivedFacts: AlicizationMemoryArchiveRecord[] = [...archive]

  for (const fact of facts) {
    const score = computePruneScore(fact, currentTs)
    const daysSinceAccess = fact.lastAccessAt == null ? Number.POSITIVE_INFINITY : (currentTs - fact.lastAccessAt) / dayMs

    if (score >= thresholdDelete && daysSinceAccess >= 30) {
      continue
    }

    if (score >= thresholdArchive && daysSinceAccess >= 14) {
      archivedFacts.push({
        ...fact,
        archivedAt: currentTs,
      })
      continue
    }

    keepFacts.push(fact)
  }

  const filteredArchive = archivedFacts.filter(record => ((currentTs - record.archivedAt) / dayMs) <= maxArchiveRetentionDays)

  await saveFacts(keepFacts)
  await saveArchive(filteredArchive)
  await saveMeta({ lastPrunedAt: currentTs })

  return await getMemoryStats()
}

export async function getMemoryStats(): Promise<AlicizationMemoryStats> {
  await ensureRuntimeMemoryMigration()

  if (shouldUseRuntimeMemoryBackend()) {
    const stats = await getAlicizationBridge().getMemoryStats().catch(() => null)
    if (stats)
      return stats
  }

  const [facts, archive, meta] = await Promise.all([
    getFacts(),
    getArchive(),
    getMeta(),
  ])

  return {
    total: facts.length + archive.length,
    active: facts.length,
    archived: archive.length,
    lastPrunedAt: meta.lastPrunedAt ?? null,
  }
}

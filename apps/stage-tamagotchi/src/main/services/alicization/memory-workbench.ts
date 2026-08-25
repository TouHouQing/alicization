import type {
  AlicizationLongTermMemoryReviewItem,
  AlicizationMemoryWorkbenchHealth,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationWorkingMemoryWorkbenchSnapshot,
} from '../../../shared/eventa'
import type { WorkingMemorySnapshot } from './life-core/working-memory'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { deriveMemoryWorkbenchStatus } from './memory-workbench-health'

function normalizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

const workbenchInternalCuePatterns = [
  /^(?:emotional_tension|reply_motive|relationship|belief-conflict|opening_policy|relationship_cadence|visibility)\s*[:=]/iu,
  /\bvisibility\s*=\s*redacted_internal\b/iu,
  /^请只回复[：:]/u,
  /^你认为你可以用\s*Codex\s*做什么[？?]/iu,
  /^你好，这是一次本地对话闭环验收/u,
] as const

function isWorkbenchInternalCue(raw: string) {
  return workbenchInternalCuePatterns.some(pattern => pattern.test(raw))
}

function normalizeVisibleMemoryText(raw: unknown, maxChars = 320) {
  const normalized = normalizeText(raw, maxChars)
  if (!normalized || isWorkbenchInternalCue(normalized))
    return ''
  return sanitizeAlicizationProviderFacingText(normalized, maxChars)
}

function isWorkbenchInternalMarker(text: string) {
  return /^(?:pre_turn|internal|reply|opening|relationship|project|runtime)_\w+$/iu.test(text)
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 12, maxChars = 240) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeVisibleMemoryText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function projectWorkingMemoryForWorkbench(snapshot: WorkingMemorySnapshot): AlicizationWorkingMemoryWorkbenchSnapshot {
  const longTermQueue = snapshot.longTermCandidates.map((candidate, index) => {
    const summary = normalizeVisibleMemoryText(candidate.summary, 260)
    const containsInternalMarker = isWorkbenchInternalMarker(summary)
    return {
      id: `${snapshot.cardId}:${snapshot.sessionId}:candidate:${index}`,
      kind: candidate.kind,
      summary: containsInternalMarker ? '' : summary,
      reason: containsInternalMarker ? '' : normalizeVisibleMemoryText(candidate.reason, 240),
      salience: candidate.salience,
      sensitivity: candidate.sensitivity,
      confidence: candidate.confidence,
      allowTraining: candidate.allowTraining,
    }
  })

  return {
    cardId: snapshot.cardId,
    sessionId: snapshot.sessionId,
    updatedAt: snapshot.updatedAt,
    threadTitle: normalizeVisibleMemoryText(snapshot.currentThread?.title, 180) || null,
    threadMode: normalizeText(snapshot.currentThread?.mode, 80) || null,
    currentUserMove: normalizeVisibleMemoryText(snapshot.currentThread?.currentUserMove, 240) || null,
    activeTask: normalizeVisibleMemoryText(snapshot.activeTask?.summary, 240) || null,
    taskStatus: normalizeText(snapshot.activeTask?.status, 80) || null,
    unresolvedQuestions: uniqueTexts(snapshot.unresolvedQuestions.map(item => item.text), 12, 240),
    commitments: uniqueTexts(snapshot.commitments.map(item => item.text), 12, 240),
    userCorrections: uniqueTexts(snapshot.userCorrections.map(item => item.text), 12, 240),
    relationshipPosture: normalizeVisibleMemoryText(snapshot.relationshipPosture?.summary, 240) || null,
    emotionalPosture: normalizeVisibleMemoryText(snapshot.emotionalPosture?.summary, 240) || null,
    queryHints: uniqueTexts(snapshot.memoryQueryHints, 12, 160),
    longTermQueue,
    failureTurnIds: uniqueTexts(snapshot.audit.failureTurnIds, 20, 120),
  }
}

export interface BuildMemoryWorkbenchSnapshotInput {
  cardId: string
  sessionId: string | null
  now: () => number
  getWorkingMemory: () => WorkingMemorySnapshot | null | Promise<WorkingMemorySnapshot | null>
  listLongTermItems: () => Promise<AlicizationMemoryWorkbenchItem[]>
  listReviewItems: () => Promise<AlicizationLongTermMemoryReviewItem[]>
  getQueueHealth: () => Promise<AlicizationMemoryWorkbenchHealth['queue']>
  getRecallHealth: () => Promise<AlicizationMemoryWorkbenchHealth['recall']>
  getEmbeddingHealth: () => Promise<AlicizationMemoryWorkbenchHealth['embedding']>
}

export async function buildMemoryWorkbenchSnapshot(input: BuildMemoryWorkbenchSnapshotInput): Promise<AlicizationMemoryWorkbenchSnapshot> {
  const errors: string[] = []
  const workingMemory = await Promise.resolve(input.getWorkingMemory()).catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return null
  })
  const longTermItems = await input.listLongTermItems().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return [] as AlicizationMemoryWorkbenchItem[]
  })
  const reviewItems = await input.listReviewItems().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return [] as AlicizationLongTermMemoryReviewItem[]
  })
  const queue = await input.getQueueHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return { pending: 0, review: 0, applied: 0, failed: 0, deadLettered: 0 }
  })
  const recall = await input.getRecallHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return { lastLatencyMs: null, p95LatencyMs: null, lastError: null }
  })
  const embedding = await input.getEmbeddingHealth().catch((error: unknown) => {
    errors.push(error instanceof Error ? error.message : String(error))
    return {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      vectorSpaceId: null,
      reindexRequired: false,
      indexMode: 'brute-force' as const,
      approximate: false,
      degraded: true,
      nativeIndexReady: false,
      searchReady: false,
      lastError: error instanceof Error ? error.message : String(error),
      canonicalCount: 0,
      indexedCount: 0,
      missingCount: 0,
      textHashMismatchCount: 0,
      staleOrFailedCount: 0,
      orphanedCount: 0,
      coverageRatio: null,
      reindexJob: null,
    }
  })
  const byKind: AlicizationMemoryWorkbenchSnapshot['longTerm']['byKind'] = {}
  for (const item of longTermItems)
    byKind[item.kind] = (byKind[item.kind] ?? 0) + 1

  return {
    cardId: input.cardId,
    sessionId: input.sessionId,
    updatedAt: input.now(),
    workingMemory: workingMemory ? projectWorkingMemoryForWorkbench(workingMemory) : null,
    longTerm: {
      total: longTermItems.length,
      byKind,
      items: longTermItems,
    },
    review: {
      pending: reviewItems.length,
      items: reviewItems,
    },
    health: {
      status: deriveMemoryWorkbenchStatus({
        errors,
        queueFailed: queue.failed + queue.deadLettered,
        embeddingConfigured: embedding.providerConfigured,
        embeddingDegraded: embedding.degraded,
      }),
      queue,
      recall,
      embedding,
      errors,
    },
  }
}

import type {
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'

import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import {
  deriveAlicizationRecallLatencyPolicy,
} from '@proj-alicization/stage-shared'
import type {
  AlicizationRecallLatencyPolicyInput,
} from '@proj-alicization/stage-shared'

export type AlicizationMemoryAccessibilityLayer = 'raw-ledger' | 'summary-layer' | 'hot-index'
export type AlicizationMemoryExpansionMode = 'summary-first' | 'balanced' | 'deep-thread'
export type AlicizationMemoryLatencyClass = 'fast' | 'balanced' | 'deep'

export interface AlicizationMemoryAccessibilityPlan {
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  latencyClass: AlicizationMemoryLatencyClass
  expansionMode: AlicizationMemoryExpansionMode
  preferredLayers: AlicizationMemoryAccessibilityLayer[]
  episodicLimit: number
  consolidationLimit: number
  conversationLimit: number
  graphExpansionLimit: number
  benchmarkSampleLimit: number
  cacheTtlMs: number
  prewarmKey: string | null
  recallLatencyPolicy: ReturnType<typeof deriveAlicizationRecallLatencyPolicy>
}

function normalizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, 120)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function buildAlicizationMemoryAccessibilityPlan(input: {
  recallSeed: string
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  budgetClass?: AlicizationMemoryRetrievalBudgetClass
  latencyPolicy?: Partial<AlicizationRecallLatencyPolicyInput>
}) {
  const seed = normalizeText(input.recallSeed, 240).toLowerCase()
  const governor = input.recallGovernor ?? null
  const temporalFocus = governor?.recollectionIntent?.temporalFocus ?? null
  const mode = governor?.recollectionIntent?.mode ?? null
  const highAffinityThread = (governor?.threadAnchors?.length ?? 0) > 0
  const relationshipCarry = (governor?.relationshipAnchors?.length ?? 0) > 0
  const affectCarry = (governor?.affectAnchors?.length ?? 0) > 0
  const longHorizon = temporalFocus === 'cross-session' || temporalFocus === 'distant'
  const taskMigrationLike = /继续|接回去|旧方法|之前那样|migration|callback|回调|repair|修复/u.test(seed)
  const deepThread = longHorizon || taskMigrationLike || temporalFocus === 'experience-matched'
  const fastDialogue = !deepThread && (mode === 'relationship-history' || mode === 'conversation-history')

  const recallLatencyPolicy = deriveAlicizationRecallLatencyPolicy({
    recallSeed: input.recallSeed,
    recollectionIntent: governor?.recollectionIntent ?? null,
    budgetClass: input.budgetClass ?? null,
    ...input.latencyPolicy,
  })
  const budgetClass = recallLatencyPolicy.budgetClass
  const latencyClass: AlicizationMemoryLatencyClass = recallLatencyPolicy.shouldAvoidDeepExpansion
    ? 'balanced'
    : recallLatencyPolicy.latencyClass === 'deep'
      || (deepThread && recallLatencyPolicy.recallAction === 'deep-recall')
    ? 'deep'
    : recallLatencyPolicy.latencyClass === 'fast' || fastDialogue
      ? 'fast'
      : 'balanced'
  const expansionMode: AlicizationMemoryExpansionMode = recallLatencyPolicy.shouldAvoidDeepExpansion
    ? 'summary-first'
    : deepThread
    ? 'deep-thread'
    : fastDialogue
      ? 'summary-first'
      : 'balanced'
  const prewarmKey = uniqueList([
    recallLatencyPolicy.hotPathKey,
    governor?.threadAnchors?.[0] ?? null,
    governor?.relationshipAnchors?.[0] ?? null,
    governor?.recollectionIntent?.queryHints?.[0] ?? null,
    seed,
    highAffinityThread ? 'thread' : null,
    relationshipCarry ? 'relationship' : null,
    affectCarry ? 'affect' : null,
  ], 6).join('|') || null

  return {
    budgetClass,
    latencyClass,
    expansionMode,
    preferredLayers: expansionMode === 'summary-first'
      ? ['summary-layer', 'hot-index', 'raw-ledger']
      : expansionMode === 'deep-thread'
        ? ['hot-index', 'summary-layer', 'raw-ledger']
        : ['summary-layer', 'raw-ledger', 'hot-index'],
    episodicLimit: latencyClass === 'fast' ? 3 : latencyClass === 'balanced' ? 5 : 8,
    consolidationLimit: latencyClass === 'fast' ? 4 : latencyClass === 'balanced' ? 6 : 10,
    conversationLimit: latencyClass === 'fast' ? 4 : latencyClass === 'balanced' ? 6 : 8,
    graphExpansionLimit: latencyClass === 'fast' ? 120 : latencyClass === 'balanced' ? 240 : 480,
    benchmarkSampleLimit: latencyClass === 'fast' ? 6 : latencyClass === 'balanced' ? 12 : 20,
    cacheTtlMs: latencyClass === 'fast' ? 20_000 : latencyClass === 'balanced' ? 45_000 : 90_000,
    prewarmKey,
    recallLatencyPolicy,
  } satisfies AlicizationMemoryAccessibilityPlan
}

export function buildAlicizationMemoryAccessCacheKey(input: {
  namespace: 'episodic' | 'consolidation' | 'conversation' | 'benchmark'
  recallSeed: string
  plan: AlicizationMemoryAccessibilityPlan
  sessionId?: string | null
  turnId?: string | null
}) {
  return [
    input.namespace,
    input.plan.latencyClass,
    input.plan.expansionMode,
    normalizeText(input.recallSeed, 240).toLowerCase(),
    normalizeText(input.sessionId, 120),
    normalizeText(input.turnId, 120),
  ].join('::')
}

export function tuneMemoryConsolidationSearchInput(input: {
  query: string
  plan: AlicizationMemoryAccessibilityPlan
  recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
}) {
  return {
    query: input.query,
    limit: input.plan.consolidationLimit,
    recollectionIntent: input.recollectionIntent ?? null,
  }
}

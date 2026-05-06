import type {
  AlicizationRecallGovernorSnapshot,
} from '../../../shared/eventa'

import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'
import type { AlicizationOnlineMemoryPolicy } from './memory-policy-governor'
import type { AlicizationMemoryRetrievalTelemetrySnapshot } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import {
  deriveAlicizationRecallLatencyPolicy,
} from '@proj-alicization/stage-shared'
import type {
  AlicizationRecallLatencyPolicyInput,
} from '@proj-alicization/stage-shared'
import { deriveAlicizationOnlineMemoryPolicy } from './memory-policy-governor'

export type AlicizationMemoryAccessibilityLayer = 'raw-ledger' | 'summary-layer' | 'hot-index'
export type AlicizationMemoryExpansionMode = 'summary-first' | 'balanced' | 'deep-thread'
export type AlicizationMemoryLatencyClass = 'fast' | 'balanced' | 'deep'

export interface AlicizationMemoryAccessibilityPlan {
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  latencyClass: AlicizationMemoryLatencyClass
  expansionMode: AlicizationMemoryExpansionMode
  verificationStrictness: 'normal' | 'strict' | 'quarantine'
  wrongThreadSuppressionBias: number
  provenanceLabelingBias: number
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

export interface AlicizationTurnRetrievalPolicySnapshot {
  policy: AlicizationOnlineMemoryPolicy
  plan: AlicizationMemoryAccessibilityPlan
  telemetry: AlicizationMemoryRetrievalTelemetrySnapshot | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
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
  policy?: AlicizationOnlineMemoryPolicy | null
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
    budgetClass: input.policy?.budgetClassOverride ?? input.budgetClass ?? null,
    ...input.latencyPolicy,
  })
  const budgetClass = input.policy?.budgetClassOverride ?? recallLatencyPolicy.budgetClass
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
    verificationStrictness: input.policy?.verificationStrictness ?? 'normal',
    wrongThreadSuppressionBias: input.policy?.wrongThreadSuppressionBias ?? 0,
    provenanceLabelingBias: input.policy?.provenanceLabelingBias ?? 0,
    preferredLayers: expansionMode === 'summary-first'
      ? ['summary-layer', 'hot-index', 'raw-ledger']
      : expansionMode === 'deep-thread'
        ? ['hot-index', 'summary-layer', 'raw-ledger']
        : ['summary-layer', 'raw-ledger', 'hot-index'],
    episodicLimit: Math.max(2, Math.round((latencyClass === 'fast' ? 3 : latencyClass === 'balanced' ? 5 : 8) * (input.policy?.topKMultiplier ?? 1))),
    consolidationLimit: Math.max(3, Math.round((latencyClass === 'fast' ? 4 : latencyClass === 'balanced' ? 6 : 10) * (input.policy?.topKMultiplier ?? 1) * (input.policy?.sourceWeights.consolidation ?? 1))),
    conversationLimit: Math.max(3, Math.round((latencyClass === 'fast' ? 4 : latencyClass === 'balanced' ? 6 : 8) * (input.policy?.topKMultiplier ?? 1) * (input.policy?.sourceWeights.conversation ?? 1))),
    graphExpansionLimit: Math.max(80, Math.round((latencyClass === 'fast' ? 120 : latencyClass === 'balanced' ? 240 : 480) * (input.policy?.topKMultiplier ?? 1))),
    benchmarkSampleLimit: Math.max(4, Math.round((latencyClass === 'fast' ? 6 : latencyClass === 'balanced' ? 12 : 20) * (input.policy?.topKMultiplier ?? 1))),
    cacheTtlMs: Math.max(5_000, Math.round((latencyClass === 'fast' ? 20_000 : latencyClass === 'balanced' ? 45_000 : 90_000) * (input.policy?.cacheTtlMultiplier ?? 1))),
    prewarmKey,
    recallLatencyPolicy,
  } satisfies AlicizationMemoryAccessibilityPlan
}

export function buildAlicizationTurnRetrievalPolicySnapshot(input: {
  recallSeed: string
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  budgetClass?: AlicizationMemoryRetrievalBudgetClass
  telemetry?: AlicizationMemoryRetrievalTelemetrySnapshot | null
  tuningAdvice?: AlicizationMemoryTuningAdvice | null
}) {
  const policy = deriveAlicizationOnlineMemoryPolicy({
    budgetClass: input.budgetClass,
    telemetry: input.telemetry ?? null,
    tuningAdvice: input.tuningAdvice ?? null,
  })
  const plan = buildAlicizationMemoryAccessibilityPlan({
    recallSeed: input.recallSeed,
    recallGovernor: input.recallGovernor ?? null,
    budgetClass: input.budgetClass,
    policy,
  })
  return {
    policy,
    plan,
    telemetry: input.telemetry ?? null,
    tuningAdvice: input.tuningAdvice ?? null,
  } satisfies AlicizationTurnRetrievalPolicySnapshot
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

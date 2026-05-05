import type {
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationRecallLatencyBudgetSnapshot,
  AlicizationRecallLatencyPolicySnapshot,
} from './alicization-transport-contracts'
import type {
  AlicizationMemoryRetrievalBudgetClass,
} from './alicization-memory-stats'

export type AlicizationRecallLatencyClass = 'fast' | 'balanced' | 'deep'
export type AlicizationRecallLatencyAction
  = | 'shallow-answer'
    | 'stable-core-only'
    | 'deep-recall'
    | 'defer-to-followup'
    | 'answer-then-supplement'

export type AlicizationRecallLatencyDomain = 'procedure' | 'relationship' | 'self-model' | 'world-model' | 'general'

export interface AlicizationRecallLatencyPolicyInput {
  recallSeed?: string | null
  recollectionIntent?: AlicizationMemoryRecollectionIntentSnapshot | null
  budgetClass?: AlicizationMemoryRetrievalBudgetClass | null
  wrongThreadRate?: number | null
  recallMissRate?: number | null
  reconstructionErrorRate?: number | null
  memorySurfaceViolationRate?: number | null
  clusterAmbiguous?: boolean | null
  competingVariantCount?: number | null
  contradictionCount?: number | null
  contradictionHeavyFactCount?: number | null
  validationCount?: number | null
  stronglyValidatedProcedureCount?: number | null
  finalSurfacePolicy?: string | null
  shouldRecall?: boolean | null
  stableCoreCount?: number | null
  unsafeDetailCount?: number | null
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 120)
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

function normalizedNumber(raw: unknown) {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function inferDomain(input: AlicizationRecallLatencyPolicyInput): AlicizationRecallLatencyDomain {
  const mode = input.recollectionIntent?.mode ?? 'none'
  if (mode === 'execution-procedure' || mode === 'experience-pattern')
    return 'procedure'
  if (mode === 'relationship-history')
    return 'relationship'
  if (mode === 'autobiographical-history')
    return 'self-model'

  const seed = sanitizeText(input.recallSeed, 240).toLowerCase()
  if (/api|schema|finance|news|weather|world|知识|事实|来源|验证/u.test(seed))
    return 'world-model'
  if (/关系|边界|修复|距离|信任|care|repair|boundary|trust|distance/u.test(seed))
    return 'relationship'
  if (/旧方法|继续|runtime|procedure|步骤|做法|修/u.test(seed))
    return 'procedure'
  if (/自我|习惯|性格|我会|identity|habit|self/u.test(seed))
    return 'self-model'
  return 'general'
}

function budgetForDomain(input: {
  domain: AlicizationRecallLatencyDomain
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  latencyClass: AlicizationRecallLatencyClass
}): AlicizationRecallLatencyBudgetSnapshot {
  const classMultiplier = input.budgetClass === 'deep-recall-reply'
    ? 1.55
    : input.budgetClass === 'nightly-benchmark' || input.budgetClass === 'diagnosis-replay'
      ? 2.2
      : input.budgetClass === 'proactive-generation'
        ? 0.82
        : 1
  const latencyMultiplier = input.latencyClass === 'deep'
    ? 1.35
    : input.latencyClass === 'fast'
      ? 0.68
      : 1
  const base = input.domain === 'procedure'
    ? { budgetMs: 560, candidateLimit: 8, hotCacheTtlMs: 90_000 }
    : input.domain === 'relationship'
      ? { budgetMs: 420, candidateLimit: 6, hotCacheTtlMs: 120_000 }
      : input.domain === 'self-model'
        ? { budgetMs: 460, candidateLimit: 6, hotCacheTtlMs: 120_000 }
        : input.domain === 'world-model'
          ? { budgetMs: 360, candidateLimit: 4, hotCacheTtlMs: 45_000 }
          : { budgetMs: 380, candidateLimit: 5, hotCacheTtlMs: 60_000 }

  return {
    domain: input.domain,
    budgetMs: Math.max(80, Math.round(base.budgetMs * classMultiplier * latencyMultiplier)),
    candidateLimit: Math.max(2, Math.round(base.candidateLimit * Math.min(1.8, classMultiplier) * Math.min(1.45, latencyMultiplier))),
    hotCacheTtlMs: Math.max(15_000, Math.round(base.hotCacheTtlMs * Math.min(1.5, classMultiplier))),
  }
}

function buildDomainBudgets(input: {
  dominantDomain: AlicizationRecallLatencyDomain
  budgetClass: AlicizationMemoryRetrievalBudgetClass
  latencyClass: AlicizationRecallLatencyClass
}) {
  const ordered: AlicizationRecallLatencyDomain[] = uniqueList([
    input.dominantDomain,
    input.dominantDomain === 'procedure' ? 'relationship' : null,
    input.dominantDomain === 'relationship' ? 'self-model' : null,
    input.dominantDomain === 'self-model' ? 'relationship' : null,
    input.dominantDomain === 'world-model' ? 'procedure' : null,
    'general',
  ], 4) as AlicizationRecallLatencyDomain[]

  return ordered.map(domain => budgetForDomain({
    domain,
    budgetClass: input.budgetClass,
    latencyClass: input.latencyClass,
  }))
}

function buildHotPathKey(input: {
  seed: string
  domain: AlicizationRecallLatencyDomain
  intent?: AlicizationMemoryRecollectionIntentSnapshot | null
  budgetClass: AlicizationMemoryRetrievalBudgetClass
}) {
  const hint = input.intent?.queryHints?.[0] ?? ''
  const focus = input.intent?.temporalFocus ?? 'none'
  const key = uniqueList([
    input.domain,
    input.intent?.mode ?? 'none',
    focus,
    hint,
    input.seed,
    input.budgetClass,
  ], 6).join('|')
  return key || null
}

export function deriveAlicizationRecallLatencyPolicy(
  input: AlicizationRecallLatencyPolicyInput,
): AlicizationRecallLatencyPolicySnapshot {
  const intent = input.recollectionIntent ?? null
  const seed = sanitizeText(input.recallSeed, 240)
  const longHorizon = intent?.temporalFocus === 'cross-session'
    || intent?.temporalFocus === 'distant'
    || intent?.temporalFocus === 'experience-matched'
  const requestedBudget = input.budgetClass ?? null
  const contradictionPressure = Math.min(0.34, normalizedNumber(input.contradictionCount) * 0.04)
    + Math.min(0.3, normalizedNumber(input.contradictionHeavyFactCount) * 0.08)
  const validationRelief = Math.min(0.18, normalizedNumber(input.validationCount) * 0.025)
    + Math.min(0.16, normalizedNumber(input.stronglyValidatedProcedureCount) * 0.05)
  const ambiguityPressure = (input.clusterAmbiguous ? 0.2 : 0)
    + Math.min(0.26, normalizedNumber(input.competingVariantCount) * 0.07)
  const reliabilityRisk = clamp01(
    normalizedNumber(input.wrongThreadRate) * 0.32
    + normalizedNumber(input.recallMissRate) * 0.2
    + normalizedNumber(input.reconstructionErrorRate) * 0.24
    + normalizedNumber(input.memorySurfaceViolationRate) * 0.18
    + ambiguityPressure
    + contradictionPressure
    - validationRelief,
  )
  const stableCorePressure = normalizedNumber(input.stableCoreCount) > 0 || normalizedNumber(input.unsafeDetailCount) > 0
  const shouldRecall = input.shouldRecall !== false && intent?.mode !== 'none' && Boolean(intent)
  const domain = inferDomain(input)
  const budgetClass: AlicizationMemoryRetrievalBudgetClass = requestedBudget
    ?? (
      longHorizon || domain === 'procedure'
        ? 'deep-recall-reply'
        : 'realtime-reply'
    )
  const latencyClass: AlicizationRecallLatencyClass = budgetClass === 'nightly-benchmark' || budgetClass === 'diagnosis-replay' || budgetClass === 'deep-recall-reply'
    ? 'deep'
    : reliabilityRisk >= 0.58 || stableCorePressure
      ? 'balanced'
      : 'fast'

  const recallAction: AlicizationRecallLatencyAction = (() => {
    if (!shouldRecall)
      return reliabilityRisk >= 0.62 ? 'defer-to-followup' : 'shallow-answer'
    if (reliabilityRisk >= 0.7)
      return stableCorePressure ? 'stable-core-only' : 'defer-to-followup'
    if (stableCorePressure || input.finalSurfacePolicy === 'internal-only')
      return 'stable-core-only'
    if (budgetClass === 'deep-recall-reply' || longHorizon)
      return 'deep-recall'
    if (reliabilityRisk >= 0.46 || domain === 'relationship' || domain === 'self-model')
      return 'answer-then-supplement'
    return 'shallow-answer'
  })()

  const degradeReason = recallAction === 'defer-to-followup'
    ? 'recall-reliability-risk'
    : recallAction === 'stable-core-only'
      ? 'stable-core-protects-against-wrong-thread'
      : recallAction === 'answer-then-supplement'
        ? 'keep-current-payoff-before-memory-expansion'
        : null

  const reasonTags = uniqueList([
    `domain:${domain}`,
    `budget:${budgetClass}`,
    `latency:${latencyClass}`,
    `action:${recallAction}`,
    reliabilityRisk >= 0.58 ? 'risk:recall-reliability' : null,
    contradictionPressure > validationRelief ? 'risk:contradiction-heavy' : null,
    input.clusterAmbiguous ? 'risk:cluster-ambiguous' : null,
    stableCorePressure ? 'guard:stable-core' : null,
    longHorizon ? 'scope:long-horizon' : null,
  ], 10)

  return {
    version: 'recall-latency-policy-v1',
    budgetClass,
    latencyClass,
    recallAction,
    degradeReason,
    domainBudgets: buildDomainBudgets({
      dominantDomain: domain,
      budgetClass,
      latencyClass,
    }),
    hotPathKey: buildHotPathKey({
      seed,
      domain,
      intent,
      budgetClass,
    }),
    shouldUseHotCache: recallAction !== 'deep-recall' || reliabilityRisk >= 0.46,
    shouldPrefetch: recallAction === 'deep-recall' || recallAction === 'answer-then-supplement',
    shouldAvoidDeepExpansion: recallAction === 'stable-core-only' || recallAction === 'defer-to-followup',
    shouldEmitFollowUpAffordance: recallAction === 'defer-to-followup' || recallAction === 'answer-then-supplement',
    confidence: clamp01(0.78 - reliabilityRisk * 0.32 + validationRelief * 0.24),
    reasonTags,
    summary: `recall_action=${recallAction} | domain=${domain} | latency=${latencyClass} | budget=${budgetClass}`,
  }
}

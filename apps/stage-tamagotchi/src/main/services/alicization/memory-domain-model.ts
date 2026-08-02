import type { AlicizationMemoryDomain, AlicizationMemoryFact } from '../../../shared/eventa'

import { scoreAlicizationMemorySourceTrustBase } from '@proj-alicization/stage-shared'

export interface AlicizationMemoryDomainPolicy {
  retrievalWeight: number
  contradictionPenalty: number
  validationBoost: number
  internalizationThreshold: number
}

export type AlicizationDomainNativeMemoryView
  = | AlicizationProcedureMemoryView
    | AlicizationRelationshipMemoryView
    | AlicizationSelfModelMemoryView
    | AlicizationWorldModelMemoryView

interface AlicizationDomainMemoryViewBase {
  domain: AlicizationMemoryDomain
  factId: string
  sourceFact: AlicizationMemoryFact
  subject: string
  predicate: string
  object: string
  confidence: number
  validationStatus: NonNullable<AlicizationMemoryFact['validationStatus']>
  knowledgeStage: NonNullable<AlicizationMemoryFact['knowledgeStage']>
  contradictionCount: number
  validationCount: number
  sourceLabel: string | null
  retrievalAnchors: string[]
  conflictResolver: 'versioned-procedure' | 'relationship-era' | 'self-narrative' | 'source-validation'
  consolidationPolicy: 'habit-internalization' | 'relationship-residue' | 'identity-narrative' | 'validated-world-fact'
}

export interface AlicizationProcedureMemoryView extends AlicizationDomainMemoryViewBase {
  domain: 'procedure'
  reusableStepScore: number
  executionReliability: number
  verificationNeed: number
}

export interface AlicizationRelationshipMemoryView extends AlicizationDomainMemoryViewBase {
  domain: 'relationship'
  boundaryContinuity: number
  repairArcPressure: number
  eraSeparationKey: string
}

export interface AlicizationSelfModelMemoryView extends AlicizationDomainMemoryViewBase {
  domain: 'self-model'
  narrativeStability: number
  growthVector: string | null
  staleBeliefRisk: number
}

export interface AlicizationWorldModelMemoryView extends AlicizationDomainMemoryViewBase {
  domain: 'world-model'
  sourceTrust: number
  factualSpecificity: number
  validationNeed: number
}

export interface AlicizationDomainNativeMemoryRankedView {
  view: AlicizationDomainNativeMemoryView
  score: number
  conflictState: 'usable' | 'verify-first' | 'suppress-stale' | 'superseded'
  resolverReason: string
}

function normalizeText(raw: string) {
  return raw.trim().toLowerCase()
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function tokenizeDomainText(raw: string, maxItems = 16) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const token of normalizeText(raw).split(/[^a-z0-9\u4E00-\u9FFF]+/u)) {
    const normalized = token.trim()
    if (!normalized || seen.has(normalized))
      continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function stableKnowledgeStage(fact: AlicizationMemoryFact): NonNullable<AlicizationMemoryFact['knowledgeStage']> {
  return fact.knowledgeStage ?? 'working-understanding'
}

function stableValidationStatus(fact: AlicizationMemoryFact): NonNullable<AlicizationMemoryFact['validationStatus']> {
  return fact.validationStatus ?? 'unverified'
}

function baseMemoryView(input: {
  fact: AlicizationMemoryFact
  domain: AlicizationMemoryDomain
  conflictResolver: AlicizationDomainMemoryViewBase['conflictResolver']
  consolidationPolicy: AlicizationDomainMemoryViewBase['consolidationPolicy']
}): AlicizationDomainMemoryViewBase {
  return {
    domain: input.domain,
    factId: input.fact.id,
    sourceFact: input.fact,
    subject: input.fact.subject,
    predicate: input.fact.predicate,
    object: input.fact.object,
    confidence: clamp01(input.fact.confidence),
    validationStatus: stableValidationStatus(input.fact),
    knowledgeStage: stableKnowledgeStage(input.fact),
    contradictionCount: Math.max(0, Math.floor(input.fact.contradictionCount ?? 0)),
    validationCount: Math.max(0, Math.floor(input.fact.validationCount ?? 0)),
    sourceLabel: input.fact.sourceLabel ?? null,
    retrievalAnchors: tokenizeDomainText(`${input.fact.subject} ${input.fact.predicate} ${input.fact.object}`, 18),
    conflictResolver: input.conflictResolver,
    consolidationPolicy: input.consolidationPolicy,
  }
}

function scoreValidatedStability(view: Pick<AlicizationDomainMemoryViewBase, 'confidence' | 'validationCount' | 'contradictionCount' | 'validationStatus' | 'knowledgeStage'>) {
  const validationBoost = view.validationStatus === 'validated'
    ? 0.18
    : view.validationStatus === 'provisional'
      ? 0.08
      : view.validationStatus === 'superseded'
        ? -0.25
        : 0
  const stageBoost = view.knowledgeStage === 'internalized-long-horizon-knowledge'
    ? 0.16
    : view.knowledgeStage === 'validated-knowledge'
      ? 0.12
      : view.knowledgeStage === 'working-understanding'
        ? 0.04
        : -0.08
  return clamp01(view.confidence * 0.55 + validationBoost + stageBoost + Math.min(0.12, view.validationCount * 0.03) - Math.min(0.28, view.contradictionCount * 0.08))
}

function relationshipEraKey(fact: AlicizationMemoryFact) {
  const text = normalizeText(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (/repair|修复|apology|道歉/u.test(text))
    return 'repair'
  if (/boundary|distance|space|room|边界|距离|空间/u.test(text))
    return 'boundary'
  if (/trust|closeness|warm|信任|亲近|温柔/u.test(text))
    return 'closeness'
  return tokenizeDomainText(text, 3).join(':') || 'relationship'
}

function selfGrowthVector(fact: AlicizationMemoryFact) {
  const text = normalizeText(`${fact.subject} ${fact.predicate} ${fact.object}`)
  if (/learn|growth|evolve|becoming|成长|进化|学会/u.test(text))
    return 'growth'
  if (/habit|tendency|style|personality|习惯|性格|风格/u.test(text))
    return 'trait'
  if (/mistake|repair|revise|contradiction|错误|修正|矛盾/u.test(text))
    return 'revision'
  return null
}

function factualSpecificity(fact: AlicizationMemoryFact) {
  const text = `${fact.subject} ${fact.predicate} ${fact.object}`
  const namedLike = (text.match(/\b[A-Z][\w-]{2,}\b/g) ?? []).length
  const numericLike = (text.match(/\b\d+(?:\.\d+)?\b/g) ?? []).length
  const pathLike = /[/\\]|\b[\w-]+\.(?:ts|tsx|vue|json|md|js|mjs|cjs)\b/u.test(text) ? 1 : 0
  return clamp01(0.25 + Math.min(0.45, namedLike * 0.08 + numericLike * 0.06 + pathLike * 0.16))
}

export function normalizeMemoryDomain(raw: unknown): AlicizationMemoryDomain {
  if (
    raw === 'procedure'
    || raw === 'relationship'
    || raw === 'self-model'
    || raw === 'world-model'
  ) {
    return raw
  }
  return 'world-model'
}

export function getMemoryDomainPolicy(domain: AlicizationMemoryDomain): AlicizationMemoryDomainPolicy {
  if (domain === 'procedure') {
    return {
      retrievalWeight: 0.14,
      contradictionPenalty: 0.02,
      validationBoost: 0.12,
      internalizationThreshold: 0.74,
    }
  }
  if (domain === 'relationship') {
    return {
      retrievalWeight: 0.14,
      contradictionPenalty: 0.06,
      validationBoost: 0.08,
      internalizationThreshold: 0.82,
    }
  }
  if (domain === 'self-model') {
    return {
      retrievalWeight: 0.12,
      contradictionPenalty: 0.05,
      validationBoost: 0.08,
      internalizationThreshold: 0.8,
    }
  }
  return {
    retrievalWeight: 0.1,
    contradictionPenalty: 0.04,
    validationBoost: 0.1,
    internalizationThreshold: 0.78,
  }
}

export function inferMemoryDomainFromFact(input: Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>): AlicizationMemoryDomain {
  const text = normalizeText(`${input.subject} ${input.predicate} ${input.object}`)
  if (/procedure|workflow|steps|fix|repair|patch|verify|callback|command|cli|terminal|做法|步骤|修复|补丁|验证/u.test(text))
    return 'procedure'
  if (/relationship|trust|bond|distance|boundary|tone|repair arc|关系|信任|边界|距离|语气/u.test(text))
    return 'relationship'
  if (/self|alicization|i am|my trait|my habit|我的性格|自我|人格|习惯/u.test(text))
    return 'self-model'
  return 'world-model'
}

export function scoreMemoryDomainAffinity(input: {
  query: string
  fact: Pick<AlicizationMemoryFact, 'memoryDomain' | 'subject' | 'predicate' | 'object'>
}) {
  const domain = input.fact.memoryDomain ?? inferMemoryDomainFromFact(input.fact)
  const policy = getMemoryDomainPolicy(domain)
  const query = normalizeText(input.query)
  if (domain === 'procedure' && /patch|fix|verify|procedure|workflow|cli|terminal|步骤|修复|验证/u.test(query))
    return policy.retrievalWeight
  if (domain === 'relationship' && /different this time|relationship|tone|trust|care|repair|关系|语气|信任|修复/u.test(query))
    return policy.retrievalWeight
  if (domain === 'self-model' && /you|yourself|self|who are you|你的性格|你自己|自我/u.test(query))
    return policy.retrievalWeight
  if (domain === 'world-model' && /what happened|world|fact|knowledge|外部|事实|知识/u.test(query))
    return policy.retrievalWeight
  return 0
}

export function buildAlicizationDomainNativeMemoryView(fact: AlicizationMemoryFact): AlicizationDomainNativeMemoryView {
  const domain = normalizeMemoryDomain(fact.memoryDomain ?? inferMemoryDomainFromFact(fact))
  if (domain === 'procedure') {
    const base = baseMemoryView({
      fact,
      domain,
      conflictResolver: 'versioned-procedure',
      consolidationPolicy: 'habit-internalization',
    })
    const text = normalizeText(`${fact.predicate} ${fact.object}`)
    return {
      ...base,
      domain,
      reusableStepScore: clamp01(scoreValidatedStability(base) + (/step|procedure|workflow|command|verify|patch|步骤|做法|验证|补丁/u.test(text) ? 0.12 : 0)),
      executionReliability: clamp01(scoreValidatedStability(base) + Math.min(0.1, (fact.accessCount ?? 0) * 0.015)),
      verificationNeed: clamp01((base.contradictionCount * 0.18) + (base.validationStatus === 'unverified' ? 0.25 : 0) + (base.knowledgeStage === 'ephemeral-observation' ? 0.16 : 0)),
    }
  }
  if (domain === 'relationship') {
    const base = baseMemoryView({
      fact,
      domain,
      conflictResolver: 'relationship-era',
      consolidationPolicy: 'relationship-residue',
    })
    const text = normalizeText(`${fact.predicate} ${fact.object}`)
    return {
      ...base,
      domain,
      boundaryContinuity: clamp01(scoreValidatedStability(base) + (/boundary|distance|space|room|边界|距离|空间/u.test(text) ? 0.16 : 0)),
      repairArcPressure: clamp01((/repair|trust|misread|apology|修复|误读|道歉|信任/u.test(text) ? 0.24 : 0) + base.contradictionCount * 0.12 + (base.validationStatus === 'provisional' ? 0.08 : 0)),
      eraSeparationKey: relationshipEraKey(fact),
    }
  }
  if (domain === 'self-model') {
    const base = baseMemoryView({
      fact,
      domain,
      conflictResolver: 'self-narrative',
      consolidationPolicy: 'identity-narrative',
    })
    const growthVector = selfGrowthVector(fact)
    return {
      ...base,
      domain,
      narrativeStability: clamp01(scoreValidatedStability(base) + (growthVector === 'trait' ? 0.08 : 0)),
      growthVector,
      staleBeliefRisk: clamp01((base.validationStatus === 'superseded' ? 0.4 : 0) + base.contradictionCount * 0.14 + (growthVector === 'revision' ? 0.1 : 0)),
    }
  }
  const base = baseMemoryView({
    fact,
    domain,
    conflictResolver: 'source-validation',
    consolidationPolicy: 'validated-world-fact',
  })
  return {
    ...base,
    domain,
    sourceTrust: clamp01(scoreAlicizationMemorySourceTrustBase(fact.source) + scoreValidatedStability(base) * 0.78),
    factualSpecificity: factualSpecificity(fact),
    validationNeed: clamp01((base.validationStatus === 'validated' ? 0 : 0.24) + base.contradictionCount * 0.16 + (fact.source === 'async-llm' ? 0.08 : 0)),
  }
}

export function buildAlicizationDomainNativeMemoryViews(facts: AlicizationMemoryFact[]) {
  const views = facts.map(fact => buildAlicizationDomainNativeMemoryView(fact))
  return {
    procedure: views.filter((view): view is AlicizationProcedureMemoryView => view.domain === 'procedure'),
    relationship: views.filter((view): view is AlicizationRelationshipMemoryView => view.domain === 'relationship'),
    selfModel: views.filter((view): view is AlicizationSelfModelMemoryView => view.domain === 'self-model'),
    worldModel: views.filter((view): view is AlicizationWorldModelMemoryView => view.domain === 'world-model'),
    all: views,
  }
}

export function scoreDomainNativeMemoryViewForQuery(input: {
  query: string
  view: AlicizationDomainNativeMemoryView
}) {
  const query = normalizeText(input.query)
  if (!query)
    return 0
  if (input.view.domain === 'procedure') {
    const proceduralIntent = /patch|fix|verify|procedure|workflow|cli|terminal|step|how|步骤|修复|验证|怎么做/u.test(query)
    return proceduralIntent
      ? input.view.reusableStepScore * 0.16 + (1 - input.view.verificationNeed) * 0.05
      : input.view.executionReliability * 0.04
  }
  if (input.view.domain === 'relationship') {
    const relationshipIntent = /different this time|relationship|tone|trust|care|repair|boundary|space|关系|语气|信任|修复|边界/u.test(query)
    return relationshipIntent
      ? input.view.boundaryContinuity * 0.12 + input.view.repairArcPressure * 0.1
      : input.view.repairArcPressure * 0.03
  }
  if (input.view.domain === 'self-model') {
    const selfIntent = /you|yourself|self|who are you|identity|trait|你的性格|你自己|自我|人格/u.test(query)
    return selfIntent
      ? input.view.narrativeStability * 0.14 - input.view.staleBeliefRisk * 0.08
      : input.view.narrativeStability * 0.03
  }
  const worldIntent = /what happened|world|fact|knowledge|source|true|外部|事实|知识|来源/u.test(query)
  return worldIntent
    ? input.view.sourceTrust * 0.12 + input.view.factualSpecificity * 0.04 - input.view.validationNeed * 0.08
    : input.view.sourceTrust * 0.03 - input.view.validationNeed * 0.04
}

export function resolveDomainNativeMemoryConflict(view: AlicizationDomainNativeMemoryView): Pick<AlicizationDomainNativeMemoryRankedView, 'conflictState' | 'resolverReason'> {
  if (view.validationStatus === 'superseded') {
    return {
      conflictState: 'superseded',
      resolverReason: `${view.conflictResolver}:superseded`,
    }
  }
  if (view.domain === 'procedure') {
    if (view.verificationNeed >= 0.42) {
      return {
        conflictState: 'verify-first',
        resolverReason: 'versioned-procedure:verify-required',
      }
    }
    return {
      conflictState: 'usable',
      resolverReason: 'versioned-procedure:usable',
    }
  }
  if (view.domain === 'relationship') {
    if (view.repairArcPressure >= 0.48 || view.contradictionCount >= 2) {
      return {
        conflictState: 'verify-first',
        resolverReason: `relationship-era:verify-required;era=${view.eraSeparationKey}`,
      }
    }
    return {
      conflictState: 'usable',
      resolverReason: `relationship-era:usable;era=${view.eraSeparationKey}`,
    }
  }
  if (view.domain === 'self-model') {
    if (view.staleBeliefRisk >= 0.26 || view.contradictionCount >= 2) {
      return {
        conflictState: 'suppress-stale',
        resolverReason: 'self-narrative:suppress-stale',
      }
    }
    return {
      conflictState: 'usable',
      resolverReason: 'self-narrative:usable',
    }
  }
  if (view.validationNeed >= 0.36) {
    return {
      conflictState: 'verify-first',
      resolverReason: 'source-validation:verify-required',
    }
  }
  return {
    conflictState: 'usable',
    resolverReason: 'source-validation:usable',
  }
}

export function rankDomainNativeMemoryViews(input: {
  query: string
  views: AlicizationDomainNativeMemoryView[]
  limit?: number
}): AlicizationDomainNativeMemoryRankedView[] {
  const query = normalizeText(input.query)
  if (!query)
    return []
  return input.views
    .map((view) => {
      const conflict = resolveDomainNativeMemoryConflict(view)
      const rawScore = scoreDomainNativeMemoryViewForQuery({ query, view })
      const conflictPenalty = conflict.conflictState === 'usable'
        ? 0
        : conflict.conflictState === 'verify-first'
          ? 0.08
          : conflict.conflictState === 'suppress-stale'
            ? 0.16
            : 0.4
      return {
        view,
        score: Math.max(0, rawScore - conflictPenalty),
        rawScore,
        conflictState: conflict.conflictState,
        resolverReason: conflict.resolverReason,
      }
    })
    .filter(item => item.rawScore > 0)
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return right.view.confidence - left.view.confidence
    })
    .slice(0, Math.max(0, Math.floor(input.limit ?? input.views.length)))
}

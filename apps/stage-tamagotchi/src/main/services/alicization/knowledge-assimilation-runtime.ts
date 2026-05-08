import type {
  AlicizationKnowledgeAssimilationStage,
  AlicizationKnowledgeValidationStatus,
  AlicizationMemoryDomain,
  AlicizationMemoryFact,
  AlicizationMemoryFactInput,
  AlicizationMemorySource,
} from '../../../shared/eventa'

import {
  buildAlicizationDomainNativeMemoryView,
  getMemoryDomainPolicy,
  inferMemoryDomainFromFact,
  normalizeMemoryDomain,
} from './memory-domain-model'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function buildDedupeKey(fact: Pick<AlicizationMemoryFactInput, 'subject' | 'predicate' | 'object'>) {
  return `${fact.subject.trim().toLowerCase()}|${fact.predicate.trim().toLowerCase()}|${fact.object.trim().toLowerCase()}`
}

function isBoundaryLike(predicate: string) {
  return /boundary|preference|habit|procedure|constraint|limit|风格|边界|偏好|习惯|做法|限制/iu.test(predicate)
}

function tokenizeObjectText(raw: string) {
  return sanitizeText(raw, 180)
    .toLowerCase()
    .split(/[^a-z0-9\u4E00-\u9FFF]+/u)
    .map(token => token.trim())
    .filter(Boolean)
}

function scoreObjectSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenizeObjectText(left))
  const rightTokens = new Set(tokenizeObjectText(right))
  if (leftTokens.size === 0 || rightTokens.size === 0)
    return 0

  let overlap = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token))
      overlap += 1
  }
  return overlap / Math.max(leftTokens.size, rightTokens.size)
}

function buildSupportEvidence(input: {
  fact: AlicizationMemoryFactInput
  existing: AlicizationMemoryFact | null
  existingFacts: AlicizationMemoryFact[]
}) {
  const normalizedSubject = input.fact.subject.trim().toLowerCase()
  const normalizedPredicate = input.fact.predicate.trim().toLowerCase()
  const siblings = input.existingFacts.filter(item =>
    item.subject.trim().toLowerCase() === normalizedSubject
    && item.predicate.trim().toLowerCase() === normalizedPredicate
    && item.id !== input.existing?.id,
  )
  const supportingSiblings = siblings.filter(item =>
    scoreObjectSimilarity(item.object, input.fact.object) >= 0.45,
  )
  const conflictingSiblings = siblings.filter(item =>
    scoreObjectSimilarity(item.object, input.fact.object) < 0.45,
  )

  return {
    siblings,
    supportingSiblings,
    conflictingSiblings,
    repeatedAccessPressure: input.existing?.accessCount ?? 0,
    repeatedValidationPressure: input.existing?.validationCount ?? 0,
    contradictionPressure: input.existing?.contradictionCount ?? 0,
    priorValidated: input.existing?.validationStatus === 'validated'
      || input.existing?.knowledgeStage === 'validated-knowledge'
      || input.existing?.knowledgeStage === 'internalized-long-horizon-knowledge',
    priorInternalized: input.existing?.knowledgeStage === 'internalized-long-horizon-knowledge',
  }
}

function scorePromotionEvidence(input: {
  source: AlicizationMemorySource
  fact: AlicizationMemoryFactInput
  existing: AlicizationMemoryFact | null
  support: ReturnType<typeof buildSupportEvidence>
}) {
  let score = 0
  if (input.source === 'rule-shadow')
    score -= 0.32
  if (input.source === 'rule')
    score += 0.32
  if (isBoundaryLike(input.fact.predicate))
    score += 0.18
  if (input.fact.confidence >= 0.82)
    score += 0.18
  else if (input.fact.confidence >= 0.72)
    score += 0.1
  else if (input.fact.confidence < 0.58)
    score -= 0.14

  if (input.support.priorValidated)
    score += 0.22
  if (input.support.priorInternalized)
    score += 0.24
  if (input.support.repeatedValidationPressure >= 3)
    score += 0.22
  else if (input.support.repeatedValidationPressure >= 2)
    score += 0.12
  if (input.support.repeatedAccessPressure >= 5)
    score += 0.24
  else if (input.support.repeatedAccessPressure >= 3)
    score += 0.1

  score += Math.min(0.18, input.support.supportingSiblings.length * 0.08)
  score -= Math.min(0.08, input.support.conflictingSiblings.length * 0.04)
  score -= Math.min(0.12, input.support.contradictionPressure * 0.04)
  return clamp01(score)
}

function deriveWorkingKnowledgeStage(input: {
  source: AlicizationMemorySource
  fact: AlicizationMemoryFactInput
  existing: AlicizationMemoryFact | null
  support: ReturnType<typeof buildSupportEvidence>
}) {
  const domain: AlicizationMemoryDomain = input.fact.memoryDomain
    ? normalizeMemoryDomain(input.fact.memoryDomain)
    : inferMemoryDomainFromFact({
        subject: input.fact.subject,
        predicate: input.fact.predicate,
        object: input.fact.object,
      })
  const domainPolicy = getMemoryDomainPolicy(domain)
  const nativeView = buildAlicizationDomainNativeMemoryView({
    id: input.existing?.id ?? 'candidate',
    subject: input.fact.subject,
    predicate: input.fact.predicate,
    object: input.fact.object,
    confidence: input.fact.confidence,
    source: input.source,
    dedupeKey: buildDedupeKey(input.fact),
    createdAt: input.existing?.createdAt ?? 0,
    updatedAt: input.existing?.updatedAt ?? 0,
    lastAccessAt: input.existing?.lastAccessAt ?? null,
    accessCount: input.existing?.accessCount ?? 0,
    knowledgeStage: input.fact.knowledgeStage ?? input.existing?.knowledgeStage ?? null,
    validationStatus: input.fact.validationStatus ?? input.existing?.validationStatus ?? null,
    memoryDomain: domain,
    validationCount: input.existing?.validationCount ?? input.fact.validationCount ?? 0,
    contradictionCount: input.existing?.contradictionCount ?? input.fact.contradictionCount ?? 0,
    sourceLabel: input.fact.sourceLabel ?? input.existing?.sourceLabel ?? null,
    conflictsWith: input.fact.conflictsWith ?? input.existing?.conflictsWith ?? [],
    supersedes: input.fact.supersedes ?? input.existing?.supersedes ?? [],
  })
  if (input.fact.knowledgeStage)
    return input.fact.knowledgeStage
  if (input.existing?.knowledgeStage === 'internalized-long-horizon-knowledge')
    return 'internalized-long-horizon-knowledge'
  if (input.source === 'rule-shadow')
    return 'ephemeral-observation'
  const evidence = scorePromotionEvidence(input)
  const correctionPressure = input.support.conflictingSiblings.length > 0
    && input.fact.confidence >= 0.8
    && isBoundaryLike(input.fact.predicate)
  const requiresStricterInternalization = domain === 'relationship' || domain === 'self-model'
  const domainNativeInternalizationReady = domain === 'procedure'
    ? nativeView.domain === 'procedure' && nativeView.reusableStepScore >= 0.78 && nativeView.verificationNeed <= 0.18
    : domain === 'relationship'
      ? nativeView.domain === 'relationship' && nativeView.boundaryContinuity >= 0.84 && nativeView.repairArcPressure <= 0.18
      : domain === 'self-model'
        ? nativeView.domain === 'self-model' && nativeView.narrativeStability >= 0.84 && nativeView.staleBeliefRisk <= 0.16
        : false
  if (
    evidence >= domainPolicy.internalizationThreshold
    && domainNativeInternalizationReady
    && (!requiresStricterInternalization || input.support.repeatedValidationPressure >= 4)
    && (isBoundaryLike(input.fact.predicate) || input.support.priorValidated || input.support.repeatedAccessPressure >= 5)
  ) {
    return 'internalized-long-horizon-knowledge'
  }
  if (evidence >= 0.56 || correctionPressure)
    return 'validated-knowledge'
  if (input.source === 'async-llm' && input.fact.confidence < 0.58 && input.support.supportingSiblings.length === 0)
    return 'ephemeral-observation'
  return 'working-understanding'
}

function deriveValidationStatus(input: {
  fact: AlicizationMemoryFactInput
  existing: AlicizationMemoryFact | null
  knowledgeStage: AlicizationKnowledgeAssimilationStage
  support: ReturnType<typeof buildSupportEvidence>
}) {
  if (input.fact.validationStatus)
    return input.fact.validationStatus
  if (input.existing?.validationStatus === 'superseded')
    return 'superseded'
  if (input.knowledgeStage === 'internalized-long-horizon-knowledge' || input.knowledgeStage === 'validated-knowledge')
    return 'validated'
  if (input.support.priorValidated || input.support.supportingSiblings.length > 0 || (input.existing && input.existing.confidence >= 0.76))
    return 'provisional'
  return 'unverified'
}

function deriveSourceLabel(input: {
  source: AlicizationMemorySource
  fact: AlicizationMemoryFactInput
  support: ReturnType<typeof buildSupportEvidence>
  validationStatus: AlicizationKnowledgeValidationStatus
}) {
  if (typeof input.fact.sourceLabel === 'string' && input.fact.sourceLabel.trim())
    return sanitizeText(input.fact.sourceLabel, 160)
  if (input.source === 'rule-shadow')
    return 'shadow-rule-extraction'
  if (input.validationStatus === 'validated' && input.support.priorValidated)
    return input.source === 'async-llm' ? 'async-memory-reconfirmation' : 'runtime-outcome-reconfirmation'
  if (input.support.conflictingSiblings.length > 0)
    return input.source === 'async-llm' ? 'async-memory-correction' : 'runtime-outcome-correction'
  return input.source === 'async-llm'
    ? 'async-memory-extraction'
    : 'runtime-outcome-closure'
}

function normalizeStringList(values: Array<string | null | undefined> | null | undefined, maxItems = 16) {
  const result: string[] = []
  for (const raw of values ?? []) {
    const normalized = sanitizeText(raw, 120)
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

function findPotentialSupersededFacts(input: {
  fact: AlicizationMemoryFactInput
  existingFacts: AlicizationMemoryFact[]
}) {
  const subject = input.fact.subject.trim().toLowerCase()
  const predicate = input.fact.predicate.trim().toLowerCase()
  const object = input.fact.object.trim().toLowerCase()
  if (!subject || !predicate || !object)
    return [] as AlicizationMemoryFact[]

  return input.existingFacts.filter((item) => {
    if ((item.validationStatus ?? 'unverified') === 'superseded')
      return false
    return item.subject.trim().toLowerCase() === subject
      && item.predicate.trim().toLowerCase() === predicate
      && item.object.trim().toLowerCase() !== object
  })
}

function findPotentialReopenFacts(input: {
  fact: AlicizationMemoryFactInput
  existingFacts: AlicizationMemoryFact[]
}) {
  const subject = input.fact.subject.trim().toLowerCase()
  const predicate = input.fact.predicate.trim().toLowerCase()
  const object = input.fact.object.trim().toLowerCase()
  if (!subject || !predicate || !object)
    return [] as AlicizationMemoryFact[]

  return input.existingFacts.filter((item) => {
    return item.subject.trim().toLowerCase() === subject
      && item.predicate.trim().toLowerCase() === predicate
      && item.knowledgeStage === 'internalized-long-horizon-knowledge'
      && scoreObjectSimilarity(item.object, object) < 0.45
  })
}

export interface AssimilateMemoryFactsInput {
  facts: AlicizationMemoryFactInput[]
  source: AlicizationMemorySource
  existingFacts: AlicizationMemoryFact[]
}

export interface AlicizationKnowledgeAssimilationCorrection {
  targetFactId: string
  nextValidationStatus: AlicizationKnowledgeValidationStatus
  nextKnowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  sourceLabel?: string | null
  appendConflictsWith?: string[] | null
  appendSupersedes?: string[] | null
}

export interface AlicizationKnowledgeAssimilationResult {
  facts: AlicizationMemoryFactInput[]
  corrections: AlicizationKnowledgeAssimilationCorrection[]
}

export function createAlicizationKnowledgeAssimilationRuntime() {
  function assimilateMemoryFactsDetailed(input: AssimilateMemoryFactsInput): AlicizationKnowledgeAssimilationResult {
    const existingByDedupe = new Map(
      input.existingFacts.map(item => [item.dedupeKey, item] as const),
    )
    const corrections: AlicizationKnowledgeAssimilationCorrection[] = []

    const facts = input.facts.map((fact) => {
      const normalized: AlicizationMemoryFactInput = {
        ...fact,
        subject: sanitizeText(fact.subject, 64),
        predicate: sanitizeText(fact.predicate, 64),
        object: sanitizeText(fact.object, 180),
        confidence: clamp01(fact.confidence),
      }
      const dedupeKey = buildDedupeKey(normalized)
      const existing = existingByDedupe.get(dedupeKey) ?? null
      const support = buildSupportEvidence({
        fact: normalized,
        existing,
        existingFacts: input.existingFacts,
      })
      const knowledgeStage = deriveWorkingKnowledgeStage({
        source: input.source,
        fact: normalized,
        existing,
        support,
      })
      const validationStatus = deriveValidationStatus({
        fact: normalized,
        existing,
        knowledgeStage,
        support,
      })
      const conflictingCandidates = support.conflictingSiblings.length > 0
        ? support.conflictingSiblings
        : findPotentialSupersededFacts({
            fact: normalized,
            existingFacts: input.existingFacts,
          })
      const reopenCandidates = findPotentialReopenFacts({
        fact: normalized,
        existingFacts: input.existingFacts,
      })
      const supersedes = normalizeStringList([
        ...(normalized.supersedes ?? []),
        ...conflictingCandidates.map(item => item.id),
      ])
      const conflictsWith = normalizeStringList([
        ...(normalized.conflictsWith ?? []),
        ...conflictingCandidates
          .filter(item => item.object.trim().toLowerCase() !== normalized.object.trim().toLowerCase())
          .map(item => item.id),
      ])

      if (
        conflictingCandidates.length > 0
        && (
          validationStatus === 'validated'
          || knowledgeStage === 'validated-knowledge'
          || knowledgeStage === 'internalized-long-horizon-knowledge'
        )
      ) {
        for (const candidate of conflictingCandidates) {
          corrections.push({
            targetFactId: candidate.id,
            nextValidationStatus: 'superseded',
            nextKnowledgeStage: candidate.knowledgeStage ?? 'working-understanding',
            sourceLabel: `superseded-by:${sanitizeText(normalized.object, 96)}`,
            appendConflictsWith: [dedupeKey],
          })
        }
      }
      if (reopenCandidates.length > 0) {
        for (const candidate of reopenCandidates) {
          corrections.push({
            targetFactId: candidate.id,
            nextValidationStatus: 'provisional',
            nextKnowledgeStage: 'validated-knowledge',
            sourceLabel: `reopened-by:${sanitizeText(normalized.object, 96)}`,
            appendConflictsWith: [dedupeKey],
          })
        }
      }

      return {
        ...normalized,
        knowledgeStage,
        validationStatus,
        sourceLabel: deriveSourceLabel({
          source: input.source,
          fact: normalized,
          support,
          validationStatus,
        }),
        conflictsWith,
        supersedes,
      } satisfies AlicizationMemoryFactInput
    })

    return {
      facts,
      corrections,
    }
  }

  function assimilateMemoryFacts(input: AssimilateMemoryFactsInput) {
    return assimilateMemoryFactsDetailed(input).facts
  }

  return {
    assimilateMemoryFacts,
    assimilateMemoryFactsDetailed,
  }
}

export type AlicizationKnowledgeAssimilationRuntime = ReturnType<typeof createAlicizationKnowledgeAssimilationRuntime>

import type { AlicizationMemoryDomain, AlicizationMemoryFact } from '../../../shared/eventa'

export interface AlicizationMemoryDomainPolicy {
  retrievalWeight: number
  contradictionPenalty: number
  validationBoost: number
  internalizationThreshold: number
}

function normalizeText(raw: string) {
  return raw.trim().toLowerCase()
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

import type {
  AlicizationMemoryProvenance,
  AlicizationMemorySource,
  AlicizationSubconsciousFragmentSourceKind,
} from './alicization-transport-contracts'

export const alicizationMemoryProvenanceDominanceOrder = [
  'observed',
  'remembered',
  'inferred',
  'reconstructed',
  'dreamt',
  'shadow',
] as const satisfies readonly AlicizationMemoryProvenance[]

export function normalizeAlicizationMemoryProvenance(
  raw: unknown,
  fallback: AlicizationMemoryProvenance = 'remembered',
): AlicizationMemoryProvenance {
  if (
    raw === 'observed'
    || raw === 'remembered'
    || raw === 'dreamt'
    || raw === 'inferred'
    || raw === 'reconstructed'
    || raw === 'shadow'
  ) {
    return raw
  }
  return fallback
}

export function mapAlicizationMemorySourceToProvenance(
  source: AlicizationMemorySource,
): AlicizationMemoryProvenance {
  if (source === 'async-llm')
    return 'inferred'
  if (source === 'rule-shadow')
    return 'shadow'
  return 'remembered'
}

export function mapAlicizationFragmentSourceKindToProvenance(
  sourceKind: AlicizationSubconsciousFragmentSourceKind,
): AlicizationMemoryProvenance {
  if (sourceKind === 'dream-fragment')
    return 'dreamt'
  if (sourceKind === 'visual-sediment' || sourceKind === 'dialogue-turn')
    return 'remembered'
  if (sourceKind === 'reflection-ledger' || sourceKind === 'fact-ledger')
    return 'inferred'
  if (sourceKind === 'former-core-incarnation' || sourceKind === 'mind-continuity')
    return 'reconstructed'
  return 'remembered'
}

export function formatAlicizationMemoryProvenanceLabel(
  provenance: AlicizationMemoryProvenance,
) {
  return provenance
}

export function isAlicizationWeakMemoryProvenance(
  provenance: AlicizationMemoryProvenance | null | undefined,
) {
  return provenance === 'reconstructed'
    || provenance === 'dreamt'
    || provenance === 'inferred'
    || provenance === 'shadow'
}

export function shouldAlicizationMemoryProvenanceEnterLongTermConsolidation(
  provenance: AlicizationMemoryProvenance | null | undefined,
) {
  return provenance !== 'dreamt' && provenance !== 'shadow'
}

export function scoreAlicizationMemoryProvenanceTrust(
  provenance: AlicizationMemoryProvenance | null | undefined,
) {
  if (provenance === 'observed')
    return 0.95
  if (provenance === 'remembered')
    return 0.82
  if (provenance === 'reconstructed')
    return 0.58
  if (provenance === 'inferred')
    return 0.48
  if (provenance === 'dreamt')
    return 0.28
  if (provenance === 'shadow')
    return 0.12
  return 0.62
}

export function scoreAlicizationMemorySourceTrustBase(
  source: AlicizationMemorySource,
) {
  if (source === 'rule')
    return 0.24
  if (source === 'rule-shadow')
    return 0.04
  return 0.12
}

export function pickDominantAlicizationMemoryProvenance(
  values: Array<AlicizationMemoryProvenance | null | undefined>,
  fallback: AlicizationMemoryProvenance = 'remembered',
): AlicizationMemoryProvenance {
  const normalized = values.map(value => normalizeAlicizationMemoryProvenance(value, fallback))
  let best = fallback
  let bestScore = -1
  for (const candidate of alicizationMemoryProvenanceDominanceOrder) {
    const score = normalized.filter(value => value === candidate).length
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

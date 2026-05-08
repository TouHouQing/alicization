import { describe, expect, it } from 'vitest'

import {
  formatAlicizationMemoryProvenanceLabel,
  isAlicizationWeakMemoryProvenance,
  mapAlicizationFragmentSourceKindToProvenance,
  mapAlicizationMemorySourceToProvenance,
  normalizeAlicizationMemoryProvenance,
  pickDominantAlicizationMemoryProvenance,
  scoreAlicizationMemoryProvenanceTrust,
  scoreAlicizationMemorySourceTrustBase,
  shouldAlicizationMemoryProvenanceEnterLongTermConsolidation,
} from './alicization-memory-provenance-policy'

describe('alicization memory provenance policy', () => {
  it('keeps rule-shadow as shadow with low trust instead of promoting it to remembered memory', () => {
    expect(mapAlicizationMemorySourceToProvenance('rule-shadow')).toBe('shadow')
    expect(formatAlicizationMemoryProvenanceLabel('shadow')).toBe('shadow')
    expect(scoreAlicizationMemoryProvenanceTrust('shadow')).toBeLessThan(scoreAlicizationMemoryProvenanceTrust('dreamt'))
    expect(scoreAlicizationMemorySourceTrustBase('rule-shadow')).toBeLessThan(scoreAlicizationMemorySourceTrustBase('async-llm'))
    expect(isAlicizationWeakMemoryProvenance('shadow')).toBe(true)
    expect(shouldAlicizationMemoryProvenanceEnterLongTermConsolidation('shadow')).toBe(false)
  })

  it('normalizes and ranks provenance consistently across main and renderer memory paths', () => {
    expect(normalizeAlicizationMemoryProvenance('shadow')).toBe('shadow')
    expect(normalizeAlicizationMemoryProvenance('unknown', 'reconstructed')).toBe('reconstructed')
    expect(mapAlicizationFragmentSourceKindToProvenance('dream-fragment')).toBe('dreamt')
    expect(mapAlicizationFragmentSourceKindToProvenance('mind-continuity')).toBe('reconstructed')
    expect(pickDominantAlicizationMemoryProvenance(['shadow', 'remembered', 'remembered'])).toBe('remembered')
    expect(pickDominantAlicizationMemoryProvenance(['shadow', 'shadow', 'remembered'])).toBe('shadow')
  })
})

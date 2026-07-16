import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationProjectRouteAuthorityAllowedOverlaps,
  resolveAlicizationProjectRouteAuthorityRegistry,
} from './project-state-brief'

describe('route authority boundary registry audit', () => {
  it('keeps route ownership on transport, normalization, and persistence instead of reply authorship', () => {
    const registry = resolveAlicizationProjectRouteAuthorityRegistry()
    const domains = [...new Set(registry.map(entry => entry.domain))].sort()

    expect(domains).toEqual([
      'pre-dialogue-transport',
      'return-side-project-awareness',
      'runtime-dialogue-normalization',
      'runtime-turn-persistence',
    ])
    expect(registry).not.toContainEqual(expect.objectContaining({
      mode: 'answer-contract-surface',
    }))
    expect(registry).not.toContainEqual(expect.objectContaining({
      mode: 'answer-governance-enricher',
    }))
    expect(registry).not.toContainEqual(expect.objectContaining({
      mode: 'visible-reply-continuity-surface',
    }))
  })

  it('registers overlaps only for data movement and storage boundaries', () => {
    const allowedOverlaps = resolveAlicizationProjectRouteAuthorityAllowedOverlaps()

    for (const overlap of allowedOverlaps) {
      expect(overlap.reason).not.toMatch(/reply governance|must-do|must-not-do|same-her/i)
    }
  })
})

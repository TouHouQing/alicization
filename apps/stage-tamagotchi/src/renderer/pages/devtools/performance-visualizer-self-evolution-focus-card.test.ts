import { describe, expect, it } from 'vitest'

import { resolveDefaultSelfEvolutionFocusCardId } from './performance-visualizer-self-evolution-focus-card'

describe('performance visualizer self evolution focus card', () => {
  it('prefers repair-path when present', () => {
    expect(resolveDefaultSelfEvolutionFocusCardId([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'persona',
        detail: 'evolution',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'persona drift initiative-preferred-style:light-nudge -> thought trace proactive-opening-guidance-violation:callback-bounded -> continuity anchor governor-intention-rest-1',
      },
    ])).toBe('repair-path')
  })

  it('falls back to first-check before repair-owner', () => {
    expect(resolveDefaultSelfEvolutionFocusCardId([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'renderer',
        detail: 'renderer authority',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'renderer',
        detail: 'renderer authority binding -> playback cues -> driver execution',
      },
    ])).toBe('first-check')
  })

  it('returns null when there are no triage cards', () => {
    expect(resolveDefaultSelfEvolutionFocusCardId([])).toBeNull()
  })
})

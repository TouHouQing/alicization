import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairScrollTarget } from './performance-visualizer-self-evolution-repair-scroll-target'

describe('performance visualizer self evolution repair scroll target snapshot surfaces', () => {
  it('routes validation snapshot actions to the snapshot history block', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'snapshot:validation',
      targetType: 'snapshot',
      targetId: 'validation',
    })).toEqual({
      scrollTargetId: 'self-evolution-snapshot:history',
      targetType: 'snapshot',
      targetId: 'validation',
    })
  })

  it('routes baseline snapshot actions to the snapshot capture controls', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'snapshot:baseline',
      targetType: 'snapshot',
      targetId: 'baseline',
    })).toEqual({
      scrollTargetId: 'self-evolution-snapshot:capture',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })
})

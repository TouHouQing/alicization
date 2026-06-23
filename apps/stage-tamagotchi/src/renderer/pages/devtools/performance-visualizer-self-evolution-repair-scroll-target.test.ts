import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairScrollTarget } from './performance-visualizer-self-evolution-repair-scroll-target'

describe('performance visualizer self evolution repair scroll target', () => {
  it('returns null when there is no active repair surface route', () => {
    expect(buildSelfEvolutionRepairScrollTarget(null)).toBeNull()
  })

  it('maps evidence route to evidence section target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'evidence:runtime-continuity-projection',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })).toEqual({
      scrollTargetId: 'self-evolution-evidence:runtime-continuity-projection',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('maps trace route to trace section target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'trace:trace-timeline',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })).toEqual({
      scrollTargetId: 'self-evolution-trace:trace-timeline',
      targetType: 'trace',
      targetId: 'trace-timeline',
    })
  })

  it('maps selected trace event route to the concrete event section target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'trace:takeover-audit',
      targetType: 'trace',
      targetId: 'selected-trace-event',
    })).toEqual({
      scrollTargetId: 'self-evolution-event:takeover-audit',
      targetType: 'trace',
      targetId: 'selected-trace-event',
    })
  })

  it('maps event route to event kind target id', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'event:governance-normalized',
      targetType: 'event',
      targetId: 'governance-normalized',
    })).toEqual({
      scrollTargetId: 'self-evolution-event:governance-normalized',
      targetType: 'event',
      targetId: 'governance-normalized',
    })
  })

  it('maps snapshot route to snapshot action target id', () => {
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

  it('keeps a body continuity evidence action scroll target anchored on the evidence panel even when the active surface is overridden to trace timeline', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'authority:renderer-rejoin:speech',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })).toEqual({
      scrollTargetId: 'self-evolution-authority:speech-hotspots',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })
  })

  it('keeps speech renderer rejoin trace follow-up anchored on speech authority hotspots so voice repair does not jump back to a generic trace panel', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'authority:renderer-rejoin:speech',
      targetType: 'trace',
      targetId: 'selected-trace-event',
    })).toEqual({
      scrollTargetId: 'self-evolution-authority:speech-hotspots',
      targetType: 'trace',
      targetId: 'selected-trace-event',
    })
  })

  it('maps a live2d renderer rejoin surface to the concrete live2d authority comparison panel', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'authority:renderer-rejoin:live2d',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })).toEqual({
      scrollTargetId: 'self-evolution-authority:live2d-comparison',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })
  })

  it('maps a vrm renderer rejoin surface to the concrete vrm authority comparison panel', () => {
    expect(buildSelfEvolutionRepairScrollTarget({
      surfaceKey: 'authority:renderer-rejoin:vrm',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })).toEqual({
      scrollTargetId: 'self-evolution-authority:vrm-comparison',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })
  })
})

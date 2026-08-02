import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageTraceTargets } from './performance-visualizer-self-evolution-triage-trace-targets'

describe('performance visualizer self evolution triage trace targets', () => {
  it('maps persona diagnostics into their trace sections', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'persona',
        detail: 'selected owner',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'persona',
        detail: 'selected first check',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'persona',
        detail: 'selected trace path',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'trace-consumption',
        'trace-details',
      ],
      'first-check': [
        'trace-details',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-details',
      ],
    })
  })

  it('maps renderer-oriented repair path into authority-adjacent trace sections', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'renderer',
        detail: 'selected owner',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'renderer',
        detail: 'selected first check',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'renderer',
        detail: 'selected trace path',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'first-check': [
        'trace-timeline',
        'selected-trace-event',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
    })
  })

  it('maps structured body diagnostics into renderer-adjacent trace sections', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'selected owner',
        bodyContinuityPhase: 'body-only-hold',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected trace path',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'first-check': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
    })
  })

  it('uses explicit VRM renderer surfaces for the body trace lane', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'selected owner',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected trace path',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'first-check': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
    })
  })

  it('treats structured high-phase body continuity cards as the same renderer-adjacent trace lane even when their wording changes', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected trace path',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
    ])

    expect(targets).toEqual({
      'first-check': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
    })
  })
})

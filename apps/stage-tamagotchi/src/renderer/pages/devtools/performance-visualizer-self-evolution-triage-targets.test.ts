import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageTargets } from './performance-visualizer-self-evolution-triage-targets'

describe('performance visualizer self evolution triage targets', () => {
  it('maps persona triage cards to upstream self-evolution evidence panels', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        detail: 'selected evidence path',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'persona-bias-provenance',
        'proactive-action-chain',
        'proactive-manifestation-chain',
        'runtime-continuity-projection',
      ],
      'first-check': [
        'persona-bias-provenance',
        'proactive-action-chain',
        'proactive-manifestation-chain',
      ],
      'repair-path': [
        'proactive-action-chain',
        'runtime-continuity-projection',
      ],
    })
  })

  it('maps renderer-oriented triage cards to authority and continuity evidence panels', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        detail: 'selected evidence path',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'first-check': [
        'renderer-authority-projection',
      ],
      'repair-path': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })

  it('maps structured body triage cards to embodiment evidence panels', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        detail: 'selected evidence path',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'first-check': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'repair-path': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })

  it('uses explicit renderer rejoin surfaces for body evidence prioritization', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected evidence path',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
    ])

    expect(targets).toEqual({
      'first-check': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'repair-path': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })

  it('uses the explicit speech renderer surface for body evidence prioritization', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected evidence path',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
    ])

    expect(targets).toEqual({
      'first-check': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'repair-path': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })

  it('treats structured high-phase body continuity cards as the same embodiment evidence prioritization even when their wording is no longer body-led rejoin copy', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'selected first check',
        bodyContinuityPhase: 'body-only-hold',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: 'continuity',
        detail: 'selected evidence path',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
    ])

    expect(targets).toEqual({
      'first-check': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'repair-path': [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairNextAction } from './performance-visualizer-self-evolution-repair-next-action'

function session(remainingChecklist: string[]) {
  return {
    completionPercent: remainingChecklist.length > 0 ? 50 : 100,
    completedCount: remainingChecklist.length > 0 ? 1 : 2,
    totalCount: 2,
    completedChecklist: ['event:takeover-audit'],
    remainingChecklist,
    summaryLines: [],
    bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
    survivingVisibleLane: null,
    rendererTarget: 'live2d' as const,
    rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
  }
}

describe('performance visualizer self evolution repair next action', () => {
  it('returns null without both session and closure state', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: null,
      repairClosure: null,
    })).toBeNull()
  })

  it('captures a baseline only after the closure is explicitly closed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: session([]),
      repairClosure: {
        isClosed: true,
        summaryLines: ['ignored'],
      },
    })).toMatchObject({
      kind: 'capture-baseline',
      targetType: 'snapshot',
      targetId: 'baseline',
      detail: expect.stringContaining('repairClosure.isClosed=true'),
    })
  })

  it('captures validation when the checklist is covered but closure stays open', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: session([]),
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toMatchObject({
      kind: 'capture-snapshot',
      targetType: 'snapshot',
      targetId: 'validation',
      detail: expect.stringContaining('remainingChecklist=none'),
    })
  })

  it('uses the first remaining target and preserves the renderer surface override', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: session(['evidence:runtime-continuity-projection']),
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toMatchObject({
      kind: 'inspect-evidence',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:live2d',
      detail: expect.stringContaining('nextChecklistItem=evidence:runtime-continuity-projection'),
    })
  })
})

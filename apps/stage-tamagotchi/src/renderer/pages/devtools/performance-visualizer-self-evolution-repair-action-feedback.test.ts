import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairActionFeedback } from './performance-visualizer-self-evolution-repair-action-feedback'

const action = {
  kind: 'inspect-evidence',
  label: 'Inspect evidence',
  detail: 'unused',
  targetType: 'evidence' as const,
  targetId: 'runtime-continuity-projection',
}

function closure(isClosed: boolean) {
  return {
    isClosed,
    sessionCovered: isClosed,
    hasFreshValidationSnapshot: isClosed,
    samePatternStillPresent: !isClosed,
    prosodyAuthorityRelevant: false,
    prosodyAuthorityValidated: null,
    summaryLines: [],
    bodyContinuityPhase: 'body-carried-to-renderer-rejoin' as const,
    rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
    survivingVisibleLane: null,
  }
}

describe('performance visualizer self evolution repair action feedback', () => {
  it('returns null when no action ran', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: null,
      followupNavigation: null,
      repairClosureBefore: null,
      repairClosureAfter: null,
      snapshotCountBefore: 0,
      snapshotCountAfter: 0,
    })).toBeNull()
  })

  it('reports closure changes with structured facts', () => {
    const result = buildSelfEvolutionRepairActionFeedback({
      executedAction: action,
      followupNavigation: null,
      repairClosureBefore: closure(false),
      repairClosureAfter: closure(true),
      snapshotCountBefore: 1,
      snapshotCountAfter: 1,
    })

    expect(result).toMatchObject({
      tone: 'success',
      summaryLine: 'repairClosure: open -> closed',
      supportingLines: expect.arrayContaining([
        'bodyContinuityPhase=body-carried-to-renderer-rejoin',
        'rendererRejoinSurfaceKey=authority:renderer-rejoin:live2d',
      ]),
    })
  })

  it('reports snapshot counts when a snapshot action increases them', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        ...action,
        kind: 'capture-snapshot',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      followupNavigation: null,
      repairClosureBefore: closure(false),
      repairClosureAfter: closure(false),
      snapshotCountBefore: 2,
      snapshotCountAfter: 3,
    })).toMatchObject({
      tone: 'progress',
      summaryLine: 'snapshotCount: 2 -> 3',
    })
  })

  it('reports the exact follow-up target without category-specific copy', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: action,
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'trace-panel',
      },
      repairClosureBefore: closure(false),
      repairClosureAfter: closure(false),
      snapshotCountBefore: 1,
      snapshotCountAfter: 1,
    })).toMatchObject({
      tone: 'progress',
      summaryLine: 'nextTarget=trace:selected-trace-event',
      detailLine: 'executedAction=inspect-evidence; executedTarget=evidence:runtime-continuity-projection; scrollTargetId=trace-panel',
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorTraceability } from './performance-visualizer-self-evolution-adopted-anchor-traceability'

describe('performance visualizer self evolution adopted anchor traceability', () => {
  it('returns null without an adopted pattern anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: null,
      patternSummaryByKey: {},
      workflowByPatternKey: {},
      patternContextByKey: {},
    })).toBeNull()
  })

  it('reports anchor ids and structured renderer facts', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 140,
        snapshotCapturedAt: 120,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        activePatternKey: 'pattern-1',
        repairOwnerHint: 'renderer-authority',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      patternSummaryByKey: {
        'pattern-1': 'ignored display copy',
      },
      workflowByPatternKey: {
        'pattern-1': {
          steps: [{}, {}],
          validationChecklist: [{}],
        },
      },
      patternContextByKey: {
        'pattern-1': {
          side: 'current',
          previousCapturedAt: 100,
          currentCapturedAt: 120,
        },
      },
    })).toEqual({
      patternKey: 'pattern-1',
      patternSummary: null,
      workflowHeadline: 'workflowSteps=2; validationChecks=1',
      workflowContextLine: 'side=current; previousCapturedAt=100; currentCapturedAt=120',
      supportingLines: [
        'patternKey=pattern-1',
        'snapshotCapturedAt=120',
        'adoptedAt=140',
        'candidateId=candidate-1',
        'decisionTraceId=trace-1',
        'activeThreadId=thread-1',
        'repairOwnerHint=renderer-authority',
        'bodyContinuityPhase=renderer-rejoin-without-body',
        'rendererRejoinSurfaceKey=authority:renderer-rejoin:speech',
        'survivingVisibleLane=face+lipsync+voice-only',
      ],
    })
  })
})

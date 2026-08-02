import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairSession } from './performance-visualizer-self-evolution-repair-session'

describe('performance visualizer self evolution repair session', () => {
  it('returns null without an active workflow focus', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: null,
      viewedEvidencePanels: new Set(),
      viewedTraceSections: new Set(),
      viewedEventKinds: new Set(),
    })).toBeNull()
  })

  it('reports checklist progress and structured renderer facts', () => {
    const result = buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: 'unused',
        summaryLine: 'unused',
        repairOwnerHint: 'body-continuity',
        prosodyAuthorityHint: null,
        bodyContinuityHint: 'unused',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
        rendererTarget: 'speech',
        evidencePanels: new Set(['runtime-continuity-projection', 'renderer-authority-projection']),
        traceSections: new Set(['trace-timeline']),
        eventKinds: new Set(['takeover-audit']),
      },
      viewedEvidencePanels: new Set(['renderer-authority-projection']),
      viewedTraceSections: new Set(),
      viewedEventKinds: new Set(['takeover-audit']),
    })

    expect(result).toMatchObject({
      completionPercent: 50,
      completedCount: 2,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
        'event:takeover-audit',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:trace-timeline',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: 'speech',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      survivingVisibleLane: 'face+lipsync+voice-only',
    })
    expect(result?.summaryLines).toEqual(expect.arrayContaining([
      'completion=2/4 (50%)',
      'remainingEvidence=evidence:runtime-continuity-projection',
      'remainingTrace=trace:trace-timeline',
      'remainingEvents=none',
    ]))
  })
})

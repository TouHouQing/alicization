import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternWorkflow } from './performance-visualizer-self-evolution-focus-history-pattern-workflow'

const pattern = {
  patternKey: 'pattern-1',
  occurrenceCount: 2,
  summaryLine: 'unused',
  focusCardTransition: 'repair-path -> repair-owner',
  traceEventTransition: 'event-takeover -> event-person-state',
  evidenceGained: ['renderer-authority-projection'],
  evidenceLost: [],
  traceTargetsGained: ['trace-timeline'],
  traceTargetsLost: [],
  occurrences: [
    { currentCapturedAt: 200, previousCapturedAt: 100 },
    { currentCapturedAt: 400, previousCapturedAt: 300 },
  ],
}

describe('performance visualizer self evolution focus history pattern workflow', () => {
  it('returns null when guidance is unavailable', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern,
      guidance: null,
    })).toBeNull()
  })

  it('builds a workflow from ids, counts, and captured-at pairs', () => {
    expect(buildSelfEvolutionFocusHistoryPatternWorkflow({
      pattern,
      guidance: {
        governanceLayer: 'renderer-authority',
        governanceLayerDisplay: 'renderer-authority',
        repairOwnerHint: 'renderer-authority',
        recommendedEvidencePanels: ['renderer-authority-projection'],
        recommendedTraceSections: ['trace-timeline'],
        recommendedEventKinds: ['person-state-updated'],
        summaryLine: 'unused',
      },
    })).toEqual({
      headline: 'patternKey=pattern-1; occurrenceCount=2',
      steps: [
        {
          key: 'occurrences',
          title: 'Occurrences',
          detail: 'capturedAtPairs=100->200, 300->400',
        },
        {
          key: 'evidence',
          title: 'Evidence',
          detail: 'evidencePanelIds=renderer-authority-projection',
        },
        {
          key: 'trace',
          title: 'Trace',
          detail: 'traceSectionIds=trace-timeline',
        },
        {
          key: 'events',
          title: 'Events',
          detail: 'eventKinds=person-state-updated',
        },
      ],
      validationChecklist: [
        'diagnosticLayer=renderer-authority',
        'repairOwner=renderer-authority',
        'focusCardTransition=repair-path -> repair-owner',
        'traceEventTransition=event-takeover -> event-person-state',
      ],
    })
  })
})

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildPerformanceVisualizerClosureNavigationState,
  readPerformanceVisualizerClosureNavigationContext,
} from './performance-visualizer-closure-navigation'

describe('performance visualizer closure navigation', () => {
  it('keeps the renderer diagnostics source free of legacy narrative cues', () => {
    const source = [
      'performance-visualizer-closure-navigation.ts',
      'performance-visualizer-self-evolution-adopted-anchor-traceability.ts',
      'performance-visualizer-self-evolution-baseline-adoption.ts',
      'performance-visualizer-self-evolution-focus-history-drilldown.ts',
      'performance-visualizer-self-evolution-focus-history-pattern-guidance.ts',
      'performance-visualizer-self-evolution-focus-history-pattern-workflow.ts',
      'performance-visualizer-self-evolution-focus-history-summary.ts',
      'performance-visualizer-self-evolution-repair-action-feedback.ts',
      'performance-visualizer-self-evolution-repair-next-action.ts',
      'performance-visualizer-self-evolution-repair-outcome.ts',
      'performance-visualizer-self-evolution-repair-session.ts',
      'performance-visualizer-self-evolution-triage-view.ts',
    ]
      .map(fileName => readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8'))
      .join('\n')
      .toLowerCase()
    const prohibitedFragments = [
      [['project', 'state'].join('-'), 'continuity'].join('-'),
      ['project', 'state', 'continuity', 'governance', 'note'].join(''),
      ['phase 1', ' route'].join(''),
      ['same', 'her'].join('-'),
      ['same', 'her'].join(''),
      ['opening', 'guidance'].join(''),
      ['opening', '-guidance'].join(''),
      ['relationship', 'cadence', 'governance', 'note'].join(''),
      ['relationship', ' cadence governance'].join(''),
      ['manifestation', 'cadence', 'summary'].join(''),
      ['callback', ' line'].join(''),
      ['living', ' segment'].join(''),
      ['同一', '生命线'].join(''),
      ['当前', '仅剩'].join(''),
    ]

    for (const fragment of prohibitedFragments)
      expect(source).not.toContain(fragment)
  })

  it('normalizes route query values without reading legacy category fields', () => {
    expect(readPerformanceVisualizerClosureNavigationContext({
      source: ['', 'quick-reply-closure'],
      status: ' drift ',
      focus: 'renderer',
      eventFocus: 'person-state-updated',
    })).toEqual({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'renderer',
      eventFocus: 'person-state-updated',
    })
  })

  it('uses one generic open-closure route and preserves the requested event kind', () => {
    expect(buildPerformanceVisualizerClosureNavigationState({
      source: 'quick-reply-closure',
      status: 'drift',
      focus: 'renderer',
      eventFocus: 'takeover-audit',
    })).toEqual({
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-path',
      preferredScrollTargetId: 'self-evolution-snapshot:capture',
      preferredTraceEventKind: 'takeover-audit',
    })
  })

  it('does not fabricate targets for closed or unrelated entries', () => {
    expect(buildPerformanceVisualizerClosureNavigationState({
      source: 'quick-reply-closure',
      status: 'closed',
      focus: null,
      eventFocus: 'person-state-updated',
    })).toEqual({
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: 'person-state-updated',
    })

    expect(buildPerformanceVisualizerClosureNavigationState({
      source: 'developer-menu',
      status: 'drift',
      focus: null,
      eventFocus: null,
    })).toEqual({
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: null,
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageTraceTargets } from './performance-visualizer-self-evolution-triage-trace-targets'

describe('performance visualizer self evolution triage trace targets', () => {
  it('maps persona-oriented repair path into thought and continuity trace sections', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'persona',
        detail: 'evolution',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'persona',
        detail: 'self-evolution kernel -> active learning strategy -> manifestation/action-ecology/persona-bias',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'persona drift initiative-preferred-style:light-nudge -> thought trace proactive-opening-guidance-violation:callback-bounded -> continuity anchor governor-intention-rest-1',
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
        detail: 'renderer authority',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'renderer',
        detail: 'renderer authority binding -> playback cues -> driver execution',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
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
})

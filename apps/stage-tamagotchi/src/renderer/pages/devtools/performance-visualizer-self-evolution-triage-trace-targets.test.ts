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
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
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

  it('maps relationship-cadence continuity triage into takeover-centered trace sections', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'relationship cadence governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'companionship transition summary -> resident projection -> renderer authority',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance companionship-measured-return -> companionship transition settle cadence -> resident projection bounded-return',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
      'first-check': [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
      'repair-path': [
        'trace-consumption',
        'trace-details',
        'selected-trace-event',
      ],
    })
  })

  it('maps body-continuity triage into renderer-adjacent trace sections that can verify body carry and cue bridge recovery', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> speech authority recovery -> cue bridge recovery',
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

  it('treats explicit vrm renderer rejoin wording as the same body continuity trace lane', () => {
    const targets = buildSelfEvolutionTriageTraceTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> renderer rejoin -> playback cue binding',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> VRM authority recovery -> cue bridge recovery',
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
        detail: 'body and live2d same-segment lock -> playback cue binding -> lock stability audit',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer-rejoin-without-body -> vrm rejoin without body carry -> cue bridge body-loss audit',
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

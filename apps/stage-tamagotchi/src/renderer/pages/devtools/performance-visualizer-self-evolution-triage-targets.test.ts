import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionTriageTargets } from './performance-visualizer-self-evolution-triage-targets'

describe('performance visualizer self evolution triage targets', () => {
  it('maps evolution-oriented triage cards to upstream self-evolution evidence panels', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        'persona-bias-provenance',
        'proactive-manifestation-chain',
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      'first-check': [
        'persona-bias-provenance',
        'proactive-manifestation-chain',
        'private-thought-governance-chain',
      ],
      'repair-path': [
        'private-thought-governance-chain',
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

  it('maps relationship-cadence continuity triage cards to companionship and embodiment evidence panels', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        'companionship-transition-summary',
        'resident-performance-projection',
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'first-check': [
        'companionship-transition-summary',
        'resident-performance-projection',
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      'repair-path': [
        'companionship-transition-summary',
        'resident-performance-projection',
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
    })
  })

  it('maps body-continuity triage cards to embodiment evidence panels that can verify body carry and cue bridge recovery', () => {
    const targets = buildSelfEvolutionTriageTargets([
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
        detail: 'body authority carry -> renderer authority -> playback cue binding',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance body-led-same-segment-carry -> body authority carry -> renderer authority body-only lane -> cue bridge recovery',
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

  it('maps project-state continuity triage cards to project-state continuity evidence panels instead of generic persona drift surfaces', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'project-state continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
    ])

    expect(targets).toEqual({
      'repair-owner': [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      'first-check': [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      'repair-path': [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
    })
  })

  it('treats explicit renderer rejoin continuity wording as body-continuity evidence prioritization instead of generic renderer drift', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> Live2D renderer rejoin -> playback cue binding',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> VRM authority recovery',
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

  it('treats explicit speech renderer rejoin wording as the same body-continuity evidence prioritization instead of generic renderer drift', () => {
    const targets = buildSelfEvolutionTriageTargets([
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body authority carry -> speech renderer rejoin -> playback cue binding',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> speech authority recovery',
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
        detail: 'body-only hold -> renderer recovery gap -> playback cue binding',
        bodyContinuityPhase: 'body-only-hold',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance full-cross-modal-lock -> body-and-live2d-same-segment-lock -> cue bridge stability',
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

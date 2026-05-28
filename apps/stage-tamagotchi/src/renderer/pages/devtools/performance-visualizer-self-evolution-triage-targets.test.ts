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
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
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
})

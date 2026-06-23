import { describe, expect, it } from 'vitest'

import { recommendSelfEvolutionTraceEventId } from './performance-visualizer-self-evolution-triage-trace-event'

describe('performance visualizer self evolution triage trace event', () => {
  it('prefers takeover-audit for persona repair paths when present', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'persona drift initiative-preferred-style:light-nudge -> thought trace proactive-opening-guidance-violation:callback-bounded -> continuity anchor governor-intention-rest-1',
      },
      [
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'turn=care | truth=live-grounded | repair=none',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'fallback=opening-guidance:observe-first',
        },
      ],
    )).toBe('event-takeover')
  })

  it('prefers person-state-updated for renderer repair paths before presence-pulse fallback', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
      },
      [
        {
          id: 'event-presence',
          kind: 'presence-pulse-dispatched',
          summary: 'protective-watch settled after fatigue pressure rose',
        },
        {
          id: 'event-person-state',
          kind: 'person-state-updated',
          summary: 'protective-watch settled after fatigue pressure rose',
        },
      ],
    )).toBe('event-person-state')
  })

  it('returns null when there is no strong trace event recommendation', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'resident',
        detail: 'resident projection',
      },
      [
        {
          id: 'event-learning',
          kind: 'learning-executed',
          summary: 'action=revise | domain=memory',
        },
      ],
    )).toBeNull()
  })

  it('prefers takeover-audit for project-state continuity checks so same-her carry drift lands on the continuity audit first', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
      [
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'phase-1 continuity remains normalized for local digital life.',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'project identity and open loops were not carried strongly enough before the turn.',
        },
      ],
    )).toBe('event-takeover')
  })

  it('prefers takeover-audit for body continuity checks so body-led same-segment carry lands on the continuity audit first', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'body continuity governance',
      },
      [
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'body continuity normalized after renderer authority settled.',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'body line nearly lost the living segment before face and motion rejoined it.',
        },
      ],
    )).toBe('event-takeover')
  })

  it('treats explicit renderer rejoin repair paths as same-segment body continuity checks instead of generic renderer drift', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance renderer rejoin -> body-led-same-segment-carry -> Live2D authority recovery -> cue bridge recovery',
      },
      [
        {
          id: 'event-presence',
          kind: 'presence-pulse-dispatched',
          summary: 'live2d authority pulse rejoined the same body-carried line.',
        },
        {
          id: 'event-person-state',
          kind: 'person-state-updated',
          summary: 'live2d authority was remapped onto the same living segment the body line kept carrying.',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'renderer rejoin was normalized as same-her manifestation recovery.',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'audited that live2d authority rejoined the same living segment instead of branching identity.',
        },
      ],
    )).toBe('event-takeover')
  })

  it('treats structured speech renderer rejoin cards as same-segment body continuity checks even when the wording becomes generic', () => {
    expect(recommendSelfEvolutionTraceEventId(
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance manifestation authority recovery -> cue bridge recovery',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      [
        {
          id: 'event-presence',
          kind: 'presence-pulse-dispatched',
          summary: 'speech authority pulse rejoined the same body-carried line.',
        },
        {
          id: 'event-person-state',
          kind: 'person-state-updated',
          summary: 'speech authority was remapped onto the same living segment the body line kept carrying.',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'speech manifestation rejoin was normalized as same-her recovery.',
        },
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'audited that speech authority rejoined the same living segment instead of branching identity.',
        },
      ],
    )).toBe('event-takeover')
  })
})

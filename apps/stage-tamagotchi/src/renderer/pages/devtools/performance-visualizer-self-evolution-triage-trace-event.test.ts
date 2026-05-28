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
        detail: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor turn=care | closure=grounded-recall | surface=procedural-carry',
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
})

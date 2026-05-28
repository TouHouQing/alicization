import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusPlan } from './performance-visualizer-self-evolution-focus-plan'

describe('performance visualizer self evolution focus plan', () => {
  it('builds a persona-oriented focus plan with evidence, trace sections, and recommended event', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
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
      ],
      'repair-path',
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
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-path',
      highlightedEvidencePanelIds: [
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      explanation: 'Focused repair-path because it points to private-thought-governance-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
    })
  })

  it('builds a renderer-oriented focus plan with renderer authority emphasis', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
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
      ],
      'repair-owner',
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
    )

    expect(plan).toEqual({
      selectedCardId: 'repair-owner',
      highlightedEvidencePanelIds: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ],
      recommendedTraceEventId: 'event-person-state',
      explanation: 'Focused repair-owner because it points to renderer-authority-projection -> runtime-continuity-projection, then narrows into trace-consumption -> trace-timeline -> selected-trace-event and event event-person-state.',
    })
  })

  it('returns an empty focus plan when no triage card is selected', () => {
    const plan = buildSelfEvolutionFocusPlan([], null, [])

    expect(plan).toEqual({
      selectedCardId: null,
      highlightedEvidencePanelIds: [],
      highlightedTraceSectionIds: [],
      recommendedTraceEventId: null,
      explanation: null,
    })
  })

  it('builds a continuity-governance focus plan so remembered familiarity is inspected before it is mistaken for a bug', () => {
    const plan = buildSelfEvolutionFocusPlan(
      [
        {
          id: 'repair-owner',
          label: '修复归属',
          layer: 'continuity',
          detail: 'same-her continuity governance',
        },
        {
          id: 'first-check',
          label: '首查点',
          layer: 'continuity',
          detail: 'candidate trajectory -> remembered familiarity restraint -> identity drift governance',
        },
        {
          id: 'repair-path',
          label: '修复路径',
          layer: null,
          detail: 'continuity governance remembered-familiarity-memory-first -> candidate trajectory same-her room -> identity boundary bounded-growth',
        },
      ],
      'first-check',
      [
        {
          id: 'event-takeover',
          kind: 'takeover-audit',
          summary: 'opening guidance held the room while remembered familiarity stayed memory-first',
        },
        {
          id: 'event-governance',
          kind: 'governance-normalized',
          summary: 'bounded growth preserved identity continuity',
        },
      ],
    )

    expect(plan).toEqual({
      selectedCardId: 'first-check',
      highlightedEvidencePanelIds: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      highlightedTraceSectionIds: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedTraceEventId: 'event-takeover',
      explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-takeover.',
    })
  })
})

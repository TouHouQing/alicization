import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternGuidance } from './performance-visualizer-self-evolution-focus-history-pattern-guidance'

describe('performance visualizer self evolution focus history pattern guidance', () => {
  it('returns null when the pattern does not contain enough signal to infer governance guidance', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-path->repair-path|event:n/a->n/a|evidence:none|trace:none',
      occurrenceCount: 1,
      summaryLine: '1次 修复路径 -> 修复路径',
      focusCardTransition: 'repair-path -> repair-path',
      traceEventTransition: 'n/a -> n/a',
      evidenceGained: [],
      evidenceLost: [],
      traceTargetsGained: [],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 200,
          previousCapturedAt: 100,
        },
      ],
    })).toBeNull()
  })

  it('maps persona-path recurring drift to a persona/private-thought governance repair hint', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
      occurrenceCount: 2,
      summaryLine: '2x repair-owner -> repair-path | event-person-state -> event-takeover | +private-thought-governance-chain -renderer-authority-projection | +selected-trace-event +trace-details -trace-timeline',
      focusCardTransition: 'repair-owner -> repair-path',
      traceEventTransition: 'event-person-state -> event-takeover',
      evidenceGained: ['private-thought-governance-chain'],
      evidenceLost: ['renderer-authority-projection'],
      traceTargetsGained: ['selected-trace-event', 'trace-details'],
      traceTargetsLost: ['trace-timeline'],
      occurrences: [
        {
          currentCapturedAt: 400,
          previousCapturedAt: 300,
        },
        {
          currentCapturedAt: 200,
          previousCapturedAt: 100,
        },
      ],
    })).toEqual({
      governanceLayer: 'persona-thought',
      governanceLayerDisplay: '人格/思绪层',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-details',
        'selected-trace-event',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
        'governance-normalized',
      ],
      summaryLine: '疑似反复出现的人格/思绪漂移。先从私有思绪治理入手，再确认连续性承接，再看显形症状。',
    })
  })

  it('maps renderer-heavy recurring drift to renderer authority governance guidance', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
      occurrenceCount: 3,
      summaryLine: '3x repair-path -> repair-owner | event-takeover -> event-person-state | +renderer-authority-projection -private-thought-governance-chain | +trace-timeline -selected-trace-event -trace-details',
      focusCardTransition: 'repair-path -> repair-owner',
      traceEventTransition: 'event-takeover -> event-person-state',
      evidenceGained: ['renderer-authority-projection'],
      evidenceLost: ['private-thought-governance-chain'],
      traceTargetsGained: ['trace-timeline'],
      traceTargetsLost: ['selected-trace-event', 'trace-details'],
      occurrences: [
        {
          currentCapturedAt: 500,
          previousCapturedAt: 400,
        },
        {
          currentCapturedAt: 300,
          previousCapturedAt: 200,
        },
        {
          currentCapturedAt: 100,
          previousCapturedAt: 50,
        },
      ],
    })).toEqual({
      governanceLayer: 'renderer-authority',
      governanceLayerDisplay: '显形权威层',
      repairOwnerHint: '显形权威',
      prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'person-state-updated',
        'takeover-audit',
      ],
      summaryLine: '疑似反复出现的显形权威漂移。先确认显形权威绑定与当前片段的韵律权威链，再核对同一生命线程上的时间线承接。',
    })
  })

  it('maps remembered-familiarity memory-first recurrence to same-her continuity governance instead of drift repair', () => {
    expect(buildSelfEvolutionFocusHistoryPatternGuidance({
      patternKey: 'focus:repair-owner->first-check|event:event-takeover->event-governance|evidence:+candidate-trajectory-summary,+identity-drift-governance-summary,+proactive-decision-consumption-summary|trace:+trace-consumption,+trace-details',
      occurrenceCount: 2,
      summaryLine: '2x repair-owner -> first-check | event-takeover -> event-governance | +candidate-trajectory-summary +identity-drift-governance-summary +proactive-decision-consumption-summary | +trace-consumption +trace-details',
      focusCardTransition: 'repair-owner -> first-check',
      traceEventTransition: 'event-takeover -> event-governance',
      evidenceGained: [
        'candidate-trajectory-summary',
        'identity-drift-governance-summary',
        'proactive-decision-consumption-summary',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-consumption',
        'trace-details',
      ],
      traceTargetsLost: [],
      occurrences: [
        {
          currentCapturedAt: 420,
          previousCapturedAt: 320,
        },
        {
          currentCapturedAt: 220,
          previousCapturedAt: 120,
        },
      ],
    })).toEqual({
      governanceLayer: 'same-her-continuity',
      governanceLayerDisplay: '同一个她连续性层',
      repairOwnerHint: '连续性治理',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      recommendedTraceSections: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'governance-normalized',
      ],
      summaryLine: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。先核对熟悉感是否仍停留在记忆层，再确认 same-her room 与 bounded-growth 治理是否保持一致。',
    })
  })
})

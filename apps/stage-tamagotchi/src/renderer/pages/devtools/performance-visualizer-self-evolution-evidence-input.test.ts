import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence-input'

describe('performance visualizer self evolution evidence input', () => {
  it('passes same-her summary layers through to the evidence panel builder input', () => {
    expect(buildSelfEvolutionEvidencePanelInput({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: ['decision-consumption: birth observe-first restraint became persona hover and runtime hold'],
      },
      candidateTrajectorySummary: {
        status: 'grounded',
        trajectoryLabel: 'restrained companionship is holding',
        dominantDrift: null,
        lines: ['remembered-familiarity-trajectory: familiarity is staying memory-first while the same-her room holds'],
      },
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: ['remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the same-her room'],
      },
      rejectedActionAlternatives: {
        status: 'grounded',
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        dominantTradeoff: 'presence-before-commentary',
        alternatives: [],
        reasons: ['Counterfactual competition kept hover ahead because remembered familiarity was held as memory before visible closeness widened, so the more direct speak return was intentionally declined.'],
      },
    } as any)).toEqual(expect.objectContaining({
      proactiveDecisionConsumptionSummary: expect.objectContaining({
        decisionMode: 'birth-anchored-restraint',
      }),
      candidateTrajectorySummary: expect.objectContaining({
        trajectoryLabel: 'restrained companionship is holding',
      }),
      identityDriftGovernanceSummary: expect.objectContaining({
        governanceMode: 'bounded-growth',
      }),
      rejectedActionAlternatives: expect.objectContaining({
        selectedOptionId: 'cf-hover',
      }),
    }))
  })
})

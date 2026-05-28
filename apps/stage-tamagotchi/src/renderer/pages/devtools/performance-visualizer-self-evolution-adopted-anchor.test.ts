import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchor } from './performance-visualizer-self-evolution-adopted-anchor'

describe('performance visualizer self evolution adopted anchor', () => {
  it('returns null when there is no adoption history', () => {
    expect(buildSelfEvolutionAdoptedAnchor([])).toBeNull()
  })

  it('projects the latest adopted baseline as the current default continuity anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1200,
        snapshotCapturedAt: 1100,
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        activePatternKey: 'pattern-renderer',
        repairOwnerHint: '显形权威',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1000,
        snapshotCapturedAt: 900,
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        activePatternKey: 'pattern-persona',
        repairOwnerHint: '私有思绪治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        prosodyAuthorityNote: null,
      },
    ])).toEqual({
      adoptedAt: 1200,
      snapshotCapturedAt: 1100,
      candidateId: 'candidate-3',
      decisionTraceId: 'trace-3',
      activeThreadId: 'thread-1',
      focusLabel: 'repair-owner',
      activePatternKey: 'pattern-renderer',
      repairOwnerHint: '显形权威',
      summaryLine: '当前默认连续性参照已经切换到 1100 的已采纳基线。',
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      continuityGovernanceNote: null,
    })
  })

  it('projects a same-her continuity adoption as the current default anchor without recasting it as drift repair', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1400,
        snapshotCapturedAt: 1320,
        candidateId: 'candidate-governance-3',
        decisionTraceId: 'trace-governance-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-same-her-governance',
        repairOwnerHint: '连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual({
      adoptedAt: 1400,
      snapshotCapturedAt: 1320,
      candidateId: 'candidate-governance-3',
      decisionTraceId: 'trace-governance-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-same-her-governance',
      repairOwnerHint: '连续性治理',
      summaryLine: '当前默认连续性参照已经切换到 1320 的已采纳基线。',
      prosodyAuthorityNote: null,
      continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
    })
  })
})

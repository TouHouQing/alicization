import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoptionHistorySummary } from './performance-visualizer-self-evolution-baseline-adoption-history'

describe('performance visualizer self evolution baseline adoption history summary', () => {
  it('returns null when no adoption history exists', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([])).toBeNull()
  })

  it('summarizes adoption history as an audit trail of default-anchor changes', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
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
    ])).toEqual([
      '当前默认连续性参照：快照 1100，候选项 candidate-3，轨迹 trace-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：显形权威；上一轮采纳归属：私有思绪治理。',
      '最新采纳说明：韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    ])
  })

  it('keeps same-her continuity governance visible inside adoption history summaries', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
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
        prosodyAuthorityNote: null,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
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
    ])).toEqual([
      '当前默认连续性参照：快照 1320，候选项 candidate-governance-3，轨迹 trace-governance-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：连续性治理；上一轮采纳归属：显形权威。',
      '最新采纳说明：same-her 连续性治理已经再次确认，可直接进入长期基线。',
    ])
  })
})

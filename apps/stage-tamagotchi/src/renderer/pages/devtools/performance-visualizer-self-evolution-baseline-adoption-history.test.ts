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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1100，候选项 candidate-3，轨迹 trace-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：显形权威；上一轮采纳归属：私有思绪治理。',
      '最新采纳说明：韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    ])
  })

  it('keeps identity-continuity', () => {
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1320，候选项 candidate-governance-3，轨迹 trace-governance-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：连续性治理；上一轮采纳归属：显形权威。',
      '最新采纳说明：same-her 连续性治理已经再次确认，可直接进入长期基线。',
    ])
  })

  it('keeps relationship cadence governance visible inside adoption history summaries', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1500,
        snapshotCapturedAt: 1410,
        candidateId: 'candidate-cadence-3',
        decisionTraceId: 'trace-cadence-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-relationship-cadence-governance',
        repairOwnerHint: '关系节奏治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      },
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1410，候选项 candidate-cadence-3，轨迹 trace-cadence-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：关系节奏治理；上一轮采纳归属：连续性治理。',
      '最新采纳说明：relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
    ])
  })

  it('keeps callback-line cadence visible inside adoption history summaries when the adopted baseline stays on invited measured return', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1510,
        snapshotCapturedAt: 1420,
        candidateId: 'candidate-cadence-callback-4',
        decisionTraceId: 'trace-cadence-callback-4',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-relationship-cadence-governance',
        repairOwnerHint: '关系节奏治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      },
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1420，候选项 candidate-cadence-callback-4，轨迹 trace-cadence-callback-4。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：关系节奏治理；上一轮采纳归属：连续性治理。',
      '最新采纳说明：relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
    ])
  })

  it('keeps project-state continuity governance visible inside adoption history summaries', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1600,
        snapshotCapturedAt: 1520,
        candidateId: 'candidate-project-state-3',
        decisionTraceId: 'trace-project-state-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-project-state-continuity-governance',
        repairOwnerHint: '项目状态连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      },
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1520，候选项 candidate-project-state-3，轨迹 trace-project-state-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：项目状态连续性治理；上一轮采纳归属：连续性治理。',
      '最新采纳说明：项目状态连续性治理已经再次确认，可直接进入长期基线。',
    ])
  })

  it('keeps body continuity governance visible inside adoption history summaries', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1700,
        snapshotCapturedAt: 1620,
        candidateId: 'candidate-body-3',
        decisionTraceId: 'trace-body-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1600,
        snapshotCapturedAt: 1520,
        candidateId: 'candidate-project-state-3',
        decisionTraceId: 'trace-project-state-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-project-state-continuity-governance',
        repairOwnerHint: '项目状态连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1620，候选项 candidate-body-3，轨迹 trace-body-3。',
      '最近 2 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：项目状态连续性治理。',
      '最新身体连续性阶段：身体承接态 -> 显形补回态（speech authority rejoin）。',
      '最新采纳说明：身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    ])
  })

  it('keeps body-only-hold visible inside adoption history summaries even when only the older same-segment body-line note survives', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 2020,
        candidateId: 'candidate-body-only-note-1',
        decisionTraceId: 'trace-body-only-note-1',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 2020，候选项 candidate-body-only-note-1，轨迹 trace-body-only-note-1。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：身体独撑态。',
      '最新采纳说明：身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
    ])
  })

  it('shows the explicit renderer rejoin surface in adoption history when body continuity is already in the rejoin phase', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1710,
        candidateId: 'candidate-body-vrm-4',
        decisionTraceId: 'trace-body-vrm-4',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1710，候选项 candidate-body-vrm-4，轨迹 trace-body-vrm-4。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：身体承接态 -> 显形补回态（VRM authority rejoin）。',
      '最新采纳说明：身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    ])
  })

  it('keeps the renderer rejoin surface generic in adoption history when body continuity is explicit but the returning manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1715,
        candidateId: 'candidate-body-generic-4',
        decisionTraceId: 'trace-body-generic-4',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1715，候选项 candidate-body-generic-4，轨迹 trace-body-generic-4。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：身体承接态 -> 显形补回态。',
      '最新采纳说明：身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    ])
  })

  it('keeps cross-modal-lock visible inside adoption history summaries', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1810,
        candidateId: 'candidate-lock-7',
        decisionTraceId: 'trace-lock-7',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1810，候选项 candidate-lock-7，轨迹 trace-lock-7。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：跨模态重锁态（Live2D authority lock）。',
      '最新采纳说明：身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
    ])
  })

  it('keeps generic cross-modal-lock visible inside adoption history summaries even when structured phase metadata is still missing', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1815,
        candidateId: 'candidate-lock-generic-note-only-7',
        decisionTraceId: 'trace-lock-generic-note-only-7',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1815，候选项 candidate-lock-generic-note-only-7，轨迹 trace-lock-generic-note-only-7。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：跨模态重锁态。',
      '最新采纳说明：身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
    ])
  })

  it('keeps generic renderer-rejoin-without-body visible inside adoption history summaries when the returning manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1915,
        candidateId: 'candidate-body-loss-generic-7',
        decisionTraceId: 'trace-body-loss-generic-7',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1915，候选项 candidate-body-loss-generic-7，轨迹 trace-body-loss-generic-7。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：显形回接失身态。',
      '最新采纳说明：显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    ])
  })

  it('keeps renderer-rejoin-without-body visible inside adoption history summaries as an audit-only anchor', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1910,
        candidateId: 'candidate-body-loss-7',
        decisionTraceId: 'trace-body-loss-7',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1910，候选项 candidate-body-loss-7，轨迹 trace-body-loss-7。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：显形回接失身态（VRM authority rejoin without same-segment body carry）。',
      '最新采纳说明：显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    ])
  })

  it('keeps quieter surviving-lane truth visible inside adoption history summaries when only face, lipsync, and voice still carry the identity-continuity', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1925,
        candidateId: 'candidate-face-voice-only-7',
        decisionTraceId: 'trace-face-voice-only-7',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1925，候选项 candidate-face-voice-only-7，轨迹 trace-face-voice-only-7。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：显形回接失身态（表情、口型、声音 identity-continuity',
      '最新采纳说明：显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
    ])
  })

  it('prefers structured surviving visible lane metadata inside adoption history summaries even when the stored governance note is still generic renderer-rejoin-without-body wording', () => {
    expect(buildSelfEvolutionBaselineAdoptionHistorySummary([
      {
        snapshotCapturedAt: 1935,
        candidateId: 'candidate-face-voice-only-structured-1',
        decisionTraceId: 'trace-face-voice-only-structured-1',
        repairOwnerHint: '身体连续性治理',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
    ])).toEqual([
      '当前默认连续性参照：快照 1935，候选项 candidate-face-voice-only-structured-1，轨迹 trace-face-voice-only-structured-1。',
      '最近 1 次基线采纳均带有显式审计记录。',
      '最新采纳归属：身体连续性治理；上一轮采纳归属：n/a。',
      '最新身体连续性阶段：显形回接失身态（表情、口型、声音 identity-continuity',
      '最新采纳说明：显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    ])
  })
})

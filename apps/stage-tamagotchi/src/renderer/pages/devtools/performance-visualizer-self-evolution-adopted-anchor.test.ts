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
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: null,
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: null,
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
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      prosodyAuthorityNote: null,
      continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      relationshipCadenceGovernanceNote: null,
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: null,
    })
  })

  it('projects a relationship cadence adoption as the current default anchor without reducing it to a generic repair note', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
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
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      },
    ])).toEqual({
      adoptedAt: 1500,
      snapshotCapturedAt: 1410,
      candidateId: 'candidate-cadence-3',
      decisionTraceId: 'trace-cadence-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-relationship-cadence-governance',
      repairOwnerHint: '关系节奏治理',
      summaryLine: '当前默认连续性参照已经切换到 1410 的已采纳基线。',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      prosodyAuthorityNote: null,
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: null,
    })
  })

  it('projects a restrained callback-line cadence adoption without broadening it into a generic long-term relationship note', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
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
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      },
    ])).toEqual({
      adoptedAt: 1510,
      snapshotCapturedAt: 1420,
      candidateId: 'candidate-cadence-callback-4',
      decisionTraceId: 'trace-cadence-callback-4',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-relationship-cadence-governance',
      repairOwnerHint: '关系节奏治理',
      summaryLine: '当前默认连续性参照已经切换到 1420 的已采纳基线。',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      prosodyAuthorityNote: null,
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: null,
    })
  })

  it('projects a project-state continuity adoption as the current default anchor without collapsing it back into generic same-her repair wording', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
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
        projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])).toEqual({
      adoptedAt: 1600,
      snapshotCapturedAt: 1520,
      candidateId: 'candidate-project-state-3',
      decisionTraceId: 'trace-project-state-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-project-state-continuity-governance',
      repairOwnerHint: '项目状态连续性治理',
      summaryLine: '当前默认连续性参照已经切换到 1520 的已采纳基线。',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      prosodyAuthorityNote: null,
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: null,
      projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      bodyContinuityGovernanceNote: null,
    })
  })

  it('projects a body continuity adoption as the current default anchor without flattening it into a generic renderer or same-her note', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
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
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
    ])).toEqual({
      adoptedAt: 1700,
      snapshotCapturedAt: 1620,
      candidateId: 'candidate-body-3',
      decisionTraceId: 'trace-body-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-body-continuity-governance',
      repairOwnerHint: '身体连续性治理',
      summaryLine: '当前默认连续性参照已经切换到 1620 的已采纳基线。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      prosodyAuthorityNote: null,
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: null,
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    })
  })

  it('projects a speech body continuity adoption as the current default anchor without flattening it into a generic voice or same-her note', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1760,
        snapshotCapturedAt: 1680,
        candidateId: 'candidate-body-speech-3',
        decisionTraceId: 'trace-body-speech-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
    ])).toEqual({
      adoptedAt: 1760,
      snapshotCapturedAt: 1680,
      candidateId: 'candidate-body-speech-3',
      decisionTraceId: 'trace-body-speech-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-body-continuity-governance',
      repairOwnerHint: '身体连续性治理',
      summaryLine: '当前默认连续性参照已经切换到 1680 的已采纳基线。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      prosodyAuthorityNote: null,
      continuityGovernanceNote: null,
      relationshipCadenceGovernanceNote: null,
      projectStateContinuityGovernanceNote: null,
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    })
  })
})

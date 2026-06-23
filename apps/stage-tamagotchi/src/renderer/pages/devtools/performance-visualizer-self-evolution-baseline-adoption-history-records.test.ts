import { describe, expect, it } from 'vitest'

import { appendSelfEvolutionBaselineAdoptionHistory } from './performance-visualizer-self-evolution-baseline-adoption-history-records'

const baseRecord = {
  version: 'self-evolution-baseline-adoption/v1',
  adoptedAt: 1000,
  snapshotCapturedAt: 900,
  candidateId: 'candidate-2',
  decisionTraceId: 'trace-2',
  activeThreadId: 'thread-1',
  selectedCardId: 'repair-path',
  activePatternKey: 'pattern-persona',
  repairOwnerHint: '私有思绪治理',
  adoptionMode: 'adopt-now' as const,
  summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
  prosodyAuthorityNote: null,
  continuityGovernanceNote: null,
  relationshipCadenceGovernanceNote: null,
  projectStateContinuityGovernanceNote: null,
  bodyContinuityGovernanceNote: null,
}

describe('performance visualizer self evolution baseline adoption history records', () => {
  it('returns the existing history when there is no new adoption record', () => {
    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: null,
    })).toEqual([baseRecord])
  })

  it('prepends a unique adoption record, sorts by adoptedAt descending, and keeps only the latest 10', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      ...baseRecord,
      adoptedAt: 1000 - index * 100,
      snapshotCapturedAt: 900 - index * 100,
      decisionTraceId: `trace-${index}`,
      candidateId: `candidate-${index}`,
    }))

    const newRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      snapshotCapturedAt: 4900,
      decisionTraceId: 'trace-new',
      candidateId: 'candidate-new',
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history,
      record: newRecord,
    })).toEqual([
      newRecord,
      ...history.slice(0, 9),
    ])
  })

  it('does not append a duplicate record for the same snapshot, trace, and adoption mode', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a prosody authority note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a continuity governance note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a relationship cadence governance note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a restrained callback-line cadence note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a project-state continuity governance note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains a body continuity governance note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains cross-modal-lock phase metadata', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      bodyContinuityPhase: 'full-cross-modal-lock' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains renderer-rejoin-without-body phase metadata and audit note', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm' as const,
      bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
    ])
  })

  it('refreshes an existing record when the same adoption key later gains structured surviving visible lane metadata', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      bodyContinuityPhase: 'renderer-rejoin-without-body' as const,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only' as const,
      bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
    ])
  })

  it('merges multiple missing governance fields and body continuity metadata during the same duplicate refresh', () => {
    const duplicateRecord = {
      ...baseRecord,
      adoptedAt: 5000,
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      bodyContinuityPhase: 'full-cross-modal-lock' as const,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d' as const,
      bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
    }

    expect(appendSelfEvolutionBaselineAdoptionHistory({
      history: [baseRecord],
      record: duplicateRecord,
    })).toEqual([
      {
        ...baseRecord,
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
    ])
  })
})

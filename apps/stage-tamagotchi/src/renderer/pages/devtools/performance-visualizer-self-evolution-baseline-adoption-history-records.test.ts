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
})

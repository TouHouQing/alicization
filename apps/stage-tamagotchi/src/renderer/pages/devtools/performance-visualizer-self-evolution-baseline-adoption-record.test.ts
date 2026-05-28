import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoptionRecord } from './performance-visualizer-self-evolution-baseline-adoption-record'

describe('performance visualizer self evolution baseline adoption record', () => {
  it('returns null when adoption is not in adopt-now mode or there is no latest snapshot', () => {
    expect(buildSelfEvolutionBaselineAdoptionRecord({
      baselineAdoption: {
        mode: 'observe',
        summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
        detailLine: '它目前只能算暂定基线。',
        supportingLines: [
          '韵律权威链尚未回到当前片段，因此不能进入长期基线。',
        ],
      },
      latestSnapshot: null,
      activePatternKey: 'pattern-persona',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityNote: null,
      capturedAt: 1000,
    })).toBeNull()
  })

  it('builds an explicit adoption record for a trusted baseline promoted now', () => {
    expect(buildSelfEvolutionBaselineAdoptionRecord({
      baselineAdoption: {
        mode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照。',
        supportingLines: [
          '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'post repair baseline',
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-2',
        capturedAt: 900,
      },
      activePatternKey: 'pattern-persona',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      capturedAt: 1000,
    })).toEqual({
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
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      continuityGovernanceNote: null,
    })
  })

  it('falls back to adoption supporting lines when no explicit prosody note is passed', () => {
    expect(buildSelfEvolutionBaselineAdoptionRecord({
      baselineAdoption: {
        mode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照。',
        supportingLines: [
          '最新快照已经通过 trusted 判断。',
          '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-5',
        decisionTraceId: 'trace-5',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-path',
        explanation: 'adopt from supporting lines',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['trace-consumption'],
        recommendedTraceEventId: 'event-5',
        capturedAt: 1200,
      },
      activePatternKey: 'pattern-renderer',
      repairOwnerHint: '显形权威',
      prosodyAuthorityNote: null,
      capturedAt: 1300,
    })).toEqual({
      version: 'self-evolution-baseline-adoption/v1',
      adoptedAt: 1300,
      snapshotCapturedAt: 1200,
      candidateId: 'candidate-5',
      decisionTraceId: 'trace-5',
      activeThreadId: 'thread-2',
      selectedCardId: 'repair-path',
      activePatternKey: 'pattern-renderer',
      repairOwnerHint: '显形权威',
      adoptionMode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      continuityGovernanceNote: null,
    })
  })

  it('captures a same-her continuity governance note when the adopted baseline was trusted for memory-first continuity reasons', () => {
    expect(buildSelfEvolutionBaselineAdoptionRecord({
      baselineAdoption: {
        mode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照。',
        supportingLines: [
          '最新快照已经通过 trusted 判断。',
          'same-her 连续性治理已经再次确认，可直接进入长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-governance-3',
        decisionTraceId: 'trace-governance-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'same-her governance reconfirmed',
        highlightedEvidencePanelIds: [
          'candidate-trajectory-summary',
          'identity-drift-governance-summary',
        ],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-details'],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 1320,
      },
      activePatternKey: 'pattern-same-her-governance',
      repairOwnerHint: '连续性治理',
      prosodyAuthorityNote: null,
      capturedAt: 1400,
    })).toEqual({
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
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryComparison } from './performance-visualizer-self-evolution-focus-history-comparison'

describe('performance visualizer self evolution focus history comparison', () => {
  it('returns null when either side of the transition cannot be resolved from history', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: ['private-thought-governance-chain'],
          highlightedTraceSectionIds: ['trace-details'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 100,
        },
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: ['focus-card: repair-owner -> repair-path'],
      },
    })).toBeNull()
  })

  it('builds a structured previous/current comparison with gained and lost evidence', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-2',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-2',
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-details',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 200,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 100,
        },
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> repair-path',
          'evidence-targets: renderer-authority-projection -> runtime-continuity-projection => private-thought-governance-chain -> runtime-continuity-projection',
          'trace-targets: trace-consumption -> trace-timeline => trace-consumption -> trace-details -> selected-trace-event',
          'trace-event: event-person-state -> event-takeover',
        ],
      },
    })).toEqual({
      previous: {
        capturedAt: 100,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-person-state',
        evidenceTargets: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-timeline',
        ],
      },
      current: {
        capturedAt: 200,
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-details',
          'selected-trace-event',
        ],
      },
      focusCardChanged: true,
      traceEventChanged: true,
      evidenceGained: [
        'private-thought-governance-chain',
      ],
      evidenceLost: [
        'renderer-authority-projection',
      ],
      traceTargetsGained: [
        'trace-details',
        'selected-trace-event',
      ],
      traceTargetsLost: [
        'trace-timeline',
      ],
      summaryLines: [
        '聚焦卡片：修复归属 -> 修复路径',
        '候选项：candidate-1 -> candidate-2',
        '决策轨迹：trace-1 -> trace-2',
        '轨迹事件：人格状态事件 -> 接管事件',
        '新增证据面板：私有思绪治理链',
        '移除证据面板：显形权威投影',
        '新增轨迹段：轨迹细节，选中轨迹事件',
        '移除轨迹段：轨迹时间线',
      ],
    })
  })

  it('keeps stable identifiers but still reports pure event drift when the focus frame stayed the same', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-1',
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
          ],
          highlightedTraceSectionIds: [
            'trace-details',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 200,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-0',
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
          ],
          highlightedTraceSectionIds: [
            'trace-details',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 100,
        },
      ],
      transition: {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-1',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          'trace-event: event-governance -> event-takeover',
        ],
      },
    })).toEqual({
      previous: {
        capturedAt: 100,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-governance',
        evidenceTargets: [
          'private-thought-governance-chain',
        ],
        traceTargets: [
          'trace-details',
        ],
      },
      current: {
        capturedAt: 200,
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: [
          'private-thought-governance-chain',
        ],
        traceTargets: [
          'trace-details',
        ],
      },
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: [],
      evidenceLost: [],
      traceTargetsGained: [],
      traceTargetsLost: [],
      summaryLines: [
        '聚焦卡片：稳定（修复路径）',
        '候选项：稳定（candidate-1）',
        '决策轨迹：稳定（trace-1）',
        '轨迹事件：治理事件 -> 接管事件',
      ],
    })
  })

  it('describes same-her continuity transitions as governance confirmation rather than generic drift', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-governance-2',
          decisionTraceId: 'trace-governance-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'same-her governance reconfirmed',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
            'identity-drift-governance-summary',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-details',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 1320,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-governance-1',
          decisionTraceId: 'trace-governance-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'same-her governance under review',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1180,
        },
      ],
      transition: {
        currentCapturedAt: 1320,
        previousCapturedAt: 1180,
        currentDecisionTraceId: 'trace-governance-2',
        previousDecisionTraceId: 'trace-governance-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> first-check',
          'evidence-targets: candidate-trajectory-summary -> proactive-decision-consumption-summary => candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary',
          'trace-targets: trace-consumption => trace-consumption -> trace-details',
          'trace-event: event-takeover -> event-governance',
        ],
      },
    })).toEqual({
      previous: {
        capturedAt: 1180,
        candidateId: 'candidate-governance-1',
        decisionTraceId: 'trace-governance-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-takeover',
        evidenceTargets: [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
        ],
        traceTargets: [
          'trace-consumption',
        ],
      },
      current: {
        capturedAt: 1320,
        candidateId: 'candidate-governance-2',
        decisionTraceId: 'trace-governance-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        recommendedTraceEventId: 'event-governance',
        evidenceTargets: [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-details',
        ],
      },
      focusCardChanged: true,
      traceEventChanged: true,
      evidenceGained: [
        'identity-drift-governance-summary',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-details',
      ],
      traceTargetsLost: [],
      summaryLines: [
        '聚焦卡片：修复归属 -> 首查点',
        '候选项：candidate-governance-1 -> candidate-governance-2',
        '决策轨迹：trace-governance-1 -> trace-governance-2',
        '轨迹事件：接管事件 -> 治理事件',
        '新增证据面板：身份漂移治理摘要',
        '新增轨迹段：轨迹细节',
      ],
    })
  })
})

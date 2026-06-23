import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryComparison } from './performance-visualizer-self-evolution-focus-history-comparison'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

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
      bodyContinuityPhase: null,
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
      bodyContinuityPhase: null,
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
      bodyContinuityPhase: null,
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

  it('keeps body-led continuity evidence changes explicit when the body line is the living-segment carrier before face and motion rejoin', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-2',
          decisionTraceId: 'trace-body-2',
          activeThreadId: 'thread-body-2',
          selectedCardId: 'repair-owner',
          explanation: 'body continuity reconfirmed',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 320,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-1',
          decisionTraceId: 'trace-body-1',
          activeThreadId: 'thread-body-1',
          selectedCardId: 'repair-owner',
          explanation: 'renderer authority only',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 220,
        },
      ],
      transition: {
        currentCapturedAt: 320,
        previousCapturedAt: 220,
        currentDecisionTraceId: 'trace-body-2',
        previousDecisionTraceId: 'trace-body-1',
        changedFocusCard: false,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'evidence-targets: renderer-authority-projection => renderer-authority-projection -> runtime-continuity-projection',
          'trace-targets: trace-timeline => trace-consumption -> trace-timeline -> selected-trace-event',
          'trace-event: event-person-state -> event-takeover',
        ],
      },
    })).toEqual({
      previous: {
        capturedAt: 220,
        candidateId: 'candidate-body-1',
        decisionTraceId: 'trace-body-1',
        activeThreadId: 'thread-body-1',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-person-state',
        evidenceTargets: [
          'renderer-authority-projection',
        ],
        traceTargets: [
          'trace-timeline',
        ],
      },
      current: {
        capturedAt: 320,
        candidateId: 'candidate-body-2',
        decisionTraceId: 'trace-body-2',
        activeThreadId: 'thread-body-2',
        selectedCardId: 'repair-owner',
        recommendedTraceEventId: 'event-takeover',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        evidenceTargets: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        traceTargets: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
      },
      focusCardChanged: false,
      traceEventChanged: true,
      evidenceGained: [
        'runtime-continuity-projection',
      ],
      evidenceLost: [],
      traceTargetsGained: [
        'trace-consumption',
        'selected-trace-event',
      ],
      traceTargetsLost: [],
      summaryLines: [
        '身体连续性：运行时连续性投影刚被补入，说明这段 same living segment 正从身体承接态向 Live2D 显形补回态靠拢。',
        '聚焦卡片：稳定（修复归属）',
        '候选项：candidate-body-1 -> candidate-body-2',
        '决策轨迹：trace-body-1 -> trace-body-2',
        '轨迹事件：人格状态事件 -> 接管事件',
        '新增证据面板：运行时连续性投影',
        '新增轨迹段：轨迹消费，选中轨迹事件',
      ],
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
    })
  })

  it('prefers an explicit runtime body continuity phase when the current projection already knows the renderer is rejoining the same living segment', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-runtime-2',
          decisionTraceId: 'trace-runtime-2',
          activeThreadId: 'thread-runtime-2',
          selectedCardId: 'repair-owner',
          explanation: 'runtime body continuity explicitly rejoined',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 520,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-runtime-1',
          decisionTraceId: 'trace-runtime-1',
          activeThreadId: 'thread-runtime-1',
          selectedCardId: 'repair-owner',
          explanation: 'body continuity still implicit',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 420,
        },
      ],
      transition: {
        currentCapturedAt: 520,
        previousCapturedAt: 420,
        currentDecisionTraceId: 'trace-runtime-2',
        previousDecisionTraceId: 'trace-runtime-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: false,
        lines: [],
      },
    })).toMatchObject({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      summaryLines: [
        '身体连续性：运行时连续性投影刚被补入，说明这段 same living segment 正从身体承接态向 VRM 显形补回态靠拢。',
        '聚焦卡片：稳定（修复归属）',
        '候选项：candidate-runtime-1 -> candidate-runtime-2',
        '决策轨迹：trace-runtime-1 -> trace-runtime-2',
        '轨迹事件：稳定（接管事件）',
      ],
    })
  })

  it('prefers explicit structured body continuity state from history before heuristic evidence pairing when wording and evidence are partial', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-structured-2',
          decisionTraceId: 'trace-structured-2',
          activeThreadId: 'thread-structured-2',
          selectedCardId: 'repair-owner',
          explanation: 'same-her manifestation recovery remains explicit',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 620,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-structured-1',
          decisionTraceId: 'trace-structured-1',
          activeThreadId: 'thread-structured-1',
          selectedCardId: 'repair-owner',
          explanation: 'body continuity was already explicit one snapshot earlier',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 520,
        },
      ],
      transition: {
        currentCapturedAt: 620,
        previousCapturedAt: 520,
        currentDecisionTraceId: 'trace-structured-2',
        previousDecisionTraceId: 'trace-structured-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          'trace-event: event-person-state -> event-takeover',
        ],
      },
    })).toMatchObject({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      summaryLines: [
        '身体连续性：运行时连续性投影刚被补入，说明这段 same living segment 正从身体承接态向 speech 显形补回态靠拢。',
        '聚焦卡片：稳定（修复归属）',
        '候选项：candidate-structured-1 -> candidate-structured-2',
        '决策轨迹：trace-structured-1 -> trace-structured-2',
        '轨迹事件：人格状态事件 -> 接管事件',
      ],
    })
  })

  it('keeps body-only-hold visible inside comparison summaries so the body line carrying the same living segment is not flattened away', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-2',
          decisionTraceId: 'trace-body-only-2',
          activeThreadId: 'thread-body-only',
          selectedCardId: 'repair-owner',
          explanation: 'body line still alone carries same segment',
          bodyContinuityPhase: 'body-only-hold',
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 220,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-1',
          decisionTraceId: 'trace-body-only-1',
          activeThreadId: 'thread-body-only',
          selectedCardId: 'repair-owner',
          explanation: 'body line still carries inward',
          bodyContinuityPhase: 'body-only-hold',
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 120,
        },
      ],
      transition: {
        currentCapturedAt: 220,
        previousCapturedAt: 120,
        currentDecisionTraceId: 'trace-body-only-2',
        previousDecisionTraceId: 'trace-body-only-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          'trace-event: event-person-state -> event-governance',
        ],
      },
    })).toMatchObject({
      bodyContinuityPhase: 'body-only-hold',
      summaryLines: [
        '身体连续性：身体线仍在独自托住同一段 living segment，当前还没有进入显形补回。',
        '聚焦卡片：稳定（修复归属）',
        '候选项：candidate-body-only-1 -> candidate-body-only-2',
        '决策轨迹：trace-body-only-1 -> trace-body-only-2',
        '轨迹事件：人格状态事件 -> 治理事件',
      ],
    })
  })

  it('restores body-only-hold from the legacy same-her note when the structured phase is missing from both snapshots', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-note-2',
          decisionTraceId: 'trace-body-note-2',
          activeThreadId: 'thread-body-note',
          selectedCardId: 'repair-owner',
          explanation: legacyNote,
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
          ],
          highlightedTraceSectionIds: [
            'trace-details',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 720,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-note-1',
          decisionTraceId: 'trace-body-note-1',
          activeThreadId: 'thread-body-note',
          selectedCardId: 'repair-path',
          explanation: 'body continuity still under review',
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
          ],
          highlightedTraceSectionIds: [
            'trace-details',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 620,
        },
      ],
      transition: {
        currentCapturedAt: 720,
        previousCapturedAt: 620,
        currentDecisionTraceId: 'trace-body-note-2',
        previousDecisionTraceId: 'trace-body-note-1',
        changedFocusCard: true,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-path -> repair-owner',
          'trace-event: event-takeover -> event-governance',
        ],
      },
    })).toMatchObject({
      bodyContinuityPhase: 'body-only-hold',
      summaryLines: [
        '身体连续性：身体线仍在独自托住同一段 living segment，当前还没有进入显形补回。',
        '聚焦卡片：修复路径 -> 修复归属',
        '候选项：candidate-body-note-1 -> candidate-body-note-2',
        '决策轨迹：trace-body-note-1 -> trace-body-note-2',
        '轨迹事件：接管事件 -> 治理事件',
      ],
    })
  })

  it('keeps the structured body continuity governance note on both comparison sides when the snapshot chain already carries it', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-note-2',
          decisionTraceId: 'trace-body-note-2',
          activeThreadId: 'thread-body-note',
          selectedCardId: 'repair-owner',
          explanation: 'snapshot-body-note-2',
          bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
          highlightedEvidencePanelIds: [
            'private-thought-governance-chain',
          ],
          highlightedTraceSectionIds: [
            'trace-details',
          ],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 820,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-note-1',
          decisionTraceId: 'trace-body-note-1',
          activeThreadId: 'thread-body-note',
          selectedCardId: 'repair-path',
          explanation: 'snapshot-body-note-1',
          bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，Live2D 显形权威仍在沿同一条连续身体线补回。',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 720,
        },
      ],
      transition: {
        currentCapturedAt: 820,
        previousCapturedAt: 720,
        currentDecisionTraceId: 'trace-body-note-2',
        previousDecisionTraceId: 'trace-body-note-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-path -> repair-owner',
          'trace-event: event-takeover -> event-governance',
        ],
      },
    })).toMatchObject({
      previous: {
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，Live2D 显形权威仍在沿同一条连续身体线补回。',
      },
      current: {
        bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
      },
      bodyContinuityPhase: 'body-only-hold',
    })
  })

  it('keeps full-cross-modal-lock visible inside comparison summaries even when the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-2',
          decisionTraceId: 'trace-lock-2',
          activeThreadId: 'thread-lock-2',
          selectedCardId: 'repair-path',
          explanation: 'cross-modal lock remains explicit',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-body-lock',
          capturedAt: 820,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-1',
          decisionTraceId: 'trace-lock-1',
          activeThreadId: 'thread-lock-1',
          selectedCardId: 'repair-owner',
          explanation: 'cross-modal lock was already explicit',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'runtime-continuity-projection',
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 720,
        },
      ],
      transition: {
        currentCapturedAt: 820,
        previousCapturedAt: 720,
        currentDecisionTraceId: 'trace-lock-2',
        previousDecisionTraceId: 'trace-lock-1',
        changedFocusCard: true,
        changedEvidenceTargets: false,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> repair-path',
          'trace-targets: trace-consumption -> trace-timeline => trace-consumption -> selected-trace-event',
          'trace-event: event-person-state -> event-body-lock',
        ],
      },
      bodyContinuityPhase: 'full-cross-modal-lock',
    })).toMatchObject({
      bodyContinuityPhase: 'full-cross-modal-lock',
      summaryLines: [
        '身体连续性：身体线与显形权威已经共同锁回同一段 living segment，而不是短暂同步。',
        '聚焦卡片：修复归属 -> 修复路径',
        '候选项：candidate-lock-1 -> candidate-lock-2',
        '决策轨迹：trace-lock-1 -> trace-lock-2',
        '轨迹事件：人格状态事件 -> event-body-lock',
        '新增轨迹段：选中轨迹事件',
        '移除轨迹段：轨迹时间线',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body visible inside comparison summaries even when the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionFocusHistoryComparison({
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-2',
          decisionTraceId: 'trace-body-loss-2',
          activeThreadId: 'thread-body-loss-2',
          selectedCardId: 'repair-path',
          explanation: 'visible recovery without body carry remains explicit',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'selected-trace-event',
          ],
          recommendedTraceEventId: 'event-body-loss',
          capturedAt: 920,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-1',
          decisionTraceId: 'trace-body-loss-1',
          activeThreadId: 'thread-body-loss-1',
          selectedCardId: 'repair-owner',
          explanation: 'visible recovery without body carry was already explicit',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: [
            'trace-consumption',
            'trace-timeline',
          ],
          recommendedTraceEventId: 'event-person-state',
          capturedAt: 820,
        },
      ],
      transition: {
        currentCapturedAt: 920,
        previousCapturedAt: 820,
        currentDecisionTraceId: 'trace-body-loss-2',
        previousDecisionTraceId: 'trace-body-loss-1',
        changedFocusCard: true,
        changedEvidenceTargets: false,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          'focus-card: repair-owner -> repair-path',
          'trace-targets: trace-consumption -> trace-timeline => trace-consumption -> selected-trace-event',
          'trace-event: event-person-state -> event-body-loss',
        ],
      },
      bodyContinuityPhase: 'renderer-rejoin-without-body',
    })).toMatchObject({
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      summaryLines: [
        '身体连续性：显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。',
        '聚焦卡片：修复归属 -> 修复路径',
        '候选项：candidate-body-loss-1 -> candidate-body-loss-2',
        '决策轨迹：trace-body-loss-1 -> trace-body-loss-2',
        '轨迹事件：人格状态事件 -> event-body-loss',
        '新增轨迹段：选中轨迹事件',
        '移除轨迹段：轨迹时间线',
      ],
    })
  })
})

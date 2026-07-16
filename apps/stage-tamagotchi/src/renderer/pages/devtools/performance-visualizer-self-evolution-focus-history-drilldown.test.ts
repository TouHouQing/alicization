import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryDrilldown } from './performance-visualizer-self-evolution-focus-history-drilldown'

describe('performance visualizer self evolution focus history drilldown', () => {
  it('returns an empty list when there are not enough snapshots to compare', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([])).toEqual([])
    expect(buildSelfEvolutionFocusHistoryDrilldown([
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
    ])).toEqual([])
  })

  it('reports the exact adjacent snapshot pair where focus drift happened', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 300,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-2',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
    ])).toEqual([
      {
        currentCapturedAt: 300,
        previousCapturedAt: 200,
        currentDecisionTraceId: 'trace-3',
        previousDecisionTraceId: 'trace-2',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：运行时连续性投影仍在，VRM 显形补回与选中轨迹事件重新进入，说明这段 same living segment 更像先由身体线托住，再沿同一条身体线补回 VRM 显形。',
          '聚焦卡片：修复归属 -> 修复路径',
          '证据面板：显形权威投影 -> 运行时连续性投影 => 私有思绪治理链 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 -> 选中轨迹事件 => 轨迹消费 -> 轨迹细节',
          '轨迹事件：人格状态事件 -> 接管事件',
        ],
      },
    ])
  })

  it('skips adjacent pairs that stayed stable and keeps only the drifting transition', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 300,
      },
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
        ],
        recommendedTraceEventId: 'event-governance',
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
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '聚焦卡片：修复归属 -> 修复路径',
          '证据面板：显形权威投影 -> 运行时连续性投影 => 私有思绪治理链 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹细节',
          '轨迹事件：人格状态事件 -> 治理事件',
        ],
      },
    ])
  })

  it('keeps an adjacent pair when only the recommended trace event drifted', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
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
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: false,
        changedEvidenceTargets: false,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          '轨迹事件：治理事件 -> 接管事件',
        ],
      },
    ])
  })

  it('adds a body-continuity lead line when runtime continuity stays while renderer authority and selected event re-enter on the same living segment', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-2',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：运行时连续性投影仍在，显形权威投影与选中轨迹事件重新进入，说明这段 same living segment 更像先由身体线托住，再沿同一条身体线补回显形权威。',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('names the speech renderer rejoin surface when explicit same-segment body continuity evidence is present', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-2',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-2',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-2',
        previousDecisionTraceId: 'trace-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：运行时连续性投影仍在，speech 显形补回与选中轨迹事件重新进入，说明这段 same living segment 更像先由身体线托住，再沿同一条身体线补回 speech 显形。',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('keeps full-cross-modal-lock explicit in drilldown lead lines instead of flattening it into renderer rejoin wording', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-2',
        decisionTraceId: 'trace-lock-2',
        activeThreadId: 'thread-lock',
        selectedCardId: 'repair-owner',
        explanation: 'cross-modal lock persists',
        bodyContinuityPhase: 'full-cross-modal-lock',
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
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-1',
        decisionTraceId: 'trace-lock-1',
        activeThreadId: 'thread-lock',
        selectedCardId: 'repair-path',
        explanation: 'cross-modal lock under review',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-lock-2',
        previousDecisionTraceId: 'trace-lock-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：当前已进入跨模态重锁态，身体线与 Live2D 显形权威仍共同锁在同一段 living segment 上，不应把这段稳定回归误写成普通显形补回。',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('keeps renderer-rejoin-without-body explicit in drilldown lead lines instead of narrating it as body-led rejoin', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-loss-2',
        decisionTraceId: 'trace-loss-2',
        activeThreadId: 'thread-loss',
        selectedCardId: 'repair-owner',
        explanation: 'renderer rejoined without body',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-loss-1',
        decisionTraceId: 'trace-loss-1',
        activeThreadId: 'thread-loss',
        selectedCardId: 'repair-path',
        explanation: 'visible recovery lost body carry',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-loss-2',
        previousDecisionTraceId: 'trace-loss-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：当前已进入显形回接失身态，VRM 显形权威虽然已经回接，但身体线没有继续托住同一段 living segment，不应把这次可见恢复误写成同一条身体线上的可信补回。',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('keeps quieter motion+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-motion-lipsync-voice-loss-2',
        decisionTraceId: 'trace-motion-lipsync-voice-loss-2',
        activeThreadId: 'thread-motion-lipsync-voice-loss',
        selectedCardId: 'repair-owner',
        explanation: 'quieter motion+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-motion-lipsync-voice-loss-1',
        decisionTraceId: 'trace-motion-lipsync-voice-loss-1',
        activeThreadId: 'thread-motion-lipsync-voice-loss',
        selectedCardId: 'repair-path',
        explanation: 'body face rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-motion-lipsync-voice-loss-2',
        previousDecisionTraceId: 'trace-motion-lipsync-voice-loss-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('prefers structured surviving visible lane metadata in drilldown lead lines even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-structured-loss-2',
        decisionTraceId: 'trace-face-lipsync-voice-structured-loss-2',
        activeThreadId: 'thread-face-lipsync-voice-structured-loss',
        selectedCardId: 'repair-owner',
        explanation: 'structured quieter face+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment。',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-structured-loss-1',
        decisionTraceId: 'trace-face-lipsync-voice-structured-loss-1',
        activeThreadId: 'thread-face-lipsync-voice-structured-loss',
        selectedCardId: 'repair-path',
        explanation: 'body motion rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment。',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-face-lipsync-voice-structured-loss-2',
        previousDecisionTraceId: 'trace-face-lipsync-voice-structured-loss-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: true,
        changedTraceEvent: true,
        lines: [
          '身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
          '聚焦卡片：修复路径 -> 修复归属',
          '证据面板：运行时连续性投影 => 显形权威投影 -> 运行时连续性投影',
          '轨迹段：轨迹消费 -> 轨迹时间线 => 轨迹消费 -> 轨迹时间线 -> 选中轨迹事件',
          '轨迹事件：接管事件 -> 人格状态事件',
        ],
      },
    ])
  })

  it('keeps project-state continuity explicit in drilldown lead lines when a transition re-anchors history replay on first-check project carry instead of flattening it into generic same-her drift', () => {
    expect(buildSelfEvolutionFocusHistoryDrilldown([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-project-state-drilldown-2',
        decisionTraceId: 'trace-project-state-drilldown-2',
        activeThreadId: 'thread-project-state-drilldown',
        selectedCardId: 'first-check',
        explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-governance.',
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
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-project-state-drilldown-1',
        decisionTraceId: 'trace-project-state-drilldown-1',
        activeThreadId: 'thread-project-state-drilldown',
        selectedCardId: 'repair-owner',
        explanation: 'Focused repair-owner because it points to private-thought-governance-chain -> runtime-continuity-projection, then narrows into trace-consumption -> trace-details and event event-takeover.',
        highlightedEvidencePanelIds: [
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        currentCapturedAt: 200,
        previousCapturedAt: 100,
        currentDecisionTraceId: 'trace-project-state-drilldown-2',
        previousDecisionTraceId: 'trace-project-state-drilldown-1',
        changedFocusCard: true,
        changedEvidenceTargets: true,
        changedTraceTargets: false,
        changedTraceEvent: true,
        lines: [
          '项目状态连续性：当前仍在首查 Project identity carry -> Phase 1 route carry -> Unresolved closure carry，不应把这次转移误写成普通 same-her 漂移。',
          '聚焦卡片：修复归属 -> 首查点',
          '证据面板：私有思绪治理链 -> 运行时连续性投影 => 候选轨迹摘要 -> 主动决策消费摘要 -> 身份漂移治理摘要',
          '轨迹事件：接管事件 -> 治理事件',
        ],
      },
    ])
  })
})

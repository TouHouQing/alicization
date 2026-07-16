import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistorySummary } from './performance-visualizer-self-evolution-focus-history-summary'

describe('performance visualizer self evolution focus history summary', () => {
  it('summarizes stable and drifting focus signals across multiple snapshots', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        selectedCardId: 'repair-path',
        explanation: 'snapshot-2',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
      '历史快照数：3',
      '聚焦卡片：存在漂移（修复路径 x2，修复归属 x1）',
      '稳定证据面板：运行时连续性投影',
      '漂移证据面板：私有思绪治理链，显形权威投影',
      '轨迹事件：存在漂移（接管事件，治理事件，人格状态事件）',
    ])
  })

  it('returns null when history is empty', () => {
    expect(buildSelfEvolutionFocusHistorySummary([])).toBeNull()
  })

  it('adds a body-led continuity summary when runtime continuity stays stable while renderer authority intermittently drops around the same living segment', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-3',
        decisionTraceId: 'trace-body-3',
        activeThreadId: 'thread-body-3',
        selectedCardId: 'repair-owner',
        explanation: 'body continuity reconfirmed',
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
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 300,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-2',
        decisionTraceId: 'trace-body-2',
        activeThreadId: 'thread-body-2',
        selectedCardId: 'repair-owner',
        explanation: 'body continuity carry under review',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-1',
        decisionTraceId: 'trace-body-1',
        activeThreadId: 'thread-body-1',
        selectedCardId: 'repair-owner',
        explanation: 'body continuity carry under review',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
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
      '历史快照数：3',
      '聚焦卡片：稳定（修复归属）',
      '稳定证据面板：运行时连续性投影',
      '漂移证据面板：显形权威投影',
      '身体连续性：运行时连续性投影持续稳定，Live2D 显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。',
      '轨迹事件：存在漂移（接管事件，人格状态事件）',
    ])
  })

  it('mentions the speech rejoin surface when body continuity history already knows the same segment is being rejoined through speech authority', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-2',
        decisionTraceId: 'trace-body-speech-2',
        activeThreadId: 'thread-body-speech-2',
        selectedCardId: 'repair-owner',
        explanation: 'speech authority rejoin',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-1',
        decisionTraceId: 'trace-body-speech-1',
        activeThreadId: 'thread-body-speech-1',
        selectedCardId: 'repair-owner',
        explanation: 'speech authority carry under review',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：运行时连续性投影持续稳定，speech 显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。')
  })

  it('falls back to manifestation authority wording when body continuity history knows the same segment is being rejoined but the manifestation surface remains unknown', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-generic-2',
        decisionTraceId: 'trace-body-generic-2',
        activeThreadId: 'thread-body-generic-2',
        selectedCardId: 'repair-owner',
        explanation: 'manifestation authority rejoin under review',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-generic-1',
        decisionTraceId: 'trace-body-generic-1',
        activeThreadId: 'thread-body-generic-1',
        selectedCardId: 'repair-owner',
        explanation: 'manifestation authority carry under review',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：运行时连续性投影持续稳定，显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。')
  })

  it('prefers the first structured renderer rejoin surface in history even when later body continuity snapshots lose the explicit surface label', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-3',
        decisionTraceId: 'trace-body-speech-3',
        activeThreadId: 'thread-body-speech-3',
        selectedCardId: 'repair-owner',
        explanation: 'same-her speech rejoin still under review',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 300,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-2',
        decisionTraceId: 'trace-body-speech-2',
        activeThreadId: 'thread-body-speech-2',
        selectedCardId: 'repair-owner',
        explanation: 'speech authority rejoin',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-1',
        decisionTraceId: 'trace-body-speech-1',
        activeThreadId: 'thread-body-speech-1',
        selectedCardId: 'repair-owner',
        explanation: 'speech authority carry under review',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：运行时连续性投影持续稳定，speech 显形权威投影在相邻快照间反复出入，说明这段 same living segment 更像先由身体线继续托住。')
  })

  it('adds a body-only-hold summary when runtime continuity stays stable but renderer authority never stably returns on the same living segment', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-only-2',
        decisionTraceId: 'trace-body-only-2',
        activeThreadId: 'thread-body-only-2',
        selectedCardId: 'repair-owner',
        explanation: 'body still carrying alone',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-only-1',
        decisionTraceId: 'trace-body-only-1',
        activeThreadId: 'thread-body-only-1',
        selectedCardId: 'repair-owner',
        explanation: 'renderer still absent',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：运行时连续性投影持续稳定，但显形权威长期没有稳定补回，说明这段 same living segment 仍主要靠身体线独自托住。')
  })

  it('adds a full-cross-modal-lock summary when runtime continuity and renderer authority both stay stable on the same living segment', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-2',
        decisionTraceId: 'trace-lock-2',
        activeThreadId: 'thread-lock-2',
        selectedCardId: 'repair-owner',
        explanation: 'full lock still holding',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-1',
        decisionTraceId: 'trace-lock-1',
        activeThreadId: 'thread-lock-1',
        selectedCardId: 'repair-owner',
        explanation: 'full lock first confirmed',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
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
    ])).toContain('身体连续性：运行时连续性投影与VRM 显形权威投影都已稳定下来，说明身体线与显形权威正在共同锁住同一段 living segment，而不是短暂同步。')
  })

  it('adds a renderer-rejoin-without-body summary when visible renderer recovery exists but the body line no longer carries the same segment', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-loss-2',
        decisionTraceId: 'trace-body-loss-2',
        activeThreadId: 'thread-body-loss-2',
        selectedCardId: 'repair-owner',
        explanation: 'renderer rejoined but body drifted',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-loss-1',
        decisionTraceId: 'trace-body-loss-1',
        activeThreadId: 'thread-body-loss-1',
        selectedCardId: 'repair-owner',
        explanation: 'renderer rejoined but body drifted earlier',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：speech 显形权威投影虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。')
  })

  it('keeps quieter face+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-summary-2',
        decisionTraceId: 'trace-face-lipsync-voice-summary-2',
        activeThreadId: 'thread-face-lipsync-voice-summary',
        selectedCardId: 'repair-owner',
        explanation: 'quieter face+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-summary-1',
        decisionTraceId: 'trace-face-lipsync-voice-summary-1',
        activeThreadId: 'thread-face-lipsync-voice-summary',
        selectedCardId: 'repair-owner',
        explanation: 'body motion rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity')
  })

  it('prefers structured surviving visible lane metadata in history summary even when the stored body continuity note falls back to generic renderer-rejoin-without-body wording', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-structured-summary-2',
        decisionTraceId: 'trace-face-lipsync-voice-structured-summary-2',
        activeThreadId: 'thread-face-lipsync-voice-structured-summary',
        selectedCardId: 'repair-owner',
        explanation: 'renderer rejoined without body carry, but quieter identity-continuity',
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
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-structured-summary-1',
        decisionTraceId: 'trace-face-lipsync-voice-structured-summary-1',
        activeThreadId: 'thread-face-lipsync-voice-structured-summary',
        selectedCardId: 'repair-owner',
        explanation: 'renderer rejoined earlier but body motion were still pending',
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
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 100,
      },
    ])).toContain('身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity')
  })

  it('keeps project-state continuity carry explicit in history summary when first-check snapshots keep re-auditing project identity Phase 1 route and unresolved closure carry', () => {
    expect(buildSelfEvolutionFocusHistorySummary([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-project-state-summary-2',
        decisionTraceId: 'trace-project-state-summary-2',
        activeThreadId: 'thread-project-state-summary',
        selectedCardId: 'first-check',
        explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-governance.',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
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
        candidateId: 'candidate-project-state-summary-1',
        decisionTraceId: 'trace-project-state-summary-1',
        activeThreadId: 'thread-project-state-summary',
        selectedCardId: 'first-check',
        explanation: 'Focused first-check because it points to candidate-trajectory-summary -> proactive-decision-consumption-summary -> identity-drift-governance-summary, then narrows into trace-consumption -> trace-details and event event-takeover.',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'candidate-trajectory-summary',
          'proactive-decision-consumption-summary',
          'identity-drift-governance-summary',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toContain('项目状态连续性：Project identity carry -> Phase 1 route carry -> Unresolved closure carry 仍在这组聚焦历史里持续作为首查点被重新核对。')
  })
})

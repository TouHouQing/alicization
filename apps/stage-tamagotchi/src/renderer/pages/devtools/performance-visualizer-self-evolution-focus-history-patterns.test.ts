import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatterns } from './performance-visualizer-self-evolution-focus-history-patterns'

describe('performance visualizer self evolution focus history patterns', () => {
  it('returns an empty list when history is too short to form a drift pattern', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([])).toEqual([])
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: ['proactive-action-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-1',
        capturedAt: 100,
      },
    ])).toEqual([])
  })

  it('aggregates repeated drift transitions into recurring patterns', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-4',
        decisionTraceId: 'trace-4',
        activeThreadId: 'thread-4',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-4',
        highlightedEvidencePanelIds: [
          'proactive-action-chain',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-details',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 400,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
        ],
        recommendedTraceEventId: 'event-person-state',
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
          'proactive-action-chain',
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
    ])).toEqual([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
        occurrenceCount: 2,
        summaryLine: '2次 身体连续性承接 -> 显形权威补回 | 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件 | +主动行动链 -显形权威投影 | +选中轨迹事件 +轨迹细节 -轨迹时间线',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['proactive-action-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event', 'trace-details'],
        traceTargetsLost: ['trace-timeline'],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
        occurrenceCount: 1,
        summaryLine: '1次 身体连续性承接 -> 显形权威补回 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 -主动行动链 | +轨迹时间线 -选中轨迹事件 -轨迹细节',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['proactive-action-chain'],
        traceTargetsGained: ['trace-timeline'],
        traceTargetsLost: ['selected-trace-event', 'trace-details'],
        occurrences: [
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
        ],
      },
    ])
  })

  it('keeps distinct patterns separated when only event drift repeats under a stable focus frame', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: ['proactive-action-chain'],
        highlightedTraceSectionIds: ['trace-details'],
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
        highlightedEvidencePanelIds: ['proactive-action-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-1',
        highlightedEvidencePanelIds: ['proactive-action-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: false,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复路径 | 治理事件 -> 接管事件',
        focusCardTransition: 'repair-path -> repair-path',
        traceEventTransition: 'event-governance -> event-takeover',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
        ],
      },
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: false,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: null,
        occurrenceCount: 1,
        summaryLine: '1次 修复路径 -> 修复路径 | 接管事件 -> 治理事件',
        focusCardTransition: 'repair-path -> repair-path',
        traceEventTransition: 'event-takeover -> event-governance',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
    ])
  })

  it('marks body-led same-segment carry as a body-continuity pattern instead of flattening it into generic renderer drift', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-4',
        decisionTraceId: 'trace-4',
        activeThreadId: 'thread-4',
        selectedCardId: 'repair-owner',
        explanation: 'snapshot-4',
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
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 400,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-3',
        selectedCardId: 'repair-path',
        explanation: 'snapshot-3',
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'trace-timeline',
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
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        survivingVisibleLane: null,
        occurrenceCount: 2,
        summaryLine: '2次 身体承接态 -> Live2D 显形补回态 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: [],
        traceTargetsGained: ['selected-trace-event'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        survivingVisibleLane: null,
        occurrenceCount: 1,
        summaryLine: '1次 身体承接态 -> Live2D 显形补回态 | 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件 | -显形权威投影 | -选中轨迹事件',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: [],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: [],
        traceTargetsLost: ['selected-trace-event'],
        occurrences: [
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
        ],
      },
    ])
  })

  it('keeps the speech renderer rejoin surface explicit in pattern summaries when only the previous structured snapshot still carries that surface key', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-speech-2',
        decisionTraceId: 'trace-speech-2',
        activeThreadId: 'thread-speech-2',
        selectedCardId: 'repair-owner',
        explanation: 'continuity speech rejoin remains in progress',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: [
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: [
          'trace-consumption',
          'selected-trace-event',
        ],
        recommendedTraceEventId: 'event-person-state',
        capturedAt: 200,
      },
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-speech-1',
        decisionTraceId: 'trace-speech-1',
        activeThreadId: 'thread-speech-1',
        selectedCardId: 'repair-path',
        explanation: 'speech rejoin anchor',
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
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toMatchObject([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: null,
        summaryLine: '1次 身体承接态 -> speech 显形补回态 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | -显形权威投影 | -轨迹时间线',
      },
    ])
  })

  it('keeps full-cross-modal-lock visible in recurring pattern summaries instead of flattening it into renderer rejoin wording', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
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
    ])).toMatchObject([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        survivingVisibleLane: null,
        summaryLine: '1次 跨模态重锁态（Live2D） | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      },
    ])
  })

  it('keeps renderer-rejoin-without-body visible in recurring pattern summaries instead of narrating it as a trusted body-led rejoin', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
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
    ])).toMatchObject([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        survivingVisibleLane: null,
        summaryLine: '1次 显形回接失身态（VRM） | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      },
    ])
  })

  it('keeps quieter face+lipsync+voice continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-2',
        decisionTraceId: 'trace-face-lipsync-voice-2',
        activeThreadId: 'thread-face-lipsync-voice',
        selectedCardId: 'repair-owner',
        explanation: 'quieter face+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
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
        candidateId: 'candidate-face-lipsync-voice-1',
        decisionTraceId: 'trace-face-lipsync-voice-1',
        activeThreadId: 'thread-face-lipsync-voice',
        selectedCardId: 'repair-path',
        explanation: 'body motion rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
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
    ])).toMatchObject([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        summaryLine: '1次 当前仅剩表情、口型、声音维持同一段连续性 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      },
    ])
  })

  it('keeps quieter motion+lipsync+voice continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-motion-lipsync-voice-2',
        decisionTraceId: 'trace-motion-lipsync-voice-2',
        activeThreadId: 'thread-motion-lipsync-voice',
        selectedCardId: 'repair-owner',
        explanation: 'quieter motion+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync+voice-only',
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
        candidateId: 'candidate-motion-lipsync-voice-1',
        decisionTraceId: 'trace-motion-lipsync-voice-1',
        activeThreadId: 'thread-motion-lipsync-voice',
        selectedCardId: 'repair-path',
        explanation: 'body face rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync+voice-only',
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
    ])).toMatchObject([
      {
        patternKey: expect.stringMatching(/^pattern:[a-f0-9]{16}$/),
        bodyContinuityPattern: true,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'motion+lipsync+voice-only',
        summaryLine: '1次 当前仅剩动作、口型、声音维持同一段连续性 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      },
    ])
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatterns } from './performance-visualizer-self-evolution-focus-history-patterns'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

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
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
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
          'private-thought-governance-chain',
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
    ])).toEqual([
      {
        patternKey: 'signature:body-continuity|phase:derived|surface:unknown|focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
        occurrenceCount: 2,
        summaryLine: '2次 身体连续性承接 -> 显形权威补回 | 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件 | +私有思绪治理链 -显形权威投影 | +选中轨迹事件 +轨迹细节 -轨迹时间线',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['private-thought-governance-chain'],
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
        patternKey: 'signature:body-continuity|phase:derived|surface:unknown|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
        occurrenceCount: 1,
        summaryLine: '1次 身体连续性承接 -> 显形权威补回 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 -私有思绪治理链 | +轨迹时间线 -选中轨迹事件 -轨迹细节',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['private-thought-governance-chain'],
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
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
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
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
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
        highlightedEvidencePanelIds: ['private-thought-governance-chain'],
        highlightedTraceSectionIds: ['trace-details'],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 100,
      },
    ])).toEqual([
      {
        patternKey: 'focus:repair-path->repair-path|event:event-governance->event-takeover|evidence:none|trace:none',
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
        patternKey: 'focus:repair-path->repair-path|event:event-takeover->event-governance|evidence:none|trace:none',
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
        patternKey: 'signature:body-continuity|phase:body-carried-to-renderer-rejoin|surface:authority:renderer-rejoin:live2d|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
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
        patternKey: 'signature:body-continuity|phase:body-carried-to-renderer-rejoin|surface:authority:renderer-rejoin:live2d|focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:-renderer-authority-projection|trace:-selected-trace-event',
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

  it('restores body-only-hold patterns from the legacy same-her note when the structured phase is missing', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
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
    ])).toEqual([
      {
        patternKey: 'signature:body-continuity|phase:body-only-hold|surface:unknown|focus:repair-path->repair-owner|event:event-takeover->event-governance|evidence:none|trace:none',
        occurrenceCount: 1,
        summaryLine: '1次 身体独撑态 | 修复路径 -> 修复归属 | 接管事件 -> 治理事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-governance',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 720,
            previousCapturedAt: 620,
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
        explanation: 'same-her speech rejoin remains in progress',
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
        patternKey: 'signature:body-continuity|phase:full-cross-modal-lock|surface:authority:renderer-rejoin:live2d|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
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
        patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|surface:authority:renderer-rejoin:vrm|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        summaryLine: '1次 显形回接失身态（VRM） | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
      },
    ])
  })

  it('keeps quieter face+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-lipsync-voice-2',
        decisionTraceId: 'trace-face-lipsync-voice-2',
        activeThreadId: 'thread-face-lipsync-voice',
        selectedCardId: 'repair-owner',
        explanation: 'quieter face+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
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
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
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
        patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|surface:unknown|lane:face+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        summaryLine: '1次 当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      },
    ])
  })

  it('keeps quieter motion+lipsync+voice identity-continuity', () => {
    expect(buildSelfEvolutionFocusHistoryPatterns([
      {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-motion-lipsync-voice-2',
        decisionTraceId: 'trace-motion-lipsync-voice-2',
        activeThreadId: 'thread-motion-lipsync-voice',
        selectedCardId: 'repair-owner',
        explanation: 'quieter motion+lipsync+voice carry still visible',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
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
        candidateId: 'candidate-motion-lipsync-voice-1',
        decisionTraceId: 'trace-motion-lipsync-voice-1',
        activeThreadId: 'thread-motion-lipsync-voice',
        selectedCardId: 'repair-path',
        explanation: 'body face rejoin still pending',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
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
    ])).toMatchObject([
      {
        patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|surface:unknown|lane:motion+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        summaryLine: '1次 当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
      },
    ])
  })
})

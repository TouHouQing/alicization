import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionActiveWorkflowFocus } from './performance-visualizer-self-evolution-active-workflow-focus'

describe('performance visualizer self evolution active workflow focus', () => {
  it('returns null when no recurring-pattern workflow context is active', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: null,
      patternContextByKey: {},
      patternGuidanceByKey: {},
    })).toBeNull()
  })

  it('projects an active action workflow focus into a compact repair heading and target sets', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-persona',
      patternContextByKey: {
        'pattern-persona': {
          currentCapturedAt: 400,
          previousCapturedAt: 300,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-persona': {
          governanceLayer: 'proactive-action',
          governanceLayerDisplay: '主动行动层',
          repairOwnerHint: '主动行动链',
          prosodyAuthorityHint: null,
          rendererRejoinSurfaceKey: null,
          recommendedEvidencePanels: [
            'proactive-action-chain',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-details',
            'selected-trace-event',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
            'learning-executed',
          ],
          summaryLine: '主动行动证据出现反复偏移。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：主动行动层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '主动行动链',
      prosodyAuthorityHint: null,
      bodyContinuityHint: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      rendererTarget: null,
      evidencePanels: new Set([
        'proactive-action-chain',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-details',
        'selected-trace-event',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
        'learning-executed',
      ]),
    })
  })

  it('returns null when an active pattern key cannot be resolved to both context and guidance', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-missing',
      patternContextByKey: {
        'pattern-missing': {
          currentCapturedAt: 500,
          previousCapturedAt: 400,
          side: 'previous',
          summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
        },
      },
      patternGuidanceByKey: {},
    })).toBeNull()
  })

  it('does not infer body phase or visible lane from descriptive text', () => {
    const oldBodyHint = ['身体承接态', ' -> ', '显形补回态'].join('')
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-body-description',
      patternContextByKey: {
        'pattern-body-description': {
          currentCapturedAt: 500,
          previousCapturedAt: 400,
          side: 'current',
          summaryLine: '当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-body-description': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体同步层',
          repairOwnerHint: '显形诊断',
          prosodyAuthorityHint: null,
          bodyContinuityHint: oldBodyHint,
          recommendedEvidencePanels: ['renderer-authority-projection'],
          recommendedTraceSections: ['trace-timeline'],
          recommendedEventKinds: ['person-state-updated'],
          summaryLine: oldBodyHint,
        },
      },
    })).toEqual(expect.objectContaining({
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      rendererTarget: null,
    }))
  })

  it('projects renderer target hints into the active workflow focus so repair session summaries do not depend on handwritten display text', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      rendererTarget: 'live2d',
      activePatternKey: 'pattern-body',
      patternContextByKey: {
        'pattern-body': {
          currentCapturedAt: 400,
          previousCapturedAt: 300,
          side: 'current',
          summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-body': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
          rendererTarget: 'vrm',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
          ],
          recommendedEventKinds: [
            'takeover-audit',
          ],
          summaryLine: '这更像身体连续性治理反复失稳。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      rendererTarget: 'live2d',
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
      ]),
      eventKinds: new Set([
        'takeover-audit',
      ]),
    })
  })

  it('keeps runtime evidence workflow focus explicit', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-runtime',
      patternContextByKey: {
        'pattern-runtime': {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
          side: 'previous',
          summaryLine: '将运行时证据工作流应用到 1970-01-01T00:00:00.520Z -> 1970-01-01T00:00:00.620Z 的前一侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-runtime': {
          governanceLayer: 'runtime-continuity',
          governanceLayerDisplay: '运行时证据层',
          repairOwnerHint: '运行时证据',
          prosodyAuthorityHint: null,
          recommendedEvidencePanels: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-consumption',
            'trace-details',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '运行时证据出现反复偏移。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：运行时证据层',
      summaryLine: '正在修复该反复漂移模式的前一侧。',
      repairOwnerHint: '运行时证据',
      prosodyAuthorityHint: null,
      bodyContinuityHint: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      rendererTarget: null,
      evidencePanels: new Set([
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-consumption',
        'trace-details',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps body-carried renderer rejoin workflow focus explicit so repair-session can stay on the same living segment instead of treating it as prosody-only drift', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-body-rejoin',
      patternContextByKey: {
        'pattern-body-rejoin': {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
          side: 'current',
          summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.520Z -> 1970-01-01T00:00:00.620Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-body-rejoin': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: 'speech 显形仍在等待身体状态完成回接。',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: 'speech 显形状态正在回接。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: 'speech 显形仍在等待身体状态完成回接。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      rendererTarget: 'speech',
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps full-cross-modal-lock workflow focus explicit so stable body plus renderer lock is not flattened into a generic renderer drift follow-up', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-cross-modal-lock',
      patternContextByKey: {
        'pattern-cross-modal-lock': {
          currentCapturedAt: 720,
          previousCapturedAt: 620,
          side: 'current',
          summaryLine: '将跨模态重锁工作流应用到 1970-01-01T00:00:00.620Z -> 1970-01-01T00:00:00.720Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-cross-modal-lock': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: '身体与 Live2D 显形状态已经完成同步。',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '身体与 Live2D 显形状态保持同步。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '身体与 Live2D 显形状态已经完成同步。',
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      rendererTarget: 'live2d',
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps quieter face+lipsync continuity', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-quieter-face-lipsync',
      patternContextByKey: {
        'pattern-quieter-face-lipsync': {
          currentCapturedAt: 820,
          previousCapturedAt: 720,
          side: 'current',
          summaryLine: '将 quieter face+lipsync 身体连续性工作流应用到 1970-01-01T00:00:00.720Z -> 1970-01-01T00:00:00.820Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-quieter-face-lipsync': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: '当前可见通道：face+lipsync-only。',
          survivingVisibleLane: 'face+lipsync-only',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '显形通道状态来自 survivingVisibleLane。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '当前可见通道：face+lipsync-only。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync-only',
      rendererTarget: null,
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps quieter motion+lipsync continuity', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-quieter-motion-lipsync',
      patternContextByKey: {
        'pattern-quieter-motion-lipsync': {
          currentCapturedAt: 820,
          previousCapturedAt: 720,
          side: 'current',
          summaryLine: '将 quieter motion+lipsync 身体连续性工作流应用到 1970-01-01T00:00:00.720Z -> 1970-01-01T00:00:00.820Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-quieter-motion-lipsync': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: '当前可见通道：motion+lipsync-only。',
          survivingVisibleLane: 'motion+lipsync-only',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '显形通道状态来自 survivingVisibleLane。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '当前可见通道：motion+lipsync-only。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync-only',
      rendererTarget: null,
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps quieter face+lipsync+voice continuity', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-quieter-face-lipsync-voice',
      patternContextByKey: {
        'pattern-quieter-face-lipsync-voice': {
          currentCapturedAt: 820,
          previousCapturedAt: 720,
          side: 'current',
          summaryLine: '将 quieter face+lipsync+voice 身体连续性工作流应用到 1970-01-01T00:00:00.720Z -> 1970-01-01T00:00:00.820Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-quieter-face-lipsync-voice': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: '当前可见通道：face+lipsync+voice-only。',
          survivingVisibleLane: 'face+lipsync+voice-only',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '显形通道状态来自 survivingVisibleLane。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '当前可见通道：face+lipsync+voice-only。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      rendererTarget: null,
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })

  it('keeps quieter motion+lipsync+voice continuity', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-quieter-motion-lipsync-voice',
      patternContextByKey: {
        'pattern-quieter-motion-lipsync-voice': {
          currentCapturedAt: 820,
          previousCapturedAt: 720,
          side: 'current',
          summaryLine: '将 quieter motion+lipsync+voice 身体连续性工作流应用到 1970-01-01T00:00:00.720Z -> 1970-01-01T00:00:00.820Z 的当前侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-quieter-motion-lipsync-voice': {
          governanceLayer: 'body-continuity',
          governanceLayerDisplay: '身体连续性层',
          repairOwnerHint: '身体连续性治理',
          prosodyAuthorityHint: null,
          bodyContinuityHint: '当前可见通道：motion+lipsync+voice-only。',
          survivingVisibleLane: 'motion+lipsync+voice-only',
          recommendedEvidencePanels: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-timeline',
            'selected-trace-event',
            'trace-consumption',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
          ],
          summaryLine: '显形通道状态来自 survivingVisibleLane。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '当前可见通道：motion+lipsync+voice-only。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync+voice-only',
      rendererTarget: null,
      evidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-timeline',
        'selected-trace-event',
        'trace-consumption',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
      ]),
    })
  })
})

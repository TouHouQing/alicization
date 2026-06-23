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

  it('projects an active persona-thought workflow focus into a compact repair heading and target sets', () => {
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
          governanceLayer: 'persona-thought',
          governanceLayerDisplay: '人格/思绪层',
          repairOwnerHint: '私有思绪治理',
          prosodyAuthorityHint: null,
          rendererRejoinSurfaceKey: null,
          recommendedEvidencePanels: [
            'private-thought-governance-chain',
            'runtime-continuity-projection',
          ],
          recommendedTraceSections: [
            'trace-details',
            'selected-trace-event',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'person-state-updated',
            'governance-normalized',
          ],
          summaryLine: '疑似反复出现的人格/思绪漂移。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：人格/思绪层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      rendererTarget: null,
      evidencePanels: new Set([
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ]),
      traceSections: new Set([
        'trace-details',
        'selected-trace-event',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'person-state-updated',
        'governance-normalized',
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

  it('keeps project-state continuity workflow focus explicit instead of flattening it into generic same-her drift wording', () => {
    expect(buildSelfEvolutionActiveWorkflowFocus({
      activePatternKey: 'pattern-project-state',
      patternContextByKey: {
        'pattern-project-state': {
          currentCapturedAt: 620,
          previousCapturedAt: 520,
          side: 'previous',
          summaryLine: '将项目状态连续性工作流应用到 1970-01-01T00:00:00.520Z -> 1970-01-01T00:00:00.620Z 的前一侧。',
        },
      },
      patternGuidanceByKey: {
        'pattern-project-state': {
          governanceLayer: 'project-state-continuity',
          governanceLayerDisplay: '项目状态连续性层',
          repairOwnerHint: '项目状态连续性治理',
          prosodyAuthorityHint: null,
          recommendedEvidencePanels: [
            'internalization-readiness-summary',
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
            'identity-drift-governance-summary',
          ],
          recommendedTraceSections: [
            'trace-consumption',
            'trace-details',
          ],
          recommendedEventKinds: [
            'takeover-audit',
            'governance-normalized',
          ],
          summaryLine: '这更像项目状态连续性治理反复失稳，而不是普通 same-her 漂移修复。先核对项目身份是否被继续带着，再确认 Phase 1 本地主数字生命主线和未闭环 open loops 是否稳定延续。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：项目状态连续性层',
      summaryLine: '正在修复该反复漂移模式的前一侧。',
      repairOwnerHint: '项目状态连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      rendererTarget: null,
      evidencePanels: new Set([
        'internalization-readiness-summary',
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ]),
      traceSections: new Set([
        'trace-consumption',
        'trace-details',
      ]),
      eventKinds: new Set([
        'takeover-audit',
        'governance-normalized',
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
          prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 speech 显形权威是否正在沿同一条连续身体线补回。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线是否仍托住同一段 living segment，再核对 speech 显形权威是否沿着同一条连续身体线补回。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 speech 显形权威是否正在沿同一条连续身体线补回。',
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
          prosodyAuthorityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 Live2D 显形权威是否仍稳定锁在同一段 living segment 上。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认身体线与 Live2D 显形权威是否仍稳定锁在同一段 living segment 上，而不是把这段稳定回归误写成短暂同步。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment，再确认 Live2D 显形权威是否仍稳定锁在同一段 living segment 上。',
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

  it('keeps quieter face+lipsync same-her carry explicit in active workflow focus so repair-session can keep body motion and voice as pending rejoin lanes', () => {
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
          prosodyAuthorityHint: '优先核对当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 和 voice 还没有重新接回这条表情口型线。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、motion 和 voice 还没有重新接回这条表情口型线，避免把这次 quieter carry 误写成修复完成。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 和 voice 还没有重新接回这条表情口型线。',
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

  it('keeps quieter motion+lipsync same-her carry explicit in active workflow focus so repair-session can keep body face and voice as pending rejoin lanes', () => {
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
          prosodyAuthorityHint: '优先核对当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 和 voice 还没有重新接回这条动作口型线。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、face 和 voice 还没有重新接回这条动作口型线，避免把这次 quieter carry 误写成修复完成。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 和 voice 还没有重新接回这条动作口型线。',
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

  it('keeps quieter face+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and motion as pending rejoin lanes without dropping voice', () => {
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
          prosodyAuthorityHint: '优先核对当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 还没有重新接回这条表情口型声音线。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、motion 还没有重新接回这条表情口型声音线，避免把这次 quieter carry 误写成修复完成。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、motion 还没有重新接回这条表情口型声音线。',
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

  it('keeps quieter motion+lipsync+voice same-her carry explicit in active workflow focus so repair-session can keep body and face as pending rejoin lanes without dropping voice', () => {
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
          prosodyAuthorityHint: '优先核对当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 还没有重新接回这条动作口型声音线。',
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
          summaryLine: '这更像身体连续性治理反复失稳，而不是普通显形权威漂移。先确认当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再核对为什么 body、face 还没有重新接回这条动作口型声音线，避免把这次 quieter carry 误写成修复完成。',
        },
      },
    })).toEqual({
      title: '当前工作流焦点：身体连续性层',
      summaryLine: '正在修复该反复漂移模式的当前侧。',
      repairOwnerHint: '身体连续性治理',
      prosodyAuthorityHint: null,
      bodyContinuityHint: '优先核对当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，再确认为什么 body、face 还没有重新接回这条动作口型声音线。',
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

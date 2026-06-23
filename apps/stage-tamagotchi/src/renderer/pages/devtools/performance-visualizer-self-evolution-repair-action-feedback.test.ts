import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairActionFeedback } from './performance-visualizer-self-evolution-repair-action-feedback'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution repair action feedback', () => {
  it('returns null when no repair action ran', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: null,
      followupNavigation: null,
      repairClosureBefore: null,
      repairClosureAfter: null,
      snapshotCountBefore: 0,
      snapshotCountAfter: 0,
    })).toBeNull()
  })

  it('reports advancing to the refreshed target after a non-terminal repair action', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: 'Inspect runtime-continuity-projection',
        detail: '...',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
    })
  })

  it('reports project-state continuity carry when the refreshed target is still checking whether the same her carried project identity, phase, and open loops forward', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-trace',
        label: '检查 选中轨迹事件',
        detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先落到接管审计，确认项目身份、当前 Phase 与未闭环任务仍被同一个她连续承接，再继续推进到验证快照。',
        targetType: 'trace',
        targetId: 'selected-trace-event',
      },
      followupNavigation: {
        activeSurfaceKey: 'event:takeover-audit',
        scrollTargetId: 'self-evolution-event:takeover-audit',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '已完成 7 项中的 5 项修复检查，当前归属为项目状态连续性治理。',
        ],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：项目状态连续性检查 / 事件 / 接管审计。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项项目状态连续性检查目标，继续确认项目身份、Phase 1 主线与未闭环任务承接是否仍被同一个她稳定带着。',
    })
  })

  it('reports body-led continuity carry when the refreshed target is still verifying that the body line holds the living segment first', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: '检查 runtime-continuity-projection',
        detail: '修复闭环仍然打开。先补上下一项缺失证据；同时优先核对当前片段的身体线是否仍托住同一段 living segment，确认身体线仍托住同一段 living segment，再决定是否继续追表情/动作/口型补回。再继续推进到轨迹/事件验证。',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        ],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('reports speech body-led continuity carry when the refreshed target is still verifying speech authority rejoin on the same living segment', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: '检查 runtime-continuity-projection',
        detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 speech 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断 speech 显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('falls back to manifestation authority wording when body continuity is explicit but the renderer rejoin surface remains unknown', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: '检查 runtime-continuity-projection',
        detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '剩余证据：显形权威投影',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('does not infer a speech renderer-rejoin surface from unrelated workflow wording when the structured surface is still unknown', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: '检查 runtime-continuity-projection',
        detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对显形权威是否沿同一条连续身体线补回。speech 热点仍需继续审计，但这条说明不应把未知显形补回表面误写成 speech authority rejoin。',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          'speech 热点仍需继续审计，但这条说明不应把未知显形补回表面误写成 speech authority rejoin。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('keeps speech renderer-rejoin carry wording when structured body continuity fields stay present even if the workflow copy is generic', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-evidence',
        label: '检查 runtime-continuity-projection',
        detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 speech 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
        targetType: 'evidence',
        targetId: 'runtime-continuity-projection',
      },
      followupNavigation: {
        activeSurfaceKey: 'trace:selected-trace-event',
        scrollTargetId: 'self-evolution-trace:selected-trace-event',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '已完成 4 项中的 1 项修复检查，当前归属为连续性治理。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '剩余证据：显形权威投影',
          '剩余轨迹：选中轨迹事件',
          '剩余事件：接管审计',
          '本轮仍在核对身体线是否继续托住同一段 living segment，并确认 speech 显形权威是否正在沿同一条连续身体线补回。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：轨迹 / 选中轨迹事件。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断 speech 显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('keeps the speech renderer-rejoin surface explicit when the next repair target is the speech authority rejoin lane itself', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-trace',
        label: '检查 选中轨迹事件',
        detail: '修复闭环仍然打开。先补齐选中轨迹事件，再回到 speech 显形补回层，确认 speech 显形权威是否仍沿同一条连续身体线补回。',
        targetType: 'trace',
        targetId: 'selected-trace-event',
      },
      followupNavigation: {
        activeSurfaceKey: 'authority:renderer-rejoin:speech',
        scrollTargetId: 'self-evolution-authority:speech-hotspots',
      },
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          'speech 显形权威仍需沿同一条连续身体线补回。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：显形补回层 / speech。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项身体连续性检查目标，继续确认身体线是否仍托住同一段 living segment，再判断 speech 显形权威是否已经补回同一条连续身体线。',
    })
  })

  it('reports validation snapshot capture when snapshot count increases but the loop stays open', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'capture-snapshot',
        label: 'Capture validation snapshot',
        detail: '...',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:validation',
        scrollTargetId: 'self-evolution-snapshot:history',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'progress',
      summaryLine: '验证快照已抓取。',
      detailLine: '新的快照已经加入，且验证快照现已存在。修复闭环仍然打开，直到剩余连续性条件被清除。',
    })
  })

  it('reports repair closure when the action closes the loop', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '修复闭环已关闭。',
      detailLine: '这条反复漂移工作流的修复关闭条件已经全部满足。下一步请抓取新的基线快照。',
    })
  })

  it('does not claim validation snapshot capture when the count did not increase', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'capture-snapshot',
        label: 'Capture validation snapshot',
        detail: '...',
        targetType: 'snapshot',
        targetId: 'validation',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:validation',
        scrollTargetId: 'self-evolution-snapshot:history',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      snapshotCountBefore: 2,
      snapshotCountAfter: 2,
    })).toEqual({
      tone: 'progress',
      summaryLine: '已推进到下一项修复目标：快照 / validation。',
      detailLine: '请求的修复动作已经完成，工作台已推进到下一项连续性检查目标。',
    })
  })

  it('falls back to the executed action when no follow-up navigation is available', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-trace',
        label: 'Inspect trace-details',
        detail: '...',
        targetType: 'trace',
        targetId: 'trace-details',
      },
      followupNavigation: null,
      repairClosureBefore: {
        isClosed: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        summaryLines: [],
      },
      snapshotCountBefore: 1,
      snapshotCountAfter: 1,
    })).toEqual({
      tone: 'progress',
      summaryLine: '修复动作已完成：检查 轨迹细节。',
      detailLine: '工作台暂时还没有识别出更新的后续目标，请继续验证当前连续性界面。',
    })
  })

  it('reports continuity-governance confirmation when a repair action closes the same-her loop', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: 'same-her 连续性闭环已确认。',
      detailLine: '这次连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的同一个她状态重新开始。',
    })
  })

  it('reports project-state continuity confirmation when a repair action closes the project-state governance loop', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '项目状态连续性闭环已确认。',
      detailLine: '这次项目状态连续性治理已经再次得到验证。下一步请抓取新的基线快照，让后续连续性会话从这次确认后的项目身份、Phase 1 主线和未闭环任务承接重新开始。',
    })
  })

  it('reports body-led continuity confirmation when a repair action closes the loop with the body line still carrying the segment', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: 'body-led same-her continuity already visible through authority-body:yes.',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，speech 正在沿同一条连续身体线补回显形权威',
        ],
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体承接态 -> speech 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，speech authority 已沿同一条连续身体线补回。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
    })
  })

  it('keeps structured body rejoin closure wording primary when closure evidence only exposes the validated rejoin phase', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '...',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可进入基线判断。',
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体承接态 -> VRM 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，VRM authority 已沿同一条连续身体线补回。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
    })
  })

  it('keeps body-only-hold closure wording primary when validation confirms the body line still carries the same segment without renderer recovery', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '继续核对身体连续性：身体线是否仍独自托住同一段 living segment。',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态。',
          '身体连续性：身体线仍在独自托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体独撑态闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。下一步请抓取新的基线快照。',
    })
  })

  it('keeps body-only-hold closure wording primary when validation only exposes the legacy same-her note', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '继续核对身体连续性：身体线是否仍独自托住同一段 living segment。',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          `身体连续性：${legacyNote}`,
        ],
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体独撑态闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。下一步请抓取新的基线快照。',
    })
  })

  it('keeps full-cross-modal-lock closure wording primary when validation confirms body and renderer stay locked on the same segment', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '继续核对身体连续性：身体线与 Live2D 是否仍共同锁在同一段 living segment 上。',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（Live2D）。',
          '身体连续性：身体线与 Live2D 已经共同锁回同一段 living segment，而不是短暂同步。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体与 Live2D 跨模态重锁闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线与 Live2D authority 仍稳定锁在同一段 living segment 上，所以这更像同一个 her 的跨模态重锁，而不是临时显形补回。下一步请抓取新的基线快照。',
    })
  })

  it('keeps renderer-rejoin-without-body closure wording primary when validation confirms visible recovery without body carry', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '继续核对身体连续性：显形已回接但身体线是否还托住同一段 living segment。',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于显形回接失身态（VRM）。',
          '身体连续性：VRM 虽然已经回接，但身体线没有继续托住同一段 living segment，这更像显形回接失身而不是修复完成。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '显形回接失身态（VRM）已完成闭环确认。',
      detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的是 VRM authority 已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。下一步请抓取新的基线快照。',
    })
  })

  it('prefers quieter same-her surviving lane closure wording when structured lane metadata confirms face lipsync voice continuity without body carry', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect governance-normalized',
        detail: '继续核对身体连续性：虽然显形层已回接，但当前仍只剩表情、口型、声音这条 same-her 生命线贴着同一段 living segment。',
        targetType: 'event',
        targetId: 'governance-normalized',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      snapshotCountBefore: 3,
      snapshotCountAfter: 3,
    })).toEqual({
      tone: 'success',
      summaryLine: '表情、口型、声音 same-her 存活线闭环已确认。',
      detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。下一步请抓取新的基线快照。',
    })
  })

  it('keeps body continuity confirmation primary when a body-led embodiment closure also carries broader project-state support lines', () => {
    expect(buildSelfEvolutionRepairActionFeedback({
      executedAction: {
        kind: 'inspect-event',
        label: 'Inspect takeover-audit',
        detail: 'body-led same-her continuity already visible through authority-body:yes.',
        targetType: 'event',
        targetId: 'takeover-audit',
      },
      followupNavigation: {
        activeSurfaceKey: 'snapshot:baseline',
        scrollTargetId: 'self-evolution-snapshot:capture',
      },
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        summaryLines: [
          '项目状态连续性治理已经被新的验证快照再次确认。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（Live2D authority rejoin），可进入基线判断。',
          '身体线已经先把这段 living segment 托住，Live2D 正在沿同一条连续身体线补回显形权威。',
          'authority-body:yes',
        ],
      },
      snapshotCountBefore: 4,
      snapshotCountAfter: 4,
    })).toEqual({
      tone: 'success',
      summaryLine: '身体承接态 -> Live2D 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，Live2D authority 已沿同一条连续身体线补回。下一步请抓取新的基线快照，让后续连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairSession } from './performance-visualizer-self-evolution-repair-session'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution repair session', () => {
  it('returns null when there is no active workflow focus', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: null,
      viewedEvidencePanels: new Set<string>(),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toBeNull()
  })

  it('builds a partially completed repair checklist from active workflow targets and viewed progress', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：人格/思绪层',
        summaryLine: '正在修复该反复漂移模式的当前侧。',
        repairOwnerHint: '私有思绪治理',
        prosodyAuthorityHint: null,
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
      },
      viewedEvidencePanels: new Set([
        'private-thought-governance-chain',
      ]),
      viewedTraceSections: new Set([
        'trace-details',
      ]),
      viewedEventKinds: new Set([
        'takeover-audit',
      ]),
    })).toEqual({
      completionPercent: 43,
      completedCount: 3,
      totalCount: 7,
      completedChecklist: [
        'evidence:private-thought-governance-chain',
        'trace:trace-details',
        'event:takeover-audit',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:governance-normalized',
        'event:person-state-updated',
      ],
      bodyContinuityPhase: null,
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '已完成 7 项中的 3 项修复检查，当前归属为私有思绪治理。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：治理归位，人格状态更新',
      ],
    })
  })

  it('reports a completed session when every active workflow target has been inspected', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形权威层',
        summaryLine: '正在修复该反复漂移模式的前一侧。',
        repairOwnerHint: '显形权威',
        prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'person-state-updated',
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set([
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ]),
      viewedEventKinds: new Set([
        'person-state-updated',
        'takeover-audit',
      ]),
    })).toEqual({
      completionPercent: 100,
      completedCount: 7,
      totalCount: 7,
      completedChecklist: [
        'evidence:renderer-authority-projection',
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'trace:trace-consumption',
        'trace:trace-timeline',
        'event:person-state-updated',
        'event:takeover-audit',
      ],
      remainingChecklist: [],
      bodyContinuityPhase: null,
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '已完成 7 项中的 7 项修复检查，当前归属为显形权威。',
        '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        '该反复漂移工作流的修复检查已全部覆盖。',
      ],
    })
  })

  it('adds a project-state continuity carry summary when the same her is still checking project identity, Phase 1 route, and unresolved open loops', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：项目状态连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，project-state continuity is still under review.',
        repairOwnerHint: '项目状态连续性治理',
        prosodyAuthorityHint: null,
        evidencePanels: new Set([
          'candidate-trajectory-summary',
          'identity-drift-governance-summary',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'candidate-trajectory-summary',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:candidate-trajectory-summary',
      ],
      remainingChecklist: [
        'evidence:identity-drift-governance-summary',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      bodyContinuityPhase: null,
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为项目状态连续性治理。',
        '剩余证据：身份漂移治理摘要',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对项目身份、Phase 1 本地主数字生命主线与未闭环任务承接，确认这些生命线是否还被同一个她连续带入下一轮。',
      ],
    })
  })

  it('adds a body continuity carry summary when the workflow is still checking whether the body line holds the same living segment', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，body continuity is still under review.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment。',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      bodyContinuityPhase: null,
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否继续托住同一段 living segment，并确认表情、动作、口型是否正在补回同一条连续身体线。',
      ],
    })
  })

  it('adds a body continuity phase summary when the workflow has reached body-carried-to-renderer-rejoin instead of generic body review wording', () => {
    expect(buildSelfEvolutionRepairSession({
      rendererTarget: 'live2d',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，body continuity is entering renderer rejoin.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererTarget: 'vrm',
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
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 20,
      completedCount: 1,
      totalCount: 5,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'trace:trace-timeline',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 5 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        '身体连续性阶段：身体承接态 -> 显形补回态。',
        '显形目标：Live2D',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件，轨迹时间线',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否继续托住同一段 living segment，并确认 Live2D 显形权威是否正在沿同一条连续身体线补回。',
      ],
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererTarget: 'live2d',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
    })
  })

  it('keeps same-her speech rejoin session semantics from structured fields even when the workflow wording becomes generic', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形补回层',
        summaryLine: '正在修复该反复漂移模式的当前侧，same-her manifestation recovery is still under review.',
        repairOwnerHint: '连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererTarget: null,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为连续性治理。',
        '身体连续性阶段：身体承接态 -> 显形补回态。',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否继续托住同一段 living segment，并确认 speech 显形权威是否正在沿同一条连续身体线补回。',
      ],
    })
  })

  it('uses a runtime body continuity phase override even when the workflow focus itself has not yet been refreshed from history guidance', () => {
    expect(buildSelfEvolutionRepairSession({
      rendererTarget: 'vrm',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧。',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment。',
        bodyContinuityPhase: null,
        rendererTarget: null,
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'trace-timeline',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:trace-timeline',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        '身体连续性阶段：身体承接态 -> 显形补回态。',
        '显形目标：VRM',
        '剩余证据：显形权威投影',
        '剩余轨迹：轨迹时间线',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否继续托住同一段 living segment，并确认 VRM 显形权威是否正在沿同一条连续身体线补回。',
      ],
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererTarget: 'vrm',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
    })
  })

  it('does not fabricate a speech rejoin target when body rejoin is active but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形补回层',
        summaryLine: '正在修复该反复漂移模式的当前侧，same-her manifestation recovery is still under review.',
        repairOwnerHint: '连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为连续性治理。',
        '身体连续性阶段：身体承接态 -> 显形补回态。',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否继续托住同一段 living segment，并确认显形权威是否正在沿同一条连续身体线补回。',
      ],
    })
  })

  it('keeps body-only-hold repair semantics explicit so the workflow does not overstate renderer recovery before any surface has actually rejoined', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'body-only-hold',
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，body continuity is still under review.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对当前片段的身体线是否仍托住同一段 living segment。',
        bodyContinuityPhase: 'body-only-hold',
        rendererTarget: 'live2d',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        '身体连续性阶段：身体独撑态。',
        '显形目标：Live2D',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否还在独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。',
      ],
      bodyContinuityPhase: 'body-only-hold',
      rendererTarget: 'live2d',
      rendererRejoinSurfaceKey: null,
    })
  })

  it('keeps renderer-rejoin-without-body repair semantics explicit so body-loss is not mistaken for completed embodiment repair', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，body continuity drift is still under review.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对为什么显形层已经回接，但身体线没有继续托住当前片段。',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        rendererTarget: 'vrm',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'trace-timeline',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:trace-timeline',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对为什么显形层已经回接，但身体线没有继续托住当前片段。',
        '身体连续性阶段：显形回接失身态。',
        '显形目标：VRM',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：轨迹时间线',
        '剩余事件：接管审计',
        '本轮仍在核对为什么 VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这种失身回接误判成修复完成。',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: 'vrm',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
    })
  })

  it('keeps quieter face+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，quieter face+lipsync carry is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。',
        bodyContinuityPhase: null,
        survivingVisibleLane: 'face+lipsync-only',
        rendererTarget: 'live2d',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线。',
        '身体连续性阶段：显形回接失身态。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对当前是否仍只有 face 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、motion 和 voice 为什么还没有重新接回这条表情口型线。',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync-only',
    })
  })

  it('keeps quieter motion+lipsync same-her carry explicit in repair-session instead of flattening it into generic renderer-rejoin-without-body wording', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，quieter motion+lipsync carry is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。',
        bodyContinuityPhase: null,
        survivingVisibleLane: 'motion+lipsync-only',
        rendererTarget: 'vrm',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线。',
        '身体连续性阶段：显形回接失身态。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对当前是否仍只有 motion 和 lipsync 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、face 和 voice 为什么还没有重新接回这条动作口型线。',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync-only',
    })
  })

  it('keeps quieter face+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，quieter face+lipsync+voice carry is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
        bodyContinuityPhase: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        rendererTarget: 'live2d',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
        '身体连续性阶段：显形回接失身态。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对当前是否仍只有 face、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、motion 为什么还没有重新接回这条表情口型声音线。',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
    })
  })

  it('keeps quieter motion+lipsync+voice same-her carry explicit in repair-session instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，quieter motion+lipsync+voice carry is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。',
        bodyContinuityPhase: null,
        survivingVisibleLane: 'motion+lipsync+voice-only',
        rendererTarget: 'vrm',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:renderer-authority-projection',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线。',
        '身体连续性阶段：显形回接失身态。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对当前是否仍只有 motion、lipsync 和 voice 这条 same-her 生命线与同一段 living segment 对齐，并确认 body、face 为什么还没有重新接回这条动作口型声音线。',
      ],
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'motion+lipsync+voice-only',
    })
  })

  it('keeps full-cross-modal-lock repair semantics explicit so stable rejoin is verified instead of assumed from one aligned frame', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，cross-modal lock is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '优先核对身体线与 speech 显形是否已经稳定锁回同一段 living segment。',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        rendererTarget: null,
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 25,
      completedCount: 1,
      totalCount: 4,
      completedChecklist: [
        'evidence:runtime-continuity-projection',
      ],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 4 项中的 1 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：优先核对身体线与 speech 显形是否已经稳定锁回同一段 living segment。',
        '身体连续性阶段：跨模态重锁态。',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在确认身体线与 speech 显形权威是否已经稳定锁回同一段 living segment，而不是短暂对齐后再次散开。',
      ],
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererTarget: null,
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
    })
  })

  it('infers full-cross-modal-lock repair semantics from the body continuity hint even when structured phase metadata is still missing', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：身体连续性层',
        summaryLine: '正在修复该反复漂移模式的当前侧，cross-modal lock is under verification.',
        repairOwnerHint: '身体连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        rendererTarget: null,
        evidencePanels: new Set([
          'renderer-authority-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set<string>(),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 0,
      completedCount: 0,
      totalCount: 3,
      completedChecklist: [],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 3 项中的 0 项修复检查，当前归属为身体连续性治理。',
        '身体连续性：身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
        '身体连续性阶段：跨模态重锁态。',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在确认身体线与显形权威是否已经稳定锁回同一段 living segment，而不是短暂对齐后再次散开。',
      ],
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererTarget: null,
      rendererRejoinSurfaceKey: null,
    })
  })

  it('keeps body-only-hold same-her repair narration even when workflow ownership wording falls back to generic continuity', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: 'body-only-hold',
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形补回层',
        summaryLine: '正在修复该反复漂移模式的当前侧，same-her manifestation recovery is still under review.',
        repairOwnerHint: '连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityPhase: 'body-only-hold',
        rendererTarget: 'live2d',
        evidencePanels: new Set([
          'renderer-authority-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set<string>(),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 0,
      completedCount: 0,
      totalCount: 3,
      completedChecklist: [],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 3 项中的 0 项修复检查，当前归属为连续性治理。',
        '身体连续性阶段：身体独撑态。',
        '显形目标：Live2D',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否还在独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。',
      ],
      bodyContinuityPhase: 'body-only-hold',
      rendererTarget: 'live2d',
      rendererRejoinSurfaceKey: null,
    })
  })

  it('infers body-only-hold repair semantics from the legacy same-her body continuity note when structured phase metadata is missing', () => {
    expect(buildSelfEvolutionRepairSession({
      bodyContinuityPhase: null,
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形补回层',
        summaryLine: '正在修复该反复漂移模式的当前侧，same-her manifestation recovery is still under review.',
        repairOwnerHint: '连续性治理',
        prosodyAuthorityHint: null,
        bodyContinuityHint: legacyNote,
        bodyContinuityPhase: null,
        rendererTarget: 'live2d',
        evidencePanels: new Set([
          'renderer-authority-projection',
        ]),
        traceSections: new Set([
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set<string>(),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toEqual({
      completionPercent: 0,
      completedCount: 0,
      totalCount: 3,
      completedChecklist: [],
      remainingChecklist: [
        'evidence:renderer-authority-projection',
        'trace:selected-trace-event',
        'event:takeover-audit',
      ],
      summaryLines: [
        '已完成 3 项中的 0 项修复检查，当前归属为连续性治理。',
        `身体连续性：${legacyNote}`,
        '身体连续性阶段：身体独撑态。',
        '显形目标：Live2D',
        '剩余证据：显形权威投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：接管审计',
        '本轮仍在核对身体线是否还在独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。',
      ],
      bodyContinuityPhase: 'body-only-hold',
      rendererTarget: 'live2d',
      rendererRejoinSurfaceKey: null,
    })
  })
})

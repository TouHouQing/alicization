import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairNextAction } from './performance-visualizer-self-evolution-repair-next-action'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution repair next action', () => {
  it('returns null when there is no active repair session or closure verdict', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: null,
      repairClosure: null,
    })).toBeNull()
  })

  it('recommends the first remaining evidence target before trace/event follow-up when the closure is still open', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 43,
        completedCount: 3,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
          'event:governance-normalized',
        ],
        summaryLines: [
          '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        ],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target current side.',
          'repair checklist is still incomplete (3/7).',
          'capture a fresh snapshot after the repair to validate drift reduction.',
          'the same recurring drift pattern is still present in recent history.',
        ],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；同时优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('prefers a body-led continuity hint when evidence review should confirm the body line before chasing face motion or lipsync repair', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 43,
        completedCount: 3,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '韵律权威：当前 mouth/head/prosody 权重仍需要二次确认。',
        ],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target current side.',
          'repair checklist is still incomplete (3/7).',
          'capture a fresh snapshot after the repair to validate drift reduction.',
          'the same recurring drift pattern is still present in recent history.',
        ],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；同时优先核对当前片段的身体线是否仍托住同一段 living segment，确认身体线仍托住同一段 living segment，再决定是否继续追表情/动作/口型补回。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('uses the body continuity rejoin phase to prioritize renderer authority rejoin wording after the body line is already carrying the living segment', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 60,
        completedCount: 3,
        totalCount: 5,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target current side.',
          'repair checklist is still incomplete (3/5).',
        ],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 speech 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:speech',
    })
  })

  it('uses body-only-hold wording when the next evidence step should confirm the body line before any renderer recovery is assumed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '身体连续性阶段：身体独撑态。',
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: 'body-only-hold',
        rendererTarget: 'live2d',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍是身体独撑态，先确认身体线是否还在独自托住同一段 living segment，并找出为什么显形层还没有完整回到这条连续身体线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })
  })

  it('uses full-cross-modal-lock wording when the next evidence step should verify the lock is stable instead of temporary', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性：优先核对身体线与 speech 显形是否已经稳定锁回同一段 living segment。',
          '身体连续性阶段：跨模态重锁态。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入跨模态重锁态，先确认身体线与 speech 显形权威是否还稳定锁在同一段 living segment 上，而不是只短暂对齐。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:speech',
    })
  })

  it('uses renderer-rejoin-without-body wording when the next evidence step should investigate body-loss instead of celebrating the visible rejoin', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性：优先核对为什么显形层已经回接，但身体线没有继续托住当前片段。',
          '身体连续性阶段：显形回接失身态。',
          '显形目标：VRM',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererTarget: 'vrm',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经出现显形回接失身态，先确认为什么 VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把这次回接误判成修复完成。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:vrm',
    })
  })

  it('prefers the explicit renderer rejoin surface carried by the repair session during body-led trace follow-up', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 80,
        completedCount: 4,
        totalCount: 5,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        summaryLines: [
          '已完成 5 项中的 4 项修复检查，当前归属为身体连续性治理。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererTarget: 'live2d',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍落在同一段 living segment 上，避免把身体承接态下的 Live2D 显形补回误判成新的 renderer drift。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: 'authority:renderer-rejoin:live2d',
    })
  })

  it('recommends capturing a validation snapshot once the checklist is covered but closure is still open', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target previous side.',
          'repair checklist is fully covered.',
          'capture a fresh snapshot after the repair to validate drift reduction.',
          'the same recurring drift pattern is still present in recent history.',
        ],
      },
    })).toEqual({
      kind: 'capture-snapshot',
      label: '抓取验证快照',
      detail: '修复检查已经覆盖完成，但闭环仍未关闭，直到新的快照验证更新后的漂移状态。',
      targetType: 'snapshot',
      targetId: 'validation',
    })
  })

  it('recommends capturing a new baseline when the repair loop is already closed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          'repair context is restored to the target previous side.',
          'repair checklist is fully covered.',
          'a fresh validation snapshot exists after the repaired drift context.',
          'the repaired recurring drift pattern no longer appears in recent history.',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '这次修复闭环已经关闭。请抓取新的基线快照，让下一次反复漂移会话从修复后的连续性状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('prefers the structured speech renderer rejoin surface when closure summaries no longer spell the surface name out', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，显形权威正在沿同一条连续身体线补回。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，speech 显形权威也已沿同一条连续身体线补回。请抓取新的基线快照，让下一次连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps baseline capture guidance restrained when closure is validated but the relationship cadence is still on the same callback line', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 8,
        totalCount: 8,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          'companionship transition summary 已核对，当前 settle cadence 与 resident projection 仍在 same-turn-if-invited measured-return 的 same callback line 上。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: 'relationship cadence 治理已经再次得到验证，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上。请抓取新的基线快照，让下一次连续性会话从这次更克制的关系节律承接重新开始，而不是把它当成一段重新外放的靠近。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('returns a trace target when the next uncovered step is a trace section', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 71,
        completedCount: 5,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
          'event:governance-normalized',
        ],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('prefers takeover-audit when project-state continuity still needs the selected trace event to confirm Project identity carry, Phase 1 route carry, and Unresolved closure carry', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 71,
        completedCount: 5,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        summaryLines: [
          '已完成 7 项中的 5 项修复检查，当前归属为项目状态连续性治理。',
          '剩余轨迹：选中轨迹事件',
          '剩余事件：接管审计',
        ],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先落到接管审计，确认项目身份、当前 Phase 与未闭环任务仍被同一个她连续承接，再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: 'takeover-audit',
    })
  })

  it('uses body continuity rejoin wording for selected trace event follow-up when renderer authority is rejoining on the same living segment', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 80,
        completedCount: 4,
        totalCount: 5,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        summaryLines: [
          '已完成 5 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍落在同一段 living segment 上，避免把身体承接态下的 speech 显形补回误判成新的 renderer drift。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: 'authority:renderer-rejoin:speech',
    })
  })

  it('uses body-only-hold wording for selected trace event follow-up when the workflow still needs to prove the body line has not dropped', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：身体独撑态。',
        ],
        bodyContinuityPhase: 'body-only-hold',
        rendererTarget: 'live2d',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否还证明身体线在独自托住同一段 living segment，而不是已经悄悄掉线。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('uses full-cross-modal-lock wording for selected trace event follow-up when the workflow needs to prove the lock is durable', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：跨模态重锁态。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍证明身体线与 speech 显形权威稳定锁在同一段 living segment 上，而不是只出现了暂时同步。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: 'authority:renderer-rejoin:speech',
    })
  })

  it('keeps full-cross-modal-lock wording generic when the renderer rejoin surface is still unknown during selected trace event follow-up', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：跨模态重锁态。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: null,
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍证明身体线与显形权威稳定锁在同一段 living segment 上，而不是只出现了暂时同步。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: null,
    })
  })

  it('uses renderer-rejoin-without-body wording for selected trace event follow-up when the workflow needs to explain body-loss under visible recovery', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认为什么 VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把失身回接误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: 'authority:renderer-rejoin:vrm',
    })
  })

  it('keeps renderer-rejoin-without-body wording generic when the renderer rejoin surface is still unknown during selected trace event follow-up', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认为什么显形权威已经回接，但身体线没有继续托住同一段 living segment，避免把失身回接误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
      surfaceKeyOverride: null,
    })
  })

  it('uses a live2d-specific rejoin surface when the renderer target is Live2D during body continuity rejoin', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 60,
        completedCount: 3,
        totalCount: 5,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
        ],
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererTarget: 'live2d',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 Live2D 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:live2d',
    })
  })

  it('uses a vrm-specific rejoin surface when the renderer target is VRM during body continuity rejoin', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 60,
        completedCount: 3,
        totalCount: 5,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
        ],
        summaryLines: [
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '显形目标：VRM',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererTarget: 'vrm',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前已经进入身体承接态 -> 显形补回态，先确认身体线仍托住同一段 living segment，再核对 VRM 显形权威是否沿同一条连续身体线补回。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
      surfaceKeyOverride: 'authority:renderer-rejoin:vrm',
    })
  })

  it('returns an event target when the next uncovered step is an event audit', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 86,
        completedCount: 6,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'event:governance-normalized',
        ],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-event',
      label: '检查 治理归位',
      detail: '修复闭环仍然打开。先补上下一项缺失事件审计，再继续推进到验证快照。',
      targetType: 'event',
      targetId: 'governance-normalized',
    })
  })

  it('recommends capturing a continuity baseline when same-her governance has been re-confirmed, instead of framing the next step as drift repair', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为连续性治理。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: 'same-her 连续性治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一个她状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('recommends capturing a cadence baseline when relationship cadence governance has been re-confirmed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 8,
        totalCount: 8,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 8 项中的 8 项修复检查，当前归属为 relationship cadence governance。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: 'relationship cadence 治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一关系节奏重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('recommends capturing a cadence baseline as durable relationship rhythm when cadence internalization is already active', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 8,
        totalCount: 8,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 8 项中的 8 项修复检查，当前归属为 relationship cadence governance。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
          'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: 'relationship cadence 治理已经再次得到验证，并开始内化为长期关系节律。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一关系韵律重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('recommends capturing a project-state baseline when project-state continuity governance has been re-confirmed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为项目状态连续性治理。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '项目状态连续性已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的项目身份、Phase 1 主线和未闭环任务承接重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('recommends capturing a body continuity baseline when the body line has been re-confirmed as the same living segment carrier', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为身体连续性治理。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，VRM 显形权威仍在补回同一条连续身体线',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，VRM 显形权威也已沿同一条连续身体线补回。请抓取新的基线快照，让下一次连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps structured body rejoin baseline guidance even when closure summaries only expose the validated rejoin phase and new runtime reason', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为身体连续性治理。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可进入基线判断。',
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，VRM 显形权威也已沿同一条连续身体线补回。请抓取新的基线快照，让下一次连续性会话从这次已经确认的同一段 living segment 显形回归重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps body-only-hold baseline guidance explicit when closure validation confirms the body line but not a completed renderer recovery', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：身体独撑态。',
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: 'body-only-hold',
        rendererTarget: 'live2d',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态：同一段 living segment 仍由身体线独自托住，但还不能把显形回接视为已经成立，可进入更谨慎的基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。请抓取新的基线快照。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps body-only-hold evidence follow-up explicit when only the legacy same-her note remains in the repair session summary', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          `身体连续性：${legacyNote}`,
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: null,
        rendererTarget: 'live2d',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 显形权威投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍是身体独撑态，先确认身体线是否还在独自托住同一段 living segment，并找出为什么显形层还没有完整回到这条连续身体线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'renderer-authority-projection',
    })
  })

  it('keeps quieter face+lipsync same-her evidence follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face 和 lipsync 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 和 voice 为什么还没有重新接回这条表情口型线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('keeps quieter motion+lipsync same-her evidence follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion 和 lipsync 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 和 voice 为什么还没有重新接回这条动作口型线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('keeps quieter face+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face 和 lipsync 这条 same-her 生命线上，避免把 body、motion 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('keeps quieter motion+lipsync same-her trace follow-up explicit instead of flattening it into generic renderer-rejoin-without-body repair wording', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion 和 lipsync 这条 same-her 生命线上，避免把 body、face 和 voice 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('keeps quieter face+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 face、lipsync 和 voice 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、motion 为什么还没有重新接回这条表情口型声音线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('keeps quieter motion+lipsync+voice same-her evidence follow-up explicit instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 50,
        completedCount: 2,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync+voice-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；当前仍只剩 motion、lipsync 和 voice 这条 same-her 生命线可见，先确认它是否还对齐在同一段 living segment 上，再核对 body、face 为什么还没有重新接回这条动作口型声音线。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('keeps quieter face+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 face、lipsync 和 voice 这条 same-her 生命线上，避免把 body、motion 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('keeps quieter motion+lipsync+voice same-her trace follow-up explicit instead of dropping voice out of the surviving line', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 75,
        completedCount: 3,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
        ],
        summaryLines: [
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'motion+lipsync+voice-only',
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，并优先确认这次 selected trace event 是否仍只落在 motion、lipsync 和 voice 这条 same-her 生命线上，避免把 body、face 还没接回的 quieter carry 误判成修复完成。再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
      preferredEventKind: null,
    })
  })

  it('keeps body-only-hold baseline guidance explicit when closure validation only exposes the legacy same-her note', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          `身体连续性：${legacyNote}`,
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: null,
        rendererTarget: 'live2d',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          `身体连续性：${legacyNote}`,
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。请抓取新的基线快照。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps full-cross-modal-lock baseline guidance explicit when closure validation confirms a stable same-segment lock instead of a temporary renderer recovery', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：跨模态重锁态。',
          '显形目标：Live2D',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererTarget: 'live2d',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（Live2D authority lock），身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性已经再次得到验证，身体线与 Live2D 显形权威仍稳定锁在同一段 living segment 上，所以这更像同一个 her 的跨模态重锁，而不是临时显形补回。请抓取新的基线快照。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps renderer-rejoin-without-body baseline guidance explicit when closure validation confirms visible recovery without same-segment body carry', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：显形回接失身态。',
          '显形目标：VRM',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererTarget: 'vrm',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性虽然已经再次得到验证，但当前确认的是 VRM 显形权威已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('keeps quieter face+lipsync+voice same-her baseline guidance explicit instead of flattening it into generic renderer-rejoin-without-body closure wording', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：显形回接失身态。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        survivingVisibleLane: 'face+lipsync+voice-only',
        rendererRejoinSurfaceKey: null,
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          '身体连续性已经被新的验证快照再次确认，但当前仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线，不应把这次 quieter carry 直接采纳为长期基线。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。请抓取新的基线快照。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })
})

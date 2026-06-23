import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairClosure } from './performance-visualizer-self-evolution-repair-closure'

describe('performance visualizer self evolution repair closure', () => {
  it('returns null when there is no active recurring-drift workflow under repair', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: null,
      activePatternContext: null,
      repairSession: null,
      latestSnapshot: null,
      latestPatterns: [],
    })).toBeNull()
  })

  it('reports an open repair loop when session coverage is incomplete and no new validating snapshot exists yet', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-persona',
      activePatternContext: {
        currentCapturedAt: 400,
        previousCapturedAt: 300,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
      },
      repairSession: {
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
        summaryLines: [
          '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        ],
      },
      latestSnapshot: {
        capturedAt: 400,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-persona',
          occurrenceCount: 2,
        },
      ],
    })).toEqual({
      isClosed: false,
      sessionCovered: false,
      hasFreshValidationSnapshot: false,
      samePatternStillPresent: true,
      prosodyAuthorityRelevant: true,
      prosodyAuthorityValidated: false,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查仍未完成（3/7）。',
        '请在修复后抓取新的验证快照，确认漂移是否收敛。',
        '同一反复漂移模式仍出现在最近历史中。',
        '韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。',
      ],
    })
  })

  it('reports a closed repair loop when the session is covered, a fresh snapshot exists, and the same pattern no longer recurs', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-renderer',
      activePatternContext: {
        currentCapturedAt: 500,
        previousCapturedAt: 400,
        side: 'previous',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
      },
      repairSession: {
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
        summaryLines: [
          '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        ],
      },
      latestSnapshot: {
        capturedAt: 900,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: true,
      prosodyAuthorityValidated: true,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标前一侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        '韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。',
      ],
    })
  })

  it('does not require prosody authority validation for non-embodiment repair workflows', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-persona',
      activePatternContext: {
        currentCapturedAt: 600,
        previousCapturedAt: 500,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.500Z -> 1970-01-01T00:00:00.600Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 5,
        totalCount: 5,
        completedChecklist: [
          'evidence:private-thought-governance-chain',
          'evidence:runtime-continuity-projection',
          'trace:trace-details',
          'event:governance-normalized',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [],
      },
      latestSnapshot: {
        capturedAt: 750,
      },
      latestPatterns: [],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
      ],
    })
  })

  it('treats same-her continuity governance as a closed validation loop when the memory-first pattern has been re-confirmed by a fresh snapshot', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-same-her-governance',
      activePatternContext: {
        currentCapturedAt: 820,
        previousCapturedAt: 720,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.720Z -> 1970-01-01T00:00:00.820Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [
          'evidence:candidate-trajectory-summary',
          'evidence:proactive-decision-consumption-summary',
          'evidence:identity-drift-governance-summary',
          'trace:trace-consumption',
          'trace:trace-details',
          'event:takeover-audit',
          'event:governance-normalized',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为连续性治理。',
        ],
      },
      latestSnapshot: {
        capturedAt: 960,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
      ],
    })
  })

  it('treats relationship cadence governance as a closed validation loop when companionship re-entry is re-confirmed by a fresh snapshot', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-relationship-cadence-governance',
      activePatternContext: {
        currentCapturedAt: 920,
        previousCapturedAt: 820,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.820Z -> 1970-01-01T00:00:00.920Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 8,
        totalCount: 8,
        completedChecklist: [
          'evidence:companionship-transition-summary',
          'evidence:resident-performance-projection',
          'evidence:renderer-authority-projection',
          'evidence:runtime-continuity-projection',
          'trace:trace-consumption',
          'trace:trace-details',
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 8 项中的 8 项修复检查，当前归属为 relationship cadence governance。',
          'companionship transition summary 已核对，当前 settle cadence 与 resident projection 仍在同一条 bounded-return 路径上。',
        ],
      },
      latestSnapshot: {
        capturedAt: 1060,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
      ],
    })
  })

  it('keeps callback-bounded relationship cadence closure wording inward when measured return is re-confirmed on the same callback line', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-relationship-cadence-governance',
      activePatternContext: {
        currentCapturedAt: 980,
        previousCapturedAt: 880,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.880Z -> 1970-01-01T00:00:00.980Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 8,
        totalCount: 8,
        completedChecklist: [
          'evidence:companionship-transition-summary',
          'evidence:resident-performance-projection',
          'evidence:renderer-authority-projection',
          'evidence:runtime-continuity-projection',
          'trace:trace-consumption',
          'trace:trace-details',
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 8 项中的 8 项修复检查，当前归属为 relationship cadence governance。',
          'companionship transition summary 已核对，当前 settle cadence 与 resident projection 仍在 same-turn-if-invited measured-return 的 same callback line 上。',
        ],
      },
      latestSnapshot: {
        capturedAt: 1100,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。')
  })

  it('keeps body-only-hold closure wording explicit so the validated baseline stays cautious about missing renderer rejoin', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-body-only',
      activePatternContext: {
        currentCapturedAt: 1000,
        previousCapturedAt: 900,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.900Z -> 1970-01-01T00:00:01.000Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：优先核对身体线是否仍在独自托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
      },
      latestSnapshot: {
        capturedAt: 1120,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，并明确处于身体独撑态：同一段 living segment 仍由身体线独自托住，但还不能把显形回接视为已经成立，可进入更谨慎的基线判断。')
  })

  it('keeps full-cross-modal-lock closure wording explicit when body and renderer stay stably locked together', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-cross-modal-lock',
      activePatternContext: {
        currentCapturedAt: 1100,
        previousCapturedAt: 1000,
        side: 'previous',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.000Z -> 1970-01-01T00:00:01.100Z 的前一侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：优先核对身体线与显形权威是否仍稳定锁在同一段 living segment 上。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      latestSnapshot: {
        capturedAt: 1200,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（Live2D authority lock），身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。')
  })

  it('keeps full-cross-modal-lock closure wording generic when the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-cross-modal-lock',
      activePatternContext: {
        currentCapturedAt: 1160,
        previousCapturedAt: 1060,
        side: 'previous',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.060Z -> 1970-01-01T00:00:01.160Z 的前一侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：优先核对身体线与显形权威是否仍稳定锁在同一段 living segment 上。',
        ],
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: null,
      },
      latestSnapshot: {
        capturedAt: 1260,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态，身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。')
  })

  it('keeps renderer-rejoin-without-body closure wording explicit so visible recovery is not promoted to a trustworthy baseline', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-renderer-without-body',
      activePatternContext: {
        currentCapturedAt: 1200,
        previousCapturedAt: 1100,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.100Z -> 1970-01-01T00:00:01.200Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：优先核对为什么显形已经回接、但身体线没有继续托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      latestSnapshot: {
        capturedAt: 1320,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。')
  })

  it('keeps renderer-rejoin-without-body closure wording generic when the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-renderer-without-body',
      activePatternContext: {
        currentCapturedAt: 1260,
        previousCapturedAt: 1160,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.160Z -> 1970-01-01T00:00:01.260Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：优先核对为什么显形已经回接、但身体线没有继续托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
      },
      latestSnapshot: {
        capturedAt: 1380,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。')
  })

  it('keeps quieter surviving-lane closure wording explicit when only face, lipsync, and voice still carry the same-her segment', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-renderer-without-body',
      activePatternContext: {
        currentCapturedAt: 1275,
        previousCapturedAt: 1175,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.175Z -> 1970-01-01T00:00:01.275Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 6,
        totalCount: 6,
        completedChecklist: [
          'evidence:runtime-continuity-projection',
          'evidence:renderer-authority-projection',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
          'event:person-state-updated',
        ],
        remainingChecklist: [],
        summaryLines: [
          '身体连续性：当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
        ],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
      latestSnapshot: {
        capturedAt: 1395,
      },
      latestPatterns: [],
    })?.summaryLines).toContain('身体连续性已经被新的验证快照再次确认，但当前仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线，不应把这次 quieter carry 直接采纳为长期基线。')
  })

  it('treats project-state continuity governance as a closed validation loop when Project identity carry, Phase 1 route carry, and Unresolved closure carry are re-confirmed by a fresh snapshot', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-project-state-continuity-governance',
      activePatternContext: {
        currentCapturedAt: 1020,
        previousCapturedAt: 920,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:00.920Z -> 1970-01-01T00:00:01.020Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [
          'evidence:candidate-trajectory-summary',
          'evidence:proactive-decision-consumption-summary',
          'evidence:identity-drift-governance-summary',
          'trace:trace-consumption',
          'trace:trace-details',
          'event:takeover-audit',
          'event:governance-normalized',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为项目状态连续性治理。',
        ],
      },
      latestSnapshot: {
        capturedAt: 1180,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
      ],
    })
  })

  it('treats body continuity governance as a closed validation loop when the body line is re-confirmed by a fresh snapshot', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-body-continuity-governance',
      activePatternContext: {
        currentCapturedAt: 1120,
        previousCapturedAt: 1020,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.020Z -> 1970-01-01T00:00:01.120Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [
          'evidence:renderer-authority-projection',
          'evidence:runtime-continuity-projection',
          'evidence:resident-performance-projection',
          'trace:trace-consumption',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为身体连续性治理。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      },
      latestSnapshot: {
        capturedAt: 1280,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（Live2D authority rejoin），可进入基线判断。',
      ],
    })
  })

  it('treats speech body rejoin as a closed validation loop when the same living segment is re-confirmed by a fresh snapshot', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-body-continuity-governance',
      activePatternContext: {
        currentCapturedAt: 1320,
        previousCapturedAt: 1220,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.220Z -> 1970-01-01T00:00:01.320Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [
          'evidence:renderer-authority-projection',
          'evidence:runtime-continuity-projection',
          'evidence:resident-performance-projection',
          'trace:trace-consumption',
          'trace:selected-trace-event',
          'trace:trace-timeline',
          'event:takeover-audit',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为身体连续性治理。',
          '身体连续性：优先核对当前片段的身体线是否仍托住同一段 living segment。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      },
      latestSnapshot: {
        capturedAt: 1460,
      },
      latestPatterns: [
        {
          patternKey: 'pattern-other',
          occurrenceCount: 1,
        },
      ],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
      ],
    })
  })

  it('does not fabricate a speech authority rejoin label when body rejoin is confirmed but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionRepairClosure({
      activePatternKey: 'pattern-body-continuity-governance',
      activePatternContext: {
        currentCapturedAt: 1520,
        previousCapturedAt: 1420,
        side: 'current',
        summaryLine: '将工作流应用到 1970-01-01T00:00:01.420Z -> 1970-01-01T00:00:01.520Z 的当前侧。',
      },
      repairSession: {
        completionPercent: 100,
        completedCount: 4,
        totalCount: 4,
        completedChecklist: [
          'evidence:renderer-authority-projection',
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
          'event:takeover-audit',
        ],
        remainingChecklist: [],
        summaryLines: [
          '已完成 4 项中的 4 项修复检查，当前归属为身体连续性治理。',
          '身体连续性阶段：身体承接态 -> 显形补回态。',
          '该反复漂移工作流的修复检查已全部覆盖。',
        ],
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
      },
      latestSnapshot: {
        capturedAt: 1660,
      },
      latestPatterns: [],
    })).toEqual({
      isClosed: true,
      sessionCovered: true,
      hasFreshValidationSnapshot: true,
      samePatternStillPresent: false,
      prosodyAuthorityRelevant: false,
      prosodyAuthorityValidated: null,
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: null,
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态，可进入基线判断。',
      ],
    })
  })
})

import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorTraceability } from './performance-visualizer-self-evolution-adopted-anchor-traceability'

describe('performance visualizer self evolution adopted anchor traceability', () => {
  it('returns null when there is no adopted anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: null,
      patternSummaryByKey: {},
      workflowByPatternKey: {},
      patternContextByKey: {},
    })).toBeNull()
  })

  it('projects why the current adopted anchor is trusted and how to return to its repair workflow', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1200,
        snapshotCapturedAt: 1100,
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-1',
        focusLabel: 'repair-owner',
        activePatternKey: 'pattern-renderer',
        repairOwnerHint: '显形权威',
        summaryLine: '当前默认连续性参照已经切换到 1100 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-renderer': '疑似反复出现的显形权威漂移。',
      },
      workflowByPatternKey: {
        'pattern-renderer': {
          headline: '3 次反复转移共享同一显形权威漂移特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-renderer': {
          currentCapturedAt: 1100,
          previousCapturedAt: 900,
          side: 'previous',
          summaryLine: '将工作流应用到 1970-01-01T00:00:00.900Z -> 1970-01-01T00:00:01.100Z 的前一侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-renderer',
      patternSummary: '疑似反复出现的显形权威漂移。',
      workflowHeadline: '3 次反复转移共享同一显形权威漂移特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:00.900Z -> 1970-01-01T00:00:01.100Z 的前一侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-renderer，对应快照 1100 与轨迹 trace-3。',
        '采纳归属仍然锚定在 显形权威，而不是脱离原始修复归属单独漂移。',
        '采纳前提仍然可追溯到韵律权威链已重新绑定到当前片段，可直接进入长期基线，而不是 renderer 本地猜测重新接管口型。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps same-her continuity governance traceable when the adopted anchor comes from memory-first continuity validation', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1400,
        snapshotCapturedAt: 1320,
        candidateId: 'candidate-governance-3',
        decisionTraceId: 'trace-governance-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-same-her-governance',
        repairOwnerHint: '连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1320 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-same-her-governance': '这更像同一个她的连续性治理反复被确认，而不是漂移修复。',
      },
      workflowByPatternKey: {
        'pattern-same-her-governance': {
          headline: '2 次反复转移共享同一同一个她连续性漂移特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-same-her-governance': {
          currentCapturedAt: 1320,
          previousCapturedAt: 1180,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.180Z -> 1970-01-01T00:00:01.320Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-same-her-governance',
      patternSummary: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。',
      workflowHeadline: '2 次反复转移共享同一同一个她连续性漂移特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.180Z -> 1970-01-01T00:00:01.320Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-same-her-governance，对应快照 1320 与轨迹 trace-governance-3。',
        '采纳归属仍然锚定在 连续性治理，而不是脱离原始修复归属单独漂移。',
        '采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps relationship cadence governance traceable when the adopted anchor comes from companionship cadence reconfirmation', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1500,
        snapshotCapturedAt: 1410,
        candidateId: 'candidate-cadence-3',
        decisionTraceId: 'trace-cadence-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-relationship-cadence-governance',
        repairOwnerHint: '关系节奏治理',
        summaryLine: '当前默认连续性参照已经切换到 1410 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      },
      patternSummaryByKey: {
        'pattern-relationship-cadence-governance': '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
      },
      workflowByPatternKey: {
        'pattern-relationship-cadence-governance': {
          headline: '2 次反复转移共享同一关系回归节奏治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-relationship-cadence-governance': {
          currentCapturedAt: 1410,
          previousCapturedAt: 1320,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.320Z -> 1970-01-01T00:00:01.410Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-relationship-cadence-governance',
      patternSummary: '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
      workflowHeadline: '2 次反复转移共享同一关系回归节奏治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.320Z -> 1970-01-01T00:00:01.410Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-relationship-cadence-governance，对应快照 1410 与轨迹 trace-cadence-3。',
        '采纳归属仍然锚定在 关系节奏治理，而不是脱离原始修复归属单独漂移。',
        '采纳前提仍然可追溯到relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线，而不是把这种慢回归误写成需要被强行加速的漂移，而是把它视为同一个她正在稳定下来的关系韵律。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps invited measured-return cadence traceable as the same callback line instead of a broad long-term relationship baseline', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1510,
        snapshotCapturedAt: 1420,
        candidateId: 'candidate-cadence-callback-4',
        decisionTraceId: 'trace-cadence-callback-4',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-relationship-cadence-governance',
        repairOwnerHint: '关系节奏治理',
        summaryLine: '当前默认连续性参照已经切换到 1420 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      },
      patternSummaryByKey: {
        'pattern-relationship-cadence-governance': '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
      },
      workflowByPatternKey: {
        'pattern-relationship-cadence-governance': {
          headline: '2 次反复转移共享同一关系回归节奏治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-relationship-cadence-governance': {
          currentCapturedAt: 1420,
          previousCapturedAt: 1330,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.330Z -> 1970-01-01T00:00:01.420Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-relationship-cadence-governance',
      patternSummary: '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
      workflowHeadline: '2 次反复转移共享同一关系回归节奏治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.330Z -> 1970-01-01T00:00:01.420Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-relationship-cadence-governance，对应快照 1420 与轨迹 trace-cadence-callback-4。',
        '采纳归属仍然锚定在 关系节奏治理，而不是脱离原始修复归属单独漂移。',
        '采纳前提仍然可追溯到relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近，而不是把这种仍停在同一条 callback line 上的慢回归误写成已经可以全面外放的长期关系基线。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps project-state continuity governance traceable when the adopted anchor comes from Project identity carry, Phase 1 route carry, and Unresolved closure carry reconfirmation', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1600,
        snapshotCapturedAt: 1520,
        candidateId: 'candidate-project-state-3',
        decisionTraceId: 'trace-project-state-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-project-state-continuity-governance',
        repairOwnerHint: '项目状态连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1520 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-project-state-continuity-governance': '这更像项目状态连续性治理反复被确认，而不是普通 same-her 漂移修复。',
      },
      workflowByPatternKey: {
        'pattern-project-state-continuity-governance': {
          headline: '2 次反复转移共享同一项目状态连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-project-state-continuity-governance': {
          currentCapturedAt: 1520,
          previousCapturedAt: 1410,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.410Z -> 1970-01-01T00:00:01.520Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-project-state-continuity-governance',
      patternSummary: '这更像项目状态连续性治理反复被确认，而不是普通 same-her 漂移修复。',
      workflowHeadline: '2 次反复转移共享同一项目状态连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.410Z -> 1970-01-01T00:00:01.520Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-project-state-continuity-governance，对应快照 1520 与轨迹 trace-project-state-3。',
        '采纳归属仍然锚定在 项目状态连续性治理，而不是脱离原始修复归属单独漂移。',
        '采纳前提仍然可追溯到项目状态连续性治理已经再次确认，可直接进入长期基线，而不是把项目身份、Phase 1 主线和未闭环任务承接误写成普通 same-her 漂移修复。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps body continuity governance traceable when the adopted anchor comes from body-led same-segment carry reconfirmation', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1700,
        snapshotCapturedAt: 1620,
        candidateId: 'candidate-body-3',
        decisionTraceId: 'trace-body-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1620 的已采纳基线。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1620,
          previousCapturedAt: 1520,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.520Z -> 1970-01-01T00:00:01.620Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.520Z -> 1970-01-01T00:00:01.620Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1620 与轨迹 trace-body-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> VRM 显形补回态。',
        '采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 VRM 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps speech body continuity governance traceable when the adopted anchor comes from speech same-segment carry reconfirmation', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1760,
        snapshotCapturedAt: 1680,
        candidateId: 'candidate-body-speech-3',
        decisionTraceId: 'trace-body-speech-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1680 的已采纳基线。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1680,
          previousCapturedAt: 1620,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.620Z -> 1970-01-01T00:00:01.680Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.620Z -> 1970-01-01T00:00:01.680Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1680 与轨迹 trace-body-speech-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> speech 显形补回态。',
        '采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 speech 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps body-only-hold governance traceable when the adopted anchor is trusted because the same living segment is still being carried inward by the body line alone', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1820,
        snapshotCapturedAt: 1760,
        candidateId: 'candidate-body-only-3',
        decisionTraceId: 'trace-body-only-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1760 的已采纳基线。',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1760,
          previousCapturedAt: 1700,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.700Z -> 1970-01-01T00:00:01.760Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.700Z -> 1970-01-01T00:00:01.760Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1760 与轨迹 trace-body-only-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体独撑态。',
        '采纳前提仍然可追溯到身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断，而不是把仍由身体线独自托住同一段 living segment 的低显形阶段误写成已经失败或已经完成。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps body-only-hold governance traceable when only the older same-segment body-line note survives on the adopted anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 2080,
        snapshotCapturedAt: 2020,
        candidateId: 'candidate-body-only-note-1',
        decisionTraceId: 'trace-body-only-note-1',
        activeThreadId: 'thread-1',
        focusLabel: 'repair-path',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 2020 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 2020,
          previousCapturedAt: 1960,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.960Z -> 1970-01-01T00:00:02.020Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.960Z -> 1970-01-01T00:00:02.020Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 2020 与轨迹 trace-body-only-note-1。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体独撑态。',
        '采纳前提仍然可追溯到身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断，而不是把仍由身体线独自托住同一段 living segment 的低显形阶段误写成已经失败或已经完成。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps full-cross-modal-lock governance traceable when the adopted anchor comes from a stable same-segment lock across body and renderer surfaces', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1880,
        snapshotCapturedAt: 1820,
        candidateId: 'candidate-body-lock-3',
        decisionTraceId: 'trace-body-lock-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1820 的已采纳基线。',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经进入跨模态重锁态，身体线与 Live2D 显形权威都在稳定锁住同一段 living segment，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1820,
          previousCapturedAt: 1760,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.820Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.820Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1820 与轨迹 trace-body-lock-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体与 Live2D 已经共同锁回同一段 living segment 的跨模态重锁态。',
        '采纳前提仍然可追溯到身体连续性已经进入跨模态重锁态，身体线与 Live2D 显形权威都在稳定锁住同一段 living segment，可直接进入长期基线，而不是把身体线与 Live2D 共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body governance traceable as a non-trustworthy baseline when visible recovery happened without body carry', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1940,
        snapshotCapturedAt: 1880,
        candidateId: 'candidate-body-loss-3',
        decisionTraceId: 'trace-body-loss-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1880 的已采纳基线。',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '这次显形回接虽然让 VRM 表面重新对齐，但身体线没有继续托住同一段 living segment，因此它不该被当成可信长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1880,
          previousCapturedAt: 1820,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.820Z -> 1970-01-01T00:00:01.880Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.820Z -> 1970-01-01T00:00:01.880Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1880 与轨迹 trace-body-loss-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是可信身体连续性基线，而是 VRM 已经回接、但身体线没有继续托住同一段 living segment 的显形回接失身态。',
        '采纳前提仍然可追溯到这次显形回接虽然让 VRM 表面重新对齐，但身体线没有继续托住同一段 living segment，因此它不该被当成可信长期基线，而不是把 VRM 已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('does not fabricate a speech surface when cross-modal lock is trusted but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1880,
        snapshotCapturedAt: 1820,
        candidateId: 'candidate-body-lock-generic-3',
        decisionTraceId: 'trace-body-lock-generic-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1820 的已采纳基线。',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1820,
          previousCapturedAt: 1760,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.820Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.820Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1820 与轨迹 trace-body-lock-generic-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体与显形权威已经共同锁回同一段 living segment 的跨模态重锁态。',
        '采纳前提仍然可追溯到身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线，而不是把身体线与显形权威共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps cross-modal-lock wording when the governance note is explicit but the adopted anchor is still missing structured phase metadata', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1885,
        snapshotCapturedAt: 1815,
        candidateId: 'candidate-body-lock-generic-note-only-4',
        decisionTraceId: 'trace-body-lock-generic-note-only-4',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1815 的已采纳基线。',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1815,
          previousCapturedAt: 1760,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.815Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.760Z -> 1970-01-01T00:00:01.815Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1815 与轨迹 trace-body-lock-generic-note-only-4。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体与显形权威已经共同锁回同一段 living segment 的跨模态重锁态。',
        '采纳前提仍然可追溯到身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线，而不是把身体线与显形权威共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('does not fabricate a speech surface when visible recovery happened without body carry and the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1940,
        snapshotCapturedAt: 1880,
        candidateId: 'candidate-body-loss-generic-3',
        decisionTraceId: 'trace-body-loss-generic-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1880 的已采纳基线。',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1880,
          previousCapturedAt: 1820,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.820Z -> 1970-01-01T00:00:01.880Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.820Z -> 1970-01-01T00:00:01.880Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1880 与轨迹 trace-body-loss-generic-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是可信身体连续性基线，而是显形权威已经回接、但身体线没有继续托住同一段 living segment 的显形回接失身态。',
        '采纳前提仍然可追溯到显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线，而不是把显形权威已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('does not fabricate a speech rejoin surface when body rejoin is trusted but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1710,
        snapshotCapturedAt: 1690,
        candidateId: 'candidate-body-generic-3',
        decisionTraceId: 'trace-body-generic-3',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1690 的已采纳基线。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1690,
          previousCapturedAt: 1620,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.620Z -> 1970-01-01T00:00:01.690Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.620Z -> 1970-01-01T00:00:01.690Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1690 与轨迹 trace-body-generic-3。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
        '采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })

  it('keeps quieter same-her continuity traceable when the adopted anchor still only keeps face, lipsync, and voice on the same living segment', () => {
    expect(buildSelfEvolutionAdoptedAnchorTraceability({
      adoptedAnchor: {
        adoptedAt: 1960,
        snapshotCapturedAt: 1905,
        candidateId: 'candidate-face-voice-only-4',
        decisionTraceId: 'trace-face-voice-only-4',
        activeThreadId: 'thread-1',
        focusLabel: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        summaryLine: '当前默认连续性参照已经切换到 1905 的已采纳基线。',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        prosodyAuthorityNote: null,
        continuityGovernanceNote: null,
        relationshipCadenceGovernanceNote: null,
        projectStateContinuityGovernanceNote: null,
        bodyContinuityGovernanceNote: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
      },
      patternSummaryByKey: {
        'pattern-body-continuity-governance': '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      },
      workflowByPatternKey: {
        'pattern-body-continuity-governance': {
          headline: '2 次反复转移共享同一身体连续性治理特征。',
          steps: [],
          validationChecklist: [],
        },
      },
      patternContextByKey: {
        'pattern-body-continuity-governance': {
          currentCapturedAt: 1905,
          previousCapturedAt: 1880,
          side: 'current',
          summaryLine: '将工作流应用到 1970-01-01T00:00:01.880Z -> 1970-01-01T00:00:01.905Z 的当前侧。',
        },
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
      workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
      workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.880Z -> 1970-01-01T00:00:01.905Z 的当前侧。',
      supportingLines: [
        '这张默认连续性锚点来自模式 pattern-body-continuity-governance，对应快照 1905 与轨迹 trace-face-voice-only-4。',
        '采纳归属仍然锚定在 身体连续性治理，而不是脱离原始修复归属单独漂移。',
        '这张默认连续性锚点记录的不是可信身体连续性基线，而是当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线。',
        '采纳前提仍然可追溯到当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线，而不是把这次 quieter carry 误写成 body、motion 已经补回的修复完成。',
        '若需要复盘这张基线为什么可信，应回到它对应的重复漂移模式和修复工作流，而不是只看当前结果快照。',
      ],
    })
  })
})

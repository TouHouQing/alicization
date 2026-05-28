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
})

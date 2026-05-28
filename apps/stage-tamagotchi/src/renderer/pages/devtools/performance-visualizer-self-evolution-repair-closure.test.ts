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
      summaryLines: [
        '修复上下文已还原到目标当前侧。',
        '修复检查已全部覆盖。',
        '修复后已经存在新的验证快照。',
        '已修复的反复漂移模式不再出现在最近历史中。',
        'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
      ],
    })
  })
})

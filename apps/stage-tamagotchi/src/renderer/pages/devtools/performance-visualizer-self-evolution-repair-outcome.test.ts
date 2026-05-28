import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'

describe('performance visualizer self evolution repair outcome', () => {
  it('returns null when there is no before/after repair closure context', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: null,
      repairClosureAfter: null,
    })).toBeNull()
  })

  it('reports which continuity conditions improved even when the repair loop stays open', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
    })).toEqual({
      closureChanged: false,
      improvedSignals: [
        'repair checklist is now fully covered',
        'fresh validation snapshot now exists',
      ],
      unresolvedSignals: [
        'same recurring drift pattern still present',
        'prosody authority chain has not reattached to the current segment',
      ],
      summaryLine: '修复证据已经改善，但闭环仍未关闭。',
      detailLine: '已改善：修复检查现已全部覆盖；新的验证快照现已存在。仍未解决：同一反复漂移模式仍然存在；韵律权威链尚未重新绑定到当前片段。',
    })
  })

  it('reports a full closure when every repair condition is satisfied', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: true,
        summaryLines: [],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
        'prosody authority chain reattached to the current segment',
      ],
      unresolvedSignals: [],
      summaryLine: '修复闭环已关闭。',
      detailLine: '这条反复漂移工作流的修复关闭条件已经全部满足。',
    })
  })

  it('returns a stable open summary when nothing improved', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
    })).toEqual({
      closureChanged: false,
      improvedSignals: [],
      unresolvedSignals: [
        'repair checklist not fully covered',
        'fresh validation snapshot missing',
        'same recurring drift pattern still present',
        'prosody authority chain has not reattached to the current segment',
      ],
      summaryLine: '修复闭环仍然打开，暂时还没有新的连续性增益。',
      detailLine: '仍未解决：修复检查尚未全部覆盖；新的验证快照仍然缺失；同一反复漂移模式仍然存在；韵律权威链尚未重新绑定到当前片段。',
    })
  })

  it('does not invent prosody authority signals for non-embodiment repair flows', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
      },
    })).toEqual({
      closureChanged: false,
      improvedSignals: [
        'repair checklist is now fully covered',
        'fresh validation snapshot now exists',
      ],
      unresolvedSignals: [
        'same recurring drift pattern still present',
      ],
      summaryLine: '修复证据已经改善，但闭环仍未关闭。',
      detailLine: '已改善：修复检查现已全部覆盖；新的验证快照现已存在。仍未解决：同一反复漂移模式仍然存在。',
    })
  })

  it('reports same-her continuity confirmation instead of generic drift repair when the governance loop closes', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: 'same-her 连续性闭环已确认。',
      detailLine: '这次连续性治理已经再次得到验证，remembered familiarity 仍然保持 memory-first，same-her room 与 bounded-growth 继续一致。',
    })
  })
})

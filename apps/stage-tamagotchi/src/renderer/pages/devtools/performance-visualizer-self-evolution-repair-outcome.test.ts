import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

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

  it('keeps body-only-hold closure wording explicit when closure validation only exposes the legacy same-her note', () => {
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
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          `身体连续性：${legacyNote}`,
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体独撑态闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，但当前确认的仍是身体线独自托住同一段 living segment 的身体独撑态；可见显形补回还不能被讲成已经成立。',
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

  it('reports relationship cadence confirmation instead of generic drift repair when the companionship governance loop closes', () => {
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
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: 'relationship cadence 连续性闭环已确认。',
      detailLine: '这次关系节奏治理已经再次得到验证，companionship hold mode、settle cadence 与 resident projection 继续保持同一条回归路径。',
    })
  })

  it('upgrades relationship cadence closure wording when the re-confirmed cadence is already being internalized as durable rhythm', () => {
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
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
          'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: 'relationship cadence 长期节律闭环已确认。',
      detailLine: '这次关系节奏治理已经再次得到验证，companionship hold mode、settle cadence 与 resident projection 不只保持同一条回归路径，也开始被固定成长期关系节律。',
    })
  })

  it('keeps relationship cadence closure wording restrained when same-turn-if-invited measured-return is still on the same callback line', () => {
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
          'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: 'relationship cadence callback-line 闭环已确认。',
      detailLine: '这次关系节奏治理已经再次得到验证，但 companionship hold mode、settle cadence 与 resident projection 仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，所以这更像同一个 her 的克制回身，而不是一段已经重新外放的靠近。',
    })
  })

  it('reports project-state continuity confirmation instead of generic drift repair when the project-state governance loop closes', () => {
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
          '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '项目状态连续性闭环已确认。',
      detailLine: '这次项目状态连续性治理已经再次得到验证，项目身份、Phase 1 本地主数字生命主线与未闭环任务承接继续保持在同一条 same-her 生命线程里。',
    })
  })

  it('reports body continuity confirmation instead of generic drift repair when the body-led embodiment loop closes', () => {
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
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，VRM 正在沿同一条连续身体线补回显形权威',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体承接态 -> VRM 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，而 VRM authority 也沿着同一条连续身体线补回，所以这更像同一个 her 的显形回归，而不是新的 renderer branch。',
    })
  })

  it('reports speech body continuity confirmation instead of generic drift repair when the speech-led embodiment loop closes', () => {
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
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，speech 正在沿同一条连续身体线补回显形权威',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体承接态 -> speech 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，而 speech authority 也沿着同一条连续身体线补回，所以这更像同一个 her 的显形回归，而不是新的 renderer branch。',
    })
  })

  it('prefers the structured speech rejoin surface even when closure summary lines no longer spell the surface name out', () => {
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
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，显形权威正在沿同一条连续身体线补回。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体承接态 -> speech 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，而 speech authority 也沿着同一条连续身体线补回，所以这更像同一个 her 的显形回归，而不是新的 renderer branch。',
    })
  })

  it('does not infer a speech renderer-rejoin surface from unrelated summary wording when the structured surface is still unknown', () => {
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
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，显形权威正在沿同一条连续身体线补回。',
          'speech 热点仍需继续审计，但这条说明不应把未知显形补回表面误写成 speech authority rejoin。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体连续性闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，表情、动作、口型都仍朝着同一条连续身体线补回。',
    })
  })

  it('keeps body continuity confirmation primary when body-led closure evidence also includes broader project-state support lines', () => {
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
          '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（Live2D authority rejoin），可进入基线判断。',
          'authority-body:yes',
          '身体线已经先把这段 living segment 托住，Live2D 正在沿同一条连续身体线补回显形权威',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体承接态 -> Live2D 显形补回闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线继续托住同一段 living segment，而 Live2D authority 也沿着同一条连续身体线补回，所以这更像同一个 her 的显形回归，而不是新的 renderer branch。',
    })
  })

  it('keeps renderer-rejoin-without-body closure explicit so visible recovery is not narrated as a body-carried renderer repair', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '显形回接失身态（VRM）已完成闭环确认。',
      detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的是 VRM authority 已经重新回接、而身体线没有继续托住同一段 living segment 的显形回接失身态；这说明可见恢复已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
    })
  })

  it('prefers the quieter same-her surviving lane wording when renderer rejoin happens without body carry but face lipsync voice still hold the same segment', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        survivingVisibleLane: 'face+lipsync+voice-only',
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，但当前仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线，不应把这次 quieter carry 直接采纳为长期基线。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '表情、口型、声音 same-her 存活线闭环已确认。',
      detailLine: '这次身体连续性虽然已经再次得到验证，但当前确认的仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，body、motion 还没有重新接回这条表情口型声音线；这说明 quieter carry 已经被追踪闭环，却仍不能把它叙述成同一条身体承接线上的可信显形补回。',
    })
  })

  it('keeps cross-modal-lock closure explicit when summary lines already confirm the stable same-segment lock but structured phase metadata is still missing', () => {
    expect(buildSelfEvolutionRepairOutcome({
      repairClosureBefore: {
        isClosed: false,
        hasFreshValidationSnapshot: false,
        samePatternStillPresent: true,
        sessionCovered: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
      },
      repairClosureAfter: {
        isClosed: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        sessionCovered: true,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        summaryLines: [
          '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
        ],
      },
    })).toEqual({
      closureChanged: true,
      improvedSignals: [
        'repair checklist is now fully covered',
        'fresh validation snapshot now exists',
        'same recurring drift pattern cleared from recent history',
      ],
      unresolvedSignals: [],
      summaryLine: '身体跨模态重锁闭环已确认。',
      detailLine: '这次身体连续性已经再次得到验证，身体线与显形权威仍稳定锁在同一段 living segment 上，所以这更像同一个 her 的跨模态重锁，而不是临时显形补回。',
    })
  })
})

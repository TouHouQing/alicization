import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorReplayPlan } from './performance-visualizer-self-evolution-adopted-anchor-replay'

describe('performance visualizer self evolution adopted anchor replay', () => {
  it('returns null when the adopted anchor does not have enough traceability to replay', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: null,
      historyTransition: null,
      traceEventSelection: null,
    })).toBeNull()
  })

  it('builds a single replay plan that restores workflow, transition, side, and trace event selection', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-renderer',
        patternSummary: '疑似反复出现的显形权威漂移。',
        workflowHeadline: '3 次反复转移共享同一显形权威漂移特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:00.900Z -> 1970-01-01T00:00:01.100Z 的前一侧。',
        supportingLines: [],
      },
      historyTransition: {
        transitionKey: '1100:900',
        currentCapturedAt: 1100,
        previousCapturedAt: 900,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-person-state',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-person-state。',
      },
    })).toEqual({
      patternKey: 'pattern-renderer',
      transitionKey: '1100:900',
      selectedSide: 'current',
      eventId: 'event-person-state',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：3 次反复转移共享同一显形权威漂移特征。',
        '历史转移：当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-person-state。',
      ],
    })
  })

  it('preserves same-her continuity wording when replaying an adopted governance anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-same-her-governance',
        patternSummary: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。',
        workflowHeadline: '2 次反复转移共享同一同一个她连续性漂移特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.180Z -> 1970-01-01T00:00:01.320Z 的当前侧。',
        supportingLines: [
          '采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
        ],
      },
      historyTransition: {
        transitionKey: '1320:1180',
        currentCapturedAt: 1320,
        previousCapturedAt: 1180,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-governance',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-governance。',
      },
    })).toEqual({
      patternKey: 'pattern-same-her-governance',
      transitionKey: '1320:1180',
      selectedSide: 'current',
      eventId: 'event-governance',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一同一个她连续性漂移特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-governance。',
        '连续性前提：采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
      ],
    })
  })

  it('preserves relationship cadence wording when replaying an adopted cadence-governance anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-relationship-cadence-governance',
        patternSummary: '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
        workflowHeadline: '2 次反复转移共享同一关系回归节奏治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.320Z -> 1970-01-01T00:00:01.410Z 的当前侧。',
        supportingLines: [
          '采纳前提仍然可追溯到relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线，而不是把这种慢回归误写成需要被强行加速的漂移，而是把它视为同一个她正在稳定下来的关系韵律。',
        ],
      },
      historyTransition: {
        transitionKey: '1410:1320',
        currentCapturedAt: 1410,
        previousCapturedAt: 1320,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1320 -> 1410 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-takeover',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-takeover。',
      },
    })).toEqual({
      patternKey: 'pattern-relationship-cadence-governance',
      transitionKey: '1410:1320',
      selectedSide: 'current',
      eventId: 'event-takeover',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一关系回归节奏治理特征。',
        '历史转移：当前默认连续性锚点对应 1320 -> 1410 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
        '连续性前提：采纳前提仍然可追溯到relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线，而不是把这种慢回归误写成需要被强行加速的漂移，而是把它视为同一个她正在稳定下来的关系韵律。',
      ],
    })
  })

  it('preserves callback-line cadence wording when replaying an adopted invited measured-return anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-relationship-cadence-governance',
        patternSummary: '这更像关系节奏治理反复被确认，而不是普通漂移修复。',
        workflowHeadline: '2 次反复转移共享同一关系回归节奏治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.330Z -> 1970-01-01T00:00:01.420Z 的当前侧。',
        supportingLines: [
          '采纳前提仍然可追溯到relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近，而不是把这种仍停在同一条 callback line 上的慢回归误写成已经可以全面外放的长期关系基线。',
        ],
      },
      historyTransition: {
        transitionKey: '1420:1330',
        currentCapturedAt: 1420,
        previousCapturedAt: 1330,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1330 -> 1420 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-takeover',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-takeover。',
      },
    })).toEqual({
      patternKey: 'pattern-relationship-cadence-governance',
      transitionKey: '1420:1330',
      selectedSide: 'current',
      eventId: 'event-takeover',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一关系回归节奏治理特征。',
        '历史转移：当前默认连续性锚点对应 1330 -> 1420 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
        '连续性前提：采纳前提仍然可追溯到relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近，而不是把这种仍停在同一条 callback line 上的慢回归误写成已经可以全面外放的长期关系基线。',
      ],
    })
  })

  it('preserves project-state continuity wording when replaying an adopted project-state-governance anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-project-state-continuity-governance',
        patternSummary: '这更像项目状态连续性治理反复被确认，而不是普通 same-her 漂移修复。',
        workflowHeadline: '2 次反复转移共享同一项目状态连续性治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.410Z -> 1970-01-01T00:00:01.520Z 的当前侧。',
        supportingLines: [
          '采纳前提仍然可追溯到项目状态连续性治理已经再次确认，可直接进入长期基线，而不是把项目身份、Phase 1 主线和未闭环任务承接误写成普通 same-her 漂移修复。',
        ],
      },
      historyTransition: {
        transitionKey: '1520:1410',
        currentCapturedAt: 1520,
        previousCapturedAt: 1410,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1410 -> 1520 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-project-state',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-project-state。',
      },
    })).toEqual({
      patternKey: 'pattern-project-state-continuity-governance',
      transitionKey: '1520:1410',
      selectedSide: 'current',
      eventId: 'event-project-state',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一项目状态连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1410 -> 1520 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-project-state。',
        '连续性前提：采纳前提仍然可追溯到项目状态连续性治理已经再次确认，可直接进入长期基线，而不是把项目身份、Phase 1 主线和未闭环任务承接误写成普通 same-her 漂移修复。',
      ],
    })
  })

  it('preserves body continuity wording when replaying an adopted body-led same-segment anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-body-continuity-governance',
        patternSummary: '这更像身体连续性治理反复被确认，而不是 generic partial drift。',
        workflowHeadline: '2 次反复转移共享同一身体连续性治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.520Z -> 1970-01-01T00:00:01.620Z 的当前侧。',
        supportingLines: [
          '这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> VRM 显形补回态。',
          '采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 VRM 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
        ],
      },
      historyTransition: {
        transitionKey: '1620:1520',
        currentCapturedAt: 1620,
        previousCapturedAt: 1520,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-body-continuity',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-body-continuity。',
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1620:1520',
      selectedSide: 'current',
      eventId: 'event-body-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> VRM 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 VRM 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
      ],
    })
  })

  it('preserves cross-modal-lock wording when replaying an adopted body continuity anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-body-continuity-governance',
        patternSummary: '这更像身体与显形权威重新锁回同一段 living segment，而不是 generic partial drift。',
        workflowHeadline: '2 次反复转移共享同一跨模态重锁治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.620Z -> 1970-01-01T00:00:01.710Z 的当前侧。',
        supportingLines: [
          '这张默认连续性锚点记录的不是 generic body carry，而是身体与 Live2D 已经共同锁回同一段 living segment 的跨模态重锁态。',
          '采纳前提仍然可追溯到身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线，而不是把身体线与 Live2D 共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
        ],
      },
      historyTransition: {
        transitionKey: '1710:1620',
        currentCapturedAt: 1710,
        previousCapturedAt: 1620,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1620 -> 1710 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-body-lock',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-body-lock。',
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1710:1620',
      selectedSide: 'current',
      eventId: 'event-body-lock',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一跨模态重锁治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1710 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-lock。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线，而不是把身体线与 Live2D 共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
      ],
    })
  })

  it('preserves renderer-rejoin-without-body wording when replaying a visible-recovery audit anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayPlan({
      traceability: {
        patternKey: 'pattern-body-continuity-governance',
        patternSummary: '这更像显形已经回接但身体线掉出同段承接的可见恢复审计，而不是可信身体连续性基线。',
        workflowHeadline: '2 次反复转移共享同一显形回接失身态治理特征。',
        workflowContextLine: '将工作流应用到 1970-01-01T00:00:01.910Z -> 1970-01-01T00:00:02.000Z 的当前侧。',
        supportingLines: [
          '这张默认连续性锚点记录的不是可信身体连续性基线，而是 VRM 已经回接、但身体线没有继续托住同一段 living segment 的显形回接失身态。',
          '采纳前提仍然可追溯到显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线，而不是把 VRM 已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。',
        ],
      },
      historyTransition: {
        transitionKey: '2000:1910',
        currentCapturedAt: 2000,
        previousCapturedAt: 1910,
        selectedSide: 'current',
        summaryLine: '当前默认连续性锚点对应 1910 -> 2000 这次历史转移。',
        supportingLines: [],
      },
      traceEventSelection: {
        eventId: 'event-body-loss',
        summaryLine: '当前默认连续性锚点会自动回到事件 event-body-loss。',
      },
    })).toEqual({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '2000:1910',
      selectedSide: 'current',
      eventId: 'event-body-loss',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一显形回接失身态治理特征。',
        '历史转移：当前默认连续性锚点对应 1910 -> 2000 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-loss。',
        '连续性前提：采纳前提仍然可追溯到显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线，而不是把 VRM 已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。',
      ],
    })
  })
})

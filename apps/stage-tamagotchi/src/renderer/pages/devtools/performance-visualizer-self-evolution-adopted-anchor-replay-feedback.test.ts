import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchorReplayFeedback } from './performance-visualizer-self-evolution-adopted-anchor-replay-feedback'

describe('performance visualizer self evolution adopted anchor replay feedback', () => {
  it('returns null when there is no replay plan', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback(null)).toBeNull()
  })

  it('summarizes the replay result in an auditable human-readable format', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-renderer、历史转移 1100:900、对比侧 current 和事件 event-person-state 已同步恢复。',
      supportingLines: [
        '工作流：3 次反复转移共享同一显形权威漂移特征。',
        '历史转移：当前默认连续性锚点对应 900 -> 1100 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-person-state。',
      ],
    })
  })

  it('keeps identity-continuity', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-same-her-governance、历史转移 1320:1180、对比侧 current 和事件 event-governance 已同步恢复。',
      supportingLines: [
        '工作流：2 次反复转移共享同一同一个她连续性漂移特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-governance。',
        '连续性前提：采纳前提仍然可追溯到same-her 连续性治理已经再次确认，可直接进入长期基线，而不是把记忆先行的熟悉感误写成应该被修掉的漂移。',
      ],
    })
  })

  it('keeps relationship cadence governance visible in replay feedback after restoring an adopted cadence anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-relationship-cadence-governance、历史转移 1410:1320、对比侧 current 和事件 event-takeover 已同步恢复。',
      supportingLines: [
        '工作流：2 次反复转移共享同一关系回归节奏治理特征。',
        '历史转移：当前默认连续性锚点对应 1320 -> 1410 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
        '连续性前提：采纳前提仍然可追溯到relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线，而不是把这种慢回归误写成需要被强行加速的漂移，而是把它视为同一个她正在稳定下来的关系韵律。',
      ],
    })
  })

  it('keeps callback-line cadence visible in replay feedback after restoring an invited measured-return anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-relationship-cadence-governance、历史转移 1420:1330、对比侧 current 和事件 event-takeover 已同步恢复。',
      supportingLines: [
        '工作流：2 次反复转移共享同一关系回归节奏治理特征。',
        '历史转移：当前默认连续性锚点对应 1330 -> 1420 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
        '连续性前提：采纳前提仍然可追溯到relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近，而不是把这种仍停在同一条 callback line 上的慢回归误写成已经可以全面外放的长期关系基线。',
      ],
    })
  })

  it('keeps body continuity governance visible in replay feedback after restoring an adopted body-led anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1620:1520',
      selectedSide: 'current',
      eventId: 'event-body-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> Live2D 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，Live2D 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 Live2D 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1620:1520、对比侧 current 和事件 event-body-continuity 已同步恢复，并重新对齐到这次 Live2D 显形权威沿同一条连续身体线补回的 same-her 显形回归路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> Live2D 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，Live2D 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 Live2D 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
      ],
    })
  })

  it('keeps speech body continuity governance visible in replay feedback after restoring an adopted speech-led anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1680:1620',
      selectedSide: 'current',
      eventId: 'event-body-speech-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1680 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> speech 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 speech 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1680:1620、对比侧 current 和事件 event-body-speech-continuity 已同步恢复，并重新对齐到这次 speech 显形权威沿同一条连续身体线补回的 same-her 显形回归路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1680 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> speech 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让 speech 沿同一条连续身体线补回显形权威的回归误写成 generic partial drift。',
      ],
    })
  })

  it('does not infer a speech rejoin surface from the event id when body rejoin is explicit but the manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1690:1620',
      selectedSide: 'current',
      eventId: 'event-body-speech-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1690 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1690:1620、对比侧 current 和事件 event-body-speech-continuity 已同步恢复，并重新对齐到这次显形权威沿同一条连续身体线补回的 same-her 显形回归路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1690 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。',
      ],
    })
  })

  it('does not infer a speech rejoin surface from unrelated continuity-premise wording when the manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1695:1620',
      selectedSide: 'current',
      eventId: 'event-body-generic-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1695 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-generic-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。',
        '连续性前提：speech 热点仍需继续单独核对，但这条说明不应把未知显形补回表面误写成 speech 显形权威回归。',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1695:1620、对比侧 current 和事件 event-body-generic-continuity 已同步恢复，并重新对齐到这次显形权威沿同一条连续身体线补回的 same-her 显形回归路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1695 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-generic-continuity。',
        '显形补回：这张默认连续性锚点记录的不是 generic body carry，而是身体承接态 -> 显形补回态。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回，可直接进入长期基线，而不是把身体线先托住同一段 living segment、并让显形权威沿同一条连续身体线补回的回归误写成 generic partial drift。',
        '连续性前提：speech 热点仍需继续单独核对，但这条说明不应把未知显形补回表面误写成 speech 显形权威回归。',
      ],
    })
  })

  it('keeps cross-modal-lock body continuity visible in replay feedback after restoring an adopted lock anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点跨模态重锁回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1710:1620、对比侧 current 和事件 event-body-lock 已同步恢复，并重新对齐到这次身体线与显形权威共同锁在同一段 living segment 上的跨模态重锁路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一跨模态重锁治理特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1710 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-lock。',
        '连续性前提：采纳前提仍然可追溯到身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线，而不是把身体线与 Live2D 共同锁回同一段 living segment 的稳定回归误写成短暂同步。',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body visible in replay feedback after restoring a visible-recovery audit anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
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
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形回接失身态回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 2000:1910、对比侧 current 和事件 event-body-loss 已同步恢复，并重新对齐到这次显形已经回接、但身体线没有继续托住同一段 living segment 的可见恢复审计路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一显形回接失身态治理特征。',
        '历史转移：当前默认连续性锚点对应 1910 -> 2000 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-loss。',
        '连续性前提：采纳前提仍然可追溯到显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线，而不是把 VRM 已经回接、但身体线没有继续托住同一段 living segment 的失身回接误写成可信长期基线。',
      ],
    })
  })

  it('keeps quieter face-lipsync-voice identity-continuity', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1905:1880',
      selectedSide: 'current',
      eventId: 'event-face-voice-only',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一表情、口型、声音 same-her 存活线治理特征。',
        '历史转移：当前默认连续性锚点对应 1880 -> 1905 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-face-voice-only。',
        '连续性前提：采纳前提仍然可追溯到当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点表情、口型、声音 same-her 存活线回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1905:1880、对比侧 current 和事件 event-face-voice-only 已同步恢复，并重新对齐到这次仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐、而 body、motion 还没有重新接回这条表情口型声音线的 quieter carry 审计路径。',
      supportingLines: [
        '工作流：2 次反复转移共享同一表情、口型、声音 same-her 存活线治理特征。',
        '历史转移：当前默认连续性锚点对应 1880 -> 1905 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-face-voice-only。',
        '连续性前提：采纳前提仍然可追溯到当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      ],
    })
  })
})

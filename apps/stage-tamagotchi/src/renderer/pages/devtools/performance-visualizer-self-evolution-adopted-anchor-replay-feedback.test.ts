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

  it('keeps an ordinary proactive action chain replay auditable', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-proactive-action-chain',
      transitionKey: '1320:1180',
      selectedSide: 'current',
      eventId: 'event-takeover',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      supportingLines: [
        '工作流：2 次反复转移共享同一 proactive-action-chain 特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
      ],
    })).toEqual({
      tone: 'progress',
      summaryLine: '默认连续性锚点回放已完成。',
      detailLine: '工作流 pattern-proactive-action-chain、历史转移 1320:1180、对比侧 current 和事件 event-takeover 已同步恢复。',
      supportingLines: [
        '工作流：2 次反复转移共享同一 proactive-action-chain 特征。',
        '历史转移：当前默认连续性锚点对应 1180 -> 1320 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-takeover。',
      ],
    })
  })

  it('uses the structured body phase and Live2D rejoin surface in replay feedback', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1620:1520',
      selectedSide: 'current',
      eventId: 'event-body-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      survivingVisibleLane: null,
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性特征。',
        '历史转移：当前默认连续性锚点对应 1520 -> 1620 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-continuity。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: expect.stringContaining('Live2D'),
    })
  })

  it('uses the structured speech rejoin surface in replay feedback', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1680:1620',
      selectedSide: 'current',
      eventId: 'event-body-speech-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      survivingVisibleLane: null,
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1680 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: expect.stringContaining('speech'),
    })
  })

  it('keeps the rejoin surface unknown even when the event id mentions speech', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1690:1620',
      selectedSide: 'current',
      eventId: 'event-body-speech-continuity',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: null,
      supportingLines: [
        '工作流：2 次反复转移共享同一身体连续性特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1690 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-speech-continuity。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形补回回放已完成。',
      detailLine: expect.not.stringContaining('speech 显形权威沿'),
    })
  })

  it('uses the structured cross-modal-lock phase in replay feedback', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1710:1620',
      selectedSide: 'current',
      eventId: 'event-body-lock',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'full-cross-modal-lock',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
      survivingVisibleLane: null,
      supportingLines: [
        '工作流：2 次反复转移共享同一跨模态连续性特征。',
        '历史转移：当前默认连续性锚点对应 1620 -> 1710 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-lock。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点跨模态重锁回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 1710:1620、对比侧 current 和事件 event-body-lock 已同步恢复，并重新对齐到这次身体线与显形权威共同锁在同一段 living segment 上的跨模态重锁路径。',
    })
  })

  it('uses the structured renderer-rejoin-without-body phase in replay feedback', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '2000:1910',
      selectedSide: 'current',
      eventId: 'event-body-loss',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      survivingVisibleLane: null,
      supportingLines: [
        '工作流：2 次反复转移共享同一可见恢复特征。',
        '历史转移：当前默认连续性锚点对应 1910 -> 2000 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-body-loss。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点显形回接失身态回放已完成。',
      detailLine: '工作流 pattern-body-continuity-governance、历史转移 2000:1910、对比侧 current 和事件 event-body-loss 已同步恢复，并重新对齐到这次显形已经回接、但身体线没有继续托住同一段 living segment 的可见恢复审计路径。',
    })
  })

  it('keeps a structured surviving visible lane in replay feedback', () => {
    expect(buildSelfEvolutionAdoptedAnchorReplayFeedback({
      patternKey: 'pattern-body-continuity-governance',
      transitionKey: '1905:1880',
      selectedSide: 'current',
      eventId: 'event-face-voice-only',
      summaryLine: '回放当前默认连续性锚点：恢复对应工作流、历史转移和事件定位。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: 'face+lipsync+voice-only',
      supportingLines: [
        '工作流：2 次反复转移共享同一可见连续性特征。',
        '历史转移：当前默认连续性锚点对应 1880 -> 1905 这次历史转移。',
        '事件定位：当前默认连续性锚点会自动回到事件 event-face-voice-only。',
      ],
    })).toMatchObject({
      tone: 'progress',
      summaryLine: '默认连续性锚点表情、口型、声音连续性存活线回放已完成。',
      detailLine: expect.stringContaining('表情、口型、声音'),
    })
  })
})

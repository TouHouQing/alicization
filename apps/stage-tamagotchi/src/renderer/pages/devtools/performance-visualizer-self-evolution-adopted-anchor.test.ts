import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionAdoptedAnchor } from './performance-visualizer-self-evolution-adopted-anchor'

describe('performance visualizer self evolution adopted anchor', () => {
  it('returns null when there is no adoption history', () => {
    expect(buildSelfEvolutionAdoptedAnchor([])).toBeNull()
  })

  it('projects the latest adopted baseline as the current default continuity anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1200,
        snapshotCapturedAt: 1100,
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-owner',
        activePatternKey: 'pattern-renderer',
        repairOwnerHint: '显形权威',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1000,
        snapshotCapturedAt: 900,
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        activePatternKey: 'pattern-proactive-action-chain',
        repairOwnerHint: '主动行动链',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        prosodyAuthorityNote: null,
      },
    ])).toEqual({
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
      survivingVisibleLane: null,
      prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    })
  })

  it('projects a proactive action chain adoption as the current default anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1400,
        snapshotCapturedAt: 1320,
        candidateId: 'candidate-proactive-action-3',
        decisionTraceId: 'trace-proactive-action-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-proactive-action-chain',
        repairOwnerHint: '主动行动链',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      },
    ])).toEqual({
      adoptedAt: 1400,
      snapshotCapturedAt: 1320,
      candidateId: 'candidate-proactive-action-3',
      decisionTraceId: 'trace-proactive-action-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-proactive-action-chain',
      repairOwnerHint: '主动行动链',
      summaryLine: '当前默认连续性参照已经切换到 1320 的已采纳基线。',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      survivingVisibleLane: null,
      prosodyAuthorityNote: null,
    })
  })

  it('projects structured body continuity fields on the current default anchor', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1700,
        snapshotCapturedAt: 1620,
        candidateId: 'candidate-body-3',
        decisionTraceId: 'trace-body-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        survivingVisibleLane: null,
      },
    ])).toEqual({
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
      survivingVisibleLane: null,
      prosodyAuthorityNote: null,
    })
  })

  it('projects the surviving visible lane without deriving it from prose', () => {
    expect(buildSelfEvolutionAdoptedAnchor([
      {
        version: 'self-evolution-baseline-adoption/v1',
        adoptedAt: 1760,
        snapshotCapturedAt: 1680,
        candidateId: 'candidate-visible-lane-3',
        decisionTraceId: 'trace-visible-lane-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        activePatternKey: 'pattern-body-continuity-governance',
        repairOwnerHint: '身体连续性治理',
        adoptionMode: 'adopt-now',
        summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        survivingVisibleLane: 'face+lipsync+voice-only',
      },
    ])).toEqual({
      adoptedAt: 1760,
      snapshotCapturedAt: 1680,
      candidateId: 'candidate-visible-lane-3',
      decisionTraceId: 'trace-visible-lane-3',
      activeThreadId: 'thread-1',
      focusLabel: 'first-check',
      activePatternKey: 'pattern-body-continuity-governance',
      repairOwnerHint: '身体连续性治理',
      summaryLine: '当前默认连续性参照已经切换到 1680 的已采纳基线。',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
      survivingVisibleLane: 'face+lipsync+voice-only',
      prosodyAuthorityNote: null,
    })
  })
})

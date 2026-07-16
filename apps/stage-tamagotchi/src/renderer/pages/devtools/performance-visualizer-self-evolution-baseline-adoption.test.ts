import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineAdoption } from './performance-visualizer-self-evolution-baseline-adoption'

describe('performance visualizer self evolution baseline adoption', () => {
  it('returns null when baseline quality is unavailable', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: null,
      latestSnapshot: null,
      history: [],
    })).toBeNull()
  })

  it('adopts a trusted baseline immediately when it is the latest post-repair anchor', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 900 晚于上一张锚点 700。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'post repair baseline',
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-2',
        capturedAt: 900,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'post repair baseline',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-2',
          capturedAt: 900,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'pre repair state',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 700,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      ],
    })
  })

  it('keeps a provisional baseline in observation mode instead of adopting it', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'provisional',
        summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
        detailLine: '虽然最新快照更晚，但在把它当作长期基线之前，仍然存在尚未解决的修复信号。',
        supportingLines: [
          '最新快照时间 850 晚于上一张锚点 700。',
          '尚未解决的连续性信号：同一反复漂移模式仍然存在。',
          '韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'validation only',
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-2',
        capturedAt: 850,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'validation only',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-2',
          capturedAt: 850,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'pre repair state',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 700,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        '韵律权威链尚未回到当前片段，因此不能进入长期基线。',
      ],
    })
  })

  it('rejects a stale baseline and asks for recapture', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'stale',
        summaryLine: '这张基线已经过期，在信任它之前应重新抓取。',
        detailLine: '最新快照没有越过上一张连续性锚点，因此它还不足以充当下一张基线。',
        supportingLines: [
          '最新快照时间 700 并不晚于上一张锚点 700。',
          '请先抓取新的修复后快照，再替换连续性锚点。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-1',
        decisionTraceId: 'trace-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'stale retry',
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-1',
        capturedAt: 700,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'stale retry',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 700,
        },
      ],
    })).toEqual({
      mode: 'reject',
      summaryLine: '不要采纳这张基线，先重新抓取新的修复后快照。',
      detailLine: '这张基线已经失效，直接采纳只会把旧锚点误当成新的连续性参照。',
      supportingLines: [
        '当前基线质量 verdict 为 stale。',
        '必须先产生一张真正更新的修复后快照。',
      ],
    })
  })

  it('keeps a trusted baseline in observation mode when a newer snapshot exists, while preserving prosody authority readiness as context', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 900 晚于上一张锚点 700。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-2',
        decisionTraceId: 'trace-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'trusted but not newest',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['trace-consumption'],
        recommendedTraceEventId: 'event-2',
        capturedAt: 900,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-3',
          decisionTraceId: 'trace-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'newer observation',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-3',
          capturedAt: 960,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'trusted but not newest',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-2',
          capturedAt: 900,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
      detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 trusted。',
        '但历史中已经存在更晚的连续性快照。',
        '韵律权威链已经就绪；当前仅因存在更新快照而继续观察。',
      ],
    })
  })

  it('adopts a trusted cadence baseline as durable relationship rhythm when internalization support is present', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 990 晚于上一张锚点 930。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-4',
        decisionTraceId: 'trace-4',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'cadence internalized baseline',
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-4',
        capturedAt: 990,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-4',
          decisionTraceId: 'trace-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'cadence internalized baseline',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-4',
          capturedAt: 990,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-3',
          decisionTraceId: 'trace-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-3',
          capturedAt: 930,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可直接进入长期关系基线。',
      ],
    })
  })

  it('keeps a trusted invited measured-return cadence baseline restrained instead of upgrading it into a broad long-term relationship baseline', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1010 晚于上一张锚点 950。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-cadence-callback-4',
        decisionTraceId: 'trace-cadence-callback-4',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'invited callback cadence baseline',
        highlightedEvidencePanelIds: ['companionship-transition-summary'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-cadence-callback-4',
        capturedAt: 1010,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-cadence-callback-4',
          decisionTraceId: 'trace-cadence-callback-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'invited callback cadence baseline',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-cadence-callback-4',
          capturedAt: 1010,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-cadence-callback-3',
          decisionTraceId: 'trace-cadence-callback-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous cadence baseline',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-cadence-callback-3',
          capturedAt: 950,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，应作为更克制的关系节律基线继续承接，而不是被扩写成一段新的外放靠近。',
      ],
    })
  })

  it('adopts a trusted body-led continuity baseline immediately when the body line already carries the latest living segment', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1010 晚于上一张锚点 950。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-4',
        decisionTraceId: 'trace-body-4',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'body-led trusted baseline',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
        recommendedTraceEventId: 'event-body-4',
        capturedAt: 1010,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-4',
          decisionTraceId: 'trace-body-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'body-led trusted baseline',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
          recommendedTraceEventId: 'event-body-4',
          capturedAt: 1010,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-3',
          decisionTraceId: 'trace-body-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-3',
          capturedAt: 950,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      ],
    })
  })

  it('adopts a trusted body-led continuity baseline immediately when the latest supporting line uses the new renderer rejoin closure wording', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1020 晚于上一张锚点 950。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（VRM authority rejoin），可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-closure-4',
        decisionTraceId: 'trace-body-closure-4',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'body-led trusted baseline from closure wording',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
        recommendedTraceEventId: 'event-body-closure-4',
        capturedAt: 1020,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-closure-4',
          decisionTraceId: 'trace-body-closure-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'body-led trusted baseline from closure wording',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
          recommendedTraceEventId: 'event-body-closure-4',
          capturedAt: 1020,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-3',
          decisionTraceId: 'trace-body-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-3',
          capturedAt: 950,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '身体连续性已经明确进入身体承接态 -> 显形补回态，VRM 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
      ],
    })
  })

  it('adopts a trusted body-only-hold baseline immediately while keeping the same-segment body-only carry explicit', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 2010 晚于上一张锚点 1950。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-only-hold-7',
        decisionTraceId: 'trace-body-only-hold-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'body-only-hold baseline',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-only-hold-7',
        capturedAt: 2010,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-7',
          decisionTraceId: 'trace-body-only-hold-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'body-only-hold baseline',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-7',
          capturedAt: 2010,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-6',
          decisionTraceId: 'trace-body-only-hold-6',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-6',
          capturedAt: 1950,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。',
      ],
    })
  })

  it('keeps a provisional body-only-hold baseline in observation mode until renderer recovery can rejoin the same body line explicitly', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'provisional',
        summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
        detailLine: '虽然身体线已经继续托住当前 living segment，但在把它当作长期基线之前，仍然需要确认显形层为什么还没有完整回到这条连续身体线。',
        supportingLines: [
          '最新快照时间 2005 晚于上一张锚点 1950。',
          '尚未解决的连续性信号：同一反复漂移模式仍然存在。',
          '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-only-hold-8',
        decisionTraceId: 'trace-body-only-hold-8',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'body-only-hold provisional baseline',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-only-hold-8',
        capturedAt: 2005,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-8',
          decisionTraceId: 'trace-body-only-hold-8',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'body-only-hold provisional baseline',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-8',
          capturedAt: 2005,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-7',
          decisionTraceId: 'trace-body-only-hold-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-7',
          capturedAt: 1950,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        '身体连续性虽然已经明确处于身体独撑态，但仍需继续观察身体线是否会继续独自托住同一段 living segment，并确认显形层为什么还没有完整回到这条连续身体线。',
      ],
    })
  })

  it('keeps a trusted body-only-hold baseline in observation mode when a newer snapshot exists, without flattening it into generic continuity', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 2010 晚于上一张锚点 1950。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体连续性已经明确处于身体独撑态：当前仍由身体线独自托住同一段 living segment，可作为更谨慎的长期基线观察依据。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-only-hold-7',
        decisionTraceId: 'trace-body-only-hold-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'body-only-hold baseline',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['runtime-continuity-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-only-hold-7',
        capturedAt: 2010,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-8',
          decisionTraceId: 'trace-body-only-hold-8',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'newer body-only-hold observation',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-8',
          capturedAt: 2060,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-only-hold-7',
          decisionTraceId: 'trace-body-only-hold-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'body-only-hold baseline',
          bodyContinuityPhase: 'body-only-hold',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-only-hold-7',
          capturedAt: 2010,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
      detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 trusted。',
        '但历史中已经存在更晚的连续性快照。',
        '身体连续性已经明确处于身体独撑态；当前仅因存在更新快照而继续观察这段仍由身体线独自托住的 same-segment 承接是否持续稳住。',
      ],
    })
  })

  it('adopts a trusted identity-continuity', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 980 晚于上一张锚点 910。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          'same-her 连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-governance-2',
        decisionTraceId: 'trace-governance-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'same-her governance reconfirmed',
        highlightedEvidencePanelIds: [
          'candidate-trajectory-summary',
          'identity-drift-governance-summary',
        ],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-details'],
        recommendedTraceEventId: 'event-governance',
        capturedAt: 980,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-governance-2',
          decisionTraceId: 'trace-governance-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'same-her governance reconfirmed',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'identity-drift-governance-summary',
          ],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-details'],
          recommendedTraceEventId: 'event-governance',
          capturedAt: 980,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-governance-1',
          decisionTraceId: 'trace-governance-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'same-her governance under review',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
          ],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 910,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        'same-her 连续性治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('keeps a provisional body-led continuity baseline in observation mode until face motion and lipsync reconverge stably', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'provisional',
        summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
        detailLine: '虽然身体线已经先托住当前 living segment，但在把它当作长期基线之前，仍然需要确认其他显形线会稳定补回。',
        supportingLines: [
          '最新快照时间 1005 晚于上一张锚点 950。',
          '尚未解决的连续性信号：同一反复漂移模式仍然存在。',
          '身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-5',
        decisionTraceId: 'trace-body-5',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'body-led provisional baseline',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
        recommendedTraceEventId: 'event-body-5',
        capturedAt: 1005,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-5',
          decisionTraceId: 'trace-body-5',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'body-led provisional baseline',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
          recommendedTraceEventId: 'event-body-5',
          capturedAt: 1005,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-4',
          decisionTraceId: 'trace-body-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-4',
          capturedAt: 950,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        '身体连续性虽然已经明确进入身体承接态 -> 显形补回态，但仍需继续观察 Live2D 显形权威是否会稳定沿同一条连续身体线补回。',
      ],
    })
  })

  it('keeps provisional body-led continuity wording generic when the returning manifestation surface is still unknown', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'provisional',
        summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
        detailLine: '虽然身体线已经先托住当前 living segment，但在把它当作长期基线之前，仍然需要确认显形回归会稳定补回。',
        supportingLines: [
          '最新快照时间 1690 晚于上一张锚点 1620。',
          '尚未解决的连续性信号：同一反复漂移模式仍然存在。',
          '身体连续性已经明确进入身体承接态 -> 显形补回态，显形权威仍在沿同一条连续身体线补回。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-generic-3',
        decisionTraceId: 'trace-body-generic-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'body-led provisional baseline',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
        recommendedTraceEventId: 'event-body-speech-continuity',
        capturedAt: 1690,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-generic-3',
          decisionTraceId: 'trace-body-generic-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'body-led provisional baseline',
          bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection', 'runtime-continuity-projection'],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-timeline', 'selected-trace-event'],
          recommendedTraceEventId: 'event-body-speech-continuity',
          capturedAt: 1690,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-generic-2',
          decisionTraceId: 'trace-body-generic-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-previous',
          capturedAt: 1620,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先不要采纳这张基线，继续观察下一次连续性转移。',
      detailLine: '它目前只能算暂定基线，应该继续留在观察窗口里，而不是马上升级为默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 provisional。',
        '下一次 recurring-drift 转移仍需要验证它是否稳定。',
        '身体连续性虽然已经明确进入身体承接态 -> 显形补回态，但仍需继续观察显形权威是否会稳定沿同一条连续身体线补回。',
      ],
    })
  })

  it('adopts a trusted relationship cadence baseline immediately when companionship cadence has been re-confirmed and no newer snapshot exists', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1080 晚于上一张锚点 1010。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          'relationship cadence 治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-cadence-2',
        decisionTraceId: 'trace-cadence-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'relationship cadence reconfirmed',
        highlightedEvidencePanelIds: ['companionship-transition-summary'],
        highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
        recommendedTraceEventId: 'event-takeover',
        capturedAt: 1080,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-cadence-2',
          decisionTraceId: 'trace-cadence-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'relationship cadence reconfirmed',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1080,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-cadence-1',
          decisionTraceId: 'trace-cadence-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'relationship cadence under review',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1010,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        'relationship cadence 治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('adopts a trusted project-state continuity baseline immediately when Project identity carry, Phase 1 route carry, and Unresolved closure carry have been re-confirmed and no newer snapshot exists', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1180 晚于上一张锚点 1090。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '项目状态连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-project-state-2',
        decisionTraceId: 'trace-project-state-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'project-state continuity reconfirmed',
        highlightedEvidencePanelIds: [
          'candidate-trajectory-summary',
          'identity-drift-governance-summary',
        ],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-details'],
        recommendedTraceEventId: 'event-project-state',
        capturedAt: 1180,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-project-state-2',
          decisionTraceId: 'trace-project-state-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'project-state continuity reconfirmed',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'identity-drift-governance-summary',
          ],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-details'],
          recommendedTraceEventId: 'event-project-state',
          capturedAt: 1180,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-project-state-1',
          decisionTraceId: 'trace-project-state-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-owner',
          explanation: 'project-state continuity under review',
          highlightedEvidencePanelIds: [
            'candidate-trajectory-summary',
            'proactive-decision-consumption-summary',
          ],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1090,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '项目状态连续性治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('adopts a trusted cross-modal-lock baseline immediately when body and renderer remain locked on the same living segment', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1810 晚于上一张锚点 1730。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-7',
        decisionTraceId: 'trace-lock-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'cross modal lock baseline',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-lock-7',
        capturedAt: 1810,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-7',
          decisionTraceId: 'trace-lock-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'cross modal lock baseline',
          bodyContinuityPhase: 'full-cross-modal-lock',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-lock-7',
          capturedAt: 1810,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-6',
          decisionTraceId: 'trace-lock-6',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-lock-6',
          capturedAt: 1730,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      ],
    })
  })

  it('keeps trusted cross-modal-lock wording generic when the governance note is explicit but structured phase metadata is still missing from the snapshot', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1810 晚于上一张锚点 1730。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-generic-7',
        decisionTraceId: 'trace-lock-generic-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'cross modal lock baseline without structured phase metadata',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-lock-generic-7',
        capturedAt: 1810,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-generic-7',
          decisionTraceId: 'trace-lock-generic-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'cross modal lock baseline without structured phase metadata',
          bodyContinuityPhase: null,
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-lock-generic-7',
          capturedAt: 1810,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-lock-generic-6',
          decisionTraceId: 'trace-lock-generic-6',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-lock-generic-6',
          capturedAt: 1730,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body as an audit anchor when a newer trusted snapshot exists, instead of narrating it like body-carried continuity', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1910 晚于上一张锚点 1830。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-loss-7',
        decisionTraceId: 'trace-body-loss-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'visible recovery audit baseline',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-loss-7',
        capturedAt: 1910,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-8',
          decisionTraceId: 'trace-body-loss-8',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'newer audit snapshot',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-8',
          capturedAt: 1960,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-7',
          decisionTraceId: 'trace-body-loss-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'visible recovery audit baseline',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-7',
          capturedAt: 1910,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
      detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 trusted。',
        '但历史中已经存在更晚的连续性快照。',
        '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察 VRM 已回接但身体线未承接的这次可见恢复。',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body wording generic when the governance note is explicit but structured phase metadata is still missing from the snapshot', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1910 晚于上一张锚点 1830。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '显形回接失身态已经被完整记录：显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-loss-generic-7',
        decisionTraceId: 'trace-body-loss-generic-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'visible recovery audit baseline without structured phase metadata',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-loss-generic-7',
        capturedAt: 1910,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-generic-8',
          decisionTraceId: 'trace-body-loss-generic-8',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'newer audit snapshot',
          bodyContinuityPhase: null,
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-generic-8',
          capturedAt: 1960,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-generic-7',
          decisionTraceId: 'trace-body-loss-generic-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'visible recovery audit baseline without structured phase metadata',
          bodyContinuityPhase: null,
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-generic-7',
          capturedAt: 1910,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
      detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 trusted。',
        '但历史中已经存在更晚的连续性快照。',
        '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察显形已回接但身体线未承接的这次可见恢复。',
      ],
    })
  })

  it('adopts a trusted quieter surviving-lane baseline immediately while preserving the face, lipsync, and voice same-her truth', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1915 晚于上一张锚点 1835。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-voice-only-7',
        decisionTraceId: 'trace-face-voice-only-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'quieter surviving lane audit baseline',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-face-voice-only-7',
        capturedAt: 1915,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-face-voice-only-7',
          decisionTraceId: 'trace-face-voice-only-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'quieter surviving lane audit baseline',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-face-voice-only-7',
          capturedAt: 1915,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-face-voice-only-6',
          decisionTraceId: 'trace-face-voice-only-6',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-face-voice-only-6',
          capturedAt: 1835,
        },
      ],
    })).toEqual({
      mode: 'adopt-now',
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      detailLine: '这张基线已经可信，而且它就是当前最新的修复后快照，不需要再等待额外观察窗口。',
      supportingLines: [
        '最新快照已经通过 trusted 判断。',
        '当前没有比它更新的连续性快照会与之竞争。',
        '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      ],
    })
  })

  it('keeps a trusted quieter surviving-lane baseline in observation mode when a newer snapshot exists, without flattening it into generic body-loss wording', () => {
    expect(buildSelfEvolutionBaselineAdoption({
      baselineQuality: {
        verdict: 'trusted',
        summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
        detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
        supportingLines: [
          '最新快照时间 1915 晚于上一张锚点 1835。',
          '修复闭环已经关闭，且不存在残留的反复漂移信号。',
          '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
        ],
      },
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-face-voice-only-7',
        decisionTraceId: 'trace-face-voice-only-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'quieter surviving lane audit baseline',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: null,
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-face-voice-only-7',
        capturedAt: 1915,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-face-voice-only-8',
          decisionTraceId: 'trace-face-voice-only-8',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'newer audit snapshot',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-face-voice-only-8',
          capturedAt: 1965,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-face-voice-only-7',
          decisionTraceId: 'trace-face-voice-only-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'quieter surviving lane audit baseline',
          bodyContinuityPhase: 'renderer-rejoin-without-body',
          rendererRejoinSurfaceKey: null,
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-face-voice-only-7',
          capturedAt: 1915,
        },
      ],
    })).toEqual({
      mode: 'observe',
      summaryLine: '先保留这张可信基线，但继续观察是否出现更新快照。',
      detailLine: '它已经可信，不过当前还有更新的连续性快照，先不要立刻把它升格为唯一默认参照。',
      supportingLines: [
        '当前基线质量 verdict 为 trusted。',
        '但历史中已经存在更晚的连续性快照。',
        '显形回接失身态仍被保留为审计锚点；当前仅因存在更新快照而继续观察表情、口型、声音这条 same-her 生命线是否仍与同一段 living segment 对齐，并确认 body、motion 是否还没有重新接回这条表情口型声音线。',
      ],
    })
  })
})

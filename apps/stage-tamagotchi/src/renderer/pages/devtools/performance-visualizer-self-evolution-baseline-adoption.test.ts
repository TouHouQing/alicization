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

  it('adopts a trusted same-her continuity baseline immediately when it is the latest confirmed governance anchor', () => {
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
})

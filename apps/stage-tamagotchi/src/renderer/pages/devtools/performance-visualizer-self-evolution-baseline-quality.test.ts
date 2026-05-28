import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionBaselineQuality } from './performance-visualizer-self-evolution-baseline-quality'

describe('performance visualizer self evolution baseline quality', () => {
  it('returns null when there is no latest snapshot or no repair outcome', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: null,
      history: [],
      repairOutcome: null,
      repairClosure: null,
    })).toBeNull()
  })

  it('accepts a post-repair baseline when the loop is closed and the latest snapshot is newer than the previous history anchor', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: 'Repair loop closed.',
        detailLine: 'All repair closure conditions are now satisfied for this recurring drift workflow.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: true,
        summaryLines: [],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 900 晚于上一张锚点 700。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '韵律权威链已重新绑定到当前片段，可作为采纳基线的一部分。',
      ],
    })
  })

  it('flags the baseline as provisional when unresolved continuity signals remain', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: false,
        improvedSignals: ['fresh validation snapshot now exists'],
        unresolvedSignals: ['same recurring drift pattern still present'],
        summaryLine: 'Repair evidence improved, but the loop is still open.',
        detailLine: 'Improved: fresh validation snapshot now exists. Still unresolved: same recurring drift pattern still present.',
      },
      repairClosure: {
        isClosed: false,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: true,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
    })).toEqual({
      verdict: 'provisional',
      summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
      detailLine: '虽然最新快照更晚，但在把它当作长期基线之前，仍然存在尚未解决的修复信号。',
      supportingLines: [
        '最新快照时间 850 晚于上一张锚点 700。',
        '尚未解决的连续性信号：同一反复漂移模式仍然存在。',
        '韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。',
      ],
    })
  })

  it('flags the baseline as stale when the latest snapshot does not move past the previous anchor', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-1',
          decisionTraceId: 'trace-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'same anchor',
          highlightedEvidencePanelIds: ['runtime-continuity-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-1',
          capturedAt: 700,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: 'Repair loop closed.',
        detailLine: 'All repair closure conditions are now satisfied for this recurring drift workflow.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [],
      },
    })).toEqual({
      verdict: 'stale',
      summaryLine: '这张基线已经过期，在信任它之前应重新抓取。',
      detailLine: '最新快照没有越过上一张连续性锚点，因此它还不足以充当下一张基线。',
      supportingLines: [
        '最新快照时间 700 并不晚于上一张锚点 700。',
        '请先抓取新的修复后快照，再替换连续性锚点。',
      ],
    })
  })

  it('keeps the baseline provisional when closure is otherwise complete but prosody authority has not reattached to the current segment', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-3',
        decisionTraceId: 'trace-3',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'prosody chain still drifting',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['trace-consumption'],
        recommendedTraceEventId: 'event-3',
        capturedAt: 920,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-3',
          decisionTraceId: 'trace-3',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'prosody chain still drifting',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-3',
          capturedAt: 920,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-2',
          decisionTraceId: 'trace-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-2',
          capturedAt: 880,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: 'Repair loop closed.',
        detailLine: 'All repair closure conditions are now satisfied for this recurring drift workflow.',
      },
      repairClosure: {
        isClosed: false,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: true,
        prosodyAuthorityValidated: false,
        summaryLines: [],
      },
    })).toEqual({
      verdict: 'provisional',
      summaryLine: '这张基线目前只能算暂定，还不应该替换连续性锚点。',
      detailLine: '虽然最新快照更晚，但在把它当作长期基线之前，仍然存在尚未解决的修复信号。',
      supportingLines: [
        '最新快照时间 920 晚于上一张锚点 880。',
        '尚未解决的连续性信号：无，但韵律权威链仍未稳定回到同一片段。',
        '韵律权威链仍未稳定回到同一片段，不应采纳为长期基线。',
      ],
    })
  })

  it('trusts a baseline when same-her continuity governance has been freshly re-confirmed without unresolved signals', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same-her continuity governance re-confirmed by fresh validation snapshot'],
        unresolvedSignals: [],
        summaryLine: 'Same-her continuity governance was re-confirmed.',
        detailLine: 'The new snapshot still holds remembered familiarity as memory-first and keeps bounded growth inside the same-her room.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 980 晚于上一张锚点 910。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        'same-her 连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
      ],
    })
  })
})

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

  it('promotes relationship cadence internalization into trusted baseline support when the cadence is already becoming durable rhythm', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: 'relationship cadence 长期节律闭环已确认。',
        detailLine: 'companionship hold mode、settle cadence 与 resident projection 不只保持同一条回归路径，也开始被固定成长期关系节律。',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
          'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 990 晚于上一张锚点 930。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        'relationship cadence 治理已经再次确认，并开始内化为长期关系节律，可作为长期基线的一部分。',
      ],
    })
  })

  it('keeps invited measured-return cadence as a restrained baseline support line instead of broadening it into a generic long-term relationship baseline', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-callback-5',
        decisionTraceId: 'trace-callback-5',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'callback-line cadence baseline',
        highlightedEvidencePanelIds: ['companionship-transition-summary'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-callback-5',
        capturedAt: 1010,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-callback-5',
          decisionTraceId: 'trace-callback-5',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'callback-line cadence baseline',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-callback-5',
          capturedAt: 1010,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-callback-4',
          decisionTraceId: 'trace-callback-4',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['companionship-transition-summary'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-callback-4',
          capturedAt: 950,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: 'relationship cadence callback-line closure confirmed.',
        detailLine: 'companionship hold mode、settle cadence 与 resident projection 仍停在 same-turn-if-invited measured-return 的同一条 callback line 上。',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          'relationship cadence 治理已经被新的验证快照再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可进入更克制的关系节律基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1010 晚于上一张锚点 950。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        'relationship cadence 治理已经再次确认，但当前仍停在 same-turn-if-invited measured-return 的同一条 callback line 上，可作为更克制的关系节律基线的一部分。',
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

  it('trusts a baseline when identity-continuity', () => {
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
        improvedSignals: ['identity-continuity'],
        unresolvedSignals: [],
        summaryLine: 'identity-continuity',
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

  it('trusts a baseline when relationship cadence governance has been freshly re-confirmed without unresolved signals', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-cadence-2',
        decisionTraceId: 'trace-cadence-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'relationship cadence reconfirmed',
        highlightedEvidencePanelIds: [
          'companionship-transition-summary',
          'resident-performance-projection',
        ],
        highlightedTraceSectionIds: ['trace-consumption', 'trace-details', 'selected-trace-event'],
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
          highlightedEvidencePanelIds: [
            'companionship-transition-summary',
            'resident-performance-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption', 'trace-details', 'selected-trace-event'],
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
          highlightedEvidencePanelIds: [
            'companionship-transition-summary',
            'renderer-authority-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
          recommendedTraceEventId: 'event-takeover',
          capturedAt: 1010,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['relationship cadence governance re-confirmed by fresh validation snapshot'],
        unresolvedSignals: [],
        summaryLine: 'Relationship cadence governance was re-confirmed.',
        detailLine: 'The new snapshot still holds companionship transition settle cadence and resident projection on the same bounded-return line.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          'relationship cadence 治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1080 晚于上一张锚点 1010。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        'relationship cadence 治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
      ],
    })
  })

  it('trusts a baseline when project-state continuity governance has been freshly re-confirmed without unresolved signals', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['project-state continuity governance re-confirmed by fresh validation snapshot'],
        unresolvedSignals: [],
        summaryLine: 'Project-state continuity governance was re-confirmed.',
        detailLine: 'The new snapshot still carries project identity, the Phase 1 local-digital-life route, and unresolved open loops on the same living thread.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          '项目状态连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1180 晚于上一张锚点 1090。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '项目状态连续性治理已经被新的验证快照再次确认，可作为长期基线的一部分。',
      ],
    })
  })

  it('trusts a baseline when speech authority rejoin has been freshly re-confirmed without unresolved signals', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-speech-2',
        decisionTraceId: 'trace-body-speech-2',
        activeThreadId: 'thread-1',
        selectedCardId: 'first-check',
        explanation: 'speech body continuity reconfirmed',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
        recommendedTraceEventId: 'event-body-speech',
        capturedAt: 1260,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-speech-2',
          decisionTraceId: 'trace-body-speech-2',
          activeThreadId: 'thread-1',
          selectedCardId: 'first-check',
          explanation: 'speech body continuity reconfirmed',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption', 'selected-trace-event'],
          recommendedTraceEventId: 'event-body-speech',
          capturedAt: 1260,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-speech-1',
          decisionTraceId: 'trace-body-speech-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'speech body continuity under review',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-speech-previous',
          capturedAt: 1170,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['body continuity governance re-confirmed by fresh validation snapshot'],
        unresolvedSignals: [],
        summaryLine: 'Speech body continuity governance was re-confirmed.',
        detailLine: 'The new snapshot still shows the same living segment carried by the body line while speech authority rejoins full embodiment on that exact line.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1260 晚于上一张锚点 1170。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态（speech authority rejoin），可作为长期基线的一部分。',
      ],
    })
  })

  it('trusts a baseline when body rejoin has been freshly re-confirmed but the renderer surface is still unknown', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-generic-1',
        decisionTraceId: 'trace-body-generic-1',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'generic body continuity baseline',
        highlightedEvidencePanelIds: [
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ],
        highlightedTraceSectionIds: ['trace-consumption'],
        recommendedTraceEventId: 'event-body-generic-1',
        capturedAt: 1360,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-generic-1',
          decisionTraceId: 'trace-body-generic-1',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'generic body continuity baseline',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-generic-1',
          capturedAt: 1360,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-generic-0',
          decisionTraceId: 'trace-body-generic-0',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'generic body continuity under review',
          highlightedEvidencePanelIds: [
            'renderer-authority-projection',
            'runtime-continuity-projection',
          ],
          highlightedTraceSectionIds: ['trace-consumption'],
          recommendedTraceEventId: 'event-body-generic-previous',
          capturedAt: 1250,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['body continuity governance re-confirmed by fresh validation snapshot'],
        unresolvedSignals: [],
        summaryLine: 'Body continuity governance was re-confirmed.',
        detailLine: 'The new snapshot still shows the same living segment carried by the body line while renderer rejoin remains on that exact line, even though the surface has not been named yet.',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态，可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1360 晚于上一张锚点 1250。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '身体连续性已经被新的验证快照再次确认，并明确处于身体承接态 -> 显形补回态，可作为长期基线的一部分。',
      ],
    })
  })

  it('trusts a baseline when cross-modal lock has been freshly re-confirmed without unresolved signals', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-lock-7',
        decisionTraceId: 'trace-lock-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'cross modal lock baseline',
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: '身体与显形权威已重新锁定。',
        detailLine: '跨模态重锁闭环已经得到重新确认。',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，并明确处于跨模态重锁态（Live2D authority lock），身体线与显形权威仍稳定锁在同一段 living segment 上，可进入基线判断。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1810 晚于上一张锚点 1730。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可作为长期基线的一部分。',
      ],
    })
  })

  it('keeps renderer-rejoin-without-body visible as an audit-only baseline support line instead of trusted body carry wording', () => {
    expect(buildSelfEvolutionBaselineQuality({
      latestSnapshot: {
        version: 'self-evolution-focus-snapshot/v1',
        candidateId: 'candidate-body-loss-7',
        decisionTraceId: 'trace-body-loss-7',
        activeThreadId: 'thread-1',
        selectedCardId: 'repair-path',
        explanation: 'visible recovery audit baseline',
        highlightedEvidencePanelIds: ['renderer-authority-projection'],
        highlightedTraceSectionIds: ['selected-trace-event'],
        recommendedTraceEventId: 'event-body-loss-7',
        capturedAt: 1910,
      },
      history: [
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-7',
          decisionTraceId: 'trace-body-loss-7',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'visible recovery audit baseline',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-7',
          capturedAt: 1910,
        },
        {
          version: 'self-evolution-focus-snapshot/v1',
          candidateId: 'candidate-body-loss-6',
          decisionTraceId: 'trace-body-loss-6',
          activeThreadId: 'thread-1',
          selectedCardId: 'repair-path',
          explanation: 'previous anchor',
          highlightedEvidencePanelIds: ['renderer-authority-projection'],
          highlightedTraceSectionIds: ['selected-trace-event'],
          recommendedTraceEventId: 'event-body-loss-6',
          capturedAt: 1830,
        },
      ],
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: '显形回接失身态已闭环归档。',
        detailLine: '可见恢复闭环已经被归档，但并不等于可信身体承接。',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
        prosodyAuthorityRelevant: false,
        prosodyAuthorityValidated: null,
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        summaryLines: [
          '身体连续性已经被新的验证快照再次确认，但当前仍处于显形回接失身态（VRM authority rejoin without same-segment body carry），不应把这条可见回接直接采纳为长期基线。',
        ],
      },
    })).toEqual({
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1910 晚于上一张锚点 1830。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      ],
    })
  })

  it('keeps quieter surviving-lane baseline support explicit when only face, lipsync, and voice still carry the identity-continuity', () => {
    expect(buildSelfEvolutionBaselineQuality({
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
      repairOutcome: {
        closureChanged: true,
        improvedSignals: ['same recurring drift pattern cleared from recent history'],
        unresolvedSignals: [],
        summaryLine: '表情、口型、声音 same-her 存活线闭环已确认。',
        detailLine: '这次 quieter carry 已被追踪闭环，但 body、motion 还没有重新接回这条表情口型声音线。',
      },
      repairClosure: {
        isClosed: true,
        sessionCovered: true,
        hasFreshValidationSnapshot: true,
        samePatternStillPresent: false,
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
      verdict: 'trusted',
      summaryLine: '这张基线可以被信任为新的修复后连续性锚点。',
      detailLine: '修复闭环已经关闭，没有残留连续性条件，且最新快照确实晚于上一张漂移锚点。',
      supportingLines: [
        '最新快照时间 1915 晚于上一张锚点 1835。',
        '修复闭环已经关闭，且不存在残留的反复漂移信号。',
        '显形回接失身态已经被完整记录：当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      ],
    })
  })
})

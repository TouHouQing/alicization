import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionFocusHistoryPatternContext } from './performance-visualizer-self-evolution-focus-history-pattern-context'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution focus history pattern context', () => {
  it('returns null when the pattern has no recorded occurrences', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-path->repair-owner|event:a->b|evidence:none|trace:none',
        occurrenceCount: 0,
        summaryLine: '0次 修复路径 -> 修复归属',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'a -> b',
        evidenceGained: [],
        evidenceLost: [],
        traceTargetsGained: [],
        traceTargetsLost: [],
        occurrences: [],
      },
      preferredSide: 'current',
    })).toBeNull()
  })

  it('selects the latest occurrence current side by default so workflow application restores the newest drift context', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-owner->repair-path|event:event-person-state->event-takeover|evidence:+private-thought-governance-chain,-renderer-authority-projection|trace:+selected-trace-event,+trace-details,-trace-timeline',
        occurrenceCount: 2,
        summaryLine: '2次 修复归属 -> 修复路径 | 人格状态事件 -> 接管事件',
        focusCardTransition: 'repair-owner -> repair-path',
        traceEventTransition: 'event-person-state -> event-takeover',
        evidenceGained: ['private-thought-governance-chain'],
        evidenceLost: ['renderer-authority-projection'],
        traceTargetsGained: ['selected-trace-event', 'trace-details'],
        traceTargetsLost: ['trace-timeline'],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 400,
      previousCapturedAt: 300,
      side: 'current',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧。',
    })
  })

  it('can anchor the workflow to the previous side when the caller wants the pre-drift baseline', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,-private-thought-governance-chain|trace:+trace-timeline,-selected-trace-event,-trace-details',
        occurrenceCount: 3,
        summaryLine: '3次 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: ['private-thought-governance-chain'],
        traceTargetsGained: ['trace-timeline'],
        traceTargetsLost: ['selected-trace-event', 'trace-details'],
        occurrences: [
          {
            currentCapturedAt: 500,
            previousCapturedAt: 400,
          },
          {
            currentCapturedAt: 300,
            previousCapturedAt: 200,
          },
          {
            currentCapturedAt: 100,
            previousCapturedAt: 50,
          },
        ],
      },
      preferredSide: 'previous',
    })).toEqual({
      currentCapturedAt: 500,
      previousCapturedAt: 400,
      side: 'previous',
      summaryLine: '将工作流应用到 1970-01-01T00:00:00.400Z -> 1970-01-01T00:00:00.500Z 的前一侧。',
    })
  })

  it('keeps body-continuity workflow context anchored on the body-carried living segment instead of neutral drift wording', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'signature:body-continuity|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        occurrenceCount: 2,
        summaryLine: '2次 身体连续性承接 -> 显形权威补回 | 修复路径 -> 修复归属',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: [],
        traceTargetsGained: ['selected-trace-event'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 400,
            previousCapturedAt: 300,
          },
          {
            currentCapturedAt: 200,
            previousCapturedAt: 100,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 400,
      previousCapturedAt: 300,
      side: 'current',
      summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.300Z -> 1970-01-01T00:00:00.400Z 的当前侧，优先确认身体线是否仍托住同一段 living segment。',
    })
  })

  it('keeps note-only body continuity workflow context anchored on body-only-hold instead of generic body-carry wording', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'signature:body-continuity|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection,+runtime-continuity-projection|trace:+trace-timeline,+selected-trace-event',
        occurrenceCount: 2,
        summaryLine: `2次 ${legacyNote} | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 +运行时连续性投影 | +轨迹时间线 +选中轨迹事件`,
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection', 'runtime-continuity-projection'],
        evidenceLost: [],
        traceTargetsGained: ['trace-timeline', 'selected-trace-event'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 720,
            previousCapturedAt: 620,
          },
          {
            currentCapturedAt: 520,
            previousCapturedAt: 420,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 720,
      previousCapturedAt: 620,
      side: 'current',
      summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.620Z -> 1970-01-01T00:00:00.720Z 的当前侧，优先确认身体线是否仍在独自托住同一段 living segment。',
    })
  })

  it('keeps quieter face+lipsync+voice same-her carry explicit in workflow context instead of flattening it into generic body-loss wording', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:face+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        occurrenceCount: 2,
        summaryLine: '2次 当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: [],
        traceTargetsGained: ['selected-trace-event'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 720,
            previousCapturedAt: 620,
          },
          {
            currentCapturedAt: 520,
            previousCapturedAt: 420,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 720,
      previousCapturedAt: 620,
      side: 'current',
      summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.620Z -> 1970-01-01T00:00:00.720Z 的当前侧，优先确认当前是否仍只有表情、口型、声音这条 same-her 生命线与同一段 living segment 对齐，以及为什么 body、motion 还没有重新接回这条表情口型声音线。',
    })
  })

  it('keeps quieter motion+lipsync+voice same-her carry explicit in workflow context instead of flattening it into generic body-loss wording', () => {
    expect(buildSelfEvolutionFocusHistoryPatternContext({
      pattern: {
        patternKey: 'signature:body-continuity|phase:renderer-rejoin-without-body|lane:motion+lipsync+voice-only|focus:repair-path->repair-owner|event:event-takeover->event-person-state|evidence:+renderer-authority-projection|trace:+selected-trace-event',
        occurrenceCount: 2,
        summaryLine: '2次 当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线 | 修复路径 -> 修复归属 | 接管事件 -> 人格状态事件 | +显形权威投影 | +选中轨迹事件',
        focusCardTransition: 'repair-path -> repair-owner',
        traceEventTransition: 'event-takeover -> event-person-state',
        evidenceGained: ['renderer-authority-projection'],
        evidenceLost: [],
        traceTargetsGained: ['selected-trace-event'],
        traceTargetsLost: [],
        occurrences: [
          {
            currentCapturedAt: 720,
            previousCapturedAt: 620,
          },
          {
            currentCapturedAt: 520,
            previousCapturedAt: 420,
          },
        ],
      },
      preferredSide: 'current',
    })).toEqual({
      currentCapturedAt: 720,
      previousCapturedAt: 620,
      side: 'current',
      summaryLine: '将身体连续性工作流应用到 1970-01-01T00:00:00.620Z -> 1970-01-01T00:00:00.720Z 的当前侧，优先确认当前是否仍只有动作、口型、声音这条 same-her 生命线与同一段 living segment 对齐，以及为什么 body、face 还没有重新接回这条动作口型声音线。',
    })
  })
})

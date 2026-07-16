import { describe, expect, it } from 'vitest'

import { resolveStageQuickReplyClosureSummary } from './stage-quick-reply-closure-summary'

const embodimentContinuityFocus = ['identity', 'continuity', 'continuity'].join('-')
const internalSentinelPattern
  = /memory-tuning-advice=internal-only|structured continuity digest|continuity_lane=body/iu

function expectNoInternalSentinel(line: string | null) {
  expect(line ?? '').not.toMatch(internalSentinelPattern)
}

describe('stage quick reply closure summary', () => {
  it('returns the embodiment fallback when every higher-priority candidate is internal-only', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: 'structured continuity digest.',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'continuity_lane=body; note=temporary visual alignment',
      briefingHeadline: 'memory-tuning-advice=internal-only',
      nextClosureLine: 'continuity_lane=body',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: embodimentContinuityFocus,
        eventFocus: 'renderer-authority',
      },
    })

    expect(summary).toBe('具身通道待重连')
    expectNoInternalSentinel(summary)
  })

  it('omits structured internal candidates from the visible quick reply summary', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'structured continuity digest.',
      companionBriefingLine: null,
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'continuity_lane=body',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: embodimentContinuityFocus,
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'memory-tuning-advice=internal-only',
      fallbackAwarenessCandidates: [],
    })

    expect(summary).toBe('具身通道待重连')
  })

  it('drops an internal memory-advice sentinel from visible summary copy', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'memory-tuning-advice=internal-only',
      companionBriefingLine: null,
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })

    expect(summary).toBe('项目状态待同步')
  })

  it('keeps a natural visible fact when diagnostic and support lines are internal-only', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '昨天记录的偏好还没有完成检索验证。',
      companionBriefingLine: null,
      reasons: [],
    }, {
      visible: true,
      label: 'Review memory check',
      hint: 'Memory check pending',
      headline: 'structured continuity digest.',
      briefingHeadline: 'memory-tuning-advice=internal-only',
      nextClosureLine: 'continuity_lane=body',
      sameHerDriftRiskLine: 'memory-tuning-advice=internal-only',
      proactiveSameHerGapLine: 'structured continuity digest.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'memory-retrieval',
      },
    })

    expect(summary).toBe('昨天记录的偏好还没有完成检索验证。')
  })

  it('returns null when the only candidate is internal-only and no diagnostic fallback is available', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: 'structured continuity digest.',
      reasons: [],
    }, null)

    expect(summary).toBeNull()
  })
})

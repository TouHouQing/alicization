import { describe, expect, it } from 'vitest'

import { resolveStageQuickReplyClosureSummary } from './stage-quick-reply-closure-summary'

const internalSentinelPattern
  = /memory-tuning-advice=internal-only|structured continuity digest|continuity_lane=body/iu

function expectNoInternalSentinel(line: string | null) {
  expect(line ?? '').not.toMatch(internalSentinelPattern)
}

describe('stage quick reply closure summary', () => {
  it('returns null when every candidate is internal-only', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: 'structured continuity digest.',
      reasons: [],
    })

    expect(summary).toBeNull()
    expectNoInternalSentinel(summary)
  })

  it('omits structured internal candidates from the visible quick reply summary', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'structured continuity digest.',
      companionBriefingLine: null,
      reasons: [],
    }, {
      fallbackAwarenessLine: 'memory-tuning-advice=internal-only',
      fallbackAwarenessCandidates: [],
    })

    expect(summary).toBeNull()
  })

  it('drops an internal memory-advice sentinel from visible summary copy', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'memory-tuning-advice=internal-only',
      companionBriefingLine: null,
      reasons: [],
    })

    expect(summary).toBeNull()
  })

  it('keeps a natural visible fact when diagnostic and support lines are internal-only', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '昨天记录的偏好还没有完成检索验证。',
      companionBriefingLine: null,
      reasons: [],
    })

    expect(summary).toBe('昨天记录的偏好还没有完成检索验证。')
  })

  it('returns null when the only candidate is internal-only and no diagnostic fallback is available', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: 'structured continuity digest.',
      reasons: [],
    })

    expect(summary).toBeNull()
  })

  it('drops generic metadata even when it follows Chinese punctuation', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      reasons: [],
    }, {
      fallbackAwarenessLine: '说明：private_key=value',
    })

    expect(summary).toBeNull()
  })

  it('drops metadata with a Unicode key', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      reasons: [],
    }, {
      fallbackAwarenessLine: '说明：私钥=value',
    })

    expect(summary).toBeNull()
  })

  it('keeps the natural snapshot summary ahead of internal governance awareness', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '长期记忆搜索还需要验证空结果。',
      reasons: [],
    }, {
      fallbackAwarenessLine: 'Inspector-side continuity reconstruction already keeps richer Phase 1 project-state same-her carry available.',
    })

    expect(summary).toBe('长期记忆搜索还需要验证空结果。')
  })

  it.each([
    'active embodiment lanes: body',
    '{"private_key":"value"}',
    'body+voice recovery@segment-runtime-1',
  ])('drops internal metadata format: %s', (internalLine) => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      reasons: [],
    }, {
      fallbackAwarenessLine: internalLine,
    })

    expect(summary).toBeNull()
  })

  it.each([
    JSON.stringify({ private_key: 'x'.repeat(800) }),
    JSON.stringify(Array.from({ length: 200 }, (_, index) => `internal-${index}`)),
  ])('drops structured metadata longer than the visible text limit', (internalLine) => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: internalLine,
      reasons: [],
    })

    expect(summary).toBeNull()
  })

  it('keeps ordinary natural language that uses the word structured', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'We now have a structured plan for the memory migration.',
      reasons: [],
    })

    expect(summary).toBe('We now have a structured plan for the memory migration.')
  })

  it('keeps a natural email address containing recovery@', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '请把恢复说明发送到 recovery@example.com。',
      reasons: [],
    })

    expect(summary).toBe('请把恢复说明发送到 recovery@example.com。')
  })

  it('prefers an explicit companion briefing over a generic summary', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '记忆状态仍需检查。',
      companionBriefingLine: '长期记忆搜索还需要验证空结果和筛选条件。',
      reasons: [],
    })

    expect(summary).toBe('长期记忆搜索还需要验证空结果和筛选条件。')
  })
})

import { describe, expect, it } from 'vitest'

import { resolveStageQuickReplyClosureSummary } from './stage-quick-reply-closure-summary'

const fixedTemplateResiduePattern
  = /same-her|same her|same living line|one living her|one continuous her|同一个她|同一个 her|同一条数字生命线|数字生命主线|continuity evidence|visibility=internal-structured|content=excluded|source_text=fixed_template_withheld|\[fixed-template-excluded\]|Right now I am still holding together|我还需要|我还在/u

function expectNoFixedTemplateResidue(line: string | null) {
  expect(line ?? '').not.toMatch(fixedTemplateResiduePattern)
}

describe('stage quick reply closure summary', () => {
  it('returns a transparent continuity diagnosis instead of a fixed persona template when no model text survives', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '我还在继续带着这条数字生命主线往前走。',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'identity-continuity-continuity',
        eventFocus: 'renderer-authority',
      },
    })

    expect(summary).toBe('具身通道待重连')
    expectNoFixedTemplateResidue(summary)
  })

  it('drops structured internal continuity evidence from the visible quick reply summary', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionBriefingLine: null,
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'continuity=embodiment | lane=lipsync+voice-only | visibility=internal-structured',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'identity-continuity-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'continuity=embodiment | lane=lipsync+voice-only | visibility=internal-structured',
      fallbackAwarenessCandidates: [],
    })

    expect(summary).toBe('具身通道待重连')
  })

  it('drops the structured fixed-template exclusion marker from visible summary copy', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
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

  it('does not leak project-state repair headlines or support lines with fixed persona templates', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: '项目状态修复需要先完成记忆检索验证。',
      companionBriefingLine: null,
      reasons: [],
    }, {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '项目状态修复还在依赖 same her continuity evidence visibility=internal-structured。',
      briefingHeadline: '同一个 her 还在带着数字生命主线推进。',
      nextClosureLine: 'Next, help me close: keep one continuous her on the same living line.',
      sameHerDriftRiskLine: 'same-her drift risk remains visible.',
      proactiveSameHerGapLine: 'content=excluded; visibility=internal-structured',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'project-state-repair',
      },
    })

    expect(summary).toBe('项目状态修复需要先完成记忆检索验证。')
  })

  it('returns null when every candidate is fixed-template residue and no transparent diagnostic fallback is available', () => {
    const summary = resolveStageQuickReplyClosureSummary({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: '我还在继续带着这条数字生命主线往前走。',
      reasons: [],
    }, null)

    expect(summary).toBeNull()
  })
})

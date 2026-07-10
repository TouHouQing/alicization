import { describe, expect, it } from 'vitest'

import { buildStageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

const fixedTemplateResiduePattern
  = /same-her|same living line|同一个她|同一个 her|数字生命主线|content=excluded|source_text=fixed_template_withheld|\[fixed-template-excluded\]|Right now I am still holding together|我还需要|我还在|identity-continuity|continuity=|signature=|pending(?:[_-]rejoin)?=|visibility=renderer-internal/u

function visibleSurfaceText(entry: ReturnType<typeof buildStageQuickReplyClosureDiagnosticEntry>) {
  return [
    entry.headline,
    entry.briefingHeadline,
    entry.nextClosureLine,
    entry.sameHerDriftRiskLine,
    entry.proactiveSameHerGapLine,
  ].filter(Boolean).join('\n')
}

function expectNoFixedTemplateResidue(entry: ReturnType<typeof buildStageQuickReplyClosureDiagnosticEntry>) {
  expect(visibleSurfaceText(entry)).not.toMatch(fixedTemplateResiduePattern)
}

describe('stage quick reply closure diagnostic entry', () => {
  it('does not surface fixed persona templates in headline, briefing, next line, or TTS-facing text', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'project=continuity=0.33 (1/3) | next closure: 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里',
      companionHeadlineLine: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      companionBriefingLine: '我还在继续带着这条数字生命主线往前走。',
      companionNextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line.',
      sameHerDriftRiskLine: null,
      briefingLines: [
        '[fixed-template-excluded]',
      ],
      reasons: [
        'project-state-same-her-continuity-required',
        'semantic-judge:project-state-same-her-missing',
      ],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: '连续性诊断未闭合：项目状态待同步',
      briefingHeadline: null,
      nextClosureLine: null,
      sameHerDriftRiskLine: null,
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
    expectNoFixedTemplateResidue(entry)
  })

  it('keeps the structured fixed-template exclusion marker internal instead of showing it in quick reply closure', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: '连续性诊断未闭合：项目状态待同步',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
    expectNoFixedTemplateResidue(entry)
  })

  it('keeps renderer-internal continuity fields out of the visible quick reply diagnostic', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=body+lipsync+voice-only | face and motion still need to rejoin the same living line.',
      ],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: '连续性诊断未闭合：具身通道待重连',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'identity-continuity-continuity',
        eventFocus: 'renderer-authority',
        sameHerClosureStage: 'audible-body-carry',
      }),
    }))
    expectNoFixedTemplateResidue(entry)
  })

  it('stays hidden without a snapshot', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry(null)

    expect(entry).toEqual(expect.objectContaining({
      visible: false,
      label: '打开运行诊断',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    }))
    expectNoFixedTemplateResidue(entry)
  })
})

import { describe, expect, it } from 'vitest'

import { buildStageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

const fixedTemplateResiduePattern
  = /same-her|continuity state|同一个她|同一个 her|数字生命主线|content=excluded|source_text=redacted_template_sample|\[fixed-template-excluded\]|Right now I am still holding together|我还需要|我还在|identity-continuity|continuity=|signature=|pending(?:[_-]rejoin)?=|visibility=renderer-internal/u

function visibleSurfaceText(entry: ReturnType<typeof buildStageQuickReplyClosureDiagnosticEntry>) {
  return [
    entry.headline,
    entry.briefingHeadline,
    entry.nextClosureLine,
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
      reasons: [
        'project-state-identity-continuity-continuity-required',
      ],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: null,
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

  it('keeps the structured fixed-template exclusion marker internal instead of showing it in quick reply closure', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('keeps renderer-internal continuity fields out of the visible quick reply diagnostic', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: 'renderer continuity is still partially rejoined after noisy runtime drift.',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=body+lipsync+voice-only | face and motion still need to rejoin the continuity state.',
      ],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: true,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: expect.objectContaining({
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      }),
    }))
  })

  it('does not let legacy renderer reasons reopen a closed visible diagnostic', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'closed',
      summaryLine: null,
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: null,
      reasons: [
        'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | lane=motion+voice-only',
      ],
    })

    expect(entry).toEqual(expect.objectContaining({
      visible: false,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    }))
  })

  it('keeps structured next closure markup internal instead of surfacing it as reply copy', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: '项目状态还需要继续收束。',
      companionHeadlineLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'next=Keep memory grounded without prompt templates. | surface=structured',
      reasons: [],
    })

    expect(entry.nextClosureLine).toBeNull()
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
  })

  it('drops generic metadata from an explicit companion headline', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: null,
      companionHeadlineLine: '说明：private_key=value',
      reasons: [],
    })

    expect(entry.headline).toBeNull()
  })

  it('does not turn a diagnostic reason into visible fallback copy', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: null,
      reasons: ['项目状态待同步'],
    })

    expect(entry.headline).toBeNull()
  })

  it('does not turn a diagnostic reason into a visible next closure line', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: null,
      reasons: [
        'Next closure target is still 项目状态待同步, so the next turn should keep the repair narrow.',
      ],
    })

    expect(entry.nextClosureLine).toBeNull()
  })

  it('does not turn a proactive diagnostic reason into visible headline or next copy', () => {
    const entry = buildStageQuickReplyClosureDiagnosticEntry({
      status: 'partial',
      summaryLine: null,
      reasons: [
        'Proactive identity-continuity follow-through currently reads 项目状态待同步, so the next turn should keep the repair narrow.',
      ],
    })

    expect(entry.headline).toBeNull()
    expect(entry.nextClosureLine).toBeNull()
  })
})

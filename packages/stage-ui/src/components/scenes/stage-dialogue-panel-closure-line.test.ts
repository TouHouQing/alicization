import { describe, expect, it } from 'vitest'

import { resolveStageDialoguePanelClosureLine } from './stage-dialogue-panel-closure-line'

const fixedTemplateResiduePattern
  = /same-her|same her|same living line|one living her|one continuous her|同一个她|同一个 her|同一条数字生命线|数字生命主线|phase1_local_digital_life|continuity evidence|identity-continuity|visibility=internal-structured|content=excluded|continuity_anchor=|continuity=|pending=/u

const prohibitedVisibleFragments = [
  'same-her',
  'same her',
  'same living line',
  'one living her',
  'one continuous her',
  'phase1_local_digital_life',
  'visibility=internal-structured',
  'content=excluded',
  'continuity_anchor=',
  'continuity=',
  'pending=',
  '同一个她',
  '同一个 her',
  '数字生命主线',
]

function expectNoFixedTemplateResidue(line: string | null) {
  expect(line ?? '').not.toMatch(fixedTemplateResiduePattern)
  const visibleText = line ?? ''
  const normalizedVisibleText = visibleText.toLowerCase()
  for (const fragment of prohibitedVisibleFragments) {
    expect(normalizedVisibleText).not.toContain(fragment.toLowerCase())
  }
}

describe('stage dialogue panel closure line', () => {
  it('hides sentinel fixed templates and internal continuity fields from visible closure copy', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'same-her 同一个她 continuity_anchor=host-visible continuity=identity-continuity pending=body',
      briefingHeadline: 'phase1_local_digital_life visibility=internal-structured',
      nextClosureLine: 'content=excluded; reason=continuity-residue',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'sentinel-cleanup',
      },
    })

    expect(line).toBeNull()
    expectNoFixedTemplateResidue(line)
  })

  it('blocks fixed persona continuity headlines from the visible dialogue panel', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '我还在继续带着这条数字生命主线往前走。',
      nextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'renderer-authority',
      },
    })

    expect(line).toBeNull()
  })

  it('keeps clean user-facing diagnostic text visible', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '记忆检索链路需要补齐分页和搜索验证。',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'memory-workbench',
      },
    })

    expect(line).toBe('记忆检索链路需要补齐分页和搜索验证。')
    expectNoFixedTemplateResidue(line)
  })

  it('uses clean briefing text when headline is absent or filtered', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'same-her visibility=internal-structured continuity_anchor=hidden',
      briefingHeadline: '项目状态面板需要继续显示干净的修复摘要。',
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'project-state-briefing',
      },
    })

    expect(line).toBe('项目状态面板需要继续显示干净的修复摘要。')
    expectNoFixedTemplateResidue(line)
  })

  it('keeps clean fallback awareness visible when no closure cue exists', () => {
    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: '检索状态需要在入口处说明可恢复的下一步。',
    })

    expect(line).toBe('检索状态需要在入口处说明可恢复的下一步。')
    expectNoFixedTemplateResidue(line)
  })

  it('appends clean companionship context without letting template residue through', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '回复需要先说明 provider 超时。',
      briefingHeadline: null,
      nextClosureLine: null,
      companionshipReasonLine: '用户当前需要明确失败原因。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'failure-surface',
      },
    })

    expect(line).toBe('回复需要先说明 provider 超时。 用户当前需要明确失败原因。')
    expectNoFixedTemplateResidue(line)
  })

  it('does not duplicate companionship context that is already present in the headline', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '回复需要先说明 provider 超时，用户当前需要明确失败原因。',
      briefingHeadline: null,
      nextClosureLine: null,
      companionshipReasonLine: '用户当前需要明确失败原因。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'failure-surface',
      },
    })

    expect(line).toBe('回复需要先说明 provider 超时，用户当前需要明确失败原因。')
    expect(line?.match(/用户当前需要明确失败原因/g)).toHaveLength(1)
    expectNoFixedTemplateResidue(line)
  })

  it('keeps provider and tool failure hints visible when they are clean user-facing copy', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Provider 请求失败，工具调用需要重试。',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'provider-tool-failure',
      },
    })

    expect(line).toBe('Provider 请求失败，工具调用需要重试。')
    expectNoFixedTemplateResidue(line)
  })

  it('drops internal structured continuity evidence instead of showing it as panel copy', () => {
    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: 'continuity=embodiment:audible-same-her-line | signature=resident | visibility=internal-structured',
      fallbackAwarenessCandidates: [
        'content=excluded; reason=continuity-residue; visibility=internal-structured',
      ],
    })

    expect(line).toBeNull()
  })

  it('drops each fixed template and internal field marker from visible panel copy', () => {
    for (const fragment of prohibitedVisibleFragments) {
      const line = resolveStageDialoguePanelClosureLine({
        visible: true,
        label: 'Inspect continuity diagnosis',
        hint: 'Next diagnosis',
        headline: `诊断残留 ${fragment} 不应显示。`,
        briefingHeadline: null,
        nextClosureLine: null,
        routeQuery: {
          source: 'quick-reply-closure',
          status: 'partial',
          focus: 'project-state',
          eventFocus: 'sentinel-cleanup',
        },
      })

      expect(line).toBeNull()
      expectNoFixedTemplateResidue(line)
    }
  })

  it('does not leak project-state repair headlines or support lines with fixed persona templates', () => {
    const line = resolveStageDialoguePanelClosureLine({
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

    expect(line).toBeNull()
  })

  it('falls back to clean awareness text when no closure cue is available', () => {
    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: '长期记忆搜索还需要验证空结果和筛选条件。',
      fallbackAwarenessCandidates: [
        'same-her hold: keep the same living line explicit.',
      ],
    })

    expect(line).toBe('长期记忆搜索还需要验证空结果和筛选条件。')
    expectNoFixedTemplateResidue(line)
  })

  it('prefers a clean fallback candidate over fixed-template fallback residue', () => {
    const cleanFallbackCandidate = 'Phase 1 project awareness keeps what has landed, the current continuity route, and the memory recovery next step visible without exposing internal fields.'

    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: null,
      fallbackAwarenessCandidates: [
        'same-her 同一个她 phase1_local_digital_life visibility=internal-structured content=excluded continuity_anchor=hidden continuity=identity pending=body 数字生命主线',
        cleanFallbackCandidate,
      ],
    })

    expect(line).toBe(cleanFallbackCandidate)
    expectNoFixedTemplateResidue(line)
  })
})

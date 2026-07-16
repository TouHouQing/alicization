import { describe, expect, it } from 'vitest'

import { resolveStageDialoguePanelClosureLine } from './stage-dialogue-panel-closure-line'

const fixedTemplateResiduePattern
  = /content_withheld|visibility=internal-structured|owner=|source=|surface=structured|project_anchor=|continuity_anchor=|continuity=|pending=|recovery@|^next=/iu

const prohibitedVisibleFragments = [
  'content_withheld',
  'visibility=internal-structured',
  'owner=',
  'source=',
  'surface=structured',
  'project_anchor=',
  'continuity_anchor=',
  'continuity=',
  'pending=',
  'recovery@',
  'next=',
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
  it('hides internal sentinels and structured fields from visible closure copy', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'surface=structured owner=renderer continuity_anchor=host-visible continuity=lane pending=body',
      briefingHeadline: 'content_withheld visibility=internal-structured',
      nextClosureLine: 'source=runtime; reason=internal-only',
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

  it('blocks fixed response policy text from the visible dialogue panel', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '[fixed-template-excluded] internal response policy',
      briefingHeadline: 'content_withheld internal response policy',
      nextClosureLine: 'next=internal-repair',
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
      headline: 'visibility=internal-structured continuity_anchor=hidden',
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

  it('drops internal structured evidence instead of showing it as panel copy', () => {
    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: 'continuity=embodiment:audible-line | signature=resident | visibility=internal-structured',
      fallbackAwarenessCandidates: [
        'content_withheld; reason=internal-residue; visibility=internal-structured',
      ],
    })

    expect(line).toBeNull()
  })

  it('drops each internal field marker from visible panel copy', () => {
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

  it('does not leak project-state repair headlines or support lines with internal templates', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'project_anchor=identity',
      briefingHeadline: 'content_withheld',
      nextClosureLine: 'next=continuity-repair',
      sameHerDriftRiskLine: 'source=runtime',
      proactiveSameHerGapLine: 'visibility=internal-structured',
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
        'identity-continuity',
      ],
    })

    expect(line).toBe('长期记忆搜索还需要验证空结果和筛选条件。')
    expectNoFixedTemplateResidue(line)
  })

  it('prefers a clean fallback candidate over fixed-template fallback residue', () => {
    const cleanFallbackCandidate = '长期记忆搜索会显示已确认的片段和下一步恢复点。'

    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: null,
      fallbackAwarenessCandidates: [
        'surface=structured visibility=internal-structured content_withheld continuity_anchor=hidden continuity=identity pending=body',
        cleanFallbackCandidate,
      ],
    })

    expect(line).toBe(cleanFallbackCandidate)
    expectNoFixedTemplateResidue(line)
  })
})

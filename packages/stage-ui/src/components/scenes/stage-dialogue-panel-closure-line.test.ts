import { describe, expect, it } from 'vitest'

import { resolveStageDialoguePanelClosureLine } from './stage-dialogue-panel-closure-line'

const fixedTemplateResiduePattern
  = /content_withheld|visibility=internal-structured|owner=|source=|surface=structured|project_anchor=|continuity_anchor=|continuity=|pending=|^next=/iu

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

  it.each([
    '[fixed-template-excluded] internal response policy',
    'body+voice recovery@segment-runtime-1',
  ])('blocks explicit internal closure marker: %s', (headline) => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline,
      briefingHeadline: null,
      nextClosureLine: null,
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

  it('does not append support lines to explicit closure text', () => {
    const legacyClosureCue = {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '回复需要先说明 provider 超时。',
      briefingHeadline: null,
      nextClosureLine: null,
      sameHerDriftRiskLine: '当前漂移风险需要继续观察。',
      proactiveSameHerGapLine: '下一轮还要补齐恢复验证。',
      companionshipReasonLine: '用户当前需要明确失败原因。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'failure-surface',
      },
    }
    const line = resolveStageDialoguePanelClosureLine(legacyClosureCue)

    expect(line).toBe('回复需要先说明 provider 超时。')
    expectNoFixedTemplateResidue(line)
  })

  it('keeps headline priority independent of route focus', () => {
    const closureCue = {
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '优先显示这条明确结论。',
      briefingHeadline: '这条 briefing 只在 headline 不可见时使用。',
      nextClosureLine: '这条 next 只作为第三候选。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'general',
        eventFocus: 'failure-surface',
      },
    }

    const generalLine = resolveStageDialoguePanelClosureLine(closureCue)
    const projectStateLine = resolveStageDialoguePanelClosureLine({
      ...closureCue,
      routeQuery: {
        ...closureCue.routeQuery,
        focus: 'project-state',
      },
    })
    const identityContinuityLine = resolveStageDialoguePanelClosureLine({
      ...closureCue,
      routeQuery: {
        ...closureCue.routeQuery,
        focus: 'identity-continuity-continuity',
      },
    })

    expect(generalLine).toBe('优先显示这条明确结论。')
    expect(projectStateLine).toBe(generalLine)
    expect(identityContinuityLine).toBe(generalLine)
  })

  it('keeps provider and tool failure hints visible when they are clean user-facing copy', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Provider 请求超时，工具调用失败，需要重试。',
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'provider-tool-failure',
      },
    })

    expect(line).toBe('Provider 请求超时，工具调用失败，需要重试。')
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
      const internalLine = fragment.endsWith('=')
        ? `${fragment}internal`
        : fragment
      const line = resolveStageDialoguePanelClosureLine({
        visible: true,
        label: 'Inspect continuity diagnosis',
        hint: 'Next diagnosis',
        headline: internalLine,
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

  it('does not let Phase 1 or same-her keywords change fallback priority', () => {
    const fallbackAwarenessLine = '先显示这一条简短而清楚的状态说明。'

    const withoutKeywords = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine,
      fallbackAwarenessCandidates: [
        'A much longer digital life project summary describes what has landed and what remains open for the current continuity route.',
      ],
    })
    const withPhaseOneKeywords = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine,
      fallbackAwarenessCandidates: [
        'Phase 1 digital life project summary describes what has landed and what remains open for the current continuity route.',
      ],
    })
    const withSameHerKeywords = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine,
      fallbackAwarenessCandidates: [
        'One living her keeps the same-her identity-continuity route visible through this longer project summary.',
      ],
    })

    expect(withoutKeywords).toBe(fallbackAwarenessLine)
    expect(withPhaseOneKeywords).toBe(fallbackAwarenessLine)
    expect(withSameHerKeywords).toBe(fallbackAwarenessLine)
  })

  it('keeps fallback order stable instead of scoring later candidates', () => {
    const line = resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: '先显示第一条。',
      fallbackAwarenessCandidates: [
        '第二条候选更长，但它不能因为长度或项目状态措辞而越过第一条自然文本。',
        '第三条候选同样不应被重新排序。',
      ],
    })

    expect(line).toBe('先显示第一条。')
  })

  it('uses fallback order only after every explicit closure field is filtered', () => {
    const line = resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'owner=renderer',
      briefingHeadline: '{"visibility":"internal-structured"}',
      nextClosureLine: 'Phase 1 same-her identity-continuity',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'sentinel-cleanup',
      },
    }, {
      fallbackAwarenessLine: '首条 fallback 是干净透明的超时说明。',
      fallbackAwarenessCandidates: [
        '后续 fallback 不应越过首条。',
      ],
    })

    expect(line).toBe('首条 fallback 是干净透明的超时说明。')
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

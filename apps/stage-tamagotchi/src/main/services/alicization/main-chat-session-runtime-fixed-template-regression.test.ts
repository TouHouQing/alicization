import { describe, expect, it } from 'vitest'

import { __alicizationTestOnly } from './main-chat-session-runtime'

const fixedTemplateLine
  = ['phase1', 'local', 'digital', 'life'].join('_')

const blockedEvidenceLine
  = [
    ['content', 'excluded'].join('='),
    ['reason', 'continuity-residue'].join('='),
    ['visibility', 'internal-structured'].join('='),
  ].join('; ')

const structuredContinuityFacts
  = 'identity=working_memory_owner_connected | phase=memory_quality_scaleup | landed=working_memory_owner_connected | open=open_loop=memory+dialogue+embodiment; status=unfinished | next=semantic_recall_grounded_on_user_query'

describe('main chat session runtime fixed-template regression', () => {
  it('does not treat fixed-template project lines as stronger provider-facing awareness', () => {
    expect(__alicizationTestOnly.isBlockedFixedTemplateEvidence(fixedTemplateLine)).toBe(true)
    expect(__alicizationTestOnly.isBlockedFixedTemplateEvidence(blockedEvidenceLine)).toBe(true)

    expect(__alicizationTestOnly.isStrongerSameHerProjectHeadline(fixedTemplateLine)).toBe(false)
    expect(__alicizationTestOnly.isStrongerSameHerProjectHeadline(blockedEvidenceLine)).toBe(false)
    expect(__alicizationTestOnly.isBlockedFixedTemplateEvidence(structuredContinuityFacts)).toBe(false)
  })

  it('scores blocked fixed-template evidence below structured memory continuity facts', () => {
    const blockedScore = __alicizationTestOnly.scoreRuntimeProjectStateDetailCandidate(
      blockedEvidenceLine,
      'awareness',
    )
    const fixedTemplateScore = __alicizationTestOnly.scoreRuntimeProjectStateDetailCandidate(
      fixedTemplateLine,
      'awareness',
    )
    const structuredScore = __alicizationTestOnly.scoreRuntimeProjectStateDetailCandidate(
      structuredContinuityFacts,
      'awareness',
    )

    expect(blockedScore).toBe(Number.NEGATIVE_INFINITY)
    expect(fixedTemplateScore).toBe(Number.NEGATIVE_INFINITY)
    expect(structuredScore).toBeGreaterThan(0)
  })

  it('drops blocked memory-owner residue before provider-facing messages are used for planning', () => {
    const sanitizeMessages = __alicizationTestOnly.sanitizeOrdinaryDialogueProviderMessages
    expect(typeof sanitizeMessages).toBe('function')

    const messages = sanitizeMessages([
      {
        role: 'system',
        content: [
          '[ALICIZATION_WORKING_MEMORY_OWNER]',
          '- clean fact: 用户希望短期记忆和长期记忆真实参与对话。',
          `- stale marker: ${blockedEvidenceLine}`,
          `- stale template: ${fixedTemplateLine}`,
        ].join('\n'),
      },
      {
        role: 'system',
        content: [
          '[ALICIZATION_PROJECT_STATE]',
          'Project identity: Alicization is a local-first digital life project.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: '测试记忆召回',
      },
    ] as any)

    const text = JSON.stringify(messages)
    expect(text).toContain('用户希望短期记忆和长期记忆真实参与对话')
    expect(text).toContain('测试记忆召回')
    expect(text).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(text).not.toContain('content=excluded')
    expect(text).not.toContain('visibility=redacted_internal')
    expect(text).not.toMatch(/Pre-reply|local-first digital life project|one continuous "?her"?|legacy phase-one template|continuity state/iu)
  })
})

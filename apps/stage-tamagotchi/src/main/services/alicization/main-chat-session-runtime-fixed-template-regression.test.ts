import { readFileSync } from 'node:fs'

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
  it('preserves typed persona and failure facts while removing legacy governance fields from all fact owners', () => {
    const sanitizeMessages = __alicizationTestOnly.sanitizeOrdinaryDialogueProviderMessages
    const relationshipCadenceField = ['relationship', 'cadence'].join('_')
    const messages = sanitizeMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-profile',
          data: {
            description: '用户明确设置的人格可以讨论 same-her 这个词。',
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-directives',
          data: {
            text: `${relationshipCadenceField}=user-authored | 说话真实一点。`,
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-execution-callbacks',
          data: {
            status: 'failed',
            summary: `${relationshipCadenceField}=legacy; Provider timeout while removing old residue.`,
          },
        }),
      },
    ] as any)

    const serialized = JSON.stringify(messages)
    expect(serialized).toContain('alicization-persona-profile')
    expect(serialized).toContain('用户明确设置的人格可以讨论 same-her 这个词')
    expect(serialized).toContain('alicization-persona-directives')
    expect(serialized).toContain('说话真实一点。')
    expect(serialized).not.toContain(`${relationshipCadenceField}=user-authored`)
    expect(serialized).toContain('alicization-execution-callbacks')
    expect(serialized).toContain('failed')
    expect(serialized).toContain('Provider timeout')
    expect(serialized).not.toContain(`${relationshipCadenceField}=legacy`)
  })

  it('does not default the canonical project brief into organic memory resolution', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('projectStateBrief: input?.projectStateBrief ?? projectStateBrief')
  })

  it('does not reopen provider project-state injection from chat or perception policy', () => {
    const mainChatSource = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')
    const perceptionSource = readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8')

    expect(mainChatSource).not.toContain('shouldIncludeProjectStateProviderContext')
    expect(mainChatSource).toContain('includeProjectStateContext: false')
    expect(perceptionSource).not.toContain('shouldIncludeProjectStateProviderContext')
    expect(perceptionSource).toContain('includeProjectStateFacts: false')
  })

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

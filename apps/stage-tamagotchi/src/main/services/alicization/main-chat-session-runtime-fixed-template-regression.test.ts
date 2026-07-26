import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { __alicizationTestOnly } from './main-chat-session-runtime'

const ignoredPayloadMarker = 'legacy-governance-payload-ignored'
const retiredTypedField = ['relationship', 'cadence'].join('_')
const retiredResolverNames = [
  ['resolveAlicization', 'Project', 'StateBrief'].join(''),
  ['resolveAlicization', 'Project', 'StateSnapshot'].join(''),
] as const

describe('main chat session runtime template regression', () => {
  it('preserves typed persona facts and transparent failure details while removing retired controls', () => {
    const sanitizeMessages = __alicizationTestOnly.sanitizeOrdinaryDialogueProviderMessages
    const messages = sanitizeMessages([
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-profile',
          data: {
            description: '用户明确设置的人格表达应当自然、真实。',
            [retiredTypedField]: ignoredPayloadMarker,
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-persona-directives',
          data: {
            text: '说话真实一点。',
            [retiredTypedField]: ignoredPayloadMarker,
          },
        }),
      },
      {
        role: 'system',
        content: JSON.stringify({
          type: 'alicization-execution-callbacks',
          data: {
            status: 'failed',
            summary: 'Provider timeout while processing the request.',
            [retiredTypedField]: ignoredPayloadMarker,
          },
        }),
      },
    ] as any)

    const serialized = JSON.stringify(messages)
    expect(serialized).toContain('alicization-persona-profile')
    expect(serialized).toContain('用户明确设置的人格表达应当自然、真实。')
    expect(serialized).toContain('alicization-persona-directives')
    expect(serialized).toContain('说话真实一点。')
    expect(serialized).toContain('alicization-execution-callbacks')
    expect(serialized).toContain('failed')
    expect(serialized).toContain('Provider timeout while processing the request.')
    expect(serialized).not.toContain(ignoredPayloadMarker)
    expect(serialized).not.toContain(retiredTypedField)
  })

  it('keeps memory-owner facts and dialogue messages unchanged', () => {
    const messages = __alicizationTestOnly.sanitizeOrdinaryDialogueProviderMessages([
      {
        role: 'system',
        content: [
          '[ALICIZATION_WORKING_MEMORY_OWNER]',
          '- 用户希望短期记忆和长期记忆真实参与对话。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: '测试记忆召回',
      },
      {
        role: 'assistant',
        content: '这是 Provider 已生成的上一轮回复。',
      },
    ] as any)

    expect(messages).toEqual([
      {
        role: 'system',
        content: [
          '[ALICIZATION_WORKING_MEMORY_OWNER]',
          '- 用户希望短期记忆和长期记忆真实参与对话。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: '测试记忆召回',
      },
      {
        role: 'assistant',
        content: '这是 Provider 已生成的上一轮回复。',
      },
    ])
  })

  it('does not rebuild current Provider context from historical session metadata', () => {
    const fallback = __alicizationTestOnly.readProjectStateFallbackFromSessionMirror({
      continuityArcSummary: ignoredPayloadMarker,
      continuityProjectSummary: ignoredPayloadMarker,
    } as any)

    expect(JSON.stringify(fallback)).not.toContain(ignoredPayloadMarker)
    expect(fallback.preflightSummary).toBeNull()
    expect(fallback.preDialogueAwarenessLine).toBeNull()
    expect(fallback.latestLandedProgress).toBe('')
    expect(fallback.primaryOpenLoop).toBe('')
    expect(fallback.nextClosureTarget).toBe('')
  })

  it('keeps retired context resolvers out of dialogue and memory entrypoints', () => {
    const sources = [
      readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./runtime-chat-perception-augment.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./runtime-memory-closure.ts', import.meta.url), 'utf8'),
    ]

    for (const source of sources) {
      for (const name of retiredResolverNames)
        expect(source).not.toContain(name)
    }
  })

  it('keeps retired same-her project routing matchers out of the main dialogue runtime', () => {
    const source = readFileSync(new URL('./main-chat-session-runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/function\s+(?:isBroadLegacyProjectReminderLine|isSpecificCompanionAuthorityLine|carriesLivedInSameHerAuthorityLine|looksLikeBroadProjectAwareReminderLine|carriesStructuredLandedProgressProjectAwareness)/u)
    expect(source).not.toContain('isStrongerSameHerProjectHeadline')
    expect(source).not.toContain('scoreRuntimeProjectStateDetailCandidate')
    expect(source).not.toMatch(/same remembered seam|same local-first digital life project|same digital life project(?: in)? phase 1|cross-modal same-her proof|same-her inward-carry observability|one same her must stay explicit|same unfinished phase 1/iu)
  })

  it('does not restore a retired context default during organic memory resolution', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const retiredDefaultingExpression = [
      'project',
      'StateBrief: input?.project',
      'StateBrief ?? project',
      'StateBrief',
    ].join('')

    expect(source).not.toContain(retiredDefaultingExpression)
  })
})

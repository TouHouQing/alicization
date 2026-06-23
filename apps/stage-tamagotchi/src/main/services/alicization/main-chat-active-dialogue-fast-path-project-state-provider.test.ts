import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationActiveDialogueFastPathMessages } from './main-chat-active-dialogue-loop'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'

function createPrepared(overrides?: Partial<any>) {
  return {
    waitForTools: false,
    hasVisualGrounding: false,
    governance: null,
    personaKernel: null,
    performanceManifest: null,
    sessionMirror: null,
    messages: [
      { role: 'user' as const, content: '这个 goal 现在还差什么没闭环？' },
    ] as Message[],
    runtimeSurface: {
      action: {
        kind: 'answer',
      },
      governance: null,
    },
    ...overrides,
  } as any
}

describe('active dialogue fast-path provider project-state carry', () => {
  it('keeps canonical project-state context in compact fast-path provider messages', () => {
    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条线轻一点接住。' },
        { role: 'user', content: '这个 goal 现在还差什么没闭环？' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '这个 goal 现在还差什么没闭环？',
        previousUserText: '',
        previousAssistantText: '我先沿着这条线轻一点接住。',
        continuityAnchor: 'same project-state line',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-her-fast-path',
            continuityCue: 'keep the same living line explicit before answering closure questions',
          },
        },
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: null,
        digitalLifeSpine: null,
        reasonCodes: [
          'short-follow-up',
          'project-state-progress-open-loop-follow-up',
        ],
      } as any,
      prepared: createPrepared(),
    })

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(true)

    const canonicalProjectStateSystemMessage = messages.find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]')
      && message.content.includes('current_phase=')
      && message.content.includes('current_objective=')
      && message.content.includes('project_preflight=')
      && message.content.includes('latest_landed_progress=')
      && message.content.includes('same_her_self_line=')
      && message.content.includes('same_her_drift_risk=')
      && message.content.includes('primary_open_loop=')
      && message.content.includes('next_closure_target='),
    )

    expect(canonicalProjectStateSystemMessage).toBeDefined()
  })

  it('passes compact fast-path provider messages through the one-shot project-state guard', async () => {
    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条线轻一点接住。' },
        { role: 'user', content: '这个 goal 现在还差什么没闭环？' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '这个 goal 现在还差什么没闭环？',
        previousUserText: '',
        previousAssistantText: '我先沿着这条线轻一点接住。',
        continuityAnchor: 'same project-state line',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-her-fast-path',
            continuityCue: 'keep the same living line explicit before answering closure questions',
          },
        },
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: null,
        digitalLifeSpine: null,
        reasonCodes: [
          'short-follow-up',
          'project-state-progress-open-loop-follow-up',
        ],
      } as any,
      prepared: createPrepared(),
    })

    const observedProviderMessages: Message[][] = []
    const result = await generateAlicizationMainChatNonStreaming({
      chatConfig: { model: 'gpt-test' } as any,
      messages,
      timeoutMs: 1_000,
      generateTextImpl: async (input) => {
        observedProviderMessages.push(((input as { messages?: Message[] }).messages ?? []).slice())
        return {
          finishReason: 'stop',
          text: 'fast-path-ok',
        }
      },
    })

    expect(result.fullText).toBe('fast-path-ok')
    expect(observedProviderMessages).toHaveLength(1)
    expect(carriesAlicizationCanonicalProjectState(observedProviderMessages[0]!)).toBe(true)
  })
})

import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationSecondPassTransportFailureReply,
  rewriteAlicizationVisibleReplySecondPass,
} from './main-chat-second-pass-rewrite'

interface ProviderCall {
  messages: Message[]
}

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      { role: 'user', content: '你仔细看看呢' },
    ] as Message[],
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    hasVisualGrounding: false,
    conversationSessionId: 'session-1',
    performanceManifest: null,
    governance: {
      decisionTraceId: 'mind:test:rewrite',
      turnMode: 'answer',
      truthState: 'remembered',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerSubject: 'general',
      screenReferenceMode: 'avoid',
      answerAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: 'IntelliJ IDEA',
      focusAnchor: '你仔细看看呢',
      answerIntent: 'Answer this current dialogue turn without inventing current screen detail.',
      openingMove: 'Start from the current turn.',
      carriedThread: 'CaseApplyTypeEnum',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 3,
      mindMode: 'tracking',
      embodiedPresence: 'hesitant',
      emotionalTension: 'calm-browse',
      mustDo: [],
      mustNotDo: [],
    },
    runtimeSurface: {
      governance: null,
    },
    getSessionTrace: () => ({ phaseOrder: [], history: [] }),
    sessionTrace: { phaseOrder: [], history: [] },
    ...overrides,
  } as any
}

describe('main-chat-second-pass-rewrite', () => {
  it('uses provider-authored second pass instead of deterministic local fallback text', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-without-unsupported-screen-detail; tone=warm',
        emotion: 'thinking',
        reply: '我不能把没确认的画面细节说成真的；你这句我会先按当前对话本身接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=repair; truth=memory; focus=intellij-idea; move=protect-focus; tone=warm',
        emotion: 'neutral',
        reply: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
        parsePath: 'json',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(result.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    }))
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.visibleReplyRewriteRequest).toBeNull()
    expect(String(structured.reply ?? '')).not.toContain('IntelliJ IDEA')
    expect(String(structured.reply ?? '')).not.toContain('主人')
    expect(String(structured.reply ?? '')).not.toContain('second pass')
    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls[0]?.[0]
    expect(providerInput?.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'user',
        content: expect.stringContaining('[REWRITE_REQUEST]'),
      }),
    ]))
  })

  it('uses an explicit transport failure surface instead of replaying contaminated draft text', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        reply: '',
      },
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'gateway-unreachable',
    })
    const structured = JSON.parse(result.fullText) as Record<string, unknown>

    expect(String(structured.reply ?? '')).toContain('主模型连接')
    expect(String(structured.reply ?? '')).not.toContain('IntelliJ IDEA')
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.format).toBe('fallback-v1')
    expect(structured.parsePath).toBe('transport-failure')
    expect(structured.transportFailure).toEqual(expect.objectContaining({
      stage: 'visible-reply-second-pass',
      reason: 'gateway-unreachable',
    }))
    expect(result.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'visible-reply-second-pass-transport-failure',
    }))
  })
})

import { describe, expect, it } from 'vitest'

import {
  bridgeAlicizationChatChunkEventToStreamEvent,
  bridgeAlicizationChatErrorEventToStreamEvent,
  bridgeAlicizationChatFinishEventToStreamEvent,
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
} from './alicization-chat-stream-bridge'

const failureSurface = {
  kind: 'provider-auth',
  reply: '错误：Provider 鉴权失败。',
  origin: 'failure-surface',
  allowLongTermCondensation: false,
  allowPersonaLearning: false,
  allowTraining: false,
  nonHumanAuthoredStatus: 'direct-infra-repair:provider-auth',
  visibleReplySource: 'infrastructure-failure',
  excludeFromPersonaLearning: true,
  excludeFromMemoryCondensation: true,
  auditCategory: 'alicization.chat-failure',
} as const

describe('alicization chat stream bridge', () => {
  it('forwards provider chunk authority metadata without rewriting text', () => {
    const event = bridgeAlicizationChatChunkEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-provider',
      text: 'Provider 可见回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })

    expect(event).toEqual({
      type: 'text-delta',
      text: 'Provider 可见回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
  })

  it('forwards the complete provider payload on finish for renderer persistence', () => {
    const fullText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'dynamic thought',
      emotion: 'neutral',
      reply: 'Provider 可见回复',
    })
    const visibleReplyRealization = {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: 'Provider 可见回复',
      visibleReplyValidationStatus: 'approved',
      blockedReasons: [] as string[],
      reason: null,
      projectBriefing: {
        marker: 'legacy-project-briefing',
      },
    } as const
    const memoryFailures = [{
      kind: 'recall-failure',
      reply: '本轮长期记忆召回失败。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:recall-failure',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
      stage: 'long-term-memory-recall',
      cardId: 'default',
      turnId: 'turn-provider',
      occurredAt: 10,
      errorSummary: 'recall offline',
    }] as const
    const event = bridgeAlicizationChatFinishEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-provider',
      status: 'completed',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
      fullText,
      finishReason: 'stop',
      memoryFailures: [...memoryFailures],
      visibleReplyRealization,
    })

    expect(event).toMatchObject({
      type: 'finish',
      origin: 'provider',
      fullText,
      finishReason: 'stop',
      failureSurface: null,
      memoryFailures,
      visibleReplyRealization: expect.objectContaining({
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: 'Provider 可见回复',
        visibleReplyValidationStatus: 'approved',
        blockedReasons: [],
        reason: null,
      }),
    })
    expect(JSON.stringify(event)).not.toContain('"projectBriefing"')
  })

  it('forwards failure metadata exactly without generating a substitute reply', () => {
    const event = bridgeAlicizationChatErrorEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-failure',
      error: failureSurface.reply,
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })

    expect(event).toEqual({
      type: 'error',
      error: failureSurface.reply,
      origin: 'failure-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })
  })

  it('forwards runtime and life-system facts without renderer dialogue governance', () => {
    const embodiment = {
      emotion: 'neutral',
      motion: 'idle',
    } as any
    const digitalLifeSpine = {
      memory: {
        recentEpisodeSummary: '用户正在验证记忆召回。',
      },
      mind: {
        selfLine: '保持由人格与经历形成的连续自我。',
      },
    } as any
    const event = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-meta',
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        repairState: 'none',
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
      } as any,
      embodiment,
      digitalLifeSpine,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        rulingMotive: '回应用户当前问题',
        currentConsciousFrame: {
          reasonTags: ['working-memory', 'long-term-recall'],
          focusAnchor: '验证记忆对话闭环',
          consciousNeed: '基于当前对话与召回事实作答',
          speakingIntention: '直接回答测试结果',
          selfContinuityAuthority: {
            sourceTags: ['persona', 'memory'],
            selfLine: '保持由人格与经历形成的连续自我。',
            relationshipLine: '记得用户正在验证本地记忆。',
            motiveLine: '如实反馈验证结果。',
            habitLine: null,
            inwardLine: null,
            authoritySummary: '人格与记忆共同提供连续性。',
          },
        },
        summary: '运行时对话通道已就绪。',
      } as any,
    })

    expect(event).toEqual(expect.objectContaining({
      type: 'meta',
      governance: null,
      embodiment,
      digitalLifeSpine,
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        rulingMotive: '回应用户当前问题',
        currentConsciousFrame: expect.objectContaining({
          reasonTags: ['working-memory', 'long-term-recall'],
          focusAnchor: '验证记忆对话闭环',
          consciousNeed: '基于当前对话与召回事实作答',
          speakingIntention: '直接回答测试结果',
          selfContinuityAuthority: expect.objectContaining({
            sourceTags: ['persona', 'memory'],
            selfLine: '保持由人格与经历形成的连续自我。',
            relationshipLine: '记得用户正在验证本地记忆。',
            motiveLine: '如实反馈验证结果。',
            habitLine: null,
            inwardLine: null,
            authoritySummary: '人格与记忆共同提供连续性。',
          }),
        }),
        summary: '运行时对话通道已就绪。',
      }),
    }))
  })

  it('structurally omits unknown sidecars from meta events', () => {
    const payload = {
      cardId: 'default',
      turnId: 'turn-unknown-sidecar-meta',
      governance: null,
      unknownSidecar: {
        marker: 'top-level-sidecar',
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        unknownSidecar: {
          marker: 'runtime-sidecar',
        },
        currentConsciousFrame: {
          reasonTags: ['memory-recall'],
          focusAnchor: '用户当前问题',
          unknownNestedSidecar: {
            marker: 'frame-sidecar',
          },
        },
        summary: '运行时事实',
      },
    } as any
    const event = bridgeAlicizationChatMetaEventToStreamEvent(payload)

    expect(event).toEqual(expect.objectContaining({
      type: 'meta',
      runtimeDigest: expect.objectContaining({
        summary: '运行时事实',
        currentConsciousFrame: expect.objectContaining({
          reasonTags: ['memory-recall'],
          focusAnchor: '用户当前问题',
        }),
      }),
    }))
    expect(JSON.stringify(event)).not.toContain('"unknownSidecar"')
    expect(JSON.stringify(event)).not.toContain('"unknownNestedSidecar"')
  })

  it('structurally omits unknown sidecars from accepted-start metadata', () => {
    const payload = {
      accepted: true,
      turnId: 'turn-start-runtime',
      state: 'accepted',
      governance: {
        marker: 'unknown-governance',
      },
      unknownSidecar: {
        marker: 'accepted-start-sidecar',
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        unknownSidecar: {
          marker: 'accepted-runtime-sidecar',
        },
        summary: '启动后的运行时事实',
      },
    } as any
    const event = bridgeAlicizationChatStartResultToStreamEvent('default', payload)

    expect(event.governance).toBeNull()
    expect(event.runtimeDigest?.summary).toBe('启动后的运行时事实')
    expect(JSON.stringify(event)).not.toContain('"unknownSidecar"')
  })
})

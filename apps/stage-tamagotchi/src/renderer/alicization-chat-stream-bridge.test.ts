import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  AlicizationChatAbortUnconfirmedError,
  bridgeAlicizationChatAbortedFinishEventToStreamErrorEvent,
  bridgeAlicizationChatChunkEventToStreamEvent,
  bridgeAlicizationChatErrorEventToStreamEvent,
  bridgeAlicizationChatFinishEventToStreamEvent,
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
  createAlicizationChatStartAbortCoordinator,
  createAlicizationChatStreamLifecycle,
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

  it('preserves the failure surface when an aborted finish reaches the renderer', () => {
    const event = bridgeAlicizationChatAbortedFinishEventToStreamErrorEvent({
      cardId: 'default',
      turnId: 'turn-aborted',
      status: 'aborted',
      origin: 'failure-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
      fullText: '',
      finishReason: 'chat-provider-continuation-timeout',
      memoryFailures: [],
      visibleReplyExecution: null,
      visibleReplyRealization: null,
      visibleReplyCritic: null,
      visibleReplyClosure: null,
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

  it('serializes async renderer events and settles only after finish metadata is consumed', async () => {
    let releaseFirstEvent!: () => void
    const firstEventGate = new Promise<void>((resolve) => {
      releaseFirstEvent = resolve
    })
    let resolveSettlement!: () => void
    const settlement = new Promise<void>((resolve) => {
      resolveSettlement = resolve
    })
    const observed: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(`${event.type}:start`)
        if (event.type === 'meta')
          await firstEventGate
        observed.push(`${event.type}:end`)
      },
      resolve: resolveSettlement,
      reject: error => expect.fail(`unexpected rejection: ${String(error)}`),
    })

    lifecycle.publish({ type: 'meta', governance: null } as AlicizationBridgeChatStreamEvent)
    lifecycle.resolveAfter([
      { type: 'finish', finishReason: 'stop' } as AlicizationBridgeChatStreamEvent,
    ])

    await vi.waitFor(() => {
      expect(observed).toEqual(['meta:start'])
    })
    let settled = false
    void settlement.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    releaseFirstEvent()
    await settlement

    expect(observed).toEqual([
      'meta:start',
      'meta:end',
      'finish:start',
      'finish:end',
    ])
  })

  it('keeps an error notification pending until the following finish metadata is consumed', async () => {
    const terminalError = new Error('provider failed')
    let rejectSettlement!: (error: unknown) => void
    const settlement = new Promise<void>((_resolve, reject) => {
      rejectSettlement = reject
    })
    const observed: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event.type)
      },
      resolve: () => expect.fail('failure lifecycle must not resolve'),
      reject: rejectSettlement,
    })

    lifecycle.publish({
      type: 'error',
      error: 'Provider 失败。',
    } as AlicizationBridgeChatStreamEvent)
    await lifecycle.waitForIdle()

    expect(observed).toEqual(['error'])
    expect(lifecycle.hasObservedError()).toBe(true)
    expect(lifecycle.getObservedError()).toMatchObject({
      type: 'error',
      error: 'Provider 失败。',
    })

    lifecycle.rejectAfter([
      {
        type: 'finish',
        finishReason: 'provider-failed',
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: null,
          providerMindExecuted: false,
          reason: 'provider-failed',
        },
      } as AlicizationBridgeChatStreamEvent,
    ], terminalError)

    await expect(settlement).rejects.toBe(terminalError)
    expect(observed).toEqual(['error', 'finish'])
  })

  it('rejects a completed settlement when an error was already observed', async () => {
    const observed: string[] = []
    let rejectSettlement!: (error: unknown) => void
    const settlement = new Promise<void>((_resolve, reject) => {
      rejectSettlement = reject
    })
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event.type)
      },
      resolve: () => expect.fail('an errored lifecycle must not resolve'),
      reject: rejectSettlement,
    })

    lifecycle.publish({
      type: 'error',
      error: 'Codex 失败。',
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.resolveAfter([
      {
        type: 'finish',
        finishReason: 'stop',
      } as AlicizationBridgeChatStreamEvent,
    ])

    await expect(settlement).rejects.toEqual(new Error('Codex 失败。'))
    expect(observed).toEqual(['error', 'finish'])
  })

  it('preserves structured failure metadata on an observed error rejection', async () => {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      toolExecution: {
        code: 'CODEX_TIMEOUT',
        message: 'Codex produced no semantic progress for 180000ms.',
        toolName: 'codex',
      },
    })
    let rejectSettlement!: (error: unknown) => void
    const settlement = new Promise<void>((_resolve, reject) => {
      rejectSettlement = reject
    })
    const lifecycle = createAlicizationChatStreamLifecycle({
      resolve: () => expect.fail('an errored lifecycle must not resolve'),
      reject: rejectSettlement,
    })

    lifecycle.publish({
      type: 'error',
      error: failureSurface.reply,
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })
    lifecycle.resolveAfter([])

    await expect(settlement).rejects.toMatchObject({
      message: failureSurface.reply,
      failureSurface,
      toolExecution: failureSurface.toolExecution,
    })
  })

  it('preserves an observed failure surface when failed finish rejects the stream', async () => {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      toolExecution: {
        code: 'CODEX_TIMEOUT',
        message: 'Codex produced no semantic progress for 180000ms.',
        toolName: 'codex',
      },
    })
    let rejectSettlement!: (error: unknown) => void
    const settlement = new Promise<void>((_resolve, reject) => {
      rejectSettlement = reject
    })
    const lifecycle = createAlicizationChatStreamLifecycle({
      resolve: () => expect.fail('a failed finish must not resolve'),
      reject: rejectSettlement,
    })

    lifecycle.publish({
      type: 'error',
      error: failureSurface.reply,
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })
    lifecycle.rejectAfter([{
      type: 'finish',
      finishReason: 'provider-failed',
    } as AlicizationBridgeChatStreamEvent], new Error('Alicization chat stream failed.'))

    await expect(settlement).rejects.toMatchObject({
      message: 'Alicization chat stream failed.',
      failureSurface,
      toolExecution: failureSurface.toolExecution,
    })
  })

  it('waits for an active tool terminal fact before rejecting a generic stream failure', async () => {
    const observed: string[] = []
    let rejection: unknown
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event.type)
      },
      resolve: () => expect.fail('a failed stream must not resolve'),
      reject: (error) => {
        rejection = error
      },
    })

    lifecycle.publish({
      type: 'tool-call',
      toolCallId: 'codex-late-terminal',
      toolName: 'codex',
      projection: {
        factType: 'tool-call',
        accepted: true,
        traceOnly: false,
        card: {
          toolCallId: 'codex-late-terminal',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'started',
          terminal: false,
          revision: 1,
          elapsedMs: null,
          timeoutMs: null,
          errorCode: null,
          errorMessage: null,
          step: null,
          result: undefined,
        },
      },
      args: '{}',
      toolCallType: 'function',
    })
    lifecycle.publish({
      type: 'error',
      error: 'Alicization chat stream failed.',
    })
    lifecycle.rejectAfter([{
      type: 'finish',
      finishReason: 'provider-failed',
    } as AlicizationBridgeChatStreamEvent], new Error('Alicization chat stream failed.'))
    await lifecycle.waitForIdle()

    expect(observed).toEqual(['tool-call', 'error', 'finish'])
    expect(rejection).toBeUndefined()

    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'codex-late-terminal',
      toolName: 'codex',
      phase: 'timeout',
      signal: 'terminal',
      elapsedMs: 180_000,
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: 'Codex produced no semantic progress for 180000ms.',
      projection: {
        factType: 'tool-progress',
        accepted: true,
        traceOnly: false,
        card: {
          toolCallId: 'codex-late-terminal',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'timeout',
          terminal: true,
          revision: 2,
          elapsedMs: 180_000,
          timeoutMs: 180_000,
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'Codex produced no semantic progress for 180000ms.',
          step: null,
          result: undefined,
        },
      },
    } as AlicizationBridgeChatStreamEvent)
    await lifecycle.waitForIdle()

    expect(observed).toEqual(['tool-call', 'error', 'finish', 'tool-progress'])
    expect(rejection).toEqual(new Error('Alicization chat stream failed.'))
  })

  it('uses a structured tool handoff timeout when an active tool never emits a terminal fact', async () => {
    vi.useFakeTimers()
    try {
      let rejection: unknown
      const lifecycle = createAlicizationChatStreamLifecycle({
        terminalToolHandoffTimeoutMs: 500,
        resolve: () => expect.fail('a failed stream must not resolve'),
        reject: (error) => {
          rejection = error
        },
      })

      lifecycle.publish({
        type: 'tool-call',
        toolCallId: 'codex-missing-terminal',
        toolName: 'codex',
        projection: {
          factType: 'tool-call',
          accepted: true,
          traceOnly: false,
          card: {
            toolCallId: 'codex-missing-terminal',
            toolName: 'codex',
            selectedChannel: 'codex',
            phase: 'started',
            terminal: false,
            revision: 1,
            elapsedMs: null,
            timeoutMs: null,
            errorCode: null,
            errorMessage: null,
            step: null,
            result: undefined,
          },
        },
        args: '{}',
        toolCallType: 'function',
      })
      lifecycle.publish({
        type: 'error',
        error: 'Alicization chat stream failed.',
      })
      lifecycle.rejectAfter([{
        type: 'finish',
        finishReason: 'provider-failed',
      } as AlicizationBridgeChatStreamEvent], new Error('Alicization chat stream failed.'))
      await lifecycle.waitForIdle()

      expect(rejection).toBeUndefined()

      await vi.advanceTimersByTimeAsync(500)

      expect(rejection).toMatchObject({
        failureSurface: expect.objectContaining({
          kind: 'timeout',
          timeout: expect.objectContaining({
            phase: 'tool-result-handoff',
            timeoutStage: 'tool-execution',
          }),
        }),
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('preserves an observed failure surface when rendering that error also fails', async () => {
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      toolExecution: {
        code: 'CODEX_TIMEOUT',
        message: 'Codex produced no semantic progress for 180000ms.',
        toolName: 'codex',
      },
    })
    let rejectSettlement!: (error: unknown) => void
    const settlement = new Promise<void>((_resolve, reject) => {
      rejectSettlement = reject
    })
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        if (event.type === 'error')
          throw new Error('renderer error delivery failed')
      },
      resolve: () => expect.fail('an observed failure must not resolve'),
      reject: rejectSettlement,
    })

    lifecycle.publish({
      type: 'error',
      error: failureSurface.reply,
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })
    lifecycle.resolveAfter([])

    await expect(settlement).rejects.toMatchObject({
      message: failureSurface.reply,
      failureSurface,
      toolExecution: failureSurface.toolExecution,
    })
  })

  it('keeps a main-projected trace-only progress event after an error notification', async () => {
    const observed: AlicizationBridgeChatStreamEvent[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event)
      },
      resolve: () => {},
      reject: () => {},
    })

    lifecycle.publish({
      type: 'error',
      error: 'Provider continuation failed.',
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'late-after-error',
      toolName: 'codex',
      phase: 'running',
      signal: 'liveness',
      elapsedMs: 120,
      projection: {
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
        card: {
          toolCallId: 'late-after-error',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'completed',
          terminal: true,
          revision: 2,
          elapsedMs: 100,
          timeoutMs: null,
          errorCode: null,
          errorMessage: null,
          step: null,
          result: undefined,
        },
      },
    } as AlicizationBridgeChatStreamEvent)

    await lifecycle.waitForIdle()

    expect(observed.map(event => event.type)).toEqual(['error', 'tool-progress'])
    expect(observed[1]).toMatchObject({
      type: 'tool-progress',
      projection: {
        accepted: false,
        traceOnly: true,
      },
    })
  })

  it('forwards canonical tool facts without owning tool lifecycle deduplication', async () => {
    const observed: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event.type)
      },
      resolve: () => {},
      reject: () => {},
    })
    const startedCard = {
      toolCallId: 'canonical-codex-1',
      toolName: 'executor_run_codex',
      selectedChannel: 'codex',
      phase: 'started',
      terminal: false,
      revision: 1,
      elapsedMs: null,
      timeoutMs: null,
      errorCode: null,
      errorMessage: null,
      step: null,
      result: undefined,
    } as const
    const completedCard = {
      ...startedCard,
      phase: 'completed',
      terminal: true,
      revision: 2,
      elapsedMs: 100,
      result: {
        status: 'completed',
      },
    } as const

    lifecycle.publish({
      type: 'tool-call',
      toolCallId: 'canonical-codex-1',
      toolName: 'executor_run_codex',
      selectedChannel: 'codex',
      projection: {
        factType: 'tool-call',
        accepted: true,
        traceOnly: false,
        card: startedCard,
      },
      args: '{}',
      toolCallType: 'function',
    })
    lifecycle.publish({
      type: 'tool-call',
      toolCallId: 'canonical-codex-1',
      toolName: 'executor_run_codex',
      selectedChannel: 'codex',
      projection: {
        factType: 'tool-call',
        accepted: false,
        traceOnly: true,
        card: startedCard,
      },
      args: '{}',
      toolCallType: 'function',
    })
    lifecycle.publish({
      type: 'tool-result',
      toolCallId: 'canonical-codex-1',
      toolName: 'executor_run_codex',
      selectedChannel: 'codex',
      projection: {
        factType: 'tool-result',
        accepted: true,
        traceOnly: false,
        card: completedCard,
      },
      result: {
        status: 'completed',
      },
    })
    lifecycle.publish({
      type: 'tool-result',
      toolCallId: 'canonical-codex-1',
      toolName: 'executor_run_codex',
      selectedChannel: 'codex',
      projection: {
        factType: 'tool-result',
        accepted: false,
        traceOnly: true,
        card: completedCard,
      },
      result: {
        status: 'completed',
      },
    })
    lifecycle.publish({
      type: 'error',
      error: 'Codex 失败。',
    })
    lifecycle.publish({
      type: 'error',
      error: '模型输出格式异常。',
    })

    await lifecycle.waitForIdle()

    expect(observed).toEqual([
      'tool-call',
      'tool-call',
      'tool-result',
      'tool-result',
      'error',
    ])
  })

  it('leaves dispatch and Eventa ingress deduplication to the routing boundary', async () => {
    const observed: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event.type)
      },
      resolve: () => {},
      reject: () => {},
    })
    const progress = {
      type: 'tool-progress',
      toolCallId: 'canonical-codex-progress-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'liveness',
      elapsedMs: 10_000,
      occurredAt: 100,
      eventId: 'codex-event-1',
      adapterEventType: 'heartbeat',
      itemType: 'command_execution',
      summary: 'Codex command still running: pnpm test',
    } as AlicizationBridgeChatStreamEvent

    lifecycle.publish(progress)
    lifecycle.publish({ ...progress })
    await lifecycle.waitForIdle()

    expect(observed).toEqual(['tool-progress', 'tool-progress'])
  })

  it('forwards late trace-only progress without owning terminal projection semantics', async () => {
    const observed: AlicizationBridgeChatStreamEvent[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event)
      },
      resolve: () => {},
      reject: () => {},
    })
    const terminalCard = {
      toolCallId: 'canonical-codex-terminal-1',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'completed',
      terminal: true,
      revision: 2,
      elapsedMs: 500,
      timeoutMs: null,
      errorCode: null,
      errorMessage: null,
      step: null,
      result: {
        status: 'completed',
      },
    } as const

    lifecycle.publish({
      type: 'tool-result',
      toolCallId: terminalCard.toolCallId,
      toolName: terminalCard.toolName,
      projection: {
        factType: 'tool-result',
        accepted: true,
        traceOnly: false,
        card: terminalCard,
      },
      result: terminalCard.result,
    })
    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: terminalCard.toolCallId,
      toolName: terminalCard.toolName,
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 800,
      eventId: 'late-progress',
      projection: {
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
        card: terminalCard,
      },
    })
    await lifecycle.waitForIdle()

    expect(observed).toEqual([
      expect.objectContaining({
        type: 'tool-result',
      }),
      expect.objectContaining({
        type: 'tool-progress',
        eventId: 'late-progress',
        projection: expect.objectContaining({
          accepted: false,
          traceOnly: true,
        }),
      }),
    ])
  })

  it('delivers terminal tool facts published after finish settlement is scheduled', async () => {
    const observed: AlicizationBridgeChatStreamEvent[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(event)
      },
      resolve: () => {},
      reject: () => {},
    })

    lifecycle.resolveAfter([{
      type: 'finish',
      finishReason: 'provider-finished',
    } as AlicizationBridgeChatStreamEvent])
    lifecycle.publish({
      type: 'tool-result',
      toolCallId: 'terminal-after-finish',
      toolName: 'codex',
      result: {
        status: 'completed',
      },
      projection: {
        factType: 'tool-result',
        accepted: false,
        traceOnly: true,
        card: {
          toolCallId: 'terminal-after-finish',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'completed',
          terminal: true,
          revision: 2,
          elapsedMs: 240,
          timeoutMs: null,
          errorCode: null,
          errorMessage: null,
          step: null,
          result: {
            status: 'completed',
          },
        },
      },
    } as AlicizationBridgeChatStreamEvent)

    await lifecycle.waitForIdle()

    expect(observed.map(event => event.type)).toEqual(['finish', 'tool-result'])
    expect(observed[1]).toMatchObject({
      type: 'tool-result',
      toolCallId: 'terminal-after-finish',
      projection: {
        traceOnly: true,
      },
    })
  })

  it('continues delivery but rejects settlement when tool event handling fails', async () => {
    const observedErrors: unknown[] = []
    const observedEvents: string[] = []
    let resolved = false
    let rejected: unknown
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observedEvents.push(event.type)
        if (event.type === 'tool-progress')
          throw new Error('renderer projection failed')
      },
      onDeliveryError: (error) => {
        observedErrors.push(error)
      },
      resolve: () => {
        resolved = true
      },
      reject: (error) => {
        rejected = error
      },
    })

    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'projection-failure',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 100,
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.resolveAfter([
      {
        type: 'finish',
        finishReason: 'stop',
      } as AlicizationBridgeChatStreamEvent,
    ])
    await lifecycle.waitForIdle()

    expect(observedEvents).toEqual(['tool-progress', 'finish'])
    expect(resolved).toBe(false)
    expect(rejected).toEqual(new Error('renderer projection failed'))
    expect(observedErrors[0]).toEqual(expect.any(Error))
  })

  it('rejects settlement even when tool event error auditing also fails', async () => {
    let resolved = false
    let rejected: unknown
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        if (event.type === 'tool-progress')
          throw new Error('renderer projection failed')
      },
      onDeliveryError: async () => {
        throw new Error('projection audit failed')
      },
      resolve: () => {
        resolved = true
      },
      reject: (error) => {
        rejected = error
      },
    })

    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'projection-audit-failure',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 100,
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.resolveAfter([])
    await lifecycle.waitForIdle()

    expect(resolved).toBe(false)
    expect(rejected).toEqual(new Error('renderer projection failed'))
  })

  it('preserves an observed Provider error over a later trace projection failure', async () => {
    let rejected: unknown
    const observedEvents: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observedEvents.push(event.type)
        if (event.type === 'tool-progress')
          throw new Error('renderer projection failed')
      },
      resolve: () => expect.fail('an errored lifecycle must not resolve'),
      reject: (error) => {
        rejected = error
      },
    })

    lifecycle.publish({
      type: 'error',
      error: 'Provider continuation failed.',
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'late-trace-after-provider-error',
      toolName: 'codex',
      phase: 'failed',
      signal: 'terminal',
      elapsedMs: 100,
      projection: {
        factType: 'tool-progress',
        accepted: false,
        traceOnly: true,
        card: {
          toolCallId: 'late-trace-after-provider-error',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'failed',
          terminal: true,
          revision: 2,
          elapsedMs: 100,
          timeoutMs: null,
          errorCode: 'PROVIDER_FAILED',
          errorMessage: 'Provider continuation failed.',
          step: null,
          result: undefined,
        },
      },
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.publish({
      type: 'tool-result',
      toolCallId: 'late-terminal-after-provider-error',
      toolName: 'codex',
      result: { status: 'failed', errorCode: 'CODEX_TIMEOUT' },
      projection: {
        factType: 'tool-result',
        accepted: true,
        traceOnly: false,
        card: {
          toolCallId: 'late-terminal-after-provider-error',
          toolName: 'codex',
          selectedChannel: 'codex',
          phase: 'failed',
          terminal: true,
          revision: 2,
          elapsedMs: 100,
          timeoutMs: 180_000,
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'provider timed out',
          step: null,
          result: { status: 'failed', errorCode: 'CODEX_TIMEOUT' },
        },
      },
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.resolveAfter([{
      type: 'finish',
      finishReason: 'provider-failed',
    } as AlicizationBridgeChatStreamEvent])
    await lifecycle.waitForIdle()

    expect(observedEvents).toContain('tool-result')
    expect(rejected).toEqual(new Error('Provider continuation failed.'))
  })

  it('retries an abort after start acceptance when the pre-registration abort missed the main run', async () => {
    const abort = vi.fn()
      .mockResolvedValueOnce({
        accepted: false,
        state: 'not-found',
      })
      .mockResolvedValueOnce({
        accepted: true,
        state: 'aborted',
      })
    const coordinator = createAlicizationChatStartAbortCoordinator(abort)

    await coordinator.requestAbort()
    await coordinator.reconcileAcceptedStart()

    expect(abort).toHaveBeenCalledTimes(2)
    expect(coordinator.isAbortRequested()).toBe(true)
    expect(coordinator.isAbortAccepted()).toBe(true)
  })

  it('returns and retains the real abort result from each coordinator attempt', async () => {
    const firstResult = {
      accepted: false,
      state: 'finished',
    } as const
    const secondResult = {
      accepted: true,
      state: 'aborted',
    } as const
    const abort = vi.fn()
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(secondResult)
    const coordinator = createAlicizationChatStartAbortCoordinator(abort)

    await expect(coordinator.requestAbort()).resolves.toEqual(firstResult)
    await expect(coordinator.reconcileAcceptedStart()).resolves.toEqual(secondResult)
    expect(coordinator.getLastAbortResult()).toEqual(secondResult)
  })

  it('represents a successful abort response that does not confirm cancellation as infrastructure failure', () => {
    const result = {
      accepted: false,
      state: 'not-found',
    } as const
    const error = new AlicizationChatAbortUnconfirmedError(result)

    expect(error).toEqual(expect.objectContaining({
      name: 'AlicizationChatAbortUnconfirmedError',
      code: 'ALICIZATION_CHAT_ABORT_UNCONFIRMED',
      state: 'not-found',
      message: expect.stringContaining('not-found'),
    }))
    expect(error.result).toEqual(result)
  })

  it('drains a superseded lifecycle before its pending entry can be replaced', async () => {
    let releaseEvent!: () => void
    const eventGate = new Promise<void>((resolve) => {
      releaseEvent = resolve
    })
    const observed: string[] = []
    const lifecycle = createAlicizationChatStreamLifecycle({
      onStreamEvent: async (event) => {
        observed.push(`${event.type}:start`)
        await eventGate
        observed.push(`${event.type}:end`)
      },
      resolve: () => {},
      reject: () => {},
    })

    lifecycle.publish({
      type: 'tool-progress',
      toolCallId: 'superseded-tool',
      toolName: 'codex',
      phase: 'completed',
      signal: 'terminal',
      elapsedMs: 100,
    } as AlicizationBridgeChatStreamEvent)
    lifecycle.rejectAfter([], new Error('superseded'))

    await vi.waitFor(() => {
      expect(observed).toEqual(['tool-progress:start'])
    })
    let drained = false
    const drain = lifecycle.waitForIdle().then(() => {
      drained = true
    })
    await Promise.resolve()
    expect(drained).toBe(false)

    releaseEvent()
    await drain

    expect(observed).toEqual([
      'tool-progress:start',
      'tool-progress:end',
    ])
  })

  it('retries an abort after start acceptance when the earlier abort only saw an old finished run', async () => {
    const abort = vi.fn()
      .mockResolvedValueOnce({
        accepted: false,
        state: 'finished',
      })
      .mockResolvedValueOnce({
        accepted: true,
        state: 'aborted',
      })
    const coordinator = createAlicizationChatStartAbortCoordinator(abort)

    await coordinator.requestAbort()
    await coordinator.reconcileAcceptedStart()

    expect(abort).toHaveBeenCalledTimes(2)
    expect(coordinator.isAbortAccepted()).toBe(true)
  })

  it('propagates abort transport failures instead of reporting a confirmed cancellation', async () => {
    const transportError = new Error('abort IPC unavailable')
    const coordinator = createAlicizationChatStartAbortCoordinator(
      vi.fn(async () => {
        throw transportError
      }),
    )

    await expect(coordinator.requestAbort()).rejects.toBe(transportError)
    expect(coordinator.isAbortRequested()).toBe(true)
    expect(coordinator.isAbortAccepted()).toBe(false)
  })
})

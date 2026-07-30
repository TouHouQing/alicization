import type { Message } from '@xsai/shared-chat'

import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mainChatBackgroundRunTestInternals,
  runAlicizationMainChatBackground,
} from './main-chat-background-run'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'

vi.mock('./main-chat-one-shot', () => ({
  generateAlicizationMainChatNonStreaming: vi.fn(),
}))

vi.mock('./main-chat-run-lifecycle', () => ({
  handleAlicizationMainChatRunFailure: vi.fn(),
}))

vi.mock('./main-chat-runtime-surface', () => ({
  extractAllowedToolNamesFromToolChoice: vi.fn((toolChoice: any, tools: any[] | undefined) => {
    const toolName = toolChoice?.function?.name
    if (typeof toolName === 'string' && toolName)
      return [toolName]
    return Array.isArray(tools)
      ? tools
          .map(tool => tool?.function?.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      : []
  }),
  extractCustomDirectivesFromMessages: vi.fn(() => ''),
  extractHostNameFromMessages: vi.fn(() => ''),
}))

vi.mock('./main-chat-stream-runner', () => ({
  runAlicizationMainChatStream: vi.fn(),
}))

vi.mock('./main-chat-stream-meta', async () => {
  const actual = await vi.importActual<typeof import('./main-chat-stream-meta')>('./main-chat-stream-meta')
  return {
    ...actual,
    createAlicizationChatStreamMetaEmitter: vi.fn(() => ({
      emit: vi.fn(),
      getLastReply: () => '',
    })),
    repairContinuitySourceTagsFromRuntimeDigest: vi.fn((input: any) => input.digitalLifeSpine ?? null),
  }
})

vi.mock('./runtime-soul', () => ({
  mainChatFirstEventTimeoutMs: 65_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  clamp01: (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)),
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeMultilineText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : fallback,
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  supportedDialogueStructuredFormats: ['mind-turn-v1', 'epoch1-v1'],
}))

function buildProviderReply(reply = 'Provider reply') {
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'current turn',
    emotion: 'thinking',
    reply,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: null,
      longTermEvidenceIds: [],
    },
  })
}

function buildObservedRealization(
  reply = 'Provider reply',
  mode: 'provider-stream' | 'provider-one-shot' = 'provider-stream',
) {
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: 'llm-mind',
    providerMindExecuted: true,
    mode,
    visibleText: reply,
    visibleReplyValidationStatus: 'approved',
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
  }
}

function createPrepared(overrides?: Partial<any>): any {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user' as const, content: '你好' },
    ] as Message[],
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      source: 'none',
      text: '',
    },
    hasVisualGrounding: false,
    governance: null,
    runtimeSurface: {
      trace: {
        decisionTraceId: 'trace-1',
        personaKernelMode: 'full',
        turnMode: 'answer',
      },
      replyExecutionPlan: {
        preferredMode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        reason: 'provider mainline',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
      },
    },
    getSessionTrace: () => ({
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    }),
    sessionTrace: {
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    },
    ...overrides,
  }
}

function createInput(
  userText = '你好',
  overrides?: Partial<Parameters<typeof runAlicizationMainChatBackground>[0]>,
): Parameters<typeof runAlicizationMainChatBackground>[0] {
  return {
    key: 'card-1::turn-1',
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: userText },
      ],
    },
    activeCardId: 'default',
    mainGateway: {
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: {
        authorization: 'Bearer test',
      },
      probeHeaders: {
        Authorization: 'Bearer test',
      },
      provider: {} as never,
    },
    runState: {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    },
    preparationPromise: Promise.resolve(createPrepared({
      messages: [
        { role: 'user' as const, content: userText },
      ],
    })),
    headers: {
      authorization: 'Bearer test',
    },
    isRunActive: () => true,
    runStateController: {
      setSessionTraceGetter: vi.fn(),
      finishRun: vi.fn(),
    },
    emitMeta: vi.fn(),
    emitChunk: vi.fn(),
    emitToolCall: vi.fn(),
    emitToolResult: vi.fn(),
    emitError: vi.fn(),
    incrementChunkStats: vi.fn(),
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof runAlicizationMainChatBackground>[0]
}

function createStreamResult(overrides?: Partial<any>): any {
  return {
    finishReason: 'stop',
    fullText: buildProviderReply(),
    origin: 'provider',
    learningPolicy: {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    },
    failureSurface: null,
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'provider-stream',
    },
    visibleReplyRealization: buildObservedRealization(),
    ...overrides,
  }
}

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult())
    vi.mocked(handleAlicizationMainChatRunFailure).mockResolvedValue(undefined)
  })

  it.each([
    ['greeting', '你好'],
    ['identity', '你是谁'],
    ['time', '现在几点了'],
    ['date', '今天几号'],
    ['dialogue', '今天有点累'],
    ['follow-up', '继续'],
  ])('routes %s turns through the single Provider stream', async (_lane, userText) => {
    const input = createInput(userText)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    expect(runAlicizationMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      payload: input.payload,
      prepared: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: userText }),
        ]),
      }),
    }))
    expect(generateAlicizationMainChatNonStreaming).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        finishReason: 'stop',
        origin: 'provider',
      }),
    )
  })

  it('does not dispatch execution-first before the Provider stream', async () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        action: {
          kind: 'execute',
        },
        tooling: {
          enforcedToolNames: ['executor_run_cli'],
        },
      },
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_cli',
          description: 'Run a CLI command.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      }],
      toolChoice: {
        type: 'function',
        function: {
          name: 'executor_run_cli',
        },
      },
    })
    const input = createInput('执行测试命令', {
      preparationPromise: Promise.resolve(prepared),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    expect(input.emitToolCall).not.toHaveBeenCalled()
    expect(input.emitToolResult).not.toHaveBeenCalled()
    expect(generateAlicizationMainChatNonStreaming).not.toHaveBeenCalled()
  })

  it('preserves Provider artifact metadata on completed finishes', async () => {
    const input = createInput()
    const streamResult = createStreamResult({
      visibleReplyRealization: {
        ...buildObservedRealization(),
        critic: {
          version: 'visible-reply-critic-public-summary-v1',
          status: 'pass',
          providerMindRequired: true,
          reasonCodes: ['settled'],
          ignored: 'legacy-governance-payload-ignored',
        },
        closure: {
          version: 'visible-reply-closure-public-summary-v1',
          status: 'approved',
          reasonCodes: ['complete'],
          initialCriticStatus: 'pass',
          finalCriticStatus: 'pass',
          ignored: 'legacy-governance-payload-ignored',
        },
      } as any,
    })
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(streamResult)

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload).toEqual(expect.objectContaining({
      status: 'completed',
      origin: 'provider',
      learningPolicy: streamResult.learningPolicy,
      failureSurface: null,
    }))
    expect(finishPayload?.visibleReplyRealization?.critic).toEqual({
      version: 'visible-reply-critic-public-summary-v1',
      status: 'pass',
      providerMindRequired: true,
      reasonCodes: ['settled'],
    })
    expect(finishPayload?.visibleReplyRealization?.closure).toEqual({
      version: 'visible-reply-closure-public-summary-v1',
      status: 'approved',
      reasonCodes: ['complete'],
      initialCriticStatus: 'pass',
      finalCriticStatus: 'pass',
    })
  })

  it('finishes with the raw six-field Provider JSON and a separate realization sidecar', async () => {
    const rawFullText = `{
  "memoryUsage": {
    "workingMemoryVersion": null,
    "longTermEvidenceIds": []
  },
  "performance": {
    "baseEmotion": "thinking",
    "facialCue": null,
    "actionCue": null,
    "delivery": "firm",
    "emphasis": 1
  },
  "reply": "Provider raw reply",
  "emotion": "thinking",
  "thought": "preserve background bytes",
  "format": "mind-turn-v1"
}`
    const visibleReplyRealization = buildObservedRealization('Provider raw reply')
    const input = createInput()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: rawFullText,
      visibleReplyRealization,
    }))

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload?.fullText).toBe(rawFullText)
    expect(finishPayload?.visibleReplyRealization).toMatchObject(visibleReplyRealization)
    expect(finishPayload?.visibleReplyRealization).not.toHaveProperty('projectStateAudit')
    expect(finishPayload?.visibleReplyRealization).not.toHaveProperty('projectStateEvidenceStatus')
    expect(Object.keys(JSON.parse(String(finishPayload?.fullText)))).toEqual([
      'memoryUsage',
      'performance',
      'reply',
      'emotion',
      'thought',
      'format',
    ])
    expect(JSON.parse(String(finishPayload?.fullText))).not.toHaveProperty('visibleReplyRealization')
  })

  it('does not rehydrate plain stream text into a successful Provider artifact', async () => {
    const input = createInput()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: 'Provider returned plain text instead of the required JSON contract.',
    }))

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    expect(failureInput?.error).toEqual(expect.objectContaining({
      message: 'provider-settlement-invalid:provider-payload-json-invalid',
    }))
    expect(input.runStateController.finishRun).not.toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
        origin: 'provider',
      }),
    )
  })

  it('keeps memory side failures outside the native Provider JSON', async () => {
    const input = createInput('继续记忆任务', {
      preparationPromise: Promise.resolve(createPrepared({
        memoryFailures: [{
          kind: 'recall-failure',
          reply: 'Long-term memory recall failed for this turn.',
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
          cardId: 'card-1',
          turnId: 'turn-1',
          occurredAt: 10,
          errorSummary: 'recall offline',
        }],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    const structured = JSON.parse(String(finishPayload?.fullText ?? '{}'))
    expect(structured.reply).toBe('Provider reply')
    expect(structured).not.toHaveProperty('memoryFailures')
    expect(finishPayload?.memoryFailures).toEqual([
      expect.objectContaining({
        kind: 'recall-failure',
        stage: 'long-term-memory-recall',
        errorSummary: 'recall offline',
      }),
    ])
  })

  it('surfaces a missing required tool without local execution or a second Provider call', async () => {
    const prepared = createPrepared({
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_cli',
          description: 'Run a CLI command.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      }],
      toolChoice: {
        type: 'function',
        function: {
          name: 'executor_run_cli',
        },
      },
    })
    const input = createInput('执行测试命令', {
      preparationPromise: Promise.resolve(prepared),
    })
    const error = new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    })
    vi.mocked(runAlicizationMainChatStream).mockRejectedValueOnce(error)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0].error).toBe(error)
    expect(generateAlicizationMainChatNonStreaming).not.toHaveBeenCalled()
    expect(input.emitToolCall).not.toHaveBeenCalled()
    expect(input.emitToolResult).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).not.toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
      }),
    )
  })

  it('does not retain Provider JSON shaping helpers in the background success path', () => {
    const source = readFileSync(new URL('./main-chat-background-run.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('ensureStructuredProjectStateHostVisibleClosure')
    expect(source).not.toContain('ensureStructuredVisibleReplyProjectStateAudit')
    expect(source).not.toContain('normalizeTopLevelProjectStateAwarenessFromRealization')
  })

  it('does not rebuild project governance or legacy cues into the runtime digest fallback', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        digitalLifeRuntimeSurface: {
          dialogue: {
            currentConsciousFrame: {
              projectState: {
                identity: 'project-state identity',
                currentPhase: 'project-state phase',
                continuityCue: 'continuityCue=legacy',
              },
              reasonTags: ['reasonTags=legacy'],
              focusAnchor: '真实的当前对话焦点',
            },
          },
          memory: {
            emotionalKernel: {
              version: 'emotional-kernel-v1',
              dominantEmotion: 'calm',
              initiativeMode: 'responsive',
              memoryRecallMode: 'working-and-long-term',
              embodimentTone: 'steady',
            },
          },
        },
      },
    })

    const digest = mainChatBackgroundRunTestInternals.buildPreparedRuntimeDigestFallback(prepared)

    expect(digest?.projectState).toBeNull()
    expect(digest?.currentConsciousFrame).toBeNull()
    expect(JSON.stringify(digest)).not.toMatch(
      /project-state identity|project-state phase|continuityCue|reasonTags|reasonCodes|opening_policy|relationship_cadence|governingFocus|mustDo|mustNotDo/iu,
    )
  })

  it('delegates failures without installing timeout reply recovery callbacks', async () => {
    const error = new DOMException('chat-first-event-timeout', 'AbortError')
    const input = createInput()
    vi.mocked(runAlicizationMainChatStream).mockRejectedValueOnce(error)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(failureInput.error).toBe(error)
    expect(failureInput).not.toHaveProperty('recoverFromTimeout')
    expect(failureInput).not.toHaveProperty('emitRecoveredText')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMode')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMs')
  })
})

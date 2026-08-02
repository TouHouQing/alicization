import { readFileSync } from 'node:fs'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAlicizationMainGatewayOneShotRuntime } from './runtime-main-gateway-one-shot'

vi.mock('@xsai/generate-text', () => ({
  generateText: vi.fn(),
}))

type OneShotRuntimeOptions = Parameters<typeof createAlicizationMainGatewayOneShotRuntime>[0]
type OneShotResolvedConfig = NonNullable<ReturnType<OneShotRuntimeOptions['resolveMainGatewayConfig']>>
type OneShotCaptureAccess = Awaited<ReturnType<OneShotRuntimeOptions['resolveDesktopCaptureAccess']>>

function createEmptyPerceptionState() {
  return {
    attentionAnchor: null,
    lastNonSelfForegroundTarget: null,
    recentObservations: [],
    invitedInspection: null,
    recentSceneResidue: null,
    updatedAt: 0,
  } as any
}

function createResolvedMainGatewayConfig(): OneShotResolvedConfig {
  return {
    providerId: 'provider-test',
    model: 'model-test',
    baseUrl: 'https://example.test/v1/',
    provider: {
      chat: vi.fn(() => ({})),
    } as any,
    headers: {},
  }
}

function createOneShotRuntimeHarness(overrides?: Partial<OneShotRuntimeOptions>) {
  const appendRuntimeDebugLine = vi.fn(async () => {})
  const appendAuditLog = vi.fn(async () => {})
  const resolveMainGatewayConfig = vi.fn<OneShotRuntimeOptions['resolveMainGatewayConfig']>(
    () => createResolvedMainGatewayConfig(),
  )

  const runtime = createAlicizationMainGatewayOneShotRuntime({
    getActiveCardId: () => 'card-test',
    getActiveProviderId: () => 'provider-test',
    getActiveModelId: () => 'model-test',
    openAgentTurn: vi.fn(),
    resolveMainGatewayConfig,
    rememberMainGatewayRoute: vi.fn(),
    appendRuntimeDebugLine,
    resolveCardCustomDirectives: vi.fn(async () => ({ text: '', source: 'none' as const })),
    buildPendingExecutionCallbackContext: vi.fn(async () => ({
      actions: [],
      callbacks: [],
      continuitySignals: [],
      recallText: '',
      systemBlock: '',
    })),
    resolveAgentSessionContinuityContext: vi.fn(async (_cardId, options) => ({
      digitalLifeRuntimeSurface: options.digitalLifeRuntimeSurface,
      sessionContinuitySignals: [],
    })),
    getPerformanceManifest: vi.fn(async () => null),
    syncAgentTurnSessionMirror: vi.fn(),
    appendAuditLog,
    describePerceptionTarget: vi.fn(() => 'target'),
    buildMainGatewayAgentTurnId: vi.fn(() => 'turn-test'),
    screenSemanticCacheByCard: new Map(),
    ensurePerceptionState: vi.fn(async () => createEmptyPerceptionState()),
    getUsablePerceptionSceneResidue: vi.fn(() => null),
    buildScreenSemanticSummaryFromResidue: vi.fn(),
    clearDesktopCaptureAccessCache: vi.fn(),
    resolveDesktopCaptureAccess: vi.fn(async (): Promise<OneShotCaptureAccess> => ({
      sources: [],
      unavailableReason: 'unavailable',
      probeError: undefined,
    })),
    getDesktopCaptureAccessRuntimeSnapshot: vi.fn(() => null),
    rememberSceneResidue: vi.fn(async () => createEmptyPerceptionState()),
    ...overrides,
  })

  return {
    runtime,
    appendRuntimeDebugLine,
    appendAuditLog,
    resolveMainGatewayConfig,
  }
}

beforeEach(() => {
  vi.mocked(generateText).mockReset()
})

describe('runtime main gateway one-shot', () => {
  it('does not maintain a retired one-shot structured-key denylist', () => {
    const source = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('retiredOneShotStructuredKeys')
  })

  it('drops generic structured residue from typed system blocks without rewriting user text', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'ok',
    } as any)

    const structuredResidue = 'mode=internal; visibility=hidden'
    const userMessageText = `用户原文提到了 ${structuredResidue} 这段待删配置字段，不应被改写。`

    await runtime.generateMainGatewayText({
      system: [
        'Return the requested structured result.',
        structuredResidue,
      ].join('\n'),
      user: userMessageText,
      source: 'scene-appraisal',
      cardId: 'card-structured-residue',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: [
        JSON.stringify({
          type: 'alicization-turn-memory-context',
          data: {
            visible: 'keep this fact',
            internalResidue: structuredResidue,
          },
        }),
      ],
    })

    const messages = vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? []
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => typeof message.content === 'string' ? message.content : '')
      .join('\n')
    const userText = messages
      .filter(message => message.role === 'user')
      .map(message => typeof message.content === 'string' ? message.content : '')
      .join('\n')

    expect(systemText).not.toContain('Return the requested structured result.')
    expect(systemText).toContain('keep this fact')
    expect(systemText).not.toContain(structuredResidue)
    expect(userText).toContain(structuredResidue)
  })

  it('preserves natural-language typed fact values that discuss key-value settings', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'ok',
    } as any)
    const naturalSettingDiscussion = 'The user quoted mode=balanced while reviewing a provider setting.'

    await runtime.generateMainGatewayText({
      system: 'Return the structured result.',
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-typed-structured-residue',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: [
        JSON.stringify({
          type: 'alicization-turn-memory-context',
          data: {
            workingMemoryVersion: 'working-memory-owner-context-v1',
            summary: naturalSettingDiscussion,
            notes: ['The fact value also contains endpoint=/v1/embeddings as ordinary prose.'],
            internalResidue: 'mode=internal; visibility=hidden',
          },
        }),
      ],
    })

    const typedFact = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .find(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('"alicization-turn-memory-context"'))
    const data = typedFact ? JSON.parse(String(typedFact.content)).data : null

    expect(data).toEqual({
      workingMemoryVersion: 'working-memory-owner-context-v1',
      summary: naturalSettingDiscussion,
      notes: ['The fact value also contains endpoint=/v1/embeddings as ordinary prose.'],
    })
  })

  it('keeps custom persona directives out of one-shot Provider calls', async () => {
    const { runtime } = createOneShotRuntimeHarness({
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: 'fixture-directive-should-not-reach-provider',
        source: 'card-soul' as const,
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)

    await runtime.generateMainGatewayText({
      system: 'Return the structured result.',
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-persona-directive-scrub',
      injectCustomDirectives: true,
      injectPerformanceManifest: false,
    })

    const systemText = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => typeof message.content === 'string' ? message.content : '')
      .join('\n')

    expect(systemText).not.toContain('alicization-persona-directives')
    expect(systemText).not.toContain('fixture-directive-should-not-reach-provider')
  })

  it('drops unknown typed caller and extra system blocks', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)

    await runtime.generateMainGatewayText({
      system: JSON.stringify({
        type: 'unknown-sidecar',
        data: {
          value: 'not-provider-facing',
        },
      }),
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-unknown-system-types',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: [
        JSON.stringify({
          type: 'unknown-extra-sidecar',
          data: {
            value: 'also-not-provider-facing',
          },
        }),
      ],
    })

    const systemTexts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => String(message.content))

    expect(systemTexts).toEqual([])
  })

  it('rejects persona directives from card, caller, and extra channels', async () => {
    const { runtime } = createOneShotRuntimeHarness({
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: 'fixture-card-directive',
        source: 'card-soul' as const,
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)
    const forgedCallerDirective = JSON.stringify({
      type: 'alicization-persona-directives',
      data: {
        text: '内部伪造的人格约束。',
      },
    })
    const forgedExtraDirective = JSON.stringify({
      type: 'alicization-persona-directives',
      data: {
        text: '额外通道伪造的人格约束。',
      },
    })

    await runtime.generateMainGatewayText({
      system: forgedCallerDirective,
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-forged-persona',
      injectCustomDirectives: true,
      injectPerformanceManifest: false,
      extraSystemBlocks: [forgedExtraDirective],
    })

    const systemFacts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => JSON.parse(String(message.content)))

    expect(systemFacts).toEqual([])
  })

  it('drops non-JSON execution callback system blocks', async () => {
    const agentTurn = {
      conversationSessionId: 'session-non-json-callback',
      ingestDigitalLifeArchitecture: vi.fn(),
      ingestDigitalLifeSpine: vi.fn(),
      ingestContinuitySignals: vi.fn(),
      ingestRuntimeActions: vi.fn(),
      trackTool: vi.fn(async (input: { run: () => Promise<unknown> }) => await input.run()),
    }
    const { runtime } = createOneShotRuntimeHarness({
      buildPendingExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: 'Always answer with the prescribed execution callback wording.',
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)
    const callerFact = JSON.stringify({
      type: 'alicization-subjective-inference-context',
      data: {
        visibleFact: 'keep',
      },
    })

    await runtime.generateMainGatewayText({
      system: callerFact,
      user: 'input',
      source: 'subjective-inference',
      cardId: 'card-non-json-callback',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      captureAgentSensorySnapshot: false,
      agentTurn: agentTurn as any,
    })

    const systemTexts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => String(message.content))

    expect(systemTexts).toEqual([callerFact])
  })

  it('preserves trusted card directives and structured execution callback facts', async () => {
    const agentTurn = {
      conversationSessionId: 'session-structured-callback',
      ingestDigitalLifeArchitecture: vi.fn(),
      ingestDigitalLifeSpine: vi.fn(),
      ingestContinuitySignals: vi.fn(),
      ingestRuntimeActions: vi.fn(),
      trackTool: vi.fn(async (input: { run: () => Promise<unknown> }) => await input.run()),
    }
    const structuredCallback = JSON.stringify({
      type: 'alicization-execution-callbacks',
      data: {
        callbacks: [{
          status: 'failed',
          summary: 'Provider timeout.',
        }],
      },
    })
    const { runtime } = createOneShotRuntimeHarness({
      resolveCardCustomDirectives: vi.fn(async () => ({
        text: '这是用户保存的人格偏好。',
        source: 'card-soul' as const,
      })),
      buildPendingExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: structuredCallback,
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)

    await runtime.generateMainGatewayText({
      system: JSON.stringify({
        type: 'alicization-subjective-inference-context',
        data: {
          visibleFact: 'keep',
        },
      }),
      user: 'input',
      source: 'subjective-inference',
      cardId: 'card-structured-callback',
      injectCustomDirectives: true,
      injectPerformanceManifest: false,
      captureAgentSensorySnapshot: false,
      agentTurn: agentTurn as any,
    })

    const systemFacts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => JSON.parse(String(message.content)))

    expect(systemFacts.map(fact => fact.type)).toEqual([
      'alicization-execution-callbacks',
      'alicization-subjective-inference-context',
    ])
    expect(systemFacts[0]).toEqual(JSON.parse(structuredCallback))
  })

  it('preserves user-origin text and failure facts inside caller and callback JSON', async () => {
    const structuredResidue = 'mode=internal; visibility=hidden'
    const userTurn = `用户正在讨论 ${structuredResidue} 这段待删配置字段。`
    const agentTurn = {
      conversationSessionId: 'session-one-shot',
      ingestDigitalLifeArchitecture: vi.fn(),
      ingestDigitalLifeSpine: vi.fn(),
      ingestContinuitySignals: vi.fn(),
      ingestRuntimeActions: vi.fn(),
      trackTool: vi.fn(async (input: { run: () => Promise<unknown> }) => await input.run()),
    }
    const { runtime } = createOneShotRuntimeHarness({
      buildPendingExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: '',
        systemBlock: JSON.stringify({
          type: 'alicization-execution-callbacks',
          data: {
            status: 'failed',
            summary: `${structuredResidue}; Provider timeout.`,
            internalResidue: structuredResidue,
          },
        }),
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'ok',
    } as any)

    await runtime.generateMainGatewayText({
      system: JSON.stringify({
        type: 'alicization-subjective-inference-context',
        data: {
          userTurn,
          task: 'Keep the useful request.',
          internalResidue: structuredResidue,
        },
      }),
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-json-system-scrub',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      captureAgentSensorySnapshot: false,
      agentTurn: agentTurn as any,
    })

    const systemFacts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system' && typeof message.content === 'string')
      .map(message => JSON.parse(String(message.content)))
    const callbackFact = systemFacts.find(fact => fact.type === 'alicization-execution-callbacks')
    const callerFact = systemFacts.find(fact => fact.type === 'alicization-subjective-inference-context')

    expect(callerFact?.data.userTurn).toBe(userTurn)
    expect(callerFact?.data.task).toBe('Keep the useful request.')
    expect(callerFact?.data).not.toHaveProperty('internalResidue')
    expect(callbackFact?.data.status).toBe('failed')
    expect(callbackFact?.data.summary).toBe(`${structuredResidue}; Provider timeout.`)
    expect(callbackFact?.data).not.toHaveProperty('internalResidue')
  })

  it('drops caller-owned natural-language system context', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'Provider 原始回答。',
    } as any)

    const result = await runtime.generateMainGatewayText({
      system: 'Classify the current input.',
      user: 'input',
      source: 'scene-appraisal',
      cardId: 'card-no-project-template',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
    })

    expect(result).toBe('Provider 原始回答。')

    const messages = vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? []
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => typeof message.content === 'string' ? message.content : '')
      .join('\n')

    expect(systemText).toBe('')
  })

  it('forwards a caller-owned native response format to the Provider', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '{"format":"mind-turn-v1"}',
    } as any)

    await runtime.generateMainGatewayText({
      system: JSON.stringify({
        type: 'alicization-proactive-turn-context',
        data: {},
      }),
      user: JSON.stringify({
        type: 'alicization-proactive-generation-request',
        data: {},
      }),
      source: 'proactive',
      cardId: 'card-native-schema',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      responseFormat: alicizationProviderResponseFormat,
    })

    expect(vi.mocked(generateText)).toHaveBeenCalledWith(expect.objectContaining({
      responseFormat: alicizationProviderResponseFormat,
    }))
  })

  it('uses typed multimodal facts and a native schema for screen semantics', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: JSON.stringify({
        workload: 'coding',
        content: 'diff',
        summary: 'TypeScript diff in runtime main gateway',
        confidence: 0.91,
        matchedLabels: ['typescript', 'diff'],
      }),
    } as any)

    const result = await runtime.generateScreenSemanticSummaryFromImage({
      cardId: 'card-screen-semantic-contract',
      now: 123_000,
      imageDataUrl: 'data:image/jpeg;base64,screen',
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-main-gateway-one-shot.ts',
      },
      source: {
        id: 'source-screen-semantic-contract',
        name: 'Visual Studio Code',
        strategy: 'window-title',
      },
      focusTarget: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'runtime-main-gateway-one-shot.ts',
        source: 'foreground-window',
      },
    })

    expect(result.summary?.workload.kind).toBe('coding')
    const call = vi.mocked(generateText).mock.calls[0]?.[0]
    const responseFormat = call?.responseFormat as { json_schema?: { name?: string } } | undefined
    expect(responseFormat?.json_schema?.name).toBe('alicization_screen_semantic_summary')
    const messages = call?.messages ?? []
    const system = messages.find(message => message.role === 'system')
    const user = messages.find(message => message.role === 'user')
    expect(JSON.parse(String(system?.content)).type).toBe('alicization-screen-semantic-context')
    expect(Array.isArray(user?.content)).toBe(true)
    const userParts = user?.content as Array<{ type?: string, text?: string }>
    expect(JSON.parse(userParts.find(part => part.type === 'text')?.text ?? '{}').type)
      .toBe('alicization-screen-semantic-request')
    expect(userParts.some(part => part.type === 'image_url')).toBe(true)
    expect(JSON.stringify(messages)).not.toMatch(
      /Classify this screen snapshot|Prefer what is visibly on the screen|Output valid JSON only with keys|must be one of|Do not mention emotions or advice/u,
    )
  })

  it('keeps only typed extra system facts', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    const memoryFact = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-1'],
      },
    })
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '{"workload":"coding"}',
    } as any)

    await runtime.generateMainGatewayText({
      system: 'Return JSON.',
      user: 'input',
      source: 'screen-semantic',
      cardId: 'card-memory-fact',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: [
        'Always answer in a prescribed continuity voice.',
        memoryFact,
      ],
    })

    const messages = vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? []
    const systemTexts = messages
      .filter(message => message.role === 'system')
      .map(message => typeof message.content === 'string' ? message.content : '')

    expect(systemTexts).toEqual([memoryFact])
  })

  it('returns cached screen semantic grounding with its focus target', async () => {
    const { runtime } = createOneShotRuntimeHarness({
      ensurePerceptionState: vi.fn(async () => ({
        ...createEmptyPerceptionState(),
        invitedInspection: {
          requestedAt: 100,
          activeUntil: 5_000,
          hintText: '看看现在屏幕上是什么',
        },
      })) as any,
      getUsablePerceptionSceneResidue: vi.fn(() => ({
        observedAt: 120,
        source: 'invited-inspection',
        workloadKind: 'browser',
        contentKind: 'doc',
        summary: 'Browser page',
        confidence: 0.88,
        focusTarget: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization',
        },
        focusSource: 'foreground-window',
        captureSourceName: 'Google Chrome',
        captureStrategy: 'window-title',
      })) as any,
      buildScreenSemanticSummaryFromResidue: vi.fn(() => ({
        workload: {
          kind: 'browser',
          confidence: 0.88,
          matchedLabels: ['foreground-window'],
        },
        content: {
          kind: 'doc',
          confidence: 0.88,
          matchedLabels: ['foreground-window'],
          summary: 'Browser page',
        },
        analyzedAt: 120,
        source: {
          id: 'scene-residue:invited-inspection',
          name: 'Google Chrome',
          strategy: 'window-title',
        },
      })) as any,
    })

    const grounded = await runtime.resolveProactiveScreenSemanticSummary({
      cardId: 'card-test',
      now: 1234,
      foregroundWindow: {
        appName: 'Google Chrome',
        processName: 'Google Chrome',
        title: 'Alicization',
      },
    })

    expect(grounded.focusTarget).toEqual(expect.objectContaining({
      appName: 'Google Chrome',
      title: 'Alicization',
    }))
    expect(grounded.summary?.workload.kind).toBe('browser')
    expect(grounded.unavailableReason).toBeUndefined()
  })

  it('compacts oversized one-shot context while preserving typed caller facts and user message', async () => {
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'ok',
    } as any)

    const oversizedFacts = Array.from({ length: 48 }, (_, index) => JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        index,
        text: 'x'.repeat(3_000),
      },
    }))

    const callerFact = JSON.stringify({
      type: 'alicization-subjective-inference-context',
      data: {
        caller: 'Keep this typed system fact.',
      },
    })

    await runtime.generateMainGatewayText({
      system: callerFact,
      user: 'Keep this user message.',
      source: 'screen-semantic',
      cardId: 'card-compaction',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      extraSystemBlocks: oversizedFacts,
    })

    const messages = vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? []
    expect(messages.at(-2)).toEqual({
      role: 'system',
      content: callerFact,
    })
    expect(messages.at(-1)).toEqual({
      role: 'user',
      content: 'Keep this user message.',
    })
    expect(JSON.stringify(messages).length).toBeLessThan(80_000)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-prompt-compacted',
      expect.objectContaining({
        cardId: 'card-compaction',
        beforeChars: expect.any(Number),
        afterChars: expect.any(Number),
      }),
    )
  })

  it('reports Provider failure through diagnostics instead of fabricating a reply', async () => {
    const { runtime, appendRuntimeDebugLine, appendAuditLog } = createOneShotRuntimeHarness()
    const onFailure = vi.fn()
    vi.mocked(generateText).mockRejectedValueOnce(new Error('provider exploded'))

    const result = await runtime.generateMainGatewayText({
      system: 'Return JSON.',
      user: 'input',
      source: 'screen-semantic',
      cardId: 'card-provider-error',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      onFailure,
    })

    expect(result).toBeNull()
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith({
      reason: 'provider exploded',
      providerId: 'provider-test',
      model: 'model-test',
      source: 'screen-semantic',
    })
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-failed',
      expect.objectContaining({
        cardId: 'card-provider-error',
        reason: 'provider exploded',
      }),
    )
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'one-shot-failed',
      payload: expect.objectContaining({
        reason: 'provider exploded',
      }),
    }))
  })

  it('reports a one-shot timeout exactly once through the failure callback', async () => {
    vi.useFakeTimers()
    try {
      const { runtime } = createOneShotRuntimeHarness()
      const onFailure = vi.fn()
      vi.mocked(generateText).mockImplementationOnce(async (input: any) => await new Promise((_, reject) => {
        input.abortSignal.addEventListener('abort', () => reject(input.abortSignal.reason), { once: true })
      }))

      const resultPromise = runtime.generateMainGatewayText({
        system: 'Return JSON.',
        user: 'input',
        source: 'proactive',
        cardId: 'card-timeout',
        timeoutMs: 1_000,
        injectCustomDirectives: false,
        injectPerformanceManifest: false,
        onFailure,
      })
      await vi.advanceTimersByTimeAsync(1_000)

      await expect(resultPromise).resolves.toBeNull()
      expect(onFailure).toHaveBeenCalledTimes(1)
      expect(onFailure).toHaveBeenCalledWith({
        reason: 'Alicization runtime aborted: main-gateway-timeout',
        providerId: 'provider-test',
        model: 'model-test',
        source: 'proactive',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('reports missing Provider configuration through the failure callback', async () => {
    const { runtime } = createOneShotRuntimeHarness({
      resolveMainGatewayConfig: vi.fn(() => null),
    })
    const onFailure = vi.fn()

    const result = await runtime.generateMainGatewayText({
      system: 'Return JSON.',
      user: 'input',
      source: 'proactive',
      cardId: 'card-missing-config',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      onFailure,
    })

    expect(result).toBeNull()
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith({
      reason: 'Main gateway Provider configuration is unavailable.',
      providerId: 'provider-test',
      model: 'model-test',
      source: 'proactive',
    })
    expect(generateText).not.toHaveBeenCalled()
  })

  it('reports an empty Provider response through the failure callback', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    const onFailure = vi.fn()
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '   ',
    } as any)

    const result = await runtime.generateMainGatewayText({
      system: 'Return JSON.',
      user: 'input',
      source: 'proactive',
      cardId: 'card-empty-response',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      onFailure,
    })

    expect(result).toBeNull()
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith({
      reason: 'Provider returned an empty response.',
      providerId: 'provider-test',
      model: 'model-test',
      source: 'proactive',
    })
  })
})

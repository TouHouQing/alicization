import { readFileSync } from 'node:fs'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAlicizationMainGatewayWorkCoordinator } from './main-gateway-work-coordinator'
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

  it('does not start a background one-shot while foreground chat owns the provider', async () => {
    const acquireOneShot = vi.fn(() => ({
      accepted: false as const,
      lane: 'background' as const,
      reason: 'foreground-active' as const,
    }))
    const onFailure = vi.fn()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness({
      providerWorkCoordinator: {
        acquireOneShot,
      },
    } as any)
    vi.mocked(generateText).mockResolvedValueOnce({
      text: 'background response should not run',
    } as any)

    const result = await runtime.generateMainGatewayText({
      system: 'background context',
      user: 'background request',
      source: 'proactive',
      onFailure,
    })

    expect(result).toBeNull()
    expect(acquireOneShot).toHaveBeenCalledWith({
      source: 'proactive',
    })
    expect(generateText).not.toHaveBeenCalled()
    expect(onFailure).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-deferred',
      expect.objectContaining({
        source: 'proactive',
        lane: 'background',
        reason: 'foreground-active',
      }),
    )
  })

  it('reports coordinator deferral as the real live memory trial failure', async () => {
    const acquireOneShot = vi.fn(() => ({
      accepted: false as const,
      lane: 'background' as const,
      reason: 'foreground-active' as const,
      retryAfterMs: 250,
    }))
    const onFailure = vi.fn()
    const { runtime } = createOneShotRuntimeHarness({
      providerWorkCoordinator: {
        acquireOneShot,
      },
    } as any)

    await expect(runtime.generateMainGatewayText({
      system: '',
      user: '运行真实记忆试用',
      source: 'memory-quality-trial',
      onFailure,
    })).resolves.toBeNull()

    expect(generateText).not.toHaveBeenCalled()
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      source: 'memory-quality-trial',
      reason: expect.stringContaining('foreground-active'),
    }))
  })

  it('reports foreground preemption as the real live memory trial failure', async () => {
    const providerWorkCoordinator = createAlicizationMainGatewayWorkCoordinator()
    const onFailure = vi.fn()
    const { runtime } = createOneShotRuntimeHarness({
      providerWorkCoordinator,
    })
    let providerAbortSignal: AbortSignal | undefined
    vi.mocked(generateText).mockImplementationOnce(async (input: any) => {
      providerAbortSignal = input.abortSignal
      return await new Promise((_resolve, reject) => {
        input.abortSignal.addEventListener('abort', () => reject(input.abortSignal.reason), {
          once: true,
        })
      })
    })

    const trial = runtime.generateMainGatewayText({
      system: '',
      user: '运行真实记忆试用',
      source: 'memory-quality-trial',
      onFailure,
    })
    await vi.waitFor(() => expect(providerAbortSignal).toBeDefined())

    const foreground = providerWorkCoordinator.openForeground({
      turnId: 'turn-user-chat',
    })
    await expect(trial).resolves.toBeNull()
    foreground.release()

    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      source: 'memory-quality-trial',
      reason: 'main-gateway-preempted-by-foreground-chat',
    }))
  })

  it('preempts an in-flight background one-shot without reporting a Provider failure', async () => {
    const providerWorkCoordinator = createAlicizationMainGatewayWorkCoordinator()
    const onFailure = vi.fn()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness({
      providerWorkCoordinator,
    })
    let providerAbortSignal: AbortSignal | undefined
    vi.mocked(generateText).mockImplementationOnce(async (input: any) => {
      providerAbortSignal = input.abortSignal
      return await new Promise((_resolve, reject) => {
        input.abortSignal.addEventListener('abort', () => reject(input.abortSignal.reason), {
          once: true,
        })
      })
    })

    const backgroundPromise = runtime.generateMainGatewayText({
      system: 'background context',
      user: 'background request',
      source: 'proactive',
      onFailure,
    })
    await vi.waitFor(() => {
      expect(providerAbortSignal).toBeDefined()
    })

    const foreground = providerWorkCoordinator.openForeground({
      turnId: 'turn-user-chat',
    })
    const result = await backgroundPromise
    foreground.release()

    expect(result).toBeNull()
    expect(providerAbortSignal?.aborted).toBe(true)
    expect(onFailure).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-preempted',
      expect.objectContaining({
        source: 'proactive',
        lane: 'background',
        reason: 'main-gateway-preempted-by-foreground-chat',
      }),
    )
  })

  it('settles a preempted background one-shot even when the Provider ignores abort and discards its late result', async () => {
    const providerWorkCoordinator = createAlicizationMainGatewayWorkCoordinator()
    const onFailure = vi.fn()
    const rememberMainGatewayRoute = vi.fn()
    const syncAgentTurnSessionMirror = vi.fn()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness({
      providerWorkCoordinator,
      rememberMainGatewayRoute,
      syncAgentTurnSessionMirror,
    })
    let resolveProvider!: (value: { text: string }) => void
    let providerAbortSignal: AbortSignal | undefined
    vi.mocked(generateText).mockImplementationOnce(async (input: any) => {
      providerAbortSignal = input.abortSignal
      return await new Promise<any>((resolve) => {
        resolveProvider = resolve
      })
    })

    const backgroundPromise = runtime.generateMainGatewayText({
      system: 'background context',
      user: 'background request',
      source: 'proactive',
      onFailure,
    })
    await vi.waitFor(() => {
      expect(providerAbortSignal).toBeDefined()
    })

    const foreground = providerWorkCoordinator.openForeground({
      turnId: 'turn-user-chat-provider-ignores-abort',
    })
    await expect(Promise.race([
      backgroundPromise,
      new Promise(resolve => setTimeout(() => resolve('still-pending'), 50)),
    ])).resolves.toBeNull()
    foreground.release()

    expect(providerAbortSignal?.aborted).toBe(true)
    expect(onFailure).not.toHaveBeenCalled()
    expect(rememberMainGatewayRoute).not.toHaveBeenCalled()
    expect(syncAgentTurnSessionMirror).not.toHaveBeenCalled()
    expect(providerWorkCoordinator.snapshot()).toEqual({
      activeBackgroundSource: null,
      activeForegroundCount: 0,
    })

    resolveProvider({ text: 'late background result' })
    await Promise.resolve()
    await Promise.resolve()
    expect(rememberMainGatewayRoute).not.toHaveBeenCalled()
    expect(syncAgentTurnSessionMirror).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-preempted',
      expect.objectContaining({
        source: 'proactive',
        lane: 'background',
        reason: 'main-gateway-preempted-by-foreground-chat',
      }),
    )
  })

  it('settles an externally aborted one-shot even when the Provider ignores abort without reporting a Provider failure', async () => {
    const controller = new AbortController()
    const onFailure = vi.fn()
    const rememberMainGatewayRoute = vi.fn()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness({
      rememberMainGatewayRoute,
    })
    let providerAbortSignal: AbortSignal | undefined
    vi.mocked(generateText).mockImplementationOnce(async (input: any) => {
      providerAbortSignal = input.abortSignal
      return await new Promise(() => {})
    })

    const generationPromise = runtime.generateMainGatewayText({
      system: 'foreground perception context',
      user: 'inspect the current screen',
      source: 'screen-semantic',
      abortSignal: controller.signal,
      onFailure,
    })
    await vi.waitFor(() => {
      expect(providerAbortSignal).toBeDefined()
    })

    controller.abort(new DOMException('user cancelled', 'AbortError'))

    await expect(Promise.race([
      generationPromise,
      new Promise(resolve => setTimeout(() => resolve('still-pending'), 50)),
    ])).resolves.toBeNull()
    expect(providerAbortSignal?.aborted).toBe(true)
    expect(onFailure).not.toHaveBeenCalled()
    expect(rememberMainGatewayRoute).not.toHaveBeenCalled()
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-aborted',
      expect.objectContaining({
        source: 'screen-semantic',
      }),
    )
  })

  it('backs off repeated background one-shots after a Provider failure', async () => {
    const providerWorkCoordinator = createAlicizationMainGatewayWorkCoordinator()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness({
      providerWorkCoordinator,
    })
    vi.mocked(generateText).mockRejectedValueOnce(
      new Error('Remote sent 503 response: service unavailable'),
    )

    await expect(runtime.generateMainGatewayText({
      system: 'background context',
      user: 'first background request',
      source: 'counterfactual-deliberation',
    })).resolves.toBeNull()
    await expect(runtime.generateMainGatewayText({
      system: 'background context',
      user: 'second background request',
      source: 'counterfactual-deliberation',
    })).resolves.toBeNull()

    expect(generateText).toHaveBeenCalledTimes(2)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.one-shot-deferred',
      expect.objectContaining({
        source: 'counterfactual-deliberation',
        lane: 'background',
        reason: 'background-backoff',
      }),
    )
  })

  it('retries five transient Provider failures and accepts the sixth one-shot result', async () => {
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness()
    vi.mocked(generateText)
      .mockRejectedValueOnce(Object.assign(new Error('service unavailable'), { status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockRejectedValueOnce(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }))
      .mockRejectedValueOnce(Object.assign(new Error('upstream timeout'), { status: 504 }))
      .mockRejectedValueOnce(Object.assign(new Error('service unavailable'), { status: 503 }))
      .mockResolvedValueOnce({ text: 'recovered one-shot response' } as any)

    await expect(runtime.generateMainGatewayText({
      system: 'foreground context',
      user: 'foreground request',
      source: 'scene-appraisal',
      timeoutMs: 20_000,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
    })).resolves.toBe('recovered one-shot response')

    expect(generateText).toHaveBeenCalledTimes(6)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.provider-retry-started',
      expect.objectContaining({
        attempt: 5,
        maxRetries: 5,
        providerId: 'provider-test',
        model: 'model-test',
      }),
    )
  }, 20_000)

  it('aborts a stuck Provider attempt before the total retry deadline and retries the one-shot', async () => {
    vi.useFakeTimers()
    try {
      const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness()
      let firstAttemptSignal: AbortSignal | undefined
      vi.mocked(generateText)
        .mockImplementationOnce(async (input: any) => {
          firstAttemptSignal = input.abortSignal
          return await new Promise((_resolve, reject) => {
            input.abortSignal.addEventListener('abort', () => reject(input.abortSignal.reason), { once: true })
          })
        })
        .mockResolvedValueOnce({
          text: 'recovered after attempt timeout',
        } as any)

      const resultPromise = runtime.generateMainGatewayText({
        system: 'foreground context',
        user: 'foreground request',
        source: 'scene-appraisal',
        timeoutMs: 1_000,
        providerRetryPolicy: {
          baseDelayMs: 0,
          maxDelayMs: 0,
        },
      })

      await vi.waitFor(() => expect(firstAttemptSignal).toBeDefined())
      await vi.advanceTimersByTimeAsync(1_000)

      await expect(resultPromise).resolves.toBe('recovered after attempt timeout')
      expect(generateText).toHaveBeenCalledTimes(2)
      expect(firstAttemptSignal?.aborted).toBe(true)
      expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
        'main-gateway.provider-retry-started',
        expect.objectContaining({
          attempt: 1,
          maxRetries: 5,
        }),
      )
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('keeps an individual Provider attempt timeout distinct from the total gateway deadline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    try {
      const { runtime } = createOneShotRuntimeHarness()
      const onFailure = vi.fn()
      vi.mocked(generateText).mockImplementationOnce(async (input: any) => await new Promise((_, reject) => {
        input.abortSignal.addEventListener('abort', () => reject(input.abortSignal.reason), { once: true })
      }))

      const resultPromise = runtime.generateMainGatewayText({
        system: 'foreground context',
        user: 'foreground request',
        source: 'scene-appraisal',
        timeoutMs: 1_000,
        providerRetryPolicy: {
          deadlineAt: 12_000,
          maxRetries: 0,
        },
        onFailure,
      })
      await vi.advanceTimersByTimeAsync(1_000)

      await expect(resultPromise).resolves.toBeNull()
      expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
        reason: 'Alicization runtime aborted: main-gateway-attempt-timeout',
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('keeps an explicitly disabled retry deadline disabled for one-shot generation', async () => {
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockRejectedValueOnce(
      Object.assign(new Error('service unavailable'), { status: 503 }),
    ).mockResolvedValueOnce({
      text: 'recovered without a total retry deadline',
    } as any)

    await expect(runtime.generateMainGatewayText({
      system: 'foreground context',
      user: 'foreground request',
      source: 'scene-appraisal',
      timeoutMs: 1_000,
      providerRetryPolicy: {
        deadlineAt: null,
        maxRetries: 1,
        baseDelayMs: 2_000,
        maxDelayMs: 2_000,
        maxTotalRetryWindowMs: 1_000,
        random: () => 1,
        sleep: vi.fn(async () => {}),
      },
    })).resolves.toBe('recovered without a total retry deadline')

    expect(generateText).toHaveBeenCalledTimes(2)
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.provider-retry-scheduled',
      expect.anything(),
    )
  })

  it('reports one transparent failure after the one-shot Provider retry budget is exhausted', async () => {
    const terminalError = Object.assign(new Error('service unavailable after retries'), {
      status: 503,
    })
    const onFailure = vi.fn()
    const { runtime, appendRuntimeDebugLine } = createOneShotRuntimeHarness()
    vi.mocked(generateText).mockRejectedValue(terminalError)

    await expect(runtime.generateMainGatewayText({
      system: 'foreground context',
      user: 'foreground request',
      source: 'scene-appraisal',
      timeoutMs: 20_000,
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
      onFailure,
    })).resolves.toBeNull()

    expect(generateText).toHaveBeenCalledTimes(6)
    expect(onFailure).toHaveBeenCalledOnce()
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'service unavailable after retries',
      providerId: 'provider-test',
      model: 'model-test',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'main-gateway.provider-retry-exhausted',
      expect.objectContaining({
        attempt: 5,
        maxRetries: 5,
        providerId: 'provider-test',
        model: 'model-test',
        status: 503,
      }),
    )
  }, 20_000)

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

  it('does not inject pending execution callbacks into unrelated one-shot Provider prompts', async () => {
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
      'alicization-subjective-inference-context',
    ])
    expect(JSON.stringify(systemFacts)).not.toContain('Provider timeout.')
  })

  it('keeps caller-owned user text without carrying pending callback failure diagnostics', async () => {
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
    const callerFact = systemFacts.find(fact => fact.type === 'alicization-subjective-inference-context')

    expect(callerFact?.data.userTurn).toBe(userTurn)
    expect(callerFact?.data.task).toBe('Keep the useful request.')
    expect(callerFact?.data).not.toHaveProperty('internalResidue')
    expect(systemFacts.some(fact => fact.type === 'alicization-execution-callbacks')).toBe(false)
    expect(JSON.stringify(systemFacts)).not.toContain('Provider timeout.')
  })

  it('uses the explicit settlement fact for execution callbacks without duplicating pending diagnostics', async () => {
    const agentTurn = {
      conversationSessionId: 'session-explicit-settlement',
      ingestDigitalLifeArchitecture: vi.fn(),
      ingestDigitalLifeSpine: vi.fn(),
      ingestContinuitySignals: vi.fn(),
      ingestRuntimeActions: vi.fn(),
      trackTool: vi.fn(async (input: { run: () => Promise<unknown> }) => await input.run()),
    }
    const settlementFact = JSON.stringify({
      type: 'alicization-execution-settlement-context',
      data: {
        channel: 'codex',
        goal: '检查当前项目',
        outcome: '任务已完成',
        status: 'completed',
      },
    })
    const { runtime } = createOneShotRuntimeHarness({
      buildPendingExecutionCallbackContext: vi.fn(async () => ({
        actions: [],
        callbacks: [],
        continuitySignals: [],
        recallText: 'retry=5 workbench_trace=trace-failure',
        systemBlock: JSON.stringify({
          type: 'alicization-execution-callbacks',
          data: {
            status: 'failed',
            summary: 'Codex produced no semantic progress after retry=5',
            decisionTraceId: 'trace-failure',
          },
        }),
      })),
    })
    vi.mocked(generateText).mockResolvedValueOnce({ text: 'ok' } as any)

    await runtime.generateMainGatewayText({
      system: settlementFact,
      user: '生成执行结果回执',
      source: 'execution-callback',
      cardId: 'card-explicit-settlement',
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      captureAgentSensorySnapshot: false,
      agentTurn: agentTurn as any,
    })

    const systemTexts = (vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? [])
      .filter(message => message.role === 'system')
      .map(message => String(message.content))

    expect(systemTexts).toEqual([settlementFact])
    expect(systemTexts.join('\n')).not.toContain('retry=5')
    expect(systemTexts.join('\n')).not.toContain('trace-failure')
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

  it('delivers live memory trial context and reports the resolved Provider route', async () => {
    const { runtime } = createOneShotRuntimeHarness()
    const onProviderResult = vi.fn()
    const memoryFact = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-live-1'],
      },
    })
    vi.mocked(generateText).mockResolvedValueOnce({
      finishReason: 'stop',
      text: '我记得。',
    } as any)

    const text = await runtime.generateMainGatewayText({
      system: '',
      user: '你还记得吗？',
      source: 'memory-quality-trial',
      cardId: 'card-memory-live',
      extraSystemBlocks: [memoryFact],
      injectCustomDirectives: false,
      injectPerformanceManifest: false,
      onProviderResult,
    })

    expect(text).toBe('我记得。')
    const messages = vi.mocked(generateText).mock.calls[0]?.[0]?.messages ?? []
    expect(messages).toContainEqual({
      role: 'system',
      content: memoryFact,
    })
    expect(onProviderResult).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 'provider-test',
      modelId: 'model-test',
      finishReason: 'stop',
      retryCount: 0,
    }))
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
        providerRetryPolicy: {
          maxRetries: 0,
        },
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

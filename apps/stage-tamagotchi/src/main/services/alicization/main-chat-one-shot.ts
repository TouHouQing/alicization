import type { AlicizationEmotionalKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message, Tool, ToolChoice } from '@xsai/shared-chat'

import type { AlicizationProviderRetryOverrides } from './provider-retry-policy'
import type { MainGatewayResolvedConfig } from './runtime-soul'
import type { ToolRegistry } from './turn-os/tool-registry'

import { generateText } from '@xsai/generate-text'

import {
  awaitAlicizationPromiseWithAbort,
  createAbortError,
  sanitizeText,
} from './main-chat-stream-primitives'
import {
  resolveAlicizationProviderRetryDeadline,
  runWithAlicizationProviderRetry,
} from './provider-retry-policy'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

type GenerateTextInvoker = (input: Record<string, unknown>) => Promise<Record<string, unknown> & {
  text?: string | null
  finishReason?: string | null
}>

const legacyProviderToolNames = new Set([
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_cli',
  'executor_run_coding_agent',
  'executor_run_local_visual',
  'executor_run_openclaw',
])

function readProviderToolName(raw: unknown) {
  if (typeof raw === 'string')
    return raw.trim()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return ''

  const record = raw as Record<string, unknown>
  const directName = typeof record.name === 'string'
    ? record.name
    : undefined
  if (directName)
    return directName.trim()

  const functionRecord = record.function
  if (!functionRecord || typeof functionRecord !== 'object' || Array.isArray(functionRecord))
    return ''
  return typeof (functionRecord as Record<string, unknown>).name === 'string'
    ? String((functionRecord as Record<string, unknown>).name).trim()
    : ''
}

function resolveActiveProviderManifest(
  toolRegistry: ToolRegistry,
  providerToolName: string,
) {
  const manifest = toolRegistry.list().find(candidate =>
    candidate.providerToolName === providerToolName,
  )
  return manifest
    ? toolRegistry.resolveActive(manifest.capabilityId)
    : undefined
}

function assertProviderToolBoundary(input: {
  tools?: Tool[]
  toolChoice?: ToolChoice
  toolRegistry: ToolRegistry
}) {
  const activeProviderToolNames = new Set<string>()

  for (const tool of input.tools ?? []) {
    const providerToolName = readProviderToolName(tool)
    if (legacyProviderToolNames.has(providerToolName)) {
      throw new Error(
        `Legacy executor tool name "${providerToolName}" cannot enter the Provider protocol.`,
      )
    }

    const activeManifest = resolveActiveProviderManifest(
      input.toolRegistry,
      providerToolName,
    )
    if (!activeManifest) {
      throw new Error(
        `Provider tool "${providerToolName}" is not registered as an active canonical provider tool.`,
      )
    }
    activeProviderToolNames.add(activeManifest.providerToolName)
  }

  const legacyToolChoice = readProviderToolName(input.toolChoice)
  if (legacyProviderToolNames.has(legacyToolChoice)) {
    throw new Error(
      `Legacy executor tool choice "${legacyToolChoice}" cannot enter the Provider protocol.`,
    )
  }

  if (
    input.toolChoice
    && typeof input.toolChoice === 'object'
    && !Array.isArray(input.toolChoice)
    && input.toolChoice.type === 'function'
    && !activeProviderToolNames.has(legacyToolChoice)
  ) {
    throw new Error(
      `Provider tool choice "${legacyToolChoice}" must reference an active canonical provider tool in this one-shot.`,
    )
  }
}

interface AlicizationMainChatOneShotInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Tool[]
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  maxSteps: number
  timeoutReason: string
  abortSignal?: AbortSignal
  toolRegistry?: ToolRegistry
  providerRetryPolicy?: AlicizationProviderRetryOverrides
  generateTextImpl?: GenerateTextInvoker
}

async function executeAlicizationMainChatOneShot(input: AlicizationMainChatOneShotInput) {
  const controller = new AbortController()
  const forwardExternalAbort = () => {
    if (!controller.signal.aborted)
      controller.abort(input.abortSignal?.reason ?? createAbortError('main-gateway-aborted'))
  }
  if (input.abortSignal?.aborted)
    forwardExternalAbort()
  else
    input.abortSignal?.addEventListener('abort', forwardExternalAbort, { once: true })
  const retryDeadlineAt = resolveAlicizationProviderRetryDeadline(({
    deadlineAt: input.providerRetryPolicy?.deadlineAt,
    baseDelayMs: input.providerRetryPolicy?.baseDelayMs,
    maxDelayMs: input.providerRetryPolicy?.maxDelayMs,
    maxRetries: input.providerRetryPolicy?.maxRetries,
    maxTotalRetryWindowMs: input.providerRetryPolicy?.maxTotalRetryWindowMs,
    timeoutMs: input.timeoutMs,
  }))
  const timeout = retryDeadlineAt === null
    ? undefined
    : setTimeout(() => {
        if (!controller.signal.aborted)
          controller.abort(createAbortError(input.timeoutReason))
      }, Math.max(1_000, retryDeadlineAt - Date.now()))

  try {
    const invokeGenerateText = input.generateTextImpl ?? (generateText as unknown as GenerateTextInvoker)
    const hasToolSurface = (input.tools?.length ?? 0) > 0 || input.toolChoice != null
    if (hasToolSurface && !input.toolRegistry) {
      throw new TypeError(
        'main chat one-shot requires an explicit toolRegistry when exposing tools',
      )
    }
    const toolRegistry = input.toolRegistry ?? createCanonicalToolRegistry()
    assertProviderToolBoundary({
      tools: input.tools,
      toolChoice: input.toolChoice,
      toolRegistry,
    })
    let hasToolSideEffect = false
    const hasExecutableTools = input.tools?.some(tool => typeof tool.execute === 'function') === true
    const providerTools = hasExecutableTools
      ? input.tools?.map(tool => typeof tool.execute === 'function'
          ? {
              ...tool,
              execute: async (...args: Parameters<Tool['execute']>) => {
                const providerToolName = readProviderToolName(tool)
                const providerInvocation = toolRegistry.resolveProviderInvocation(
                  providerToolName,
                  args[0],
                )
                if (!providerInvocation) {
                  return {
                    status: 'failed',
                    errorCode: 'CAPABILITY_INPUT_INVALID',
                    errorMessage: `Capability "${providerToolName}" rejected the tool input.`,
                  }
                }
                hasToolSideEffect = true
                return await tool.execute(...args)
              },
            }
          : tool)
      : input.tools
    const result = await runWithAlicizationProviderRetry<Record<string, unknown> & {
      text?: string | null
      finishReason?: string | null
    }>({
      operation: 'main-gateway-one-shot',
      signal: controller.signal,
      deadlineAt: retryDeadlineAt,
      ...input.providerRetryPolicy,
      replayState: () => ({
        hasToolSideEffect,
      }),
      invoke: async ({ signal }) => {
        const attemptController = new AbortController()
        const forwardAbort = () => {
          if (!attemptController.signal.aborted)
            attemptController.abort(signal?.reason ?? controller.signal.reason ?? createAbortError(input.timeoutReason))
        }
        const attemptTimeout = setTimeout(() => {
          if (!attemptController.signal.aborted)
            attemptController.abort(createAbortError(input.timeoutReason))
        }, Math.max(1_000, input.timeoutMs))
        if (signal?.aborted || controller.signal.aborted) {
          forwardAbort()
        }
        else {
          signal?.addEventListener('abort', forwardAbort, { once: true })
          controller.signal.addEventListener('abort', forwardAbort, { once: true })
        }

        try {
          const providerSignal = attemptController.signal
          return await awaitAlicizationPromiseWithAbort(
            invokeGenerateText({
              ...input.chatConfig,
              maxSteps: input.maxSteps,
              messages: input.messages,
              headers: input.headers,
              abortSignal: providerSignal,
              tools: providerTools,
              toolChoice: input.toolChoice,
            }),
            providerSignal,
          )
        }
        finally {
          clearTimeout(attemptTimeout)
          signal?.removeEventListener('abort', forwardAbort)
          controller.signal.removeEventListener('abort', forwardAbort)
        }
      },
    })
    return {
      finishReason: sanitizeText(result.finishReason, 'stop'),
      fullText: (result.text ?? '').trim(),
    }
  }
  finally {
    if (timeout)
      clearTimeout(timeout)
    input.abortSignal?.removeEventListener('abort', forwardExternalAbort)
  }
}

export async function recoverAlicizationMainChatFromTimeout(input: {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Tool[]
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  maxSteps?: number
  abortSignal?: AbortSignal
  toolRegistry?: ToolRegistry
  providerRetryPolicy?: AlicizationProviderRetryOverrides
  generateTextImpl?: GenerateTextInvoker
}) {
  const normalizedMaxSteps = Number.isFinite(input.maxSteps)
    ? Math.max(1, Math.min(10, Math.floor(Number(input.maxSteps))))
    : 1
  const result = await executeAlicizationMainChatOneShot({
    ...input,
    maxSteps: normalizedMaxSteps,
    timeoutReason: 'main-gateway-timeout-recovery',
  })
  return result.fullText
}

export async function generateAlicizationMainChatNonStreaming(input: {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Tool[]
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  abortSignal?: AbortSignal
  toolRegistry?: ToolRegistry
  providerRetryPolicy?: AlicizationProviderRetryOverrides
  generateTextImpl?: GenerateTextInvoker
}) {
  return await executeAlicizationMainChatOneShot({
    ...input,
    maxSteps: 10,
    timeoutReason: 'main-gateway-visual-one-shot-timeout',
  })
}

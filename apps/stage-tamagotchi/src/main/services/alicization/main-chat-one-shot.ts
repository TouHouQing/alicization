import type { AlicizationEmotionalKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message, ToolChoice } from '@xsai/shared-chat'
import type { tool } from '@xsai/tool'

import type { MainGatewayResolvedConfig } from './runtime-soul'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { generateText } from '@xsai/generate-text'

import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { createAbortError, sanitizeText } from './main-chat-stream-primitives'

type GenerateTextInvoker = (input: Record<string, unknown>) => Promise<Record<string, unknown> & {
  text?: string | null
  finishReason?: string | null
}>

interface AlicizationMainChatOneShotInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Array<Awaited<ReturnType<typeof tool>>>
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  maxSteps: number
  timeoutReason: string
  generateTextImpl?: GenerateTextInvoker
}

function normalizeOneShotToolName(candidate: unknown) {
  if (!candidate || typeof candidate !== 'object')
    return ''

  const payload = candidate as {
    name?: unknown
    toolName?: unknown
    function?: { name?: unknown }
    tool?: { name?: unknown }
  }
  const directName = sanitizeText(payload.toolName ?? payload.name)
  if (directName)
    return directName

  const functionName = sanitizeText(payload.function?.name)
  if (functionName)
    return functionName

  return sanitizeText(payload.tool?.name)
}

function extractOneShotObservedToolNames(result: Record<string, unknown>) {
  const observed = new Set<string>()
  const collectFromToolCalls = (toolCalls: unknown) => {
    if (!Array.isArray(toolCalls))
      return
    for (const entry of toolCalls) {
      const toolName = normalizeOneShotToolName(entry)
      if (toolName)
        observed.add(toolName)
    }
  }

  collectFromToolCalls(result.toolCalls)
  const responsePayload = result.response
  if (responsePayload && typeof responsePayload === 'object')
    collectFromToolCalls((responsePayload as { toolCalls?: unknown }).toolCalls)

  if (Array.isArray(result.steps)) {
    for (const step of result.steps) {
      if (!step || typeof step !== 'object')
        continue
      collectFromToolCalls((step as { toolCalls?: unknown }).toolCalls)
    }
  }

  return observed
}

async function executeAlicizationMainChatOneShot(input: AlicizationMainChatOneShotInput) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted)
      controller.abort(createAbortError(input.timeoutReason))
  }, Math.max(1_000, input.timeoutMs))

  try {
    const invokeGenerateText = input.generateTextImpl ?? (generateText as unknown as GenerateTextInvoker)
    const result = await invokeGenerateText({
      ...input.chatConfig,
      maxSteps: input.maxSteps,
      messages: input.messages,
      responseFormat: alicizationProviderResponseFormat,
      headers: input.headers,
      abortSignal: controller.signal,
      tools: input.tools,
      toolChoice: input.toolChoice,
    })
    const requiredToolNames = new Set(
      extractAllowedToolNamesFromToolChoice(input.toolChoice, input.tools),
    )
    if (requiredToolNames.size > 0) {
      const observedToolNames = extractOneShotObservedToolNames(result)
      const calledRequiredTool = [...observedToolNames].some(toolName => requiredToolNames.has(toolName))
      // NOTICE: Keep one-shot tool-routing contract aligned with stream runner:
      // a forced execution tool must be called before settling.
      if (!calledRequiredTool) {
        throw new AlicizationRequiredToolMissingError({
          stage: 'one-shot',
          finishReason: sanitizeText(result.finishReason, 'stop'),
          requiredToolNames: [...requiredToolNames],
          observedToolNames: [...observedToolNames],
        })
      }
    }
    return {
      finishReason: sanitizeText(result.finishReason, 'stop'),
      fullText: (result.text ?? '').trim(),
    }
  }
  finally {
    clearTimeout(timeout)
  }
}

export async function recoverAlicizationMainChatFromTimeout(input: {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Array<Awaited<ReturnType<typeof tool>>>
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  maxSteps?: number
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
  tools?: Array<Awaited<ReturnType<typeof tool>>>
  toolChoice?: ToolChoice
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  timeoutMs: number
  generateTextImpl?: GenerateTextInvoker
}) {
  return await executeAlicizationMainChatOneShot({
    ...input,
    maxSteps: 10,
    timeoutReason: 'main-gateway-visual-one-shot-timeout',
  })
}

import type { Message, ToolChoice } from '@xsai/shared-chat'
import type { tool } from '@xsai/tool'

import type { MainGatewayResolvedConfig } from './runtime-soul'

import { generateText } from '@xsai/generate-text'

import { createAbortError, sanitizeText } from './main-chat-stream-primitives'

type GenerateTextInvoker = (input: Record<string, unknown>) => Promise<{
  text?: string | null
  finishReason?: string | null
}>

interface AlicizationMainChatOneShotInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  tools?: Array<Awaited<ReturnType<typeof tool>>>
  toolChoice?: ToolChoice
  timeoutMs: number
  maxSteps: number
  timeoutReason: string
  generateTextImpl?: GenerateTextInvoker
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
      headers: input.headers,
      abortSignal: controller.signal,
      tools: input.tools,
      toolChoice: input.toolChoice,
    })
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
  timeoutMs: number
  generateTextImpl?: GenerateTextInvoker
}) {
  const result = await executeAlicizationMainChatOneShot({
    ...input,
    maxSteps: 1,
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
  timeoutMs: number
  generateTextImpl?: GenerateTextInvoker
}) {
  return await executeAlicizationMainChatOneShot({
    ...input,
    maxSteps: 10,
    timeoutReason: 'main-gateway-visual-one-shot-timeout',
  })
}

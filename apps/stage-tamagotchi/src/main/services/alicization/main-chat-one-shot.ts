import type { AlicizationEmotionalKernelSnapshot } from '@proj-alicization/stage-shared'
import type { Message, ToolChoice } from '@xsai/shared-chat'
import type { tool } from '@xsai/tool'

import type { MainGatewayResolvedConfig } from './runtime-soul'

import { generateText } from '@xsai/generate-text'

import { assertAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { createAbortError, sanitizeText } from './main-chat-stream-primitives'
import { sanitizeBriefText } from './runtime-realtime'

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

function readOneShotRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readOneShotEmotionalKernel(raw: unknown): AlicizationEmotionalKernelSnapshot | null {
  const candidate = readOneShotRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !sanitizeText(candidate.dominantEmotion, '')
    || !sanitizeText(candidate.memoryRecallMode, '')
    || !sanitizeText(candidate.initiativeMode, '')
    || !sanitizeText(candidate.embodimentTone, '')
  ) {
    return null
  }
  return candidate as unknown as AlicizationEmotionalKernelSnapshot
}

function buildOneShotEmotionalKernelSystemBlock(raw: unknown) {
  const emotionalKernel = readOneShotEmotionalKernel(raw)
  if (!emotionalKernel)
    return ''

  return [
    '[ALICIZATION_EMOTIONAL_KERNEL]',
    'This is the shared emotion-memory-initiative-embodiment authority for this one-shot turn. Let it shape recall, initiative pressure, body tone, and reply posture; do not invent a competing mood.',
    emotionalKernel.dominantEmotion
      ? `emotional_kernel_dominant=${sanitizeBriefText(emotionalKernel.dominantEmotion, 64)}`
      : '',
    emotionalKernel.memoryRecallMode
      ? `emotional_kernel_memory_recall=${sanitizeBriefText(emotionalKernel.memoryRecallMode, 64)}`
      : '',
    emotionalKernel.initiativeMode
      ? `emotional_kernel_initiative=${sanitizeBriefText(emotionalKernel.initiativeMode, 64)}`
      : '',
    emotionalKernel.embodimentTone
      ? `emotional_kernel_embodiment=${sanitizeBriefText(emotionalKernel.embodimentTone, 64)}`
      : '',
    Number.isFinite(emotionalKernel.valence) ? `emotional_kernel_valence=${emotionalKernel.valence.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.arousal) ? `emotional_kernel_arousal=${emotionalKernel.arousal.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.guardedness) ? `emotional_kernel_guardedness=${emotionalKernel.guardedness.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.closenessDrive) ? `emotional_kernel_closeness_drive=${emotionalKernel.closenessDrive.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.repairNeed) ? `emotional_kernel_repair_need=${emotionalKernel.repairNeed.toFixed(2)}` : '',
    Number.isFinite(emotionalKernel.initiativePressure) ? `emotional_kernel_initiative_pressure=${emotionalKernel.initiativePressure.toFixed(2)}` : '',
    emotionalKernel.why
      ? `emotional_kernel_reason=${sanitizeBriefText(emotionalKernel.why, 220)}`
      : '',
    emotionalKernel.reasonTags?.length
      ? `emotional_kernel_tags=${emotionalKernel.reasonTags.map(tag => sanitizeBriefText(tag, 64)).filter(Boolean).slice(0, 6).join('|')}`
      : '',
  ].filter(Boolean).join('\n')
}

function messagesCarryOneShotEmotionalKernel(messages: Message[]) {
  return messages.some(message =>
    typeof message.content === 'string'
    && message.content.includes('[ALICIZATION_EMOTIONAL_KERNEL]'),
  )
}

function appendOneShotEmotionalKernelSystemMessage(
  messages: Message[],
  emotionalKernel: AlicizationEmotionalKernelSnapshot | null | undefined,
) {
  const block = buildOneShotEmotionalKernelSystemBlock(emotionalKernel)
  if (!block || messagesCarryOneShotEmotionalKernel(messages))
    return messages

  const firstNonSystemIndex = messages.findIndex(message => message.role !== 'system')
  const emotionalKernelMessage = { role: 'system', content: block } as Message
  if (firstNonSystemIndex < 0)
    return [...messages, emotionalKernelMessage]

  return [
    ...messages.slice(0, firstNonSystemIndex),
    emotionalKernelMessage,
    ...messages.slice(firstNonSystemIndex),
  ]
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
    const providerMessages = appendOneShotEmotionalKernelSystemMessage(
      input.messages,
      input.emotionalKernel,
    )

    assertAlicizationCanonicalProjectState(providerMessages, 'one-shot')

    const invokeGenerateText = input.generateTextImpl ?? (generateText as unknown as GenerateTextInvoker)
    const result = await invokeGenerateText({
      ...input.chatConfig,
      maxSteps: input.maxSteps,
      messages: providerMessages,
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

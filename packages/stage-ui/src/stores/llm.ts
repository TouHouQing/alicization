import type {
  AlicizationChatFailureSurface,
  alicizationProviderResponseFormat,
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CompletionToolCall, Message, Tool } from '@xsai/shared-chat'

import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationDigitalLifeSpineDigest,
  AlicizationEmbodimentScriptV1,
  AlicizationMindTurnGovernance,
  AlicizationRuntimeDigest,
} from './alicization-bridge'

import { listModels } from '@xsai/model'
import { XSAIError } from '@xsai/shared'
import { streamText } from '@xsai/stream-text'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { debug, mcp } from '../tools'

export type StreamEvent
  = | {
    type: 'text-delta'
    text: string
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
  }
  | {
    type: 'meta'
    governance: AlicizationMindTurnGovernance | null
    embodiment?: AlicizationDialogueEmbodimentEnvelope | null
    embodimentScript?: AlicizationEmbodimentScriptV1 | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest?: AlicizationRuntimeDigest | null
  }
  | ({
    type: 'finish'
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
    finishReason?: string
    fullText?: string
  } & any)
  | ({ type: 'tool-call' } & CompletionToolCall)
  | { type: 'tool-result', toolCallId: string, result?: unknown }
  | {
    type: 'error'
    error: any
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
  }

export interface StreamOptions {
  headers?: Record<string, string>
  onStreamEvent?: (event: StreamEvent) => void | Promise<void>
  responseFormat?: typeof alicizationProviderResponseFormat
  toolsCompatibility?: Map<string, boolean>
  supportsTools?: boolean
  waitForTools?: boolean // when true,won't resolve on finishReason=='tool_calls';
  tools?: Tool[] | (() => Promise<Tool[] | undefined>)
  abortSignal?: AbortSignal
}

// TODO: proper format for other error messages.
function sanitizeMessages(messages: unknown[]): Message[] {
  return messages.map((m: any) => {
    if (m && m.role === 'error') {
      return {
        role: 'user',
        content: `User encountered error: ${String(m.content ?? '')}`,
      } as Message
    }
    // NOTICE: This block is critical for backward compatibility with LLM providers (e.g., DeepSeek)
    // that expect message content to be a string, not an array of content parts.
    // Failure to flatten array content (when no image_url is present) can lead to
    // deserialization errors like "invalid type: sequence, expected a string".
    if (m && Array.isArray(m.content)) {
      const contentParts = m.content as { type?: string, text?: string }[]
      if (!contentParts.some(p => p?.type === 'image_url')) {
        return { ...m, content: contentParts.map(p => p?.text ?? '').join('') } as Message
      }
    }
    return m as Message
  })
}

function streamOptionsToolsCompatibilityOk(model: string, chatProvider: ChatProvider, _: Message[], options?: StreamOptions): boolean {
  if (typeof options?.supportsTools === 'boolean')
    return options.supportsTools
  const discovered = options?.toolsCompatibility?.get(`${chatProvider.chat(model).baseURL}-${model}`)
  if (typeof discovered === 'boolean')
    return discovered
  return true
}

async function streamFrom(model: string, chatProvider: ChatProvider, messages: Message[], options?: StreamOptions) {
  const headers = options?.headers
  const chatConfig = chatProvider.chat(model)

  const sanitized = sanitizeMessages(messages as unknown[])
  const resolveTools = async () => {
    const tools = typeof options?.tools === 'function'
      ? await options.tools()
      : options?.tools
    return tools ?? []
  }

  const supportedTools = streamOptionsToolsCompatibilityOk(model, chatProvider, messages, options)
  const tools = supportedTools
    ? [
        ...await mcp(),
        ...await debug(),
        ...await resolveTools(),
      ]
    : undefined

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const abortSignal = options?.abortSignal
    function resolveOnce() {
      if (settled)
        return
      settled = true
      abortSignal?.removeEventListener('abort', abortHandler)
      resolve()
    }
    function rejectOnce(err: unknown) {
      if (settled)
        return
      settled = true
      abortSignal?.removeEventListener('abort', abortHandler)
      reject(err)
    }
    function abortHandler() {
      rejectOnce(abortSignal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    if (abortSignal?.aborted) {
      rejectOnce(abortSignal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }

    abortSignal?.addEventListener('abort', abortHandler, { once: true })

    const onEvent = async (event: unknown) => {
      try {
        await options?.onStreamEvent?.(event as StreamEvent)
        if (event && (event as StreamEvent).type === 'finish') {
          const finishReason = (event as any).finishReason
          if (finishReason !== 'tool_calls' || !options?.waitForTools)
            resolveOnce()
        }
        else if (event && (event as StreamEvent).type === 'error') {
          const error = (event as any).error ?? new Error('Stream error')
          rejectOnce(error)
        }
      }
      catch (err) {
        rejectOnce(err)
      }
    }

    const observeStreamTextResultErrors = (result: unknown) => {
      if (!result || typeof result !== 'object')
        return

      const streamResult = result as Record<string, unknown>
      const fullStream = streamResult.fullStream as {
        pipeTo?: (destination: WritableStream<unknown>) => Promise<void>
      } | undefined
      if (typeof fullStream?.pipeTo === 'function') {
        try {
          void fullStream
            .pipeTo(new WritableStream())
            .catch(rejectOnce)
        }
        catch (error) {
          rejectOnce(error)
        }
      }

      for (const key of ['messages', 'steps', 'totalUsage', 'usage'] as const) {
        const pending = streamResult[key]
        if (pending && typeof (pending as PromiseLike<unknown>).then === 'function')
          void Promise.resolve(pending).catch(rejectOnce)
      }
    }

    try {
      const result = streamText({
        ...chatConfig,
        maxSteps: 10,
        messages: sanitized,
        responseFormat: options?.responseFormat,
        headers,
        abortSignal,
        // TODO: we need Automatic tools discovery
        tools,
        onEvent,
      })
      observeStreamTextResultErrors(result)
    }
    catch (err) {
      rejectOnce(err)
    }
  })
}

export async function attemptForToolsCompatibilityDiscovery(model: string, chatProvider: ChatProvider, _: Message[], options?: Omit<StreamOptions, 'supportsTools'>): Promise<boolean> {
  async function attempt(enable: boolean) {
    try {
      await streamFrom(model, chatProvider, [{ role: 'user', content: 'Hello, world!' }], { ...options, supportsTools: enable })
      return true
    }
    catch (err) {
      if (err instanceof Error && err.name === new XSAIError('').name) {
        // TODO: if you encountered many more errors like these, please, add them here.

        // Ollama
        /**
         * {"error":{"message":"registry.ollama.ai/<scope>/<model> does not support tools","type":"api_error","param":null,"code":null}}
         */
        if (String(err).includes('does not support tools')) {
          return false
        }
        // OpenRouter
        /**
         * {"error":{"message":"No endpoints found that support tool use. To learn more about provider routing, visit: https://openrouter.ai/docs/provider-routing","code":404}}
         */
        if (String(err).includes('No endpoints found that support tool use.')) {
          return false
        }
      }

      throw err
    }
  }

  function promiseAllWithInterval<T>(promises: (() => Promise<T>)[], interval: number): Promise<{ result?: T, error?: any }[]> {
    return new Promise((resolve) => {
      const results: { result?: T, error?: any }[] = []
      let completed = 0

      promises.forEach((promiseFn, index) => {
        setTimeout(() => {
          promiseFn()
            .then((result) => {
              results[index] = { result }
            })
            .catch((err) => {
              results[index] = { error: err }
            })
            .finally(() => {
              completed++
              if (completed === promises.length) {
                resolve(results)
              }
            })
        }, index * interval)
      })
    })
  }

  const attempts = [
    () => attempt(true),
    () => attempt(false),
  ]

  const attemptsResults = await promiseAllWithInterval<boolean | undefined>(attempts, 1000)
  if (attemptsResults.some(res => res.error)) {
    const err = new Error(`Error during tools compatibility discovery for model: ${model}. Errors: ${attemptsResults.map(res => res.error).filter(Boolean).join(', ')}`)
    err.cause = attemptsResults.map(res => res.error).filter(Boolean)
    throw err
  }

  return attemptsResults[0].result === true && attemptsResults[1].result === true
}

export const useLLM = defineStore('llm', () => {
  const toolsCompatibility = ref<Map<string, boolean>>(new Map())

  function isToolUnsupportedError(error: unknown) {
    const message = String(error ?? '').toLowerCase()
    return message.includes('does not support tools')
      || message.includes('no endpoints found that support tool use')
      || message.includes('function calling is not supported')
      || message.includes('tool use is not supported')
      || message.includes('unsupported tool')
  }

  async function discoverToolsCompatibility(model: string, chatProvider: ChatProvider, _: Message[], options?: Omit<StreamOptions, 'supportsTools'>) {
    // Cached, no need to discover again
    if (toolsCompatibility.value.has(`${chatProvider.chat(model).baseURL}-${model}`)) {
      return
    }

    const res = await attemptForToolsCompatibilityDiscovery(model, chatProvider, _, { ...options, toolsCompatibility: toolsCompatibility.value })
    toolsCompatibility.value.set(`${chatProvider.chat(model).baseURL}-${model}`, res)
  }

  async function stream(model: string, chatProvider: ChatProvider, messages: Message[], options?: StreamOptions) {
    const key = `${chatProvider.chat(model).baseURL}-${model}`
    const streamOptions = { ...options, toolsCompatibility: toolsCompatibility.value }
    try {
      await streamFrom(model, chatProvider, messages, streamOptions)
    }
    catch (error) {
      if (typeof options?.supportsTools === 'boolean')
        throw error
      if (!isToolUnsupportedError(error))
        throw error

      toolsCompatibility.value.set(key, false)
      await streamFrom(model, chatProvider, messages, {
        ...streamOptions,
        supportsTools: false,
      })
    }
  }

  async function models(apiUrl: string, apiKey: string) {
    if (apiUrl === '') {
      return []
    }

    try {
      return await listModels({
        baseURL: (apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`) as `${string}/`,
        apiKey,
      })
    }
    catch (err) {
      if (String(err).includes(`Failed to construct 'URL': Invalid URL`)) {
        return []
      }

      throw err
    }
  }

  return {
    models,
    stream,
    discoverToolsCompatibility,
  }
})

import type { ChatProvider } from '@xsai-ext/providers/utils'

import {
  alicizationProviderResponseFormat,
  isAlicizationProviderSchemaUnsupportedError,
} from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../tools', () => ({
  debug: async () => [],
  mcp: async () => [],
}))

function createChatProvider(fetch: typeof globalThis.fetch): ChatProvider {
  return {
    chat: model => ({
      apiKey: 'test-key',
      baseURL: 'https://provider.invalid/v1/',
      fetch,
      model,
    }),
  } as ChatProvider
}

describe('llm native response schema failures', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('surfaces a real xsAI schema HTTP failure without retrying the provider', async () => {
    const { useLLM } = await import('./llm')
    const store = useLLM()
    const fetch = vi.fn(async () => new Response(
      '{"error":{"message":"response_format json_schema is an invalid parameter"}}',
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    ))

    const pending = store.stream('test-model', createChatProvider(fetch), [
      { role: 'user', content: '你好' },
    ], {
      responseFormat: alicizationProviderResponseFormat,
    })
    const result = await Promise.race([
      pending.then(
        () => ({ status: 'resolved' as const }),
        error => ({ status: 'rejected' as const, error }),
      ),
      new Promise<{ status: 'timed-out' }>(resolve => setTimeout(
        () => resolve({ status: 'timed-out' }),
        500,
      )),
    ])

    expect(result.status).toBe('rejected')
    expect(result.status === 'rejected' && isAlicizationProviderSchemaUnsupportedError(result.error)).toBe(true)
    expect(fetch).toHaveBeenCalledOnce()
  })
})

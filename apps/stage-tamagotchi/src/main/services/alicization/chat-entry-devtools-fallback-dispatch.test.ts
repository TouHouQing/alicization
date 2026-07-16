import type { AlicizationChatEntryIngestOptions } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'
import type { ChatProvider } from '@xsai-ext/providers/utils'

import { describe, expect, it, vi } from 'vitest'

import { dispatchPocketPerformancePlaygroundChatTurn } from '../../../../../stage-pocket/src/pages/devtools/performance-playground.chat'
import { dispatchWebPerformancePlaygroundChatTurn } from '../../../../../stage-web/src/pages/devtools/performance-playground.chat'

function createMockChatProvider(): ChatProvider {
  return {
    chat: model => ({
      baseURL: 'https://example.invalid/v1/',
      model: String(model),
    }),
  }
}

describe('chat entry devtools fallback dispatch', () => {
  it('dispatches the web performance playground through the central memory-owned dialogue entry', async () => {
    const ingest = vi.fn(async (
      _text: string,
      _options: AlicizationChatEntryIngestOptions,
    ) => undefined)

    await dispatchWebPerformancePlaygroundChatTurn({
      text: '继续观察这一轮数字生命闭环压力',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      ingest,
    })

    expect(ingest).toHaveBeenCalledWith('继续观察这一轮数字生命闭环压力', {
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: expect.objectContaining({
        chat: expect.any(Function),
      }),
      providerConfig: { apiKey: 'test-key' },
    })
  })

  it('dispatches the pocket performance playground through the central memory-owned dialogue entry', async () => {
    const ingest = vi.fn(async (
      _text: string,
      _options: AlicizationChatEntryIngestOptions,
    ) => undefined)

    await dispatchPocketPerformancePlaygroundChatTurn({
      text: '继续观察这一轮数字生命闭环压力',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      ingest,
    })

    expect(ingest).toHaveBeenCalledWith('继续观察这一轮数字生命闭环压力', {
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: expect.objectContaining({
        chat: expect.any(Function),
      }),
      providerConfig: { apiKey: 'test-key' },
    })
  })
})

import type { ChatProvider } from '@xsai-ext/providers/utils'

import { describe, expect, it, vi } from 'vitest'

import { dispatchPocketVoiceTurn } from '../../../../../stage-pocket/src/pages/index.voice'
import { dispatchWebVoiceTurn } from '../../../../../stage-web/src/pages/index.voice'
import { dispatchDesktopVoiceTurn } from '../../../renderer/pages/index.desktop'

function createMockChatProvider(): ChatProvider {
  return {
    chat: model => ({
      baseURL: 'https://example.invalid/v1/',
      model: String(model),
    }),
  }
}

function expectMemoryOwnedVoiceDispatch(ingest: ReturnType<typeof vi.fn>, origin?: string) {
  expect(ingest).toHaveBeenCalledWith('继续沿着这条数字生命主线推进', expect.objectContaining({
    providerId: 'mock-provider',
    model: 'mock-model',
    chatProvider: expect.objectContaining({
      chat: expect.any(Function),
    }),
    providerConfig: { apiKey: 'test-key' },
    ...(origin ? { origin } : {}),
  }))

  expect(ingest.mock.calls[0]?.[1]).not.toHaveProperty('preDialogueSendIdentity')
}

describe('chat entry voice dispatch', () => {
  it('dispatches the primary desktop voice entry without renderer-authored reply governance', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchDesktopVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      origin: 'ui-user',
      ingest,
    })

    expectMemoryOwnedVoiceDispatch(ingest, 'ui-user')
  })

  it('dispatches the primary web voice entry without renderer-authored reply governance', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchWebVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      ingest,
    })

    expectMemoryOwnedVoiceDispatch(ingest)
  })

  it('dispatches the primary pocket voice entry without renderer-authored reply governance', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchPocketVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      ingest,
    })

    expectMemoryOwnedVoiceDispatch(ingest)
  })
})

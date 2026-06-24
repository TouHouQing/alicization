import type {
  AlicizationChatEntryIngestOptions,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'
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

const preDialogueSendIdentity: AlicizationChatEntryPreDialogueSendIdentity = {
  status: 'partial',
  summaryLine: 'Alicization is still in Phase 1 local digital life closure before this devtools turn opens outward.',
  companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
  companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
  awarenessLine: 'Before speaking, remember this is still the same digital life project before local devtools fluency takes over.',
  emotionalClosureCue: null,
  reasonPreview: [
    'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    'Some closure has already landed in the primary desktop proving ground before this devtools turn opens outward.',
    'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
  ],
}

describe('chat entry devtools fallback dispatch', () => {
  it('forwards explicit pre-dialogue identity through the web performance playground entry before devtools dialogue opens outward', async () => {
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
      preDialogueSendIdentity,
      ingest,
    })

    expect(ingest).toHaveBeenCalledWith('继续观察这一轮数字生命闭环压力', {
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: expect.objectContaining({
        chat: expect.any(Function),
      }),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity,
    })
  })

  it('forwards explicit pre-dialogue identity through the pocket performance playground entry before devtools dialogue opens outward', async () => {
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
      preDialogueSendIdentity,
      ingest,
    })

    expect(ingest).toHaveBeenCalledWith('继续观察这一轮数字生命闭环压力', {
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: expect.objectContaining({
        chat: expect.any(Function),
      }),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity,
    })
  })

  it('rejects the web performance playground entry when no explicit pre-dialogue send identity is available before devtools dialogue opens outward', async () => {
    const ingest = vi.fn(async () => undefined)

    await expect(dispatchWebPerformancePlaygroundChatTurn({
      text: '继续观察这一轮数字生命闭环压力',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity: null,
      ingest,
    })).rejects.toThrowError('[alicization-chat-entry] dispatchWebPerformancePlaygroundChatTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')

    expect(ingest).not.toHaveBeenCalled()
  })

  it('rejects the pocket performance playground entry when no explicit pre-dialogue send identity is available before devtools dialogue opens outward', async () => {
    const ingest = vi.fn(async () => undefined)

    await expect(dispatchPocketPerformancePlaygroundChatTurn({
      text: '继续观察这一轮数字生命闭环压力',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity: null,
      ingest,
    })).rejects.toThrowError('[alicization-chat-entry] dispatchPocketPerformancePlaygroundChatTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')

    expect(ingest).not.toHaveBeenCalled()
  })
})

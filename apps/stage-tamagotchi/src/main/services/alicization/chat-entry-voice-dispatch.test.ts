import type { AlicizationChatEntryPreDialogueSendIdentity } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'
import type { ChatProvider } from '@xsai-ext/providers/utils'

import { describe, expect, it, vi } from 'vitest'

import { dispatchPocketVoiceTurn } from '../../../../../stage-pocket/src/pages/index.voice'
import { dispatchWebVoiceTurn } from '../../../../../stage-web/src/pages/index.voice'
import { dispatchDesktopVoiceTurn } from '../../../renderer/pages/index.desktop'

const EXCLUDED_CONTINUITY_RESIDUE = 'content=excluded; reason=continuity-residue; visibility=internal-structured'

const preDialogueSendIdentity: AlicizationChatEntryPreDialogueSendIdentity = {
  status: 'partial',
  summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
  companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
  companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
  awarenessLine: 'Before speaking, remember this is still the same digital life project before local fluency takes over.',
  emotionalClosureCue: null,
  reasonPreview: [
    'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    'Some closure has already landed in the primary desktop proving ground before this voice turn opens outward.',
    'Memory, initiative, execution, and embodiment still need stronger same-her continuity across noisier desktop runs.',
  ],
}

function createMockChatProvider(): ChatProvider {
  return {
    chat: model => ({
      baseURL: 'https://example.invalid/v1/',
      model: String(model),
    }),
  }
}

function expectSanitizedPreDialogueSendIdentity(ingest: ReturnType<typeof vi.fn>, origin?: string) {
  expect(ingest).toHaveBeenCalledWith('继续沿着这条数字生命主线推进', expect.objectContaining({
    providerId: 'mock-provider',
    model: 'mock-model',
    chatProvider: expect.objectContaining({
      chat: expect.any(Function),
    }),
    providerConfig: { apiKey: 'test-key' },
    ...(origin ? { origin } : {}),
  }))

  const forwardedIdentity = ingest.mock.calls[0]?.[1]?.preDialogueSendIdentity
  expect(forwardedIdentity).toEqual(expect.objectContaining({
    companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
    companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
    awarenessLine: EXCLUDED_CONTINUITY_RESIDUE,
  }))
  expect(JSON.stringify(forwardedIdentity)).not.toMatch(/Before speaking|same-her|local-first digital life project|one continuous/u)
}

describe('chat entry voice dispatch', () => {
  it('forwards the explicit pre-dialogue send identity through the primary desktop voice entry', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchDesktopVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity,
      origin: 'ui-user',
      ingest,
    })

    expectSanitizedPreDialogueSendIdentity(ingest, 'ui-user')
  })

  it('forwards the explicit pre-dialogue send identity through the primary web voice entry', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchWebVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity,
      ingest,
    })

    expectSanitizedPreDialogueSendIdentity(ingest)
  })

  it('forwards the explicit pre-dialogue send identity through the primary pocket voice entry', async () => {
    const ingest = vi.fn(async () => undefined)

    await dispatchPocketVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity,
      ingest,
    })

    expectSanitizedPreDialogueSendIdentity(ingest)
  })

  it('rejects the desktop voice entry when no explicit pre-dialogue send identity is available before opening outward', async () => {
    const ingest = vi.fn(async () => undefined)

    await expect(dispatchDesktopVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity: null,
      origin: 'ui-user',
      ingest,
    })).rejects.toThrowError('[alicization-chat-entry] dispatchDesktopVoiceTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')

    expect(ingest).not.toHaveBeenCalled()
  })

  it('rejects the web voice entry when no explicit pre-dialogue send identity is available before opening outward', async () => {
    const ingest = vi.fn(async () => undefined)

    await expect(dispatchWebVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity: null,
      ingest,
    })).rejects.toThrowError('[alicization-chat-entry] dispatchWebVoiceTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')

    expect(ingest).not.toHaveBeenCalled()
  })

  it('rejects the pocket voice entry when no explicit pre-dialogue send identity is available before opening outward', async () => {
    const ingest = vi.fn(async () => undefined)

    await expect(dispatchPocketVoiceTurn({
      text: '继续沿着这条数字生命主线推进',
      providerId: 'mock-provider',
      model: 'mock-model',
      chatProvider: createMockChatProvider(),
      providerConfig: { apiKey: 'test-key' },
      preDialogueSendIdentity: null,
      ingest,
    })).rejects.toThrowError('[alicization-chat-entry] dispatchPocketVoiceTurn requires explicit preDialogueSendIdentity before voice dialogue dispatch.')

    expect(ingest).not.toHaveBeenCalled()
  })
})

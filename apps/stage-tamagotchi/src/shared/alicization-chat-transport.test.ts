import type { AlicizationChatStartPayload } from './eventa'

import { describe, expect, it } from 'vitest'

import { sanitizeAlicizationChatStartPayloadForTransport, summarizeAlicizationChatStartPayloadForTransport } from './alicization-chat-transport'

describe('alicization-chat-transport', () => {
  it('sanitizes reactive-like and non-plain chat payloads into structured-clone-safe JSON', () => {
    const providerConfig = new Proxy({
      apiKey: 'secret',
      baseUrl: 'https://api.example.test/v1',
      headers: new Proxy({
        Authorization: 'Bearer secret',
      }, {}),
      extras: new Map<string, unknown>([
        ['temperature', 0.2],
        ['metadata', new Date('2026-03-14T12:00:00.000Z')],
      ]),
      transform: () => 'skip me',
      rawBytes: new Uint8Array([1, 2, 3]),
    }, {})

    const contentPart = new Proxy({
      type: 'text',
      text: 'hello',
      ignored: undefined,
    }, {})

    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-1',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig,
      messages: [
        {
          role: 'system',
          content: [contentPart],
        },
      ],
      supportsTools: true,
      waitForTools: false,
    }

    const result = sanitizeAlicizationChatStartPayloadForTransport(payload)

    expect(result.report.changed).toBe(true)
    expect(result.report.droppedCount).toBeGreaterThan(0)
    expect(result.report.coercedCount).toBeGreaterThan(0)
    expect(result.value.providerConfig).toEqual({
      apiKey: 'secret',
      baseUrl: 'https://api.example.test/v1',
      headers: {
        Authorization: 'Bearer secret',
      },
      extras: {
        temperature: 0.2,
        metadata: '2026-03-14T12:00:00.000Z',
      },
      rawBytes: [1, 2, 3],
    })
    expect(result.value.messages[0]).toEqual({
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'hello',
        },
      ],
    })
    expect(() => structuredClone(result.value)).not.toThrow()
  })

  it('summarizes chat payload shape without leaking provider values', () => {
    const payload: AlicizationChatStartPayload = {
      cardId: 'default',
      turnId: 'turn-2',
      providerId: 'groq',
      model: 'grok-4.1-fast',
      providerConfig: {
        apiKey: 'secret',
        baseUrl: 'https://api.example.test/v1',
      },
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: [{ type: 'text', text: 'world' }] },
      ],
    }

    expect(summarizeAlicizationChatStartPayloadForTransport(payload)).toEqual({
      providerConfigKeys: ['apiKey', 'baseUrl'],
      messageSchema: [
        {
          role: 'user',
          contentKind: 'string',
          hasToolCallId: false,
          hasToolName: false,
        },
        {
          role: 'assistant',
          contentKind: 'array',
          hasToolCallId: false,
          hasToolName: false,
        },
      ],
    })
  })
})

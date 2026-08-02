import type { AlicizationChatStartPayload } from './eventa'

import { describe, expect, it } from 'vitest'

import {
  sanitizeAlicizationChatStartPayloadForTransport,
  summarizeAlicizationChatStartPayloadForTransport,
} from './alicization-chat-transport'

function createPayloadWithUnreadableUnknownField() {
  const payload = {
    cardId: 'default',
    turnId: 'turn-unknown-field',
    providerId: 'openai',
    model: 'gpt-5',
    providerConfig: {
      apiKey: 'secret',
      extras: new Map<string, unknown>([
        ['temperature', 0.2],
        ['metadata', new Date('2026-07-16T12:00:00.000Z')],
      ]),
      transform: () => 'drop me',
    },
    messages: [
      {
        role: 'user',
        content: new Proxy({
          type: 'text',
          text: '继续真实的对话。',
          ignored: undefined,
        }, {}),
      },
    ],
    supportsTools: true,
    waitForTools: false,
  } satisfies AlicizationChatStartPayload

  Object.defineProperty(payload, 'unknownSidecar', {
    enumerable: true,
    get() {
      throw new Error('unknown chat-start fields must not be inspected')
    },
  })

  return payload as AlicizationChatStartPayload
}

function createPayloadWithUnreadableMessageField() {
  const message = {
    role: 'user' as const,
    content: {
      type: 'text',
      text: '只读取当前消息合同。',
    },
  }

  Object.defineProperty(message, 'unknownLegacyMetadata', {
    enumerable: true,
    get() {
      throw new Error('unknown message fields must not be inspected')
    },
  })

  return {
    cardId: 'default',
    turnId: 'turn-unknown-message-field',
    providerId: 'openai',
    model: 'gpt-5',
    providerConfig: {},
    messages: [message],
  } satisfies AlicizationChatStartPayload
}

describe('alicization-chat-transport', () => {
  it('serializes only the current chat-start contract without reading unknown fields', () => {
    const result = sanitizeAlicizationChatStartPayloadForTransport(
      createPayloadWithUnreadableUnknownField(),
    )

    expect(result.value).toEqual({
      cardId: 'default',
      turnId: 'turn-unknown-field',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {
        apiKey: 'secret',
        extras: {
          temperature: 0.2,
          metadata: '2026-07-16T12:00:00.000Z',
        },
      },
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: '继续真实的对话。',
          },
        },
      ],
      supportsTools: true,
      waitForTools: false,
    })
    expect(result.value).not.toHaveProperty('unknownSidecar')
    expect(result.report.changed).toBe(true)
    expect(() => structuredClone(result.value)).not.toThrow()
  })

  it('does not enumerate unknown message fields while sanitizing or summarizing', () => {
    const payload = createPayloadWithUnreadableMessageField()

    expect(sanitizeAlicizationChatStartPayloadForTransport(payload).value).toEqual({
      cardId: 'default',
      turnId: 'turn-unknown-message-field',
      providerId: 'openai',
      model: 'gpt-5',
      providerConfig: {},
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: '只读取当前消息合同。',
        },
      }],
    })
    expect(summarizeAlicizationChatStartPayloadForTransport(payload)).toEqual({
      providerConfigKeys: [],
      messageSchema: [{
        role: 'user',
        contentKind: 'object',
        hasToolCallId: false,
        hasToolName: false,
      }],
    })
  })

  it('summarizes only provider configuration keys and message schema', () => {
    expect(summarizeAlicizationChatStartPayloadForTransport(
      createPayloadWithUnreadableUnknownField(),
    )).toEqual({
      providerConfigKeys: ['apiKey', 'extras', 'transform'],
      messageSchema: [
        {
          role: 'user',
          contentKind: 'object',
          hasToolCallId: false,
          hasToolName: false,
        },
      ],
    })
  })
})

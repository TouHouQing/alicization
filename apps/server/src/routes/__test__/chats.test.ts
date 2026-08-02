import type { ChatService } from '../../services/chats'
import type { HonoEnv } from '../../types/hono'

import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../utils/error'
import { createChatRoutes } from '../chats'

describe('chatRoutes', () => {
  it('drops unsupported top-level context at the browser server stream proxy boundary', async () => {
    let capturedPayload: Record<string, unknown> | null = null
    const chatService = {
      streamChat: vi.fn(async (payload, options) => {
        capturedPayload = payload
        await options.onEvent({ type: 'finish' })
      }),
      syncChat: vi.fn(),
    } as unknown as ChatService

    const routes = createChatRoutes(chatService)
    const app = new Hono<HonoEnv>()

    app.onError((err, c) => {
      if (err instanceof ApiError) {
        return c.json({
          error: err.errorCode,
          message: err.message,
          details: err.details,
        }, err.statusCode)
      }
      return c.json({ error: 'Internal Server Error', message: err.message }, 500)
    })

    app.route('/', routes)

    const response = await app.request('http://localhost/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId: 'default',
        turnId: 'turn-browser-proxy',
        providerId: 'provider-openai',
        model: 'gpt-4o-mini',
        providerConfig: {
          apiKey: 'sk-browser-proxy',
        },
        messages: [
          {
            role: 'user',
            content: '继续把数字生命拟人情绪驱动闭环收完。',
          },
        ],
        unsupportedContext: {
          text: 'must not cross the proxy schema boundary',
        },
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('"type":"finish"')
    expect(chatService.streamChat).toHaveBeenCalledTimes(1)
    expect(capturedPayload).not.toBeNull()
    expect(capturedPayload).toEqual(expect.objectContaining({
      cardId: 'default',
      turnId: 'turn-browser-proxy',
      providerId: 'provider-openai',
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: '继续把数字生命拟人情绪驱动闭环收完。',
      }],
    }))
    expect(capturedPayload).not.toHaveProperty('unsupportedContext')
  })
})

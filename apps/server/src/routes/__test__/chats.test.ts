import type { ChatService } from '../../services/chats'
import type { HonoEnv } from '../../types/hono'

import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../utils/error'
import { createChatRoutes } from '../chats'

describe('chatRoutes', () => {
  it('preserves structured pre-dialogue continuity through the browser server stream proxy boundary', async () => {
    let capturedPayload: {
      preDialogueSendIdentity?: Record<string, unknown> | null
    } | null = null
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
        preDialogueSendIdentity: {
          status: 'grounded',
          summaryLine: 'Structured pre-dialogue continuity is available at the browser proxy boundary.',
          companionBriefingLine: 'The current turn carries project identity, landed progress, and open loop metadata.',
          companionNextClosureLine: 'Keep the proxy payload intact for the downstream chat service.',
          awarenessLine: 'Proxy should forward structured continuity fields without rewriting them.',
          emotionalClosureCue: 'Keep provider-facing reply grounded in the forwarded structured context.',
          reasonPreview: [
            'Browser proxy carries structured continuity before dispatch.',
          ],
          projectState: {
            identity: 'Alicization local runtime project state',
            currentPhase: 'local desktop life loop',
            latestLandedProgress: 'body-face-motion continuity has landed',
            primaryOpenLoop: 'lipsync and voice still need rejoin validation',
            nextClosureTarget: 'preserve structured continuity through browser proxy',
            continuitySummary: 'browser proxy forwards structured continuity before the turn.',
          },
          emotionalKernel: {
            affectLabel: 'calm-resolute',
            socialPosture: 'steady',
          },
        },
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('"type":"finish"')
    expect(chatService.streamChat).toHaveBeenCalledTimes(1)
    expect(capturedPayload).not.toBeNull()
    const capturedPreDialogueSendIdentity = (capturedPayload as any)?.preDialogueSendIdentity
    expect(capturedPreDialogueSendIdentity).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'Structured pre-dialogue continuity is available at the browser proxy boundary.',
      companionBriefingLine: 'The current turn carries project identity, landed progress, and open loop metadata.',
      awarenessLine: 'Proxy should forward structured continuity fields without rewriting them.',
      companionNextClosureLine: 'Keep the proxy payload intact for the downstream chat service.',
      emotionalClosureCue: 'Keep provider-facing reply grounded in the forwarded structured context.',
      reasonPreview: [
        'Browser proxy carries structured continuity before dispatch.',
      ],
      projectState: expect.objectContaining({
        identity: 'Alicization local runtime project state',
        currentPhase: 'local desktop life loop',
        latestLandedProgress: 'body-face-motion continuity has landed',
        primaryOpenLoop: 'lipsync and voice still need rejoin validation',
        nextClosureTarget: 'preserve structured continuity through browser proxy',
        continuitySummary: 'browser proxy forwards structured continuity before the turn.',
      }),
      emotionalKernel: expect.objectContaining({
        affectLabel: 'calm-resolute',
        socialPosture: 'steady',
      }),
    }))
  })
})

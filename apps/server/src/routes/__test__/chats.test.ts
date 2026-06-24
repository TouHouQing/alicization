import type { ChatService } from '../../services/chats'
import type { HonoEnv } from '../../types/hono'

import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../utils/error'
import { createChatRoutes } from '../chats'

describe('chatRoutes', () => {
  it('preserves pre-dialogue project awareness through the browser server stream proxy boundary instead of stripping same-her carry at the remote transport schema seam', async () => {
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
          summaryLine: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          companionBriefingLine: 'Phase 1 is still active, some closure has landed, and the still-open life loop remains memory, initiative, execution, and embodiment coherence.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof before the answer widens outward.',
          awarenessLine: 'Before answering, remember this is still one living digital life project and keep the same-her line explicit.',
          emotionalClosureCue: 'Keep the return low-pressure and same-her continuous.',
          reasonPreview: [
            'same-her continuity stays explicit before widening outward.',
          ],
          projectState: {
            identity: 'Alicization is a local-first digital life project',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'body-face-motion continuity has landed',
            primaryOpenLoop: 'lipsync and voice still need to rejoin the same living line',
            nextClosureTarget: 'close cross-modal same-her proof',
            continuitySummary: 'same-her continuity is explicit before the turn.',
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
      summaryLine: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      companionBriefingLine: 'Phase 1 is still active, some closure has landed, and the still-open life loop remains memory, initiative, execution, and embodiment coherence.',
      awarenessLine: 'Before answering, remember this is still one living digital life project and keep the same-her line explicit.',
      companionNextClosureLine: 'Keep extending cross-modal same-her proof before the answer widens outward.',
      emotionalClosureCue: 'Keep the return low-pressure and same-her continuous.',
      reasonPreview: [
        'same-her continuity stays explicit before widening outward.',
      ],
      projectState: expect.objectContaining({
        identity: 'Alicization is a local-first digital life project',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'body-face-motion continuity has landed',
        primaryOpenLoop: 'lipsync and voice still need to rejoin the same living line',
        nextClosureTarget: 'close cross-modal same-her proof',
        continuitySummary: 'same-her continuity is explicit before the turn.',
      }),
      emotionalKernel: expect.objectContaining({
        affectLabel: 'calm-resolute',
        socialPosture: 'steady',
      }),
    }))
  })
})

import type { ChatService } from '../services/chats'
import type { HonoEnv } from '../types/hono'

import { errorMessageFrom } from '@moeru/std'
import { Hono } from 'hono'
import { safeParse } from 'valibot'

import { ChatStreamSchema, ChatSyncSchema } from '../api/chats.schema'
import { authGuard } from '../middlewares/auth'
import { createBadRequestError } from '../utils/error'

export function createChatRoutes(chatService: ChatService) {
  return new Hono<HonoEnv>()
    .post('/stream', async (c) => {
      const body = await c.req.json()
      const result = safeParse(ChatStreamSchema, body)

      if (!result.success)
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const write = (event: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
          }

          void chatService.streamChat(result.output, {
            signal: c.req.raw.signal,
            onEvent: async event => write(event as Record<string, unknown>),
          })
            .catch((error) => {
              write({
                type: 'error',
                error: {
                  message: errorMessageFrom(error) ?? String(error),
                },
              })
            })
            .finally(() => {
              controller.close()
            })
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      })
    })
    .post('/sync', authGuard, async (c) => {
      const user = c.get('user')!

      const body = await c.req.json()
      const result = safeParse(ChatSyncSchema, body)

      if (!result.success)
        throw createBadRequestError('Invalid Request', 'INVALID_REQUEST', result.issues)

      const synced = await chatService.syncChat(user.id, result.output)
      return c.json(synced)
    })
}

import type { Database } from '../libs/db'

import { errorMessageFrom } from '@moeru/std'
import { createOpenAI } from '@xsai-ext/providers/create'
import { streamText } from '@xsai/stream-text'
import { and, eq, inArray, sql } from 'drizzle-orm'

import { createConflictError, createForbiddenError } from '../utils/error'

import * as schema from '../schemas/chats'

type ChatType = 'private' | 'bot' | 'group' | 'channel'
type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'error'
type ChatMemberType = 'user' | 'character' | 'bot'

interface SyncChatMessagePayload {
  id: string
  role: MessageRole
  content: string
  createdAt?: number
}

interface SyncChatMemberPayload {
  type: ChatMemberType
  userId?: string
  characterId?: string
}

interface SyncChatPayload {
  chat: {
    id: string
    type?: ChatType
    title?: string
    createdAt?: number
    updatedAt?: number
  }
  members?: SyncChatMemberPayload[]
  messages: SyncChatMessagePayload[]
}

interface StreamChatMessagePayload {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: unknown
  toolCallId?: string
  toolName?: string
}

interface StreamChatPreDialogueSendIdentityPayload {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  emotionalClosureCue?: string | null
  projectState?: Record<string, unknown> | null
  emotionalKernel?: Record<string, unknown> | null
  reasonPreview: string[]
}

interface StreamChatPayload {
  cardId?: string
  turnId: string
  providerId: string
  model: string
  providerConfig?: Record<string, unknown>
  messages: StreamChatMessagePayload[]
  supportsTools?: boolean
  waitForTools?: boolean
  preDialogueSendIdentity?: StreamChatPreDialogueSendIdentityPayload | null
}

type StreamChatEvent
  = | { type: 'text-delta', text: string }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | ({ type: 'finish' } & Record<string, unknown>)

type NormalizedStreamMessage
  = | { role: 'tool', content: any, tool_call_id: string }
    | { role: 'system' | 'user' | 'assistant', content: any }

interface StreamChatOptions {
  signal?: AbortSignal
  onEvent: (event: StreamChatEvent) => Promise<void> | void
}

function resolveSenderId(role: MessageRole, userId: string, characterId?: string) {
  if (role === 'user')
    return userId
  return characterId ?? role
}

function pickCharacterId(members: SyncChatMemberPayload[] | undefined) {
  return members?.find(member => member.type === 'character' && member.characterId)?.characterId
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  const trimmed = raw.trim()
  return trimmed || fallback
}

function normalizeProviderConfig(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return {} as Record<string, unknown>
  return raw as Record<string, unknown>
}

function normalizeRequestHeaders(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return undefined

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')

  return entries.length > 0
    ? Object.fromEntries(entries)
    : undefined
}

function normalizeStreamMessageContent(content: unknown) {
  if (typeof content === 'string')
    return content

  return JSON.stringify(content ?? '')
}

function resolveStreamMessages(messages: StreamChatMessagePayload[]): NormalizedStreamMessage[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool' as const,
        content: normalizeStreamMessageContent(message.content),
        tool_call_id: sanitizeText(message.toolCallId),
      }
    }

    return {
      role: message.role,
      content: normalizeStreamMessageContent(message.content),
    }
  })
}

export function createChatService(db: Database) {
  return {
    async syncChat(userId: string, payload: SyncChatPayload) {
      return await db.transaction(async (tx) => {
        const now = new Date()
        const chatId = payload.chat.id
        const members = payload.members ?? []
        const characterId = pickCharacterId(members)

        const existingChat = await tx.query.chats.findFirst({
          where: eq(schema.chats.id, chatId),
        })

        if (existingChat) {
          const member = await tx.query.chatMembers.findFirst({
            where: and(
              eq(schema.chatMembers.chatId, chatId),
              eq(schema.chatMembers.memberType, 'user'),
              eq(schema.chatMembers.userId, userId),
            ),
          })

          if (!member)
            throw createForbiddenError()
        }

        if (!existingChat) {
          await tx.insert(schema.chats).values({
            id: chatId,
            type: payload.chat.type ?? 'group',
            title: payload.chat.title,
            createdAt: payload.chat.createdAt ? new Date(payload.chat.createdAt) : now,
            updatedAt: payload.chat.updatedAt ? new Date(payload.chat.updatedAt) : now,
          })
        }
        else {
          const updates: Partial<schema.NewChat> = {
            updatedAt: payload.chat.updatedAt ? new Date(payload.chat.updatedAt) : now,
          }

          if (payload.chat.type)
            updates.type = payload.chat.type
          if (payload.chat.title !== undefined)
            updates.title = payload.chat.title

          await tx.update(schema.chats)
            .set(updates)
            .where(eq(schema.chats.id, chatId))
        }

        const desiredMembers: SyncChatMemberPayload[] = [
          { type: 'user', userId },
          ...members.filter(member => member.type !== 'user'),
        ]

        for (const member of desiredMembers) {
          if (member.type === 'user' && !member.userId)
            continue
          if (member.type === 'character' && !member.characterId)
            continue

          const existingMember = await tx.query.chatMembers.findFirst({
            where: and(
              eq(schema.chatMembers.chatId, chatId),
              eq(schema.chatMembers.memberType, member.type),
              member.type === 'user'
                ? eq(schema.chatMembers.userId, member.userId!)
                : eq(schema.chatMembers.characterId, member.characterId!),
            ),
          })

          if (!existingMember) {
            await tx.insert(schema.chatMembers).values({
              chatId,
              memberType: member.type,
              userId: member.type === 'user' ? member.userId : null,
              characterId: member.type === 'character' ? member.characterId : null,
            })
          }
        }

        if (payload.messages.length > 0) {
          const messageIds = payload.messages.map(m => m.id)
          const existingMessages = await tx
            .select({ id: schema.messages.id, chatId: schema.messages.chatId })
            .from(schema.messages)
            .where(inArray(schema.messages.id, messageIds))

          const conflicting = existingMessages.find(m => m.chatId !== chatId)
          if (conflicting)
            throw createConflictError('Message already belongs to another chat')

          await tx.insert(schema.messages)
            .values(payload.messages.map(message => ({
              id: message.id,
              chatId,
              senderId: resolveSenderId(message.role, userId, characterId),
              role: message.role,
              content: message.content,
              mediaIds: [] as string[],
              stickerIds: [] as string[],
              createdAt: message.createdAt ? new Date(message.createdAt) : now,
              updatedAt: now,
            })))
            .onConflictDoUpdate({
              target: schema.messages.id,
              set: {
                senderId: sql`excluded.sender_id`,
                role: sql`excluded.role`,
                content: sql`excluded.content`,
                updatedAt: sql`excluded.updated_at`,
              },
            })
        }

        return { chatId }
      })
    },
    async streamChat(payload: StreamChatPayload, options: StreamChatOptions) {
      const providerId = sanitizeText(payload.providerId)
      const model = sanitizeText(payload.model)
      if (!providerId || !model) {
        throw new Error('Missing providerId/model for chat stream.')
      }

      const providerConfig = normalizeProviderConfig(payload.providerConfig)
      const apiKey = sanitizeText(providerConfig.apiKey)
      const baseUrlRaw = sanitizeText(providerConfig.baseUrl ?? providerConfig.baseURL, 'https://api.openai.com/v1')
      const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`
      const requestHeaders = normalizeRequestHeaders(providerConfig.headers)

      if (!apiKey) {
        throw new Error('Missing API key for chat stream.')
      }

      const provider = createOpenAI(apiKey, baseUrl)
      const chatConfig = provider.chat(model)

      return await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = () => {
          if (settled)
            return
          settled = true
          resolve()
        }
        const fail = (error: unknown) => {
          if (settled)
            return
          settled = true
          reject(error)
        }

        if (options.signal?.aborted) {
          fail(options.signal.reason ?? new DOMException('Aborted', 'AbortError'))
          return
        }

        const abortHandler = () => {
          fail(options.signal?.reason ?? new DOMException('Aborted', 'AbortError'))
        }

        options.signal?.addEventListener('abort', abortHandler, { once: true })

        void Promise.resolve(streamText({
          ...chatConfig,
          maxSteps: 10,
          messages: resolveStreamMessages(payload.messages),
          headers: requestHeaders,
          abortSignal: options.signal,
          onEvent: async (event: any) => {
            try {
              switch (event?.type) {
                case 'text-delta':
                  await options.onEvent({ type: 'text-delta', text: String(event.text ?? '') })
                  break
                case 'tool-call':
                  await options.onEvent({
                    type: 'tool-call',
                    toolCallId: sanitizeText(event.toolCallId),
                    toolName: sanitizeText(event.toolName ?? event.name),
                    args: typeof event.args === 'string'
                      ? event.args
                      : JSON.stringify(event.args ?? event.arguments ?? {}),
                    toolCallType: 'function',
                  })
                  break
                case 'tool-result':
                  await options.onEvent({
                    type: 'tool-result',
                    toolCallId: sanitizeText(event.toolCallId),
                    result: event.result,
                  })
                  break
                case 'finish':
                  await options.onEvent({
                    type: 'finish',
                    finishReason: sanitizeText(event.finishReason),
                    usage: event.usage ?? undefined,
                  })
                  finish()
                  break
                case 'error':
                  fail(event.error ?? new Error('Stream error'))
                  break
                default:
                  break
              }
            }
            catch (error) {
              fail(error)
            }
          },
        }))
          .catch((error) => {
            fail(new Error(errorMessageFrom(error) ?? String(error)))
          })
          .finally(() => {
            options.signal?.removeEventListener('abort', abortHandler)
          })
      })
    },
  }
}

export type ChatService = ReturnType<typeof createChatService>

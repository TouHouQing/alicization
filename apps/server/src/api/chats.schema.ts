import { array, boolean, literal, number, object, optional, record, string, union, unknown } from 'valibot'

const ChatTypeSchema = union([
  literal('private'),
  literal('bot'),
  literal('group'),
  literal('channel'),
])

const ChatMemberTypeSchema = union([
  literal('user'),
  literal('character'),
  literal('bot'),
])

const ChatMessageRoleSchema = union([
  literal('system'),
  literal('user'),
  literal('assistant'),
  literal('tool'),
  literal('error'),
])

export const ChatSyncMessageSchema = object({
  id: string(),
  role: ChatMessageRoleSchema,
  content: string(),
  createdAt: optional(number()),
})

export const ChatSyncSchema = object({
  chat: object({
    id: string(),
    type: optional(ChatTypeSchema),
    title: optional(string()),
    createdAt: optional(number()),
    updatedAt: optional(number()),
  }),
  members: optional(array(object({
    type: ChatMemberTypeSchema,
    userId: optional(string()),
    characterId: optional(string()),
  }))),
  messages: array(ChatSyncMessageSchema),
})

export const ChatStreamMessageSchema = object({
  role: union([
    literal('system'),
    literal('user'),
    literal('assistant'),
    literal('tool'),
  ]),
  content: unknown(),
  toolCallId: optional(string()),
  toolName: optional(string()),
})

export const ChatStreamSchema = object({
  cardId: optional(string()),
  turnId: string(),
  providerId: string(),
  model: string(),
  providerConfig: optional(record(string(), unknown())),
  messages: array(ChatStreamMessageSchema),
  supportsTools: optional(boolean()),
  waitForTools: optional(boolean()),
})

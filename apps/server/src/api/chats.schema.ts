import { array, boolean, literal, nullable, number, object, optional, record, string, union, unknown } from 'valibot'

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

const NullableStringSchema = nullable(string())
const NullableUnknownRecordSchema = nullable(record(string(), unknown()))

const ChatStreamPreDialogueSendIdentitySchema = object({
  status: union([
    literal('grounded'),
    literal('partial'),
    literal('drift'),
  ]),
  summaryLine: NullableStringSchema,
  companionHeadlineLine: optional(NullableStringSchema),
  companionBriefingLine: optional(NullableStringSchema),
  companionNextClosureLine: optional(NullableStringSchema),
  awarenessLine: optional(NullableStringSchema),
  emotionalClosureCue: optional(NullableStringSchema),
  projectState: optional(NullableUnknownRecordSchema),
  emotionalKernel: optional(NullableUnknownRecordSchema),
  reasonPreview: array(string()),
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
  preDialogueSendIdentity: optional(nullable(ChatStreamPreDialogueSendIdentitySchema)),
})

import type { ChatAssistantMessage, ChatHistoryItem } from '../../../types/chat'

import { chatMessageIdentity, orderChatMessagesByTurn } from '../../../stores/chat/message-identity'

/** Durable replay owns history; the active cursor owns this turn's visible text. */
export function projectChatHistory(messages: ChatHistoryItem[], streaming: ChatAssistantMessage & { id?: string, createdAt?: number }, sending: boolean): ChatHistoryItem[] {
  messages = messages.map((message) => {
    if (message.role !== 'assistant' || !message.delivery)
      return message
    const text = message.delivery.visibleText
    return { ...message, content: text, slices: [...message.slices.filter(slice => slice.type !== 'text'), { type: 'text' as const, text }] }
  })
  if (!sending || streaming.createdAt == null)
    return orderChatMessagesByTurn(messages)
  const streamId = chatMessageIdentity(streaming.id)
  let inserted = false
  const projected: ChatHistoryItem[] = []
  for (const message of messages) {
    const sameTurn = message.role === 'assistant' && (streamId
      ? chatMessageIdentity(message.id) === streamId
      : message.createdAt === streaming.createdAt)
    if (!sameTurn) {
      projected.push(message)
    }
    else if (!inserted) {
      // Main-process persistence can finish before visual presentation. Never
      // expose its full reply or add a second bubble beside the active prefix.
      const liveTools = streaming.slices.filter(slice => slice.type !== 'text')
      projected.push({ ...message, ...streaming, id: streamId || message.id, slices: [...(liveTools.length ? liveTools : message.slices.filter(slice => slice.type !== 'text')), ...streaming.slices.filter(slice => slice.type === 'text')] })
      inserted = true
    }
  }
  if (!inserted)
    projected.push(streaming)
  return orderChatMessagesByTurn(projected)
}

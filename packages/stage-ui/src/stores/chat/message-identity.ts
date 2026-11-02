/** Gateway retries keep the logical turn identity across live and durable views. */
import type { ChatHistoryItem, StreamingAssistantMessage } from '../../types/chat'

export function chatMessageIdentity(id: unknown): string {
  return typeof id === 'string' ? id.replace(/:gw\d+(?=:user$|$)/u, '') : ''
}

/** A replayed prompt and its live reply can carry different clock samples. */
export function orderChatMessagesByTurn(messages: ChatHistoryItem[]): ChatHistoryItem[] {
  const promptIdentity = (message: ChatHistoryItem) => {
    const id = chatMessageIdentity(message.id)
    return message.role === 'user' && id.endsWith(':user') ? id.slice(0, -5) : ''
  }
  const pendingPrompts = new Set(messages.map(promptIdentity).filter(Boolean))
  if (!pendingPrompts.size)
    return messages
  const deferred = new Map<string, ChatHistoryItem[]>()
  const ordered: ChatHistoryItem[] = []
  let changed = false
  for (const message of messages) {
    const id = chatMessageIdentity(message.id)
    if (message.role === 'assistant' && pendingPrompts.has(id)) {
      const replies = deferred.get(id) ?? []
      replies.push(message)
      deferred.set(id, replies)
      changed = true
      continue
    }
    ordered.push(message)
    const prompt = promptIdentity(message)
    if (prompt) {
      pendingPrompts.delete(prompt)
      ordered.push(...(deferred.get(prompt) ?? []))
      deferred.delete(prompt)
    }
  }
  // Only exact turn identity adds a causal edge. Unrelated messages keep their
  // existing order, and original timestamps, visible prefixes and tool facts
  // remain intact. A pairwise timestamp exception would make sorting cyclic.
  return changed ? ordered : messages
}

export function upsertChatAssistantMessage(messages: ChatHistoryItem[], message: StreamingAssistantMessage) {
  const identity = chatMessageIdentity(message.id)
  const index = identity ? messages.findIndex(item => item.role === 'assistant' && chatMessageIdentity(item.id) === identity) : -1
  const existing = messages[index]
  if (existing?.role === 'assistant') {
    const tools = message.slices.filter(slice => slice.type !== 'text')
    messages.splice(index, 1, { ...existing, ...message, slices: [...(tools.length ? tools : existing.slices.filter(slice => slice.type !== 'text')), ...message.slices.filter(slice => slice.type === 'text')], tool_results: message.tool_results.length ? message.tool_results : existing.tool_results })
  }
  else {
    messages.push(message)
  }
}

export function interruptChatAssistantMessage(message: StreamingAssistantMessage, text: string, reason: 'cancelled' | 'failed'): StreamingAssistantMessage {
  return {
    ...message,
    content: text,
    slices: [...message.slices.filter(slice => slice.type !== 'text'), { type: 'text', text }],
    delivery: { status: 'interrupted', reason, visibleText: text },
    categorization: { speech: '', reasoning: '' },
    structured: { format: 'fallback-v1', thought: '', emotion: 'neutral', reply: text, contractFailed: true, origin: 'provider', learningPolicy: { allowLongTermCondensation: false, allowPersonaLearning: false, allowTraining: false }, excludeFromMemoryCondensation: true, excludeFromPersonaLearning: true },
  }
}

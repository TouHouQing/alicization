import type { StreamingAssistantMessage } from '../../types/chat'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { chatMessageIdentity, interruptChatAssistantMessage, upsertChatAssistantMessage } from './message-identity'
import { useChatSessionStore } from './session-store'

export const useChatStreamStore = defineStore('chat-stream', () => {
  const chatSession = useChatSessionStore()
  const streamingMessage = ref<StreamingAssistantMessage>({ role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now() })

  function beginStream(id?: string) {
    streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now(), id }
  }

  function appendStreamLiteral(literal: string) {
    streamingMessage.value.content += literal

    const lastSlice = streamingMessage.value.slices.at(-1)
    if (lastSlice?.type === 'text') {
      lastSlice.text += literal
      return
    }

    streamingMessage.value.slices.push({
      type: 'text',
      text: literal,
    })
  }

  function finalizeStream(fullText?: string) {
    if (streamingMessage.value.createdAt == null)
      return
    const sessionId = chatSession.activeSessionId
    const sessionMessagesForSend = chatSession.getSessionMessages(sessionId)
    if (streamingMessage.value.slices.length > 0 || fullText) {
      const stream = streamingMessage.value
      if (fullText) {
        stream.content = fullText
        stream.slices = [...stream.slices.filter(slice => slice.type !== 'text'), { type: 'text', text: fullText }]
      }
      const id = chatMessageIdentity(stream.id)
      const existing = id ? sessionMessagesForSend.findIndex(message => message.role === 'assistant' && chatMessageIdentity(message.id) === id) : -1
      const existingMessage = sessionMessagesForSend[existing]
      if (existing >= 0 && existingMessage?.role === 'assistant')
        sessionMessagesForSend.splice(existing, 1, { ...existingMessage, content: stream.content, slices: [...existingMessage.slices.filter(slice => slice.type !== 'text'), ...stream.slices.filter(slice => slice.type === 'text')] })
      else
        sessionMessagesForSend.push(stream)
    }
    chatSession.persistSessionMessages(sessionId)
    streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [] }
  }

  function resetStream() {
    streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [] }
  }

  function interruptStream(reason: string) {
    const stream = streamingMessage.value
    const text = typeof stream.content === 'string' ? stream.content : ''
    if (text) {
      const interrupted = interruptChatAssistantMessage(stream, text, reason === 'provider-failed' ? 'failed' : 'cancelled')
      upsertChatAssistantMessage(chatSession.getSessionMessages(chatSession.activeSessionId), interrupted)
      chatSession.persistSessionMessages(chatSession.activeSessionId)
    }
    resetStream()
  }

  return {
    streamingMessage,
    beginStream,
    appendStreamLiteral,
    finalizeStream,
    resetStream,
    interruptStream,
  }
})

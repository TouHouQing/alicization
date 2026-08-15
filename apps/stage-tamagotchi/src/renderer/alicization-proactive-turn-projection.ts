import type { ChatHistoryItem } from '@proj-alicization/stage-ui/types/chat'

import {
  replaceChatAssistantTextPreservingToolProjection,
} from '@proj-alicization/stage-ui/stores/chat-tool-projection'

type AssistantMessage = Extract<ChatHistoryItem, { role: 'assistant' }>

export function refreshAlicizationProactiveAssistantMessage(
  message: AssistantMessage,
  input: {
    assistantText: string
    createdAt: number
    structured: AssistantMessage['structured']
    reasoning: string
  },
) {
  replaceChatAssistantTextPreservingToolProjection(message, input.assistantText)
  message.createdAt = input.createdAt
  message.origin = 'subconscious-proactive'
  message.structured = input.structured
  message.categorization = {
    speech: input.assistantText,
    reasoning: input.reasoning,
  }
}

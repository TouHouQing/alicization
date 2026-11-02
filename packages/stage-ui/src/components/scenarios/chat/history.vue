<script setup lang="ts">
import type { ChatAssistantMessage, ChatHistoryItem, ChatRecoveryAction, ContextMessage } from '../../../types/chat'

import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ChatAssistantItem from './assistant-item.vue'
import ChatErrorItem from './error-item.vue'
import ChatUserItem from './user-item.vue'

import { chatMessageIdentity } from '../../../stores/chat/message-identity'
import { projectChatHistory } from './history-projection'

const props = withDefaults(defineProps<{
  messages: ChatHistoryItem[]
  streamingMessage?: ChatAssistantMessage & { createdAt?: number }
  sending?: boolean
  assistantLabel?: string
  userLabel?: string
  errorLabel?: string
  variant?: 'desktop' | 'mobile'
  onRecoveryAction?: (action: ChatRecoveryAction) => void | Promise<void>
}>(), {
  sending: false,
  variant: 'desktop',
})

const chatHistoryRef = ref<HTMLDivElement>()

const { t } = useI18n()
const labels = computed(() => ({
  assistant: props.assistantLabel ?? t('stage.chat.message.character-name.airi'),
  user: props.userLabel ?? t('stage.chat.message.character-name.you'),
  error: props.errorLabel ?? t('stage.chat.message.character-name.core-system'),
}))

function scrollToBottom() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!chatHistoryRef.value)
        return

      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
    })
  })
}

watch([() => props.messages, () => props.streamingMessage], scrollToBottom, { deep: true, flush: 'post' })
watch(() => props.sending, scrollToBottom, { flush: 'post' })
onMounted(scrollToBottom)

const streaming = computed<ChatAssistantMessage & { context?: ContextMessage } & { createdAt?: number }>(() => props.streamingMessage ?? { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now() })
const showStreamingPlaceholder = computed(() => (streaming.value.slices?.length ?? 0) === 0 && !streaming.value.content)
const streamingTs = computed(() => streaming.value?.createdAt)
const streamingMessageId = computed(() => (streaming.value as ChatHistoryItem | undefined)?.id)

function getMessageRenderKey(message: ChatHistoryItem, index: number) {
  if (message.id)
    return chatMessageIdentity(message.id)
  if (message.context?.id)
    return message.context.id
  return `${message.role ?? 'unknown'}:${message.createdAt ?? 0}:${index}`
}

function shouldShowPlaceholder(message: ChatHistoryItem) {
  const streamId = streamingMessageId.value
  if (streamId)
    return chatMessageIdentity(message.id) === chatMessageIdentity(streamId)

  const ts = streamingTs.value
  if (ts == null)
    return false

  return message.context?.createdAt === ts || message.createdAt === ts
}
const renderMessages = computed(() => projectChatHistory(props.messages, streaming.value, props.sending))
</script>

<template>
  <div ref="chatHistoryRef" v-auto-animate flex="~ col" relative h-full w-full overflow-y-auto rounded-xl px="<sm:2" py="<sm:2" :class="variant === 'mobile' ? 'gap-1' : 'gap-2'">
    <template v-for="(message, index) in renderMessages" :key="getMessageRenderKey(message, index)">
      <div v-if="message.role === 'error'" data-chat-message-role="error">
        <ChatErrorItem
          :message="message"
          :label="labels.error"
          :show-placeholder="sending && index === renderMessages.length - 1"
          :variant="variant"
        />
      </div>

      <div v-else-if="message.role === 'assistant'" data-chat-message-role="assistant" :data-chat-message-id="chatMessageIdentity(message.id)" :data-chat-artifact-origin="message.structured?.origin" :data-chat-contract-failed="message.structured?.contractFailed === true">
        <ChatAssistantItem
          :message="message"
          :label="labels.assistant"
          :show-placeholder="shouldShowPlaceholder(message) && showStreamingPlaceholder"
          :variant="variant"
          :on-recovery-action="onRecoveryAction"
        />
      </div>

      <div v-else-if="message.role === 'user'" data-chat-message-role="user" :data-chat-message-id="chatMessageIdentity(message.id)">
        <ChatUserItem
          :message="message"
          :label="labels.user"
          :variant="variant"
        />
      </div>
    </template>
  </div>
</template>

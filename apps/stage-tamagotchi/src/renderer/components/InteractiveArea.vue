<script setup lang="ts">
import type { ChatHistoryItem } from '@proj-alicization/stage-ui/types/chat'
import type { ChatProvider } from '@xsai-ext/providers/utils'

import { ChatHistory } from '@proj-alicization/stage-ui/components'
import { useChatReplyAbort } from '@proj-alicization/stage-ui/composables'
import { useChatOrchestratorStore } from '@proj-alicization/stage-ui/stores/chat'
import { useChatSessionStore } from '@proj-alicization/stage-ui/stores/chat/session-store'
import { useChatStreamStore } from '@proj-alicization/stage-ui/stores/chat/stream-store'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { BasicTextarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { widgetsTools } from '../stores/tools/builtin/widgets'

const messageInput = ref('')
const attachments = ref<{ type: 'image', data: string, mimeType: string, url: string }[]>([])

const chatOrchestrator = useChatOrchestratorStore()
const chatSession = useChatSessionStore()
const chatStream = useChatStreamStore()
const { sending, aborting, abortReply } = useChatReplyAbort()
const { ingest, onAfterMessageComposed, discoverToolsCompatibility } = chatOrchestrator
const { messages } = storeToRefs(chatSession)
const { streamingMessage } = storeToRefs(chatStream)
const { t } = useI18n()
const providersStore = useProvidersStore()
const { activeModel, activeProvider } = storeToRefs(useConsciousnessStore())
const isComposing = ref(false)

async function handleSend() {
  if (isComposing.value || sending.value) {
    return
  }

  if (!messageInput.value.trim() && !attachments.value.length) {
    return
  }

  const textToSend = messageInput.value
  const attachmentsToSend = attachments.value.map(att => ({ ...att }))

  // optimistic clear
  messageInput.value = ''
  attachments.value = []

  try {
    const providerConfig = providersStore.getProviderConfig(activeProvider.value)
    await ingest(textToSend, {
      model: activeModel.value,
      chatProvider: await providersStore.getProviderInstance<ChatProvider>(activeProvider.value),
      providerConfig,
      attachments: attachmentsToSend,
      tools: widgetsTools,
      origin: 'ui-user',
    })

    attachmentsToSend.forEach(att => URL.revokeObjectURL(att.url))
  }
  catch (error) {
    // restore on failure
    messageInput.value = textToSend
    attachments.value = attachmentsToSend.map(att => ({
      ...att,
      url: URL.createObjectURL(new Blob([Uint8Array.from(atob(att.data), c => c.charCodeAt(0))], { type: att.mimeType })),
    }))
    console.error('Failed to send chat message:', error)
  }
}

async function handleFilePaste(files: File[]) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string)?.split(',')[1]
        if (base64Data) {
          attachments.value.push({
            type: 'image' as const,
            data: base64Data,
            mimeType: file.type,
            url: URL.createObjectURL(file),
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }
}

function removeAttachment(index: number) {
  const attachment = attachments.value[index]
  if (attachment) {
    URL.revokeObjectURL(attachment.url)
    attachments.value.splice(index, 1)
  }
}

watch([activeProvider, activeModel], async () => {
  if (activeProvider.value && activeModel.value) {
    await discoverToolsCompatibility(activeModel.value, await providersStore.getProviderInstance<ChatProvider>(activeProvider.value), [])
  }
}, { immediate: true })

const disposeAfterMessageComposed = onAfterMessageComposed(async () => {
  messageInput.value = ''
  attachments.value.forEach(att => URL.revokeObjectURL(att.url))
  attachments.value = []
})
onUnmounted(() => {
  disposeAfterMessageComposed?.()
})

const historyMessages = computed(() => messages.value as unknown as ChatHistoryItem[])
</script>

<template>
  <div h-full w-full flex="~ col gap-1">
    <div w-full flex-1 overflow-hidden>
      <ChatHistory
        :messages="historyMessages"
        :sending="sending"
        :streaming-message="streamingMessage"
      />
    </div>
    <div v-if="attachments.length > 0" class="flex flex-wrap gap-2 border-t border-primary-100 p-2">
      <div v-for="(attachment, index) in attachments" :key="index" class="relative">
        <img :src="attachment.url" class="h-20 w-20 rounded-md object-cover">
        <button class="absolute right-1 top-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-xs text-white" @click="removeAttachment(index)">
          &times;
        </button>
      </div>
    </div>
    <div class="relative w-full shrink-0">
      <BasicTextarea
        v-model="messageInput"
        :placeholder="t('stage.message')"
        class="ph-no-capture"
        text="primary-600 dark:primary-100  placeholder:primary-500 dark:placeholder:primary-200"
        border="solid 2 primary-200/20 dark:primary-400/20"
        bg="primary-100/50 dark:primary-900/70"
        max-h="[10lh]" min-h="[1lh]"
        w-full shrink-0 resize-none overflow-y-scroll rounded-xl p-2 font-medium outline-none
        transition="all duration-250 ease-in-out placeholder:all placeholder:duration-250 placeholder:ease-in-out"
        :class="[
          sending ? 'pb-12 pr-12' : '',
        ]"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @keydown.enter.exact.prevent="handleSend"
        @paste-file="handleFilePaste"
      />

      <button
        v-if="sending"
        type="button"
        class="absolute bottom-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-primary-500 text-white shadow-md outline-none transition-all duration-200 active:scale-95"
        :title="t('stage.dialogue.stop-reply')"
        :aria-label="t('stage.dialogue.stop-reply')"
        :disabled="aborting"
        :class="[
          aborting ? 'cursor-wait opacity-70' : 'hover:bg-primary-600',
        ]"
        @click="abortReply"
      >
        <div class="i-solar:stop-circle-linear h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

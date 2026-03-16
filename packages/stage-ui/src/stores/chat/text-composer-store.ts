import type { ChatProvider } from '@xsai-ext/providers/utils'

import { errorMessageFrom } from '@moeru/std'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { useChatOrchestratorStore } from '../chat'
import { useConsciousnessStore } from '../modules/consciousness'
import { useProvidersStore } from '../providers'
import { useChatSessionStore } from './session-store'

export const useChatTextComposerStore = defineStore('chat-text-composer', () => {
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()
  const chatOrchestrator = useChatOrchestratorStore()
  const chatSession = useChatSessionStore()

  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
  const { messages } = storeToRefs(chatSession)
  const { sending } = storeToRefs(chatOrchestrator)

  const draft = ref('')
  const isComposing = ref(false)

  const resolvedProviderId = computed(() => activeProvider.value?.trim() ?? '')
  const resolvedModelId = computed(() => activeModel.value?.trim() ?? '')

  function setDraft(value: string) {
    draft.value = value
  }

  function appendDraft(value: string) {
    draft.value += value
  }

  function clearDraft() {
    draft.value = ''
  }

  async function sendCurrentMessage() {
    if (isComposing.value || sending.value)
      return false

    const providerId = resolvedProviderId.value
    const modelId = resolvedModelId.value
    const rawDraft = draft.value
    const textToSend = rawDraft.trim()

    if (!textToSend || !providerId || !modelId)
      return false

    draft.value = ''

    try {
      const providerConfig = providersStore.getProviderConfig(providerId)
      await chatOrchestrator.ingest(rawDraft, {
        chatProvider: await providersStore.getProviderInstance(providerId) as ChatProvider,
        model: modelId,
        providerConfig,
      })
      return true
    }
    catch (error) {
      draft.value = rawDraft
      messages.value.pop()
      messages.value.push({
        role: 'error',
        content: errorMessageFrom(error) ?? 'Failed to send message.',
      })
      return false
    }
  }

  return {
    draft,
    isComposing,
    sending,
    resolvedProviderId,
    resolvedModelId,
    setDraft,
    appendDraft,
    clearDraft,
    sendCurrentMessage,
  }
})

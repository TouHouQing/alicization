import type { ChatProvider } from '@xsai-ext/providers/utils'

import { errorMessageFrom } from '@moeru/std'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import { useAlicizationSelfEvolutionInspectorStore } from '../alicization-self-evolution-inspector'
import { useChatOrchestratorStore } from '../chat'
import { useConsciousnessStore } from '../modules/consciousness'
import { useProvidersStore } from '../providers'
import { buildPreDialogueSendIdentityFromSnapshots } from './pre-dialogue-send-identity'
import { useChatSessionStore } from './session-store'

type ChatOrchestratorStore = ReturnType<typeof useChatOrchestratorStore>
type PreDialogueSendIdentity = NonNullable<Parameters<ChatOrchestratorStore['ingest']>[1]>['preDialogueSendIdentity']

export const useChatTextComposerStore = defineStore('chat-text-composer', () => {
  const providersStore = useProvidersStore()
  const consciousnessStore = useConsciousnessStore()
  const chatOrchestrator = useChatOrchestratorStore()
  const chatSession = useChatSessionStore()
  const selfEvolutionInspectorStore = useAlicizationSelfEvolutionInspectorStore()

  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
  const { messages } = storeToRefs(chatSession)
  const { sending } = storeToRefs(chatOrchestrator)

  const draft = ref('')
  const isComposing = ref(false)

  const resolvedProviderId = computed(() => activeProvider.value?.trim() ?? '')
  const resolvedModelId = computed(() => activeModel.value?.trim() ?? '')
  const preDialogueClosureSnapshot = computed(() => selfEvolutionInspectorStore.preDialogueClosureSnapshot)
  const preDialogueAwarenessSnapshot = computed(() => selfEvolutionInspectorStore.preDialogueAwarenessSnapshot)
  const projectStateContinuitySnapshot = computed(() => selfEvolutionInspectorStore.projectStateContinuitySnapshot)

  function setDraft(value: string) {
    draft.value = value
  }

  function appendDraft(value: string) {
    draft.value += value
  }

  function clearDraft() {
    draft.value = ''
  }

  function isManualTurnAbort(error: unknown) {
    return (errorMessageFrom(error) ?? '').includes('Alicization turn aborted (manual)')
  }

  function buildPreDialogueSendIdentity(): PreDialogueSendIdentity {
    return buildPreDialogueSendIdentityFromSnapshots({
      projectStateContinuitySnapshot: projectStateContinuitySnapshot.value,
      preDialogueClosureSnapshot: preDialogueClosureSnapshot.value,
      preDialogueAwarenessSnapshot: preDialogueAwarenessSnapshot.value,
      continuitySummary: projectStateContinuitySnapshot.value?.continuitySummary ?? null,
    }) as PreDialogueSendIdentity
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
      const preDialogueSendIdentity = buildPreDialogueSendIdentity()
      await chatOrchestrator.ingest(rawDraft, {
        providerId,
        chatProvider: await providersStore.getProviderInstance(providerId) as ChatProvider,
        model: modelId,
        providerConfig,
        preDialogueSendIdentity,
      })
      return true
    }
    catch (error) {
      if (isManualTurnAbort(error))
        return false

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
    preDialogueClosureSnapshot,
    preDialogueAwarenessSnapshot,
    projectStateContinuitySnapshot,
    resolvedProviderId,
    resolvedModelId,
    setDraft,
    appendDraft,
    clearDraft,
    sendCurrentMessage,
  }
})
